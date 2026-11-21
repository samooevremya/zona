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
  const ex = { 'Свалка (север)': [128, 2.5], 'Малая Зона (западная дорога)': [11, 124], 'Затон (восток)': [238.5, 92] };
  Object.entries(ex).forEach(([n, p]) => { const L = pathLen(fx, fy, (240+p[0]) * T, p[1] * T); if (L < 0) bad.push(n); else tab[n] = Math.round(L / WALK / 6) / 10; });
  return { ok: bad.length === 0, unreachable: bad, walkMinutesFromVillage: tab };
});
Tt('K2_crossing_time', () => {
  reset();
  const a = [368 * T, 2.5 * T], b = [368 * T, 216 * T], w = [251.5 * T, 124.5 * T], e = [478.5 * T, 92 * T];
  const ns = pathLen(a[0], a[1], b[0], b[1]), we = pathLen(w[0], w[1], e[0], e[1]);
  return { ok: ns > 0 && we > 0, note: 'справочно: время насквозь по дорогам без остановок', northSouth: { walkMin: +(ns / WALK / 60).toFixed(1), runMin: +(ns / RUN / 60).toFixed(1) }, westEast: { walkMin: +(we / WALK / 60).toFixed(1), runMin: +(we / RUN / 60).toFixed(1) } };
});
Tt('K3_ground_chunks', () => {
  reset();
  // ходьба: игрок идёт по шоссе с севера на юг, кадр за кадром; худший кадр = рывок при дорисовке
  let WALKH = 0; P().x = 367 * T; P().y = 10 * T; z.cam.x = P().x; z.cam.y = P().y; window.__zRender();
  for (let i = 0; i < 600; i++) { P().y += 190 / 30; P().x = (367 + 0.5) * T; z.cam.x = P().x; z.cam.y = P().y; const t0 = performance.now(); window.__zRender(); WALKH = Math.max(WALKH, performance.now() - t0); }
  WALKH = Math.round(WALKH);
  const spots = [[60, 168], [128, 8], [128, 60], [196, 142], [232, 92], [20, 118], [176, 30], [210, 40], [33, 131], [150, 106], [128, 206], [52, 100], [94, 44], [198, 186]];
  const times = [];
  spots.forEach(s => { P().x = (240+s[0]) * T; P().y = s[1] * T; z.cam.x = P().x; z.cam.y = P().y; const t0 = performance.now(); window.__zRender(); times.push(Math.round(performance.now() - t0)); });
  const after = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); window.__zRender(); after.push(Math.round(performance.now() - t0)); }
  return { ok: B.cache() <= B.GMAX && Math.max(...after) < 60, walkHitchMs: WALKH, cached: B.cache(), max: B.GMAX, firstFrameMsPerSpot: times, steadyFrameMs: after, lastChunkMs: B.gStat.ms, chunksPainted: B.gStat.painted };
});
Tt('K4_overview_and_fog', () => {
  reset();
  const mini = B.mini(), fl = B.fogLen();
  P().x = 368 * T; P().y = 100 * T; z.reveal();
  z.save(true); const raw = localStorage.getItem('zona2d-kordon-qa') || '';
  const d = JSON.parse(raw), rev = d.fog.length;
  z.applyState(z.loadSave());
  return { ok: mini[0] === B.PW() * 4 && mini[1] === B.MH() * 4 && fl === M.MW * 220 && B.PW() === 480 && raw.length < 250000, mini, fogCells: fl, fogChars: rev, saveBytes: raw.length };
});
Tt('K5_migrate_rc1_save', () => {
  reset();
  const d = JSON.parse(JSON.stringify(S()));
  d.mapVersion = 'kordon-rc1'; d.x = 94 * T; d.y = 71.5 * T; d.money = 4321; d.q.flash = 2; d.fog = 'zzzz'; d.dyn = { v: 2, seq: 0, npcs: [] };   // старые координаты: двор АТП
  z.applyState(d); step(2);
  const exp = RM.p(94 * T, 71.5 * T), dist = Math.hypot(P().x - exp[0], P().y - exp[1]);
  const tx = Math.floor(P().x / T), ty = Math.floor(P().y / T), onNav = !!M.nav[ty * M.MW + tx];
  return { ok: S().mapVersion === 'kordon-west' && dist < 3 * T && onNav && S().money === 4321 && S().fog === '', playerAt: [tx, ty], expectedNear: [Math.round(exp[0] / T), Math.round(exp[1] / T)], onNav, news: S().news.slice(-1)[0].x };
});
Tt('K6_exit_messages', () => {
  reset(); const out = {};
  [['east', 477 * T, 92 * T], ['north', 368 * T, 3 * T]].forEach(([n, x, y]) => {
    z.clearMsgs(); P().x = x; P().y = y; for (let i = 0; i < 400 && !B.msgs().length; i++) step(1);
    out[n] = B.msgs().join(' | ');
  });
  return { ok: /Затон/.test(out.east) && /Свалка/.test(out.north), msgs: out };
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
  const bad = z.ents.filter(e => e.alive && e !== P() && !(e.x > 480 * T)).filter(e => { const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T); return !M.nav[ty * M.MW + tx]; }).map(e => (e.name || e.sid || e.kind) + '@' + Math.floor(e.x / T) + ',' + Math.floor(e.y / T));
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
  const approaches = {earth:0, rubble:0, slab:0, porch:0};
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
      if (Object.hasOwn(approaches, d.approach)) approaches[d.approach]++;
      else failures.push([h.ok, 'unknown approach', d.approach]);
      if (d.breach && d.approach !== 'rubble') failures.push([h.ok, 'breach surface']);
      if (d.approach === 'porch' && (d.ny !== 1 || !h.porchDepth)) failures.push([h.ok,'canopy missing']);
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
  return {ok: villageHouses === 6 && villageGroups >= 9 && approaches.porch === 2 &&
    Object.values(approaches).every(n => n > 0) && !failures.length,
    houses: houses.length, groups, villageHouses, villageGroups, openCells, approaches, failures};
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
function approachDrop(o,drop) {
  P().x=o.x+(o.w||0)/2+drop.dx; P().y=o.y+(o.h||0)/2+drop.dy; step(1);
  return z.near?.k==='groundItem' && z.near.o===o && z.near.drop===drop;
}
function gatherCrate(o) {
  for(const drop of [...(S().flags.groundItems?.[o.stash] || [])]) {
    if(!approachDrop(o,drop)) return false;
    z.interact();
  }
  return !Object.keys(o.loot).length;
}
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
  const knife = box.broken && !box.solid && S().flags.groundItems[box.stash].length===5;
  z.save(true); z.applyState(z.loadSave()); left(box);
  const before = S().money, amount = box.loot.money, bandages=S().inv.bandage;
  const layout=S().flags.groundItems[box.stash], bandage=layout.find(d=>d.id==='bandage');
  const targeted=approachDrop(box,bandage); z.interact();
  const justOne=targeted && box.loot.bandage===1 && box.loot.cans===2 && box.loot.money===amount &&
    S().inv.bandage===bandages+1 && !layout.includes(bandage);
  const remainingLayout=JSON.stringify(layout);
  z.save(true); z.applyState(z.loadSave()); left(box);
  const stable=JSON.stringify(S().flags.groundItems[box.stash])===remainingLayout;
  const takenOnce=justOne && stable && gatherCrate(box) && S().money===before+amount && box.looted &&
    !S().flags.groundItems?.[box.stash];
  z.save(true); z.applyState(z.loadSave());
  const emptyOnLoad = box.looted && box.broken && !box.solid;
  reset(); left(box); S().mag.w_pm = 6; attack('w_pm');
  const bullet = box.broken && S().mag.w_pm === 5 && box.loot.money === amount;
  const search = {};
  for (const kind of ['safe','hiding']) {
    const o = M.objs.find(o => o.k === kind && !o.anomalyId);
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
Tt('K14_individual_items_and_capacity', () => {
  reset();
  for(const e of z.ents) if(e!==P()) e.alive=false;
  const box=M.objs.find(o=>o.stash==='st1');
  P().x=box.x-20; P().y=box.y+box.h/2; P().ang=0; z.IN.touch=true;
  z.IN.fire=true; step(1); z.IN.fire=false;
  const layout=S().flags.groundItems[box.stash];
  const ammo=layout.find(d=>d.id==='a9'), kit=layout.find(d=>d.id==='medkit');
  S().inv={ar_jacket:1,cans:60,bandage:4,a9:7}; // 34,97 кг: ещё три патрона.
  const n=box.loot.a9;
  const aimed=approachDrop(box,ammo); z.interact();
  const partial=aimed && S().inv.a9===10 && box.loot.a9===n-3 && layout.includes(ammo);
  const blocked=approachDrop(box,kit); z.interact();
  const kept=blocked && box.loot.medkit===1 && !S().inv.medkit && layout.includes(kit);
  S().inv.cans=50; z.interact();
  const selectedOnly=!box.loot.medkit && box.loot.a9===n-3 && box.loot.money===250;
  S().inv.w_pm=1; S().cond.w_pm=62; S().mag.w_pm=4;
  z.openPanel('inv','Рюкзак'); z.panel.sel='w_pm'; z.refresh();
  [...document.querySelectorAll('.inv-detail button')].find(b=>b.textContent==='Выбросить').click(); z.closePanel();
  const sack=M.objs.find(o=>o.kind==='sack'); step(1);
  const gun=sack.groundItems[0], onGun=approachDrop(sack,gun); z.interact();
  const droppedGun=onGun && !M.objs.includes(sack) && S().cond.w_pm===62 && S().mag.w_pm===4;
  return {ok:partial && kept && selectedOnly && droppedGun,partial,kept,selectedOnly,droppedGun};
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
      const field=o.anomalyId && z.gfxSnap().ANOM0.find(a=>a.id===o.anomalyId);
      // NPC navigation avoids even dormant fields. The last metres to a guarded
      // stash must be physically walkable from the closest safe approach.
      const reach=field ? field.r+2*T : 35;
      const sx=cx+reach*Math.cos(i*Math.PI/8), sy=cy+reach*Math.sin(i*Math.PI/8);
      if(!M.nav[Math.floor(sy/T)*M.MW+Math.floor(sx/T)] || !M.los(x,y,cx,cy) || !z.findPath(...start,sx,sy)) continue;
      reachable=true;
      const n=Math.max(1,Math.ceil((reach-35)/4));
      for(let j=0;j<=n;j++){
        const px=sx+(x-sx)*j/n,py=sy+(y-sy)*j/n,probe={x:px,y:py,r:11};
        M.collide(probe);
        if(Math.hypot(probe.x-px,probe.y-py)>=.1){reachable=false;break;}
      }
    }
    if(!reachable) unreachable.push(o.stash);
  }
  const count=M.fieldProps.length, kinds=new Set(M.fieldProps.map(p=>p.id));
  const covered=['c1_trace_pipes','c1_sandbags','c1_barrel','c1_trace_reel'].every(id=>kinds.has(id));
  return {ok:covered && !unchecked.length && !unreachable.length,count,unchecked,unreachable};
});
Tt('K16_roaming_field_crates', () => {
  reset();
  const stock = () => S().flags.fieldCrates;
  const intact = () => M.objs.filter(o => o.fieldTile != null && !o.broken);
  const sector = tile => Math.floor((tile%M.MW)*3/B.PW()) + (Math.floor(tile/M.MW)>=B.MH()/2 ? 3 : 0);
  const initial = intact(), sectors = [0,0,0,0,0,0];
  for (const o of initial) sectors[sector(o.fieldTile)]++;
  const oldSites = initial.map(o=>o.fieldTile);
  for (const o of initial) {
    for (const e of z.ents) if (e !== P()) e.alive = false;
    P().x=o.x-20; P().y=o.y+o.h/2; P().ang=0; P().cool=0;
    z.IN.touch=true; z.IN.fire=true; step(1); z.IN.fire=false;
  }
  const timers = stock().slots.map(s=>s.due);
  const broken = !intact().length && timers.every(t=>t>=S().min+118 && t<=S().min+240);
  const first = initial[0], originalLoot = JSON.stringify(stock().drops[first.fieldTile]);
  // Забираем второй ящик. Содержимое первого ждёт игрока на старом месте даже после замены.
  const second=initial[1]; gatherCrate(second);
  const picked = !Object.keys(stock().drops[second.fieldTile]||{}).length;
  z.save(true); z.applyState(z.loadSave());
  S().min=Math.min(...timers)-1; step(1);
  const waiting = !intact().length && JSON.stringify(stock().slots.map(s=>s.due))===JSON.stringify(timers);
  S().food=100; z.plus.advanceWorldTime(180,{});
  const newSites=stock().slots.map(s=>s.tile);
  const renewed = intact().length===24 && new Set(newSites).size===24 &&
    newSites.every((t,i)=>sector(t)!==sector(oldSites[i]) && Math.hypot(t%M.MW-oldSites[i]%M.MW,Math.floor(t/M.MW)-Math.floor(oldSites[i]/M.MW))>=32);
  const saved=JSON.stringify(stock());
  z.save(true); z.applyState(z.loadSave());
  const restored=JSON.stringify(stock())===saved && intact().length===24;
  const drops=M.objs.filter(o=>o.fieldTile===first.fieldTile && o.broken);
  const kept=drops.length===1 && JSON.stringify(drops[0].loot)===originalLoot && !Object.keys(stock().drops[second.fieldTile]).length;
  if (drops.length) {
    gatherCrate(drops[0]);
  }
  const collected=!Object.keys(stock().drops[first.fieldTile]).length;
  return {ok:sectors.every(n=>n===4) && broken && waiting && renewed && restored && picked && kept && collected,
    sectors,broken,waiting,renewed,restored,picked,kept,collected};
});
Tt('K17_crate_remains_expire', () => {
  reset();
  const flags = () => S().flags;
  const loose = () => M.objs.filter(o => o.fieldTile != null);
  const fixed = M.objs.find(o => o.stash === 'st9');
  const [full, empty] = loose().filter(o => !o.broken);
  const hit = o => {
    for (const e of z.ents) if (e !== P()) e.alive = false;
    P().x=o.x-20; P().y=o.y+13; P().ang=0; P().cool=0;
    z.IN.touch=true; z.IN.fire=true; step(1); z.IN.fire=false;
  };
  hit(fixed); hit(full); hit(empty); gatherCrate(empty);
  const end = flags().crateCleanup[fixed.stash];
  const fullEnd = flags().crateCleanup[full.stash], emptyEnd = flags().crateCleanup[empty.stash];
  const snapshot = () => { z.save(true); return z.loadSave(); };
  const brokenSave = snapshot();
  const lookup = o => M.objs.find(b => b.stash === o.stash && b.broken);
  S().min = end-.2; step(1);
  z.applyState(snapshot());
  const before = !!lookup(fixed) && Object.keys(lookup(full).loot).length > 0 && !Object.keys(lookup(empty).loot).length;
  const sameDeadline = flags().crateCleanup[fixed.stash] === end;
  S().min = end; step(1);
  const firstOnly = !lookup(fixed) && !!lookup(empty);
  S().food=100; z.plus.advanceWorldTime(60,'sleep');
  const isClean = () => !flags().groundItems && !flags().crateCleanup && !Object.keys(flags().fieldCrates.drops).length &&
    flags()['st_'+fixed.stash]===2 && !('contents_'+fixed.stash in flags()) && !('broken_'+fixed.stash in flags()) &&
    !lookup(fixed) && !lookup(full) && !lookup(empty) && loose().filter(o=>!o.broken).length === 24;
  const rested = isClean(); z.applyState(snapshot()); const reloaded = isClean();
  const overdue = JSON.parse(JSON.stringify(brokenSave)); overdue.min = emptyEnd+1; z.applyState(overdue);
  const cleanedOnLoad = isClean();
  const old = JSON.parse(JSON.stringify(brokenSave)); delete old.flags.crateCleanup; z.applyState(old);
  const migrated = flags().crateCleanup[full.stash] === old.min+360 && !!lookup(full);
  S().min += 361; step(1); const oldClean = isClean();
  reset();
  const fresh = !!M.objs.find(o=>o.stash===fixed.stash && o.solid && !o.broken && Object.keys(o.loot).length);
  return {ok:before && sameDeadline && firstOnly && rested && reloaded && cleanedOnLoad && migrated && oldClean && fresh && fullEnd<=emptyEnd,
    before,sameDeadline,firstOnly,rested,reloaded,cleanedOnLoad,migrated,oldClean,fresh};
});
Tt('K18_trader_counter_and_stairs', () => {
  reset();
  const sid = z.ents.find(e => e.sid === 'sid'), counter = M.objs.find(o => o.k === 'counter');
  const stack = M.objs.find(o => o.shopStack) || M.objs.find(o => o.k==='crate' && o.x>480*T);
  const anchor = z.loc.locPt('sid','trader');
  const aligned = Math.abs(sid.y-anchor.y)<1 && Math.abs(sid.x-anchor.x)<1;
  P().x=sid.x; P().y=counter.y+counter.h+45;
  z.IN.moveY=-1; step(30); z.resetInput();
  const stopped = Math.abs(P().y-(counter.y+counter.h+P().r))<1;
  const ready = z.near?.k==='trader' && (!stack.shopStack || sid.deskLook>.65);
  z.interact();
  const talking = z.panel?.kind==='trader'; z.closePanel();
  P().x=stack.x-32; P().y=stack.y+stack.h/2;
  z.IN.moveX=1; step(20); z.resetInput();
  const cratesSolid=Math.abs(P().x-(stack.x-P().r))<1;
  const stairs=z.loc.locPt('sid','stairs');
  P().x=stairs.x; P().y=stairs.y; step(1);
  const up=z.near?.k==='up'; z.interact(); step(30);
  const down=z.near?.k==='down'; z.interact(); step(30);
  const returned=P().x>480*T;
  return {ok:aligned && stopped && ready && talking && cratesSolid && up && down && returned,
    aligned,stopped,ready,talking,cratesSolid,up,down,returned};
});
Tt('K19_outer_gates_and_old_bunker_save', () => {
  reset();
  const hatch=z.loc.locPt('sid','hatch'), spawn=z.loc.locPt('sid','spawn');
  const frames=M.objs.filter(o=>o.k==='gateFrame');
  if (!frames.length) return {ok:location.hash.includes('sid-shop-off')};
  let blocked=true;
  for(const frame of frames.slice(0,2)){
    P().x=frame.x+frame.w/2; P().y=frame.y+frame.h+P().r+10;
    z.IN.moveY=-1; step(15); z.resetInput();
    blocked=blocked && Math.abs(P().y-frame.y-frame.h-P().r)<1;
  }
  P().x=hatch.x; P().y=hatch.y+65;
  z.IN.moveY=-1; step(16); z.resetInput();
  const walkIn=z.near?.k==='down';
  z.interact(); step(30);
  const landed=Math.abs(P().x-spawn.x)<1 && P().y>spawn.y;
  // Координаты у стены и у старой лестницы сохранены предыдущей версией подвала.
  const oldPositions=[[spawn.x+4*T,8.8*T],[spawn.x,11.3*T]];
  const migrated=oldPositions.every(([x,y])=>{
    z.save(true); const save=z.loadSave(); save.x=x; save.y=y; z.applyState(save);
    return Math.abs(P().x-spawn.x)<1 && Math.abs(P().y-spawn.y)<1;
  });
  const insideY=spawn.y+8; P().y=insideY; z.save(true); z.applyState(z.loadSave());
  const kept=Math.abs(P().y-insideY)<1;
  return {ok:frames.length===3 && blocked && walkIn && landed && migrated && kept,blocked,walkIn,landed,migrated,kept};
});
Tt('K20_bolt_crossing', () => {
  const gate=z.gfxSnap().ANOM0.find(a=>a.id==='ditch-electra');
  const pass=[];
  // Walk the centre and both shoulders, from each bank of the embankment.
  for (const dir of [-1,1]) for (const side of [-16,0,16]) for (const probe of [false,true]) {
    reset();
    const p=P(); p.x=gate.x+side;p.y=gate.y-dir*100;p.ang=dir*Math.PI/2;
    Object.assign(z.IN,{touch:true,moveX:0,moveY:0});
    if(probe) {
      document.getElementById('b-bolt').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      step(20);
    }
    z.IN.moveY=dir;step(61);z.IN.moveY=0;
    pass.push({dir,side,probe,across:(p.y-gate.y)*dir>78,alarm:z.ents.some(e=>e.guard==='bridge' && e.angry)});
  }
  reset();P().x=gate.x;P().y=gate.y+100;P().ang=-Math.PI/2;z.IN.touch=true;
  const bolt=()=>document.getElementById('b-bolt').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
  bolt();step(24);
  const until=S().flags.anomalyDischarges?.[gate.id];
  z.save(true);z.applyState(z.loadSave());const restored=until>S().min && S().flags.anomalyDischarges?.[gate.id]===until;
  P().ang=-Math.PI/2;bolt();step(24);
  const fixed=S().flags.anomalyDischarges?.[gate.id]===until;
  step(160);
  const rearmed=!S().flags.anomalyDischarges?.[gate.id];
  return {ok:pass.every(v=>v.probe===v.across && !v.alarm)&&restored&&fixed&&rearmed,pass,restored,fixed,rearmed};
});
Tt('K21_vortex_cache', () => {
  reset();const o=M.objs.find(o=>o.stash==='column_wayman');
  const a=z.gfxSnap().ANOM0.find(a=>a.id===o.anomalyId);
  Object.assign(P(),{x:a.x,y:a.y+90,ang:-Math.PI/2});z.IN.touch=true;
  // Walk in from outside the field and check the actual search prompt in each phase.
  const cue=()=>z.near?.label || '';
  const offset=((Math.floor(a.x/T)*17+Math.floor(a.y/T)*31)%80)/10;
  const phase=t=>{S().min+=((8-(S().min+offset)%8)%8)+t;};
  phase(3.8);
  document.getElementById('b-bolt').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));step(20);
  const notDischarged=!S().flags.anomalyDischarges?.[a.id];
  z.IN.moveY=-1;step(16);z.IN.moveY=0;
  const wait=cue().includes('дождись');
  z.interact();const denied=!z.panel;
  const hp=P().hp;
  step(14);const pull=P().hp<hp || Math.hypot(P().kx,P().ky)>0;
  Object.assign(P(),{x:a.x,y:a.y+90,kx:0,ky:0});phase(.1);
  z.IN.moveY=-1;step(18);z.IN.moveY=0;
  const found=z.near?.o===o && cue().includes('Обыскать');
  z.interact();const opened=z.panel?.kind==='loot' && z.panel.o===o;
  const buttons=()=>[...document.querySelectorAll('#pbody button')].filter(e=>e.textContent==='Взять' && !e.disabled);
  const before=JSON.stringify(o.loot);if(opened)buttons()[0]?.click();const partial=JSON.stringify(o.loot);
  z.closePanel();z.save(true);z.applyState(z.loadSave());
  const persisted=partial!==before && JSON.stringify(o.loot)===partial;
  phase(.1);step(1);z.interact();if(z.panel?.o===o){for(let i=0;i<5&&buttons().length;i++)buttons()[0].click();}
  z.closePanel();z.save(true);z.applyState(z.loadSave());
  const once=o.looted && !Object.keys(o.loot).length;
  return {ok:notDischarged&&wait&&denied&&pull&&found&&opened&&persisted&&once,notDischarged,wait,denied,pull,found,opened,persisted,once};
});

