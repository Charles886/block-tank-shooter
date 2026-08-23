// ============================================================
// 音效系統 — 用 WebAudio 合成，不需外部檔案
// ============================================================
const Sound = {
    ctx: null,

    init() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    // 基礎音色：type / 起始頻率 / 結束頻率 / 秒數 / 音量
    tone(type, f0, f1, dur, vol = 0.15, delay = 0) {
        if (!this.ctx) return;
        const t0 = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    },

    noise(dur, vol = 0.2, delay = 0) {
        if (!this.ctx) return;
        const t0 = this.ctx.currentTime + delay;
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        src.connect(gain).connect(this.ctx.destination);
        src.start(t0);
    },

    shoot()    { this.tone('square', 880, 220, 0.08, 0.06); },
    hit()      { this.tone('triangle', 300, 120, 0.06, 0.1); },
    explode()  { this.noise(0.35, 0.25); this.tone('sawtooth', 160, 40, 0.4, 0.15); },
    pickup()   { this.tone('sine', 520, 520, 0.08, 0.12); this.tone('sine', 780, 780, 0.1, 0.12, 0.08); },
    heal()     { this.tone('sine', 440, 880, 0.25, 0.12); },
    wave()     { this.tone('sine', 660, 660, 0.1, 0.1); this.tone('sine', 880, 880, 0.15, 0.1, 0.1); },
    hurt()     { this.tone('sawtooth', 200, 80, 0.2, 0.15); },
    gameOver() { this.tone('sawtooth', 300, 60, 1.2, 0.2); this.noise(0.8, 0.2, 0.1); },
};
