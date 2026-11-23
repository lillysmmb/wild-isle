// Le jeu dans le navigateur : affichage, commandes et interface pendant la partie.
(function () {
  const C = window.WI, D = window.DRAW, t = (k, v) => I18N.t(k, v);
  const T = C.TILE;
  const NODE_TYPES = ['tree', 'rock', 'plant', 'ore', 'wreck'];
  const ANIMAL_TYPES = ['boar', 'wolf', 'snake'];
  const TILE_TYPES = C.BUILD_ORDER;
  const RES = ['wood', 'stone', 'fiber', 'metal'];
  const INTERP = 110; // ms de retard pour lisser les mouvements des autres

  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);

  const G = window.GAME = {
    running: false, socket: null, myId: null,
    onExit: null
  };

  let map, info, nodes, nodeBuckets, bushBuckets, crates, coastPath, grassPath, patchPaths, cavesL, cabinsL;
  let snaps = [], me = null, lastSnap = null, prevAtk = new Map();
  let local = { x: 0, y: 0 }, cam = { x: 0, y: 0, zoom: 1 };
  let W = 0, H = 0, DPR = 1, now = 0, lastFrame = 0, gameTime = 0;
  const input = { mx: 0, my: 0, a: 0, run: false, attack: false, aimD: 200, interact: false };
  const keys = new Set();
  const mouse = { x: 0, y: 0, inside: false };
  let buildPiece = null, particles = [], stepAcc = 0;
  let inputTimer = null, hudTimer = 0, miniTimer = 0;
  let isTouch = false, touchRun = false, touchUse = false;
  const stick = { move: { id: null, x: 0, y: 0 }, aim: { id: null, x: 0, y: 0, active: false } };
  let spectList = [], lastHudSlot = -1;

  // ---------- démarrage ----------
  G.start = function (data, socket, myId) {
    G.socket = socket; G.myId = myId; G.running = true;
    map = data;
    info = new Map(data.players.map(p => [p.id, p]));
    nodes = new Map(); nodeBuckets = new Map(); bushBuckets = new Map(); crates = new Map();
    for (const n of data.nodes) {
      const o = { id: n[0], type: NODE_TYPES[n[1]], x: n[2], y: n[3], alive: !!n[4], seed: n[0] * 7 % 13 };
      nodes.set(o.id, o); addB(nodeBuckets, o);
    }
    data.bushes.forEach((b, i) => addB(bushBuckets, { x: b[0], y: b[1], r: b[2], seed: i * 1.3 }));
    for (const c of data.crates) crates.set(c[0], { id: c[0], x: c[1], y: c[2], opened: !!c[3] });
    cavesL = data.caves.map(c => ({ x: c[0], y: c[1], r: c[2] }));
    cabinsL = data.cabins.map(c => ({ gx: c[0], gy: c[1] }));
    buildPaths();
    snaps = []; me = null; lastSnap = null; prevAtk = new Map(); particles = [];
    buildPiece = null; keys.clear(); Object.assign(input, { mx: 0, my: 0, attack: false, interact: false, run: false });
    const mine = info.get(myId);
    local.x = cam.x = data.cx; local.y = cam.y = data.cy;
    document.body.classList.add('ingame');
    $('hud').classList.remove('hidden');
    isTouch = document.body.classList.contains('touch');
    $('touch').classList.toggle('hidden', !isTouch);
    $('feed').innerHTML = '';
    $('craft-panel').classList.add('hidden'); $('build-panel').classList.add('hidden'); $('build-help').classList.add('hidden');
    $('spect').classList.add('hidden'); $('downed-msg').classList.add('hidden'); $('revive-msg').classList.add('hidden');
    buildHotbar(); buildResPanel(); buildCraftList(); buildBuildList();
    if (mine && data.players.length === 1) toast(t('practice'));
    clearInterval(inputTimer);
    inputTimer = setInterval(sendInput, 1000 / 30);
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  };
  G.stop = function () {
    G.running = false;
    clearInterval(inputTimer);
    document.body.classList.remove('ingame');
    $('hud').classList.add('hidden');
  };

  function addB(m, o) { const k = ((o.x / 256) | 0) + ',' + ((o.y / 256) | 0); if (!m.has(k)) m.set(k, []); m.get(k).push(o); }
  function nearB(m, x0, y0, x1, y1, cb) {
    for (let bx = ((x0 - 100) / 256) | 0; bx <= ((x1 + 100) / 256) | 0; bx++)
      for (let by = ((y0 - 100) / 256) | 0; by <= ((y1 + 140) / 256) | 0; by++) { const b = m.get(bx + ',' + by); if (b) for (const o of b) cb(o); }
  }
  function coastR(th) {
    const a = map.coast;
    return C.ISLAND_R * (0.9 + 0.07 * Math.sin(3 * th + a[0]) + 0.04 * Math.sin(5 * th + a[1]) + 0.025 * Math.sin(11 * th + a[2]));
  }
  function buildPaths() {
    const ring = (off) => { const p = new Path2D(); for (let i = 0; i <= 360; i++) { const th = i / 360 * Math.PI * 2, r = coastR(th) + off; const x = map.cx + Math.cos(th) * r, y = map.cy + Math.sin(th) * r; i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); return p; };
    coastPath = ring(0); grassPath = ring(-C.BEACH);
    G.ring = ring;
    G.waves = [ring(60), ring(140)];
    patchPaths = [new Path2D(), new Path2D()];
    for (const p of map.patches) { const pp = patchPaths[p[3]]; pp.moveTo(p[0] + p[2], p[1]); pp.arc(p[0], p[1], p[2], 0, Math.PI * 2); }
  }

  // ---------- réception ----------
  G.onSnap = function (s) {
    if (!G.running) return;
    s._t = performance.now();
    snaps.push(s); if (snaps.length > 30) snaps.shift();
    const wasDead = me && me.dead;
    me = s.me; lastSnap = s;
    if (s.L) spectList = s.L;
    if (!me.spect) {
      const err = Math.hypot(me.x - local.x, me.y - local.y);
      if (err > 220 || wasDead) { local.x = me.x; local.y = me.y; }
    }
    for (const f of s.FX) spawnFx(f);
    const lis = listener();
    for (const st of s.ST) AUDIO.play('step', st[0], st[1], lis.x, lis.y, C.STEP_HEAR, !!st[2]);
    for (const p of s.P) {
      const prev = prevAtk.get(p[0]);
      if (prev !== undefined && p[7] < prev && p[7] < 0.2) {
        const w = C.SLOTS[p[6]];
        if (w === 'fists' || w === 'sword') AUDIO.play('swing', p[1], p[2], lis.x, lis.y);
      }
      prevAtk.set(p[0], p[7]);
    }
  };
  G.onNode = function (d) { const n = nodes && nodes.get(d[0]); if (n) n.alive = !!d[1]; };
  G.onCrate = function (d) { const c = crates && crates.get(d[0]); if (c) c.opened = !!d[1]; };
  G.onFeed = function (f) {
    if (!G.running) return;
    const li = document.createElement('li');
    const x = f.by ? t('x_' + f.by) : null;
    if (f.k === 'kill') li.textContent = f.a ? t('f_kill', { a: f.a, b: f.b }) : x ? t('f_killBy', { b: f.b, x }) : t('f_died', { b: f.b });
    else if (f.k === 'down') li.textContent = t('f_down', { b: f.b });
    else if (f.k === 'revive') { li.textContent = t('f_revive', { a: f.a, b: f.b }); li.className = 'ok'; }
    else if (f.k === 'left') li.textContent = t('f_left', { b: f.b });
    const feed = $('feed'); feed.prepend(li);
    while (feed.children.length > 5) feed.lastChild.remove();
    if (f.k === 'kill' && me) { const lis = listener(); AUDIO.play('death', lis.x, lis.y, lis.x, lis.y); }
  };
  G.onMsg = function (m) {
    if (m.k === 'crafted') { toast(t('m_crafted') + ' ' + t('w_' + m.item)); AUDIO.play('craft'); return; }
    toast(t('m_' + m.k)); if (m.k !== 'trapSet') AUDIO.play('error');
  };
  G.onGain = function (g) {
    if (!g) return;
    for (const k in g) {
      const name = RES.includes(k) ? t(k) : t('w_' + k);
      toast(t('gained', { n: g[k], r: name }), 'gain');
      const el = document.querySelector('.res[data-r="' + k + '"]'); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }
  };

  function listener() {
    if (me && me.spect) { const p = interpPlayer(me.id); if (p) return p; return { x: me.x, y: me.y }; }
    return local;
  }

  // ---------- commandes ----------
  function code(action) { return SETTINGS.keys[action] && SETTINGS.keys[action].code; }
  function updateMoveFromKeys() {
    if (isTouch && stick.move.id !== null) return;
    let x = 0, y = 0;
    if (keys.has(code('up')) || keys.has('ArrowUp')) y -= 1;
    if (keys.has(code('down')) || keys.has('ArrowDown')) y += 1;
    if (keys.has(code('left')) || keys.has('ArrowLeft')) x -= 1;
    if (keys.has(code('right')) || keys.has('ArrowRight')) x += 1;
    const l = Math.hypot(x, y) || 1;
    input.mx = x / l; input.my = y / l;
    input.run = keys.has(code('run')) || touchRun;
    input.interact = keys.has(code('interact')) || touchUse;
  }
  window.addEventListener('keydown', e => {
    if (!G.running || G.captureKeys) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    AUDIO.unlock();
    keys.add(e.code);
    if (e.code === code('build')) togglePanel('build-panel');
    else if (e.code === code('craft')) togglePanel('craft-panel');
    else if (e.code === code('cancel')) { cancelBuild(); $('craft-panel').classList.add('hidden'); $('build-panel').classList.add('hidden'); }
    else if (/^Digit[1-8]$/.test(e.code)) selectSlot(+e.code.slice(5) - 1);
    if (me && me.spect && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) spectCycle(e.code === 'ArrowRight' ? 1 : -1);
    updateMoveFromKeys();
    if (e.code === 'Tab' || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys.delete(e.code); if (G.running) updateMoveFromKeys(); });
  window.addEventListener('blur', () => { keys.clear(); input.attack = false; updateMoveFromKeys(); });

  canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true; });
  canvas.addEventListener('mousedown', e => {
    if (!G.running) return;
    AUDIO.unlock();
    if (e.button === 2) { cancelBuild(); return; }
    if (e.button !== 0) return;
    if (buildPiece) { placeAtScreen(e.clientX, e.clientY); return; }
    input.attack = true;
  });
  window.addEventListener('mouseup', e => { if (e.button === 0) input.attack = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => {
    if (!G.running || !me) return;
    const owned = ownedSlots();
    let i = owned.indexOf(me.slot); if (i < 0) i = 0;
    i = (i + (e.deltaY > 0 ? 1 : -1) + owned.length) % owned.length;
    selectSlot(owned[i]);
  }, { passive: true });

  // tactile
  function setupStick(el, s, isAim) {
    const knob = el.querySelector('.knob');
    const R = 60;
    const upd = (tch) => {
      const r = el.getBoundingClientRect();
      let dx = tch.clientX - (r.left + r.width / 2), dy = tch.clientY - (r.top + r.height / 2);
      const l = Math.hypot(dx, dy); if (l > R) { dx = dx / l * R; dy = dy / l * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      s.x = dx / R; s.y = dy / R;
      if (isAim) {
        const m = Math.hypot(s.x, s.y);
        s.active = m > 0.3;
        if (m > 0.15) input.a = Math.atan2(s.y, s.x);
        const w = C.WEAPONS[C.SLOTS[me ? me.slot : 0]];
        input.aimD = Math.max(80, m * (w && w.range ? w.range : 300));
        input.attack = s.active;
      } else { input.mx = s.x; input.my = s.y; }
    };
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); AUDIO.unlock(); const tch = e.changedTouches[0]; s.id = tch.identifier; upd(tch); }, { passive: false });
    el.addEventListener('touchmove', e => { e.preventDefault(); for (const tch of e.changedTouches) if (tch.identifier === s.id) upd(tch); }, { passive: false });
    const end = e => {
      for (const tch of e.changedTouches) if (tch.identifier === s.id) {
        s.id = null; s.x = s.y = 0; knob.style.transform = '';
        if (isAim) { s.active = false; input.attack = false; } else { input.mx = 0; input.my = 0; }
      }
    };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }
  setupStick($('stick-move'), stick.move, false);
  setupStick($('stick-aim'), stick.aim, true);
  $('t-run').addEventListener('touchstart', e => { e.preventDefault(); touchRun = !touchRun; $('t-run').classList.toggle('on', touchRun); input.run = touchRun; }, { passive: false });
  $('t-use').addEventListener('touchstart', e => { e.preventDefault(); touchUse = true; input.interact = true; $('t-use').classList.add('on'); }, { passive: false });
  $('t-use').addEventListener('touchend', () => { touchUse = false; input.interact = false; $('t-use').classList.remove('on'); });
  let swipe = null;
  canvas.addEventListener('touchstart', e => {
    if (!G.running) return;
    const tch = e.changedTouches[0];
    if (buildPiece) { placeAtScreen(tch.clientX, tch.clientY); return; }
    swipe = { x: tch.clientX, y: tch.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (!swipe || !me || !me.spect) return;
    const tch = e.changedTouches[0];
    const dx = tch.clientX - swipe.x;
    if (Math.abs(dx) > 50) spectCycle(dx < 0 ? 1 : -1);
    swipe = null;
  }, { passive: true });

  function sendInput() {
    if (!G.running || !G.socket) return;
    if (!isTouch && mouse.inside && me) {
      const p = screenToWorld(mouse.x, mouse.y);
      input.a = Math.atan2(p.y - local.y, p.x - local.x);
      input.aimD = Math.hypot(p.x - local.x, p.y - local.y);
    }
    G.socket.emit('input', { mx: +input.mx.toFixed(3), my: +input.my.toFixed(3), a: +input.a.toFixed(3), run: input.run, attack: input.attack && !buildPiece, aimD: Math.round(input.aimD), interact: input.interact });
  }
  function screenToWorld(sx, sy) { return { x: cam.x + (sx * DPR - W / 2) / cam.zoom, y: cam.y + (sy * DPR - H / 2) / cam.zoom }; }

  function ownedSlots() {
    if (!me) return [0];
    return C.SLOTS.map((w, i) => i).filter(i => hasW(C.SLOTS[i]));
  }
  function hasW(w) {
    if (!me) return w === 'fists';
    if (w === 'bomb') return me.bombs > 0;
    if (w === 'trap') return me.traps > 0;
    return me.owned.includes(w);
  }
  function selectSlot(i) {
    if (!me || !hasW(C.SLOTS[i])) return;
    me.slot = i;
    G.socket.emit('act', { type: 'select', slot: i });
    AUDIO.play('click');
    updateHud(true);
  }
  function spectCycle(dir) {
    if (!spectList.length || !me) return;
    let i = spectList.indexOf(me.id);
    i = (i + dir + spectList.length) % spectList.length;
    G.socket.emit('act', { type: 'spectate', target: spectList[i] });
  }
  $('spect-prev').onclick = () => spectCycle(-1);
  $('spect-next').onclick = () => spectCycle(1);

  // ---------- construction / fabrication ----------
  function togglePanel(id) {
    const el = $(id), other = id === 'craft-panel' ? 'build-panel' : 'craft-panel';
    $(other).classList.add('hidden');
    el.classList.toggle('hidden');
    if (id === 'craft-panel') refreshCraft(); else refreshBuild();
  }
  $('btn-craft').onclick = () => togglePanel('craft-panel');
  $('btn-build').onclick = () => togglePanel('build-panel');
  document.querySelectorAll('#hud [data-close]').forEach(b => b.onclick = () => $(b.dataset.close).classList.add('hidden'));
  $('btn-build-cancel').onclick = cancelBuild;
  function cancelBuild() { buildPiece = null; $('build-help').classList.add('hidden'); refreshBuild(); }
  function placeAtScreen(sx, sy) {
    const p = screenToWorld(sx, sy);
    const gx = Math.floor(p.x / T), gy = Math.floor(p.y / T);
    G.socket.emit('act', { type: 'build', piece: buildPiece, gx, gy });
    setTimeout(() => { if (lastSnap && lastSnap.S.some(s => s[1] === gx && s[2] === gy)) AUDIO.play('build'); }, 200);
    refreshBuild();
  }
  function canPay(cost) { if (!me) return false; for (const k in cost) if ((me.inv[k] || 0) < cost[k]) return false; return true; }
  function costHtml(cost) {
    return Object.entries(cost).map(([k, v]) => `<span class="${me && (me.inv[k] || 0) < v ? 'miss' : ''}">${v} ${t(k)}</span>`).join('');
  }
  function iconCanvas(name, size = 46) {
    const c = document.createElement('canvas'); c.width = c.height = size * 2;
    const x = c.getContext('2d'); x.scale(2, 2); D.icon(x, name, size); return c;
  }
  function buildCraftList() {
    const box = $('craft-list'); box.innerHTML = '';
    for (const item of Object.keys(C.RECIPES)) {
      const row = document.createElement('div'); row.className = 'recipe'; row.dataset.item = item;
      row.append(iconCanvas(item));
      const mid = document.createElement('div'); mid.innerHTML = `<div class="rname">${t('w_' + item)}</div><div class="cost"></div>`;
      row.append(mid);
      const b = document.createElement('button'); b.textContent = '+';
      b.onclick = () => { G.socket.emit('act', { type: 'craft', item }); };
      row.append(b); box.append(row);
    }
  }
  function refreshCraft() {
    document.querySelectorAll('#craft-list .recipe').forEach(row => {
      const r = C.RECIPES[row.dataset.item];
      row.querySelector('.cost').innerHTML = costHtml(r);
      row.querySelector('.rname').textContent = t('w_' + row.dataset.item);
      row.querySelector('button').disabled = !canPay(r);
    });
  }
  function buildBuildList() {
    const box = $('build-list'); box.innerHTML = '';
    for (const piece of C.BUILD_ORDER) {
      const row = document.createElement('div'); row.className = 'recipe'; row.dataset.piece = piece;
      row.append(iconCanvas(piece));
      const mid = document.createElement('div'); mid.innerHTML = `<div class="rname">${t('b_' + piece)}</div><div class="cost"></div>`;
      row.append(mid);
      const b = document.createElement('button'); b.textContent = '▶';
      b.onclick = () => {
        buildPiece = piece; $('build-panel').classList.add('hidden');
        $('build-help-txt').textContent = t('b_' + piece) + ' — ' + t(isTouch ? 'buildHelpTouch' : 'buildHelp');
        $('build-help').classList.remove('hidden'); refreshBuild();
      };
      row.append(b); box.append(row);
    }
  }
  function refreshBuild() {
    document.querySelectorAll('#build-list .recipe').forEach(row => {
      const d = C.BUILD[row.dataset.piece];
      row.querySelector('.cost').innerHTML = costHtml(d.cost);
      row.querySelector('.rname').textContent = t('b_' + row.dataset.piece);
      row.querySelector('button').disabled = !canPay(d.cost);
      row.classList.toggle('on', buildPiece === row.dataset.piece);
    });
    if (buildPiece && !canPay(C.BUILD[buildPiece].cost)) { /* garde le mode, le serveur refusera */ }
  }
  function buildHotbar() {
    const bar = $('hotbar'); bar.innerHTML = '';
    C.SLOTS.forEach((w, i) => {
      const b = document.createElement('button'); b.className = 'slot'; b.dataset.i = i; b.title = t('w_' + w);
      b.append(iconCanvas(w, 48));
      const n = document.createElement('span'); n.className = 'n'; n.textContent = i + 1; b.append(n);
      const c = document.createElement('span'); c.className = 'c'; b.append(c);
      b.onclick = () => selectSlot(i);
      b.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
      bar.append(b);
    });
  }
  function buildResPanel() {
    const box = $('hud-res'); box.innerHTML = '';
    for (const r of RES) {
      const d = document.createElement('div'); d.className = 'res'; d.dataset.r = r; d.title = t(r);
      d.append(iconCanvas(r, 30)); const b = document.createElement('b'); b.textContent = '0'; d.append(b); box.append(d);
    }
  }
  document.addEventListener('langchange', () => { if (G.running) { buildHotbar(); refreshCraft(); refreshBuild(); updateHud(true); } });

  function toast(msg, cls) {
    const el = document.createElement('div'); el.className = 'toast' + (cls ? ' ' + cls : ''); el.textContent = msg;
    const box = $('toasts'); box.append(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), 2300);
  }

  // ---------- interface (HUD) ----------
  function updateHud(force) {
    if (!me) return;
    const hpf = Math.max(0, me.hp) / C.MAX_HP;
    $('hud-hp').style.width = (hpf * 100) + '%';
    $('hud-hp').classList.toggle('low', hpf < 0.35);
    $('hud-hp-txt').textContent = Math.max(0, me.hp);
    $('hud-kills').textContent = me.kills || 0;
    $('hud-alive').textContent = lastSnap ? lastSnap.alive : 0;
    const night = lastSnap && lastSnap.dk > 0.5;
    $('hud-clock').textContent = night ? t('night') : t('day');
    $('hud-clock-icon').classList.toggle('moon', !!night);
    for (const r of RES) { const el = document.querySelector('.res[data-r="' + r + '"] b'); if (el) el.textContent = me.inv[r] || 0; }
    document.querySelectorAll('#hotbar .slot').forEach(b => {
      const i = +b.dataset.i, w = C.SLOTS[i];
      b.classList.toggle('locked', !hasW(w));
      b.classList.toggle('sel', me.slot === i);
      const c = b.querySelector('.c');
      c.textContent = w === 'pistol' || w === 'sniper' ? (me.ammo[w] || '') : w === 'bomb' ? (me.bombs || '') : w === 'trap' ? (me.traps || '') : '';
    });
    if (!$('craft-panel').classList.contains('hidden')) refreshCraft();
    if (!$('build-panel').classList.contains('hidden')) refreshBuild();
    $('kbd-craft').textContent = SETTINGS.keyLabel('craft');
    $('kbd-build').textContent = SETTINGS.keyLabel('build');
    // à terre / relève / spectateur
    $('downed-msg').classList.toggle('hidden', !me.downed || me.spect);
    if (me.downed && !me.spect) { $('downed-txt').textContent = t('downedHelp', { k: SETTINGS.keyLabel('interact') }); $('downed-bar').style.width = Math.max(0, me.downedT / C.DOWNED_TIME * 100) + '%'; }
    $('revive-msg').classList.toggle('hidden', !(me.revive > 0) || me.spect);
    if (me.revive > 0) $('revive-bar').style.width = (me.revive * 100) + '%';
    $('spect').classList.toggle('hidden', !me.spect);
    if (me.spect) { const p = info.get(me.id); $('spect-name').textContent = p ? p.name : ''; }
    const hide = me.spect;
    $('hotbar').classList.toggle('hidden', hide); $('hud-res').classList.toggle('hidden', hide);
    document.querySelector('.hud-side-buttons').classList.toggle('hidden', hide);
    if (isTouch) $('touch').classList.toggle('hidden', hide || me.dead);
  }

  function drawMinimap() {
    const mc = $('minimap'), m = mc.getContext('2d'), S = mc.width;
    const sc = S / (C.ISLAND_R * 2.3);
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.clearRect(0, 0, S, S);
    m.fillStyle = '#0f2e44'; m.fillRect(0, 0, S, S);
    m.setTransform(sc, 0, 0, sc, S / 2 - map.cx * sc, S / 2 - map.cy * sc);
    m.fillStyle = '#d9b26a'; m.fill(coastPath);
    m.fillStyle = '#3f7f36'; m.fill(grassPath);
    m.fillStyle = '#2b2a33'; for (const c of cavesL) { m.beginPath(); m.arc(c.x, c.y, c.r, 0, 7); m.fill(); }
    m.fillStyle = '#8a5a2b'; for (const c of cabinsL) m.fillRect(c.gx * T, c.gy * T, T * 3, T * 3);
    if (lastSnap) for (const p of lastSnap.P) {
      const pi = info.get(p[0]); if (!pi) continue;
      const mine = p[0] === me.id;
      const mate = isMate(p[0]);
      if (!mine && !mate) continue;
      m.fillStyle = mine ? '#ffb000' : '#4ade80';
      m.beginPath(); m.arc(mine && !me.spect ? local.x : p[1], mine && !me.spect ? local.y : p[2], 90, 0, 7); m.fill();
    }
  }

  // ---------- particules / effets ----------
  function burst(x, y, n, colors, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random());
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life, max: life, c: colors[(Math.random() * colors.length) | 0], s: size * (0.6 + Math.random() * 0.8), g: 300 });
    }
  }
  function spawnFx(f) {
    const lis = listener();
    switch (f.k) {
      case 'hit': burst(f.x, f.y - 10, 8, ['#ef4444', '#fff', '#b91c1c'], 160, 0.4, 4); AUDIO.play('hit', f.x, f.y, lis.x, lis.y); break;
      case 'chop': {
        const ty = NODE_TYPES[f.t];
        if (ty === 'tree' || ty === 'wreck') { burst(f.x, f.y - 20, 6, ['#c9965f', '#8a5a2b'], 140, 0.5, 4); AUDIO.play('chopWood', f.x, f.y, lis.x, lis.y); }
        else if (ty === 'plant') { burst(f.x, f.y - 6, 6, ['#84cc16', '#65a30d'], 120, 0.5, 3); AUDIO.play('swing', f.x, f.y, lis.x, lis.y); }
        else { burst(f.x, f.y - 10, 7, ['#aab2c0', '#6f788a', '#f59e0b'], 150, 0.5, 4); AUDIO.play('chopStone', f.x, f.y, lis.x, lis.y); }
        break;
      }
      case 'shot': {
        const w = C.SLOTS[f.w];
        particles.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.08, max: 0.08, c: '#ffd166', s: w === 'sniper' ? 26 : 16, g: 0, flash: true });
        AUDIO.play(w === 'bow' ? 'bow' : w === 'slingshot' ? 'sling' : w, f.x, f.y, lis.x, lis.y, w === 'sniper' ? 2600 : 1500);
        if (w === 'pistol' || w === 'sniper') G.flashes.push({ x: f.x, y: f.y, until: now + 90 });
        break;
      }
      case 'spark': burst(f.x, f.y, 5, ['#ffd166', '#fff'], 120, 0.25, 3); break;
      case 'boom':
        particles.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.45, max: 0.45, c: '#ff7a00', s: f.r, g: 0, ring: true });
        burst(f.x, f.y, 26, ['#ff7a00', '#ffd166', '#ef4444', '#3f3a33'], 320, 0.8, 7);
        burst(f.x, f.y, 14, ['#3f3a33', '#52525b'], 90, 1.4, 12);
        G.flashes.push({ x: f.x, y: f.y, until: now + 300, r: 1.6 });
        AUDIO.play('boom', f.x, f.y, lis.x, lis.y, 2600); G.shake = 14; break;
      case 'build': burst(f.x, f.y, 10, ['#c9965f', '#9aa3b5'], 90, 0.5, 5); AUDIO.play('build', f.x, f.y, lis.x, lis.y); break;
      case 'thit': burst(f.x, f.y - 10, 5, ['#c9965f', '#9aa3b5'], 120, 0.4, 4); AUDIO.play('chopWood', f.x, f.y, lis.x, lis.y); break;
      case 'tbreak': burst(f.x, f.y, 18, ['#c9965f', '#8a5a2b', '#9aa3b5'], 200, 0.8, 6); AUDIO.play('break', f.x, f.y, lis.x, lis.y); break;
      case 'loot': burst(f.x, f.y - 10, 16, ['#ffd166', '#fff', '#ffb000'], 140, 0.8, 4); AUDIO.play('loot', f.x, f.y, lis.x, lis.y); break;
      case 'bite': burst(f.x, f.y - 10, 6, ['#ef4444', '#7f1d1d'], 120, 0.4, 4); AUDIO.play('bite', f.x, f.y, lis.x, lis.y); break;
      case 'trap': burst(f.x, f.y, 10, ['#c8a26a', '#ef4444'], 160, 0.5, 4); AUDIO.play('trap', f.x, f.y, lis.x, lis.y); break;
      case 'adead': burst(f.x, f.y, 12, ['#7f1d1d', '#6b4226'], 140, 0.6, 5); break;
    }
  }
  G.flashes = [];

  // ---------- interpolation ----------
  function snapPair() {
    const rt = performance.now() - INTERP;
    let a = null, b = null;
    for (let i = snaps.length - 1; i >= 0; i--) { if (snaps[i]._t <= rt) { a = snaps[i]; b = snaps[i + 1] || snaps[i]; break; } }
    if (!a) { a = snaps[0]; b = snaps[0]; }
    const f = b === a ? 0 : Math.min(1, (rt - a._t) / (b._t - a._t));
    return { a, b, f };
  }
  function lerpAng(a, b, f) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * f; }
  function interpList(key, idIdx, xi, yi, ai) {
    const { a, b, f } = snapPair();
    if (!a) return [];
    const prev = new Map(a[key].map(e => [e[idIdx], e]));
    return b[key].map(e => {
      const p = prev.get(e[idIdx]);
      if (!p) return { raw: e, x: e[xi], y: e[yi], a: ai !== undefined ? e[ai] : 0 };
      return { raw: e, x: p[xi] + (e[xi] - p[xi]) * f, y: p[yi] + (e[yi] - p[yi]) * f, a: ai !== undefined ? lerpAng(p[ai], e[ai], f) : 0 };
    });
  }
  function interpPlayer(id) {
    const l = interpList('P', 0, 1, 2, 3);
    return l.find(p => p.raw[0] === id) || null;
  }

  // ---------- déplacement local (prédiction) ----------
  function predict(dt) {
    if (!me || me.spect || me.dead) return;
    let sp = me.downed ? C.DOWNED_SPEED : (input.run ? C.RUN_SPEED : C.WALK_SPEED);
    if (me.slow) sp *= 0.5;
    const ox = local.x, oy = local.y;
    local.x += input.mx * sp * dt; local.y += input.my * sp * dt;
    collideLocal(local, C.PLAYER_R);
    const moved = Math.hypot(local.x - ox, local.y - oy);
    stepAcc += moved;
    if (stepAcc > (input.run ? 70 : 58)) { stepAcc = 0; AUDIO.play('step', local.x, local.y, local.x, local.y, 800, input.run); }
    // correction douce vers la position du serveur
    const k = Math.min(1, dt * 5);
    local.x += (me.x - local.x) * k * 0.6; local.y += (me.y - local.y) * k * 0.6;
  }
  function collideLocal(e, r) {
    nearB(nodeBuckets, e.x - 80, e.y - 80, e.x + 80, e.y + 80, n => {
      if (!n.alive || n.type === 'plant') return;
      const nr = { tree: 26, rock: 34, ore: 30, wreck: 40 }[n.type] * 0.8;
      const dx = e.x - n.x, dy = e.y - n.y, d = Math.hypot(dx, dy), m = r + nr;
      if (d < m && d > 0.001) { e.x = n.x + dx / d * m; e.y = n.y + dy / d * m; }
    });
    if (lastSnap) for (const s of lastSnap.S) {
      const type = TILE_TYPES[s[3]]; if (!C.BUILD[type].solid) continue;
      if (C.BUILD[type].door && s[5]) continue;
      const gx = s[1], gy = s[2];
      if (Math.abs(gx * T + T / 2 - e.x) > T + r || Math.abs(gy * T + T / 2 - e.y) > T + r) continue;
      const qx = Math.max(gx * T, Math.min(e.x, gx * T + T)), qy = Math.max(gy * T, Math.min(e.y, gy * T + T));
      const dx = e.x - qx, dy = e.y - qy, d = Math.hypot(dx, dy);
      if (d < r && d > 0.001) { e.x = qx + dx / d * r; e.y = qy + dy / d * r; }
    }
    const dx = e.x - map.cx, dy = e.y - map.cy, d = Math.hypot(dx, dy) || 1, lim = coastR(Math.atan2(dy, dx)) - r - 10;
    if (d > lim) { e.x = map.cx + dx / d * lim; e.y = map.cy + dy / d * lim; }
  }

  // ---------- rendu ----------
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(window.innerWidth * DPR), h = Math.round(window.innerHeight * DPR);
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; }
  }
  const dark = document.createElement('canvas'), dctx = dark.getContext('2d');

  function frame(ts) {
    if (!G.running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - lastFrame) / 1000); lastFrame = ts; now = ts; gameTime += dt;
    resize();
    if (!map) return;
    predict(dt);
    // caméra
    let focus = local;
    if (me && me.spect) { const p = interpPlayer(me.id); if (p) focus = p; }
    cam.x += (focus.x - cam.x) * Math.min(1, dt * 12); cam.y += (focus.y - cam.y) * Math.min(1, dt * 12);
    if (Math.hypot(focus.x - cam.x, focus.y - cam.y) > 600) { cam.x = focus.x; cam.y = focus.y; }
    let zoom = Math.min(W / 1150, H / 660);
    if (me && !me.spect && C.SLOTS[me.slot] === 'sniper') zoom *= 0.72;
    cam.zoom += (zoom - cam.zoom) * Math.min(1, dt * 6);
    let sx = 0, sy = 0;
    if (G.shake > 0) { sx = (Math.random() - 0.5) * G.shake; sy = (Math.random() - 0.5) * G.shake; G.shake *= 0.85; if (G.shake < 0.5) G.shake = 0; }
    render(dt, focus, sx, sy);
    hudTimer -= dt; if (hudTimer <= 0) { hudTimer = 0.1; updateHud(); }
    miniTimer -= dt; if (miniTimer <= 0) { miniTimer = 0.4; drawMinimap(); }
  }

  function render(dt, focus, sx, sy) {
    const z = cam.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d3550'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(z, 0, 0, z, W / 2 - cam.x * z + sx, H / 2 - cam.y * z + sy);
    const vx0 = cam.x - W / 2 / z - 120, vx1 = cam.x + W / 2 / z + 120, vy0 = cam.y - H / 2 / z - 160, vy1 = cam.y + H / 2 / z + 160;
    const inView = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

    // mer et île
    ctx.lineWidth = 6; ctx.setLineDash([60, 40]); ctx.lineDashOffset = -gameTime * 20;
    ctx.strokeStyle = 'rgba(160,220,255,0.18)'; ctx.stroke(G.waves[1]);
    ctx.lineDashOffset = gameTime * 26; ctx.strokeStyle = 'rgba(160,220,255,0.28)'; ctx.stroke(G.waves[0]);
    ctx.setLineDash([]);
    ctx.fillStyle = '#1b5b7a'; ctx.save(); ctx.lineWidth = 120; ctx.strokeStyle = '#17577a'; ctx.stroke(coastPath); ctx.restore();
    ctx.fillStyle = '#dcb46e'; ctx.fill(coastPath);
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(240,250,255,' + (0.45 + Math.sin(gameTime * 2) * 0.15) + ')'; ctx.stroke(coastPath);
    ctx.fillStyle = '#3d7a34'; ctx.fill(grassPath);
    ctx.lineWidth = 8; ctx.strokeStyle = '#2f6128'; ctx.stroke(grassPath);
    ctx.fillStyle = 'rgba(80,140,64,0.55)'; ctx.fill(patchPaths[0]);
    ctx.fillStyle = 'rgba(46,96,40,0.55)'; ctx.fill(patchPaths[1]);
    // grottes
    for (const c of cavesL) {
      if (!inView(c.x, c.y, c.r)) continue;
      const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.2, c.x, c.y, c.r + 30);
      g.addColorStop(0, '#24232b'); g.addColorStop(0.85, '#34333d'); g.addColorStop(1, 'rgba(52,51,61,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 30, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.arc(c.x + Math.cos(i * 2.4) * c.r * 0.7 * ((i * 37 % 10) / 10), c.y + Math.sin(i * 2.4) * c.r * 0.7 * ((i * 53 % 10) / 10), 6, 0, 7); ctx.fill(); }
    }
    // planchers des cabanes
    for (const c of cabinsL) {
      const x = c.gx * T, y = c.gy * T;
      if (!inView(x, y, 200)) continue;
      ctx.fillStyle = '#5a3d23'; ctx.fillRect(x, y, T * 3, T * 3);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 1; i < 6; i++) { ctx.moveTo(x, y + i * T * 3 / 6); ctx.lineTo(x + T * 3, y + i * T * 3 / 6); } ctx.stroke();
    }
    const snap = lastSnap;
    // mines visibles
    if (snap) for (const m of snap.M) { ctx.save(); ctx.translate(m[1], m[2]); D.mine(ctx, gameTime); ctx.restore(); }
    // pièges à fil
    if (snap) for (const tr of snap.TR) {
      ctx.save(); ctx.globalAlpha = tr[5] ? 0.85 : 0.35;
      ctx.setLineDash(tr[5] ? [10, 6] : [4, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = tr[5] ? '#fde68a' : '#e5e7eb';
      ctx.beginPath(); ctx.moveTo(tr[1], tr[2] - 14); ctx.lineTo(tr[3], tr[4] - 14); ctx.stroke(); ctx.restore();
    }

    // ----- objets triés par profondeur -----
    const list = [];
    nearB(nodeBuckets, vx0, vy0, vx1, vy1, n => list.push({ y: n.y, k: 'n', o: n }));
    for (const c of crates.values()) if (inView(c.x, c.y)) list.push({ y: c.y, k: 'c', o: c });
    const players = snap ? interpList('P', 0, 1, 2, 3) : [];
    const animals = snap ? interpList('A', 0, 2, 3, 4) : [];
    for (const p of players) {
      if (me && p.raw[0] === me.id && !me.spect) { p.x = local.x; p.y = local.y; p.a = input.a; }
      list.push({ y: p.y, k: 'p', o: p });
    }
    for (const a of animals) list.push({ y: a.y, k: 'a', o: a });
    if (snap) for (const s of snap.S) list.push({ y: (s[2] + 1) * T - 2, k: 't', o: s });
    list.sort((a, b) => a.y - b.y);
    const focusP = focus;
    for (const e of list) {
      const o = e.o;
      ctx.save();
      if (e.k === 'n') {
        ctx.translate(o.x, o.y);
        if (o.type === 'tree') D.trunk(ctx, o.alive);
        else if (o.type === 'rock') { if (o.alive) D.rock(ctx, o.seed, false); else D.ellipse(ctx, 0, 4, 16, 8, '#6f788a'); }
        else if (o.type === 'ore') { if (o.alive) D.rock(ctx, o.seed, true); else D.ellipse(ctx, 0, 4, 16, 8, '#3a3d47'); }
        else if (o.type === 'plant') D.plant(ctx, o.seed, o.alive);
        else if (o.type === 'wreck') D.wreck(ctx, o.alive);
      } else if (e.k === 'c') { ctx.translate(o.x, o.y); D.crate(ctx, o.opened); }
      else if (e.k === 'p') drawPlayer(o);
      else if (e.k === 'a') { ctx.translate(o.x, o.y); D.animal(ctx, ANIMAL_TYPES[o.raw[1]], o.a, o.raw[6], gameTime + o.raw[0]); if (o.raw[5] < 1) bar(0, -30, 40, o.raw[5], '#f97316'); }
      else if (e.k === 't') { ctx.translate(o[1] * T, o[2] * T); D.tile(ctx, TILE_TYPES[o[3]], T, o[4], !!o[5], gameTime); }
      ctx.restore();
    }

    // ----- couche haute : feuillages, buissons, toits -----
    nearB(nodeBuckets, vx0, vy0, vx1, vy1, n => {
      if (n.type !== 'tree' || !n.alive) return;
      const under = Math.abs(focusP.x - n.x) < 60 && focusP.y < n.y + 10 && focusP.y > n.y - 110;
      ctx.save(); ctx.translate(n.x, n.y); ctx.globalAlpha = under ? 0.35 : 1; D.canopy(ctx, n.seed); ctx.restore();
    });
    nearB(bushBuckets, vx0, vy0, vx1, vy1, b => {
      const inside = Math.hypot(focusP.x - b.x, focusP.y - b.y) < b.r;
      ctx.save(); ctx.translate(b.x, b.y); D.bush(ctx, b.r, b.seed, inside ? 0.5 : 1); ctx.restore();
    });
    if (snap) for (const r of snap.RF) {
      const x = r[1] * T, y = r[2] * T;
      const under = focusP.x > x - 10 && focusP.x < x + T + 10 && focusP.y > y - 10 && focusP.y < y + T + 10;
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = r[5] || under ? 0.35 : 1; D.roof(ctx, T, !!r[5]); ctx.restore();
    }

    // projectiles
    if (snap) {
      const { a, b, f } = snapPair();
      const prevJ = a ? new Map(a.J.map(j => [j[0], j])) : new Map();
      for (const j of snap.J) {
        const age = (performance.now() - snap._t) / 1000;
        const x = j[1] + j[3] * age, y = j[2] + j[4] * age;
        const ang = Math.atan2(j[4], j[3]);
        const w = C.SLOTS[j[5]];
        ctx.save(); ctx.translate(x, y - 14); ctx.rotate(ang);
        if (w === 'bow') { ctx.strokeStyle = D.OL; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.strokeStyle = '#c9965f'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill(); ctx.fillStyle = '#ef4444'; ctx.fillRect(-28, -3, 6, 6); }
        else if (w === 'slingshot') D.circle(ctx, 0, 0, 5, '#9aa3b5', D.OL, 2);
        else { ctx.fillStyle = w === 'sniper' ? '#fff7d6' : '#ffd166'; ctx.fillRect(w === 'sniper' ? -50 : -22, -2, w === 'sniper' ? 54 : 26, 4); }
        ctx.restore();
      }
      for (const bmb of snap.B) {
        const age = (performance.now() - snap._t) / 1000;
        const ph = Math.min(1, bmb[3] + age / 0.5);
        const h = Math.sin(ph * Math.PI) * 60;
        ctx.save(); ctx.translate(bmb[1], bmb[2]);
        D.ellipse(ctx, 0, 4, 12, 5, 'rgba(0,0,0,0.3)', null);
        ctx.translate(0, -h - 10);
        const blink = bmb[4] > 0.6 && Math.sin(gameTime * 30) > 0;
        D.circle(ctx, 0, 0, 11, blink ? '#ef4444' : '#1f242e');
        D.circle(ctx, 6, -10, 3, '#ffb000', null);
        ctx.restore();
      }
    }

    // particules
    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.max(0, k);
      if (p.ring) { ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - k * 0.7), 0, 7); ctx.lineWidth = 14 * k; ctx.strokeStyle = p.c; ctx.stroke(); ctx.fillStyle = 'rgba(255,200,80,' + (k * 0.4) + ')'; ctx.fill(); }
      else if (p.flash) { ctx.beginPath(); ctx.arc(p.x, p.y - 14, p.s, 0, 7); ctx.fillStyle = p.c; ctx.fill(); }
      else { ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    }
    ctx.globalAlpha = 1;

    // aperçu de construction
    if (buildPiece && me && !me.spect) {
      let gx, gy;
      if (isTouch) { gx = Math.floor((local.x + Math.cos(input.a) * 90) / T); gy = Math.floor((local.y + Math.sin(input.a) * 90) / T); }
      else { const p = screenToWorld(mouse.x, mouse.y); gx = Math.floor(p.x / T); gy = Math.floor(p.y / T); }
      const cx = (gx + 0.5) * T, cy = (gy + 0.5) * T;
      const ok = Math.hypot(cx - local.x, cy - local.y) <= C.BUILD_RANGE && canPay(C.BUILD[buildPiece].cost) && !(snap && snap.S.some(s => s[1] === gx && s[2] === gy) && buildPiece !== 'roof');
      ctx.save(); ctx.globalAlpha = 0.55; ctx.translate(gx * T, gy * T);
      if (buildPiece === 'roof') D.roof(ctx, T, false); else D.tile(ctx, buildPiece, T, 1, false, gameTime);
      ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = ok ? '#4ade80' : '#ef4444'; ctx.strokeRect(0, 0, T, T);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(local.x, local.y, C.BUILD_RANGE, 0, 7); ctx.fillStyle = '#4ade80'; ctx.fill(); ctx.restore();
    }

    // visée
    if (me && !me.spect && !me.downed && !buildPiece) {
      const w = C.SLOTS[me.slot], wd = C.WEAPONS[w];
      ctx.save(); ctx.translate(local.x, local.y - 6);
      if (wd.kind === 'ranged') {
        ctx.rotate(input.a); ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(Math.min(wd.range, 900), 0); ctx.stroke();
      } else if (wd.kind === 'throw') {
        const d = Math.max(60, Math.min(wd.range, input.aimD));
        ctx.setLineDash([6, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,176,0,0.6)';
        ctx.beginPath(); ctx.arc(Math.cos(input.a) * d, Math.sin(input.a) * d + 6, wd.radius, 0, 7); ctx.stroke();
      } else if (wd.kind === 'melee') {
        ctx.rotate(input.a); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.arc(0, 0, C.PLAYER_R + wd.range, -wd.arc / 2, wd.arc / 2); ctx.stroke();
      }
      ctx.restore();
    }

    // noms et barres de vie
    for (const p of players) {
      const pi = info.get(p.raw[0]); if (!pi) continue;
      const mine = me && p.raw[0] === me.id;
      const mate = isMate(p.raw[0]);
      ctx.save(); ctx.translate(p.x, p.y);
      const hp = p.raw[4] / C.MAX_HP;
      if (p.raw[5] & 1) bar(0, -58, 56, p.raw[8], '#ef4444');
      else bar(0, -58, 56, hp, mine ? '#4ade80' : mate ? '#60a5fa' : '#ef4444');
      ctx.font = 'bold 15px Rajdhani, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = D.OL; ctx.strokeText(pi.name, 0, -66);
      ctx.fillStyle = mine ? '#ffd166' : mate ? '#bfdbfe' : '#fff'; ctx.fillText(pi.name, 0, -66);
      ctx.restore();
    }
    // indications (ouvrir / relever)
    if (me && !me.spect && me.dead === false && !me.downed) {
      let hint = null;
      for (const c of crates.values()) if (!c.opened && Math.hypot(c.x - local.x, c.y - local.y) < C.INTERACT_R) hint = { x: c.x, y: c.y - 40, k: 'interactHint' };
      for (const p of players) if (p.raw[0] !== me.id && (p.raw[5] & 1) && isMate(p.raw[0]) && Math.hypot(p.x - local.x, p.y - local.y) < C.INTERACT_R) hint = { x: p.x, y: p.y - 80, k: 'reviveHint' };
      if (hint) {
        const label = (isTouch ? 'E' : SETTINGS.keyLabel('interact')) + ' · ' + t(hint.k);
        ctx.font = 'bold 16px Rajdhani, sans-serif'; ctx.textAlign = 'center';
        const w = ctx.measureText(label).width + 18;
        D.rrect(ctx, hint.x - w / 2, hint.y - 16, w, 24, 4, 'rgba(10,13,20,0.85)', '#ffb000', 2);
        ctx.fillStyle = '#fff'; ctx.fillText(label, hint.x, hint.y + 1);
      }
    }

    // nuit et grottes
    const dk = snap ? snap.dk : 0;
    const inCave = me && me.cave;
    const level = Math.max(dk * 0.93, inCave ? 0.8 : 0);
    if (level > 0.01) {
      if (dark.width !== W || dark.height !== H) { dark.width = W; dark.height = H; }
      dctx.globalCompositeOperation = 'source-over';
      dctx.clearRect(0, 0, W, H);
      dctx.fillStyle = 'rgba(4,7,18,' + level + ')'; dctx.fillRect(0, 0, W, H);
      dctx.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, s = 1) => {
        const px = W / 2 + (x - cam.x) * z + sx, py = H / 2 + (y - cam.y) * z + sy, pr = r * z;
        const g = dctx.createRadialGradient(px, py, pr * 0.35, px, py, pr);
        g.addColorStop(0, 'rgba(0,0,0,' + s + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
        dctx.fillStyle = g; dctx.beginPath(); dctx.arc(px, py, pr, 0, 7); dctx.fill();
      };
      hole(focusP.x, focusP.y, inCave ? C.CAVE_VISION : C.NIGHT_VISION + 40);
      if (snap) for (const s of snap.S) if (TILE_TYPES[s[3]] === 'campfire') hole((s[1] + 0.5) * T, (s[2] + 0.5) * T, C.CAMPFIRE_LIGHT * (0.95 + Math.sin(gameTime * 9 + s[0]) * 0.05));
      G.flashes = G.flashes.filter(f => f.until > now);
      for (const f of G.flashes) hole(f.x, f.y, 160 * (f.r || 1), 0.9);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dark, 0, 0);
      if (dk > 0.5) { ctx.fillStyle = 'rgba(40,60,140,' + (dk * 0.12) + ')'; ctx.fillRect(0, 0, W, H); }
    }
    // dégâts : bord rouge
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (me && !me.spect && me.hp < 35 && !me.dead) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(239,68,68,0)'); g.addColorStop(1, 'rgba(239,68,68,' + (0.35 + Math.sin(gameTime * 6) * 0.1) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  function isMate(id) {
    if (!me || !info.get(id)) return false;
    if (id === me.id) return true;
    if (map.mode !== '3v3') return false;
    return info.get(id).team === me.team;
  }
  function bar(x, y, w, f, col) {
    D.rrect(ctx, x - w / 2, y, w, 8, 3, '#0b0e16', null);
    if (f > 0) D.rrect(ctx, x - w / 2 + 1.5, y + 1.5, (w - 3) * Math.max(0, Math.min(1, f)), 5, 2, col, null);
  }
  function drawPlayer(p) {
    const r = p.raw, pi = info.get(r[0]) || {};
    const mine = me && r[0] === me.id;
    let ring = null;
    if (map.mode === '3v3') ring = D.TEAM_COLORS[pi.team];
    else if (mine) ring = '#ffd166';
    ctx.translate(p.x, p.y);
    if ((r[5] & 8)) { ctx.save(); ctx.globalAlpha = 0.6; D.circle(ctx, 0, 8, 26, null, '#fde68a', 2); ctx.restore(); }
    D.character(ctx, pi.look, { a: p.a, w: C.SLOTS[r[6]], atk: r[7] + (mine ? 0 : 0), moving: !!(r[5] & 16), run: !!(r[5] & 2), t: gameTime + (r[0].charCodeAt ? r[0].charCodeAt(0) : 0), downed: !!(r[5] & 1), ring });
  }

})();
