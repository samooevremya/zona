/* ===================== состояние ===================== */
let S = null, P = null, ents = [], decals = [], parts = [], tracers = [], flashes = [], bolts = [], nades = [], crows = [], anoms = [], arts = [];
let armyAngry = false, nextId = 1, spawnT = 0, fogT = 0, saveT = 0, warnT = 0;
const cnt = id => S.inv[id] || 0;
const has = id => cnt(id) > 0;
const beltCount = id => S.belt.filter(x => x === id).length;
function give(id, n) { S.inv[id] = cnt(id) + (n || 1); }
function take(id, n) {
  S.inv[id] = Math.max(0, cnt(id) - (n || 1)); if (!S.inv[id]) delete S.inv[id];
  while (beltCount(id) > cnt(id)) S.belt.splice(S.belt.indexOf(id), 1);
  if (WP[id] && S.weapon === id && !has(id)) S.weapon = 'knife';
}
const weight = () => Math.round(Object.keys(S.inv).reduce((a, id) => a + (ITEMS[id] ? ITEMS[id].w : 0) * S.inv[id], 0) * 10) / 10;
const MAXW = 50;
const hour = () => (S.min / 60) % 24;
const night = () => { const h = hour(); return h >= 21 || h < 5; };
function darkness() {
  const h = hour();
  if (h >= 21 || h < 4.5) return 0.8;
  if (h < 6.5) return 0.8 * (1 - (h - 4.5) / 2);
  if (h >= 19) return 0.8 * (h - 19) / 2;
  return 0;
}
function clockStr(m) { m = Math.floor(m === undefined ? S.min : m); const p = x => (x < 10 ? '0' : '') + x; return p(Math.floor(m / 60) % 24) + ':' + p(m % 60) + ' · день ' + (Math.floor(m / 1440) + 1); }
const def = () => (ITEMS[S.armor] ? ITEMS[S.armor].armor : 0) + (beltCount('art_bengal') ? 0.05 : 0);
const score = () => S.stats.kM + S.stats.kS * 2 + S.stats.q * 10 + S.stats.art * 5;
const rankOf = sc => sc < 15 ? 0 : sc < 45 ? 1 : sc < 90 ? 2 : 3;

let MSGS = [];
function msg(t, k) { MSGS.push({ t: t, k: k || '', life: 6 }); if (MSGS.length > 5) MSGS.shift(); }
function news(t, ping) { S.news.push({ t: S.min, x: t }); if (S.news.length > 60) S.news.shift(); if (ping) { msg('КПК: ' + t, 'pda'); play('pda'); } }

function freshS() {
  return { v: 1, money: 0, inv: { ar_jacket: 1, medkit: 1, bandage: 2, bread: 1 }, weapon: 'knife', armor: 'ar_jacket', belt: [], mag: {},
    q: { flash: 0, medusa: 0, pack: 0 }, rep: 0, stats: { kS: 0, kM: 0, q: 0, art: 0 }, news: [], flags: {}, dead: {}, min: 420,
    fog: '', mapVersion: MAP_VERSION, trackedQuestId: null, x: locPt('sid', 'spawn').x, y: locPt('sid', 'spawn').y, hp: 100, rad: 0, q2: { fox: 0, tolik: 0 } };
}

