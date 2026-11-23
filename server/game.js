// Une partie de Wild Isle : l'île, les joueurs, les combats, les animaux...
// Le serveur décide de tout (les navigateurs envoient seulement leurs commandes).
const C = require('../shared/constants');

const NODE_TYPES = ['tree', 'rock', 'plant', 'ore', 'wreck'];
const ANIMAL_TYPES = ['boar', 'wolf', 'snake'];
const TILE_TYPES = C.BUILD_ORDER; // wall_wood, wall_stone, door, roof, campfire
const BUCKET = 256;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const r1 = v => Math.round(v);
const r2 = v => Math.round(v * 100) / 100;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}
function segPointDist2(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1, dy = y2 - y1;
  const l = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1);
  return dist2(x1 + t * dx, y1 + t * dy, px, py);
}

class Game {
  constructor(opts) {
    this.mode = opts.mode;                 // 'ffa' ou '3v3'
    this.emit = opts.emit;                 // (socketId, event, data)
    this.broadcast = opts.broadcast;       // (event, data)
    this.onEnd = opts.onEnd;
    this.seed = (Math.random() * 1e9) | 0;
    this.rand = mulberry32(this.seed);
    this.t = 0;
    this.cycleOffset = process.env.WI_START_TIME ? +process.env.WI_START_TIME : 25;
    this.nextId = 1;
    this.cx = C.WORLD / 2; this.cy = C.WORLD / 2;
    this.players = new Map();
    this.nodes = []; this.nodeBuckets = new Map();
    this.bushes = []; this.bushBuckets = new Map();
    this.caves = []; this.cabins = []; this.patches = [];
    this.crates = []; this.mines = []; this.animals = [];
    this.tiles = new Map(); this.roofs = new Map();
    this.projectiles = []; this.bombs = []; this.traps = [];
    this.fx = []; this.steps = [];
    this.over = false;
    this.teamsAtStart = 0;
    this.generate();
    for (const p of opts.players) this.addPlayer(p);
    this.placeSpawns();
    this.teamsAtStart = new Set([...this.players.values()].map(p => p.team)).size;
    if (process.env.WI_DEBUG_GIVE) for (const p of this.players.values()) {
      Object.assign(p.inv, { wood: 200, stone: 200, fiber: 200, metal: 50 });
      ['sword', 'slingshot', 'bow', 'pistol', 'sniper'].forEach(w => p.owned.add(w));
      p.ammo.pistol = 99; p.ammo.sniper = 20; p.bombs = 9; p.traps = 5;
    }
  }

  id() { return this.nextId++; }

