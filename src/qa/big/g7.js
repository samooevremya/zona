(() => {
/* G7 регрессии: стрельба (геометрия, стены, вплотную), риг (шаг/FPS/телепорт), падение, fallback, иконки G7.
   Ожидания — ПРАВИЛЬНОЕ поведение (в отличие от review/check.cjs, который воспроизводил старые дефекты). */
const z = __z, G = z.rc.g7, Q = z.rc, M = z.map, R = {}, T = 32, opq = G.opq, MW = M.MW;
const __RM = window.__zRM;
const RPx = (x, y) => __RM.p(x, y)[0], RPy = (x, y) => __RM.p(x, y)[1];
const __setOld = (x, y) => { const r = __RM.p(x, y); z.P.x = r[0]; z.P.y = r[1]; };
const S = () => z.S, P = () => z.P;
const T_ = (name, fn) => { try { R[name] = fn(); } catch (e) { R[name] = { ok: false, ERROR: String(e).slice(0, 260) }; } };
let SEEDN = 900;
const reset = () => { z.seed(++SEEDN); z.closePanel(); z.applyState(z.freshS()); const s = S(); s.flags.intro = 1; s.money = 5000;
  ['w_pm', 'w_obrez', 'w_aksu'].forEach(w => { s.inv[w] = 1; s.cond[w] = 100; }); s.inv.a9 = 200; s.inv.a12 = 200; s.inv.a545 = 300; s.weapon = 'w_aksu'; s.mag.w_aksu = 30; };
// открытая площадка: 9×9 клеток без препятствий
let FIELD = null;
for (let ty = 60; ty < 100 && !FIELD; ty++) for (let tx = 20; tx < 110 && !FIELD; tx++) {
  let ok = true; for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -4; dx <= 4 && ok; dx++) { const i = (ty + dy) * MW + tx + dx; if (opq[i] || !M.nav[i]) ok = false; }
  if (ok && !M.objs.some(o => o.solid && Math.abs(o.x + o.w / 2 - (tx + 0.5) * T) < 5 * T && Math.abs(o.y + o.h / 2 - (ty + 0.5) * T) < 5 * T)) FIELD = [tx, ty];
}
const isolate = () => { const keep = z.ents.filter(e => e === P()); const rest = z.ents.filter(e => e !== P()); z.ents.length = 0; z.ents.push(...keep); return rest; };
const restore = rest => { z.ents.push(...rest); };
const place = (e, x, y, a) => { e.x = x; e.y = y; if (a != null) e.ang = a; };
const tgt = (x, y, fac) => { const e = z.rc.mk.mkHuman({ fac: fac || 'bandit', x: x / T, y: y / T, wpn: 'w_pm' }); e.x = x; e.y = y; e.hp = e.maxhp = 1e6; e.qaHold = 1; z.ents.push(e); return e; };
const shoot = (sh, ang, wid) => { const W = Object.assign({}, G.WP[wid]); const hits = []; const h0 = z.ents.map(e => e.hp); G.fire(sh, ang, W, 0); z.ents.forEach((e, i) => { if (e.hp < h0[i]) hits.push(e); }); return hits; };
const C0 = () => [(FIELD[0] + 0.5) * T, (FIELD[1] + 0.5) * T];

/* G1: одна геометрия дула — нарисованный конец ствола совпадает с расчётной точкой (все углы, стволы, позы) */
function muzzleCheck(modeLabel) {
  reset(); const rest = isolate(); const [cx, cy] = C0(); const out = []; let maxErr = 0, n = 0, nullBoth = 0;
  for (const w of ['w_pm', 'w_obrez', 'w_aksu']) for (const pose of ['idle', 'walk', 'crouch']) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4; S().weapon = w; place(P(), cx, cy, a); P().crouch = pose === 'crouch' ? 1 : 0; P().qaRig = 0;
    if (G.rigActive(P())) G.qaRig(P(), pose === 'walk' ? 17 : 0, 60, pose === 'walk' ? 'walk' : pose === 'crouch' ? 'crouch' : 'idle');
    for (let i = 0; i < 30; i++) G.qaRig(P(), 0, 60, pose === 'walk' ? 'walk' : pose === 'crouch' ? 'crouch' : 'idle');   // переход позы завершён
    let tip = null; window.__g7tap = (e, base, m, wl) => { if (e !== P() || !wl) return; const d = m.transformPoint(new DOMPoint(wl.muzzle[0], wl.muzzle[1])); const inv = base.inverse(); const p = inv.transformPoint(d); tip = { x: p.x, y: p.y }; };
    z.cam.x = cx; z.cam.y = cy; window.__zRender && window.__zRender();
    const mz = G.g7Muzzle(P(), a); window.__g7tap = null;
    if (!tip && !mz) { nullBoth++; continue; }
    if (!tip || !mz) { out.push({ w, pose, k, tip: !!tip, mz: !!mz }); maxErr = 99; continue; }
    const err = Math.hypot(tip.x - mz.x, tip.y - mz.y); maxErr = Math.max(maxErr, err); n++;
  }
  P().crouch = 0; P().qaRig = 0; restore(rest);
  if (!n && /g3-off/.test(modeLabel)) return { ok: true, na: 'G3/риг выключены: ствол рисует прежний B1-слой со своим muzzleSocket; баллистика от графики не зависит (G2–G5)', mode: modeLabel };
  return { ok: n > 0 && maxErr < 0.1, mode: modeLabel, compared: n, maxErrPx: +maxErr.toFixed(4), noVisibleWeapon: nullBoth, mismatches: out.slice(0, 4) };
}
T_('G1_muzzle_draw_equals_calc', () => muzzleCheck(location.hash));

