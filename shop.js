// ===== 商店系統 =====
const Shop = {
    gold: 0,
    upgrades: {
        health: 0,
        damage: 0,
        speed: 0,
        firerate: 0
    },
    prices: {
        health: 50,
        damage: 75,
        speed: 40,
        firerate: 100
    },
    priceMultipliers: {
        health: 1.5,
        damage: 1.6,
        speed: 1.4,
        firerate: 1.5
    },

    init() {
        this.gold = game.gold || 0;
        this.load();
        this.updateGoldDisplay();
        this.updateItemStates();
    },

    buy(type) {
        const price = this.getPrice(type);
        if (this.gold < price) return;
        if (this.prices[type] === undefined) return;

        this.gold -= price;
        this.upgrades[type] = (this.upgrades[type] || 0) + 1;
        this.prices[type] = Math.floor(this.getPrice(type) * this.priceMultipliers[type]);

        // 應用升級效果
        this.applyUpgrade(type);

        this.updateGoldDisplay();
        this.updateItemStates();
        this.save();
    },

    getPrice(type) {
        return this.prices[type];
    },

    applyUpgrade(type) {
        switch (type) {
            case 'health':
                // 最大生命 +25，並補滿額外部分
                const oldMax = game.player ? game.player.maxHealth : 100;
                game.player.maxHealth += 25;
                game.player.health = Math.min(game.player.health + 25, game.player.maxHealth);
                break;
            case 'damage':
                game.player.damage += 1;
                break;
            case 'speed':
                game.player.speed *= 1.1;
                break;
            case 'firerate':
                game.player.shootRate *= 0.85;
                break;
        }
    },

    updateGoldDisplay() {
        const el = $('shopGold');
        if (el) el.textContent = this.gold;
    },

    updateItemStates() {
        document.querySelectorAll('.shop-item').forEach(item => {
            const type = item.dataset.item;
            const price = this.getPrice(type);
            const canAfford = this.gold >= price;
            item.classList.toggle('affordable', canAfford);
            item.classList.toggle('too-expensive', !canAfford);
        });
    },

    toggle() {
        const panel = $('shopPanel');
        if (!panel) return;
        panel.classList.toggle('hidden');
        this.updateItemStates();
    },

    save() {
        if (!game.player) return;
        game.player.shopUpgrades = { ...this.upgrades };
        game.gold = this.gold;
    },

    load() {
        if (game.player && game.player.shopUpgrades) {
            this.upgrades = { ...this.upgrades, ...game.player.shopUpgrades };
        }
    }
};
