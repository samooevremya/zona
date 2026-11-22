(() => {
const z = __z, X = z.plus, R = {};
const __RM = window.__zRM;
const RPx = (x, y) => __RM.p(x, y)[0], RPy = (x, y) => __RM.p(x, y)[1];
const __setOld = (x, y) => { const r = __RM.p(x, y); z.P.x = r[0]; z.P.y = r[1]; };
const S = () => z.S, P = () => z.P;
const NEW = !!z.save;
const step = (n, keep) => { for (let i = 0; i < n; i++) { if (keep) keep(); else P().hp = Math.max(P().hp, 70); z.update(1 / 30); } };
const saveLoad = () => { if (NEW) { z.save(true); z.applyState(z.loadSave()); } else { const d = JSON.parse(JSON.stringify(S())); z.applyState(d); } };
let SEEDN = 1000;
const reset = () => { if (z.seed) z.seed(++SEEDN); z.closePanel && z.closePanel(); z.applyState(z.freshS()); const s = S(); s.flags.intro = 1; s.q.flash = 2; s.money = 9000; s.inv.w_aksu = 1; s.inv.a545 = 900; s.weapon = 'w_aksu'; s.mag.w_aksu = 30; s.cond.w_aksu = 100; s.inv.medkit = 20; __setOld(40 * 32, 60 * 32); step(10); };
const T = (name, fn) => { try { R[name] = fn(); } catch (e) { R[name] = { ERROR: String(e).slice(0, 160) }; } };
const optBy = (txt) => { z.talkTrader(); const o = (X.traderOpts() || []).concat(X.jobOpts ? [] : []); return o.find(x => x.t.indexOf(txt) >= 0); };

T('1_hire_save_load', () => {
  reset();
  const l = z.ents.find(e => e.alive && e.fac === 'loner' && !e.named && !e.captive && !e.guard && e.sid);
  X.hireOpts(l)[0].fn(); z.closePanel();
  __setOld(44 * 32, 70 * 32); step(30 * 6);
  X.hireOpts(l)[0].fn(); z.closePanel();   // «Жди здесь»
  l.hp = 53.37; const before = { name: l.name, x: Math.round(l.x), y: Math.round(l.y), hp: l.hp, wait: !!l.wait, left: Math.round(l.hireEnd - S().min), money: S().money };
  saveLoad(); step(2);
  const e = z.ents.find(x => x.alive && x.follow);
  const after = e ? { name: e.name, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, wait: !!e.wait, left: Math.round(e.hireEnd - S().min), money: S().money } : null;
  const ok = !!after && after.name === before.name && Math.abs(after.x - before.x) < 4 && after.hp === before.hp && after.wait === before.wait && Math.abs(after.left - before.left) < 2 && after.money === before.money;
  return { ok, before, after, followersAfterLoad: z.ents.filter(x => x.alive && x.follow).length };
});

T('2_contract_isolation', () => {
  reset();
  const A = { k: 'clear', x: __RM.t(46, 58)[0], y: __RM.t(46, 58)[1], where: 'A', n: 3, got: 0, pay: 1100, n_: 'A', d: '' };
  X.jobTake(A); step(40);
  const aGroup = z.ents.filter(e => e.alive && e.jobTag).length;
  X.jobCancel(); z.closePanel(); step(40);
  const B = { k: 'clear', x: __RM.t(110, 30)[0], y: __RM.t(110, 30)[1], where: 'B', n: 3, got: 0, pay: 1100, n_: 'B', d: '' };
  X.jobTake(B); step(40);
  const bGroup = z.ents.filter(e => e.alive && e.jobTag && Math.hypot(e.x - RPx(110 * 32, 30 * 32), e.y - RPy(110 * 32, 30 * 32)) < 400).length;
  const leftoverA = z.ents.filter(e => e.alive && e.kind === 'human' && e.fac === 'bandit' && Math.hypot(e.x - RPx(46 * 32, 58 * 32), e.y - RPy(46 * 32, 58 * 32)) < 400);
  leftoverA.forEach(e => { e.hp = 1; }); __setOld(46 * 32 - 150, 58 * 32);
  // убиваем остаток A пулями игрока
  z.IN.touch = true;
  for (let k = 0; k < 30 * 20 && leftoverA.some(e => e.alive); k++) { const t = leftoverA.find(e => e.alive); P().ang = Math.atan2(t.y - P().y, t.x - P().x); z.IN.aimStick={active:true,a:P().ang}; z.IN.btnFire = true; P().hp = 100; S().mag.w_aksu = 30; z.update(1 / 30); }
  z.resetInput();
  const j = S().jobs.act;
  return { ok: aGroup === 3 && bGroup >= 3 && j && j.got === 0, aGroupSpawned: aGroup, bGroupSpawned: bGroup, leftoverAKilled: leftoverA.filter(e => !e.alive).length, progressB: j && j.got };
});

T('3_turn_in_once', () => {
  reset();
  X.jobTake({ k: 'trophy', item: 'tail', n: 2, pay: 320, n_: 'Тр', d: '' }); S().inv.tail = 5;
  z.talkTrader(); const m0 = S().money;
  X.jobTurnIn(); X.jobTurnIn();
  const paidTwice = S().money - m0;
  saveLoad(); z.talkTrader(); X.jobTurnIn();
  return { ok: paidTwice === 320 && S().money - m0 === 320, paidAfterDoubleClick: paidTwice, paidAfterReload: S().money - m0, tailsLeft: S().inv.tail };
});

const forceSos = () => { const s = S(); if (s.sos.act) X.finishEncounter && X.finishEncounter('lost'); s.sos.act = null; s.sos.next = s.min - 1; s.sos.t = s.min - 400; __setOld(60 * 32, 75 * 32); X.sosTick(); return s.sos.act; };
T('4_sos_save_load', () => {
  reset();
  const a = forceSos(); if (!a) return { ok: false, note: 'SOS не создан' };
  const cnt = () => ({ allies: z.ents.filter(e => e.alive && e.sos === a.id).length, foes: z.ents.filter(e => e.alive && e.sosFoe === a.id).length });
  const c0 = cnt(); saveLoad(); const c1 = cnt(); step(31);
  const act1 = !!S().sos.act, lastNews1 = S().news.slice(-1)[0].x;
  // одно убийство и повторная загрузка
  const f = z.ents.find(e => e.alive && e.sosFoe === a.id); if (f) { f.hp = 0.1; z.update(1/30); }
  const f2 = z.ents.find(e => e.alive && e.sosFoe === a.id); if (f2) { f2.alive = 0; }
  const c2 = cnt(); saveLoad(); const c3 = cnt(); step(31); const act3 = !!S().sos.act;
  const uniq = new Set(z.ents.filter(e=>e.alive&&e.uid).map(e=>e.uid)).size === z.ents.filter(e=>e.alive&&e.uid).length;
  return { ok: c1.allies === c0.allies && c1.foes === c0.foes && act1 && c3.foes === c2.foes && c3.allies === c2.allies && act3 && uniq, start: c0, afterLoad: c1, activeAfterLoad: act1, newsAfterLoad: lastNews1, afterKill: c2, afterKillReload: c3, activeAfterKillReload: act3, uidsUnique: new Set(z.ents.filter(e=>e.alive&&e.uid).map(e=>e.uid)).size === z.ents.filter(e=>e.alive&&e.uid).length };
});

T('5_sos_timeout', () => {
  reset();
  const a = forceSos(); if (!a) return { ok: false };
  S().sos.act.until = S().min - 1; step(40);
  const tagged = z.ents.filter(e => e.alive && (e.sos || e.sosFoe)).length;
  return { ok: !S().sos.act && tagged === 0, activeAfter: !!S().sos.act, taggedLeft: tagged, news: S().news.slice(-1)[0].x };
});

T('6_sos_reward_once', () => {
  reset();
  const a = forceSos(); if (!a) return { ok: false };
  P().x = a.x * 32 + 60; P().y = a.y * 32; step(5);
  const m0 = S().money;
  z.ents.filter(e => e.sosFoe === a.id).forEach(e => { e.alive = 0; });
  step(40); const m1 = S().money; saveLoad(); step(40);
  return { ok: m1 > m0 && S().money === m1, reward: m1 - m0, afterReload: S().money - m0 };
});

T('7_rest_vs_hunger_bleed', () => {
  reset();
  const r = {};
  if (!X.advanceWorldTime) {
    S().food = 50; P().hp = 40; const f0 = S().food; Object.assign(P(), z.loc.locPt('village', 'fire')); P().x += 24;
    for (let i = 0; i < 3; i++) { X.restAtFire(); const o = z.panel && z.panel.opts ? z.panel.opts : null; z.closePanel(); }
    return { ok: false, note: '0.6: отдых — отдельная кнопка, сытость не тратится, см. код restAtFire' };
  }
  S().food = 50; P().hp = 40; S().bleed = 0; X.advanceWorldTime(180, 'rest');
  r.food3h = +S().food.toFixed(1); r.hp3h = Math.round(P().hp);
  S().food = 50; P().hp = 40; S().bleed = 2; const pv = X.restPreview(3);
  r.bleedBlocked = true; // кнопка отключена restBlock(); проверяем модель
  X.advanceWorldTime(180, 'rest'); r.hpWhileBleeding = Math.round(P().hp);
  S().bleed = 0; S().food = 10; P().hp = 40; X.advanceWorldTime(180, 'rest'); r.hpHungry = Math.round(P().hp); r.foodHungry = +S().food.toFixed(1);
  // напарник и отдых
  const l = z.ents.find(e => e.alive && e.fac === 'loner' && !e.named && !e.captive && !e.guard && e.sid);
  X.hireOpts(l)[0].fn(); z.closePanel(); S().food = 100; S().bleed = 0; X.advanceWorldTime(25 * 60, 'rest'); step(3);
  r.hireEndedAfterRest = !l.follow;
  S().bleed = 0; S().food = 13; r.blockedHungry = X.restBlock ? X.restBlock() : '';
  S().food = 22; P().hp = 50; const rr = X.advanceWorldTime(300, 'rest'); r.hungerStop = rr.stop; r.minutesRested = rr.minutes; r.foodAfterStop = +S().food.toFixed(1);
  r.ok = !!r.blockedHungry && !!rr.stop && rr.minutes < 300 && S().food >= 12 && r.food3h < 50 && r.hp3h > 40 && r.hpWhileBleeding === 40 && r.hpHungry <= 40 && r.hireEndedAfterRest;
  return r;
});

T('8_trophy_text_vs_pay', () => {
  reset();
  const offs = []; for (let d = 0; d < 40; d++) { S().jobs.day = -9; S().min = 360 + d * 1440; X.jobOffers().filter(o => o.k === 'trophy').forEach(o => offs.push(o)); }
  const bad = offs.filter(o => o.pay !== z.S.inv && o.pay !== (o.item === 'tail' ? 80 : 150) * 2 * o.n);
  return { ok: offs.length > 0 && bad.length === 0, checked: offs.length, mismatched: bad.length, example: offs[0] && (offs[0].d + ' → ' + offs[0].pay) };
});

T('9_vodka_no_caches', () => {
  reset();
  S().inv.vodka = 1; S().caches = S().caches || {}; for (let i = 0; i < 20; i++) S().caches[i] = 2;
  Object.assign(P(), z.loc.locPt('village', 'fire')); P().x += 24; step(3);
  X.restAtFire();
  const opt = z.panel && z.panel.opts ? null : null;
  // ищем в отрисованных кнопках панели
  const btns = [...document.querySelectorAll('#pbody button')].map(b => b.textContent);
  const vb = [...document.querySelectorAll('#pbody button')].find(b => /водки/.test(b.textContent));
  if (vb && !vb.disabled) vb.click();
  const left = S().inv.vodka || 0; z.closePanel();
  return { ok: left === 1, vodkaLeft: left, buttons: btns.filter(t => /водк|схрон/i.test(t)) };
});

T('10_first_sos_minutes', () => {
  reset(); const s = S(); s.sos = undefined; const t0 = s.min; __setOld(30 * 32, 84 * 32);
  let k = 0; while (!S().sos || !S().sos.act) { z.update(1); P().hp = 100; if (++k > 900) break; }
  const m = Math.round(S().min - t0); return { ok: !!(S().sos && S().sos.act) && m <= 180, firstSosAfterMin: m, criterion: '≤ 180 игровых мин' };
});
T('11_migrate_06_save', () => {
  if (!NEW) return { ok: true, note: 'н/п для 0.6' };
  reset();
  const d = JSON.parse(JSON.stringify(S()));
  delete d.dyn; d.rep = 5;
  d.jobs = { offer: [], day: -1, act: { k: 'clear', x: __RM.t(46, 58)[0], y: __RM.t(46, 58)[1], where: 'A', n: 3, got: 1, pay: 1100, n_: 'A', d: '' }, done: 0 };
  d.sos = { t: d.min - 50, act: { id: 777, x: 40, y: 60, where: 'болота', until: d.min + 100 } };
  z.applyState(d); step(5);
  const j = S().jobs.act;
  return { ok: !!(j && j.id && j.status === 'active') && z.ents.filter(e => e.alive && e.jobTag === j.id).length === 2 && !S().sos.act && S().rep === 5 && S().sos.next != null,
    jobId: j && j.id, groupRespawned: z.ents.filter(e => e.alive && j && e.jobTag === j.id).length, sosClosed: !S().sos.act, rep: S().rep, news: S().news.slice(-1)[0].x };
});
T('12_rest_crosses_sos_deadline', () => {
  if (!NEW) return { ok: false, note: 'в 0.6 отдых не проверяет события' };
  reset(); const a = forceSos(); if (!a) return { ok: false };
  Object.assign(P(), z.loc.locPt('village', 'fire')); P().x += 24; X.advanceWorldTime(180, 'rest'); step(2);
  return { ok: !S().sos.act && !z.ents.some(e => e.alive && (e.sos || e.sosFoe)), last: S().sos.last, news: S().news.slice(-1)[0].x };
});
T('13_sos_outcomes_without_player', () => {
  const res = [];
  for (let n = 0; n < 16; n++) {
    reset(); const a = forceSos(); if (!a) continue;
    __setOld(126 * 32, 8 * 32); const t0 = S().min; let k = 0;   // игрок в бункере: далеко от любого события
    while (S().sos.act && k++ < 30 * 200) { P().hp = 100; z.update(1 / 30); }
    const hanging = !!S().sos.act || z.ents.some(e => e.alive && (e.sos || e.sosFoe));
    res.push({ hanging, min: Math.round(S().min - t0), r: S().sos.last ? S().sos.last.reason : (S().news.slice(-1)[0].x.indexOf('погибла') >= 0 ? 'dead' : S().news.slice(-1)[0].x.indexOf('сама') >= 0 ? 'self' : '?'), dog: a.dog });
  }
  const dead = res.filter(r => r.r === 'dead'), self = res.filter(r => r.r === 'self');
  const med = arr => { const v = arr.map(r => r.min).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const early = dead.filter(r => r.min < 45).length;
  return { ok: res.length >= 12 && early === 0 && res.every(r => !r.hanging && ['dead','self','helped','timeout'].includes(r.r)), deathsBefore45s: early, hangingRuns: res.filter(r => r.hanging).length, n: res.length, dead: dead.length, self: self.length, other: res.length - dead.length - self.length, medianMinToDeath: med(dead), medianMinSelf: med(self), all: res.map(r => r.r + ':' + r.min + (r.dog ? 'п' : 'б')).join(' ') };
});
T('14_travel_minutes', () => {
  const from = { 'деревня': [30, 82], 'АТП': [92, 74], 'мост(юг)': [63, 37] };
  const spots = (X.SOS_SPOTS || [[44, 60], [80, 46], [40, 96], [108, 32], [52, 28], [16, 68], [96, 96]]).map(s => X.freeTile ? [X.freeTile(s[0], s[1]).x, X.freeTile(s[0], s[1]).y] : s);
  const tab = {};
  Object.entries(from).forEach(([nm, f]) => {
    tab[nm] = spots.map(s => { const p = z.findPath(RPx(f[0] * 32, f[1] * 32), RPy(f[0] * 32, f[1] * 32), s[0] * 32, s[1] * 32); if (!p || !p.length) return 'нет пути'; let L = 0, px = RPx(f[0] * 32, f[1] * 32), py = RPy(f[0] * 32, f[1] * 32); p.forEach(q => { const qx = q.x !== undefined ? q.x : q[0], qy = q.y !== undefined ? q.y : q[1]; L += Math.hypot(qx - px, qy - py); px = qx; py = qy; }); return Math.round(L / 118 / 6) / 10 + '/' + Math.round(L / 190 / 6) / 10; }).join('  ');
  });
  return { ok: true, note: 'мин реального времени шагом/бегом до точек ' + JSON.stringify(spots), table: tab };
});
T('15_sos_spots_reachable', () => {
  const froms = [[30, 82], [92, 74], [63, 37], [44, 92], [70, 60]]; const out = []; let spawned = 0, bad = 0;
  for (let n = 0; n < 25; n++) {
    reset(); const f = froms[n % froms.length]; __setOld(f[0] * 32, f[1] * 32);
    const s = S(); s.sos.act = null; s.sos.next = s.min - 1; s.sos.t = s.min - 400; X.sosTick(); const a = s.sos.act; if (!a) continue; spawned++;
    const ok = !!z.findPath(P().x, P().y, a.x * 32, a.y * 32); if (!ok) { bad++; out.push(a.where); }
  }
  return { ok: spawned >= 15 && bad === 0, spawned, unreachable: bad, where: out };
});
T('16_location_registry', () => {
  if (!z.loc) return { ok: false, note: 'в 0.6 справочника нет' };
  reset();
  const bad = [];
  z.loc.LOCATIONS.forEach(l => Object.entries(l.anchors).forEach(([k, a]) => (Array.isArray(a[0]) ? a : [a]).forEach(p => {
    if (l.id === 'sid' && k !== 'hatch') return;   // внутренняя часть бункера вне основной карты
    const f = X.freeTile(p[0], p[1]); if (Math.hypot(f.x - p[0], f.y - p[1]) > 2.5) bad.push(l.id + '.' + k);
  })));
  // старая версия карты: игрок в стене → переносится на проходимую клетку, задания пересчитываются
  const d = JSON.parse(JSON.stringify(S())); d.mapVersion = 'kordon-0.6'; d.x = 64 * 32 + 3; d.y = 31 * 32 + 3; d.dyn = { v: 2, seq: 0, npcs: [] };
  d.jobs.act = { id: 'c9', status: 'active', k: 'clear', loc: 'pump', x: 1, y: 1, where: 'у старой водокачки', n: 3, got: 0, pay: 1100, n_: 'X', d: '' };
  z.applyState(d);
  const j = S().jobs.act;
  const exp = z.loc.LOCATIONS.find(l => l.id === 'pump').anchors.clear;
  return { ok: bad.length === 0 && S().mapVersion === z.loc.MAP_VERSION && j.x === exp[0] && j.y === exp[1], anchorsOffNav: bad, mapVersion: S().mapVersion, remappedJob: [j.x, j.y], news: S().news.slice(-1)[0].x };
});
T('17_rest_forecast_equals_result', () => {
  const cases = [[15, 60, 0, 180, 'rest'], [50, 40, 0, 180, 'rest'], [32, 70, 0, 180, 'rest'], [40, 30, 0, 600, 'sleep'], [20, 50, 0, 300, 'rest']];
  const res = cases.map(([food, hp, bleed, mins, ctx]) => {
    reset(); S().food = food; P().hp = hp; S().bleed = bleed;
    const label = X.restLabel('Отдохнуть', mins, ctx), f = X.simRest(mins, ctx, { food, hp, bleed });
    const t0 = S().min, r = X.advanceWorldTime(mins, ctx);
    const same = Math.abs(S().food - f.food) < 1e-6 && Math.abs(P().hp - f.hp) < 1e-6 && Math.abs((S().min - t0) - f.minutes) < 1e-6;
    return { food, mins, same, label, forecast: [+f.food.toFixed(1), Math.round(f.hp), f.minutes], actual: [+S().food.toFixed(1), Math.round(P().hp), Math.round(S().min - t0)], stop: r.stop };
  });
  const c15 = res[0];
  return { ok: res.every(r => r.same) && /прервётся через 1 ч/.test(c15.label) && /15→12\.6/.test(c15.label), cases: res };
});
T('18_weapon_condition_trade', () => {
  reset(); S().money = 5000; S().inv.w_pm = 1; S().cond.w_pm = 31; S().mag.w_pm = 5; S().weapon = 'knife';
  z.openTrade(null);
  const pmCell = [...document.querySelectorAll('#pbody .tr-col.mine button')].find(b => /^ПМ/.test(b.getAttribute('aria-label')));
  pmCell.click();
  const shownSell = [...document.querySelectorAll('#pbody .cline.sell .cn')].map(e => e.textContent).join('|');
  [...document.querySelectorAll('#pbody button')].find(b => b.textContent === 'Подтвердить').click();
  const afterSell = { has: S().inv.w_pm || 0, cond: S().cond.w_pm, mag: S().mag.w_pm };
  const buyCell = [...document.querySelectorAll('#pbody .tr-col.their button')].find(b => /^ПМ/.test(b.getAttribute('aria-label')));
  buyCell.click();
  const shownBuy = [...document.querySelectorAll('#pbody .cline.buy .cn')].map(e => e.textContent).join('|');
  [...document.querySelectorAll('#pbody button')].find(b => b.textContent === 'Подтвердить').click();
  const afterBuy = { has: S().inv.w_pm || 0, cond: S().cond.w_pm, mag: S().mag.w_pm };
  z.closePanel();
  return { ok: /31%/.test(shownSell) && afterSell.has === 0 && afterSell.cond === undefined && afterSell.mag === undefined && /100%/.test(shownBuy) && afterBuy.has === 1 && afterBuy.cond === 100 && afterBuy.mag === 0,
    shownSell, afterSell, shownBuy, afterBuy };
});
T('19_personal_contacts', () => {
  reset();
  const bySid = sid => z.ents.find(e => e.sid === sid);
  const att = e => z.cardOf(e).att;
  S().rep = 40;
  const neutral = att(bySid('wolf'));
  const wounded = bySid('tolik');
  P().x = wounded.x + 12; P().y = wounded.y;
  step(1); z.interact(); z.closePanel(); saveLoad();
  const healed = att(bySid('tolik'));
  bySid('tolik').angry = 1;
  const angry = att(bySid('tolik'));
  const groups = [];
  for (const joined of [false, true]) {
    const event = forceSos();
    const ids = z.ents.filter(e => e.sos === event.id).map(e => e.uid);
    if (joined) event.pk = 1;
    X.finishEncounter('helped'); saveLoad();
    groups.push(ids.map(id => att(z.ents.find(e => e.uid === id))));
  }
  return { ok: neutral === 'нейтрал' && healed === 'друг' && angry === 'враг' &&
    groups.every(g => g.length > 0) && groups[0].every(v => v === 'нейтрал') && groups[1].every(v => v === 'друг'),
    neutral, healed, angry, groups };
});
return JSON.stringify(R);
})()
