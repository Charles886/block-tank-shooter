// ============================================================
// 遊戲核心：狀態、輸入、更新
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const $ = id => document.getElementById(id);

const game = {
    running: false,
    paused: false,
    score: 0,
    wave: 1,
    kills: 0,
    killsForNext: 5,
    spawnTimer: 60,
    bullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    waveBanner: 0,
    shake: 0,
    player: null,
};

function resetPlayer() {
    return {
        x: W / 2, y: H / 2,
        w: 28, h: 28,
        speed: 4,
        angle: 0,           // 朝向（弧度）
        health: 100,
        maxHealth: 100,
        shootRate: 10,      // 每 N 幀可射一發
        shootCd: 0,
        tripleShot: false,
        invuln: 0,          // 受傷無敵幀數
        trail: [],
    };
}

// ---------- 輸入 ----------
const keys = {};
let mouse = { x: W / 2, y: 0, down: false };

window.addEventListener('keydown', e => {
    if (e.repeat) return; // 忽略按住持續重複觸發，避免 Enter 誤觸「重新開始」等按鈕
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') { e.preventDefault(); togglePause(); }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / r.width);
    mouse.y = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0) { mouse.down = true; Sound.init(); Sound.resume(); }
});
window.addEventListener('mouseup', () => mouse.down = false);

// 觸控：按住拖曳 = 移動 + 自動朝手指方向射擊
function touchPoint(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0] || e.changedTouches[0];
    return {
        x: (t.clientX - r.left) * (W / r.width),
        y: (t.clientY - r.top) * (H / r.height),
    };
}
let touchActive = false;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchActive = true;
    const p = touchPoint(e);
    mouse.x = p.x; mouse.y = p.y; mouse.down = true;
    Sound.init(); Sound.resume();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!touchActive) return;
    const p = touchPoint(e);
    mouse.x = p.x; mouse.y = p.y;
}, { passive: false });
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    touchActive = false;
    mouse.down = false;
}, { passive: false });

// ---------- 開始 / 重新開始 ----------
function startGame() {
    Sound.init(); Sound.resume();
    game.player = resetPlayer();
    game.running = true;
    game.paused = false;
    game.score = 0;
    game.wave = 1;
    game.kills = 0;
    game.killsForNext = 5;
    game.bullets = [];
    game.enemies = [];
    game.powerups = [];
    game.particles = [];
    game.waveBanner = 120;
    game.shake = 0;
    $('overlay').classList.add('hidden');
    $('gameOverScreen').classList.add('hidden');
    $('pauseOverlay').classList.add('hidden');
    $('hud').classList.remove('hidden');
    Leaderboard.renderAll();
    Sound.wave();
}

function togglePause() {
    if (!game.running) return;
    game.paused = !game.paused;
    $('pauseOverlay').classList.toggle('hidden', !game.paused);
}

$('startBtn').addEventListener('click', startGame);
$('restartBtn').addEventListener('click', startGame);

// ---------- 粒子 ----------
function spawnParticles(x, y, color, n = 10, speed = 3) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (0.4 + Math.random() * 0.6) * speed;
        game.particles.push({
            x, y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 20 + Math.random() * 15,
            color,
            size: 2 + Math.random() * 3,
        });
    }
}

// ---------- 更新：玩家 ----------
function updatePlayer() {
    const p = game.player;
    const dx = mouse.x - p.x, dy = mouse.y - p.y;
    if (Math.hypot(dx, dy) > 2) p.angle = Math.atan2(dy, dx);

    let mx = 0, my = 0;
    if (keys['w']) my -= 1;
    if (keys['s']) my += 1;
    if (keys['a']) mx -= 1;
    if (keys['d']) mx += 1;
    if (mx || my) {
        const len = Math.hypot(mx, my);
        p.x += (mx / len) * p.speed;
        p.y += (my / len) * p.speed;
        p.trail.push({ x: p.x, y: p.y, life: 12 });
        if (p.trail.length > 14) p.trail.shift();
    }
    p.trail.forEach(t => t.life--);
    p.trail = p.trail.filter(t => t.life > 0);
    p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
    p.y = Math.max(p.h / 2, Math.min(H - p.h / 2, p.y));
    if (p.invuln > 0) p.invuln--;

    p.shootCd--;
    if ((mouse.down || keys['enter']) && p.shootCd <= 0) {
        p.shootCd = p.shootRate;
        const shots = p.tripleShot ? [-0.18, 0, 0.18] : [0];
        for (const off of shots) {
            const a = p.angle + off;
            game.bullets.push(makeBullet(
                p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20,
                Math.cos(a) * 10, Math.sin(a) * 10
            ));
        }
        Sound.shoot();
    }
}