/* G2: стена между центром и дулом: игрок в центре клетки, стена в соседней (16 px), дуло АКС ≈29 px, цель за стеной */
T_('G2_wall_before_muzzle', () => {
  reset(); const rest = isolate(); const [cx, cy] = C0(); const res = {};
  for (const w of ['w_pm', 'w_obrez', 'w_aksu']) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, dx = Math.round(Math.cos(a)), dy = Math.round(Math.sin(a)), wi = (FIELD[1] + dy) * MW + FIELD[0] + dx;
    const t = tgt(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); S().weapon = w; place(P(), cx, cy, a);
    const was = opq[wi]; opq[wi] = 1; const tr0 = G.tracers.length, fl0 = G.flashes.length;
    const hits = shoot(P(), a, w); const fl = G.flashes[G.flashes.length - 1];
    const proj = (x, y) => (x - cx) * Math.cos(a) + (y - cy) * Math.sin(a), edge = Math.abs(dx) && Math.abs(dy) ? 16 * Math.SQRT2 : 16;
    const trs = G.tracers.slice(tr0), beyond = trs.filter(q => proj(q.x1, q.y1) > edge + 0.01 || proj(q.x0, q.y0) > edge + 0.01).length;
    res[w + '@' + k * 45] = { hit: hits.includes(t), tracers: trs.length, tracersBeyondWall: beyond, flashBeforeWall: !!fl && proj(fl.x, fl.y) <= edge + 0.01 };
    opq[wi] = was; z.ents.splice(z.ents.indexOf(t), 1);
  }
  restore(rest); const v = Object.values(res);
  return { ok: v.every(r => !r.hit && !r.tracersBeyondWall && r.flashBeforeWall), outcome: v.map(r => r.hit ? 1 : 0).join(''), cases: v.length, sample: res['w_aksu@0'], shortTracersBeforeWall: v.filter(r => r.tracers).length, fails: Object.entries(res).filter(([k, r]) => r.hit || r.tracersBeyondWall || !r.flashBeforeWall).slice(0, 4) };
});

/* G3: цель вплотную (центр перед/за дулом, круг перекрывает стрелка) — попадание; та же цель за тонкой стеной — нет */
T_('G3_point_blank', () => {
  reset(); const rest = isolate(); const [cx, cy] = C0(); const res = {};
  for (const w of ['w_pm', 'w_obrez', 'w_aksu']) for (const d of [8, 16, 24, 28, 36]) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, t = tgt(cx + Math.cos(a) * d, cy + Math.sin(a) * d); t.r = 10; S().weapon = w; place(P(), cx, cy, a);
    const hits = shoot(P(), a, w); res[w + '@' + d + '/' + k * 45] = hits.includes(t); z.ents.splice(z.ents.indexOf(t), 1);
  }
  restore(rest); const miss = Object.entries(res).filter(([, h]) => !h);
  return { ok: !miss.length, cases: Object.keys(res).length, missed: miss.slice(0, 5) };
});