/* ===================== жители Кордона ===================== */
// Места заданы в координатах исходной деревни. Жители и декор вместе переносятся в большой Кордон.
const YARD_SEATS = [
  { sid: 'l1', x: 29.00, y: 83.38, wpn: 'w_pm', log: ['logs', -0.28, -0.32, -0.73] },
  { sid: 'l2', x: 31.05, y: 82.60, wpn: 'w_obrez', log: ['bench', 0.16, -0.36, 0.24] },
  { sid: 'l3', x: 32.15, y: 84.45, wpn: 'w_pm' },
  { sid: 'l4', x: 29.82, y: 86.33, wpn: 'w_pm', log: ['logs', -0.15, 0.35, 0.43] }
].map(s => ({ ...s, x: s.x + CAMP_TILE[0] - 30.5, y: s.y + CAMP_TILE[1] - 84.5 }));
const NPCDEF = [
  { sid: 'sid', fac: 'trader', name: 'Сидорович', x: 126.5, y: 4.6, wpn: 'knife', hp: 99999, rank: 2, stay: 1, named: 1, ang: Math.PI / 2 },
  { sid: 'wolf', fac: 'loner', name: 'Волк', x: 27.5, y: 79, wpn: 'w_obrez', hp: 130, rank: 2, stay: 1, named: 1 },
  { sid: 'petr', fac: 'loner', name: 'Петруха', x: 74, y: 63.5, wpn: 'w_pm', hp: 150, rank: 1, stay: 1, named: 1 },
  { sid: 'petr2', fac: 'loner', name: 'Хомяк', x: 74, y: 79, wpn: 'w_obrez', hp: 130, rank: 0, stay: 1, named: 1 },
  { sid: 'shust', fac: 'loner', name: 'Шустрый', x: 94.5, y: 64.6, wpn: 'knife', hp: 60, rank: 0, captive: 1, named: 1 },
  { sid: 'tolik', fac: 'loner', name: 'Толик', x: 58.6, y: 66.4, wpn: 'w_pm', hp: 70, rank: 0, captive: 1, wounded: 1, named: 1 },
  { sid: 'fox', fac: 'loner', name: 'Лис', x: 88.5, y: 14.5, wpn: 'w_obrez', hp: 110, rank: 1, captive: 1, wounded: 1, named: 1, stay: 1 },
  { sid: 'b1', fac: 'bandit', x: 90, y: 71, wpn: 'w_pm', stay: 1 }, { sid: 'b2', fac: 'bandit', x: 93, y: 72.5, wpn: 'w_obrez' },
  { sid: 'b3', fac: 'bandit', x: 101, y: 72, wpn: 'w_pm' }, { sid: 'b4', fac: 'bandit', x: 104, y: 79, wpn: 'w_pm' },
  { sid: 'b5', fac: 'bandit', x: 99, y: 64.5, wpn: 'w_obrez' }, { sid: 'b6', fac: 'bandit', x: 93, y: 78.5, wpn: 'w_pm' },
  { sid: 'boss', fac: 'bandit', name: 'Сиплый', x: 103, y: 64.6, wpn: 'w_aksu', hp: 140, rank: 2, named: 1 },
  { sid: 'b7', fac: 'bandit', x: 16, y: 11, wpn: 'w_pm' }, { sid: 'b8', fac: 'bandit', x: 20, y: 12.5, wpn: 'w_obrez' }, { sid: 'b9', fac: 'bandit', x: 30, y: 12.5, wpn: 'w_pm' },
  { sid: 'a1', fac: 'army', name: 'Рядовой Ткач', x: 60.5, y: 33.4, wpn: 'w_aksu', guard: 'bridge' },
  { sid: 'a2', fac: 'army', name: 'Рядовой Мазур', x: 66.5, y: 33.4, wpn: 'w_aksu', guard: 'bridge' },
  { sid: 'a3', fac: 'army', name: 'Прапорщик', x: 63.5, y: 34.2, wpn: 'w_aksu', guard: 'bridge', rank: 1 },
  { sid: 'a4', fac: 'army', name: 'Часовой', x: 60.5, y: 102.6, wpn: 'w_aksu', guard: 'south' },
  { sid: 'a5', fac: 'army', name: 'Часовой', x: 68.5, y: 102.6, wpn: 'w_aksu', guard: 'south' },
  ...YARD_SEATS.map(({ sid, x, y, wpn }) => ({ sid, x, y, wpn, fac: 'loner', sit: 1 })),
  { sid: 'l5', fac: 'loner', x: 46, y: 90, wpn: 'w_pm' }, { sid: 'l6', fac: 'loner', x: 52, y: 74, wpn: 'w_obrez' },
  { sid: 'l7', fac: 'loner', x: 45, y: 20.6, wpn: 'w_obrez', sit: 1, fire: 2 }, { sid: 'l8', fac: 'loner', x: 48, y: 22.4, wpn: 'w_pm', sit: 1, fire: 2 }
];
const DOGDEF = [
  { sid: 'd1', pack: 'lair', x: 9, y: 41 }, { sid: 'd2', pack: 'lair', x: 11, y: 42 }, { sid: 'd3', pack: 'lair', x: 10, y: 44 }, { sid: 'd4', pack: 'lair', x: 12.5, y: 43 },
  { sid: 'f1', pack: 'north', x: 70, y: 20 }, { sid: 'f2', pack: 'north', x: 72, y: 21 }, { sid: 'f3', pack: 'north', x: 73.5, y: 19.5 }
];
function mkBoar(d) {
  return { id: nextId++, kind: 'boar', sid: d.sid, fac: 'mutant', name: 'Кабан', pack: d.pack, x: d.x * T, y: d.y * T, r: 14, hp: 130, maxhp: 130,
    ang: rnd(-3, 3), alive: 1, cool: 0, think: Math.random() * 0.3, home: { x: d.x * T, y: d.y * T }, kx: 0, ky: 0, flash: 0, step: 0, idleT: rnd(1, 4), state: 'idle', st: 0 };
}
/* кабан: замечает, роет землю, бросается рывком по прямой; после рывка оглушён — уходи в сторону */
function aiBoar(e, dt) {
  e.cool -= dt; e.think -= dt; e.st -= dt;
  if (e.think <= 0) {
    e.think = 0.3;
    if (!e.tgt || !e.tgt.alive || dE(e, e.tgt) > 560) {
      e.tgt = null;
      for (const o of ents) if (o.alive && o.fac !== 'mutant' && !o.captive && dE(e, o) < 300 && los(e.x, e.y, o.x, o.y)) { e.tgt = o; break; }
    }
  }
  const t = e.tgt;
  if (!t) { e.state = 'idle'; e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rnd(2, 6); const a = rnd(0, 6.28); e.wander = { x: e.home.x + Math.cos(a) * rnd(20, 90), y: e.home.y + Math.sin(a) * rnd(20, 90) }; } if (e.wander) { steer(e, e.wander.x, e.wander.y, 45, dt); e.ang += angD(e.ang, Math.atan2(e.wander.y - e.y, e.wander.x - e.x)) * dt * 3; if (dst(e.x, e.y, e.wander.x, e.wander.y) < 10) e.wander = null; } return; }
  const want = Math.atan2(t.y - e.y, t.x - e.x);
  if (e.state === 'idle' || e.state === 'stalk') {
    e.state = 'stalk'; e.ang += angD(e.ang, want) * Math.min(1, dt * 4);
    if (dE(e, t) > 240) goTo(e, t.x, t.y, 90, dt);
    else if (e.cool <= 0 && los(e.x, e.y, t.x, t.y)) { e.state = 'wind'; e.st = 0.6; play('dog', e.x, e.y, 0.7); }
    else steer(e, e.x + Math.cos(want + 1.57) * 40, e.y + Math.sin(want + 1.57) * 40, 50, dt);
  } else if (e.state === 'wind') {
    e.ang += angD(e.ang, want) * Math.min(1, dt * 6);
    if (chance(dt * 12)) parts.push({ x: e.x - Math.cos(e.ang) * 10, y: e.y - Math.sin(e.ang) * 10, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.4, c: '#5a4a34', s: 2 });
    if (e.st <= 0) { e.state = 'charge'; e.st = 0.85; e.hit = 0; }
  } else if (e.state === 'charge') {
    const sp = 330 * dt, ox = e.x, oy = e.y;
    moveE(e, Math.cos(e.ang) * sp, Math.sin(e.ang) * sp); e.step += sp;
    if (!e.hit) for (const o of ents) { if (o.alive && o !== e && o.fac !== 'mutant' && dE(o, e) < e.r + o.r + 4) { e.hit = 1; hurt(o, rnd(24, 34), e, e.ang); o.kx += Math.cos(e.ang) * 320; o.ky += Math.sin(e.ang) * 320; } }
    if (e.st <= 0 || dst(ox, oy, e.x, e.y) < sp * 0.3) { e.state = 'stun'; e.st = 1.1; e.cool = 1.6; }
  } else if (e.state === 'stun') { if (e.st <= 0) e.state = 'stalk'; }
}
const FAC_N = { loner: 'Одиночки', bandit: 'Бандиты', army: 'Военные', mutant: 'Мутанты', trader: 'Торговцы', player: 'Одиночки' };
const nameI = { loner: 0, bandit: 3 };
function rollInv(fac) {
  const inv = {};
  ['bandage', 'sausage', 'bread', 'vodka', 'cans'].forEach(i => { if (chance(0.3)) inv[i] = 1; });
  if (chance(fac === 'army' ? 0.5 : 0.25)) inv.medkit = 1;
  if (chance(0.15)) inv.antirad = 1;
  return inv;
}
function mkHuman(d) {
  const W = WP[d.wpn || 'w_pm'];
  const base = d.fac === 'army' ? 150 : d.fac === 'bandit' ? 70 : 85;
  const rank = d.rank !== undefined ? d.rank : (Math.random() < 0.55 ? 0 : Math.random() < 0.75 ? 1 : 2);
  const names = d.fac === 'bandit' ? BANDIT_NAMES : LONER_NAMES;
  const e = { id: nextId++, kind: 'human', sid: d.sid, fac: d.fac, name: d.name || names[(nameI[d.fac === 'bandit' ? 'bandit' : 'loner']++) % names.length],
    x: d.x * T, y: d.y * T, r: 11, hp: d.hp || base + rank * 10, ang: d.ang !== undefined ? d.ang : rnd(-3, 3), alive: 1,
    wpn: d.wpn || 'w_pm', mag: W.mag || 0, cool: 0, reload: 0, think: Math.random() * 0.3, react: 0.5, mem: 0,
    home: { x: d.x * T, y: d.y * T }, sit: d.sit, stay: d.stay, guard: d.guard, captive: d.captive, named: d.named, rank: rank,
    money: (d.fac === 'army' ? ri(100, 300) : ri(50, 300)) + rank * 120, inv: rollInv(d.fac), kx: 0, ky: 0, flash: 0, step: 0,
    wounded: d.wounded, fireRef: d.fire === 2 ? FIRE2 : FIRE,
    seed: Math.floor(Math.random() * 1e6), path: null, pi: 0, idleT: rnd(1, 5), trip: null, score: [ri(2, 14), ri(15, 44), ri(45, 80)][Math.min(rank, 2)] };
  e.maxhp = e.hp;
  if (e.sit) e.ang = Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x);
  if (e.guard === 'bridge') e.ang = Math.PI / 2;
  if (e.guard === 'south') e.ang = -Math.PI / 2;
  return e;
}
function mkDog(d) {
  return { id: nextId++, kind: 'dog', sid: d.sid, fac: 'mutant', name: 'Слепой пёс', pack: d.pack, x: d.x * T, y: d.y * T, r: 10, hp: 38, maxhp: 38,
    ang: rnd(-3, 3), alive: 1, cool: 0, think: Math.random() * 0.3, home: { x: d.x * T, y: d.y * T }, kx: 0, ky: 0, flash: 0, step: 0, idleT: rnd(1, 4), barkT: rnd(3, 12) };
}
function mkPlayer() {
  return { id: 0, kind: 'human', fac: 'player', name: 'Меченый', x: S.x, y: S.y, r: 11, hp: S.hp, maxhp: 100, ang: -Math.PI / 2, alive: 1,
    cool: 0, reload: 0, bloom: 0, st: 100, kx: 0, ky: 0, flash: 0, step: 0, medT: 0, seed: 7, rank: 0 };
}
function spawnWorld() {
  ents = []; decals = []; parts = []; tracers = []; flashes = []; bolts = []; nades = []; crows = [];
  for (let i = objs.length - 1; i >= 0; i--) if (!objs[i].static) objs.splice(i, 1);
  objs.forEach(o => { if (o.stash) o.looted = !!S.flags['st_' + o.stash]; });
  armyAngry = !!S.flags.armyAngry;
  const bar = objs.find(o => o.key === 'bar'); if (bar) { bar.solid = S.flags.bridgePaid ? 0 : 1; buildGrids(); }
  S.q2 = S.q2 || { fox: 0, tolik: 0 };
  P = mkPlayer(); ents.push(P);
  NPCDEF.forEach(d => {
    if (S.dead[d.sid]) return;
    const e = mkHuman(d);
    if (d.sid === 'shust' && S.flags.shustFree) { const p = locPt('village', 'shust'); e.captive = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'tolik' && S.flags.tolikUp) { const p = locPt('village', 'tolik'); e.captive = e.wounded = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'fox' && S.flags.foxUp) { e.captive = e.wounded = 0; }
    if ((d.sid === 'petr' || d.sid === 'petr2') && S.flags.atpClear) { const p = locPt('atp', d.sid); e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (S.flags.angry && S.flags.angry[d.sid]) e.angry = 1;
    ents.push(e);
  });
  DOGDEF.forEach(d => { if (!S.dead[d.sid]) ents.push(mkDog(d)); });
  rcSpawnObjs();
  boarDefs().forEach(d => { if (!S.dead[d.sid]) ents.push(mkBoar(Object.assign({ pack: 'boar' }, d))); });
  anoms = ANOM0.map(a => Object.assign({}, a, { cd: 0, reveal: 0, fx: 0, arc: 0 }));
  arts = ARTS0.filter(a => !S.flags['art_' + a.key]).map(a => Object.assign({}, a));
}
const byS = sid => ents.find(e => e.sid === sid && e.alive);

/* ===================== отношения ===================== */
function hostile(a, b) {
  if (a === b || !a.alive || !b.alive || a.captive || b.captive) return false;
  const fa = a.fac, fb = b.fac;
  if (fa === 'trader' || fb === 'trader') return false;
  if (fa === 'mutant' || fb === 'mutant') return fa !== fb;
  if (fa === fb) return false;
  const pair = (x, y) => (fa === x && fb === y) || (fa === y && fb === x);
  if (pair('bandit', 'loner') || pair('bandit', 'player') || pair('bandit', 'army')) return true;
  if (pair('army', 'player')) { const s = fa === 'army' ? a : b; return armyAngry || !!s.angry; }
  if (pair('loner', 'player')) { const l = fa === 'loner' ? a : b; return S.rep <= -30 || !!l.angry; }
  return false;
}
function playerRelation(e) {
  if (hostile(e, P)) return 'enemy';
  if (e.fac !== 'loner') return 'neutral';
  if (e.follow || (e.uid && S.flags['sosFriend_' + e.uid])) return 'friend';
  if ((e.sid === 'tolik' && S.flags.tolikUp) || (e.sid === 'fox' && S.flags.foxUp) ||
      (e.sid === 'shust' && S.flags.shustFree) || (e.sid === 'wolf' && S.q.pack === 3)) return 'friend';
  return 'neutral';
}
function attWord(e) {
  const rel = playerRelation(e);
  if (rel === 'enemy') return 'враг';
  if (rel === 'friend') return 'друг';
  return e.fac === 'loner' && S.rep < 0 ? 'не доверяет' : 'нейтрал';
}
function anger(e) {
  if (e.fac === 'loner' && !e.angry) {
    ents.forEach(o => { if (o.fac === 'loner' && o.alive && !o.captive && dE(o, e) < 450 && los(o.x, o.y, e.x, e.y)) { o.angry = 1; markAngry(o); } });
    e.angry = 1; markAngry(e);
    S.rep -= 10;
    msg('Ты напал на своего. Одиночки этого не простят.', 'bad');
  }
  if (e.fac === 'army' && !armyAngry) { armyAngry = true; S.flags.armyAngry = 1; msg('Военные открывают огонь!', 'bad'); }
}
function markAngry(e) {
  const id = e.sid || e.uid;
  if (id) { S.flags.angry = S.flags.angry || {}; S.flags.angry[id] = 1; }
}

/* ===================== движение и столкновения ===================== */
function pushOut(e, rx, ry, rw, rh) {
  const nx = clamp(e.x, rx, rx + rw), ny = clamp(e.y, ry, ry + rh);
  let dx = e.x - nx, dy = e.y - ny; const d2 = dx * dx + dy * dy;
  if (d2 >= e.r * e.r) return;
  if (d2 > 0.0001) { const d = Math.sqrt(d2); e.x += dx / d * (e.r - d); e.y += dy / d * (e.r - d); }
  else {
    const l = e.x - rx, r = rx + rw - e.x, t = e.y - ry, b = ry + rh - e.y, m = Math.min(l, r, t, b);
    if (m === l) e.x = rx - e.r; else if (m === r) e.x = rx + rw + e.r; else if (m === t) e.y = ry - e.r; else e.y = ry + rh + e.r;
  }
}
function collide(e) {
  const x0 = Math.floor((e.x - e.r) / T), x1 = Math.floor((e.x + e.r) / T), y0 = Math.floor((e.y - e.r) / T), y1 = Math.floor((e.y + e.r) / T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!inb(x, y) || SOLID[map[y * MW + x]]) pushOut(e, x * T, y * T, T, T);
  const hop = e.jumpT > 0;   // в прыжке низкие препятствия не держат
  for (let i = 0; i < objs.length; i++) { const o = objs[i]; if (o.solid && !(hop && LOW_K.has(o.k)) && e.x + e.r > o.x && e.x - e.r < o.x + o.w && e.y + e.r > o.y && e.y - e.r < o.y + o.h) pushOut(e, o.x, o.y, o.w, o.h); }
  e.x = clamp(e.x, e.r, WW - e.r); e.y = clamp(e.y, e.r, WH - e.r);
}
function moveE(e, dx, dy) { e.x += dx; e.y += dy; collide(e); collide(e); }
const swampAt = (x, y) => tAt(Math.floor(x / T), Math.floor(y / T)) === SW;
function anomNear(x, y, pad) { for (const a of anoms) if (dst(x, y, a.x, a.y) < a.r + pad) return a; return null; }
function steer(e, tx, ty, speed, dt) {
  let a = Math.atan2(ty - e.y, tx - e.x);
  const sp = speed * (swampAt(e.x, e.y) ? 0.55 : 1) * dt;
  for (const off of [0, 0.6, -0.6, 1.2, -1.2]) {
    const nx = e.x + Math.cos(a + off) * sp * 3, ny = e.y + Math.sin(a + off) * sp * 3;
    if (!anomNear(nx, ny, e.r + 4)) { a += off; break; }
  }
  const ox = e.x, oy = e.y;
  moveE(e, Math.cos(a) * sp, Math.sin(a) * sp);
  const moved = dst(ox, oy, e.x, e.y);
  e.step += moved;
  e.stuck = moved < sp * 0.3 ? (e.stuck || 0) + dt : 0;
  return moved;
}
function goTo(e, tx, ty, speed, dt) {
  if (e.path && e.goal && dst(e.goal.x, e.goal.y, tx, ty) > 48) e.path = null;
  if (!e.path) {
    if (los(e.x, e.y, tx, ty) && dst(e.x, e.y, tx, ty) < 260 && !(e.stuck > 0.6)) {
      steer(e, tx, ty, speed, dt); e.ang += angD(e.ang, Math.atan2(ty - e.y, tx - e.x)) * Math.min(1, dt * 6);
      if (e.stuck > 0.6) { e.path = findPath(e.x, e.y, tx, ty); e.pi = 0; e.goal = { x: tx, y: ty }; e.stuck = 0; }
      return dst(e.x, e.y, tx, ty);
    }
    e.path = findPath(e.x, e.y, tx, ty); e.pi = 0; e.goal = { x: tx, y: ty };
    if (!e.path) { steer(e, tx, ty, speed, dt); return dst(e.x, e.y, tx, ty); }
  }
  const p = e.path[e.pi];
  if (!p) { e.path = null; steer(e, tx, ty, speed, dt); return dst(e.x, e.y, tx, ty); }
  steer(e, p.x, p.y, speed, dt);
  e.ang += angD(e.ang, Math.atan2(p.y - e.y, p.x - e.x)) * Math.min(1, dt * 6);
  if (dst(e.x, e.y, p.x, p.y) < 12) { e.pi++; if (e.pi >= e.path.length) e.path = null; }
  if (e.stuck > 1.5) { e.path = null; e.stuck = 0; }
  return dst(e.x, e.y, tx, ty);
}

/* ===================== стрельба ===================== */
/* ===== баллистика (G7): расчёт не зависит от графики =====
   Луч всегда идёт из центра стрелка; препятствия проверяются непрерывно по клеткам (DDA) с нулевой точки,
   поэтому ствол, «высунутый» за стену, не переносит начало расчёта за неё. Дальность считается от
   условного дула BALL_OFF = r + 8 (прежняя процедурная точка), одинаково при любых выключателях графики.
   Визуальное дуло (muzzlePoint) используется только для трассера и вспышки. */
function rayWall(sx, sy, ca, sa, maxT) {
  let tx = Math.floor(sx / T), ty = Math.floor(sy / T);
  if (!inb(tx, ty) || opq[ty * MW + tx]) return 0;
  const stX = ca > 0 ? 1 : -1, stY = sa > 0 ? 1 : -1;
  let tMX = ca !== 0 ? ((tx + (ca > 0 ? 1 : 0)) * T - sx) / ca : Infinity, tMY = sa !== 0 ? ((ty + (sa > 0 ? 1 : 0)) * T - sy) / sa : Infinity;
  const dX = ca !== 0 ? T / Math.abs(ca) : Infinity, dY = sa !== 0 ? T / Math.abs(sa) : Infinity;
  for (;;) {
    let t;
    if (tMX < tMY) { tx += stX; t = tMX; tMX += dX; } else { ty += stY; t = tMY; tMY += dY; }   // равенство — угол клетки: проверяются обе соседние
    if (t > maxT) return maxT;
    if (!inb(tx, ty) || opq[ty * MW + tx]) return t;
  }
}
/* пересечение луча (из точки внутри/снаружи) с кругом: вход ≥0 либо 0, если начало внутри; null — мимо */
function rayCircle(sx, sy, ca, sa, cx, cy, rr) {
  const vx = cx - sx, vy = cy - sy, tc = vx * ca + vy * sa, d2 = vx * vx + vy * vy - tc * tc;
  if (d2 >= rr * rr) return null;
  const th = Math.sqrt(rr * rr - d2);
  if (tc + th < 0) return null;
  return Math.max(0, tc - th);
}
// Высота забора имеет значение в пределах полутора клеток от присевшей фигуры.
const FENCE_REACH = 1.5 * T;
function rayFence(x, y, dx, dy, near, far) {
  let hit = Infinity;
  for (const f of fences) {
    // Интервал луча внутри каждой из двух осевых полос прямоугольника.
    let enter = near, exit = far;
    if (Math.abs(dx) < 1e-9) {
      if (x < f.x || x > f.x + f.w) continue;
    } else {
      const a = (f.x - x) / dx, b = (f.x + f.w - x) / dx;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < f.y || y > f.y + f.h) continue;
    } else {
      const a = (f.y - y) / dy, b = (f.y + f.h - y) / dy;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    if (enter <= exit) hit = Math.min(hit, enter);
  }
  return hit;
}
function seesActor(observer, target) {
  if (!los(observer.x, observer.y, target.x, target.y)) return false;
  if (!target.crouch) return true;
  const dx = observer.x - target.x, dy = observer.y - target.y, d = Math.hypot(dx, dy);
  return !d || rayFence(target.x, target.y, dx / d, dy / d, 0, Math.min(d, FENCE_REACH)) === Infinity;
}
function shotBarrier(sh, ca, sa, reach) {
  const wall = rayWall(sh.x, sh.y, ca, sa, reach);
  return sh.crouch ? Math.min(wall, rayFence(sh.x, sh.y, ca, sa, 0, Math.min(wall, FENCE_REACH))) : wall;
}
const ballOff = sh => (sh.r || 11) + 8;
function shotTrace(sh, a, W) {   // чистая функция исхода одного луча: {t, best, wall}
  const ca = Math.cos(a), sa = Math.sin(a), reach = W.range + ballOff(sh);
  const wallT = shotBarrier(sh, ca, sa, reach);
  let best = null, bt = wallT;
  const passFriends = sh === P && combatNear();
  for (const e of ents) {
    if (!e.alive || e === sh) continue;
    if (passFriends && !hostile(P, e)) continue;
    const t = rayCircle(sh.x, sh.y, ca, sa, e.x, e.y, e.r + (e.captive ? -4 : 0));
    if (t !== null && t <= bt) { best = e; bt = t; }
  }
  if (best && best.crouch) {
    const centerT = (best.x - sh.x) * ca + (best.y - sh.y) * sa;
    const fence = rayFence(sh.x, sh.y, ca, sa, Math.max(0, centerT - FENCE_REACH), bt);
    if (fence <= bt) { bt = fence; best = null; }
  }
  return { t: bt, best: best, wall: !best && bt < reach, ca: ca, sa: sa };
}
function fire(sh, ang, W, spread) {
  const mz = muzzlePoint(sh, ang), n = W.pellets || 1;
  const ca0 = Math.cos(ang), sa0 = Math.sin(ang), mzT = Math.max(0, (mz.x - sh.x) * ca0 + (mz.y - sh.y) * sa0);
  const w0 = shotBarrier(sh, ca0, sa0, mzT + 1), blocked = w0 < mzT;   // ствол упёрся в стену: вспышка у стены, не за ней
  const fx = blocked ? sh.x + ca0 * Math.max(0, w0 - 1) : mz.x, fy = blocked ? sh.y + sa0 * Math.max(0, w0 - 1) : mz.y;
  for (let k = 0; k < n; k++) {
    const a = ang + (Math.random() - 0.5) * 2 * spread, r = shotTrace(sh, a, W), ca = r.ca, sa = r.sa, best = r.best, bt = r.t;
    const ex = sh.x + ca * bt, ey = sh.y + sa * bt;
    if (bt > mzT + 0.5 && !blocked) tracers.push({ x0: mz.x, y0: mz.y, x1: ex, y1: ey, life: 0.07, w: n > 1 ? 1 : 1.6 });
    if (best && coverBlocks(best, sh.x, sh.y) && chance(best === P ? 0.6 : 0.5)) {
      const cx = best.x - ca * 22, cy = best.y - sa * 22;
      if (tracers.length && tracers[tracers.length - 1].x1 === ex) { tracers[tracers.length - 1].x1 = cx; tracers[tracers.length - 1].y1 = cy; }
      for (let i = 0; i < 4; i++) parts.push({ x: cx, y: cy, vx: rnd(-90, 90), vy: rnd(-90, 90), life: rnd(0.15, 0.3), c: '#d8c9a0', s: 1.6 });
    } else if (best) {
      const fall = n > 1 ? clamp(1.3 - Math.max(0, bt - ballOff(sh)) / W.range, 0.3, 1) : 1;
      if (sh === P) { P.hitT = 0.18; if (best.hp - W.dmg * fall <= 0) P.killT = 0.4; }
      hurt(best, W.dmg * fall * rnd(0.85, 1.15), sh, a);
    } else if (r.wall) for (let i = 0; i < 3; i++) parts.push({ x: ex - ca * 1.5, y: ey - sa * 1.5, vx: rnd(-80, 80) - ca * 60, vy: rnd(-80, 80) - sa * 60, life: rnd(0.15, 0.3), c: '#e8d9a0', s: 1.5 });
  }
  flashes.push({ x: fx, y: fy, a: ang, life: 0.06 });
  play(W.snd || 'p', sh.x, sh.y);
  if (sh === P && !W.pellets) play('shell', sh.x, sh.y);
  shake(sh === P ? (W.pellets ? 4 : 1.5) : 0);
  ents.forEach(e => {
    if (e === sh || !e.alive || e === P || e.captive) return;
    const d = dE(e, sh);
    if (d < 620 && hostile(e, sh)) { e.lastSeen = { x: sh.x, y: sh.y }; e.mem = Math.max(e.mem || 0, 5); if (sh === P) e.aw = Math.max(e.aw || 0, d < 320 ? 1 : 0.75); }
  });
}
/* бой рядом: есть враг игрока ближе 650 px, который его видит или видим им */
function combatNear() { for (const e of ents) if (e.alive && e !== P && hostile(P, e) && dE(e, P) < 650) { P.combatT = 3; return true; } return (P.combatT || 0) > 0; }
/* укрытие: присевший за препятствием (стена, дерево, ящик, машина) в стороне стрелка получает часть попаданий в укрытие */
function coverBlocks(t, sx, sy) {
  if (!(t.crouch || t.inCover)) return false;
  const a = Math.atan2(sy - t.y, sx - t.x);
  for (const d of [16, 26, 36]) if (solidPx(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, true)) return true;
  return false;
}
/* линия огня свободна от своих (для НПС) */
function lineClear(sh, t) {
  const a = Math.atan2(t.y - sh.y, t.x - sh.x), ca = Math.cos(a), sa = Math.sin(a), L = dE(sh, t);
  for (const e of ents) {
    if (!e.alive || e === sh || e === t || hostile(sh, e)) continue;
    const vx = e.x - sh.x, vy = e.y - sh.y, k = vx * ca + vy * sa;
    if (k < 0 || k > L) continue;
    const px = vx - ca * k, py = vy - sa * k;
    if (px * px + py * py < (e.r + 6) ** 2) return false;
  }
  return true;
}
function melee(sh, W) {
  let hit = null, bd = 1e9;
  ents.forEach(e => {
    if (!e.alive || e === sh) return;
    const d = dE(e, sh);
    if (d < W.range + e.r + sh.r && Math.abs(angD(sh.ang, Math.atan2(e.y - sh.y, e.x - sh.x))) < 0.9 && d < bd) { hit = e; bd = d; }
  });
  play('knife', sh.x, sh.y);
  const sneak = hit && sh === P && hit.kind === 'human' && hit.tgt !== P && (hit.aw || 0) < 1;
  if (hit) hurt(hit, W.dmg * rnd(0.9, 1.1) * (sneak ? 3 : 1), sh, sh.ang);
}
function hurt(e, dmg, src, ang) {
  if (!e.alive) return;
  if (src && (src === P || src.follow)) {
    e.hitByP = 1;
    if (e.sosFoe && S.sos && S.sos.act && S.sos.act.id === e.sosFoe) S.flags.sosAssist = e.sosFoe;
  }
  if (e === P) {
    dmg *= 1 - def(); hurtFlash = Math.min(0.6, hurtFlash + 0.35); play('hurt'); shake(4);
    if (src && src.x !== undefined) { HURTDIR.push({ a: Math.atan2(src.y - P.y, src.x - P.x), life: 1.2 }); if (HURTDIR.length > 6) HURTDIR.shift(); }
    if (src && src.alive !== undefined && S.bleed < 3 && chance(src.kind === 'dog' ? 0.4 : 0.3 - def())) { S.bleed++; msg(S.bleed > 1 ? 'Сильное кровотечение! Перевяжись.' : 'Кровотечение. Бинт его остановит.', 'bad'); }
  }
  e.hp -= dmg; e.flash = 0.12;
  if (e !== P && e.kind === 'human' && e.hp > 0 && chance(0.35)) callout(e, 'hurt');
  if (ang !== undefined) { e.kx += Math.cos(ang) * 60; e.ky += Math.sin(ang) * 60; }
  const n = Math.min(6, 2 + Math.floor(dmg / 8));
  for (let i = 0; i < n; i++) parts.push({ x: e.x, y: e.y, vx: Math.cos((ang || 0) + rnd(-0.6, 0.6)) * rnd(40, 160), vy: Math.sin((ang || 0) + rnd(-0.6, 0.6)) * rnd(40, 160), life: rnd(0.2, 0.4), c: '#7a1d14', s: 2, blood: 1 });
  if (e !== P && src && src.alive !== undefined) {
    if (src === P && !hostile(e, P) && (e.fac === 'loner' || e.fac === 'army')) anger(e);
    if (hostile(e, src)) { e.tgt = src; e.lastSeen = { x: src.x, y: src.y }; e.mem = 6; e.react = Math.min(e.react, 0.15); }
  }
  if (e.hp <= 0) kill(e, src);
}
function kill(e, src) {
  e.alive = 0; e.hp = 0;
  if (e === P) { deathT = 1.6; play('hurt'); return; }
  if (e.sid) S.dead[e.sid] = 1;
  ents.forEach(o => { if (o.alive && o !== e && o.kind === 'human' && o.fac === e.fac && dE(o, e) < 420) o.morale = (o.morale === undefined ? 1 : o.morale) - 0.3; });
  decals.push({ x: e.x + rnd(-4, 4), y: e.y + rnd(-4, 4), r: rnd(10, 16), a: 0.75 });
  if (decals.length > 140) decals.shift();
  dropBody(e);
  const byPlayer = src === P;
  if (byPlayer) {
    if (e.kind !== 'human') S.stats.kM++; else S.stats.kS++;
    if (e.fac === 'loner') { S.rep -= 35; msg('Убит одиночка. Слух разойдётся по всему Кордону.', 'bad'); }
    if (e.fac === 'bandit') S.rep += 3;
  } else if (e.fac === 'loner' && (dE(e, P) > 380 || !los(P.x, P.y, e.x, e.y))) {
    const why = src === 'blow' ? 'выброс' : src === 'anom' ? 'аномалия' : src && src.fac === 'mutant' ? 'слепые псы' : src && src.fac === 'bandit' ? 'бандиты' : src && src.fac === 'army' ? 'военные' : 'неизвестно';
    news('Погиб сталкер ' + e.name + '. Причина: ' + why + '.', true);
  } else if (e.fac === 'bandit' && src && src.fac === 'loner' && dE(e, P) > 380) {
    news('Одиночки убили бандита по кличке ' + e.name + '.', true);
  }
  if (e.sid === 'tolik' && S.q2.tolik !== 2) S.q2.tolik = 3;
  if (e.sid === 'fox' && S.q2.fox > 0 && S.q2.fox < 4) { S.q2.fox = 4; S.flags.foxFail = 1; msg('Лис погиб.', 'bad'); }
  if (e.sid === 'shust' && S.q.flash > 0 && S.q.flash < 3) { S.q.flash = 4; S.flags.flashFail = 1; msg('Шустрый погиб. Флешку уже не вернуть.', 'bad'); news('Задание провалено: Флешка Шустрого.'); }
  checkQuests(); plusKill(e, src);
}
function dropBody(e) {
  const loot = {};
  if (e.kind === 'dog') { if (chance(0.55)) loot.tail = 1; }
  else if (e.kind === 'boar') { if (chance(0.7)) loot.hoof = 1; }
  else if (e.kind === 'sucker') { loot.tentacle = 1; }
  else {
    if (e.money) loot.money = e.money;
    Object.keys(e.inv || {}).forEach(k => loot[k] = e.inv[k]);
    const W = WP[e.wpn];
    if (W && W.ammo) { loot[W.ammo] = (loot[W.ammo] || 0) + (W.ammo === 'a545' ? ri(15, 35) : W.ammo === 'a12' ? ri(3, 8) : ri(6, 14)); loot[e.wpn] = 1; }
    if (e.fac === 'army' && chance(0.3)) loot.grenade = 1;
    if (e.sid === 'boss') { loot.ar_bandit = 1; loot.grenade = 2; }
  }
  if (e.kind === 'human' && (e.fac === 'loner' || e.fac === 'bandit') && chance(0.3)) loot.__tip = 1;
  const body = { k: 'body', x: e.x, y: e.y, ang: e.ang, fac: e.fac, kind: e.kind, name: e.name, seed: e.seed || 1, loot: loot, t: S.min };
  // Младший остаток визуального seed хранит расцветку и после загрузки тела.
  if (e.fac === 'loner' && e.kind === 'human') body.seed += jacketIndex(e) - body.seed % JACKET_COLORS.length;
  objs.push(body); g7Fresh(body);   // визуальный переход падения (только в памяти, не в сейве)
  const bodies = objs.filter(o => o.k === 'body');
  if (bodies.length > 30) objs.splice(objs.indexOf(bodies[0]), 1);
}

/* ===================== ИИ ===================== */
/* стелс: насколько игрока видно (1 — обычно) и на каком расстоянии слышно его шаги */
function pVis() {
  let v = 1;
  const moving = Math.hypot(IN.moveX, IN.moveY) > 0.1 || P.jumpT > 0;
  if (P.crouch) v *= 0.55;
  if (!moving) v *= 0.75; else if (P.sprinting) v *= 1.25;
  if (darkness() > 0.3) v *= S.torch === false ? 0.6 : 1.1;   // ночью фонарь выдаёт, без него замечают на 40% позже
  return v;
}
function pNoise() {
  if (P.jumpT > 0) return 150;
  const m = Math.hypot(IN.moveX, IN.moveY); if (m < 0.1) return 0;
  return P.crouch ? 34 : P.sprinting ? 175 : 95;
}
/* враг ещё не в бою с игроком: копит подозрение (0..1). Видит только перед собой (~115°), сзади — только на слух */
function stealthTick(e, dt) {
  if (!P.alive || !hostile(e, P) || e.tgt === P || P.cloak > 0.7) { if (e.tgt === P) e.aw = 1; return; }
  const d = dE(e, P), aP = Math.atan2(P.y - e.y, P.x - e.x), range = sight(e) * pVis();
  let gain = 0;
  if (d < range && Math.abs(angD(e.ang, aP)) < 1.0 && seesActor(e, P)) gain = 0.45 + 2.4 * (1 - d / range);
  const nz = pNoise(); if (nz && d < nz) gain = Math.max(gain, 0.5 + 1.5 * (1 - d / nz));
  const was = e.aw || 0;
  e.aw = gain ? Math.min(1, was + gain * dt) : Math.max(0, was - 0.25 * dt);
  if (e.aw > 0.4 && !e.sit) e.ang += angD(e.ang, aP) * Math.min(1, dt * 2.2);   // насторожился — поворачивается на звук
  if (e.aw > 0.4 && was <= 0.4 && chance(0.7)) sayLine(e, e.fac === 'army' ? 'Стой, кто там?' : e.fac === 'bandit' ? 'Э, кто там шуршит?' : 'Кто здесь?');
  if (e.aw >= 1 && was < 1) ents.forEach(o => { if (o !== e && o.alive && o.fac === e.fac && o.tgt !== P && dE(o, e) < 220) o.aw = Math.max(o.aw || 0, 0.7); });   // поднял своих
}
function sight(e) { return ((night() ? 240 : 400) + (e.fac === 'army' ? 40 : 0)) * (1 - WX.fog * 0.45 - WX.rain * 0.12); }
function findTarget(e) {
  let best = null, bd = 1e9;
  const sr = sight(e);
  for (const o of ents) {
    if (!o.alive || o === e || !hostile(e, o) || o.cloak > 0.7) continue;
    const d = dE(e, o);
    if (o === P && e.kind === 'human' && e.tgt !== P) { if ((e.aw || 0) < 1 || d > sr * 1.2 || d >= bd) continue; }   // игрока сначала надо заметить
    else if (d > sr || d >= bd) continue;
    if (!seesActor(e, o)) continue;
    best = o; bd = d;
  }
  return best;
}
function aiHuman(e, dt) {
  if (e.captive) return;
  e.cool -= dt; e.think -= dt; stealthTick(e, dt);
  const W = WP[e.wpn];
  if (e.reload > 0) { e.reload -= dt; if (e.reload <= 0) e.mag = W.mag; }
  if (e.think <= 0) {
    e.think = 0.25 + Math.random() * 0.15;
    const t = findTarget(e);
    if (t && t !== e.tgt) { e.tgt = t; e.react = rnd(0.35, 0.8) - (e.rank || 0) * 0.08; if (chance(0.6)) callout(e, 'combat'); }
    if (!t && e.tgt && (!e.tgt.alive || !hostile(e, e.tgt))) e.tgt = null;
    // охрана южного блокпоста
    if (e.guard === 'south' && P.alive && dE(e, P) < 300 && seesActor(e, P)) {
      const d = dE(e, P);
      if (d < 150 && !e.angry && !armyAngry) { e.angry = 1; msg('Часовой: — Огонь по нарушителю!', 'bad'); }
      else if (d < 300 && warnT <= 0 && !e.angry) { warnT = 8; msg('Часовой: — Стой! Назад, стреляю без предупреждения!', 'bad'); }
    }
  }
  const t = e.tgt;
  if (t && t.alive && hostile(e, t)) { combatHuman(e, t, W, dt); return; }
  e.inCover = 0; e.crouch = 0; e.role = null; e.cover = null;
  e.tgt = null;
  e.react = 0.5;
  if (e.campRise != null) {
    const target = e.sit ? 0 : 1;
    e.campRise = clamp(e.campRise + (e.sit ? -dt : dt) / 0.82, 0, 1);
    if (e.sit) {
      const towardFire = Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x);
      e.ang += angD(e.ang, towardFire) * Math.min(1, dt * 5);
    } else if (e.campRise > 0.72 && (e.trip || e.follow)) {
      // Перенёс вес на стопу: первые сантиметры шага идут по реальному пути.
      const stride = (e.campRise - 0.72) / 0.28;
      idleHuman(e, dt * stride);
    }
    if (e.campRise === target) e.campRise = null;
    return;
  }
  if (e.mem > 0 && e.lastSeen) {
    e.mem -= dt;
    e.crouch = 0; if (goTo(e, e.lastSeen.x, e.lastSeen.y, 68, dt) < 20) e.mem = 0;
    return;
  }
  idleHuman(e, dt);
}
/* ===== тактика в бою ===== */
/* роль в группе: один давит, один обходит, остальные держат позицию из укрытия */
function pickRole(e, t) {
  const mates = ents.filter(o => o.alive && o !== e && o.kind === 'human' && o.fac === e.fac && o.tgt === t);
  const has = r => mates.some(o => o.role === r);
  if (e.guard) return 'hold';
  if (WP[e.wpn].pellets && !has('push')) return 'push';
  if (mates.length >= 1 && !has('flank')) return 'flank';
  if (!has('push') && mates.length >= 2) return 'push';
  return 'hold';
}
/* укрытие: проходимая клетка рядом с препятствием, которое стоит между ней и целью */
function findCover(e, t, minD, maxD) {
  const ex = Math.floor(e.x / T), ey = Math.floor(e.y / T);
  let best = null, bs = 1e9;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const x = ex + dx, y = ey + dy;
    if (!inb(x, y) || !nav[y * MW + x]) continue;
    const cx = x * T + 16, cy = y * T + 16;
    const dt2 = dst(cx, cy, t.x, t.y); if (dt2 < minD || dt2 > maxD) continue;
    const a = Math.atan2(t.y - cy, t.x - cx);
    let shield = false;
    for (const d of [20, 30]) if (solidPx(cx + Math.cos(a) * d, cy + Math.sin(a) * d)) { shield = true; break; }
    if (!shield) continue;
    if (ents.some(o => o !== e && o.alive && o.cover && Math.abs(o.cover.x - cx) < 20 && Math.abs(o.cover.y - cy) < 20)) continue;
    const sc = dst(cx, cy, e.x, e.y) + Math.abs(dt2 - (minD + maxD) / 2) * 0.4;
    if (sc < bs) { bs = sc; best = { x: cx, y: cy }; }
  }
  return best;
}
function npcHeal(e) {
  const id = e.inv.medkit ? 'medkit' : e.inv.bandage ? 'bandage' : null;
  if (!id) return false;
  e.inv[id]--; if (!e.inv[id]) delete e.inv[id];
  e.hp = Math.min(e.maxhp, e.hp + (id === 'medkit' ? 45 : 18));
  return true;
}
function npcGrenade(e, x, y) {
  e.nade = 0;
  const a = Math.atan2(y - e.y, x - e.x), d = Math.min(260, dst(e.x, e.y, x, y));
  nades.push({ x: e.x, y: e.y, vx: Math.cos(a) * d * 1.25, vy: Math.sin(a) * d * 1.25, t: 1.6, z: 0, vz: 160, owner: e });
  callout(e, 'nade', true);
  if (dst(x, y, P.x, P.y) < 300) msg('Граната! Уходи с места!', 'bad');
}
function combatHuman(e, t, W, dt) {
  e.sit = 0; e.campRise = null; e.trip = null;
  const d = dE(e, t), see = seesActor(e, t);
  if (see) { e.lastSeen = { x: t.x, y: t.y }; e.mem = 8; e.react -= dt; e.unseen = 0; }
  else { e.mem -= dt; e.unseen = (e.unseen || 0) + dt; }
  const want = Math.atan2(t.y - e.y, t.x - e.x);
  if (!e.role) { e.role = pickRole(e, t); e.morale = e.morale === undefined ? 1 : e.morale; if (e.nade === undefined) e.nade = (e.fac === 'army' ? 0.6 : e.fac === 'bandit' ? 0.35 : 0.2) > Math.random() ? 1 : 0; }
  e.tacT = (e.tacT || 0) - dt;
  // бегство при потере духа
  if (e.morale < 0.35 && e.hp < e.maxhp * 0.5 && !e.guard) {
    if (!e.routT) { e.routT = rnd(5, 8); callout(e, 'hurt', true); }
    e.routT -= dt; e.crouch = 0;
    steer(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 128, dt);
    if (e.routT <= 0) { e.morale = 0.6; e.routT = 0; }
    return;
  }
  // ранен: отходит в укрытие и лечится
  if (e.hp < e.maxhp * 0.35 && (e.inv.medkit || e.inv.bandage) && !e.healing) { e.healing = 1; e.cover = findCover(e, t, 200, 420); }
  if (e.healing) {
    if (e.cover && goTo(e, e.cover.x, e.cover.y, 118, dt) > 10) { e.crouch = 0; }
    else { e.crouch = 1; e.inCover = 1; e.healT = (e.healT || 1.6) - dt; if (e.healT <= 0) { npcHeal(e); e.healing = 0; e.healT = 0; e.cover = null; } }
    return;
  }
  // цель не видна
  if (!see) {
    e.crouch = 0; e.inCover = 0;
    if (e.nade && e.unseen > 2.5 && e.lastSeen && dst(e.x, e.y, e.lastSeen.x, e.lastSeen.y) < 280 && dst(e.x, e.y, e.lastSeen.x, e.lastSeen.y) > 90 && chance(dt * 0.8)) { npcGrenade(e, e.lastSeen.x, e.lastSeen.y); return; }
    if (e.lastSeen) goTo(e, e.lastSeen.x, e.lastSeen.y, e.role === 'push' ? 100 : 72, dt);
    if (e.mem <= 0) { e.tgt = null; e.role = null; }
    return;
  }
  e.ang += angD(e.ang, want) * Math.min(1, dt * 7);
  const pref = W.pref || 20;
  // движение по роли
  if (W.melee) { e.crouch = 0; steer(e, t.x, t.y, 110, dt); }
  else if (e.guard) { e.crouch = d > 160 ? 1 : 0; }
  else if (e.role === 'hold') {
    if (!e.cover || e.tacT <= 0) { e.tacT = rnd(4, 8); e.cover = findCover(e, t, Math.max(120, pref - 60), pref + 160); }
    if (e.cover && dst(e.x, e.y, e.cover.x, e.cover.y) > 10) { e.crouch = 0; e.inCover = 0; goTo(e, e.cover.x, e.cover.y, 105, dt); }
    else { e.inCover = !!e.cover; e.crouch = e.cover ? (e.cool > W.rate * 1.2 ? 1 : 0) : 0; if (!e.cover && d < pref - 60) steer(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 70, dt); }
  } else if (e.role === 'flank') {
    if (!e.side) e.side = chance(0.5) ? 1 : -1;
    const fa = want + Math.PI + e.side * 1.25, fx = t.x + Math.cos(fa) * pref, fy = t.y + Math.sin(fa) * pref;
    e.crouch = 0; e.inCover = 0;
    if (goTo(e, fx, fy, 112, dt) < 30 || e.stuck > 1) { e.role = 'hold'; e.cover = null; }
  } else {
    e.crouch = 0; e.inCover = 0;
    if (d > pref) steer(e, t.x, t.y, 92, dt);
    else { e.strT = (e.strT || 0) - dt; if (e.strT <= 0) { e.strT = rnd(0.8, 1.8); e.side = chance(0.5) ? 1 : -1; } steer(e, e.x + Math.cos(want + e.side * 1.57) * 60, e.y + Math.sin(want + e.side * 1.57) * 60, 64, dt); }
  }
  // гранату в укрывшегося
  if (e.nade && t.crouch && d > 120 && d < 260 && chance(dt * 0.25)) { npcGrenade(e, t.x, t.y); return; }
  // огонь
  if (W.melee) { if (d < e.r + t.r + W.range && e.cool <= 0) { e.cool = W.rate * 1.6; melee(e, W); } return; }
  if (e.react <= 0 && e.cool <= 0 && e.reload <= 0 && d < W.range * 0.92 && Math.abs(angD(e.ang, want)) < 0.25) {
    if (!lineClear(e, t)) { e.side = -(e.side || 1); e.strT = 0; steer(e, e.x + Math.cos(want + 1.57 * e.side) * 60, e.y + Math.sin(want + 1.57 * e.side) * 60, 80, dt); return; }
    const moving = !e.inCover && e.role !== 'hold';
    const acc = { bandit: 0.12, loner: 0.1, army: 0.07 }[e.fac] - (e.rank || 0) * 0.015 + (night() && d > 200 ? 0.05 : 0) + (moving ? 0.04 : 0) + (t === P && P.crouch ? 0.03 : 0);
    e.crouch = 0;
    fire(e, e.ang, W, W.spread + acc);
    e.mag--;
    e.cool = W.auto ? (e.burst = (e.burst || 0) + 1) % 4 === 0 ? rnd(0.7, 1.3) : W.rate * 1.3 : W.rate * rnd(2.2, 3.4);
    if (e.mag <= 0) { e.reload = W.reload * 1.2; e.crouch = 1; if (chance(0.5)) callout(e, 'reload'); }
  }
}
// 0 — сидит у огня, 1 — полностью встал. При смене намерения продолжаем с текущей позы.
function setCampSeat(e, sitting) {
  if (!!e.sit === sitting) return;
  if (e.fac === 'loner' && e.fireRef && window.CORDON_G8_ON && G3_READY() && e.campRise == null)
    e.campRise = e.sit ? 0 : 1;
  e.sit = sitting ? 1 : 0;
}
function idleHuman(e, dt) {
  if (followTick(e, dt)) return;
  if (e.guard) {
    if (dE(e, e.home) > 8) goTo(e, e.home.x, e.home.y, 70, dt);
    else { e.ang += angD(e.ang, e.guard === 'south' ? -Math.PI / 2 : Math.PI / 2) * dt * 2; }
    return;
  }
  if (e.sit) {
    e.ang += angD(e.ang, Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x)) * dt * 2;
    if (e.fac === 'loner' && !e.named && e.fireRef === FIRE && chance(dt * 0.004)) { setCampSeat(e, false); startTrip(e); }
    return;
  }
  if (e.trip) {
    const tr = e.trip;
    if (tr.stage === 0) { if (goTo(e, tr.x, tr.y, 72, dt) < 30) { tr.stage = 1; tr.wait = rnd(10, 30); } }
    else if (tr.stage === 1) { tr.wait -= dt; e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rnd(2, 5); e.ang += rnd(-1.5, 1.5); } if (tr.wait <= 0) tr.stage = 2; }
    else {
      const arrival = e.seat && e.fireRef === FIRE ? 7 : 24;
      if (goTo(e, e.home.x, e.home.y, 72, dt) < arrival) {
        e.trip = null;
        if (e.seat) setCampSeat(e, true);
      }
    }
    return;
  }
  const dh = dE(e, e.home);
  if (dh > 140) { goTo(e, e.home.x, e.home.y, 70, dt); return; }
  e.idleT -= dt;
  if (e.wander) {
    if (goTo(e, e.wander.x, e.wander.y, 50, dt) < 14 || e.stuck > 1) e.wander = null;
  } else if (e.idleT <= 0) {
    e.idleT = rnd(3, 8);
    if (!e.stay || chance(0.3)) {
      const a = rnd(0, 6.28), r = rnd(20, e.stay ? 50 : 110);
      const wx = e.home.x + Math.cos(a) * r, wy = e.home.y + Math.sin(a) * r;
      const ti = Math.floor(wy / T) * MW + Math.floor(wx / T);
      if (nav[ti] && los(e.x, e.y, wx, wy)) e.wander = { x: wx, y: wy };
    } else e.ang += rnd(-1.2, 1.2);
  }
  if (e.fac === 'loner' && !e.stay && !e.named && chance(dt * 0.003)) startTrip(e);
}
function startTrip(e) {
  const keys = Object.keys(POI).filter(k => k !== 'atp' || S.flags.atpClear);
  const p = POI[keys[ri(0, keys.length - 1)]];
  e.seat = e.seat || (dE(e, FIRE) < 110 ? 1 : 0);
  e.trip = { x: p.x + rnd(-30, 30), y: p.y + rnd(-30, 30), stage: 0 };
}
function aiDog(e, dt) {
  e.cool -= dt; e.think -= dt; e.barkT -= dt;
  if (e.think <= 0) {
    e.think = 0.3;
    let best = null, bd = 1e9;
    for (const o of ents) {
      if (!o.alive || o.fac === 'mutant' || o.captive) continue;
      const d = dE(e, o);
      const k = o === P ? clamp(pVis() * 1.1, 0.5, 1.2) : 1;
      if (d < (night() ? 320 : 280) * k && d < bd && (d < 150 * k || los(e.x, e.y, o.x, o.y))) { best = o; bd = d; }
    }
    if (best && !e.tgt) { ents.forEach(o => { if (o.kind === 'dog' && o.alive && o.pack === e.pack && !o.tgt && dE(o, e) < 220) o.tgt = best; }); }
    if (best) e.tgt = best;
    if (e.tgt && (!e.tgt.alive || dE(e, e.tgt) > 520)) e.tgt = null;
  }
  const t = e.tgt;
  if (t) {
    if (e.barkT <= 0) { e.barkT = rnd(2, 5); play('dog', e.x, e.y); }
    const want = Math.atan2(t.y - e.y, t.x - e.x), d = dE(e, t);
    e.ang += angD(e.ang, want) * Math.min(1, dt * 9);
    if (e.hp < e.maxhp * 0.35 && !e.fled) { e.fleeT = 2; e.fled = 1; }
    if (e.fleeT > 0) { e.fleeT -= dt; steer(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 170, dt); return; }
    if (d > e.r + t.r + 4) {
      if (los(e.x, e.y, t.x, t.y)) steer(e, t.x + Math.cos(e.id) * 6, t.y + Math.sin(e.id) * 6, 172, dt);
      else goTo(e, t.x, t.y, 160, dt);
    } else if (e.cool <= 0) {
      e.cool = rnd(0.7, 1.1);
      hurt(t, rnd(7, 13), e, want);
      e.kx -= Math.cos(want) * 140; e.ky -= Math.sin(want) * 140;
    }
    return;
  }
  e.idleT -= dt;
  if (dE(e, e.home) > 160) { goTo(e, e.home.x, e.home.y, 90, dt); return; }
  if (e.wander) { if (steer(e, e.wander.x, e.wander.y, 55, dt) < 0.2 || dst(e.x, e.y, e.wander.x, e.wander.y) < 10) e.wander = null; e.ang += angD(e.ang, Math.atan2((e.wander ? e.wander.y : e.y) - e.y, (e.wander ? e.wander.x : e.x) - e.x)) * dt * 5; }
  else if (e.idleT <= 0) { e.idleT = rnd(2, 6); const a = rnd(0, 6.28), r = rnd(20, 90); e.wander = { x: e.home.x + Math.cos(a) * r, y: e.home.y + Math.sin(a) * r }; }
}

