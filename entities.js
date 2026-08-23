// ============================================================
// 子彈 + 敵人類別
// ============================================================

// 玩家子彈
function makeBullet(x, y, vx, vy, opts = {}) {
    return {
        x, y,
        w: 8, h: 8,
        vx, vy,
        color: opts.color || '#ffdd00',
        life: 90,
        enemy: false,
    };
}

// 敵人子彈
function makeEnemyBullet(x, y, vx, vy) {
    return {
        x, y,
        w: 10, h: 10,
        vx, vy,
        color: '#ff8c42',
        life: 240,
        enemy: true,
    };
}

// ============================================================
// 敵人類別
// ============================================================

// 快速小方塊：高速低血量
function makeFastEnemy(x, y, wave) {
    return {
        type: 'fast',
        x, y,
        w: 18, h: 18,
        speed: 3.2 + wave * 0.15,
        health: 1,
        maxHealth: 1,
        color: '#ff4d6d',
        score: 15,
        hitFlash: 0,
        shootCd: 0,
    };
}

// 大型坦克：低速高血量
function makeTankEnemy(x, y, wave) {
    const hp = 6 + wave * 2;
    return {
        type: 'tank',
        x, y,
        w: 48, h: 48,
        speed: 0.8 + wave * 0.05,
        health: hp,
        maxHealth: hp,
        color: '#9b5de5',
        score: 40,
        hitFlash: 0,
        shootCd: 0,
    };
}

// 會射擊的敵人：中速、中血量、定期發射反向子彈
function makeShooterEnemy(x, y, wave) {
    return {
        type: 'shooter',
        x, y,
        w: 26, h: 26,
        speed: 1.6 + wave * 0.1,
        health: 3 + Math.floor(wave / 2),
        maxHealth: 3 + Math.floor(wave / 2),
        color: '#ffd60a',
        score: 25,
        hitFlash: 0,
        shootCd: 60 + Math.random() * 60,
    };
}

// 依波次權重隨機選一種敵人
function makeEnemy(x, y, wave) {
    const r = Math.random();
    if (wave >= 3 && r < 0.25) return makeTankEnemy(x, y, wave);
    if (wave >= 2 && r < 0.55) return makeShooterEnemy(x, y, wave);
    return makeFastEnemy(x, y, wave);
}

// 從畫布邊緣外隨機取一個生成點
function randomEdgePos(W, H, margin = 40) {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
        case 0: return { x: Math.random() * W, y: -margin };
        case 1: return { x: W + margin, y: Math.random() * H };
        case 2: return { x: Math.random() * W, y: H + margin };
        default: return { x: -margin, y: Math.random() * H };
    }
}