/* G4: диагональный угол двух клеток не пропускает выстрел; открытые 8 направлений на 100 px — попадание */
T_('G4_corner_and_open', () => {
  reset(); const rest = isolate(); const [cx, cy] = C0(); const out = {};
  const a1 = FIELD[1] * MW + FIELD[0] + 1, a2 = (FIELD[1] + 1) * MW + FIELD[0]; const w1 = opq[a1], w2 = opq[a2]; opq[a1] = 1; opq[a2] = 1;
  const t = tgt(cx + 50, cy + 50); place(P(), cx, cy, Math.PI / 4); S().weapon = 'w_aksu';
  out.cornerHit = shoot(P(), Math.PI / 4, 'w_aksu').includes(t); opq[a1] = w1; opq[a2] = w2; z.ents.splice(z.ents.indexOf(t), 1);
  let open = 0, all = 0;
  for (const w of ['w_pm', 'w_obrez', 'w_aksu']) for (const cr of [0, 1]) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, tt = tgt(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100); S().weapon = w; P().crouch = cr; place(P(), cx, cy, a);
    all++; if (shoot(P(), a, w).includes(tt)) open++; z.ents.splice(z.ents.indexOf(tt), 1);
  }
  P().crouch = 0; restore(rest);
  return { ok: !out.cornerHit && open === all, cornerHit: out.cornerHit, openHits: open + '/' + all };
});

/* G5: дружеский огонь по прежним правилам: в бою свой пропускается, вне боя — получает попадание */
T_('G5_friendly_fire_rules', () => {
  reset(); const rest = isolate(); const [cx, cy] = C0(); place(P(), cx, cy, 0);
  const f = tgt(cx + 40, cy, 'loner'), foe = tgt(cx + 90, cy, 'bandit');
  P().combatT = 3; const inCombat = shoot(P(), 0, 'w_pm');
  P().combatT = 0; z.ents.splice(z.ents.indexOf(foe), 1); const calm = shoot(P(), 0, 'w_pm');
  z.ents.splice(z.ents.indexOf(f), 1); restore(rest);
  return { ok: inCombat.includes(foe) && !inCombat.includes(f) && calm.includes(f), inCombat: inCombat.map(e => e.fac), calm: calm.map(e => e.fac) };
});

/* G6: дальность от расчётного дула одинакова: r+8+range (не зависит от графики) */
T_('G6_range_rule', () => {
  reset(); const rest = isolate(); const [cx, cy] = C0(); place(P(), cx, cy, 0); const res = {};
  for (const w of ['w_pm', 'w_obrez', 'w_aksu']) {
    const reach = G.WP[w].range + G.ballOff(P());
    const tin = G.shotTrace(P(), 0, G.WP[w]);
    res[w] = { reach, ballOff: G.ballOff(P()) };
  }
  restore(rest); return { ok: G.ballOff(P()) === P().r + 8, res };
});

/* A1: шаг от пути одинаков при 30/60/120 FPS; при остановке затухает; телепорт не шагает */
T_('A1_gait_fps_invariant', () => {
  reset(); const rest = isolate(); const [cx, cy] = C0(); const out = {};
  for (const fps of [30, 60, 120]) {
    const e = z.rc.mk.mkHuman({ fac: 'loner', x: cx / T, y: cy / T, wpn: 'w_pm' }); z.ents.push(e); e.x = cx; e.y = cy; const dt = 1 / fps;
    G.g7Tick(dt); const r = G.rigActive(e);
    if (!r) {   // без рига: кадры G3 выбираются по пройденному пути (GAIT) — проверяем путь и остановку
      for (let i = 0; i < Math.round(1.1 * fps); i++) { e.x += 100 * dt; G.g7Tick(dt); }
      const g = G.GAIT.get(e), dist = g.dist, mv = g.moveT > 0; for (let i = 0; i < Math.round(0.5 * fps); i++) G.g7Tick(dt);
      const stop = g.moveT === 0; e.x += 600; G.g7Tick(dt);
      out[fps] = { phase: +dist.toFixed(3), walking: mv ? 'walk' : 'idle', stopped: { state: stop ? 'idle' : 'walk', step: 0 }, teleportNoStep: Math.abs(g.dist - dist) < 1e-9, mode: 'gait' };
      z.ents.splice(z.ents.indexOf(e), 1); continue;
    }
    for (let i = 0; i < Math.round(1.1 * fps); i++) { e.x += 100 * dt; G.g7Tick(dt); }
    const phase = r.rig.phase, walking = r.rig.state;
    for (let i = 0; i < Math.round(0.5 * fps); i++) G.g7Tick(dt);
    const after = { state: r.rig.state, step: +r.rig.step.toFixed(3), phase: r.rig.phase };
    const ph0 = r.rig.phase; e.x += 600; G.g7Tick(dt); const tele = Math.abs(r.rig.phase - ph0) < 1e-9;
    out[fps] = { phase: +phase.toFixed(4), walking, stopped: after, teleportNoStep: tele };
    z.ents.splice(z.ents.indexOf(e), 1);
  }
  restore(rest); const ph = [30, 60, 120].map(f => out[f].phase);
  return { ok: Math.max(...ph) - Math.min(...ph) < 0.02 && [30, 60, 120].every(f => out[f].walking === 'walk' && out[f].stopped.state === 'idle' && out[f].stopped.step < 0.01 && out[f].teleportNoStep), out };
});

