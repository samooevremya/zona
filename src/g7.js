/* ===================== выживание: кровь, голод, износ, присед, детектор, тайники, ранги ===================== */
const FOOD = { bread: 25, sausage: 35, cans: 45 };
const CACHES = [
  { x: 6.5, y: 60.5, loot: { money: 350, medkit: 1, a9: 20 } }, { x: 45.5, y: 47.5, loot: { a545: 40, antirad: 1 } },
  { x: 108.5, y: 100.5, loot: { grenade: 2, cans: 2, money: 200 } }, { x: 21.5, y: 25.5, loot: { art_blood: 1, vodka: 1 } },
  { x: 112.5, y: 40.5, loot: { a12: 16, bandage: 3, money: 500 } }, { x: 52.5, y: 98.5, loot: { ar_bandit: 1, sausage: 2 } }
];
function survDefaults() {
  if (S.food === undefined) S.food = 90;
  if (S.bleed === undefined) S.bleed = 0;
  S.cond = S.cond || { w_pm: 85, w_obrez: 75, w_aksu: 80 };
  S.caches = S.caches || {};
  if (S.rankSeen === undefined) S.rankSeen = rankOf(score());
}
function ensureCaches() {
  CACHES.forEach((c, i) => {
    if (objs.some(o => o.cacheId === i)) return;
    objs.push({ k: 'cache', cacheId: i, x: c.x * T, y: c.y * T, loot: S.caches[i] === 2 ? {} : Object.assign({}, S.flags['cache_contents_'+i] || c.loot), name: 'Тайник' });
  });
}
function revealCache(fromName, idx) {
  const free = CACHES.map((c, i) => i).filter(i => !S.caches[i]);
  if (!free.length) return;
  const i = idx != null && free.includes(idx) ? idx : free[ri(0, free.length - 1)];
  S.caches[i] = 1;
  const c = CACHES[i];
  bulletin('В КПК ' + (fromName ? fromName : 'покойника') + ' нашлись координаты тайника. Метка на карте.');
}
const cond = id => (S.cond[id] === undefined ? 80 : S.cond[id]);
function wearAndJam(id) {
  const W = WP[id]; if (!W || W.melee) return false;
  S.cond[id] = Math.max(0, cond(id) - (W.auto ? 0.07 : W.pellets ? 0.35 : 0.15));
  const c = cond(id);
  if (c < 65 && chance((65 - c) / 500)) { P.jam = 1; play('jam'); msg('Заклинило! ' + (IN.touch ? 'Жми «Перезар.»,' : 'Жми R,') + ' чтобы передёрнуть.', 'bad'); return true; }
  return false;
}
function activeDetectorRange() {
  const model = S && DETECTORS[S.weapon];
  return model && has(S.weapon) && P.alive && !inBunker(P.x, P.y) ? model.metres * T / 1.5 : 0;
}
function survival(dt) {
  survDefaults();
  // голод
  S.food = Math.max(0, S.food - dt * 0.065);
  if (S.food < 20 && !S.flags.hungryMsg) { S.flags.hungryMsg = 1; msg('Ты голоден. Съешь что-нибудь из рюкзака.', 'bad'); }
  if (S.food >= 30) S.flags.hungryMsg = 0;
  if (S.food <= 0) P.hp -= 0.12 * dt;
  // кровотечение
  if (S.bleed > 0) {
    P.hp -= S.bleed * 0.55 * dt;
    P.bleedT = (P.bleedT || 0) - dt;
    if (P.bleedT <= 0) { P.bleedT = 0.6; decals.push({ x: P.x + rnd(-6, 6), y: P.y + rnd(-6, 6), r: rnd(1.5, 3), a: 0.7 }); }
  }
  const range = activeDetectorRange();
  P.detD = Infinity;
  if (range) for (const a of arts) {
    const distance = dE(P, a);
    if (distance <= range && distance < P.detD) P.detD = distance;
  }
  if (Number.isFinite(P.detD)) {
    P.detT = (P.detT || 0) - dt;
    if (P.detT <= 0) {
      const fraction = P.detD / range;
      play('beep', undefined, undefined, 1.3 - 0.8 * fraction);
      P.detT = 0.12 + 1.2 * fraction;
    }
  } else P.detT = 0;
  // ранг
  const r = rankOf(score());
  if (r > S.rankSeen) { S.rankSeen = r; news('Ранг повышен: ' + RANKS[r] + '.'); }
  // тайники рядом
}
function cacheNear() {
  let best = null, bd = 44;
  for (const o of objs) if (o.k === 'cache' && S.caches[o.cacheId] === 1 && Object.keys(o.loot).length) { const d = dst(P.x, P.y, o.x, o.y); if (d < bd && los(P.x,P.y,o.x,o.y)) { bd = d; best = o; } }
  return best;
}
function drawCaches() {
  for (const o of objs) {
    if (o.k !== 'cache' || S.caches[o.cacheId] !== 1 || !Object.keys(o.loot).length) continue;
    if (ART) { artCache(o); continue; }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 4, 9, 5, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#5a4a30'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 8, 7, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#3a2e1c'; ctx.fillRect(o.x - 2, o.y - 9, 4, 4);
  }
}
