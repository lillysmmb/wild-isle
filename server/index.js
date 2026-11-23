// Serveur de Wild Isle : sert le jeu et gère les serveurs de jeu (salons) et les parties.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const C = require('../shared/constants');
const Game = require('./game');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/shared/constants.js', (req, res) => res.sendFile(path.join(__dirname, '..', 'shared', 'constants.js')));
app.get('/health', (req, res) => res.send('ok'));

const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 15000 });

const rooms = new Map();           // id -> room
const where = new Map();           // socketId -> roomId
const profiles = new Map();        // socketId -> {name, look}

// ---------- outils ----------
const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
function cleanLook(l) {
  const o = l && typeof l === 'object' ? l : {};
  const pick = (k, max) => clamp(o[k] | 0, 0, max);
  return { g: o.g === 'f' ? 'f' : 'm', skin: pick('skin', 7), hair: pick('hair', 9), hairC: pick('hairC', 9), outfit: pick('outfit', 7), acc: pick('acc', 9) };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function hashPw(pw, salt) { return crypto.scryptSync(String(pw), salt, 32).toString('hex'); }
function safeEqual(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); }

function roomList() {
  return [...rooms.values()].map(r => ({
    id: r.id, name: r.name, mode: r.mode, priv: !!r.pwHash, count: r.members.size, max: C.MAX_PLAYERS, state: r.state
  }));
}
function pushRoomList() { io.to('lobby').emit('rooms', roomList()); }
function roomState(r) {
  return {
    id: r.id, name: r.name, mode: r.mode, priv: !!r.pwHash, host: r.host, state: r.state,
    members: [...r.members.values()].map(m => ({ id: m.id, name: m.name, look: m.look, team: m.team }))
  };
}
function pushRoom(r) { io.to('room:' + r.id).emit('room', roomState(r)); }

function teamFor(r) {
  const c = [0, 0];
  for (const m of r.members.values()) c[m.team] = (c[m.team] || 0) + 1;
  return c[0] <= c[1] ? 0 : 1;
}

function leaveRoom(socket) {
  const id = where.get(socket.id);
  if (!id) return;
  where.delete(socket.id);
  socket.leave('room:' + id);
  const r = rooms.get(id);
  if (!r) return;
  r.members.delete(socket.id);
  if (r.game) r.game.removePlayer(socket.id);
  if (r.members.size === 0) {
    if (r.loop) clearInterval(r.loop);
    if (r.snapLoop) clearInterval(r.snapLoop);
    rooms.delete(id);
  } else {
    if (r.host === socket.id) r.host = r.members.keys().next().value;
    pushRoom(r);
  }
  pushRoomList();
}

function startGame(r) {
  r.state = 'playing';
  const players = [...r.members.values()].map(m => ({ id: m.id, name: m.name, look: m.look, team: m.team }));
  r.game = new Game({
    mode: r.mode,
    players,
    emit: (sid, ev, data) => io.to(sid).emit(ev, data),
    broadcast: (ev, data) => io.to('room:' + r.id).emit(ev, data),
    onEnd: (res) => endGame(r, res)
  });
  io.to('room:' + r.id).emit('start', r.game.staticData());
  const dt = 1 / C.TICK_RATE;
  let last = Date.now();
  r.loop = setInterval(() => {
    const now = Date.now();
    let steps = Math.min(4, Math.round((now - last) / (1000 * dt)) || 1);
    last = now;
    try { while (steps-- > 0 && r.game && !r.game.over) r.game.tick(dt); }
    catch (e) { console.error('Erreur de partie', e); }
  }, 1000 * dt);
  r.snapLoop = setInterval(() => { try { if (r.game) r.game.snapshots(); } catch (e) { console.error('Erreur envoi', e); } }, 1000 / C.SNAP_RATE);
  pushRoom(r); pushRoomList();
}

function endGame(r, res) {
  setTimeout(() => {
    if (r.game) r.game.snapshots();
    io.to('room:' + r.id).emit('over', res);
    clearInterval(r.loop); clearInterval(r.snapLoop);
    r.loop = r.snapLoop = null;
    r.game = null;
    r.state = 'lobby';
    pushRoom(r); pushRoomList();
  }, 1200);
}