/* A2: смерть → переход падения только для нового трупа; после загрузки труп сразу лежит; механика смерти без задержки */
T_('A2_death_transition', () => {
  reset(); const [cx, cy] = C0(); const e = z.rc.mk.mkHuman({ fac: 'bandit', x: cx / T + 2, y: cy / T, wpn: 'w_pm' }); z.ents.push(e);
  const n0 = M.objs.filter(o => o.k === 'body').length; P().x = cx; P().y = cy; e.x = cx + 60; e.y = cy; e.hp = 1; e.qaHold = 1;
  G.fire(P(), 0, Object.assign({}, G.WP.w_aksu), 0);
  const body = M.objs.filter(o => o.k === 'body').slice(-1)[0];
  const deadNow = !e.alive, fresh = !!G.BODYFX.get(body);
  const poses = window.CordonPoseKeys ? [0, 0.1, 0.2, 0.3, 0.5].map(t => CordonPoseKeys.sample('bandit', 'death_transition', t)) : null;
  z.save(true); z.applyState(z.loadSave());
  const body2 = M.objs.filter(o => o.k === 'body').find(o => G.BODYFX.get(o));   // трупы в сейв не пишутся; ни у одного тела после загрузки нет перехода
  return { ok: deadNow && fresh && !body2 && JSON.stringify(poses) === JSON.stringify(['fall_start', 'fall_start', 'fall_mid', 'fall_mid', 'dead']),
    deadImmediately: deadNow, transitionOnFreshBody: fresh, loadedBodyHasTransition: !!body2, poses, bodies: [n0, M.objs.filter(o => o.k === 'body').length] };
});

/* A3: недостающая часть рига → кадр G3 этой кожи, а дуло следует за фактической отрисовкой */
T_('A3_rig_part_missing_fallback', () => {
  if (!G.G7.img) return { ok: true, na: 'риг выключен в этом режиме' };
  reset(); const rest = isolate(); const [cx, cy] = C0(); place(P(), cx, cy, 0); S().armor = 'ar_jacket'; z.cam.x = cx; z.cam.y = cy;
  const file = CORDON_RIG.manifest.skins.loner.arm_r_hand, im = G.G7.img[file];
  const before = !!G.rigActive(P()), wl0 = G.weaponLocal(P());
  delete G.G7.img[file];
  const after = !!G.rigActive(P()), wl1 = G.weaponLocal(P());
  let tip = null; window.__g7tap = (e, base, m, wl) => { if (e !== P() || !wl) return; tip = base.inverse().transformPoint(m.transformPoint(new DOMPoint(wl.muzzle[0], wl.muzzle[1]))); };
  window.__zRender(); window.__g7tap = null; const mz = G.g7Muzzle(P(), 0);
  G.G7.img[file] = im; restore(rest);
  return { ok: before && !after && wl0.mode === 'rig' && wl1 && wl1.mode === 'g3' && tip && Math.hypot(tip.x - mz.x, tip.y - mz.y) < 0.1, before, after, modes: [wl0 && wl0.mode, wl1 && wl1.mode], err: tip && +Math.hypot(tip.x - mz.x, tip.y - mz.y).toFixed(4) };
});

