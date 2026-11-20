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
  const stack = M.objs.find(o => o.shopStack) || M.objs.find(o => o.k==='crate' && o.x>240*T);
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
  const returned=P().x>240*T;
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
    pass.push({dir,side,probe,across:(p.y-gate.y)*dir>78});
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
  return {ok:pass.every(v=>v.probe===v.across)&&restored&&fixed&&rearmed,pass,restored,fixed,rearmed};
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

return JSON.stringify(R);
})()
