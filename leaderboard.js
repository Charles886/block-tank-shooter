// ============================================================
// 排行榜 — 用 localStorage 保存最高分 Top 5
// ============================================================
const Leaderboard = {
    key: 'shooting-game-scores',

    load() {
        try {
            const raw = localStorage.getItem(this.key);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) { return []; }
    },

    save(list) {
        try { localStorage.setItem(this.key, JSON.stringify(list)); } catch (e) { /* 隱私模式可能寫入失敗，忽略 */ }
    },

    // 提交一次分數
    submit(score, wave) {
        if (!score || score <= 0) return;
        const list = this.load();
        list.push({ score, wave, date: Date.now() });
        list.sort((a, b) => b.score - a.score);
        this.save(list.slice(0, 5));
    },

    // 渲染排行榜到指定元素（Top 5）
    render(elId) {
        const el = document.getElementById(elId);
        if (!el) return;
        const list = this.load().slice(0, 5);
        if (!list.length) {
            el.innerHTML = '<p class="lb-empty">尚無紀錄，快來打破紀錄！</p>';
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        el.innerHTML = list.map((e, i) =>
            `<div class="lb-row${i === 0 ? ' lb-top' : ''}">
                <span class="lb-rank">${medals[i] || (i + 1)}</span>
                <span class="lb-score">${e.score}</span>
                <span class="lb-wave">第 ${e.wave} 波</span>
            </div>`
        ).join('');
    },

    renderAll() {
        this.render('lbStart');
        this.render('lbEnd');
    },
};
