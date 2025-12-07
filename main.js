// ==========================================
// 3. MAIN.JS - GAME LOGIC (FINAL STABILITY FIX)
// ========================================== 

initGlobals();

let intro = {
    lines: [
        "ANNEE 2140...",
        "LES FLEAUX ONT ENVAHI LE RESEAU.",
        "CHOISIS TON AVATAR.",
        "EXORCISE-LES TOUS.",
        "LANCEMENT..."
    ],
    currentLine: 0, charIndex: 0, waitTimer: 0
};

let qte = { active: false, sequence: [], index: 0, timer: 0, maxTime: 150 };
const QTE_SYMBOLS = ['↑', '↓', '←', '→'];
const QTE_CODES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

const game = {
    player: null,
    platforms: [],
    enemies: [],
    bullets: [],
    items: [],
    goal: null,
    
    init: function() {
        this.setupTouchControls();

        // Cheat Code Buffer
        let cheatBuffer = "";

        window.addEventListener('keydown', function(e) {
            let k = e.code;
            
            // CHEAT CODE: 075 -> TP TO END
            if (e.key >= '0' && e.key <= '9') {
                cheatBuffer += e.key;
                if (cheatBuffer.length > 3) cheatBuffer = cheatBuffer.slice(-3);
                if (cheatBuffer === "075" && game.player && game.goal) {
                    game.player.x = game.goal.x - 100;
                    game.player.y = game.goal.y;
                    game.showMessage("WARPING TO END...", 2000);
                    Sound.powerup();
                    cheatBuffer = "";
                }
            }

            if(k === 'ArrowRight' || k === 'KeyD') keys.right = true;
            if(k === 'ArrowLeft' || k === 'KeyA' || k === 'KeyQ') keys.left = true; 
            if(k === 'ArrowDown' || k === 'KeyS') keys.down = true; 
            if(k === 'Space' || k === 'ArrowUp' || k === 'KeyZ') keys.up = true;
            if(k === 'KeyE') keys.shoot = true;
            if(k === 'ShiftLeft' || k === 'ShiftRight') keys.dash = true;
            if(k === 'KeyR') keys.domain = true; 
            if(k === 'KeyT') keys.swap = true;
            if(k === 'KeyH') keys.purple = true;
            if(k === 'KeyG') keys.guard = true; 
            if(k === 'KeyM') Sound.toggleMusic(); 

            if (state === GAME_STATE.QTE) game.handleQTEInput(k);
            
            if (state === GAME_STATE.INTRO && (k === 'Space' || k === 'Enter')) {
                state = GAME_STATE.MENU;
                game.showMenu();
            } else if ((state === GAME_STATE.MENU || state === GAME_STATE.GAMEOVER || state === GAME_STATE.VICTORY) && (k === 'Space' || k === 'Enter')) {
                game.start();
            }
        });

        window.addEventListener('keyup', function(e) {
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
        this.loop();
    },

    setupTouchControls: function() {
        const dUp = document.getElementById('btn-up');
        const dDown = document.getElementById('btn-down');
        const dLeft = document.getElementById('btn-left');
        const dRight = document.getElementById('btn-right');
        const bJump = document.getElementById('btn-jump');
        const bAtk = document.getElementById('btn-atk');
        const bDash = document.getElementById('btn-dash');
        const bUlt = document.getElementById('btn-ult');

        const bind = (btn, key) => {
            if(!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
        };

        bind(dUp, 'up'); bind(dDown, 'down'); bind(dLeft, 'left'); bind(dRight, 'right');
        bind(bJump, 'up'); bind(bAtk, 'shoot'); bind(bDash, 'dash'); bind(bUlt, 'domain');
    },

    showMenu: function() {
         uiMessage.style.display = 'block';
         
         let neonClass = currentSkin === 'NEON' ? 'active' : '';
         let itadoriClass = currentSkin === 'ITADORI' ? 'active' : '';
         let leviClass = currentSkin === 'LEVI' ? 'active' : '';
         let sorcererText = sorcererMode ? '[X]' : '[ ]';
         
         let controls = "E = SHOOT";
         let specials = "R = DOMAIN | H = PURPLE";
         
         if (currentSkin === 'ITADORI' || (currentSkin === 'NEON' && sorcererMode)) {
             controls = "E = MELEE | G = GUARD";
             specials = "R = DOMAIN | H = PURPLE | T = BOOGIE";
         }
         if (currentSkin === 'LEVI') {
             controls = "E = GRAPPLE";
             specials = "R = CIRCULAR SLASH";
         }

         uiMessage.innerHTML =
            '<h1 class="glitch" data-text="NEON BLASTER">NEON BLASTER</h1>' +
            '<p class="blink">PRESS [SPACE] TO START</p>' +
            '<div class="skin-selector">' +
                '<span class="skin-opt ' + neonClass + '" onclick="Game.setSkin(\'NEON\')">[ NEON ]</span> ' +
                '<span class="skin-opt ' + itadoriClass + '" onclick="Game.setSkin(\'ITADORI\')">[ ITADORI ]</span> ' +
                '<span class="skin-opt ' + leviClass + '" onclick="Game.setSkin(\'LEVI\')">[ LEVI ]</span>'
            '</div>' +
            '<div class="skin-selector" onclick="Game.toggleSorcerer()">' + sorcererText + ' SORCERER MODE (NEON)</div>' +
            '<div class="controls-box">' +
                '<p>ZQSD = MOVE | SPACE = JUMP</p>' +
                '<p>SHIFT = DASH | DOWN = SMASH</p>' +
                '<p style="color:#aa00ff">' + specials + '</p>' +
                '<p style="color:#ff00de">' + controls + '</p>' +
            '</div>';
    },

    setSkin: function(skin) { 
        currentSkin = skin; 
        if(skin === 'LEVI') { PLAYER_SPEED = 8; JUMP_FORCE = 16; }
        else { PLAYER_SPEED = 6; JUMP_FORCE = 14; }
        this.showMenu(); 
    },
    toggleSorcerer: function() { sorcererMode = !sorcererMode; this.showMenu(); },

    start: function() {
        Sound.init(); 
        if(!isMasterMuted && !isMusicMuted && bgm) bgm.play().catch(function(e){});
        if (state !== GAME_STATE.PLAYING) { level = 1; score = 0; }
        this.loadLevel(level);
    },

    loadLevel: function(lvl) {
        state = GAME_STATE.PLAYING;
        this.player = new Player();
        this.platforms = [];
        this.enemies = [];
        this.bullets = [];
        this.items = [];
        uiMessage.style.display = 'none';
        
        JJK_SYSTEM.domain.active = false;
        JJK_SYSTEM.purples = [];
        
        timeLimit = Math.max(30, 90 - lvl * 2) * 1000;
        startTime = Date.now();
        
        this.platforms.push(new Platform(0, canvas.height - 50, 300, 50));
        let currentX = 300;
        let currentY = canvas.height - 50;
        const sections = 10 + lvl * 2; 
        
        for(let i=0; i<sections; i++) {
            let r = Math.random();
            let gap = 50 + Math.random() * 80;
            currentX += gap;
            if (r < 0.3) {
                let w = 100 + Math.random() * 100;
                this.platforms.push(new Platform(currentX, currentY, w, 20));
                if (Math.random() > 0.4) this.enemies.push(new Enemy(currentX + 20, currentY - 24, currentX, currentX + w));
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
                    this.platforms.push(new Platform(currentX, currentY, w, 20));
                    if (Math.random() < 0.2) {
                        let rand = Math.random();
                        let type = 'shield';
                        if(rand > 0.4) type = 'rapid';
                        if(rand > 0.7) type = 'finger'; 
                        if(rand > 0.9) type = 'rct'; 
                        this.items.push(new Item(currentX + w/2, currentY - 30, type));
                    }
                    currentX += w + 20;
                }
            } else {
                let mainW = 150;
                this.platforms.push(new Platform(currentX, currentY, mainW, 20));
                if (Math.random() > 0.4) {
                    this.enemies.push(new Enemy(currentX + 20, currentY - 24, currentX, currentX + mainW));
                }
                currentX += mainW;
            }
        }
        let last = this.platforms[this.platforms.length-1];
        this.goal = { x: last.x + last.w/2 - 15, y: last.y - 50, w: 30, h: 50 };
        uiLevel.innerText = lvl;
    },

    handleQTEInput: function(code) {
        let currentTarget = qte.sequence[qte.index];
        if (code === currentTarget.code) {
            qte.index++;
            Sound.qteHit();
            if (qte.index >= qte.sequence.length) {
                state = GAME_STATE.PLAYING;
                Sound.explosion(); 
                this.player.dy = -10; 
                this.player.dx = 0;
                score += 500;
                uiScore.innerText = score;
                FX.addParticle(this.player.x, this.player.y, 30, '#fff');
                camera.shake = 10;
                var self = this;
                this.enemies.forEach(function(e) {
                    if (game.checkRect(self.player, {x: e.x-50, y:e.y-50, w:e.w+100, h:e.h+100})) {
                        e.active = false;
                    }
                });
            }
        } else {
            this.gameOver("QTE FAILED");
            Sound.qteFail();
        }
    },

    startQTE: function(enemy) {
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

    showMessage: function(text, duration) {
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
        setTimeout(() => { if(div.parentNode) div.parentNode.removeChild(div); }, duration);
    },

    update: function() {
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
                             this.showMenu();
                         }
                    }
                }
            }
            return;
        }

        if (state === GAME_STATE.QTE) {
            qte.timer--;
            if (qte.timer <= 0) { this.gameOver("TOO SLOW"); Sound.qteFail(); } 
            return; 
        }

        if (state !== GAME_STATE.PLAYING) return; 
        
        let elapsed = Date.now() - startTime;
        let remaining = timeLimit - elapsed;
        uiTimer.innerText = (remaining/1000).toFixed(2);
        if (remaining <= 0) this.gameOver("TIME OUT");
        
        JJK_SYSTEM.update(this.player);
        this.player.update(this.enemies, this.bullets);
        this.bullets.forEach(function(b) { b.update(); });
        this.enemies.forEach(function(e) { e.update(); });
        this.items.forEach(function(i) { i.update(); });
        FX.update();
        
        this.bullets = this.bullets.filter(function(b) { return b.active; });
        
        this.platforms.forEach(function(p) {
            if (game.checkRect(game.player, p)) game.resolvePlatformCollision(game.player, p);
        });
        
        var self = this; 
        
        this.bullets.forEach(function(b) {
            self.enemies.forEach(function(e) {
                if (e.active && game.checkRect(b, e)) {
                    if(!(b instanceof HollowPurple)) b.active = false; 
                    score += 100; uiScore.innerText = score;
                    Sound.explosion();
                    e.active = false;
                    FX.addParticle(e.x + e.w/2, e.y + e.h/2, 20, '#ff3333');
                }
            });
        });
        this.enemies = this.enemies.filter(function(e) { return e.active; });
        
        this.enemies.forEach(function(e) {
            if (game.checkRect(self.player, e)) {
                
                // Levi Spin Kill
                if (currentSkin === 'LEVI' && self.player.isSpinning) {
                    e.active = false; Sound.explosion(); FX.addParticle(e.x, e.y, 20, '#00ff00'); score += 300; return;
                }
                
                if (currentSkin === 'ITADORI' && !self.player.isDashing && !self.player.isSmashing) {
                    e.active = false;
                    
                    // Black Flash Probability Check (Base 20% + Bonus)
                    if(Math.random() < (0.2 + self.player.bfChance)) {
                        score += ITADORI_DATA.triggerBlackFlash(e.x + e.w/2, e.y + e.h/2);
                        
                        // Chain Logic
                        self.player.bfStreak++;
                        self.player.bfChance = Math.min(0.8, self.player.bfChance + 0.2); // Add 20% chance, Cap total at 100%
                        
                        game.showMessage("BLACK FLASH CHAIN: " + self.player.bfStreak, 1000);
                        
                        // Small Energy Restore on Chain
                        if(self.player.bfStreak > 1) self.player.dashEnergy = Math.min(100, self.player.dashEnergy + 20);
                        
                    } else {
                        // Reset Streak on Miss
                        self.player.bfStreak = 0;
                        self.player.bfChance = 0.0;
                        
                        Sound.explosion();
                        FX.addParticle(e.x, e.y, 10, '#ff0000');
                        score += 100;
                    }
                    self.player.dy = -5; self.player.dx = self.player.x < e.x ? -5 : 5; return;
                }

                if(self.player.isDashing || self.player.isSmashing) {
                     e.active = false; Sound.explosion(); FX.addParticle(e.x, e.y, 15, '#00ffff'); score += 200;
                } else if(self.player.hasShield) {
                    self.player.hasShield = false; Sound.powerup(); 
                    self.player.dy = -10; self.player.dx = self.player.x < e.x ? -10 : 10; e.active = false; 
                } else {
                    if (self.player.hasRCT) {
                        self.player.hasRCT = false; Sound.angel(); FX.addParticle(self.player.x, self.player.y, 50, '#00ff00', 3);
                        Game.showMessage("RCT HEAL", 1000); e.active = false;
                        self.player.dy = -10; self.player.dx = self.player.x < e.x ? -10 : 10;
                    } else {
                        if (JJK_SYSTEM.simpleDomain.active) {
                            self.player.dx = self.player.x < e.x ? -10 : 10; FX.addParticle(self.player.x, self.player.y, 10, '#0088ff');
                        } else {
                            game.startQTE(e);
                        }
                    }
                }
            }
        });

        this.items.forEach(function(i) {
            if (i.active && game.checkRect(self.player, i)) {
                i.active = false; Sound.powerup();
                if(i.type === 'shield') self.player.hasShield = true;
                if(i.type === 'rapid') self.player.rapidFireTimer = 300; 
                if(i.type === 'finger') self.player.dashEnergy = 100; 
                if(i.type === 'rct') self.player.hasRCT = true; 
                score += 200; uiScore.innerText = score; FX.addParticle(i.x, i.y, 15, i.color);
            }
        });
        this.items = this.items.filter(function(i) { return i.active; });
        
        if (game.checkRect(this.player, this.goal)) {
            level++; Sound.powerup(); score += 500;
            if (level > 20) {
                state = GAME_STATE.VICTORY; try { bgm.pause(); } catch(e){}
                uiMessage.innerHTML = '<h1 style="color:#ffff00">MISSION COMPLETE</h1><p>FINAL SCORE: ' + score + '</p>'; uiMessage.style.display = 'block';
            } else {
                this.loadLevel(level);
            }
        }
        
        let targetX = -this.player.x + canvas.width/3;
        let targetY = -this.player.y + canvas.height/2;
        if (targetY > 0) targetY = 0; 
        
        camera.x += (targetX - camera.x) * 0.1; camera.y += (targetY - camera.y) * 0.1;
    },
    
    checkRect: function(r1, r2) {
        return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
    },
    
    resolvePlatformCollision: function(p, plat) {
        let overlapX = (p.x + p.w/2) - (plat.x + plat.w/2);
        let overlapY = (p.y + p.h/2) - (plat.y + plat.h/2);
        let hWidths = (p.w + plat.w)/2;
        let hHeights = (p.h + plat.h)/2;

        if (Math.abs(overlapX) < hWidths && Math.abs(overlapY) < hHeights) {
            let ox = hWidths - Math.abs(overlapX);
            let oy = hHeights - Math.abs(overlapY);
            if (ox >= oy) {
                if (overlapY > 0) { p.y += oy; p.dy = 0; } 
                else { p.y -= oy; p.dy = 0; p.grounded = true; p.land(this.bullets, this.enemies); }
            } else {
                if (overlapX > 0) p.x += ox; else p.x -= ox; p.dx = 0;
                if (p.dy > 0 && !p.grounded) { 
                    p.wallSliding = true; p.wallDir = overlapX > 0 ? -1 : 1; p.dy *= 0.7; FX.addParticle(p.x + (overlapX > 0 ? 0 : p.w), p.y, 1, '#fff', 0.1); 
                }
            }
        }
    },

    gameOver: function(reason) {
        state = GAME_STATE.GAMEOVER; Sound.die(); try { bgm.pause(); } catch(e){}
        uiMessage.innerHTML = '<h1 style="color:red">SYSTEM FAILURE</h1><p>' + reason + '</p><p class="blink">PRESS SPACE TO REBOOT</p>';
        uiMessage.style.display = 'block'; camera.shake = 20;
    },

    draw: function() {
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
            ctx.fillStyle = '#555'; ctx.font = '10px "Press Start 2P"'; ctx.fillText("[SPACE] OR [CLICK] TO SKIP", 600, 580);
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

        this.platforms.forEach(function(p) {
            ctx.shadowBlur = 10; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.shadowBlur = 0; ctx.fillStyle = '#000';
            ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
        });
        
        this.items.forEach(function(i) {
            ctx.shadowBlur = 15; ctx.shadowColor = i.color; ctx.fillStyle = i.color;
            ctx.fillRect(i.x, i.y, i.w, i.h);
        });

        this.enemies.forEach(function(e) {
            ctx.shadowBlur = 10; ctx.shadowColor = 'red'; ctx.fillStyle = '#ff0000';
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.w, e.y); ctx.lineTo(e.x + e.w/2, e.y + e.h); ctx.fill();
        });

        this.bullets.forEach(function(b) {
            if (!(b instanceof HollowPurple)) {
                if (b instanceof ThunderSpear) {
                    ctx.shadowBlur = 10; ctx.shadowColor = '#ffff00'; ctx.fillStyle = '#ffff00';
                    ctx.fillRect(b.x, b.y, 20, 6);
                } else {
                    ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.fillStyle = b.color;
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                }
            }
        });

        if (this.goal) {
            ctx.shadowBlur = 20; ctx.shadowColor = '#ffff00'; ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.goal.x, this.goal.y, this.goal.w, this.goal.h);
        }

        if (this.player) {
            JJK_SYSTEM.drawPlayerEffects(ctx, this.player);

            if (this.player.hasShield) {
                ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(this.player.x + 10, this.player.y + 10, 20, 0, Math.PI * 2); ctx.stroke();
            }
            if (this.player.hasRCT) {
                ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(this.player.x + 10, this.player.y + 10, 24, 0, Math.PI * 2); ctx.stroke();
            }
            
            if (currentSkin === 'ITADORI') {
                ITADORI_DATA.draw(ctx, this.player);
            } else if (currentSkin === 'LEVI') {
                LEVI_DATA.draw(ctx, this.player);
            } else {
                ctx.shadowBlur = 15; ctx.shadowColor = this.player.color; ctx.fillStyle = this.player.color;
                ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
                ctx.fillStyle = '#fff';
                if (this.player.facingRight) ctx.fillRect(this.player.x + 12, this.player.y + 6, 4, 4);
                else ctx.fillRect(this.player.x + 4, this.player.y + 6, 4, 4);
            }

            if (this.player.wallSliding) {
                 ctx.fillStyle = '#fff';
                 ctx.fillRect(this.player.x + (this.player.wallDir === -1 ? -2 : 20), this.player.y + 15, 2, 5);
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
            qte.sequence.forEach(function(item, i) {
                ctx.fillStyle = i < qte.index ? '#00ff00' : (i === qte.index ? '#ffff00' : '#555');
                ctx.font = '40px "Press Start 2P"';
                ctx.fillText(item.symbol, startX + i * 60 + 30, canvas.height/2 + 50);
            });
        }
    },

    loop: function() {
        this.update();
        this.draw();
        frames++;
        requestAnimationFrame(this.loop.bind(this));
    }
};

window.Game = game;
game.init();