// ---------- 更新：敵人 ----------
function updateEnemies() {
    const p = game.player;
    for (const e of game.enemies) {
        if (e.hitFlash > 0) e.hitFlash--;
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x += (dx / d) * e.speed;
        e.y += (dy / d) * e.speed;
        // 會射擊的敵人：定期發射朝玩家的子彈
        if (e.type === 'shooter') {
            e.shootCd--;
            if (e.shootCd <= 0 && d < 420) {
                e.shootCd = 70 + Math.random() * 50;
                game.bullets.push(makeEnemyBullet(e.x, e.y, (dx / d) * 5, (dy / d) * 5));
            }
        }
    }
}

// ---------- 更新：子彈 / 粒子 / 道具 ----------
function updateProjectiles() {
    for (const b of game.bullets) {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
    }
    game.bullets = game.bullets.filter(b =>
        b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30
    );

    for (const pt of game.particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vx *= 0.92;
        pt.vy *= 0.92;
        pt.life--;
    }
    game.particles = game.particles.filter(pt => pt.life > 0);

    for (const pu of game.powerups) pu.life--;
    game.powerups = game.powerups.filter(pu => pu.life > 0);
}

function rectsOverlap(a, b) {
    return Math.abs(a.x - b.x) * 2 < (a.w + b.w) &&
           Math.abs(a.y - b.y) * 2 < (a.h + b.h);
}

// ---------- 碰撞 ----------
function handleCollisions() {
    const p = game.player;

    // 玩家子彈 vs 敵人
    for (const b of game.bullets) {
        if (b.enemy) continue;
        for (const e of game.enemies) {
            if (e.health <= 0) continue;
            if (!rectsOverlap(b, e)) continue;
            b.life = 0;
            e.health--;
            e.hitFlash = 6;
            spawnParticles(b.x, b.y, '#ffdd00', 4, 2);
            Sound.hit();
            if (e.health <= 0) {
                game.score += e.score;
                game.kills++;
                spawnParticles(e.x, e.y, e.color, 16, 4);
                Sound.explode();
                game.shake = Math.max(game.shake, e.type === 'tank' ? 8 : 4);
                // 掉落道具（20% 機率）
                if (Math.random() < 0.2) game.powerups.push(makePowerup(e.x, e.y));
            }
            break;
        }
    }

    // 敵人子彈 vs 玩家
    if (p.invuln <= 0) {
        for (const b of game.bullets) {
            if (!b.enemy) continue;
            if (rectsOverlap(b, p)) {
                b.life = 0;
                hurtPlayer(12);
                break;
            }
        }
    }

    // 敵人身體 vs 玩家
    if (p.invuln <= 0) {
        for (const e of game.enemies) {
            if (e.health <= 0) continue;
            if (rectsOverlap(e, p)) {
                hurtPlayer(20);
                e.health = 0;
                spawnParticles(e.x, e.y, e.color, 12, 4);
                break;
            }
        }
    }

    // 玩家 vs 道具
    for (const pu of game.powerups) {
        if (rectsOverlap(pu, p)) {
            pu.life = 0;
            applyPowerup(pu, game);
            spawnParticles(pu.x, pu.y, POWERUP_TYPES[pu.type].color, 12, 3);
        }
    }

    // 清除已擊落的敵人
    game.enemies = game.enemies.filter(e => e.health > 0);
    if (p.health <= 0) doGameOver();
}

function hurtPlayer(dmg) {
    const p = game.player;
    p.health -= dmg;
    p.invuln = 45;
    game.shake = Math.max(game.shake, 10);
    spawnParticles(p.x, p.y, '#4cc9f0', 10, 3);
    Sound.hurt();
}

// ---------- 生成與波次 ----------
function updateSpawning() {
    game.spawnTimer--;
    if (game.spawnTimer <= 0) {
        const pos = randomEdgePos(W, H);
        game.enemies.push(makeEnemy(pos.x, pos.y, game.wave));
        game.spawnTimer = Math.max(15, 70 - game.wave * 4);
    }
    if (game.kills >= game.killsForNext) {
        game.kills = 0;
        game.wave++;
        game.killsForNext = 5 + game.wave * 2;
        game.waveBanner = 120;
        Sound.wave();
    }
}

