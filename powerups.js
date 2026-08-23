// ============================================================
// 道具（掉落物）
// ============================================================

const POWERUP_TYPES = {
    heal:    { color: '#06d6a0', label: 'Heal',    effect: 'heal' },
    reload:  { color: '#118ab2', label: 'Rapid',   effect: 'rapid' },
    triple:  { color: '#ef476f', label: 'Triple',  effect: 'triple' },
};

// 隨機道具
function makePowerup(x, y) {
    const keys = Object.keys(POWERUP_TYPES);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return {
        x, y,
        w: 22, h: 22,
        type: key,
        life: 600, // 10 秒
        bobPhase: Math.random() * Math.PI * 2,
    };
}

// 對玩家套用道具效果
function applyPowerup(pu, game) {
    switch (pu.type) {
        case 'heal':
            game.player.health = Math.min(
                game.player.maxHealth,
                game.player.health + 30
            );
            Sound.heal();
            break;

        case 'reload': {
            // 快速裝填：射擊冷卻減半，持續 8 秒
            const prev = game.player.shootRate;
            game.player.shootRate = Math.max(3, Math.floor(prev / 2));
            // 還原排程（避免永久堆疊）
            if (game._rapidTimer) clearTimeout(game._rapidTimer);
            game._rapidTimer = setTimeout(() => {
                game.player.shootRate = Math.min(10, game.player.shootRate * 2);
            }, 8000);
            Sound.pickup();
            break;
        }

        case 'triple': {
            // 三倍子彈：扇形 3 發，持續 10 秒
            game.player.tripleShot = !game.player.tripleShot;
            if (game._tripleTimer) clearTimeout(game._tripleTimer);
            if (game.player.tripleShot) {
                game._tripleTimer = setTimeout(() => {
                    game.player.tripleShot = false;
                }, 10000);
            }
            Sound.pickup();
            break;
        }
    }
}
