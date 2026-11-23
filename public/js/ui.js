// Menus du jeu : chargement, accueil, serveurs, salon, profil, paramètres.
(function () {
  const C = window.WI, D = window.DRAW, S = window.SETTINGS, t = (k, v) => I18N.t(k, v);
  const $ = id => document.getElementById(id);
  const isTouch = ('ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  let socket = null, rooms = [], room = null, filter = 'all', pendingJoin = null, current = 'loading', settingsFrom = 'home';

  // ---------- écrans ----------
  function show(name) {
    current = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    if (name === 'home') heroLoop();
  }
  function alertBox(msg) { $('alert-txt').textContent = msg; $('modal-alert').classList.remove('hidden'); }
  document.querySelectorAll('[data-close]').forEach(b => { if (!b.closest('#hud')) b.onclick = () => $(b.dataset.close).classList.add('hidden'); });
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { AUDIO.play('click'); show(b.dataset.back); });
  document.addEventListener('click', () => AUDIO.unlock(), { once: false });
  document.addEventListener('touchstart', () => AUDIO.unlock(), { passive: true });

  function seg(el, value, onPick) {
    el.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === String(value));
      b.onclick = () => { el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); AUDIO.play('click'); onPick(b.dataset.v); };
    });
  }

  // ---------- chargement ----------
  const tips = t('tips');
  $('loading-tip').textContent = tips[(Math.random() * tips.length) | 0];
  let progress = 0, target = 15;
  const t0 = performance.now();
  const loadTimer = setInterval(() => {
    progress += (target - progress) * 0.12 + 0.3;
    if (progress > target) progress = target;
    $('loading-fill').style.width = progress + '%';
    $('loading-pct').textContent = Math.round(progress) + '%';
    if (progress >= 99.5 && performance.now() - t0 > 1800) {
      clearInterval(loadTimer);
      updateHomeName();
      show(S.profile.name ? 'home' : 'profile');
      if (!S.profile.name) openProfile();
    }
  }, 50);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { target = Math.max(target, 55); });
  setTimeout(() => { target = Math.max(target, 70); }, 600);

  // ---------- connexion ----------
  function connect() {
    socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      target = 100;
      $('net-status').classList.add('on'); $('net-status').querySelector('span').textContent = t('online');
      sendProfile();
    });
    socket.on('disconnect', () => {
      $('net-status').classList.remove('on'); $('net-status').querySelector('span').textContent = t('offline');
      if (GAME.running) { GAME.stop(); show('home'); }
      room = null;
      if (current === 'room') show('home');
    });
    socket.on('connect_error', () => { setTimeout(() => { target = 100; }, 3000); });
    socket.on('rooms', list => { rooms = list; renderRooms(); });
    socket.on('room', r => { room = r; renderRoom(); if (current !== 'room' && !GAME.running && current !== 'over') show('room'); });
    socket.on('start', data => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      $('modal-alert').classList.add('hidden');
      current = 'game';
      GAME.start(data, socket, socket.id);
    });
    socket.on('snap', s => GAME.onSnap(s));
    socket.on('node', d => GAME.onNode(d));
    socket.on('crate', d => GAME.onCrate(d));
    socket.on('feed', f => GAME.onFeed(f));
    socket.on('msg', m => GAME.onMsg(m));
    socket.on('gain', g => GAME.onGain(g));
    socket.on('over', res => showOver(res));
  }
  function sendProfile() { if (socket && socket.connected) socket.emit('hello', { name: S.profile.name || 'Joueur', look: S.profile.look }); }

  // ---------- accueil ----------
  function updateHomeName() {
    $('home-name').textContent = S.profile.name || 'Joueur';
    const c = $('chip-avatar').getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 64, 64);
    c.setTransform(1.15, 0, 0, 1.15, 32, 46); D.character(c, S.profile.look, { a: Math.PI / 2, w: null, t: 0 });
  }
  let heroRaf = null;
  function heroLoop() {
    cancelAnimationFrame(heroRaf);
    const cv = $('home-hero'), c = cv.getContext('2d');
    const loop = (ts) => {
      if (current !== 'home') return;
      heroRaf = requestAnimationFrame(loop);
      const tt = ts / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(3.6, 0, 0, 3.6, cv.width / 2, cv.height * 0.56);
      const a = Math.PI / 2 + Math.sin(tt * 0.7) * 0.9;
      D.character(c, S.profile.look, { a, w: 'sword', t: tt, atk: (tt % 3.2) });
    };
    heroRaf = requestAnimationFrame(loop);
  }
  $('home-profile-chip').onclick = () => { AUDIO.play('click'); openProfile(); show('profile'); };
  $('btn-profile').onclick = () => { AUDIO.play('click'); openProfile(); show('profile'); };
  $('btn-settings').onclick = () => { AUDIO.play('click'); settingsFrom = 'home'; openSettings(); show('settings'); };
  $('btn-play').onclick = () => { AUDIO.play('click'); show('browse'); if (socket) socket.emit('list', l => { rooms = l; renderRooms(); }); };
  $('btn-create').onclick = openCreate;
  $('btn-create-2').onclick = openCreate;

  // ---------- serveurs ----------
  $('browse-tabs').querySelectorAll('.tab').forEach(b => b.onclick = () => {
    filter = b.dataset.filter;
    $('browse-tabs').querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
    renderRooms();
  });
  $('btn-refresh').onclick = () => { AUDIO.play('click'); if (socket) socket.emit('list', l => { rooms = l; renderRooms(); }); };
  function renderRooms() {
    const ul = $('server-list'); ul.innerHTML = '';
    const list = rooms.filter(r => filter === 'all' || r.mode === filter);
    $('server-empty').classList.toggle('hidden', list.length > 0);
    for (const r of list) {
      const li = document.createElement('li');
      const name = document.createElement('span'); name.className = 'sname'; name.textContent = r.name;
      const meta = document.createElement('span'); meta.className = 'meta';
      const mode = document.createElement('span'); mode.className = 'pill' + (r.mode === '3v3' ? ' red' : ''); mode.textContent = r.mode === '3v3' ? t('v3') : t('ffa');
      meta.append(mode);
      if (r.priv) { const l = document.createElement('span'); l.className = 'pill lock'; l.textContent = '🔒 ' + t('priv'); meta.append(l); }
      const count = document.createElement('span'); count.textContent = r.count + '/' + r.max;
      const b = document.createElement('button'); b.className = 'btn small primary';
      const full = r.count >= r.max, playing = r.state !== 'lobby';
      b.textContent = playing ? t('inGame') : full ? t('full') : t('join');
      b.disabled = playing || full;
      b.onclick = () => tryJoin(r);
      li.append(name, meta, count, b); ul.append(li);
    }
  }
  function tryJoin(r) {
    AUDIO.play('click');
    if (r.priv) { pendingJoin = r; $('pw-input').value = ''; $('pw-err').textContent = ''; $('modal-pw').classList.remove('hidden'); setTimeout(() => $('pw-input').focus(), 50); return; }
    doJoin(r.id, '');
  }
  function doJoin(id, password, fromModal) {
    sendProfile();
    socket.emit('join', { id, password }, res => {
      if (res && res.ok) { $('modal-pw').classList.add('hidden'); return; }
      const msg = t('err_' + (res && res.err));
      if (fromModal) $('pw-err').textContent = msg; else alertBox(msg);
    });
  }
  $('pw-go').onclick = () => { if (pendingJoin) doJoin(pendingJoin.id, $('pw-input').value, true); };
  $('pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('pw-go').click(); });

  // ---------- créer un serveur ----------
  let crMode = 'ffa', crVis = 'pub';
  function openCreate() {
    AUDIO.play('click');
    $('cr-name').value = (S.profile.name || 'Joueur') + (I18N.lang === 'en' ? "'s island" : I18N.lang === 'pt' ? ' - ilha' : ' - île');
    $('cr-pw').value = ''; $('cr-err').textContent = '';
    seg($('cr-mode'), crMode, v => crMode = v);
    seg($('cr-vis'), crVis, v => { crVis = v; $('cr-pw-field').classList.toggle('hidden', v !== 'priv'); });
    $('cr-pw-field').classList.toggle('hidden', crVis !== 'priv');
    $('modal-create').classList.remove('hidden');
  }
  $('cr-go').onclick = () => {
    if (!socket || !socket.connected) return;
    sendProfile();
    socket.emit('create', { name: $('cr-name').value, mode: crMode, priv: crVis === 'priv', password: $('cr-pw').value }, res => {
      if (res && res.ok) { $('modal-create').classList.add('hidden'); return; }
      $('cr-err').textContent = t('err_' + (res && res.err));
    });
  };

  // ---------- salon ----------
  function avatar(look, size = 44) {
    const c = document.createElement('canvas'); c.width = c.height = size * 2;
    const x = c.getContext('2d'); x.setTransform(size / 28, 0, 0, size / 28, size, size * 1.45);
    D.character(x, look, { a: Math.PI / 2, t: 0 }); return c;
  }
  function memberRow(m) {
    const d = document.createElement('div'); d.className = 'member';
    d.append(avatar(m.look));
    const n = document.createElement('span'); n.className = 'mname'; n.textContent = m.name; d.append(n);
    const tags = document.createElement('span'); tags.className = 'tags';
    if (m.id === room.host) { const p = document.createElement('span'); p.className = 'pill'; p.textContent = t('host'); tags.append(p); }
    if (socket && m.id === socket.id) { const p = document.createElement('span'); p.className = 'pill red'; p.textContent = t('you'); tags.append(p); }
    d.append(tags); return d;
  }
  function renderRoom() {
    if (!room) return;
    $('room-title').textContent = room.name + (room.priv ? ' 🔒' : '');
    $('room-mode').textContent = room.mode === '3v3' ? t('v3') : t('ffa');
    const box = $('room-players'); box.innerHTML = '';
    box.classList.toggle('teams', room.mode === '3v3');
    if (room.mode === '3v3') {
      for (const tm of [0, 1]) {
        const col = document.createElement('div'); col.className = 'team-col t' + tm;
        const h = document.createElement('h3'); h.textContent = (tm ? t('teamB') : t('teamA')) + ' (' + room.members.filter(m => m.team === tm).length + '/3)'; col.append(h);
        for (const m of room.members.filter(m => m.team === tm)) col.append(memberRow(m));
        box.append(col);
      }
    } else {
      const h = document.createElement('div'); h.className = 'muted'; h.textContent = room.members.length + '/' + C.MAX_PLAYERS + ' ' + t('players'); box.append(h);
      for (const m of room.members) box.append(memberRow(m));
    }
    const host = socket && room.host === socket.id;
    $('btn-start').classList.toggle('hidden', !host);
    $('room-wait').classList.toggle('hidden', host);
    $('btn-switch-team').classList.toggle('hidden', room.mode !== '3v3');
  }
  $('btn-start').onclick = () => { AUDIO.play('click'); socket.emit('start'); };
  $('btn-leave-room').onclick = () => { AUDIO.play('click'); socket.emit('leave'); room = null; show('browse'); };
  $('btn-switch-team').onclick = () => {
    const mine = room && room.members.find(m => m.id === socket.id);
    if (mine) socket.emit('team', mine.team ? 0 : 1);
  };

  // ---------- fin de partie ----------
  function myTeamKey() {
    const mine = room && room.members.find(m => m.id === socket.id);
    if (!room || !mine) return socket.id;
    return room.mode === '3v3' ? 't' + mine.team : socket.id;
  }
  function showOver(res) {
    const win = res.team && res.team === myTeamKey();
    $('over-title').textContent = win ? t('victory') : t('defeat');
    $('over-title').classList.toggle('lose', !win);
    $('over-winners').textContent = res.winners.length ? (res.winners.length > 1 ? t('winnersAre') : t('winnerIs')) + ' ' + res.winners.join(', ') : t('nobody');
    const tb = $('over-stats'); tb.innerHTML = '';
    for (const s of res.stats.sort((a, b) => b.kills - a.kills)) {
      const tr = document.createElement('tr'); if (s.win) tr.className = 'win';
      const a = document.createElement('td'); a.textContent = s.name; const b = document.createElement('td'); b.textContent = s.kills + ' ' + t('kills').toLowerCase();
      tr.append(a, b); tb.append(tr);
    }
    AUDIO.play(win ? 'win' : 'death');
    show('over');
  }
  $('btn-back-room').onclick = () => { AUDIO.play('click'); GAME.stop(); if (room) { renderRoom(); show('room'); } else show('home'); };

  // ---------- profil ----------
  let pfRaf = null;
  function openProfile() {
    const P = S.profile;
    $('pf-name').value = P.name || '';
    const L = P.look;
    seg($('pf-gender'), L.g, v => { L.g = v; if (v === 'f' && L.hair < 5) L.hair = 5; if (v === 'm' && L.hair >= 5) L.hair = 0; fill(); });
    fill();
    cancelAnimationFrame(pfRaf);
    const cv = $('profile-canvas'), c = cv.getContext('2d');
    const loop = (ts) => {
      if (current !== 'profile') return;
      pfRaf = requestAnimationFrame(loop);
      const tt = ts / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(3.6, 0, 0, 3.6, cv.width / 2, cv.height * 0.64);
      D.character(c, L, { a: Math.PI / 2 + Math.sin(tt * 0.8) * 1.2, w: 'sword', t: tt });
    };
    setTimeout(() => { if (current === 'profile') { cancelAnimationFrame(pfRaf); pfRaf = requestAnimationFrame(loop); } }, 0);
  }
  function fill() {
    const L = S.profile.look;
    swatches($('pf-skin'), D.SKINS, L.skin, v => { L.skin = v; });
    swatches($('pf-hairC'), D.HAIRC, L.hairC, v => { L.hairC = v; });
    const hairs = t('hairs');
    const order = L.g === 'f' ? [5, 6, 7, 8, 9, 0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    choices($('pf-hair'), order.map(i => [i, hairs[i]]), L.hair, v => { L.hair = v; });
    choices($('pf-outfit'), t('outfits').map((n, i) => [i, n]), L.outfit, v => { L.outfit = v; });
    choices($('pf-acc'), t('accs').map((n, i) => [i, n]), L.acc, v => { L.acc = v; });
  }
  function swatches(el, colors, val, cb) {
    el.innerHTML = '';
    colors.forEach((col, i) => {
      const b = document.createElement('button'); b.style.background = col; b.setAttribute('aria-label', col);
      b.classList.toggle('on', i === val);
      b.onclick = () => { cb(i); el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); AUDIO.play('click'); };
      el.append(b);
    });
  }
  function choices(el, items, val, cb) {
    el.innerHTML = '';
    for (const [v, label] of items) {
      const b = document.createElement('button'); b.textContent = label; b.classList.toggle('on', v === val);
      b.onclick = () => { cb(v); el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); AUDIO.play('click'); };
      el.append(b);
    }
  }
  $('btn-save-profile').onclick = () => {
    const n = $('pf-name').value.replace(/[<>]/g, '').trim().slice(0, 16);
    S.profile.name = n || 'Joueur';
    S.saveProfile(); sendProfile(); updateHomeName();
    AUDIO.play('craft');
    show('home');
  };
  $('pf-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-save-profile').click(); });

  // ---------- paramètres ----------
  let waitingKey = null;
  function openSettings() {
    seg($('set-lang'), I18N.lang, v => { I18N.set(v); openSettings(); });
    seg($('set-sound'), S.sound ? '1' : '0', v => { S.setSound(v === '1'); AUDIO.play('click'); });
    $('set-volume').value = S.volume;
    $('set-volume').oninput = e => S.setVolume(e.target.value);
    $('set-volume').onchange = () => AUDIO.play('click');
    renderKeys();
    $('keys-field').classList.toggle('hidden', isTouch);
  }
  function renderKeys() {
    const box = $('key-list'); box.innerHTML = '';
    for (const a of S.ACTIONS) {
      const l = document.createElement('span'); l.textContent = t('k_' + a);
      const b = document.createElement('button'); b.className = 'keybtn'; b.textContent = S.keyLabel(a);
      b.onclick = () => {
        waitingKey = a; GAME.captureKeys = true;
        box.querySelectorAll('.keybtn').forEach(x => x.classList.remove('wait'));
        b.classList.add('wait'); b.textContent = t('pressKey');
      };
      box.append(l, b);
    }
  }
  window.addEventListener('keydown', e => {
    if (!waitingKey) return;
    e.preventDefault(); e.stopPropagation();
    let label = e.key.length === 1 ? e.key.toUpperCase() : '';
    if (e.code === 'Space') label = 'Espace';
    S.setKey(waitingKey, e.code, label);
    waitingKey = null; setTimeout(() => { GAME.captureKeys = false; }, 0);
    renderKeys();
  }, true);
  $('btn-reset-keys').onclick = () => { S.resetKeys(); renderKeys(); };
  $('btn-settings-back').onclick = () => {
    AUDIO.play('click'); waitingKey = null; GAME.captureKeys = false;
    if (settingsFrom === 'game') { $('screen-settings').classList.remove('active', 'overlay'); current = 'game'; }
    else show(settingsFrom);
  };
  // bouton paramètres pendant la partie
  const gear = document.createElement('button');
  gear.className = 'round-btn'; gear.id = 'btn-game-settings'; gear.setAttribute('aria-label', 'Paramètres');
  gear.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>';
  gear.style.pointerEvents = 'auto'; gear.style.alignSelf = 'flex-start';
  document.querySelector('.hud-top-left').append(gear);
  gear.onclick = () => { settingsFrom = 'game'; openSettings(); $('screen-settings').classList.add('active', 'overlay'); current = 'settings'; };

  document.addEventListener('langchange', () => {
    $('loading-tip').textContent = t('tips')[0];
    updateHomeName(); renderRooms(); renderRoom();
    if (current === 'profile') fill();
    if (current === 'settings') renderKeys();
    $('net-status').querySelector('span').textContent = socket && socket.connected ? t('online') : t('offline');
  });

  I18N.apply();
  connect();
})();