/* ===================== задания ===================== */
function qTargets() {
  // у каждой цели qid — id задания из qList; HUD показывает цель отслеживаемого задания
  const out = [], q = S.q;
  const at = (qid, p, n) => out.push({ qid: qid, x: p.x, y: p.y, n: n });
  const w = byS('wolf');
  const sidT = (qid, n) => at(qid, inBunker(P.x, P.y) ? locPt('sid', 'trader') : locPt('sid', 'hatch'), n || (inBunker(P.x, P.y) ? 'Сидорович' : 'Бункер Сидоровича'));
  if (!q.flash) sidT('flash', 'Поговорить с Сидоровичем');
  if (q.flash === 1 && w) at('flash', w, 'Найти Волка в деревне');
  if (q.flash === 2) { const s = byS('shust'); at('flash', s || locPt('atp', 'garage'), 'Освободить Шустрого на АТП'); }
  if (q.flash === 3) sidT('flash', 'Отнести флешку Сидоровичу');
  if (q.medusa === 1) has('art_medusa') ? sidT('medusa', 'Отдать «Медузу» Сидоровичу') : at('medusa', locPt('field', 'medusa'), 'Поле аномалий');
  if (q.pack === 1) at('pack', locPt('dogs_lair', 'lair'), 'Логово псов');
  if (q.pack === 2 && w) at('pack', w, 'Вернуться к Волку');
  const fx = byS('fox');
  if (S.q2.fox >= 1 && S.q2.fox <= 3 && fx) at('fox', fx, 'Найти Лиса у фермы');
  const tl = byS('tolik');
  if (S.q2.tolik === 1 && tl) at('tolik', tl, 'Раненый Толик');
  plusTargets(out);
  return out;
}
/* отслеживаемая цель: выбранное задание, иначе первое активное (SOS не перехватывает выбор) */
function trackedTarget() {
  const T0 = qTargets();
  const act = qList().filter(q => q.st === 'a');
  if (!act.some(q => q.id === S.trackedQuestId)) S.trackedQuestId = (act.find(q => q.id !== 'sos') || act[0] || {}).id || null;
  return T0.find(t => t.qid === S.trackedQuestId) || null;
}
function qList() {
  const L = [], q = S.q;
  const F = ['', 'Найди Волка в деревне новичков: он знает, где держат Шустрого.', 'Освободи Шустрого: бандиты держат его в гараже на АТП, на востоке.', 'Отнеси флешку Сидоровичу в бункер.', ''];
  if (q.flash >= 1) L.push({ id: 'flash', loc: 'atp', n: 'Флешка Шустрого', d: q.flash === 4 ? (S.flags.flashFail ? 'Провалено.' : 'Выполнено.') : F[q.flash], st: q.flash === 4 ? (S.flags.flashFail ? 'f' : 'd') : 'a' });
  if (q.medusa >= 1) L.push({ id: 'medusa', loc: 'field', n: '«Медуза» для Сидоровича', d: q.medusa === 2 ? 'Выполнено.' : 'Найди артефакт «Медуза» на поле аномалий за ржавым автобусом и принеси Сидоровичу.', st: q.medusa === 2 ? 'd' : 'a' });
  if (q.pack >= 1) L.push({ id: 'pack', loc: 'dogs_lair', n: 'Стая у леса', d: q.pack === 3 ? 'Выполнено.' : q.pack === 1 ? 'Перебей стаю слепых псов в лесу на северо-западе.' : 'Стая перебита. Вернись к Волку.', st: q.pack === 3 ? 'd' : 'a' });
  if (S.q2.fox >= 1) L.push({ id: 'fox', loc: 'farm', n: 'Найти Лиса', d: S.q2.fox === 4 ? 'Выполнено. Брат Лиса, Серый, ждёт на Свалке. Продолжение в следующей версии.' : S.q2.fox === 1 ? 'Лис ушёл за насыпь, к разрушенной ферме на северо-востоке. Пройти можно под мостом за 500 RU или через туннель с электрами.' : S.q2.fox === 2 ? 'Отбейся от стаи вместе с Лисом.' : 'Поговори с Лисом.', st: S.q2.fox === 4 ? 'd' : 'a' });
  if (S.q2.tolik >= 1) L.push({ id: 'tolik', loc: 'village', n: 'Раненый у дороги', d: S.q2.tolik === 2 ? 'Выполнено.' : S.q2.tolik === 3 ? 'Провалено: Толик погиб.' : 'Сталкер лежит у дороги и просит аптечку.', st: S.q2.tolik === 2 ? 'd' : S.q2.tolik === 3 ? 'f' : 'a' });
  plusQList(L);
  return L;
}
function checkQuests() {
  if (S.q2.fox === 2 && !ents.some(e => e.alive && e.pack === 'foxdogs')) { S.q2.fox = 3; msg('Стая отбита. Поговори с Лисом.', 'good'); }
  if (S.q2.tolik === 0 && P && P.alive && byS('tolik') && byS('tolik').captive && dE(P, byS('tolik')) < 260) { S.q2.tolik = 1; msg('Толик: — Братишка... помоги... аптечку...', 'say'); news('У дороги лежит раненый сталкер, просит аптечку.'); }
  if (S.q.pack === 1 && !ents.some(e => e.alive && e.pack === 'lair')) { S.q.pack = 2; msg('Стая перебита. Вернись к Волку.', 'good'); news('Стая у леса перебита.'); }
  if (!S.flags.atpClear && ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'boss'].every(s => S.dead[s])) {
    S.flags.atpClear = 1; msg('АТП очищено от бандитов.', 'good'); news('Бандиты на АТП перебиты.', false);
    ['petr', 'petr2'].forEach(s => { const e = byS(s); if (e) { const p = locPt('atp', s); e.home = { x: p.x, y: p.y }; e.stay = 1; } });
  }
}