// Игровые действия, а не прямое изменение нового сюжетного этапа.
function cordonPlay(quiet,loss=false) {
  const checkpoint=()=>S().flags.cordonStage;
  const assert=(v,n)=>{if(!v) throw Error(n+' / '+checkpoint()+' / '+z.near?.label);};
  const btn=part=>{const b=[...document.querySelectorAll('#pbody .opt')].find(el=>el.textContent.includes(part));assert(b,part);b.click();};
  const reload=()=>{z.closePanel();z.save(true);z.applyState(z.loadSave());hold();};
  const hold=()=>z.ents.forEach(e=>{if(!e.storyMan && e!==P()) e.qaHold=1;});
  const tick=()=>{S()._plusT=0;step(1);};
  const interactAt=(p,match)=>{
    z.closePanel();
    for(const length of [25,14,35,3,42]) for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4, x=p.x+length*Math.cos(angle),y=p.y+length*Math.sin(angle);
      const probe={x,y,r:11};M.collide(probe);if(Math.hypot(x-probe.x,y-probe.y)>1)continue;
      Object.assign(P(),{x,y});tick();
      if(match(z.near)){z.interact();return;}
    }
    throw Error('Нет точки взаимодействия '+JSON.stringify([p.x,p.y])+' / '+checkpoint()+' / '+z.near?.label);
  };
  const actor=id=>z.ents.find(e=>e.alive && e.sid===id);
  const talk=id=>interactAt(actor(id),n=>n?.k==='talk' && n.e.sid===id);
  const use=(loc,anchor,kind)=>interactAt(z.loc.locPt(loc,anchor),n=>n?.k===kind);
  const stage=n=>assert(checkpoint()===n,n);
  reset();hold();const s=S();
  if(loss){
    // Начало через настоящие разговоры, освобождение и лечение, включая повторный визит в бункер.
    s.q.flash=0;s.flags.intro=0;z.talkTrader();z.closePanel();z.talkTrader();btn('Что за работа');z.closePanel();
    talk('wolf');btn('Я насчёт');z.closePanel();
    for(const e of z.ents) if(e.fac==='bandit') e.alive=0;
    interactAt(actor('shust'),n=>n?.k==='free');assert(S().q.flash===3,'флешка');z.closePanel();
    z.talkTrader();btn('Отдать флешку');btn('Что со Стрелком');z.closePanel();
    interactAt(actor('fox'),n=>n?.k==='heal');z.closePanel();for(const d of z.ents) if(d.pack==='foxdogs') d.alive=0;
    tick();talk('fox');btn('Что знаешь');z.closePanel();tick();stage('voice');
    talk('shust');stage('confirm');z.closePanel();
  }else if(quiet){
    // Сохранение предыдущей версии: Лис уже найден и северные ворота осмотрены.
    s.flags.flashDone=s.flags.shustFree=s.flags.foxUp=s.flags.reachedExit=1;s.q.flash=s.q2.fox=4;
    reload();tick();stage('voice');talk('shust');stage('confirm');z.closePanel();
  }else{
    // Потеря обоих первоначальных свидетелей и заранее опустошённый схрон.
    s.dead.shust=s.dead.fox=1;s.q.flash=4;s.flags.flashFail=1;
    reload();tick();stage('broken');
    use('atp','garage','story');stage('decode');z.closePanel();z.talkTrader();btn('Прочитать память');stage('foxNote');
    use('farm','fox','story');stage('confirm');
    const stash=M.objs.find(o=>o.stash==='column_wayman');stash.loot={};stash.looted=true;
  }
  talk('wolf');btn('Кто ушёл');stage('relay');
  use('relay','booth','story');stage('cache');
  const stash=M.objs.find(o=>o.stash==='column_wayman'),note={x:stash.x+stash.w/2,y:stash.y+stash.h/2},offset=((Math.floor(note.x/T)*17+Math.floor(note.y/T)*31)%80)/10;
  S().min+=((8-(S().min+offset)%8)%8)+.1;
  interactAt(note,n=>n?.k==='loot');stage('tracks');
  interactAt(note,n=>n?.k==='story');stage('rescue');
  reload();assert(z.ents.filter(e=>e.storyMan).length===2,'двое у колонны');
  talk('column_spool');btn(quiet?'Сохранить тишину':'Вызвать помощь');
  stage(quiet?'escort':'pickup');reload();
  if(loss){
    for(const e of z.ents.filter(e=>e.storyMan)){e.alive=0;S().dead[e.sid]=1;}
    tick();stage('lastLog');reload();use('column','wreck','story');
  }else if(quiet){
    const safe=z.loc.locPt('farm','safe'),start=actor('column_chalk');
    Object.assign(P(),safe);tick();stage('escort'); // игрок один не закрывает этап
    const route=z.findPath(start.x,start.y,safe.x,safe.y);assert(route?.length,'дорога до фермы');
    for(const p of route){
      Object.assign(P(),{x:p.x,y:p.y}); // игрок ведёт по дороге, NPC проходят её своим AI
      for(let i=0;i<9;i++) z.update(1/12);
    }
    for(let i=0;i<110 && checkpoint()==='escort';i++) z.update(1/12);
    assert(checkpoint()==='listen','ферма '+[actor('column_spool'),actor('column_chalk')].map(e=>[Math.round(e.x/T),Math.round(e.y/T)])+' цель '+safe.x/T+','+safe.y/T);
    use('relay','booth','story');
  }else{
    Object.assign(P(),z.loc.locPt('village','fire'));tick();
    assert(S().flags.cordonExtracted,'прибытие носилок');talk('column_spool');
  }
  stage('north');reload();
  const count=S().stats.q;
  use('exit','gate','exit');stage('done');
  assert(z.panel.lines.some(l=>l.t.includes(loss?'Имена тоже':quiet?'Седьмой вагон':'деревни передали')),'ответ Серого');
  reload();use('exit','gate','exit');assert(S().stats.q===count+1,'финал один раз');
  const chapters=z.plus.qList().filter(q=>q.id.startsWith('cordon'));
  assert(chapters.length===4 && chapters.every(q=>q.st==='d'),'четыре главы в журнале');
  return {ok:true,quiet,chapters:chapters.length};
}
Tt('K22_open_channel_and_lost_witnesses',()=>cordonPlay(false));
Tt('K23_radio_silence_and_old_save',()=>cordonPlay(true));
Tt('K24_fresh_start_and_emergency_log',()=>cordonPlay(false,true));

