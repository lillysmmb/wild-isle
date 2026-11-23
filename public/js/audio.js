// Sons du jeu, fabriqués directement par le navigateur (pas de fichiers à télécharger).
(function () {
  let ctx = null, master = null, noiseBuf = null;
  function init() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { return false; }
  }
  function vol() { return SETTINGS.sound ? SETTINGS.volume : 0; }
  function out(gain, pan) {
    const g = ctx.createGain(); g.gain.value = gain;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(master); }
    else g.connect(master);
    return g;
  }
  function noise(dur, freq, q, gain, pan, type = 'bandpass') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const o = out(0, pan), t = ctx.currentTime;
    o.gain.setValueAtTime(gain, t); o.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(o); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function tone(type, f0, f1, dur, gain, pan) {
    const o = ctx.createOscillator(); o.type = type;
    const g = out(0, pan), t = ctx.currentTime;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    step: (g, p, run) => noise(run ? 0.09 : 0.07, run ? 420 : 300, 1.2, 0.5 * g, p),
    swing: (g, p) => noise(0.14, 1800, 0.8, 0.25 * g, p, 'highpass'),
    hit: (g, p) => { noise(0.08, 900, 1, 0.6 * g, p); tone('square', 220, 90, 0.08, 0.12 * g, p); },
    chopWood: (g, p) => { noise(0.1, 700, 3, 0.6 * g, p); tone('triangle', 180, 120, 0.08, 0.2 * g, p); },
    chopStone: (g, p) => { noise(0.08, 2500, 4, 0.5 * g, p); tone('square', 900, 600, 0.05, 0.08 * g, p); },
    bow: (g, p) => { tone('triangle', 520, 160, 0.16, 0.25 * g, p); noise(0.1, 2000, 1, 0.15 * g, p, 'highpass'); },
    sling: (g, p) => tone('triangle', 700, 300, 0.1, 0.2 * g, p),
    pistol: (g, p) => { noise(0.12, 1200, 0.7, 0.9 * g, p); tone('square', 160, 50, 0.1, 0.25 * g, p); },
    sniper: (g, p) => { noise(0.35, 700, 0.5, 1.0 * g, p); tone('sawtooth', 120, 35, 0.3, 0.35 * g, p); },
    boom: (g, p) => { noise(0.9, 160, 0.6, 1.2 * g, p, 'lowpass'); tone('sine', 90, 30, 0.7, 0.6 * g, p); },
    build: (g, p) => { noise(0.12, 400, 2, 0.6 * g, p); tone('sine', 140, 90, 0.12, 0.3 * g, p); },
    break: (g, p) => { noise(0.3, 500, 0.8, 0.8 * g, p); },
    loot: (g, p) => { tone('triangle', 660, 990, 0.12, 0.25 * g, p); setTimeout(() => tone('triangle', 990, 1320, 0.15, 0.2 * g, p), 90); },
    bite: (g, p) => { noise(0.07, 1600, 2, 0.5 * g, p); tone('sawtooth', 300, 180, 0.07, 0.15 * g, p); },
    trap: (g, p) => { tone('sawtooth', 400, 100, 0.25, 0.3 * g, p); noise(0.2, 900, 2, 0.4 * g, p); },
    click: (g) => tone('triangle', 880, 660, 0.05, 0.15 * g, 0),
    craft: (g) => { tone('triangle', 520, 780, 0.1, 0.2 * g, 0); setTimeout(() => tone('triangle', 780, 1040, 0.12, 0.18 * g, 0), 80); },
    error: (g) => tone('square', 200, 150, 0.15, 0.12 * g, 0),
    death: (g, p) => tone('sawtooth', 300, 60, 0.6, 0.3 * g, p),
    win: (g) => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone('triangle', f, f, 0.25, 0.25 * g, 0), i * 130)); }
  };
  window.AUDIO = {
    unlock() { if (init() && ctx.state === 'suspended') ctx.resume(); },
    // x,y : position dans le monde ; lx,ly : position de l'auditeur
    play(name, x, y, lx, ly, maxD = 1200, extra) {
      if (!ctx || !vol() || !SFX[name]) return;
      let g = 1, pan = 0;
      if (x !== undefined && lx !== undefined) {
        const d = Math.hypot(x - lx, y - ly);
        if (d > maxD) return;
        g = Math.pow(1 - d / maxD, 1.6);
        pan = (x - lx) / 500;
      }
      master.gain.value = vol();
      try { SFX[name](g, pan, extra); } catch (e) {}
    }
  };
})();