/* ===================== жизнь мира ===================== */
function spawnTick() {
  const far = (x, y) => dst(x, y, P.x, P.y) > 520;
  const villageLoners = ents.filter(e => e.alive && e.fac === 'loner' && !e.named && dst(e.home.x, e.home.y, FIRE.x, FIRE.y) < 260).length;
  if (villageLoners < 4 && far(...RMp(21 * T, 82.5 * T))) {
    const seat = RMt(...[[28.2, 83.3], [31.8, 82.7], [32.6, 85.6], [28.6, 86.4]][ri(0, 3)]);
    const e = mkHuman({ fac: 'loner', x: RMt(21, 82.5)[0], y: RMt(21, 82.5)[1], wpn: chance(0.7) ? 'w_pm' : 'w_obrez' });
    e.home = { x: seat[0] * T, y: seat[1] * T }; e.seat = 1;
    e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
    ents.push(e);
  }
  const patrol = ents.filter(e => e.alive && e.patrol).length;
  if (S.min - (S.flags.patrolT || 420) > 480 && patrol < 2 && far(...RMp(113 * T, 92 * T))) {
    S.flags.patrolT = S.min;
    const n = ri(2, 3);
    for (let i = 0; i < n; i++) {
      const e = mkHuman({ fac: 'bandit', x: 113 + i * 0.6, y: 92 + i * 0.5, wpn: chance(0.6) ? 'w_pm' : 'w_obrez' });
      e.patrol = 1; e.home = { x: (66 + i) * T, y: (91 + i) * T };
      ents.push(e);
    }
    news('Сводка: на дорогу с востока вышла группа бандитов.', false);
  }
  if (S.min - (S.flags.dogT || 0) > 360 && S.q.pack !== 1) {
    S.flags.dogT = S.min;
    ['lair', 'north'].forEach(pk => {
      const home = (h => ({ x: h[0], y: h[1] }))(pk === 'lair' ? RMt(10.5, 42.5) : RMt(71, 20.5));
      if (ents.filter(e => e.alive && e.pack === pk).length < 2 && far(home.x * T, home.y * T))
        for (let i = 0; i < 2; i++) ents.push(mkDog({ pack: pk, x: home.x + i, y: home.y }));
    });
  }
}