Tt('K25_bridge_toll', () => {
  const guards=()=>z.ents.filter(e=>e.alive && e.guard==='bridge');
  const gate=M.objs.find(o=>o.key==='bar'), x=gate.x+gate.w/2, y=gate.y+gate.h/2;
  const enter=(dir,offset=0)=>{
    Object.assign(P(),{x:x+offset,y:y-dir*34,ang:dir*Math.PI/2});
    z.IN.moveX=0; z.IN.moveY=dir;
  };
  const jump=()=>{window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyV'}));step(14);z.IN.moveY=0;};
  const shots=()=>guards().reduce((n,e)=>n+e.mag,0);
  const crossings=[];
  for(const dir of [-1,1]){
    reset(); enter(dir); step(12); // Попытка пройти пешком упирается в балку.
    const stopped=(P().y-y)*dir<0 && guards().every(e=>!e.angry);
    const rounds=shots();jump();
    const crossed=(P().y-y)*dir>0, alarm=guards().every(e=>e.angry);
    step(75);
    crossings.push(stopped && crossed && alarm && shots()<rounds);
  }
  z.save(true);z.applyState(z.loadSave());
  const local=guards().every(e=>e.angry) && !S().flags.armyAngry && z.ents.filter(e=>e.guard==='south').every(e=>!e.angry);
  reset(); S().money=700;
  const post=guards()[0];Object.assign(P(),{x:post.x,y:post.y+24});step(1);z.interact();
  const pay=[...document.querySelectorAll('#pbody .opt')].find(el=>el.textContent.includes('Пропусти за 500'));
  if(!pay) throw Error('У моста недоступна оплата');
  pay.click();z.closePanel();z.save(true);z.applyState(z.loadSave());
  const paid=S().money===200 && !gate.solid && S().flags.bridgePaid;
  const safe=[-1,1].every(dir=>{enter(dir);step(23);z.IN.moveY=0;return (P().y-y)*dir>0 && guards().every(e=>!e.angry);});
  return {ok:crossings.every(Boolean) && local && paid && safe,crossings,local,paid,safe};
});

Tt('D1_detectors_purchase_range_and_pickup', () => {
  reset();
  S().money = 6800;
  const [x,y] = RM.p(60.2*T,18.6*T);
  const stand = metres => { P().x=x-metres*T/1.5; P().y=y; step(1); };
  const signal = () => Number.isFinite(P().detD) && P().detT > 0;
  const key = digit => window.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit'+digit}));
  const controls = () => Array.from(document.querySelectorAll('#pbody button'));
  stand(0); key(6);
  const absent = !signal() && z.near?.k !== 'art' && S().weapon === 'knife';
  z.openTrade(null);
  for (const name of ['Искра','Контур','Спектр']) controls().find(b=>b.getAttribute('aria-label')?.startsWith('Детектор «'+name+'»,')).click();
  controls().find(b=>b.textContent==='Подтвердить').click();
  z.closePanel(); stand(0);
  const packed = S().money===0 && !signal() && z.near?.k !== 'art';
  const tiers = ['det_spark','det_contour','det_spectrum'].map((id,i) => {
    const limit = [6,15,30][i];
    z.openPanel('inv','Рюкзак'); z.panel.sel=id; z.refresh();
    controls().find(b=>b.textContent==='Взять в руки')?.click(); z.closePanel();
    key(6+i); stand(limit+.1);
    const outside = !signal();
    stand(limit-.1); const far = P().detT;
    const inside = signal();
    key(1); key(6+i); stand(.2);
    return outside && inside && P().detT < far && S().weapon === id && z.near?.k === 'art';
  });
  z.save(true); z.applyState(z.loadSave()); stand(0);
  const saved = S().weapon==='det_spectrum' && signal();
  key(1); z.interact(); stand(0);
  const holstered = !S().inv.art_medusa && !signal() && z.near?.k !== 'art';
  document.getElementById('wpnbox').click();
  key(8); stand(0); z.interact(); z.interact(); step(1);
  const collected = S().inv.art_medusa===1 && !signal();
  return {ok:absent && packed && tiers.every(Boolean) && saved && holstered && collected, absent,packed,tiers,saved,holstered,collected};
});

Tt('L1_carried_mass_and_energy', () => {
  reset();
  const drain=()=>{P().st=80;z.IN.sprint=true;z.IN.moveX=1;step(6);z.IN.moveX=0;z.IN.sprint=false;return 80-P().st;};
  const regen=()=>{P().st=30;step(6);return P().st-30;};
  const light=drain(), normal=regen();
  S().inv.cans=35;
  const heavy=drain();
  S().money=300;z.openTrade(null);
  const buy=document.querySelector('.their button[aria-label^="Энергетик"]');
  buy.click();buy.click();document.querySelector('.deal').click();z.closePanel();
  const drink=()=>{z.openPanel('inv','Рюкзак');z.panel.sel='energy';z.refresh();
    [...document.querySelectorAll('.inv-detail button')].find(b=>b.textContent==='Выпить').click();z.closePanel();};
  drink();const boost=drain(), quick=regen(), end=S().flags.energyUntil;
  z.save(true);z.applyState(z.loadSave());
  const saved=end===S().flags.energyUntil && S().inv.energy===1;
  S().min+=10;drink();const renewed=Math.abs(S().flags.energyUntil-S().min-60)<.001;
  S().min=S().flags.energyUntil;const expired=regen();
  return {ok:heavy>light && boost<heavy*.7 && quick>normal*1.45 && saved && renewed && Math.abs(expired-normal)<.01,
    light,heavy,boost,normal,quick,expired,saved,renewed};
});
Tt('L2_equipment_and_trade_scroll', () => {
  reset();
  Object.assign(S().inv,{w_pm:1,w_aksu:1,w_obrez:1,grenade:2,det_spark:1,det_spectrum:1});
  const legacy=JSON.parse(JSON.stringify(S()));delete legacy.flags.kit;legacy.weapon='w_aksu';z.applyState(legacy);
  const inv=()=>{z.openPanel('inv','Рюкзак');z.refresh();};
  inv();
  const six=document.querySelectorAll('.gear-slot .icell').length===6;
  const grid=id=>document.querySelector('.pack-grid button[data-item="'+id+'"]');
  const separate=!grid('w_pm') && !grid('w_aksu') && grid('w_obrez') && grid('det_spectrum');
  grid('w_obrez').click();[...document.querySelectorAll('.inv-detail button')].find(b=>b.textContent==='В слот').click();
  z.closePanel();window.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit4'}));inv();
  const swapped=!!grid('w_aksu') && !grid('w_obrez') && S().weapon==='w_obrez';
  z.closePanel();z.save(true);z.applyState(z.loadSave());const kit=S().flags.kit;
  Object.assign(S().inv,{tail:4,tentacle:4,hoof:4,vodka:8,antirad:8,cans:8,a9:8,a12:8,a545:8,sausage:8,art_blood:8});
  z.openTrade(null);
  const mine=()=>document.querySelector('.tr-col.mine'),their=()=>document.querySelector('.tr-col.their');
  mine().scrollTop=mine().scrollHeight;their().scrollTop=24;
  const a=mine().scrollTop,b=their().scrollTop;
  mine().querySelector('button[aria-label^="Артефакт «Кровь камня»"]').click();
  const retained=a>0 && Math.abs(mine().scrollTop-a)<=1 && Math.abs(their().scrollTop-b)<=1 && z.panel.offer.sell.art_blood===1;
  z.closePanel();return {ok:six && !!separate && swapped && kit.primary==='w_obrez' && retained,six,separate:!!separate,swapped,retained};
});
function witnessScene() {
  reset();
  // Leave only the participants so the outcome cannot depend on a passing patrol.
  z.ents.splice(1);
  const p = P();
  const add = (name, offset, angle) => {
    const npc = z.rc.mk.mkHuman({fac:'loner', name, x:(p.x+offset)/T, y:p.y/T, ang:angle});
    npc.qaHold = true;
    z.ents.push(npc);
    return npc;
  };
  return { victim:add('Потерпевший', 28, Math.PI), add };
}
Tt('K_witness_private_attack', () => {
  const {victim, add} = witnessScene();
  const turned = add('Спиной к игроку', -38, Math.PI);
  const hidden = add('За стеной', -50, 0);
  const behindWall = z.gfxSnap().HOUSES.filter(h=>!h.ruin).flatMap(h=>
    Array.from({length:h.w-2},(_,i)=>({x:(h.x+i+1.5)*T, y:(h.y+h.h/2)*T})))
    .find(q=>Math.hypot(q.x-P().x,q.y-P().y)<360 && !M.los(q.x,q.y,P().x,P().y));
  if (!behindWall) throw Error('No nearby occluded observer position');
  Object.assign(hidden, behindWall);
  hidden.ang = Math.atan2(P().y-hidden.y, P().x-hidden.x);
  const hit = () => z.rc.hurt(victim, 8, P());
  hit();
  const onlyVictim = victim.angry && !turned.angry && !hidden.angry && S().rep===0;
  z.rc.hurt(victim, 999, P()); step(100);
  return {ok:!!onlyVictim && S().rep===0 && !S().flags.lonerReports, onlyVictim:!!onlyVictim};
});
Tt('K_witness_report_and_reload', () => {
  const {victim, add} = witnessScene();
  const first = add('Первый свидетель', -50, 0), second = add('Второй свидетель', -78, 0);
  z.rc.hurt(victim, 999, P());
  const local = first.angry && second.angry && S().rep===0;
  z.rc.hurt(first, 999, 'anom');
  z.save(true); z.applyState(z.loadSave());
  step(100);
  const reported = () => S().news.filter(n => n.x.includes('Второй свидетель в эфире')).length;
  const once = reported()===1 && S().rep===-35;
  z.save(true); z.applyState(z.loadSave()); step(110);
  return {ok:!!local && once && reported()===1 && S().rep===-35, local:!!local, once};
});
Tt('K_no_surviving_witness', () => {
  const {victim, add} = witnessScene(), witness = add('Свидетель', -50, 0);
  z.rc.hurt(victim, 999, P()); z.rc.hurt(witness, 999, P()); step(110);
  return {ok:S().rep===0 && !S().news.some(n=>n.x.includes('Видел, как Меченый'))};
});
Tt('K_hostile_loner_shelters', () => {
  reset();
  const wolf = z.ents.find(e=>e.sid==='wolf');
  z.ents.splice(1); z.ents.push(wolf);
  const h = z.gfxSnap().HOUSES.filter(h=>!h.ruin).sort((a,b)=>
    Math.hypot(a.x*T-wolf.x,a.y*T-wolf.y)-Math.hypot(b.x*T-wolf.x,b.y*T-wolf.y))[0];
  const d = h.entrances[0], x=h.x*T+d.x, y=h.y*T+d.y;
  P().x=x-d.nx*T*1.5; P().y=y-d.ny*T*1.5;
  wolf.x=x+d.nx*T*2; wolf.y=y+d.ny*T*2;
  wolf.tgt=P(); wolf.angry=1; wolf.mem=8;
  const outside=!z.rc.sheltered(wolf.x,wolf.y), mag=wolf.mag;
  S().blow.next=S().min;
  step(1);
  const disengaged=S().blow.stage===1 && !wolf.tgt && wolf.mem===0;
  step(280);
  const under=()=>z.rc.sheltered(wolf.x,wolf.y);
  const reached=under() && wolf.alive;
  S().blow.t=.02; step(2);
  P().x+=d.nx*3*T; P().y+=d.ny*3*T;
  step(90);
  const held=S().blow.stage===2 && under() && !wolf.tgt && wolf.mag===mag;
  S().blow.t=.02; step(3);
  return {ok:!!(outside && disengaged && reached && held && !wolf.evacuating && wolf.angry), outside, disengaged, reached, held};
});
Tt('M1_continuous_world', () => {
  reset();
  const zales=M.LOC.zalissya.anchors.approach, west=M.LOC.exit_w.anchors.gate;
  const route=z.findPath(west[0]*T,west[1]*T,zales[0]*T,zales[1]*T);
  const cross=dir=>{
    const p=P();p.x=240*T-dir*45;p.y=118.5*T;z.IN.moveX=dir;
    step(30);z.resetInput();return (p.x-240*T)*dir>35 && z.P===p;
  };
  const seamless=cross(-1) && cross(1);
  const migrated=[[11,124,251,124],[90,269,90,117]].every(([x,y,nx,ny])=>{
    const old=z.freshS();old.x=x*T;old.y=y*T;old.mapVersion='kordon-big';old.money=1432;
    const cell=y*252+x,bits=Array(Math.ceil((cell+1)/6)).fill(48);bits[Math.floor(cell/6)]+=1<<(cell%6);
    old.fog=String.fromCharCode(...bits);z.applyState(old);
    const idx=ny*M.MW+nx;
    return P().x===nx*T && P().y===ny*T && S().money===1432 && !!((S().fog.charCodeAt(Math.floor(idx/6))-48)&(1<<(idx%6)));
  });
  return {ok:!!route?.length && seamless && migrated && B.MH()===220, seamless,migrated,routeCells:route?.length};
});
Tt('M2_lesser_zone_exploration', () => {
  reset();const p=P(), s=S(), hh=z.gfxSnap().HOUSES;
  const sites=M.LOCATIONS.filter(l=>l.bounds[2]<240), center=M.LOC.zalissya.anchors.approach;
  const reachable=sites.every(l=>{const [x,y]=l.anchors.approach;
    return !!z.findPath(center[0]*T,center[1]*T,x*T,y*T);});
  p.x=90.5*T;p.y=117.5*T+35;step(1);
  const camp=z.near?.k==='rest';if(camp) z.interact();
  const teller=document.getElementById('pbody').innerText;z.closePanel();
  const stash=M.objs.find(o=>o.k==='locker' && o.baseName==='Залесье');
  const houses=hh.filter(h=>h.x<240);
  const contacts=z.ents.filter(e=>e.alive&&e.fac==='loner'&&e.x<240*T).length;
  p.x=45.5*T;p.y=75.5*T;p.st=75;step(30);const tired=p.st<73;
  p.x=91.5*T;p.y=116.5*T;step(30);const recovered=p.st>75;
  return {ok:sites.length>=12 && reachable && camp && !!teller && !!stash && houses.every(h=>h.entrances.length) && contacts>=4 && tired && recovered,
    sites:sites.length,houses:houses.length,reachable,camp,contacts,tired,recovered};
});
Tt('M3_walk_the_western_road', () => {
  reset();
  const p=P(), s=S();p.x=249.5*T;p.y=120.5*T;
  const checkpoints=[[240,118],[232,116],[229,107],[222,100],[204,99],[199,114],[190,126],[181,130],[169,132],[152,130],[146,124],[140,115],[120,110],[106,115],[91,114]];
  let walked=0, maxStep=0;
  for(const [x,y] of checkpoints){
    const path=z.findPath(p.x,p.y,(x+.5)*T,(y+.5)*T);
    if(!path) return {ok:false,missing:[x,y]};
    for(const goal of path){
      let n=0;
      while(Math.hypot(goal.x-p.x,goal.y-p.y)>6 && n++<52){
        const dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy);
        z.IN.moveX=dx/d;z.IN.moveY=dy/d;
        const bx=p.x,by=p.y;step(1);
        const delta=Math.hypot(p.x-bx,p.y-by);maxStep=Math.max(maxStep,delta);walked+=delta;
      }
      if(n>=52){z.resetInput();return {ok:false,blocked:[goal.x/T,goal.y/T],at:[p.x/T,p.y/T],checkpoint:[x,y]};}
    }
  }
  z.resetInput();
  return {ok:p===P() && s===S() && maxStep<7 && p.x<100*T && walked>120*T && !s.flags.sphereAlarm,
    walkedTiles:Math.round(walked/T),maxStepPx:+maxStep.toFixed(2)};
});
Tt('M4_roadside_signs_and_barge_loot', () => {
  reset();
  const tiles=window.__bigTiles(), village=M.LOC.zalissya.bounds;
  const signs=M.objs.filter(o=>o.k==='signpost' && o.village);
  const tileAt=o=>tiles[Math.floor((o.y+o.h/2)/T)*M.MW+Math.floor((o.x+o.w/2)/T)];
  const verges=signs.length===2 && signs.every(o=>o.solid && tileAt(o)===0)
    && signs.some(o=>o.x/T<village[0]) && signs.some(o=>(o.x+o.w/2)/T>village[2]);
  const cargo=M.objs.find(o=>o.stash==='lz_barge');
  const reach=cargo && tileAt(cargo)!==3 && !!z.findPath(46*T,145*T,cargo.x+T,cargo.y);
  return {ok:!!(verges && reach),verges,reach:!!reach};
});
Tt('M5_sleep_and_energy',()=>{
  reset();const p=P(),s=S();p.x=45.5*T;p.y=75.5*T;
  step(420);const sleepy=s.flags.poppySleep>13 && p.alive;
  s.inv.energy=1;document.getElementById('t-inv').click();
  document.querySelector('.pack-grid [data-item="energy"]').click();
  [...document.querySelectorAll('#pbody button')].find(b=>b.textContent==='Выпить').click();
  z.closePanel();const drank=!s.inv.energy && !s.flags.poppySleep;
  step(900);const protectedByDrink=p.alive && !s.flags.poppySleep;
  s.flags.energyUntil=s.min;step(600);p.x=90*T;p.y=117*T;step(155);
  const escaped=p.alive && !s.flags.poppySleep;
  p.x=45.5*T;p.y=75.5*T;step(1263);const asleep=!p.alive;
  return {ok:!!(sleepy&&drank&&protectedByDrink&&escaped&&asleep),sleepy,drank,protectedByDrink,escaped,asleep};
});
Tt('M6_village_bar_and_perimeter',()=>{
  reset();const walls=M.objs.filter(o=>o.material==='stockade');
  const blockedAt=(x,y)=>walls.some(w=>x*T>=w.x&&x*T<=w.x+w.w&&y*T>=w.y&&y*T<=w.y+w.h);
  const gates=[76,106].every((x,i)=>Array.from({length:24},(_,n)=>35.5+n).every(y=>{
    const inGate=i?y>45&&y<50:y>44&&y<49;
    return blockedAt(x,68+y)!==inGate;
  }));
  const e=z.ents.find(e=>e.sid==='lz_barman');P().x=e.x+18;P().y=e.y+13;step(1);z.interact();
  const serve=[...document.querySelectorAll('.dlg-opts button')].find(b=>b.textContent.includes('Покажи припасы'));
  if(serve)serve.click();const trade=z.panel?.kind==='trade' && e.inv.energy>0;z.closePanel();
  return {ok:!!(gates&&walls.length===6&&trade),gates,trade};
});
Tt('M7_rail_crossing_and_dry_trail',()=>{
  reset();const tiles=window.__bigTiles(),at=(x,y)=>tiles[y*M.MW+x];
  const seam=[238,239,240,241].every(x=>[56,57,58].every(y=>at(x,y)===9));
  const path=z.findPath(145.5*T,59.5*T,145.5*T,48.5*T);
  const crossing=path?.some(pt=>pt.x>=143*T&&pt.x<148*T&&pt.y<56*T&&pt.y>51*T);
  const dry=[[250,120],[240,118],[232,116],[229,107],[222,100],[204,99]].every(([x,y])=>
    at(x,y)===1&&[-1,0,1].every(a=>[-1,0,1].every(b=>at(x+a,y+b)!==3)));
  const saved=z.freshS();saved.x=225.5*T;saved.y=57.5*T;saved.money=421;
  z.applyState(saved);
  const restored=!!M.nav[Math.floor(P().y/T)*M.MW+Math.floor(P().x/T)] &&
    Math.hypot(P().x/T-225.5,P().y/T-57.5)<5 && S().money===421;
  return {ok:!!(seam&&crossing&&dry&&restored),seam,crossing,dry,restored};
});
Tt('M8_sphere_guard',()=>{
  reset();const p=P(),s=S(),guards=z.ents.filter(e=>e.guard==='sphere');
  const move=(x,y)=>{p.x=x*T;p.y=y*T;};const safe=()=>!s.flags.sphereAlarm && guards.every(e=>e.tgt!==p);
  const guard=guards[0];move(guard.x/T+.65,guard.y/T);step(1);z.interact();
  const dialogue=document.getElementById('pbody').innerText;
  const noToll=z.panel?.kind==='dialog' && dialogue.includes('Территория под охраной') && !/шлагбаум|500 RU|пятьсот/i.test(dialogue);
  z.closePanel();move(140,116);step(2);z.clearMsgs();
  move(148,116);step(90);
  const warned=B.msgs().some(t=>t.includes('Территория под охраной'))&&safe();
  move(141,116);step(2);const withdrew=s.flags.sphereWarnAt==null&&safe();
  s.flags.bridgePaid=1;move(149,116);step(60);move(155,116);step(1);
  const alarm=!!s.flags.sphereAlarm && guards.every(e=>e.tgt===p) && !s.flags.armyAngry;
  const mags=guards.map(e=>e.mag);step(90);
  const fired=guards.some((e,i)=>e.mag<mags[i]);
  move(141,116);step(20);const cleared=safe();
  return {ok:guards.length===2&&noToll&&warned&&withdrew&&alarm&&fired&&cleared,noToll,warned,withdrew,alarm,fired,cleared};
});
Tt('G1_garbage_approaches_and_return',()=>{
  reset();
  const p=P(),state=S(), routes=[
    [[367.5,10.5],[367,5],[355,4],[332,9],[310,11],[286,11],[271,14],[251,14],[237,19],[225,25],[211,22],[183,15],[168,20],[143,22],[118,21]],
    [[145.5,59.5],[145.5,48],[151,34],[149,25],[143,22],[118,21]]
  ];
  for(const points of routes){
    p.x=points[0][0]*T;p.y=points[0][1]*T;
    for(const [x,y] of [...points.slice(1),...points.slice(0,-1).reverse()]){
      const path=z.findPath(p.x,p.y,x*T,y*T);
      if(!path?.length) return {ok:false,noPath:[x,y]};
      for(const goal of path){
        let count=0;
        while(Math.hypot(goal.x-p.x,goal.y-p.y)>6 && count++<80){
          const dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy);
          z.IN.moveX=dx/d;z.IN.moveY=dy/d;
          const oldX=p.x,oldY=p.y;step(1);
          if(Math.hypot(p.x-oldX,p.y-oldY)>T) return {ok:false,jump:[oldX/T,oldY/T,p.x/T,p.y/T]};
        }
        if(count>=80){z.resetInput();return {ok:false,blocked:[goal.x/T,goal.y/T],player:[p.x/T,p.y/T]};}
      }
    }
    z.resetInput();
  }
  const places=M.LOCATIONS.filter(l=>l.id.startsWith('dump_'));
  const linked=places.every(l=>{const [x,y]=l.anchors.approach;return z.findPath(168*T,20*T,x*T,y*T)?.length;});
  const seamless=p===P() && state===S() && !z.panel;
  p.x=168.5*T;p.y=20.5*T;z.save(true);z.applyState(z.loadSave());
  return {ok:seamless && state.flags.visitedDump===1 && linked && places.length===9 &&
    Math.abs(P().x-168.5*T)<1 && Math.abs(P().y-20.5*T)<1,places:places.length,linked};
});
return JSON.stringify(R);
})()
