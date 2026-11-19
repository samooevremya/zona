(() => {
const z = __z, X = z.plus, Q = z.rc, M = z.map, R = {}, T = 32;
const __RM = window.__zRM;
const RPx = (x, y) => __RM.p(x, y)[0], RPy = (x, y) => __RM.p(x, y)[1];
const __setOld = (x, y) => { const r = __RM.p(x, y); z.P.x = r[0]; z.P.y = r[1]; };
const S = () => z.S, P = () => z.P;
let SEEDN = 5000;
const step = (n) => { for (let i = 0; i < n; i++) { P().hp = Math.max(P().hp, 70); z.update(1 / 30); } };
const saveLoad = () => { z.save(true); z.applyState(z.loadSave()); };
const reset = () => { z.seed(++SEEDN); z.closePanel(); z.applyState(z.freshS()); const s = S(); s.flags.intro = 1; s.q.flash = 2; s.money = 5000; s.inv.w_aksu = 1; s.inv.a545 = 600; s.weapon = 'w_aksu'; s.mag.w_aksu = 30; s.cond.w_aksu = 100; s.inv.medkit = 10; const v = M.LOC.village.anchors.safe; P().x = v[0] * T; P().y = v[1] * T; step(5); };
const T_ = (name, fn) => { try { R[name] = fn(); } catch (e) { R[name] = { ok: false, ERROR: String(e).slice(0, 220) }; } };
const goTo = (loc, an) => { const a = M.LOC[loc].anchors[an]; P().x = a[0] * T; P().y = a[1] * T; step(3); };

T_('R1_migrate_k07_to_rc1', () => {
  reset(); localStorage.removeItem('zona2d-kordon-v2-backup-kordon-0.7');
  const d = JSON.parse(JSON.stringify(S())); d.mapVersion = 'kordon-0.7'; d.x = 64 * T + 4; d.y = 30 * T; d.money = 1234; d.inv = { w_pm: 1, a9: 33, bread: 2 }; d.q.flash = 3; d.dyn = { v: 2, seq: 0, npcs: [] };
  z.applyState(d); step(2);
  const v = M.LOC.village.anchors.safe, back = localStorage.getItem('zona2d-kordon-v2-backup-kordon-0.7') || localStorage.getItem(Object.keys(localStorage).find(k => /backup-kordon-0\.7/.test(k)) || '');
  return { ok: S().mapVersion === z.loc.MAP_VERSION && Math.hypot(P().x - v[0] * T, P().y - v[1] * T) < 40 && S().money === 1234 && S().inv.a9 === 33 && S().q.flash === 3 && !!back,
    mapVersion: S().mapVersion, playerAt: [Math.round(P().x / T), Math.round(P().y / T)], money: S().money, backupSaved: !!back, news: S().news.slice(-1)[0].x };
});
T_('R2_trader_npc_persists', () => {
  reset();
  const l = z.ents.find(e => e.alive && e.sid === 'l5'); l.inv = { bread: 3, a9: 20 }; l.money = 500;
  z.openTrade(l); z.panel.offer = { buy: { bread: 2 }, sell: {} }; z.refresh(); [...document.querySelectorAll('#pbody button')].find(b => b.textContent === 'Подтвердить').click(); z.closePanel();
  const before = { inv: JSON.stringify(l.inv), money: l.money };
  saveLoad(); const l2 = z.ents.find(e => e.alive && e.sid === 'l5');
  return { ok: !!l2 && JSON.stringify(l2.inv) === before.inv && l2.money === before.money, before, after: l2 && { inv: JSON.stringify(l2.inv), money: l2.money } };
});
T_('R3_rescued_sos_keeps_identity', () => {
  reset(); const s = S(); s.sos.act = null; s.sos.next = s.min - 1; __setOld(60 * T, 75 * T); X.sosTick(); const a = s.sos.act; if (!a) return { ok: false, note: 'нет SOS' };
  const names = z.ents.filter(e => e.alive && e.sos === a.id).map(e => e.name);
  P().x = a.x * T + 40; P().y = a.y * T; z.ents.filter(e => e.sosFoe === a.id).forEach(e => { e.alive = 0; }); step(40);
  saveLoad(); const res = z.ents.filter(e => e.alive && e.resident).map(e => e.name);
  return { ok: names.length > 0 && names.every(n => res.includes(n)), rescued: names, afterLoad: res, reason: s.sos.last && s.sos.last.reason };
});
T_('R4_light_chain_fuel_first', () => {
  reset(); const q = Q.q5();
  const fuel = z.map.objs.find(o => o.pick === 'fuel'); Q.pickUp(fuel);          // топливо до начала задания
  const w = z.ents.find(e => e.name === 'Волк'); P().x = w.x; P().y = w.y + 36; step(2); z.interact();
  const opt = [...document.querySelectorAll('#pbody .opt')].find(b => /генератор/.test(b.textContent)); opt.click(); z.closePanel();
  const st1 = q.st; const fuse = z.map.objs.find(o => o.pick === 'fuse'); Q.pickUp(fuse); const st2 = Q.q5().st;
  const m0 = S().money; Q.gensetUse(); const st3 = Q.q5().st, paid = S().money - m0; Q.gensetUse(); z.closePanel(); saveLoad(); Q.gensetUse(); z.closePanel();
  return { ok: st1 === 'collecting' && st2 === 'ready' && st3 === 'completed' && paid === 600 && S().money - m0 === 600 && !has2('fuse') && !has2('fuel') && !z.map.objs.some(o => o.pick),
    states: [st1, st2, st3], reward: paid, afterRepeatAndReload: S().money - m0 };
  function has2(id) { return (S().inv[id] || 0) > 0; }
});
T_('R5_light_chain_quest_first_and_bench', () => {
  reset(); const w = z.ents.find(e => e.name === 'Волк'); P().x = w.x; P().y = w.y + 36; step(2); z.interact();
  [...document.querySelectorAll('#pbody .opt')].find(b => /генератор/.test(b.textContent)).click(); z.closePanel();
  const t1 = X.qTargets().filter(t => t.qid === 'light').map(t => t.n);
  Q.pickUp(z.map.objs.find(o => o.pick === 'fuse')); saveLoad();
  const fuelStill = z.map.objs.some(o => o.pick === 'fuel'), fuseGone = !z.map.objs.some(o => o.pick === 'fuse');
  Q.pickUp(z.map.objs.find(o => o.pick === 'fuel')); Q.gensetUse(); z.closePanel();
  S().cond.w_aksu = 40; const m0 = S().money; Q.gensetUse(); const b = [...document.querySelectorAll('#pbody .opt')].find(x => /до 70%/.test(x.textContent)); b.click(); z.closePanel();
  // ночь: огни деревни включены
  return { ok: t1.length === 2 && fuelStill && fuseGone && Q.q5().st === 'completed' && S().cond.w_aksu === 70 && S().money < m0, targetsAtStart: t1, reloadKeepsPickState: fuelStill && fuseGone, benchCondition: S().cond.w_aksu, benchCost: m0 - S().money };
});
T_('R6_night_guest_kill_before_clues', () => {
  reset(); S().q.flash = 2; X.wolfPlusOpts().find(o => /пропадают/.test(o.t)).fn(); z.closePanel(); step(40);
  saveLoad(); step(40); const nS = z.ents.filter(e => e.kind === 'sucker' && e.alive).length;
  const s = z.ents.find(e => e.kind === 'sucker'); s.hp = 1; s.cloak = 0; P().x = s.x - 60; P().y = s.y; P().ang = 0; z.IN.touch = true;
  for (let i = 0; i < 90 && s.alive; i++) { z.IN.btnFire = true; P().ang = Math.atan2(s.y - P().y, s.x - P().x); S().mag.w_aksu = 30; P().hp = 100; z.update(1 / 30); } z.IN.btnFire = false;
  const st = S().q3.sucker; const m0 = S().money; X.wolfPlusOpts().find(o => /покончено/.test(o.t)).fn(); z.closePanel(); const paid = S().money - m0;
  saveLoad(); step(30); const again = X.wolfPlusOpts().find(o => /покончено/.test(o.t)); const sAfter = z.ents.filter(e => e.kind === 'sucker' && e.alive).length;
  return { ok: nS === 1 && st === 2 && paid === 2000 && !again && sAfter === 0 && S().q3.sucker === 3, suckersAfterReload: nS, stateAfterKill: st, reward: paid, rewardOfferedAgain: !!again, suckerRespawned: sAfter };
});
T_('R7_night_guest_clues', () => {
  reset(); S().q.flash = 2; X.wolfPlusOpts().find(o => /пропадают/.test(o.t)).fn(); z.closePanel();
  const w = z.ents.find(e => e.name === 'Волк'); P().x = w.x; P().y = w.y + 36; step(2); z.interact(); const o = [...document.querySelectorAll('#pbody .opt')].find(b => /хлев/.test(b.textContent)); o && o.click(); z.closePanel();
  goTo('farm', 'tracks'); step(40); goTo('lair', 'porch'); step(40); goTo('lair', 'inside'); step(40);
  const c = Q.q3c();
  return { ok: c.story === 1 && c.tracks === 1 && c.warned === 1 && c.barn === 1, clues: c };
});
T_('R8_one_weapon_rule', () => {
  reset(); S().inv.w_pm = 1; S().cond.w_pm = 44;
  const body = { k: 'body', name: 'Тест', x: P().x, y: P().y, loot: { w_pm: 1, a9: 10 } }; z.openLoot(body);
  const btn = [...document.querySelectorAll('#pbody .row')].find(r => /ПМ/.test(r.textContent)).querySelector('button');
  const dis = btn.disabled; z.closePanel();
  // выбросить и подобрать — состояние сохраняется
  S().weapon = 'w_aksu'; z.openPanel('inv', 'Рюкзак'); z.panel.sel = 'w_pm'; z.refresh(); [...document.querySelectorAll('#pbody button')].find(b => b.textContent === 'Выбросить').click(); z.closePanel();
  const sack = z.map.objs.find(o => o.kind === 'sack'); z.openLoot(sack); [...document.querySelectorAll('#pbody .row')].find(r => /ПМ/.test(r.textContent)).querySelector('button').click(); z.closePanel();
  return { ok: dis && S().inv.w_pm === 1 && S().cond.w_pm === 44, duplicateBlocked: dis, countAfter: S().inv.w_pm, condAfterDropPick: S().cond.w_pm };
});
T_('R9_death_and_reload', () => {
  reset(); Q.q5().st = 'collecting'; S().money = 777; z.save(true); S().money = 1; P().hp = -5; z.update(1 / 30); z.update(1 / 30);
  const d = z.loadSave(); z.applyState(d); step(3);
  return { ok: S().money === 777 && Q.q5().st === 'collecting' && P().alive, money: S().money, light: Q.q5().st };
});
T_('R10_exit_reached', () => {
  reset(); M.openBarrier(); const ok1 = !!z.findPath(P().x, P().y, M.LOC.exit.anchors.gate[0] * T, M.LOC.exit.anchors.gate[1] * T);
  goTo('exit', 'gate'); const n = z.near; Q.exitUse();
  return { ok: ok1 && n && n.k === 'exit' && S().flags.reachedExit === 1, pathFromVillage: ok1, prompt: n && n.label };
});
T_('R11_muzzle_origin', () => {
  reset(); S().weapon = 'w_pm'; S().inv.w_pm = 1; S().armor = null; P().ang = 0; P().mv = 0; const m = Q.muzzlePoint(P(), 0);
  return { ok: m.x - P().x > 18 && Math.abs(m.y - P().y) < 4, muzzleOffset: [Math.round(m.x - P().x), Math.round(m.y - P().y)], pose: Q.actorPose(P()), hitboxR: P().r };
});
T_('R12_ten_minutes_events', () => {
  reset(); let errs = 0; const t0 = performance.now(); S().sos.next = S().min + 5;
  const maxes = { ents: 0, decals: 0, parts: 0 };
  for (let i = 0; i < 600 * 10; i++) { try { P().hp = 100; z.update(0.1); } catch (e) { errs++; } if (i % 50 === 0) { maxes.ents = Math.max(maxes.ents, z.ents.length); } }
  const tagged = z.ents.filter(e => e.alive && (e.sos || e.sosFoe) && !S().sos.act).length;
  return { ok: errs === 0 && tagged === 0 && S().news.length <= 60 && maxes.ents < 120, errors: errs, maxEnts: maxes.ents, newsLen: S().news.length, hangingTags: tagged, sosHeld: (S().sos.last || {}).reason, realMs: Math.round(performance.now() - t0) };
});
T_('R13_zarya_skin_save_load', () => {
  reset(); S().inv.ar_zarya = 1; z.openPanel('inv', 'Рюкзак'); z.panel.sel = 'ar_zarya'; z.refresh(); [...document.querySelectorAll('#pbody button')].find(b => b.textContent === 'Надеть').click(); z.closePanel();
  const s1 = z.rc.g3().skin; saveLoad(); const s2 = z.rc.g3().skin; S().armor = 'ar_jacket'; const s3 = z.rc.g3().skin;
  return { ok: z.rc.g3().ready && s1 === 'zarya' && s2 === 'zarya' && s3 === 'loner', g3ready: z.rc.g3().ready, afterEquip: s1, afterLoad: s2, jacket: s3 };
});
return JSON.stringify(R);
})()