// ---------- connexions ----------
io.on('connection', (socket) => {
  socket.join('lobby');
  profiles.set(socket.id, { name: 'Joueur', look: cleanLook({}) });
  socket.emit('rooms', roomList());

  socket.on('hello', (p) => {
    profiles.set(socket.id, { name: cleanText(p && p.name, 16) || 'Joueur', look: cleanLook(p && p.look) });
    const id = where.get(socket.id), r = id && rooms.get(id);
    if (r && r.state === 'lobby' && r.members.has(socket.id)) {
      const m = r.members.get(socket.id); Object.assign(m, profiles.get(socket.id)); pushRoom(r);
    }
  });

  socket.on('list', (ack) => { if (typeof ack === 'function') ack(roomList()); });

  socket.on('create', (o, ack) => {
    if (typeof ack !== 'function') return;
    leaveRoom(socket);
    const name = cleanText(o && o.name, 24);
    if (!name) return ack({ err: 'name' });
    const mode = o && o.mode === '3v3' ? '3v3' : 'ffa';
    const pw = o && o.priv ? cleanText(o.password, 32) : '';
    if (o && o.priv && !pw) return ack({ err: 'password' });
    if (rooms.size >= 200) return ack({ err: 'full' });
    const id = crypto.randomBytes(4).toString('hex');
    const salt = crypto.randomBytes(8).toString('hex');
    const r = { id, name, mode, pwHash: pw ? hashPw(pw, salt) : null, salt, host: socket.id, members: new Map(), state: 'lobby', game: null };
    rooms.set(id, r);
    join(socket, r);
    ack({ ok: true, id });
  });

  socket.on('join', (o, ack) => {
    if (typeof ack !== 'function') return;
    const r = rooms.get(o && String(o.id));
    if (!r) return ack({ err: 'gone' });
    if (r.state !== 'lobby') return ack({ err: 'playing' });
    if (r.members.size >= C.MAX_PLAYERS) return ack({ err: 'full' });
    if (r.pwHash) {
      const pw = cleanText(o.password, 32);
      if (!pw || !safeEqual(hashPw(pw, r.salt), r.pwHash)) return ack({ err: 'badPassword' });
    }
    leaveRoom(socket);
    join(socket, r);
    ack({ ok: true, id: r.id });
  });

  function join(sock, r) {
    const prof = profiles.get(sock.id);
    const team = r.mode === '3v3' ? teamFor(r) : 0;
    r.members.set(sock.id, { id: sock.id, name: prof.name, look: prof.look, team });
    where.set(sock.id, r.id);
    sock.join('room:' + r.id);
    pushRoom(r); pushRoomList();
  }

  socket.on('leave', () => leaveRoom(socket));

  socket.on('team', (t) => {
    const r = rooms.get(where.get(socket.id));
    if (!r || r.state !== 'lobby' || r.mode !== '3v3') return;
    const m = r.members.get(socket.id); if (!m) return;
    const want = t ? 1 : 0;
    const count = [...r.members.values()].filter(x => x.team === want).length;
    if (count < 3) { m.team = want; pushRoom(r); }
  });

  socket.on('start', () => {
    const r = rooms.get(where.get(socket.id));
    if (!r || r.host !== socket.id || r.state !== 'lobby') return;
    if (r.mode === '3v3') {
      const c = [0, 0]; for (const m of r.members.values()) c[m.team]++;
      if (c[0] > 3 || c[1] > 3) return;
    }
    startGame(r);
  });

  socket.on('input', (inp) => {
    const r = rooms.get(where.get(socket.id));
    if (r && r.game) r.game.setInput(socket.id, inp);
  });
  socket.on('act', (a) => {
    const r = rooms.get(where.get(socket.id));
    if (r && r.game) r.game.action(socket.id, a);
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
    profiles.delete(socket.id);
  });
});

server.listen(PORT, () => console.log(`Wild Isle est lancé : http://localhost:${PORT}`));
