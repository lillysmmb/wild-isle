// Dessins du jeu : personnages, armes, animaux, décor, constructions.
// Tout est dessiné en code (pas d'images à charger).
(function () {
  const OL = '#0b0e16';
  const SKINS = ['#f6d7b8', '#eebf95', '#d9a066', '#b5784a', '#8a5530', '#5e3a20', '#3f2614', '#f2c9a0'];
  const HAIRC = ['#1b1410', '#4a2c17', '#8b5a2b', '#d9a441', '#f2e3b3', '#b23a2a', '#e8e8e8', '#3b6fd6', '#7a3fc4', '#2f9e5a'];
  const OUTFITS = [
    { main: '#3e8e41', dark: '#2b6330', belt: '#5c3a1c' },          // tunique
    { main: '#7a4a25', dark: '#55331a', belt: '#2e1c0e' },          // cuir
    { main: '#9aa7b8', dark: '#66717f', belt: '#4b5266' },          // armure
    { main: '#c9a36a', dark: '#8f6f3d', belt: '#f1e6cf' },          // tribal
    { main: '#23262f', dark: '#14161c', belt: '#c62828' },          // ninja
    { main: '#55687a', dark: '#3a4855', belt: '#c8a26a' },          // viking
    { main: '#6b5a3a', dark: '#4a3d26', belt: '#2b2b2b' },          // mercenaire
    { main: '#4f6b2f', dark: '#364a1f', belt: '#6e4a2a' }           // chasseur
  ];
  const TEAM_COLORS = { t0: '#ef4444', t1: '#3b82f6' };

  function circle(c, x, y, r, fill, stroke = OL, lw = 3) {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
  }
  function ellipse(c, x, y, rx, ry, fill, stroke = OL, lw = 3) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
  }
  function rrect(c, x, y, w, h, r, fill, stroke = OL, lw = 3) {
    c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(Math.min(255, r * f)); g = Math.round(Math.min(255, g * f)); b = Math.round(Math.min(255, b * f));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // ---------- Armes (dessinées dans le repère de la main, pointant vers la droite) ----------
  function weapon(c, w, atk) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (w === 'sword') {
      const sw = atk < 0.22 ? Math.sin(atk / 0.22 * Math.PI) * 1.4 - 0.7 : -0.5;
      c.rotate(sw);
      rrect(c, -4, -4, 12, 8, 2, '#7c2d12');
      rrect(c, 6, -10, 6, 20, 2, '#ffb000');
      c.beginPath(); c.moveTo(12, -5); c.lineTo(46, -3); c.lineTo(52, 0); c.lineTo(46, 3); c.lineTo(12, 5); c.closePath();
      c.fillStyle = '#d7dee8'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
      c.beginPath(); c.moveTo(14, 0); c.lineTo(44, 0); c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke();
    } else if (w === 'bow') {
      const pull = atk < 0.15 ? 0 : Math.min(1, (atk - 0.15) / 0.5) * 8;
      c.beginPath(); c.arc(-6, 0, 26, -1.2, 1.2); c.lineWidth = 7; c.strokeStyle = OL; c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#9a5b2b'; c.stroke();
      const ex = -6 + Math.cos(1.2) * 26, ey = Math.sin(1.2) * 26;
      c.beginPath(); c.moveTo(ex, -ey); c.lineTo(-pull - 2, 0); c.lineTo(ex, ey); c.strokeStyle = '#e2e8f0'; c.lineWidth = 1.5; c.stroke();
      if (atk > 0.3) { c.beginPath(); c.moveTo(-pull - 2, 0); c.lineTo(28, 0); c.strokeStyle = '#6b4a2b'; c.lineWidth = 3; c.stroke(); }
    } else if (w === 'slingshot') {
      c.beginPath(); c.moveTo(0, 0); c.lineTo(14, 0); c.moveTo(14, 0); c.lineTo(24, -9); c.moveTo(14, 0); c.lineTo(24, 9);
      c.lineWidth = 7; c.strokeStyle = OL; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#8a5a2b'; c.stroke();
      c.beginPath(); c.moveTo(24, -9); c.lineTo(8, 0); c.lineTo(24, 9); c.lineWidth = 1.5; c.strokeStyle = '#c62828'; c.stroke();
    } else if (w === 'pistol') {
      const r = atk < 0.1 ? -4 : 0;
      c.translate(r, 0);
      rrect(c, 0, -4, 26, 9, 2, '#2d3340');
      rrect(c, 2, 2, 8, 11, 2, '#5c3a1c');
      if (atk < 0.06) { circle(c, 32, 0, 7, '#ffd166', null); circle(c, 32, 0, 3.5, '#fff7d6', null); }
    } else if (w === 'sniper') {
      const r = atk < 0.15 ? -7 : 0;
      c.translate(r, 0);
      rrect(c, -10, -4, 22, 10, 2, '#5c3a1c');
      rrect(c, 10, -3, 46, 7, 2, '#1f242e');
      rrect(c, 12, -11, 18, 7, 3, '#2d3340');
      circle(c, 30, -7.5, 2, '#7dd3fc', null);
      if (atk < 0.08) { circle(c, 62, 0, 9, '#ffd166', null); circle(c, 62, 0, 4, '#fff7d6', null); }
    } else if (w === 'bomb') {
      circle(c, 10, 0, 10, '#1f242e');
      c.beginPath(); c.moveTo(14, -8); c.quadraticCurveTo(20, -16, 16, -20); c.strokeStyle = '#c8a26a'; c.lineWidth = 2.5; c.stroke();
      circle(c, 16, -21, 3, '#ffb000', null);
    } else if (w === 'trap') {
      circle(c, 9, 0, 9, '#c8a26a'); circle(c, 9, 0, 4.5, null, '#8a6a3a', 2);
    }
  }

  // ---------- Coiffures et accessoires (tête centrée en 0,0, rayon 15) ----------
  function hair(c, style, col, back) {
    c.fillStyle = col; c.strokeStyle = OL; c.lineWidth = 3;
    const cap = () => { c.beginPath(); c.arc(0, 0, 15.5, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(0, -6, -15.5, -1); c.closePath(); c.fill(); c.stroke(); };
    switch (style) {
      case 0: cap(); break;
      case 1: cap(); c.beginPath(); for (let i = -3; i <= 3; i++) { c.moveTo(i * 4 - 3, -13); c.lineTo(i * 4.5, -22 - (i % 2 ? 0 : 3)); c.lineTo(i * 4 + 3, -13); } c.fill(); c.stroke(); break;
      case 2: c.beginPath(); c.moveTo(-4, -12); c.lineTo(-3, -25); c.lineTo(3, -25); c.lineTo(4, -12); c.closePath(); c.fill(); c.stroke(); break;
      case 3: c.beginPath(); c.arc(0, 0, 15, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.globalAlpha *= 0.7; c.fill(); c.globalAlpha /= 0.7; break;
      case 4: break;
      case 5: if (back) { c.beginPath(); c.moveTo(-16, -4); c.quadraticCurveTo(-20, 18, -12, 26); c.lineTo(12, 26); c.quadraticCurveTo(20, 18, 16, -4); c.closePath(); c.fill(); c.stroke(); } else cap(); break;
      case 6: if (back) { c.beginPath(); c.moveTo(10, -6); c.quadraticCurveTo(26, 0, 20, 22); c.quadraticCurveTo(14, 8, 8, 2); c.closePath(); c.fill(); c.stroke(); } else cap(); break;
      case 7: cap(); circle(c, 0, -18, 7, col); break;
      case 8: if (back) { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 13, -2); c.lineTo(s * 15, 24); c.lineWidth = 7; c.strokeStyle = OL; c.stroke(); c.lineWidth = 4; c.strokeStyle = col; c.stroke(); circle(c, s * 15, 25, 3, '#c62828', OL, 2); } } else cap(); break;
      case 9: if (back) { c.beginPath(); c.moveTo(-17, -4); c.lineTo(-17, 12); c.lineTo(17, 12); c.lineTo(17, -4); c.closePath(); c.fill(); c.stroke(); } else cap(); break;
    }
  }
  function accessory(c, acc, facingUp) {
    switch (acc) {
      case 1: case 2:
        c.beginPath(); c.arc(0, -1, 16.5, Math.PI, Math.PI * 2); c.lineTo(16.5, 1); c.lineTo(-16.5, 1); c.closePath();
        c.fillStyle = '#9aa7b8'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
        if (!facingUp) rrect(c, -2.5, -2, 5, 11, 1, '#9aa7b8', OL, 2);
        circle(c, -8, -9, 1.6, '#e2e8f0', null); circle(c, 8, -9, 1.6, '#e2e8f0', null);
        if (acc === 2) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 13, -8); c.quadraticCurveTo(s * 28, -10, s * 26, -26); c.quadraticCurveTo(s * 22, -14, s * 11, -13); c.closePath(); c.fillStyle = '#f1e6cf'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke(); }
        break;
      case 3: rrect(c, -16, -9, 32, 6, 2, '#c62828', OL, 2.5); c.beginPath(); c.moveTo(15, -6); c.lineTo(24, -1); c.moveTo(15, -6); c.lineTo(22, 4); c.strokeStyle = '#c62828'; c.lineWidth = 3; c.stroke(); break;
      case 4: c.beginPath(); c.arc(0, -2, 16, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(15, -3); c.lineTo(-15, -3); c.closePath(); c.fillStyle = '#1e40af'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
        for (let i = -2; i <= 2; i++) circle(c, i * 5, -9, 1.3, '#e2e8f0', null); break;
      case 5: if (!facingUp) { circle(c, 5, 2, 4.2, '#111', OL, 1.5); c.beginPath(); c.moveTo(-14, -6); c.lineTo(15, -2); c.strokeStyle = '#111'; c.lineWidth = 1.6; c.stroke(); } break;
      case 6: if (!facingUp) { c.strokeStyle = '#c62828'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-11, 5); c.lineTo(-4, 6); c.moveTo(-11, 9); c.lineTo(-5, 9.5); c.moveTo(4, 6); c.lineTo(11, 5); c.moveTo(5, 9.5); c.lineTo(11, 9); c.stroke(); } break;
      case 7: c.beginPath(); c.arc(0, 0, 18, Math.PI * 0.95, Math.PI * 2.05); c.quadraticCurveTo(10, -4, 0, -6); c.quadraticCurveTo(-10, -4, -18, 1); c.closePath(); c.fillStyle = '#3f3a33'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); break;
      case 8: if (!facingUp) { c.beginPath(); c.moveTo(-14, 4); c.quadraticCurveTo(0, 18, 14, 4); c.lineTo(14, 4); c.closePath(); c.fillStyle = '#1f242e'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); } break;
      case 9: c.beginPath(); c.moveTo(8, -12); c.quadraticCurveTo(22, -30, 14, -38); c.quadraticCurveTo(10, -24, 6, -13); c.closePath(); c.fillStyle = '#ef4444'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); break;
    }
  }
  function outfitDetails(c, oi, o, g) {
    c.save(); c.beginPath(); c.ellipse(0, 4, g === 'f' ? 15 : 17, 15, 0, 0, Math.PI * 2); c.clip();
    c.lineWidth = 3;
    if (oi === 0) { c.fillStyle = o.belt; c.fillRect(-20, 7, 40, 5); }
    if (oi === 1) { c.strokeStyle = o.belt; c.lineWidth = 4; c.beginPath(); c.moveTo(-14, -8); c.lineTo(14, 16); c.stroke(); }
    if (oi === 2) { c.fillStyle = o.dark; c.fillRect(-20, 2, 40, 3); c.fillRect(-1.5, -12, 3, 30); for (const p of [[-8, -4], [8, -4], [-8, 10], [8, 10]]) circle(c, p[0], p[1], 1.6, '#e2e8f0', null); }
    if (oi === 3) { c.fillStyle = '#7a5530'; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 6, 14); c.lineTo(i * 6 + 3, 20); c.lineTo(i * 6 + 6, 14); c.fill(); } for (let i = -2; i <= 2; i++) circle(c, i * 5, -7 + Math.abs(i), 1.8, o.belt, OL, 1); }
    if (oi === 4) { c.fillStyle = o.belt; c.fillRect(-20, 6, 40, 5); }
    if (oi === 5) { c.fillStyle = '#7a5530'; c.fillRect(-20, 8, 40, 4); circle(c, 0, 10, 3, '#ffb000', OL, 1.5); }
    if (oi === 6) { c.fillStyle = '#2b2b2b'; c.fillRect(-12, -14, 5, 30); c.fillRect(7, -14, 5, 30); rrect(c, -6, 8, 12, 8, 2, '#8a6a3a', OL, 1.5); }
    if (oi === 7) { c.fillStyle = o.dark; for (const p of [[-8, -4, 5], [6, 4, 6], [-3, 12, 4], [10, -8, 4]]) { c.beginPath(); c.arc(p[0], p[1], p[2], 0, 7); c.fill(); } c.strokeStyle = o.belt; c.lineWidth = 3.5; c.beginPath(); c.moveTo(14, -8); c.lineTo(-14, 16); c.stroke(); }
    c.restore();
    if (oi === 2 || oi === 5) { // épaulettes / col de fourrure
      if (oi === 2) for (const s of [-1, 1]) ellipse(c, s * 15, -6, 7, 6, '#b8c3d1');
      else { c.beginPath(); c.ellipse(0, -9, 18, 6, 0, 0, Math.PI * 2); c.fillStyle = o.belt; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke(); }
    }
  }

  // ---------- Personnage ----------
  function character(c, look, o) {
    look = look || {};
    const skin = SKINS[look.skin | 0] || SKINS[1];
    const hc = HAIRC[look.hairC | 0] || HAIRC[0];
    const oi = (look.outfit | 0) % OUTFITS.length, of = OUTFITS[oi];
    const g = look.g === 'f' ? 'f' : 'm';
    const a = o.a || 0, t = o.t || 0, atk = o.atk ?? 9;
    const ca = Math.cos(a), sa = Math.sin(a);
    const facingUp = sa < -0.55;
    const flip = ca < 0 ? -1 : 1;
    c.save();
    if (o.ring) { c.beginPath(); c.ellipse(0, 16, 25, 9, 0, 0, Math.PI * 2); c.lineWidth = 3.5; c.strokeStyle = o.ring; c.stroke(); }
    if (o.downed) {
      c.globalAlpha *= 0.9;
      ellipse(c, 0, 10, 26, 9, 'rgba(0,0,0,0.3)', null);
      c.rotate(Math.PI / 2 * flip);
      ellipse(c, 0, 4, 16, 14, of.main);
      circle(c, 0, -16, 14, skin);
      hair(c, look.hair | 0, hc, false);
      c.restore();
      return;
    }
    ellipse(c, 0, 16, 20, 7, 'rgba(0,0,0,0.3)', null);
    const walk = o.moving ? Math.sin(t * (o.run ? 18 : 13)) : 0;
    // pieds
    ellipse(c, -7, 14 + walk * 3, 5, 4, '#2b2018', OL, 2.5);
    ellipse(c, 7, 14 - walk * 3, 5, 4, '#2b2018', OL, 2.5);
    const bob = o.moving ? Math.abs(walk) * -2 : Math.sin(t * 2.5) * 0.8;
    c.translate(0, bob);
    const drawArm = () => {
      c.save();
      const punch = o.w === 'fists' && atk < 0.18 ? Math.sin(atk / 0.18 * Math.PI) * 12 : 0;
      c.translate(ca * (16 + punch), 2 + sa * 10);
      c.rotate(a);
      if (o.w && o.w !== 'fists') weapon(c, o.w, atk);
      circle(c, 0, 0, 5.5, skin, OL, 2.5);
      c.restore();
      if (o.w === 'fists' || o.w === 'bow' || o.w === 'sniper') {
        c.save(); c.translate(ca * 10 - sa * 10, 4 + sa * 6 + ca * 6); circle(c, 0, 0, 5, skin, OL, 2.5); c.restore();
      }
    };
    if (facingUp) drawArm();
    // corps
    if (look.hair === 5 || look.hair === 6 || look.hair === 8 || look.hair === 9) { c.save(); c.translate(0, -16); c.scale(flip, 1); hair(c, look.hair, hc, true); c.restore(); }
    ellipse(c, 0, 4, g === 'f' ? 15 : 17, 15, of.main);
    outfitDetails(c, oi, of, g);
    // tête
    c.save(); c.translate(0, -16); c.scale(flip, 1);
    circle(c, 0, 0, 15, skin);
    if (!facingUp) {
      const ex = Math.abs(ca) * 3, ey = Math.max(-1, sa * 2.5) + 2;
      const blink = (t % 4) < 0.12;
      for (const s of [-1, 1]) {
        if (blink) { c.beginPath(); c.moveTo(s * 5.5 + ex - 2.5, ey); c.lineTo(s * 5.5 + ex + 2.5, ey); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); }
        else { ellipse(c, s * 5.5 + ex, ey, 2.6, 3.3, '#ffffff', OL, 1.5); circle(c, s * 5.5 + ex + 0.8, ey + 0.6, 1.4, OL, null); }
      }
      // sourcils "déterminés"
      c.beginPath(); c.moveTo(-9 + ex, ey - 6); c.lineTo(-2 + ex, ey - 4.5); c.moveTo(9 + ex, ey - 6); c.lineTo(2 + ex, ey - 4.5);
      c.strokeStyle = OL; c.lineWidth = 2.2; c.stroke();
      if (g === 'f' && !blink) { c.beginPath(); c.moveTo(-8.5 + ex, ey - 2); c.lineTo(-10.5 + ex, ey - 3.5); c.moveTo(8.5 + ex, ey - 2); c.lineTo(10.5 + ex, ey - 3.5); c.lineWidth = 1.5; c.stroke(); }
      c.beginPath(); c.moveTo(-3 + ex, ey + 7); c.lineTo(3 + ex, ey + 6); c.lineWidth = 2; c.stroke();
    }
    hair(c, look.hair | 0, hc, false);
    accessory(c, look.acc | 0, facingUp);
    c.restore();
    if (!facingUp) drawArm();
    c.restore();
  }

  // ---------- Animaux ----------
  function animal(c, type, a, st, t, hpf) {
    c.save();
    const flip = Math.cos(a) < 0 ? -1 : 1;
    if (type === 'snake') {
      c.lineCap = 'round';
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push([-i * 6 * flip, Math.sin(t * 6 + i * 0.9) * 5]);
      c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.lineWidth = 10; c.strokeStyle = OL; c.stroke(); c.lineWidth = 6.5; c.strokeStyle = '#4d7c0f'; c.stroke();
      ellipse(c, 3 * flip, 0, 7, 5.5, '#65a30d', OL, 2.5);
      circle(c, 5 * flip, -2, 1.5, '#fde047', null);
      c.beginPath(); c.moveTo(10 * flip, 0); c.lineTo(15 * flip, -2); c.moveTo(10 * flip, 0); c.lineTo(15 * flip, 2); c.strokeStyle = '#dc2626'; c.lineWidth = 1.5; c.stroke();
      c.restore(); return;
    }
    ellipse(c, 0, 14, 24, 7, 'rgba(0,0,0,0.3)', null);
    if (st === 2) c.translate(Math.sin(t * 60) * 2, 0);
    c.scale(flip, 1);
    const run = st === 3 ? 1 : 0.5;
    const leg = Math.sin(t * 14 * run) * 4;
    if (type === 'boar') {
      for (const lx of [-12, -4, 6, 13]) rrect(c, lx - 2.5, 6 + (lx % 2 ? leg : -leg) * 0.5, 5, 9, 2, '#3b2414', OL, 2);
      ellipse(c, 0, 0, 22, 13, '#6b4226');
      c.beginPath(); c.moveTo(-18, -8); for (let i = 0; i < 6; i++) c.lineTo(-14 + i * 5, -14 + (i % 2) * 4); c.lineTo(10, -8); c.fillStyle = '#3b2414'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke();
      ellipse(c, 20, 1, 10, 9, '#7a4b2b');
      ellipse(c, 28, 3, 5, 4.5, '#c08a6a', OL, 2);
      c.beginPath(); c.moveTo(24, 6); c.quadraticCurveTo(30, 4, 31, -3); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); c.lineWidth = 1.8; c.strokeStyle = '#f1e6cf'; c.stroke();
      if (st === 1) { c.beginPath(); c.moveTo(19, -2); c.lineTo(24, -2); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); }
      else circle(c, 21, -2, 2, st >= 2 ? '#ef4444' : OL, null);
      c.beginPath(); c.moveTo(14, -7); c.lineTo(16, -14); c.lineTo(20, -8); c.fillStyle = '#5a3720'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke();
    } else if (type === 'wolf') {
      for (const lx of [-12, -5, 6, 12]) rrect(c, lx - 2, 5 + (lx % 2 ? leg : -leg) * 0.6, 4, 10, 2, '#6b7280', OL, 2);
      c.beginPath(); c.moveTo(-18, -2); c.quadraticCurveTo(-34, -6 + Math.sin(t * 5) * 3, -36, 4); c.lineWidth = 8; c.strokeStyle = OL; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#9ca3af'; c.stroke();
      ellipse(c, 0, 0, 19, 10, '#8b939e');
      ellipse(c, 0, 3, 13, 5, '#c7cbd1', null);
      ellipse(c, 18, -3, 9, 8, '#9ca3af');
      c.beginPath(); c.moveTo(22, -1); c.lineTo(32, 1); c.lineTo(22, 5); c.closePath(); c.fillStyle = '#9ca3af'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
      circle(c, 32, 1, 2, OL, null);
      for (const ex of [13, 20]) { c.beginPath(); c.moveTo(ex - 3, -8); c.lineTo(ex, -17); c.lineTo(ex + 3, -8); c.fillStyle = '#6b7280'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); }
      if (st === 1) { c.beginPath(); c.moveTo(18, -4); c.lineTo(23, -4); c.strokeStyle = OL; c.lineWidth = 2; c.stroke(); }
      else circle(c, 20, -4, 1.8, '#fbbf24', null);
    }
    c.restore();
    if (st === 1) { c.save(); c.fillStyle = '#e2e8f0'; c.font = 'bold 14px Rajdhani, sans-serif'; const z = (t * 0.8) % 1; c.globalAlpha = 1 - z; c.fillText('z', 14, -22 - z * 14); c.fillText('Z', 22, -30 - z * 14); c.restore(); }
  }

  // ---------- Décor ----------
  function trunk(c, alive) {
    ellipse(c, 0, 6, 26, 9, 'rgba(0,0,0,0.25)', null);
    if (!alive) { ellipse(c, 0, 0, 13, 9, '#8a5a2b'); ellipse(c, 0, -2, 10, 6, '#c9965f', OL, 2); return; }
    rrect(c, -9, -26, 18, 32, 5, '#6b4224');
    c.beginPath(); c.moveTo(-3, -20); c.lineTo(-3, 0); c.strokeStyle = '#4a2c17'; c.lineWidth = 2; c.stroke();
  }
  function canopy(c, seed) {
    const s = (seed % 7) / 7;
    const g1 = s < 0.5 ? '#2f7d32' : '#2a6e3f', g2 = s < 0.5 ? '#43a047' : '#3b8f55';
    c.save(); c.translate(0, -52);
    const blobs = [[-20, 6, 22], [20, 8, 21], [0, -10, 26], [-8, 14, 20], [12, 16, 19]];
    c.beginPath(); for (const b of blobs) { c.moveTo(b[0] + b[2], b[1]); c.arc(b[0], b[1], b[2], 0, Math.PI * 2); }
    c.lineWidth = 6; c.strokeStyle = OL; c.stroke(); c.fillStyle = g1; c.fill();
    c.fillStyle = g2; for (const b of blobs) { c.beginPath(); c.arc(b[0] - 4, b[1] - 5, b[2] * 0.62, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function rock(c, seed, ore) {
    ellipse(c, 0, 10, 34, 10, 'rgba(0,0,0,0.25)', null);
    const n = 8, R = [];
    for (let i = 0; i < n; i++) R.push(26 + ((seed * (i + 3) * 97) % 10));
    c.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; c.lineTo(Math.cos(a) * R[i], Math.sin(a) * R[i] * 0.78 - 4); } c.closePath();
    c.fillStyle = ore ? '#4b4f5c' : '#8d95a5'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OL; c.stroke();
    c.beginPath(); c.ellipse(-6, -12, 14, 7, -0.3, 0, Math.PI * 2); c.fillStyle = ore ? '#5d6271' : '#aab2c0'; c.fill();
    if (ore) for (const p of [[-10, 2, '#f59e0b'], [8, -6, '#e2e8f0'], [12, 8, '#f59e0b'], [-2, -8, '#e2e8f0']]) { c.beginPath(); c.moveTo(p[0], p[1] - 4); c.lineTo(p[0] + 3, p[1]); c.lineTo(p[0], p[1] + 4); c.lineTo(p[0] - 3, p[1]); c.closePath(); c.fillStyle = p[2]; c.fill(); c.lineWidth = 1.5; c.stroke(); }
  }
  function plant(c, seed, alive) {
    if (!alive) { ellipse(c, 0, 2, 8, 4, '#5b4a2a', null); return; }
    c.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(Math.cos(a) * 12, Math.sin(a) * 12, Math.cos(a) * 22, Math.sin(a) * 18 + 2);
      c.lineWidth = 7; c.strokeStyle = OL; c.stroke(); c.lineWidth = 4; c.strokeStyle = i % 2 ? '#65a30d' : '#84cc16'; c.stroke();
    }
  }
  function wreck(c, alive) {
    ellipse(c, 0, 10, 42, 10, 'rgba(0,0,0,0.25)', null);
    c.save(); c.rotate(-0.25);
    c.beginPath(); c.moveTo(-40, -8); c.lineTo(32, -12); c.lineTo(44, 0); c.lineTo(30, 12); c.lineTo(-36, 10); c.closePath();
    c.fillStyle = alive ? '#7a4b2b' : '#5a3a22'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OL; c.stroke();
    c.beginPath(); c.moveTo(-30, 0); c.lineTo(34, -2); c.strokeStyle = '#4a2c17'; c.lineWidth = 2; c.stroke();
    if (alive) { rrect(c, -6, -24, 6, 30, 1, '#8a5a2b', OL, 2.5); circle(c, 16, 2, 4, '#9aa7b8', OL, 2); circle(c, -18, 3, 3, '#9aa7b8', OL, 2); }
    c.restore();
  }
  function bush(c, r, seed, alpha) {
    c.save(); c.globalAlpha *= alpha;
    const k = r / 40;
    const blobs = [[-16, 4, 20], [16, 6, 19], [0, -8, 22], [0, 10, 18]];
    c.beginPath(); for (const b of blobs) { c.moveTo(b[0] * k + b[2] * k, b[1] * k); c.arc(b[0] * k, b[1] * k, b[2] * k, 0, Math.PI * 2); }
    c.lineWidth = 5; c.strokeStyle = OL; c.stroke(); c.fillStyle = '#1f6f2a'; c.fill();
    c.fillStyle = '#2e8b3a'; for (const b of blobs) { c.beginPath(); c.arc(b[0] * k - 3, b[1] * k - 4, b[2] * k * 0.6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#4caf50'; for (let i = 0; i < 5; i++) { const a = seed + i * 1.7; c.beginPath(); c.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4 - 4, 3.5, 2, a, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function crate(c, opened) {
    ellipse(c, 0, 14, 24, 7, 'rgba(0,0,0,0.25)', null);
    rrect(c, -20, -18, 40, 32, 3, '#a8692e');
    if (opened) { rrect(c, -16, -14, 32, 12, 2, '#3d2610', OL, 2); }
    else {
      c.beginPath(); c.moveTo(-20, -2); c.lineTo(20, -2); c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
      rrect(c, -4, -6, 8, 8, 1.5, '#ffb000', OL, 2);
    }
    for (const p of [[-20, -18], [16, -18], [-20, 10], [16, 10]]) rrect(c, p[0], p[1], 4, 4, 1, '#9aa7b8', OL, 1.5);
  }
  function mine(c, t) {
    ellipse(c, 0, 0, 11, 7, '#4b5266', OL, 2.5);
    circle(c, 0, -2, 3, (t * 2 % 1) < 0.5 ? '#ef4444' : '#7f1d1d', OL, 1.5);
  }
  // Constructions : vue de 3/4 (dessus plus clair + face avant)
  function tile(c, type, T, hpf, mine, t) {
    const H = 18;
    if (type === 'campfire') {
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ellipse(c, T / 2 + Math.cos(a) * 16, T / 2 + Math.sin(a) * 11, 6, 5, '#8d95a5', OL, 2); }
      c.save(); c.translate(T / 2, T / 2);
      rrect(c, -14, -3, 28, 6, 2, '#6b4224', OL, 2); c.rotate(0.9); rrect(c, -14, -3, 28, 6, 2, '#6b4224', OL, 2); c.rotate(-1.8); rrect(c, -14, -3, 28, 6, 2, '#6b4224', OL, 2);
      c.restore();
      const f = Math.sin(t * 12) * 2;
      c.beginPath(); c.moveTo(T / 2 - 10, T / 2); c.quadraticCurveTo(T / 2 - 12, T / 2 - 16, T / 2 + f, T / 2 - 28); c.quadraticCurveTo(T / 2 + 12, T / 2 - 14, T / 2 + 10, T / 2); c.closePath();
      c.fillStyle = '#f97316'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
      c.beginPath(); c.moveTo(T / 2 - 5, T / 2); c.quadraticCurveTo(T / 2 - 5, T / 2 - 9, T / 2 - f, T / 2 - 17); c.quadraticCurveTo(T / 2 + 6, T / 2 - 8, T / 2 + 5, T / 2); c.closePath(); c.fillStyle = '#fde047'; c.fill();
      return;
    }
    const cols = type === 'wall_stone' ? ['#9aa3b5', '#6f788a'] : type === 'door' ? ['#a0693a', '#734a26'] : ['#b07a45', '#7d5330'];
    // face avant
    rrect(c, 0, T - H, T, H, 2, cols[1]);
    // dessus
    rrect(c, 0, -H, T, T, 3, cols[0]);
    c.lineWidth = 2; c.strokeStyle = 'rgba(11,14,22,0.55)';
    if (type === 'wall_stone') {
      c.beginPath();
      for (let r = 1; r < 4; r++) { c.moveTo(3, -H + r * T / 4); c.lineTo(T - 3, -H + r * T / 4); }
      for (let r = 0; r < 4; r++) for (let k = 1; k < 3; k++) { const x = k * T / 3 + (r % 2 ? T / 6 : 0); c.moveTo(x, -H + r * T / 4 + 2); c.lineTo(x, -H + (r + 1) * T / 4 - 2); }
      c.stroke();
    } else {
      c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(k * T / 4, -H + 3); c.lineTo(k * T / 4, -H + T - 3); } c.stroke();
      c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(k * T / 4, T - H + 3); c.lineTo(k * T / 4, T - 3); } c.stroke();
    }
    if (type === 'door') {
      rrect(c, T * 0.2, -H + 6, T * 0.6, T - 12, 4, '#5a3720', OL, 2.5);
      circle(c, T * 0.68, -H + T / 2, 3.5, '#ffb000', OL, 1.5);
    }
    if (mine) { c.lineWidth = 3; c.strokeStyle = 'rgba(74,222,128,0.85)'; c.strokeRect(2, -H + 2, T - 4, T - 4); }
    if (hpf < 0.6) {
      c.strokeStyle = OL; c.lineWidth = 2; c.beginPath();
      c.moveTo(T * 0.2, -H + 10); c.lineTo(T * 0.38, -H + 24); c.lineTo(T * 0.3, -H + 34);
      if (hpf < 0.3) { c.moveTo(T * 0.7, -H + 8); c.lineTo(T * 0.6, -H + 26); c.lineTo(T * 0.78, -H + 40); }
      c.stroke();
    }
  }
  function roof(c, T, mine) {
    rrect(c, -4, -26, T + 8, T + 8, 4, '#b8862e');
    c.strokeStyle = 'rgba(11,14,22,0.45)'; c.lineWidth = 2; c.beginPath();
    for (let k = 1; k < 5; k++) { c.moveTo(-2, -26 + k * (T + 8) / 5); c.lineTo(T + 2, -26 + k * (T + 8) / 5 - 3); }
    c.stroke();
    if (mine) { c.lineWidth = 3; c.strokeStyle = 'rgba(74,222,128,0.85)'; c.strokeRect(0, -22, T, T); }
  }

  // ---------- Icônes pour l'interface ----------
  function icon(c, name, s) {
    c.save(); c.scale(s / 64, s / 64); c.translate(32, 32);
    c.lineJoin = 'round'; c.lineCap = 'round';
    switch (name) {
      case 'fists': circle(c, -8, 4, 11, '#eebf95'); circle(c, 10, -2, 11, '#eebf95'); break;
      case 'sword': c.rotate(-0.8); c.translate(-26, 0); weapon(c, 'sword', 9); break;
      case 'bow': c.rotate(-0.8); c.translate(-6, 0); weapon(c, 'bow', 0); break;
      case 'slingshot': c.rotate(-0.7); c.translate(-14, 0); c.scale(1.3, 1.3); weapon(c, 'slingshot', 9); break;
      case 'pistol': c.translate(-16, -2); c.scale(1.3, 1.3); weapon(c, 'pistol', 9); break;
      case 'sniper': c.rotate(-0.5); c.translate(-28, 0); weapon(c, 'sniper', 9); break;
      case 'bomb': c.translate(-10, 4); c.scale(1.6, 1.6); weapon(c, 'bomb', 9); break;
      case 'trap': c.scale(1.6, 1.6); c.translate(-9, 0); weapon(c, 'trap', 9); break;
      case 'wood': c.rotate(-0.4); rrect(c, -22, -8, 44, 16, 6, '#8a5a2b'); ellipse(c, 20, 0, 6, 8, '#c9965f', OL, 2.5); break;
      case 'stone': c.translate(0, -4); c.scale(0.8, 0.8); rock(c, 3, false); break;
      case 'fiber': c.translate(0, 10); c.scale(1.2, 1.2); plant(c, 1, true); break;
      case 'metal': for (const [x, y] of [[-10, 6], [8, 8], [-1, -6]]) { c.beginPath(); c.moveTo(x - 12, y + 6); c.lineTo(x - 6, y - 6); c.lineTo(x + 12, y - 6); c.lineTo(x + 6, y + 6); c.closePath(); c.fillStyle = '#b8c3d1'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); } break;
      case 'wall_wood': case 'wall_stone': case 'door': c.translate(-22, -16); c.scale(0.7, 0.7); tile(c, name, 64, 1, false, 0); break;
      case 'roof': c.translate(-20, -10); c.scale(0.65, 0.65); roof(c, 64, false); break;
      case 'campfire': c.translate(-24, -18); c.scale(0.75, 0.75); tile(c, 'campfire', 64, 1, false, 0.3); break;
    }
    c.restore();
  }

  window.DRAW = { OL, SKINS, HAIRC, OUTFITS, TEAM_COLORS, circle, ellipse, rrect, shade, character, weapon, animal, trunk, canopy, rock, plant, wreck, bush, crate, mine, tile, roof, icon };
})();