function doGameOver() {
    game.running = false;
    $('finalScore').textContent = game.score;
    $('waveReached').textContent = '撐到第 ' + game.wave + ' 波';
    Leaderboard.submit(game.score, game.wave);
    Leaderboard.render('lbEnd');
    $('gameOverScreen').classList.remove('hidden');
    Sound.gameOver();
}

// ---------- 主更新 ----------
function update() {
    if (!game.running || game.paused) return;
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    handleCollisions();
    updateSpawning();
    if (game.waveBanner > 0) game.waveBanner--;
    if (game.shake > 0) game.shake *= 0.85;
}

// ---------- 渲染 ----------
function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
}

function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 背景網格
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 震動
    if (game.shake > 0.5) {
        ctx.translate(
            (Math.random() - 0.5) * game.shake,
            (Math.random() - 0.5) * game.shake
        );
    }

    // 道具
    for (const pu of game.powerups) {
        const bob = Math.sin(pu.life * 0.05 + pu.bobPhase) * 4;
        const c = POWERUP_TYPES[pu.type].color;
        ctx.fillStyle = c;
        ctx.globalAlpha = pu.life < 90 ? (Math.floor(pu.life / 10) % 2 ? 0.4 : 1) : 1;
        ctx.fillRect(pu.x - pu.w / 2, pu.y - pu.h / 2 + bob, pu.w, pu.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWERUP_TYPES[pu.type].label, pu.x, pu.y + bob);
    }

    // 子彈
    for (const b of game.bullets) {
        drawRect(b.x, b.y, b.w, b.h, b.color);
    }

    // 敵人
    for (const e of game.enemies) {
        const flash = e.hitFlash > 0;
        drawRect(e.x, e.y, e.w, e.h, flash ? '#ffffff' : e.color);
        // 血條（坦克/射擊者）
        if (e.maxHealth > 1) {
            const bw = e.w;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 8, bw, 4);
            ctx.fillStyle = '#06d6a0';
            ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 8, bw * (e.health / e.maxHealth), 4);
        }
    }

    // 粒子
    for (const pt of game.particles) {
        ctx.globalAlpha = Math.min(1, pt.life / 20);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // 玩家
    if (game.running && game.player) {
        const p = game.player;
        // 拖尾
        for (const t of p.trail) {
            ctx.globalAlpha = t.life / 24;
            drawRect(t.x, t.y, p.w * 0.8, p.h * 0.8, '#4cc9f0');
        }
        ctx.globalAlpha = 1;
        // 身體（受擊閃爍）
        const blink = p.invuln > 0 && (Math.floor(p.invuln / 4) % 2 === 0);
        drawRect(p.x, p.y, p.w, p.h, blink ? '#ffffff' : '#4cc9f0');
        // 槍管指向
        const gx = p.x + Math.cos(p.angle) * 22;
        const gy = p.y + Math.sin(p.angle) * 22;
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(p.angle) * 10, p.y + Math.sin(p.angle) * 10);
        ctx.lineTo(gx, gy);
        ctx.stroke();
    }

    // 波次提示
    if (game.waveBanner > 0) {
        ctx.globalAlpha = Math.min(1, game.waveBanner / 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE ' + game.wave, W / 2, H / 2 - 60);
        ctx.globalAlpha = 1;
    }

    // HUD 更新
    updateHud();
}

function updateHud() {
    if (!game.player) return;
    $('score').textContent = game.score;
    $('health').textContent = Math.max(0, Math.ceil(game.player.health));
    $('wave').textContent = game.wave;
    const pu = [];
    if (game.player.tripleShot) pu.push('三倍');
    if (game.player.shootRate < 10) pu.push('快速');
    $('powerups').textContent = pu.length ? pu.join('+') : '-';
    const hp = $('health');
    hp.style.color = game.player.health > 50 ? '#06d6a0' : game.player.health > 25 ? '#ffd60a' : '#ff4d6d';
}

// ---------- 遊戲迴圈 ----------
Leaderboard.renderAll();
let lastTime = 0;
function loop(time) {
    requestAnimationFrame(loop);
    update();
    render();
}
requestAnimationFrame(loop);