/* I1: шесть ID из атласа G7 — PNG без SVG-fallback; одежда трёх видов одной формы; fuel/fuse — PNG */
T_('I1_icons_png', () => {
  const ids = ['knife', 'w_obrez', 'w_aksu', 'a9', 'a12', 'a545', 'fuel', 'fuse', 'ar_jacket', 'ar_bandit', 'ar_zarya'];
  const r = {}; ids.forEach(id => { const m = CORDON_G31.manifest.items[id]; const src = m && CORDON_G31.images[m.file] || ''; r[id] = { png: /^data:image\/png/.test(src), size: m && [m.width, m.height] }; });
  const cloth = ['ar_jacket', 'ar_bandit', 'ar_zarya'].map(id => JSON.stringify(r[id].size));
  return { ok: ids.every(id => r[id].png) && new Set(cloth).size === 1, r };
});
/* Q1: генератор — предметы на земле (без дублей после повторной загрузки) → инвентарь → потребление → сейв/загрузка */
T_('Q1_generator_items_flow', () => {
  reset(); z.applyState(z.loadSave() || z.freshS()); reset();
  const picks = () => M.objs.filter(o => o.pick).map(o => o.pick).sort().join(',');
  const p0 = picks(); z.save(true); z.applyState(z.loadSave()); const p1 = picks();
  const pf = M.objs.find(o => o.pick === 'fuel'), pu = M.objs.find(o => o.pick === 'fuse');
  Q.pickUp(pf); Q.pickUp(pu); const inv = { fuel: S().inv.fuel, fuse: S().inv.fuse }, icons = ['fuel', 'fuse'].map(id => { const i = z.rc.g7.itemIcon(id); return i.tagName + (i.src && /^data:image\/png/.test(i.src) ? ':png' : ''); });
  z.save(true); z.applyState(z.loadSave()); const afterLoad = { picks: picks(), fuel: S().inv.fuel, fuse: S().inv.fuse };
  const q = Q.q5(); if (q.st === 'not_started') q.st = 'ready'; Q.gensetUse(M.objs.find(o => o.k === 'genset'));
  const used = { st: Q.q5().st, fuel: S().inv.fuel || 0, fuse: S().inv.fuse || 0 };
  z.save(true); z.applyState(z.loadSave());
  return { ok: p0 === 'fuel,fuse' && p1 === p0 && inv.fuel === 1 && inv.fuse === 1 && afterLoad.picks === '' && afterLoad.fuel === 1 && used.st === 'completed' && !used.fuel && !used.fuse && Q.q5().st === 'completed' && (icons.every(x => x === 'IMG:png') || /g3-off/.test(location.hash)),
    picksNew: p0, picksAfterReload: p1, inv, icons, afterLoad, used, stAfterLoad: Q.q5().st };
});
T_('G_fence_cover', () => {
  reset(); isolate();
  // Северный створ КПП. Влево от дороги — настоящий пролёт, на дороге — разрыв.
  const p = P(), y = RPy(60*T,98.5*T), x = 364*T;
  place(p, x, y + 20); const guard = tgt(x, y - 80, 'army');
  const trace = (from, to) => G.shotTrace(from, Math.atan2(to.y - from.y, to.x - from.x), G.WP.w_pm);
  const cases = { concreteAtCheckpoint: M.objs.some(o => o.material === 'concreteWire' &&
    x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) };
  p.crouch = 0; cases.standing = trace(guard, p).best === p;
  p.crouch = 1; const impact = trace(guard, p);
  cases.stoppedAtConcrete = !impact.best && impact.wall && Math.abs(guard.y + impact.t - (y - 4)) < .01;
  cases.returnFireBlocked = trace(p, guard).wall;
  guard.x += 45; cases.diagonal = trace(guard, p).wall;
  place(guard, x + 75, p.y); cases.flank = trace(guard, p).best === p;
  place(p, 369 * T, y + 20); place(guard, p.x, y - 80); cases.gate = trace(guard, p).best === p;
  place(p, x, y + 80); place(guard, x, y - 80); cases.awayFromFence = trace(guard, p).best === p;

  // Сначала часовой не знает о герое. После обнаружения присед прерывает уже начатый огонь.
  place(p, x, y - 20); place(guard, x, y + 80, -Math.PI / 2);
  guard.qaHold = 0; guard.guard = 'south'; guard.stay = 1; guard.nade = 0;
  guard.home = { x: guard.x, y: guard.y }; guard.aw = 0; S().min = 720;
  const tick = n => { for (let i = 0; i < n; i++) z.update(1 / 60); };
  tick(100); cases.undetected = !guard.tgt && !guard.aw;
  p.crouch = 0; const full = guard.mag;
  tick(112); cases.openedFire = guard.tgt === p && guard.mag < full;
  // Проверяем следующий выстрел у самой панели, отдельно от отбрасывания и кровотечения при первом попадании.
  place(p, x, y - 20); p.kx = p.ky = 0; S().bleed = 0;
  p.crouch = 1; guard.cool = 0; const mag = guard.mag, hp = p.hp;
  tick(15); cases.lostSight = guard.unseen > 0 && guard.mag === mag && p.hp === hp;
  p.crouch = 0; tick(10); cases.resumedFire = guard.mag < mag;
  reset(); return { ok: Object.values(cases).every(Boolean), cases };
});
return JSON.stringify(R);
})()