  // ---------- Île ----------
  coastR(th) {
    const a = this.coast;
    return C.ISLAND_R * (0.9 + 0.07 * Math.sin(3 * th + a[0]) + 0.04 * Math.sin(5 * th + a[1]) + 0.025 * Math.sin(11 * th + a[2]));
  }
  onLand(x, y, margin = 0) {
    const dx = x - this.cx, dy = y - this.cy;
    return Math.hypot(dx, dy) < this.coastR(Math.atan2(dy, dx)) - margin;
  }
  clampLand(e, r) {
    const dx = e.x - this.cx, dy = e.y - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    const lim = this.coastR(Math.atan2(dy, dx)) - r - 10;
    if (d > lim) { e.x = this.cx + dx / d * lim; e.y = this.cy + dy / d * lim; }
  }
  randLand(minF, maxF, margin) {
    for (let i = 0; i < 200; i++) {
      const th = this.rand() * Math.PI * 2;
      const f = Math.sqrt(minF * minF + this.rand() * (maxF * maxF - minF * minF));
      const R = this.coastR(th) * f;
      const x = this.cx + Math.cos(th) * R, y = this.cy + Math.sin(th) * R;
      if (this.onLand(x, y, margin)) return { x, y };
    }
    return { x: this.cx, y: this.cy };
  }
  bucketKey(x, y) { return ((x / BUCKET) | 0) + ',' + ((y / BUCKET) | 0); }
  addToBucket(map, o) {
    const k = this.bucketKey(o.x, o.y);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(o);
  }
  near(map, x, y, r) {
    const out = [];
    const x0 = ((x - r - 60) / BUCKET) | 0, x1 = ((x + r + 60) / BUCKET) | 0;
    const y0 = ((y - r - 60) / BUCKET) | 0, y1 = ((y + r + 60) / BUCKET) | 0;
    for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) {
      const b = map.get(bx + ',' + by);
      if (b) for (const o of b) out.push(o);
    }
    return out;
  }
  freeSpot(x, y, r) {
    for (const n of this.near(this.nodeBuckets, x, y, r + 50)) if (dist2(x, y, n.x, n.y) < (r + n.r + 8) ** 2) return false;
    for (const c of this.caves) if (dist2(x, y, c.x, c.y) < (c.r + r + 20) ** 2) return false;
    for (const c of this.cabins) if (Math.abs(x - c.x) < 150 + r && Math.abs(y - c.y) < 150 + r) return false;
    return true;
  }
  addNode(type, x, y) {
    const d = C.NODES[type];
    const n = { id: this.id(), type, ti: NODE_TYPES.indexOf(type), x, y, r: d.r, hp: d.hp, alive: true, respawnAt: 0 };
    this.nodes.push(n); this.addToBucket(this.nodeBuckets, n);
    return n;
  }
  addTile(type, gx, gy, team, owner, hp) {
    const d = C.BUILD[type];
    const t = { id: this.id(), type, ti: TILE_TYPES.indexOf(type), gx, gy, hp: hp ?? d.hp, max: d.hp, team, owner };
    if (d.roof) this.roofs.set(gx + ',' + gy, t); else this.tiles.set(gx + ',' + gy, t);
    return t;
  }

  generate() {
    const R = this.rand, T = C.TILE;
    this.coast = [R() * 6.28, R() * 6.28, R() * 6.28];
    // Taches d'herbe (décor)
    for (let i = 0; i < 140; i++) { const p = this.randLand(0, 0.92, C.BEACH + 80); this.patches.push([r1(p.x), r1(p.y), r1(80 + R() * 160), R() < 0.5 ? 0 : 1]); }
    // Mines à creuser (grottes)
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 50; k++) {
        const p = this.randLand(0.3, 0.72, 500);
        if (this.caves.every(c => dist2(c.x, c.y, p.x, p.y) > 1200 ** 2)) { this.caves.push({ x: p.x, y: p.y, r: 240 }); break; }
      }
    }
    // Cabanes abandonnées
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < 80; k++) {
        const p = this.randLand(0.2, 0.82, 400);
        const gx = Math.floor(p.x / T) - 1, gy = Math.floor(p.y / T) - 1;
        const cx = (gx + 1.5) * T, cy = (gy + 1.5) * T;
        if (this.cabins.some(c => dist2(c.x, c.y, cx, cy) < 900 ** 2)) continue;
        if (this.caves.some(c => dist2(c.x, c.y, cx, cy) < (c.r + 300) ** 2)) continue;
        this.cabins.push({ x: cx, y: cy, gx, gy });
        for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) {
          if (dx === 1 && dy === 1) continue;
          if (dx === 1 && dy === 2) continue; // entrée
          if (R() < 0.18) continue;            // mur effondré
          this.addTile('wall_wood', gx + dx, gy + dy, 'neutral', null, 50 + ((R() * 40) | 0));
        }
        this.crates.push({ id: this.id(), x: cx, y: cy, opened: false, rich: true });
        break;
      }
    }
    // Grottes : rochers autour (avec une entrée) et minerai dedans
    for (const c of this.caves) {
      const gap = R() * 6.28;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        if (angleDiff(a, gap) < 0.45) continue;
        this.addNode('rock', c.x + Math.cos(a) * (c.r + 12), c.y + Math.sin(a) * (c.r + 12));
      }
      for (let i = 0; i < 9; i++) {
        for (let k = 0; k < 30; k++) {
          const a = R() * 6.28, d = R() * (c.r - 60);
          const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
          if (this.near(this.nodeBuckets, x, y, 80).every(n => dist2(x, y, n.x, n.y) > 90 * 90)) { this.addNode('ore', x, y); break; }
        }
      }
    }
    // Forêts
    const forests = [];
    for (let i = 0; i < 9; i++) forests.push(this.randLand(0.1, 0.85, C.BEACH + 150));
    let placed = 0;
    for (let k = 0; k < 4000 && placed < 300; k++) {
      let p;
      if (R() < 0.7) { const f = forests[(R() * forests.length) | 0]; const a = R() * 6.28, d = R() * 520; p = { x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d }; }
      else p = this.randLand(0, 0.92, C.BEACH + 40);
      if (!this.onLand(p.x, p.y, C.BEACH + 30) || !this.freeSpot(p.x, p.y, 40)) continue;
      this.addNode('tree', p.x, p.y); placed++;
    }
    // Palmiers / épaves / caisses de plage
    for (let i = 0, k = 0; i < 6 && k < 400; k++) {
      const th = R() * 6.28, d = this.coastR(th) - 110;
      const x = this.cx + Math.cos(th) * d, y = this.cy + Math.sin(th) * d;
      if (!this.freeSpot(x, y, 60)) continue;
      this.addNode('wreck', x, y); i++;
      const a2 = th + (R() < 0.5 ? 0.04 : -0.04);
      const cx = this.cx + Math.cos(a2) * (d - 20), cy = this.cy + Math.sin(a2) * (d - 20);
      this.crates.push({ id: this.id(), x: cx, y: cy, opened: false, rich: false });
    }
    for (let i = 0, k = 0; i < 115 && k < 3000; k++) {
      const p = this.randLand(0, 0.95, 60);
      if (this.freeSpot(p.x, p.y, 50)) { this.addNode('rock', p.x, p.y); i++; }
    }
    for (let i = 0, k = 0; i < 170 && k < 3000; k++) {
      const p = this.randLand(0, 0.92, C.BEACH);
      if (this.freeSpot(p.x, p.y, 24)) { this.addNode('plant', p.x, p.y); i++; }
    }
    // Buissons (en groupes)
    for (let g = 0; g < 95; g++) {
      const c = this.randLand(0, 0.9, C.BEACH + 40);
      const n = 2 + ((R() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const a = R() * 6.28, d = R() * 90;
        const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
        if (!this.onLand(x, y, C.BEACH) || !this.freeSpot(x, y, 34)) continue;
        if (this.bushes.some(b => dist2(b.x, b.y, x, y) < 50 * 50)) continue;
        const b = { x, y, r: 36 + R() * 16 };
        this.bushes.push(b); this.addToBucket(this.bushBuckets, b);
      }
    }
    // Animaux
    const sp = (type, x, y) => {
      const d = C.ANIMALS[type];
      this.animals.push({ id: this.id(), type, ti: ANIMAL_TYPES.indexOf(type), x, y, hx: x, hy: y, a: R() * 6.28, hp: d.hp, alive: true, st: 'idle', timer: 0, cd: 0, tx: x, ty: y, revealT: -10, respawnAt: 0 });
    };
    for (let i = 0; i < 9; i++) { const p = this.randLand(0.15, 0.85, 300); sp('boar', p.x, p.y); }
    for (let i = 0; i < 5; i++) {
      const p = this.randLand(0.15, 0.85, 300);
      const n = 2 + (R() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) sp('wolf', p.x + k * 40, p.y + (k % 2) * 40);
    }
    const shuffled = this.bushes.slice().sort(() => R() - 0.5);
    for (let i = 0; i < Math.min(20, shuffled.length); i++) sp('snake', shuffled[i].x, shuffled[i].y);
    // Mines explosives
    for (let i = 0, k = 0; i < 28 && k < 600; k++) {
      const p = this.randLand(0.05, 0.93, 80);
      if (!this.freeSpot(p.x, p.y, 30)) continue;
      this.mines.push({ id: this.id(), x: p.x, y: p.y }); i++;
    }
  }

  staticData() {
    return {
      mode: this.mode, cx: this.cx, cy: this.cy, coast: this.coast.map(r2),
      nodes: this.nodes.map(n => [n.id, n.ti, r1(n.x), r1(n.y), n.alive ? 1 : 0]),
      bushes: this.bushes.map(b => [r1(b.x), r1(b.y), r1(b.r)]),
      caves: this.caves.map(c => [r1(c.x), r1(c.y), c.r]),
      cabins: this.cabins.map(c => [c.gx, c.gy]),
      crates: this.crates.map(c => [c.id, r1(c.x), r1(c.y), c.opened ? 1 : 0]),
      patches: this.patches,
      players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, look: p.look, team: p.team }))
    };
  }

  // ---------- Joueurs ----------
  addPlayer(info) {
    this.players.set(info.id, {
      id: info.id, name: info.name, look: info.look, team: this.mode === '3v3' ? 't' + info.team : info.id,
      x: this.cx, y: this.cy, a: 0, hp: C.MAX_HP, standing: true, downed: false, dead: false,
      downedHp: 0, downedT: 0, lastHit: -99, shotT: -99, atkT: -99, slowT: 0, cd: 0,
      inv: { wood: 0, stone: 0, fiber: 0, metal: 0 }, owned: new Set(['fists']), ammo: { pistol: 0, sniper: 0 }, bombs: 0, traps: 0, slot: 0,
      input: { mx: 0, my: 0, a: 0, run: false, attack: false, aimD: 200, interact: false },
      revive: null, reviveP: 0, kills: 0, stepAcc: 0, moving: false, running: false, spectate: null, left: false
    });
  }
  placeSpawns() {
    const list = [...this.players.values()];
    const base = this.rand() * Math.PI * 2;
    const spot = (th, off) => {
      for (let k = 0; k < 40; k++) {
        const d = this.coastR(th) * 0.62 + (this.rand() - 0.5) * 80;
        const x = this.cx + Math.cos(th) * d + (off ? off.x : 0), y = this.cy + Math.sin(th) * d + (off ? off.y : 0);
        if (this.onLand(x, y, 100) && this.freeSpot(x, y, C.PLAYER_R + 10) && this.mines.every(m => dist2(m.x, m.y, x, y) > 200 * 200)) return { x, y };
        th += 0.03;
      }
      return { x: this.cx, y: this.cy };
    };
    const near = (c) => {
      for (let k = 0; k < 60; k++) {
        const a = this.rand() * Math.PI * 2, d = 50 + this.rand() * 90;
        const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
        if (this.onLand(x, y, 100) && this.freeSpot(x, y, C.PLAYER_R + 6)) return { x, y };
      }
      return { x: c.x, y: c.y };
    };
    if (process.env.WI_DEBUG_SPAWN_CLOSE) {
      const c = spot(base);
      list.forEach((p, i) => { p.x = c.x + i * 130; p.y = c.y; });
      for (const a of this.animals) if (dist2(a.x, a.y, c.x, c.y) < 1200 * 1200) { a.alive = false; a.respawnAt = 1e9; }
      for (const n of this.nodes) if (Math.abs(n.y - c.y) < 90 && n.x > c.x - 60 && n.x < c.x + list.length * 130 + 60) { n.alive = false; n.respawnAt = 1e9; }
    } else if (this.mode === '3v3') {
      const teams = { t0: [], t1: [] };
      for (const p of list) (teams[p.team] || teams.t0).push(p);
      ['t0', 't1'].forEach((tk, ti) => {
        const c = spot(base + ti * Math.PI);
        teams[tk].forEach((p, i) => { const s = i === 0 ? c : near(c); p.x = s.x; p.y = s.y; });
      });
    } else {
      list.forEach((p, i) => { const s = spot(base + i / Math.max(1, list.length) * Math.PI * 2); p.x = s.x; p.y = s.y; });
    }
    for (const p of list) p.a = Math.atan2(this.cy - p.y, this.cx - p.x);
    // nettoie les mines trop proches des points de départ
    this.mines = this.mines.filter(m => list.every(p => dist2(m.x, m.y, p.x, p.y) > 220 * 220));
  }

  setInput(id, inp) {
    const p = this.players.get(id); if (!p || !inp) return;
    const n = v => (typeof v === 'number' && isFinite(v) ? v : 0);
    let mx = clamp(n(inp.mx), -1, 1), my = clamp(n(inp.my), -1, 1);
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    p.input.mx = mx; p.input.my = my;
    p.input.a = n(inp.a);
    p.input.run = !!inp.run; p.input.attack = !!inp.attack; p.input.interact = !!inp.interact;
    p.input.aimD = clamp(n(inp.aimD), 0, 2000);
  }
  action(id, act) {
    const p = this.players.get(id); if (!p || !act || this.over) return;
    if (act.type === 'select') {
      const s = act.slot | 0; if (s >= 0 && s < C.SLOTS.length && this.hasWeapon(p, C.SLOTS[s])) p.slot = s;
    } else if (act.type === 'spectate') {
      if (typeof act.target === 'string' && this.players.has(act.target)) p.spectate = act.target;
    } else if (!p.standing) {
      return;
    } else if (act.type === 'craft') {
      const r = C.RECIPES[act.item]; if (!r) return;
      if (!this.pay(p, r)) return this.emit(p.id, 'msg', { k: 'noRes' });
      if (act.item === 'bomb') p.bombs += 1;
      else if (act.item === 'trap') p.traps += 1;
      else p.owned.add(act.item);
      const si = C.SLOTS.indexOf(act.item); if (si >= 0) p.slot = si;
      this.emit(p.id, 'msg', { k: 'crafted', item: act.item });
    } else if (act.type === 'build') {
      this.build(p, act.piece, act.gx | 0, act.gy | 0);
    }
  }
  hasWeapon(p, w) {
    if (w === 'bomb') return p.bombs > 0;
    if (w === 'trap') return p.traps > 0;
    return p.owned.has(w);
  }
  pay(p, cost) {
    for (const k in cost) if ((p.inv[k] || 0) < cost[k]) return false;
    for (const k in cost) p.inv[k] -= cost[k];
    return true;
  }
  build(p, piece, gx, gy) {
    const d = C.BUILD[piece]; if (!d) return;
    const T = C.TILE, cx = (gx + 0.5) * T, cy = (gy + 0.5) * T, key = gx + ',' + gy;
    if (dist2(p.x, p.y, cx, cy) > C.BUILD_RANGE ** 2) return this.emit(p.id, 'msg', { k: 'tooFar' });
    if (!this.onLand(cx, cy, 20)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
    if (d.roof) {
      if (this.roofs.has(key)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
    } else {
      if (this.tiles.has(key)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
      const rectHit = (x, y, r) => {
        const qx = clamp(x, gx * T, gx * T + T), qy = clamp(y, gy * T, gy * T + T);
        return dist2(x, y, qx, qy) < r * r;
      };
      for (const n of this.near(this.nodeBuckets, cx, cy, 80)) if (n.alive && rectHit(n.x, n.y, n.r - 4)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
      if (d.solid) {
        for (const o of this.players.values()) if (!o.dead && rectHit(o.x, o.y, C.PLAYER_R)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
        for (const a of this.animals) if (a.alive && rectHit(a.x, a.y, C.ANIMALS[a.type].r)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
      }
      for (const c of this.crates) if (rectHit(c.x, c.y, C.CRATE_R)) return this.emit(p.id, 'msg', { k: 'cantBuild' });
    }
    if (!this.pay(p, d.cost)) return this.emit(p.id, 'msg', { k: 'noRes' });
    this.addTile(piece, gx, gy, p.team, p.id);
    this.fx.push({ k: 'build', x: r1(cx), y: r1(cy) });
  }
  removePlayer(id) {
    const p = this.players.get(id); if (!p) return;
    if (!p.dead) this.kill(p, null, true);
    p.left = true;
  }

  // ---------- Boucle ----------
  darkness() {
    const cyc = C.DAY_LEN + C.NIGHT_LEN, tc = (this.t + this.cycleOffset) % cyc, F = C.FADE, D = C.DAY_LEN;
    if (tc < D - F) return 0;
    if (tc < D) return (tc - (D - F)) / F;
    if (tc < cyc - F) return 1;
    return 1 - (tc - (cyc - F)) / F;
  }
  tick(dt) {
    if (this.over) return;
    this.t += dt;
    this.night = this.darkness() > 0.5;
    for (const p of this.players.values()) this.updatePlayer(p, dt);
    this.updateProjectiles(dt);
    this.updateBombs(dt);
    this.updateTraps();
    this.updateMines();
    this.updateAnimals(dt);
    this.respawnStuff();
  }
  respawnStuff() {
    for (const n of this.nodes) if (!n.alive && this.t >= n.respawnAt) {
      let blocked = false;
      for (const p of this.players.values()) if (!p.dead && dist2(p.x, p.y, n.x, n.y) < (n.r + C.PLAYER_R + 4) ** 2) blocked = true;
      const key = Math.floor(n.x / C.TILE) + ',' + Math.floor(n.y / C.TILE);
      if (this.tiles.has(key)) blocked = true;
      if (blocked) { n.respawnAt = this.t + 5; continue; }
      n.alive = true; n.hp = C.NODES[n.type].hp;
      this.broadcast('node', [n.id, 1]);
    }
    for (const a of this.animals) if (!a.alive && a.respawnAt && this.t >= a.respawnAt) {
      a.alive = true; a.hp = C.ANIMALS[a.type].hp; a.x = a.hx; a.y = a.hy; a.st = 'idle';
    }
  }

  standingOf(team, except) {
    for (const p of this.players.values()) if (p !== except && p.team === team && p.standing && !p.dead) return true;
    return false;
  }

  updatePlayer(p, dt) {
    if (p.dead) return;
    const inp = p.input;
    p.a = inp.a;
    p.cd -= dt; p.slowT -= dt;
    // vie
    if (p.standing && p.hp < C.MAX_HP && this.t - p.lastHit > C.REGEN_DELAY) p.hp = Math.min(C.MAX_HP, p.hp + C.REGEN_RATE * dt);
    if (p.downed) {
      p.downedT -= dt;
      if (p.downedT <= 0 || !this.standingOf(p.team, p)) return this.kill(p, null);
    }
    // déplacement
    const moving = Math.abs(inp.mx) + Math.abs(inp.my) > 0.05;
    let sp = p.downed ? C.DOWNED_SPEED : (inp.run ? C.RUN_SPEED : C.WALK_SPEED);
    if (p.slowT > 0) sp *= 0.5;
    p.running = moving && inp.run && p.standing;
    p.moving = moving;
    if (moving) {
      const ox = p.x, oy = p.y;
      p.x += inp.mx * sp * dt; p.y += inp.my * sp * dt;
      this.collide(p, C.PLAYER_R, p.team);
      const moved = Math.hypot(p.x - ox, p.y - oy);
      p.stepAcc += moved;
      const stride = p.running ? 70 : 58;
      if (p.stepAcc > stride) { p.stepAcc = 0; this.steps.push({ id: p.id, x: p.x, y: p.y, run: p.running, team: p.team }); }
    }
    // relever un coéquipier / ouvrir une caisse
    if (p.standing && inp.interact) {
      let target = null;
      for (const o of this.players.values()) if (o !== p && o.downed && !o.dead && o.team === p.team && dist2(o.x, o.y, p.x, p.y) < C.INTERACT_R ** 2) { target = o; break; }
      if (target) {
        if (p.revive !== target.id) { p.revive = target.id; p.reviveP = 0; }
        p.reviveP += dt;
        if (p.reviveP >= C.REVIVE_TIME) {
          target.downed = false; target.standing = true; target.hp = 35; target.lastHit = this.t;
          p.revive = null; p.reviveP = 0;
          this.broadcast('feed', { k: 'revive', a: p.name, b: target.name });
        }
      } else {
        p.revive = null; p.reviveP = 0;
        for (const c of this.crates) if (!c.opened && dist2(c.x, c.y, p.x, p.y) < C.INTERACT_R ** 2) { this.openCrate(p, c); break; }
      }
    } else { p.revive = null; p.reviveP = 0; }
    // attaque
    if (p.standing && inp.attack && p.cd <= 0) this.attack(p);
  }

  collide(e, r, team) {
    // rochers, arbres...
    for (const n of this.near(this.nodeBuckets, e.x, e.y, r + 50)) {
      if (!n.alive || C.NODES[n.type].soft) continue;
      const dx = e.x - n.x, dy = e.y - n.y, d = Math.hypot(dx, dy), m = r + n.r * 0.8;
      if (d < m && d > 0.001) { e.x = n.x + dx / d * m; e.y = n.y + dy / d * m; }
    }
    // murs
    const T = C.TILE;
    for (let pass = 0; pass < 2; pass++) {
      const gx0 = Math.floor((e.x - r) / T), gx1 = Math.floor((e.x + r) / T);
      const gy0 = Math.floor((e.y - r) / T), gy1 = Math.floor((e.y + r) / T);
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const t = this.tiles.get(gx + ',' + gy);
        if (!t || !C.BUILD[t.type].solid) continue;
        if (C.BUILD[t.type].door && team && t.team === team) continue;
        const qx = clamp(e.x, gx * T, gx * T + T), qy = clamp(e.y, gy * T, gy * T + T);
        let dx = e.x - qx, dy = e.y - qy, d = Math.hypot(dx, dy);
        if (d < r) {
          if (d < 0.001) { // centre dans le mur : sortir par le côté le plus proche
            const cx = gx * T + T / 2, cy = gy * T + T / 2;
            dx = e.x - cx; dy = e.y - cy; d = Math.hypot(dx, dy) || 1;
            e.x = cx + dx / d * (T / 2 + r); e.y = cy + dy / d * (T / 2 + r);
          } else { e.x = qx + dx / d * r; e.y = qy + dy / d * r; }
        }
      }
    }
    this.clampLand(e, r);
  }

  solidAt(x, y) {
    const t = this.tiles.get(Math.floor(x / C.TILE) + ',' + Math.floor(y / C.TILE));
    return t && C.BUILD[t.type].solid ? t : null;
  }

  attack(p) {
    const wname = C.SLOTS[p.slot] || 'fists';
    if (!this.hasWeapon(p, wname)) { p.slot = 0; return; }
    const w = C.WEAPONS[wname];
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    if (w.kind === 'melee') {
      p.cd = w.cd; p.atkT = this.t; p.shotT = this.t;
      const reach = w.range + C.PLAYER_R;
      for (const o of this.players.values()) {
        if (o === p || o.dead || o.team === p.team) continue;
        if (dist2(o.x, o.y, p.x, p.y) < (reach + C.PLAYER_R) ** 2 && angleDiff(Math.atan2(o.y - p.y, o.x - p.x), p.a) < w.arc / 2 + 0.25) {
          this.hurt(o, w.dmg, p); this.fx.push({ k: 'hit', x: r1(o.x), y: r1(o.y) });
        }
      }
      for (const a of this.animals) {
        if (!a.alive) continue;
        const ar = C.ANIMALS[a.type].r;
        if (dist2(a.x, a.y, p.x, p.y) < (reach + ar) ** 2 && angleDiff(Math.atan2(a.y - p.y, a.x - p.x), p.a) < w.arc / 2 + 0.25) {
          this.hurtAnimal(a, w.dmg, p); this.fx.push({ k: 'hit', x: r1(a.x), y: r1(a.y) });
        }
      }
      let harvested = false;
      for (const n of this.near(this.nodeBuckets, p.x, p.y, reach + 50)) {
        if (!n.alive || harvested) continue;
        if (dist2(n.x, n.y, p.x, p.y) < (reach + n.r) ** 2 && angleDiff(Math.atan2(n.y - p.y, n.x - p.x), p.a) < w.arc / 2 + 0.3) {
          harvested = true;
          const def = C.NODES[n.type];
          const times = w.harvest;
          for (const k in def.gives) p.inv[k] += def.gives[k] * times;
          n.hp -= times;
          this.fx.push({ k: 'chop', x: r1(n.x), y: r1(n.y), t: n.ti });
          this.emit(p.id, 'gain', def.gives && Object.fromEntries(Object.entries(def.gives).map(([k, v]) => [k, v * times])));
          if (n.hp <= 0) { n.alive = false; n.respawnAt = this.t + def.respawn; this.broadcast('node', [n.id, 0]); }
        }
      }
      // constructions des autres
      const T = C.TILE;
      const hx = p.x + ca * (C.PLAYER_R + w.range * 0.6), hy = p.y + sa * (C.PLAYER_R + w.range * 0.6);
      const hitTile = (map) => {
        const gx0 = Math.floor((hx - 40) / T), gx1 = Math.floor((hx + 40) / T), gy0 = Math.floor((hy - 40) / T), gy1 = Math.floor((hy + 40) / T);
        for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
          const t = map.get(gx + ',' + gy);
          if (!t || t.team === p.team) continue;
          const qx = clamp(hx, gx * T, gx * T + T), qy = clamp(hy, gy * T, gy * T + T);
          if (dist2(hx, hy, qx, qy) < 30 * 30) { this.hurtTile(t, w.struct, map); return true; }
        }
        return false;
      };
      if (!hitTile(this.tiles)) hitTile(this.roofs);
    } else if (w.kind === 'ranged') {
      if (w.ammo) { if (p.ammo[wname] <= 0) { p.slot = 0; return; } p.ammo[wname]--; if (p.ammo[wname] <= 0) p.owned.delete(wname); }
      p.cd = w.cd; p.atkT = this.t; p.shotT = this.t;
      const sx = p.x + ca * (C.PLAYER_R + 8), sy = p.y + sa * (C.PLAYER_R + 8);
      this.projectiles.push({ id: this.id(), w: wname, x: sx, y: sy, vx: ca * w.speed, vy: sa * w.speed, left: w.range, owner: p, team: p.team, dmg: w.dmg, struct: w.struct });
      this.fx.push({ k: 'shot', x: r1(sx), y: r1(sy), w: C.SLOTS.indexOf(wname) });
      if (!this.hasWeapon(p, wname)) p.slot = 0;
    } else if (w.kind === 'throw') {
      p.bombs--; p.cd = w.cd; p.atkT = this.t;
      const d = clamp(p.input.aimD || 200, 60, w.range);
      let tx = p.x + ca * d, ty = p.y + sa * d;
      this.bombs.push({ id: this.id(), x0: p.x, y0: p.y, x1: tx, y1: ty, x: p.x, y: p.y, t: 0, owner: p, team: p.team });
      if (p.bombs <= 0) p.slot = 0;
    } else if (w.kind === 'trap') {
      p.cd = w.cd;
      let t1 = null, best = 1e9;
      for (const n of this.near(this.nodeBuckets, p.x, p.y, 110)) if (n.alive && n.type === 'tree') { const d = dist2(n.x, n.y, p.x, p.y); if (d < best && d < 110 * 110) { best = d; t1 = n; } }
      if (!t1) return this.emit(p.id, 'msg', { k: 'needTree' });
      let t2 = null; best = 1e9;
      for (const n of this.near(this.nodeBuckets, t1.x, t1.y, w.len)) if (n !== t1 && n.alive && n.type === 'tree') {
        const d = dist2(n.x, n.y, t1.x, t1.y);
        if (d < best && d < w.len * w.len && d > 50 * 50) { best = d; t2 = n; }
      }
      if (!t2) return this.emit(p.id, 'msg', { k: 'needTwoTrees' });
      p.traps--;
      this.traps.push({ id: this.id(), x1: t1.x, y1: t1.y, x2: t2.x, y2: t2.y, team: p.team, owner: p });
      this.emit(p.id, 'msg', { k: 'trapSet' });
      if (p.traps <= 0) p.slot = 0;
    }
  }

  openCrate(p, c) {
    c.opened = true;
    const R = this.rand, got = {};
    const add = (k, v) => { got[k] = (got[k] || 0) + v; };
    const roll = R();
    if (c.rich ? roll < 0.45 : roll < 0.25) { p.owned.add('pistol'); p.ammo.pistol += 24; add('pistol', 24); }
    else if (c.rich ? roll < 0.75 : roll < 0.4) { p.owned.add('sniper'); p.ammo.sniper += 6; add('sniper', 6); }
    if (R() < 0.6) { const b = 1 + ((R() * 2) | 0); p.bombs += b; add('bomb', b); }
    const m = 2 + ((R() * 3) | 0); p.inv.metal += m; add('metal', m);
    const wd = 6 + ((R() * 8) | 0); p.inv.wood += wd; add('wood', wd);
    if (R() < 0.6) { const f = 4 + ((R() * 6) | 0); p.inv.fiber += f; add('fiber', f); }
    this.broadcast('crate', [c.id, 1]);
    this.emit(p.id, 'gain', got);
    this.fx.push({ k: 'loot', x: r1(c.x), y: r1(c.y) });
  }

  hurt(o, dmg, src) {
    if (o.dead || this.over) return;
    o.lastHit = this.t;
    if (o.downed) {
      o.downedHp -= dmg;
      if (o.downedHp <= 0) this.kill(o, src);
      return;
    }
    o.hp -= dmg;
    if (o.hp <= 0) {
      o.hp = 0;
      if (this.mode === '3v3' && this.standingOf(o.team, o)) {
        o.standing = false; o.downed = true; o.downedHp = C.DOWNED_HP; o.downedT = C.DOWNED_TIME;
        o.lastBy = src && src.name ? src : null;
        this.broadcast('feed', { k: 'down', a: src && src.name ? src.name : null, b: o.name, by: src && src.type ? src.type : null });
      } else this.kill(o, src);
    }
  }
  kill(o, src, silent) {
    if (o.dead) return;
    o.dead = true; o.standing = false; o.downed = false; o.hp = 0;
    const killer = src && src.name ? src : (o.lastBy || null);
    if (killer && killer !== o && killer.team !== o.team) killer.kills++;
    if (!silent) this.broadcast('feed', { k: 'kill', a: killer && killer !== o ? killer.name : null, b: o.name, by: src && src.type ? src.type : (src && src.mine ? 'mine' : null) });
    else this.broadcast('feed', { k: 'left', b: o.name });
    // plus personne debout dans l'équipe : les blessés meurent
    if (!this.standingOf(o.team)) for (const q of this.players.values()) if (q.team === o.team && q.downed) this.kill(q, null);
    this.checkEnd();
  }
  hurtAnimal(a, dmg) {
    a.hp -= dmg; a.revealT = this.t;
    if (a.type !== 'snake' && a.st === 'idle') a.st = 'alert';
    if (a.hp <= 0) { a.alive = false; a.respawnAt = this.t + 120; this.fx.push({ k: 'adead', x: r1(a.x), y: r1(a.y) }); }
  }
  hurtTile(t, dmg, map) {
    t.hp -= dmg;
    this.fx.push({ k: 'thit', x: r1((t.gx + 0.5) * C.TILE), y: r1((t.gy + 0.5) * C.TILE) });
    if (t.hp <= 0) { map.delete(t.gx + ',' + t.gy); this.fx.push({ k: 'tbreak', x: r1((t.gx + 0.5) * C.TILE), y: r1((t.gy + 0.5) * C.TILE), t: t.ti }); }
  }

  updateProjectiles(dt) {
    const keep = [];
    for (const b of this.projectiles) {
      const total = Math.hypot(b.vx, b.vy) * dt;
      const steps = Math.max(1, Math.ceil(total / 18));
      let hit = false;
      for (let s = 0; s < steps && !hit; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        b.left -= total / steps;
        for (const o of this.players.values()) {
          if (o.dead || o.team === b.team) continue;
          if (dist2(o.x, o.y, b.x, b.y) < (C.PLAYER_R + 4) ** 2) { this.hurt(o, b.dmg, b.owner); this.fx.push({ k: 'hit', x: r1(b.x), y: r1(b.y) }); hit = true; break; }
        }
        if (hit) break;
        for (const a of this.animals) {
          if (!a.alive) continue;
          if (dist2(a.x, a.y, b.x, b.y) < (C.ANIMALS[a.type].r + 4) ** 2) { this.hurtAnimal(a, b.dmg); this.fx.push({ k: 'hit', x: r1(b.x), y: r1(b.y) }); hit = true; break; }
        }
        if (hit) break;
        const t = this.solidAt(b.x, b.y);
        if (t) { if (t.team !== b.team) this.hurtTile(t, b.struct, this.tiles); this.fx.push({ k: 'spark', x: r1(b.x), y: r1(b.y) }); hit = true; break; }
        for (const n of this.near(this.nodeBuckets, b.x, b.y, 50)) {
          if (!n.alive || C.NODES[n.type].soft) continue;
          if (dist2(n.x, n.y, b.x, b.y) < (n.r * 0.8) ** 2) { this.fx.push({ k: 'spark', x: r1(b.x), y: r1(b.y) }); hit = true; break; }
        }
      }
      if (!hit && b.left > 0) keep.push(b);
    }
    this.projectiles = keep;
  }
  updateBombs(dt) {
    const keep = [];
    const w = C.WEAPONS.bomb;
    for (const b of this.bombs) {
      b.t += dt;
      const f = Math.min(1, b.t / 0.5);
      b.x = b.x0 + (b.x1 - b.x0) * f; b.y = b.y0 + (b.y1 - b.y0) * f;
      if (b.t >= w.fuse) this.explode(b.x, b.y, w.radius, w.dmg, w.struct, b.owner);
      else keep.push(b);
    }
    this.bombs = keep;
  }
  explode(x, y, radius, dmg, structDmg, owner) {
    this.fx.push({ k: 'boom', x: r1(x), y: r1(y), r: radius });
    for (const o of this.players.values()) {
      if (o.dead) continue;
      if (owner && o !== owner && o.team === owner.team) continue;
      const d = Math.sqrt(dist2(o.x, o.y, x, y));
      if (d < radius) this.hurt(o, dmg * (1 - d / radius * 0.6) * (o === owner ? 0.5 : 1), owner || { mine: true });
    }
    for (const a of this.animals) if (a.alive && dist2(a.x, a.y, x, y) < radius * radius) this.hurtAnimal(a, dmg);
    const T = C.TILE, g0x = Math.floor((x - radius) / T), g1x = Math.floor((x + radius) / T), g0y = Math.floor((y - radius) / T), g1y = Math.floor((y + radius) / T);
    for (let gx = g0x; gx <= g1x; gx++) for (let gy = g0y; gy <= g1y; gy++) {
      const cx = (gx + 0.5) * T, cy = (gy + 0.5) * T;
      if (dist2(cx, cy, x, y) > (radius + 20) ** 2) continue;
      for (const map of [this.tiles, this.roofs]) {
        const t = map.get(gx + ',' + gy);
        if (t && !(owner && t.team === owner.team)) this.hurtTile(t, structDmg, map);
      }
    }
  }
  updateTraps() {
    if (!this.traps.length) return;
    const w = C.WEAPONS.trap;
    this.traps = this.traps.filter(tr => {
      for (const o of this.players.values()) {
        if (o.dead || o.team === tr.team) continue;
        if (segPointDist2(tr.x1, tr.y1, tr.x2, tr.y2, o.x, o.y) < (C.PLAYER_R * 0.8) ** 2) {
          this.hurt(o, w.dmg, tr.owner); o.slowT = w.slow;
          this.fx.push({ k: 'trap', x: r1(o.x), y: r1(o.y) });
          return false;
        }
      }
      return true;
    });
  }
  updateMines() {
    const M = C.MINE;
    this.mines = this.mines.filter(m => {
      for (const o of this.players.values()) {
        if (o.dead) continue;
        if (dist2(o.x, o.y, m.x, m.y) < (M.trigger + C.PLAYER_R * 0.5) ** 2) {
          this.explode(m.x, m.y, M.radius, M.dmg, 120, null);
          return false;
        }
      }
      return true;
    });
  }

  updateAnimals(dt) {
    const players = [...this.players.values()].filter(p => !p.dead && p.standing);
    for (const a of this.animals) {
      if (!a.alive) continue;
      const d = C.ANIMALS[a.type];
      a.cd -= dt;
      if (this.night && a.st !== 'charge') { a.st = 'sleep'; continue; }
      if (a.st === 'sleep') a.st = 'idle';
      let tgt = null, best = 1e12;
      for (const p of players) { const dd = dist2(p.x, p.y, a.x, a.y); if (dd < best) { best = dd; tgt = p; } }
      const bd = Math.sqrt(best);
      if (a.type === 'snake') {
        if (tgt && bd < d.range + C.PLAYER_R && a.cd <= 0) {
          a.cd = d.cd; a.revealT = this.t; a.a = Math.atan2(tgt.y - a.y, tgt.x - a.x);
          this.hurt(tgt, d.dmg, { type: 'snake' }); this.fx.push({ k: 'bite', x: r1(tgt.x), y: r1(tgt.y) });
        }
        continue;
      }
      if (a.type === 'boar') {
        if (a.st === 'windup') {
          a.timer -= dt;
          if (tgt) a.a = Math.atan2(tgt.y - a.y, tgt.x - a.x);
          if (a.timer <= 0) { a.st = 'charge'; a.timer = d.chargeTime; }
        } else if (a.st === 'charge') {
          a.timer -= dt;
          const ox = a.x, oy = a.y;
          a.x += Math.cos(a.a) * d.chargeSpeed * dt; a.y += Math.sin(a.a) * d.chargeSpeed * dt;
          this.collide(a, d.r, null);
          const blocked = Math.hypot(a.x - ox, a.y - oy) < d.chargeSpeed * dt * 0.4;
          for (const p of players) if (dist2(p.x, p.y, a.x, a.y) < (d.r + C.PLAYER_R + 4) ** 2) {
            this.hurt(p, d.dmg, { type: 'boar' });
            p.x += Math.cos(a.a) * 50; p.y += Math.sin(a.a) * 50; this.collide(p, C.PLAYER_R, p.team);
            this.fx.push({ k: 'hit', x: r1(p.x), y: r1(p.y) });
            a.timer = 0;
          }
          if (a.timer <= 0 || blocked) { a.st = 'idle'; a.cd = d.cd; }
        } else {
          if (tgt && bd < d.aggro && a.cd <= 0) { a.st = 'windup'; a.timer = d.windup; }
          else this.wander(a, d.speed, dt);
        }
        continue;
      }
      if (a.type === 'wolf') {
        const chasing = a.st === 'chase';
        if (tgt && (bd < d.aggro || (chasing && bd < d.giveUp))) {
          a.st = 'chase';
          a.a = Math.atan2(tgt.y - a.y, tgt.x - a.x);
          if (bd > d.range + C.PLAYER_R - 6) {
            a.x += Math.cos(a.a) * d.speed * dt; a.y += Math.sin(a.a) * d.speed * dt;
            // les loups s'écartent un peu les uns des autres pour encercler
            for (const o of this.animals) if (o !== a && o.alive && o.type === 'wolf') {
              const dd = dist2(o.x, o.y, a.x, a.y);
              if (dd < 60 * 60 && dd > 0) { const k = Math.sqrt(dd); a.x += (a.x - o.x) / k * 40 * dt; a.y += (a.y - o.y) / k * 40 * dt; }
            }
            this.collide(a, d.r, null);
          } else if (a.cd <= 0) {
            a.cd = d.cd; this.hurt(tgt, d.dmg, { type: 'wolf' }); this.fx.push({ k: 'bite', x: r1(tgt.x), y: r1(tgt.y) });
          }
        } else { a.st = 'idle'; this.wander(a, d.speed * 0.35, dt); }
      }
    }
  }
  wander(a, speed, dt) {
    a.timer -= dt;
    if (a.timer <= 0) {
      a.timer = 2 + this.rand() * 4;
      if (this.rand() < 0.4) { a.tx = a.x; a.ty = a.y; }
      else { const an = this.rand() * 6.28, d = this.rand() * 240; a.tx = a.hx + Math.cos(an) * d; a.ty = a.hy + Math.sin(an) * d; }
    }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
    if (d > 8) {
      a.a = Math.atan2(dy, dx);
      a.x += dx / d * speed * dt; a.y += dy / d * speed * dt;
      this.collide(a, C.ANIMALS[a.type].r, null);
    }
  }

  checkEnd() {
    if (this.over) return;
    const alive = new Set();
    for (const p of this.players.values()) if (!p.dead && !p.left) alive.add(p.team);
    const done = this.teamsAtStart >= 2 ? alive.size <= 1 : alive.size === 0;
    if (!done) return;
    this.over = true;
    const team = [...alive][0] || null;
    const winners = [...this.players.values()].filter(p => team && p.team === team).map(p => p.name);
    const stats = [...this.players.values()].map(p => ({ name: p.name, kills: p.kills, team: p.team, win: team && p.team === team }));
    this.onEnd({ team, winners, stats });
  }

  // ---------- Visibilité et envois ----------
  inBush(e) {
    for (const b of this.near(this.bushBuckets, e.x, e.y, 60)) if (dist2(b.x, b.y, e.x, e.y) < (b.r - 4) ** 2) return true;
    return false;
  }
  inCave(e) {
    for (const c of this.caves) if (dist2(c.x, c.y, e.x, e.y) < c.r * c.r) return true;
    return false;
  }
  lit(e) {
    for (const t of this.tiles.values()) if (t.type === 'campfire' && dist2((t.gx + 0.5) * C.TILE, (t.gy + 0.5) * C.TILE, e.x, e.y) < C.CAMPFIRE_LIGHT ** 2) return true;
    return false;
  }
  canSee(v, p, cache) {
    if (p === v || p.team === v.team) return true;
    const d2 = dist2(v.x, v.y, p.x, p.y);
    if (d2 > C.SEND_R ** 2) return false;
    const revealed = this.t - p.shotT < 0.6;
    const info = cache.get(p) || (() => { const i = { bush: this.inBush(p), cave: this.inCave(p), lit: this.night ? this.lit(p) : false }; cache.set(p, i); return i; })();
    if (revealed && d2 < 1200 ** 2) return true;
    if (info.bush && d2 > C.BUSH_REVEAL ** 2) return false;
    const roof = this.roofs.get(Math.floor(p.x / C.TILE) + ',' + Math.floor(p.y / C.TILE));
    if (roof && roof.team !== v.team && d2 > 90 * 90) return false;
    const vCave = (cache.get(v) || { cave: this.inCave(v) }).cave;
    if ((info.cave || vCave) && d2 > C.CAVE_VISION ** 2) return false;
    if (this.night && d2 > C.NIGHT_VISION ** 2 && !info.lit) return false;
    return true;
  }
  snapshots() {
    const darkness = this.darkness();
    const cyc = C.DAY_LEN + C.NIGHT_LEN;
    const tc = (this.t + this.cycleOffset) % cyc;
    const cache = new Map();
    let aliveCount = 0;
    for (const p of this.players.values()) if (!p.dead && !p.left) aliveCount++;
    for (const viewer of this.players.values()) {
      if (viewer.left) continue;
      // un joueur mort regarde un autre joueur (spectateur)
      let v = viewer;
      if (viewer.dead) {
        let s = viewer.spectate && this.players.get(viewer.spectate);
        if (!s || s.dead) { s = [...this.players.values()].find(q => !q.dead && !q.left) || viewer; viewer.spectate = s.id; }
        v = s;
      }
      const R2 = C.SEND_R ** 2;
      const P = [];
      for (const p of this.players.values()) {
        if (p.dead || p.left) continue;
        if (!this.canSee(v, p, cache)) continue;
        const flags = (p.downed ? 1 : 0) | (p.running ? 2 : 0) | (p.slowT > 0 ? 8 : 0) | (p.moving ? 16 : 0);
        P.push([p.id, r1(p.x), r1(p.y), r2(p.a), Math.ceil(p.hp), flags, p.slot, r2(Math.min(9, this.t - p.atkT)), p.downed ? r2(p.downedHp / C.DOWNED_HP) : 0]);
      }
      const A = [];
      for (const a of this.animals) {
        if (!a.alive || dist2(a.x, a.y, v.x, v.y) > R2) continue;
        if (a.type === 'snake' && this.t - a.revealT > 2 && dist2(a.x, a.y, v.x, v.y) > C.ANIMALS.snake.reveal ** 2) continue;
        const st = a.st === 'sleep' ? 1 : a.st === 'windup' ? 2 : a.st === 'charge' ? 3 : 0;
        A.push([a.id, a.ti, r1(a.x), r1(a.y), r2(a.a), r2(a.hp / C.ANIMALS[a.type].hp), st]);
      }
      const J = [];
      for (const b of this.projectiles) if (dist2(b.x, b.y, v.x, v.y) < R2) J.push([b.id, r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), C.SLOTS.indexOf(b.w)]);
      const B = [];
      for (const b of this.bombs) if (dist2(b.x, b.y, v.x, v.y) < R2) B.push([b.id, r1(b.x), r1(b.y), r2(Math.min(1, b.t / 0.5)), r2(b.t / C.WEAPONS.bomb.fuse)]);
      const S = [], RF = [];
      const T = C.TILE, gR = C.SEND_R / T;
      const vgx = v.x / T, vgy = v.y / T;
      for (const t of this.tiles.values()) if (Math.abs(t.gx - vgx) < gR && Math.abs(t.gy - vgy) < gR) S.push([t.id, t.gx, t.gy, t.ti, r2(t.hp / t.max), t.team === v.team ? 1 : 0]);
      for (const t of this.roofs.values()) if (Math.abs(t.gx - vgx) < gR && Math.abs(t.gy - vgy) < gR) RF.push([t.id, t.gx, t.gy, t.ti, r2(t.hp / t.max), t.team === v.team ? 1 : 0]);
      const TR = [];
      for (const tr of this.traps) {
        const mine = tr.team === v.team;
        if (mine || segPointDist2(tr.x1, tr.y1, tr.x2, tr.y2, v.x, v.y) < 130 * 130) TR.push([tr.id, r1(tr.x1), r1(tr.y1), r1(tr.x2), r1(tr.y2), mine ? 1 : 0]);
      }
      const M = [];
      for (const m of this.mines) if (dist2(m.x, m.y, v.x, v.y) < C.MINE.visible ** 2) M.push([m.id, r1(m.x), r1(m.y)]);
      const FX = this.fx.filter(f => dist2(f.x, f.y, v.x, v.y) < R2);
      const ST = [];
      for (const s of this.steps) {
        if (s.id === v.id) continue;
        const d2 = dist2(s.x, s.y, v.x, v.y);
        if (d2 > C.STEP_HEAR ** 2) continue;
        ST.push([r1(s.x + (this.rand() - 0.5) * 50), r1(s.y + (this.rand() - 0.5) * 50), s.run ? 1 : 0]);
      }
      const L = viewer.dead ? [...this.players.values()].filter(q => !q.dead && !q.left).map(q => q.id) : null;
      const me = {
        id: v.id, spect: viewer.dead, x: r1(v.x), y: r1(v.y), hp: Math.ceil(v.hp), downed: v.downed, downedT: r1(v.downedT), dead: v.dead,
        inv: v.inv, owned: [...v.owned], ammo: v.ammo, bombs: v.bombs, traps: v.traps, slot: v.slot,
        revive: v.revive ? r2(v.reviveP / C.REVIVE_TIME) : 0, slow: v.slowT > 0, cave: this.inCave(v), team: v.team, kills: v.kills
      };
      this.emit(viewer.id, 'snap', { t: r2(this.t), tc: r2(tc), dk: r2(darkness), alive: aliveCount, me, L, P, A, J, B, S, RF, TR, M, FX, ST });
    }
    this.fx = []; this.steps = [];
  }
}

module.exports = Game;
