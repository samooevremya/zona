(() => {
/* Проверки большого Кордона: дороги до всех мест и выходов, время в пути, отрисовка кусками,
   обзорная карта и туман, перенос сохранения со старой карты, выходы, расстановка. */
const z = __z, M = z.map, B = window.__zBig, RM = window.__zRM, R = {}, T = 32;
const S = () => z.S, P = () => z.P;
let SEEDN = 9000;
const step = n => { for (let i = 0; i < n; i++) { P().hp = Math.max(P().hp, 70); z.update(1 / 30); } };
const reset = () => { z.seed(++SEEDN); z.closePanel(); z.applyState(z.freshS()); const s = S(); s.flags.intro = 1; s.q.flash = 2; const v = M.LOC.village.anchors.safe; P().x = v[0] * T; P().y = v[1] * T; step(3); };
const Tt = (n, f) => { try { R[n] = f(); } catch (e) { R[n] = { ok: false, ERROR: String(e).slice(0, 200) }; } };
const pathLen = (ax, ay, bx, by) => { const p = z.findPath(ax, ay, bx, by); if (!p || !p.length) return -1; let L = 0, x = ax, y = ay; p.forEach(q => { L += Math.hypot(q.x - x, q.y - y); x = q.x; y = q.y; }); return L; };
const WALK = 118, RUN = 190;   // px/с, как в тесте P0-14

Tt('K1_paths_to_all_places_and_exits', () => {
  reset();
  const v = M.LOC.village.anchors.safe, fx = v[0] * T, fy = v[1] * T, bad = [], tab = {};
  M.LOCATIONS.forEach(l => {
    if (l.id === 'sid') return;
    const e = (l.entrances && l.entrances[0]) || [(l.bounds[0] + l.bounds[2]) / 2, (l.bounds[1] + l.bounds[3]) / 2];
    const f = z.plus.freeTile(e[0], e[1]), L = pathLen(fx, fy, f.x * T, f.y * T);
    if (L < 0) bad.push(l.id); else tab[l.name] = Math.round(L / WALK / 6) / 10;
  });
  const ex = { 'Свалка (север)': [128, 2.5], 'Залесье (запад)': [1.5, 118], 'Затон (восток)': [238.5, 92] };
  Object.entries(ex).forEach(([n, p]) => { const L = pathLen(fx, fy, p[0] * T, p[1] * T); if (L < 0) bad.push(n); else tab[n] = Math.round(L / WALK / 6) / 10; });
  return { ok: bad.length === 0, unreachable: bad, walkMinutesFromVillage: tab };
});
Tt('K2_crossing_time', () => {
  reset();
  const a = [128 * T, 2.5 * T], b = [128 * T, 216 * T], w = [1.5 * T, 118 * T], e = [238.5 * T, 92 * T];
  const ns = pathLen(a[0], a[1], b[0], b[1]), we = pathLen(w[0], w[1], e[0], e[1]);
  return { ok: ns > 0 && we > 0, note: 'справочно: время насквозь по дорогам без остановок', northSouth: { walkMin: +(ns / WALK / 60).toFixed(1), runMin: +(ns / RUN / 60).toFixed(1) }, westEast: { walkMin: +(we / WALK / 60).toFixed(1), runMin: +(we / RUN / 60).toFixed(1) } };
});
Tt('K3_ground_chunks', () => {
  reset();
  // ходьба: игрок идёт по шоссе с севера на юг, кадр за кадром; худший кадр = рывок при дорисовке
  let WALKH = 0; P().x = 127 * T; P().y = 10 * T; z.cam.x = P().x; z.cam.y = P().y; window.__zRender();
  for (let i = 0; i < 600; i++) { P().y += 190 / 30; P().x = (127 + 0.5) * T; z.cam.x = P().x; z.cam.y = P().y; const t0 = performance.now(); window.__zRender(); WALKH = Math.max(WALKH, performance.now() - t0); }
  WALKH = Math.round(WALKH);
  const spots = [[60, 168], [128, 8], [128, 60], [196, 142], [232, 92], [20, 118], [176, 30], [210, 40], [33, 131], [150, 106], [128, 206], [52, 100], [94, 44], [198, 186]];
  const times = [];
  spots.forEach(s => { P().x = s[0] * T; P().y = s[1] * T; z.cam.x = P().x; z.cam.y = P().y; const t0 = performance.now(); window.__zRender(); times.push(Math.round(performance.now() - t0)); });
  const after = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); window.__zRender(); after.push(Math.round(performance.now() - t0)); }
  return { ok: B.cache() <= B.GMAX && Math.max(...after) < 60, walkHitchMs: WALKH, cached: B.cache(), max: B.GMAX, firstFrameMsPerSpot: times, steadyFrameMs: after, lastChunkMs: B.gStat.ms, chunksPainted: B.gStat.painted };
});
Tt('K4_overview_and_fog', () => {
  reset();
  const mini = B.mini(), fl = B.fogLen();
  P().x = 128 * T; P().y = 100 * T; z.reveal();
  z.save(true); const raw = localStorage.getItem('zona2d-kordon-qa') || '';
  const d = JSON.parse(raw), rev = d.fog.length;
  z.applyState(z.loadSave());
  return { ok: mini[0] === B.PW() * 4 && mini[1] === B.MH() * 4 && fl === 252 * 220 && raw.length < 250000, mini, fogCells: fl, fogChars: rev, saveBytes: raw.length };
});
Tt('K5_migrate_rc1_save', () => {
  reset();
  const d = JSON.parse(JSON.stringify(S()));
  d.mapVersion = 'kordon-rc1'; d.x = 94 * T; d.y = 71.5 * T; d.money = 4321; d.q.flash = 2; d.fog = 'zzzz'; d.dyn = { v: 2, seq: 0, npcs: [] };   // старые координаты: двор АТП
  z.applyState(d); step(2);
  const exp = RM.p(94 * T, 71.5 * T), dist = Math.hypot(P().x - exp[0], P().y - exp[1]);
  const tx = Math.floor(P().x / T), ty = Math.floor(P().y / T), onNav = !!M.nav[ty * M.MW + tx];
  return { ok: S().mapVersion === 'kordon-big' && dist < 3 * T && onNav && S().money === 4321 && S().fog === '', playerAt: [tx, ty], expectedNear: [Math.round(exp[0] / T), Math.round(exp[1] / T)], onNav, news: S().news.slice(-1)[0].x };
});
Tt('K6_exit_messages', () => {
  reset(); const out = {};
  [['west', 3 * T, 118 * T], ['east', 237 * T, 92 * T], ['north', 128 * T, 3 * T]].forEach(([n, x, y]) => {
    z.clearMsgs(); P().x = x; P().y = y; for (let i = 0; i < 400 && !B.msgs().length; i++) step(1);
    out[n] = B.msgs().join(' | ');
  });
  return { ok: /Залесье/.test(out.west) && /Затон/.test(out.east) && /Свалка/.test(out.north), msgs: out };
});
Tt('K7_static_objects_clear', () => {
  const bad = [];
  M.objs.filter(o => o.static && o.solid && (o.k === 'car' || o.k === 'pylon')).forEach(o => {
    const cx = Math.floor((o.x + o.w / 2) / T), cy = Math.floor((o.y + o.h / 2) / T), t = window.__bigTiles()[cy * M.MW + cx];
    if (t !== 0 && t !== 8 && t !== 1) bad.push(o.k + '@' + cx + ',' + cy + ':t' + t);
  });
  return { ok: bad.length === 0, bad };
});
Tt('K8_npcs_on_nav', () => {
  reset(); step(30);
  const bad = z.ents.filter(e => e.alive && e !== P() && !(e.x > 240 * T)).filter(e => { const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T); return !M.nav[ty * M.MW + tx]; }).map(e => (e.name || e.sid || e.kind) + '@' + Math.floor(e.x / T) + ',' + Math.floor(e.y / T));
  return { ok: bad.length === 0, count: z.ents.filter(e => e.alive).length, offNav: bad };
});
Tt('K9_new_places_registered', () => {
  const ids = ['hutor', 'ford', 'column', 'tower', 'exit_w', 'exit_e'], miss = ids.filter(i => !M.LOC[i]);
  const sos = z.plus.SOS_SPOTS.map(s => s[2]);
  return { ok: miss.length === 0 && ['hutor', 'ford', 'column'].every(i => sos.includes(i)), missing: miss, sosPlaces: sos };
});
Tt('K10_walk_through_doors', () => {
  reset();
  // Проверяем постоянную геометрию. Случайный бой или толчок NPC не часть этой проверки.
  for (const e of z.ents) if (e !== P()) e.alive = false;
  const failures = [], tiles = window.__bigTiles();
  const bounds = M.LOC.village.bounds;
  const houses = z.gfxSnap().HOUSES;
  let villageHouses = 0, villageGroups = 0;
  let groups = 0, openCells = 0;
  for (const h of houses) {
    if (h.x >= bounds[0] && h.x < bounds[2] && h.y >= bounds[1] && h.y < bounds[3]) {
      villageHouses++; villageGroups += h.entrances.length;
    }
    for (let y = 0; y < h.h; y++) for (let x = 0; x < h.w; x++) {
      const nx = x === 0 ? -1 : x === h.w-1 ? 1 : 0, ny = y === 0 ? -1 : y === h.h-1 ? 1 : 0;
      if (Math.abs(nx)+Math.abs(ny) !== 1) continue;
      const pos = (h.y+y)*M.MW + h.x+x;
      if (![6,10].includes(tiles[pos]) || [4,5,7,9,11].includes(tiles[pos+nx+ny*M.MW])) continue;
      openCells++;
      const along = (nx ? y+.5 : x+.5)*T;
      if (!h.entrances.some(d => d.nx === nx && d.ny === ny && Math.abs(along-(nx ? d.y : d.x)) < d.width/2))
        failures.push([h.ok,x,y,'unmarked']);
    }
    for (const d of h.entrances) {
      groups++;
      const x = h.x*T+d.x, y = h.y*T+d.y;
      const distance = () => (P().x-x)*d.nx + (P().y-y)*d.ny;
      P().x = x+40*d.nx; P().y = y+40*d.ny;
      z.cam.x = x; z.cam.y = y;
      z.IN.moveX = -d.nx; z.IN.moveY = -d.ny;
      for (let i=0;i<32 && distance()>-40;i++) step(1);
      if (distance()>-40) failures.push([h.ok,d.nx,d.ny,'in',Math.round(distance())]);
      z.IN.moveX = d.nx; z.IN.moveY = d.ny;
      for (let i=0;i<32 && distance()<40;i++) step(1);
      if (distance()<40) failures.push([h.ok,d.nx,d.ny,'out',Math.round(distance())]);
      z.resetInput();
    }
  }
  return {ok: villageHouses === 6 && villageGroups >= 9 && !failures.length, houses: houses.length, groups, villageHouses, villageGroups, openCells, failures};
});
Tt('K11_pda_emission_warning', () => {
  reset();
  z.clearMsgs();
  S().min = 600;
  S().wx.until = 0;
  S().blow.next = S().min;
  step(2);
  const isWarning = text => /приближается выброс/i.test(text);
  const oneWarning = () => B.msgs().filter(isWarning).length === 1;
  const journalCount = () => S().news.filter(n => isWarning(n.x)).length;
  const started = S().blow.stage === 1 && oneWarning() && journalCount() === 1;
  const quietWeather = !B.msgs().some(t => t.startsWith('Погода:'));
  z.applyState(JSON.parse(JSON.stringify(S())));
  const resumed = oneWarning() && journalCount() === 1;
  step(305);
  const expired = !B.msgs().some(isWarning) && journalCount() === 1;
  return { ok: started && quietWeather && resumed && expired, started, quietWeather, resumed, expired };
});
Tt('K12_sos_radio', () => {
  reset();
  z.clearMsgs();
  S().sos.next = S().min;
  z.plus.sosTick();
  const sosCount = () => B.msgs().filter(text => text.startsWith('SOS!')).length;
  const received = !!S().sos.act && sosCount() === 1;
  S().blow.next = S().min;
  step(2);
  const priority = /приближается выброс/i.test(B.msgs()[0]) && sosCount() === 1;
  z.plus.finishEncounter('timeout');
  const closed = sosCount() === 0 && !B.msgs().some(text => text.includes('потеряна'));
  const journal = S().news.some(n => n.x.startsWith('SOS!')) && S().news.some(n => n.x.includes('потеряна'));
  return { ok: received && priority && closed && journal, received, priority, closed, journal };
});
Tt('K13_pda_quest_bulletin', () => {
  reset(); z.clearMsgs();
  S().q.pack = 1;
  z.ents.filter(e => e.pack === 'lair').forEach(e => { e.alive = 0; });
  // Обычный игровой цикл проверяет завершение задания.
  step(60);
  const report = S().news.find(n => n.x.includes('Стая у леса перебита'));
  const shown = !!report && B.msgs().includes(report.x);
  S().sos.next = S().min;
  z.plus.sosTick();
  const sosFirst = B.msgs()[0]?.startsWith('SOS!');
  S().blow.next = S().min; step(2);
  const order = B.msgs();
  return { ok: shown && sosFirst && /приближается выброс/i.test(order[0]) && order[1]?.startsWith('SOS!') && order.includes(report.x), shown, sosFirst };
});
Tt('K14_break_loot_search', () => {
  reset();
  const box = M.objs.find(o => o.stash === 'st9');
  const left = o => {
    for (const e of z.ents) if (e !== P()) e.alive = false;
    P().x = o.x + o.w/2 - 34; P().y = o.y + o.h/2;
    P().ang = 0; z.IN.touch = true; step(1);
  };
  const attack = weapon => {
    S().weapon = weapon; P().ang = 0; P().cool = P().reload = 0;
    z.IN.fire = true; step(1); z.IN.fire = false;
  };
  left(box);
  const sealed = box.solid && z.near?.o !== box;
  attack('knife');
  const knife = box.broken && !box.solid && z.near?.k === 'pickupLoot';
  z.save(true); z.applyState(z.loadSave()); left(box);
  const before = S().money, amount = box.loot.money;
  z.interact(); step(1); z.interact();
  const takenOnce = S().money === before + amount && box.looted && !Object.keys(box.loot).length;
  z.save(true); z.applyState(z.loadSave());
  const emptyOnLoad = box.looted && box.broken && !box.solid;
  reset(); left(box); S().mag.w_pm = 6; attack('w_pm');
  const bullet = box.broken && S().mag.w_pm === 5 && box.loot.money === amount;
  const search = {};
  for (const kind of ['safe','hiding']) {
    const o = M.objs.find(o => o.k === kind);
    left(o); attack('knife'); z.interact();
    const opens = z.panel?.kind === 'loot' && z.panel.o === o;
    const take = [...document.querySelectorAll('button')].find(b => b.textContent === 'Взять' && b.offsetWidth);
    if (opens && take) take.click();
    z.closePanel();
    const remaining = JSON.stringify(o.loot);
    z.save(true); z.applyState(z.loadSave());
    search[kind] = !!(opens && take && !o.broken && Object.keys(o.loot).length === 1 && JSON.stringify(o.loot) === remaining);
  }
  return {ok: sealed && knife && takenOnce && emptyOnLoad && bullet && search.safe && search.hiding, sealed, knife, takenOnce, emptyOnLoad, bullet, search};
});
Tt('K15_all_prop_colliders_and_containers', () => {
  reset();
  const start = M.LOC.village.anchors.safe.map(v => v*T);
  const unchecked = [], unreachable = [];
  for (const p of M.fieldProps) {
    const n = p.vertices.length;
    const x = p.vertices.reduce((sum,v) => sum+v[0],0)/n;
    const y = p.vertices.reduce((sum,v) => sum+v[1],0)/n;
    const probe = {x,y,r:11};
    M.collide(probe);
    if (Math.hypot(probe.x-x,probe.y-y)<.01) unchecked.push(p.id);
  }
  for (const o of M.objs.filter(o=>o.stash)) {
    const cx=o.x+o.w/2, cy=o.y+o.h/2;
    let reachable=false;
    for(let i=0;i<16 && !reachable;i++){
      const x=cx+35*Math.cos(i*Math.PI/8), y=cy+35*Math.sin(i*Math.PI/8);
      if(!M.nav[Math.floor(y/T)*M.MW+Math.floor(x/T)] || !M.los(x,y,cx,cy)) continue;
      const probe={x,y,r:11}; M.collide(probe);
      reachable=Math.hypot(probe.x-x,probe.y-y)<.1 && !!z.findPath(...start,x,y);
    }
    if(!reachable) unreachable.push(o.stash);
  }
  const count=M.fieldProps.length, kinds=new Set(M.fieldProps.map(p=>p.id));
  const covered=['c1_trace_pipes','c1_sandbags','c1_barrel','c1_trace_reel'].every(id=>kinds.has(id));
  return {ok:covered && !unchecked.length && !unreachable.length,count,unchecked,unreachable};
});
return JSON.stringify(R);
})()
