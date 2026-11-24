/* ===================== состояние ===================== */
let S = null, P = null, ents = [], decals = [], parts = [], tracers = [], flashes = [], bolts = [], nades = [], crows = [], anoms = [], arts = [];
let bridgeBarrier;
let armyAngry = false, nextId = 1, spawnT = 0, fogT = 0, saveT = 0, warnT = 0;
const cnt = id => S.inv[id] || 0;
const has = id => cnt(id) > 0;
const beltCount = id => S.belt.filter(x => x === id).length;
function take(id, n) {
  S.inv[id] = Math.max(0, cnt(id) - (n || 1)); if (!S.inv[id]) delete S.inv[id];
  while (beltCount(id) > cnt(id)) S.belt.splice(S.belt.indexOf(id), 1);
  if (!has(id)) {
    if (S.weapon === id) setWeapon('knife');
    const slot=kitSlot(id);
    if (slot && S.flags.kit?.[slot] === id) delete S.flags.kit[slot];
  }
}
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

let MSGS = [];
function msg(t, k) { MSGS.push({ t: t, k: k || '', life: 6 }); if (MSGS.length > 5) MSGS.shift(); }
const radioQueue = [];
function radioNotice(t, urgent = false) {
  const k = urgent ? 'radio urgent' : 'radio';
  const i = radioQueue.findIndex(note => note.k === k);
  if (i >= 0) {
    if (radioQueue[i].t === t) return false;
    radioQueue.splice(i, 1);
  }
  const note = { t, k, life: urgent ? 10 : 6 };
  const position = !urgent && radioQueue[0]?.k === 'radio urgent' ? 1 : 0;
  radioQueue.splice(position, 0, note);
  return true;
}
function news(t) {
  S.news.push({ t: S.min, x: t });
  if (S.news.length > 60) S.news.shift();
}
function bulletin(t) {
  news(t);
  const pending = radioQueue.filter(note => note.k === 'radio bulletin');
  if (pending.some(note => note.t === t)) return;
  // Короткая серия идёт по одной строке. Большая пачка оставляет одну подсказку о журнале.
  if (pending.length >= 2) {
    if (pending.some(note => note.digest)) return;
    radioQueue.push({ t: 'Другие сводки — в журнале КПК.', k: 'radio bulletin', life: 4, digest: true });
  } else {
    radioQueue.push({ t, k: 'radio bulletin', life: 5 });
  }
}
function radioNews(t, urgent = false) {
  if (radioNotice(t, urgent)) { news(t); play('pda'); }
}

const DIFFICULTIES = {
  rookie: {name:'Новичок', note:'Больше припасов, выгодная торговля. Легче попасть и пережить ранение.',
    buy:.8, income:1.20, loot:1.40, incoming:.65, spread:.75},
  normal: {name:'Средний', note:'Торговцы берут дороже, патроны приходится экономить. Обычный урон.',
    buy:1.12, income:.88, loot:.82, incoming:1, spread:1},
  hard: {name:'Сложный', note:'Патронов меньше, снаряжение дороже. Противники бьют сильнее.',
    buy:1.25, income:.80, loot:.75, incoming:1.25, spread:1.10},
  master: {name:'Мастер', note:'Скудная добыча, дорогой ремонт и низкий заработок. Ошибки в бою обходятся дорого.',
    buy:1.55, income:.60, loot:.50, incoming:1.55, spread:1.20}
};
function difficultyKey(id) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTIES,id) ? id : 'normal';
}
function rules() { return DIFFICULTIES[difficultyKey(S?.difficulty)]; }
const purchaseCost = base => Math.ceil(base*rules().buy-1e-8);
const earnings = base => Math.round(base*rules().income);
const supplyCount = count => Math.max(1,Math.round(count*rules().loot));

function freshS(difficulty='normal') {
  return { v: 1, difficulty:difficultyKey(difficulty), money: 0, inv: { ar_jacket: 1, medkit: 1, bandage: 2, bread: 1 }, weapon: 'knife', armor: 'ar_jacket', belt: [], mag: {},
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
  { sid: 'sid', fac: 'trader', name: 'Сидорович', x: SID_DESK_X, y: SID_DESK_Y, wpn: 'knife', hp: 99999, stay: 1, named: 1, ang: Math.PI / 2 },
  { sid: 'wolf', fac: 'loner', name: 'Волк', x: 20.5, y: 79, wpn: 'w_obrez', hp: 130, stay: 1, named: 1 },
  { sid: 'petr', fac: 'loner', name: 'Петруха', x: 74, y: 63.5, wpn: 'w_pm', hp: 150, stay: 1, named: 1 },
  { sid: 'petr2', fac: 'loner', name: 'Хомяк', x: 74, y: 79, wpn: 'w_obrez', hp: 130, stay: 1, named: 1 },
  { sid: 'shust', fac: 'loner', name: 'Шустрый', x: 94.5, y: 64.6, wpn: 'knife', hp: 60, captive: 1, named: 1 },
  { sid: 'tolik', fac: 'loner', name: 'Толик', x: 58.6, y: 66.4, wpn: 'w_pm', hp: 70, captive: 1, wounded: 1, named: 1 },
  { sid: 'fox', fac: 'loner', name: 'Лис', x: 88.5, y: 14.5, wpn: 'w_obrez', hp: 110, captive: 1, wounded: 1, named: 1, stay: 1 },
  { sid: 'b1', fac: 'bandit', x: 90, y: 71, wpn: 'w_pm', stay: 1 }, { sid: 'b2', fac: 'bandit', x: 93, y: 72.5, wpn: 'w_obrez' },
  { sid: 'b3', fac: 'bandit', x: 101, y: 72, wpn: 'w_pm' }, { sid: 'b4', fac: 'bandit', x: 104, y: 79, wpn: 'w_pm' },
  { sid: 'b5', fac: 'bandit', x: 99, y: 64.5, wpn: 'w_obrez' }, { sid: 'b6', fac: 'bandit', x: 93, y: 78.5, wpn: 'w_pm' },
  { sid: 'boss', fac: 'bandit', name: 'Сиплый', x: 103, y: 64.6, wpn: 'w_aksu', hp: 140, named: 1 },
  { sid: 'b7', fac: 'bandit', x: 16, y: 11, wpn: 'w_pm' }, { sid: 'b8', fac: 'bandit', x: 20, y: 12.5, wpn: 'w_obrez' }, { sid: 'b9', fac: 'bandit', x: 30, y: 12.5, wpn: 'w_pm' },
  { sid: 'a1', fac: 'army', name: 'Рядовой Ткач', x: 60.5, y: 33.4, wpn: 'w_aksu', guard: 'bridge' },
  { sid: 'a2', fac: 'army', name: 'Рядовой Мазур', x: 66.5, y: 33.4, wpn: 'w_aksu', guard: 'bridge' },
  { sid: 'a3', fac: 'army', name: 'Прапорщик', x: 63.5, y: 34.2, wpn: 'w_aksu', guard: 'bridge' },
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
// Perception supplies a remembered position. Hidden actors never supply fresh coordinates.
function mutantPrey(o){
  return o && o.alive && o.kind==='human' && o.fac!=='trader' && !o.captive && !inBunker(o.x,o.y);
}
function leaveHunt(e){
  e.tgt=e.trail=e.path=e.wander=null;e.routeRetry=0;e.returning=true;
  e.scentTime=0;e.searchBlocked=0;e.fleeT=0;e.huntProbe=null;
  e.state=e.kind==='sucker'?'lurk':'idle';
}
function mutantTarget(e,dt,sightRange,chaseRange){
  if(e.returning)return null;
  if(e.tgt)e.scentTime=(e.scentTime||0)-dt;
  if(e.tgt && (!mutantPrey(e.tgt) || dE(e,e.tgt)>chaseRange)){
    leaveHunt(e);return null;
  }
  if(e.think<=0){
    e.think=.25;
    let best=null,nearest=Infinity;
    for(const o of ents){
      if(!mutantPrey(o))continue;
      const range=o===e.tgt?chaseRange:sightRange*(e.kind==='dog'&&o===P?clamp(pVis()*1.1,.5,1.2):1);
      const d=dE(e,o);
      if(d>=range || d>=nearest || !clearNPCShot(e,o,true))continue;
      nearest=d;best=o;
    }
    if(best){
      if(e.kind==='dog'){
        for(const mate of ents)if(mate!==e&&mate.alive&&mate.kind==='dog'&&mate.pack===e.pack&&
            (!mate.tgt||mate.tgt===best)&&!mate.returning&&dE(e,mate)<220){
          mate.tgt=best;mate.trail={x:best.x,y:best.y};mate.scentTime=4;
        }
      }
      e.tgt=best;e.trail={x:best.x,y:best.y};e.scentTime=4;
    }
    if(e.tgt){
      // Give up an unreachable target even when it can be seen through wire mesh.
      const moved=e.huntProbe?dE(e,e.huntProbe):Infinity;
      if(moved<4 && (e.routeRetry>0 || e.stuck>.1))e.searchBlocked=(e.searchBlocked||0)+.25;
      else e.searchBlocked=0;
      e.huntProbe={x:e.x,y:e.y};
    }
  }
  if(e.tgt && (!e.trail || e.scentTime<=0 || e.searchBlocked>=3)){
    leaveHunt(e);return null;
  }
  return e.tgt;
}
function roamDen(e,dt,speed){
  if(e.returning || dE(e,e.home)>120){
    e.returning=true;
    if(e.denRevision!==navRevision || !e.denSpot){
      e.denRevision=navRevision;e.denSpot=e.home;
      if(!clearFooting(e.home.x,e.home.y,e.r)){
        // A respawned crate can occupy the original resting spot.
        const cx=Math.floor(e.home.x/T),cy=Math.floor(e.home.y/T);
        let nearest=Infinity;
        for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+2;x++){
          if(!inb(x,y)||!nav[y*MW+x])continue;
          const p={x:(x+.5)*T,y:(y+.5)*T},d=dE(p,e.home);
          if(d<nearest&&clearFooting(p.x,p.y,e.r)&&findPath(e.x,e.y,p.x,p.y,true,e.r)){
            e.denSpot=p;nearest=d;
          }
        }
      }
    }
    if(goTo(e,e.denSpot.x,e.denSpot.y,90,dt)<11){
      e.returning=false;e.wander=e.path=null;e.idleT=rnd(2,5);
    }
    return;
  }
  e.idleT=(e.idleT||0)-dt;
  if(e.wander){
    if(goTo(e,e.wander.x,e.wander.y,speed,dt)<8 || e.routeRetry>0)e.wander=null;
  }else if(e.idleT<=0){
    e.idleT=rnd(2,6);
    const a=rnd(0,Math.PI*2),r=rnd(20,80),x=e.home.x+Math.cos(a)*r,y=e.home.y+Math.sin(a)*r;
    if(walkAnchor(x,y,e.r)>=0 && clearFooting(x,y,e.r))e.wander={x,y};
  }
}
function mutantApproach(e,point,speed,dt){
  // A human can hug a wall closer than a boar. Aim for a point just short of the prey.
  const d=dE(e,point),pad=Math.min(d,Math.max(0,e.r-9)+2);
  if(d<1)return;
  const x=point.x+(e.x-point.x)*pad/d,y=point.y+(e.y-point.y)*pad/d;
  const dest=clearFooting(x,y,e.r)?{x,y}:point;
  goTo(e,dest.x,dest.y,speed,dt);
}
function canStrike(e,t,reach){
  return mutantPrey(t) && dE(e,t)<reach && clearNPCShot(e,t);
}
/* кабан: замечает, роет землю, бросается рывком по прямой; после рывка оглушён — уходи в сторону */
function aiBoar(e, dt) {
  e.cool -= dt; e.think -= dt; e.st -= dt;
  e.snortIn=(e.snortIn??(4+e.id%8))-dt;
  if(e.snortIn<=0){e.snortIn=rnd(7,15);play('boar',e.x,e.y,.65);}
  const t=mutantTarget(e,dt,300,560);
  if(!t){roamDen(e,dt,45);return;}
  const want=Math.atan2(e.trail.y-e.y,e.trail.x-e.x);
  if (e.state === 'idle' || e.state === 'stalk') {
    e.state = 'stalk'; e.ang += angD(e.ang, want) * Math.min(1, dt * 4);
    if (dE(e,e.trail)>240 || !clearWalk(e.x,e.y,e.trail.x,e.trail.y,e.r)) mutantApproach(e,e.trail,90,dt);
    else if (e.cool <= 0 && canStrike(e,t,241)) { e.state = 'wind'; e.st = 0.6; play('boarCharge', e.x, e.y, 0.7); }
    else mutantApproach(e,e.trail,50,dt);
  } else if (e.state === 'wind') {
    e.ang += angD(e.ang, want) * Math.min(1, dt * 6);
    if (chance(dt * 12)) parts.push({ x: e.x - Math.cos(e.ang) * 10, y: e.y - Math.sin(e.ang) * 10, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.4, c: '#5a4a34', s: 2 });
    if (e.st <= 0) { e.state = 'charge'; e.st = 0.85; e.hit = 0; }
  } else if (e.state === 'charge') {
    const sp = 330 * dt, ox = e.x, oy = e.y;
    const nx=ox+Math.cos(e.ang)*sp,ny=oy+Math.sin(e.ang)*sp;
    if(clearWalk(ox,oy,nx,ny,e.r))moveE(e,nx-ox,ny-oy);
    e.step+=dst(ox,oy,e.x,e.y);
    if (!e.hit) for (const o of ents) { if (canStrike(e,o,e.r+o.r+4)) { e.hit = 1; hurt(o, rnd(24, 34), e, e.ang); o.kx += Math.cos(e.ang) * 320; o.ky += Math.sin(e.ang) * 320; break; } }
    if (e.st <= 0 || dst(ox, oy, e.x, e.y) < sp * 0.3) { e.state = 'stun'; e.st = 1.1; e.cool = 1.6; }
  } else if (e.state === 'stun') { if (e.st <= 0) e.state = 'stalk'; }
}
const FAC_N = { loner: 'Одиночки', bandit: 'Бандиты', army: 'Военные', mutant: 'Мутанты', trader: 'Торговцы', player: 'Одиночки' };
const nameI = { loner: 0, bandit: 3 };
function rollInv(fac) {
  const inv = {};
  ['bandage', 'sausage', 'bread', 'vodka', 'cans'].forEach(i => { if (chance((FOOD[i] ? .16 : .3)*rules().loot)) inv[i] = 1; });
  if (chance((fac === 'army' ? 0.5 : 0.25)*rules().loot)) inv.medkit = 1;
  if (chance(.15*rules().loot)) inv.antirad = 1;
  return inv;
}
function mkHuman(d) {
  const W = WP[d.wpn || 'w_pm'];
  const base = d.fac === 'army' ? 150 : d.fac === 'bandit' ? 70 : 85;
  const names = d.fac === 'bandit' ? BANDIT_NAMES : LONER_NAMES;
  const e = { id: nextId++, kind: 'human', sid: d.sid, fac: d.fac, name: d.name || names[(nameI[d.fac === 'bandit' ? 'bandit' : 'loner']++) % names.length],
    x: d.x * T, y: d.y * T, r: 11, hp: d.hp || base, ang: d.ang !== undefined ? d.ang : rnd(-3, 3), alive: 1,
    wpn: d.wpn || 'w_pm', mag: W.mag || 0, cool: 0, reload: 0, think: Math.random() * 0.3, react: 0.5, mem: 0,
    home: { x: d.x * T, y: d.y * T }, sit: d.sit, stay: d.stay, guard: d.guard, captive: d.captive, named: d.named,
    money: earnings((d.fac === 'army' ? ri(100, 300) : ri(50, 300))), inv: rollInv(d.fac), kx: 0, ky: 0, flash: 0, step: 0,
    wounded: d.wounded, fireRef: d.localFire || (d.fire === 2 ? FIRE2 : FIRE),
    seed: Math.floor(Math.random() * 1e6), path: null, pi: 0, idleT: rnd(1, 5), trip: null };
  if (d.sid==='dump_scale') { e.inv={antirad:4,energy:3,bandage:5,cans:4,a12:14}; e.money=1800; }
  if (d.sid==='lz_barman') {e.inv={energy:8,bread:6,cans:5,vodka:4,bandage:3};e.money=2200;}
  e.maxhp = e.hp;
  if (e.sit) e.ang = Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x);
  if (e.guard === 'bridge') e.ang = (BIG && e.sid==='a1' ? -1 : 1)*Math.PI/2;
  if (e.guard === 'south') e.ang = -Math.PI / 2;
  return e;
}
function mkDog(d) {
  return { id: nextId++, kind: 'dog', sid: d.sid, fac: 'mutant', name: 'Слепой пёс', pack: d.pack, x: d.x * T, y: d.y * T, r: 10, hp: 38, maxhp: 38,
    ang: rnd(-3, 3), alive: 1, cool: 0, think: Math.random() * 0.3, home: { x: d.x * T, y: d.y * T }, kx: 0, ky: 0, flash: 0, step: 0, idleT: rnd(1, 4), barkT: rnd(3, 12) };
}
function mkPlayer() {
  return { id: 0, kind: 'human', fac: 'player', name: 'Меченый', x: S.x, y: S.y, r: 11, hp: S.hp, maxhp: 100, ang: -Math.PI / 2, alive: 1,
    cool: 0, reload: 0, bloom: 0, st: 100, kx: 0, ky: 0, flash: 0, step: 0, medT: 0, seed: 7 };
}
const DEN_RECOVERY = 24 * 60;
let mutantDens = new Map();
function registerDens() {
  mutantDens = new Map();
  for (const d of DOGDEF) register(d, mkDog, d.pack);
  for (const d of boarDefs()) register(d, mkBoar, d.pack || (d.sid === 'k3' ? 'boar_east' : 'boar'));
  function register(d, make, pack) {
    if (!mutantDens.has(pack)) mutantDens.set(pack, []);
    mutantDens.get(pack).push({def:{...d,pack}, make});
  }
}
function spawnDenMember(member) {
  const e = member.make(member.def);
  e.den = member.def.pack;
  clearPropSpawn(e);
  ents.push(e);
}
function clearedDen(pack) {
  const members = mutantDens.get(pack);
  if (members && members.every(m => S.dead[m.def.sid])) {
    const deadlines = S.flags.denRecovery ||= {};
    deadlines[pack] ??= S.min + DEN_RECOVERY;
  }
}
function renewDens() {
  const deadlines = S.flags.denRecovery;
  if (!deadlines) return;
  for (const [pack, until] of Object.entries(deadlines)) {
    const members = mutantDens.get(pack);
    if (!members || S.min < until) continue;
    const safeToSpawn = members.every(({def}) => {
      const x = def.x*T, y = def.y*T;
      const onScreen = Math.abs(cam.x-x)<VW/(2*Z)+4*T && Math.abs(cam.y-y)<VH/(2*Z)+4*T;
      return S.dead[def.sid] && !onScreen && dst(P.x,P.y,x,y)>1200;
    });
    if (!safeToSpawn) continue;
    for (const member of members) {
      const sid = member.def.sid;
      ents = ents.filter(e => e.sid !== sid || e.alive);
      delete S.dead[sid];
      spawnDenMember(member);
    }
    delete deadlines[pack];
  }
}
let artifactAccess=null,artifactRevision=-1;
function reachableArtifact(a){
  if(artifactRevision!==navRevision){
    artifactRevision=navRevision;artifactAccess=new Uint8Array(nav.length);
    const start=nearestNav(Math.floor(FIRE.x/T),Math.floor(FIRE.y/T));
    if(start>=0){
      let end=1;bfsQ[0]=start;artifactAccess[start]=1;
      for(let i=0;i<end;i++){
        const n=bfsQ[i],x=n%MW,y=Math.floor(n/MW);
        for(let k=0;k<8;k++){
          const m=navNeighbor(x,y,k);
          if(m>=0 && !artifactAccess[m]){artifactAccess[m]=1;bfsQ[end++]=m;}
        }
      }
    }
  }
  const original=walkAnchor(a.x,a.y);
  if(artifactAccess[original] && clearFooting(a.x,a.y,11))return {...a};
  let best=-1,dist=Infinity;
  for(let n=0;n<artifactAccess.length;n++)if(artifactAccess[n]){
    const x=(n%MW+.5)*T,y=(Math.floor(n/MW)+.5)*T,d=(x-a.x)**2+(y-a.y)**2;
    if(d<dist && clearFooting(x,y,11)){dist=d;best=n;}
  }
  return best<0?{...a}:{...a,x:(best%MW+.5)*T,y:(Math.floor(best/MW)+.5)*T};
}
function spawnWorld() {
  resetCampAudio();
  ents = []; decals = []; parts = []; tracers = []; flashes = []; bolts = []; nades = []; crows = [];
  for (let i = objs.length - 1; i >= 0; i--) if (!objs[i].static) objs.splice(i, 1);
  objs.push(...retiredFixedCrates); retiredFixedCrates.length = 0;
  objs.forEach(o => { if (o.stash) restoreContainer(o); });
  armyAngry = !!S.flags.armyAngry;
  bridgeBarrier = objs.find(o => o.key === 'bar');
  if (bridgeBarrier) { bridgeBarrier.solid = S.flags.bridgePaid ? 0 : 1; buildGrids(); }
  S.q2 = S.q2 || { fox: 0, tolik: 0 };
  P = mkPlayer(); ents.push(P);
  delete S.dead.sid; // Сохранение из версии, где торговца можно было убить.
  NPCDEF.forEach(d => {
    if (S.dead[d.sid]) return;
    const e = mkHuman(d);
    if (d.sid === 'shust' && S.flags.shustFree) { const p = walkPoint(locPt('atp','petr'),3,2); e.captive = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'tolik' && S.flags.tolikUp) { const p = locPt('village', 'tolik'); e.captive = e.wounded = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'fox' && S.flags.foxUp) { e.captive = e.wounded = 0; }
    if ((d.sid === 'petr' || d.sid === 'petr2') && S.flags.atpClear) { const p = locPt('atp', d.sid); e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (S.flags.angry && S.flags.angry[d.sid]) e.angry = 1;
    ents.push(e);
  });
  registerDens();
  for (const [pack,members] of mutantDens) {
    for (const member of members) if (!S.dead[member.def.sid]) spawnDenMember(member);
    clearedDen(pack); // Also initialise the cooldown for a cleared den in an older save.
  }
  rcSpawnObjs();
  const fox=byS('fox');if(fox){fox.angry=0;fox.tgt=null;if(S.flags.angry)delete S.flags.angry.fox;}
  campaignCast();


  anoms = ANOM0.map(spawnAnomaly);
  arts = ARTS0.filter(a => !S.flags['art_' + a.key]).map(reachableArtifact);
}
const byS = sid => ents.find(e => e.sid === sid && e.alive);

/* ===================== отношения ===================== */
function hostile(a, b) {
  if (a === b || !a.alive || !b.alive || a.captive || b.captive) return false;
  if((a.sid==='fox' && b===P)||(b.sid==='fox' && a===P))return false;
  const fa = a.fac, fb = b.fac;
  if(BIG && (a.guard==='south' && b===P || b.guard==='south' && a===P) && S.campaign && ['case','escape'].includes(chapter()) && storyArea())return true;
  if (fa === 'trader' || fb === 'trader') return false;
  if (fa === 'mutant' || fb === 'mutant') return fa !== fb;
  if (fa === fb) return false;
  const pair = (x, y) => (fa === x && fb === y) || (fa === y && fb === x);
  if (pair('bandit', 'loner') || pair('bandit', 'player') || pair('bandit', 'army')) return true;
  if (pair('army', 'player')) { const s = fa === 'army' ? a : b; return armyAngry || !!s.angry || (s.guard==='sphere' && !!S.flags.sphereAlarm); }
  if (pair('loner', 'player')) { const l = fa === 'loner' ? a : b; return S.rep <= -30 || !!l.angry; }
  return false;
}
function playerRelation(e) {
  if (hostile(e, P)) return 'enemy';
  if (e.fac !== 'loner') return 'neutral';
  if (e.storyMan || e.follow || (e.uid && S.flags['sosFriend_' + e.uid])) return 'friend';
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
function lonerWitnesses(victim,loud=false) {
  return ents.filter(o => {
    if (o === victim || o.fac !== 'loner' || !o.alive || o.captive) return false;
    const range = sight(o);
    return [P, victim].every(target =>
      dE(o, target) < range && seesActor(o, target) &&
      ((loud && dE(o,target)<170) || Math.abs(angD(o.ang, Math.atan2(target.y - o.y, target.x - o.x))) < 1.0));
  });
}
function rememberAttacker(e) {
  if(e.sid==='fox')return;
  if (!e.sid && !e.uid) e.uid = dynId();
  e.defendUntil=S.min+35;e.angry=1;e.aw=1;e.tgt=P;e.mem=35;e.lastSeen={x:P.x,y:P.y};setCampSeat(e,false);
  markAngry(e);
}
function witnessLonerAttack(victim, fatal, witnesses = lonerWitnesses(victim)) {
  witnesses.forEach(rememberAttacker);
  if (!fatal) { if(witnesses.length && !victim.angry)S.rep-=10;rememberAttacker(victim); return; }
  if (!witnesses.length) return;
  const reports = S.flags.lonerReports || (S.flags.lonerReports = []);
  reports.push({ victim: victim.name, due: S.min + 3, witnesses: witnesses.map(e => e.sid || e.uid) });
}
function deliverLonerReports() {
  const reports = S.flags.lonerReports;
  if (!reports) return;
  S.flags.lonerReports = reports.filter(report => {
    if (report.due > S.min) return true;
    const sender = ents.find(e => e.alive && !e.captive && report.witnesses.includes(e.sid || e.uid));
    if (sender) {
      S.rep -= 35;
      bulletin(sender.name + ' в эфире: «Видел, как Меченый убил одиночку. Погиб ' + report.victim + '».');
    }
    return false;
  });
  if (!S.flags.lonerReports.length) delete S.flags.lonerReports;
}
function anger(e) {
  if(e.sid==='fox')return;
  if (e.fac === 'loner' && !e.angry) {
    ents.forEach(o => { if (o.fac === 'loner' && o.alive && !o.captive && dE(o, e) < 450 && los(o.x, o.y, e.x, e.y)) { rememberAttacker(o); } });
    e.angry = 1; markAngry(e);
    S.rep -= 10;
    msg('Ты напал на своего. Одиночки этого не простят.', 'bad');
  }
  if (e.fac === 'army' && !armyAngry) { armyAngry = true; S.flags.armyAngry = 1; msg('Военные открывают огонь!', 'bad'); }
}
const SPHERE_WARNING='Охрана «Сферы»: Стой! Территория под охраной. Войдёшь за ограду — откроем огонь.';
function checkSpherePerimeter(){
  if(!P.alive) return;
  const x=P.x/T,y=P.y/T-LESSER_TOP;
  const gap=Math.max(151.5-x,x-176.8,37-y,y-56);
  const flags=S.flags;
  if(gap>7){
    if(flags.sphereWarnAt!=null){delete flags.sphereWarnAt;delete flags.sphereAlarm;}
    return;
  }
  if(gap>5 || flags.sphereAlarm || armyAngry) return;
  const guards=ents.filter(e=>e.guard==='sphere' && e.alive);
  if(!guards.length) return;
  if(flags.sphereWarnAt==null){
    flags.sphereWarnAt=S.min;radioNotice(SPHERE_WARNING);
    return;
  }
  if(gap>=0 || S.min-flags.sphereWarnAt<1.5) return;
  flags.sphereAlarm=1;
  for(const guard of guards){
    guard.aw=1;guard.tgt=P;guard.mem=6;guard.lastSeen={x:P.x,y:P.y};
  }
}
function checkBridgeCrossing(oldX, oldY) {
  if (!bridgeBarrier?.solid || S.flags.bridgePaid || !P.alive) return;
  const lineY = bridgeBarrier.y + bridgeBarrier.h / 2;
  if ((oldY < lineY) === (P.y < lineY)) return;
  const x = oldX + (P.x - oldX) * (lineY - oldY) / (P.y - oldY);
  if (x < bridgeBarrier.x - P.r || x > bridgeBarrier.x + bridgeBarrier.w + P.r) return;
  let alarm = false;
  for (const guard of ents) {
    if (guard.guard !== 'bridge' || !guard.alive || guard.angry) continue;
    guard.angry = 1;
    markAngry(guard);
    guard.tgt = P;
    guard.aw = 1;
    guard.lastSeen = {x:P.x, y:P.y};
    guard.mem = 6;
    alarm = true;
  }
  if (alarm) msg('Часовой: — Нарушитель у шлагбаума! Огонь!', 'bad');
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
  for (let i = 0; i < objs.length; i++) { const o = objs[i]; if (o.solid && !(hop && canVaultObject(o)) && e.x + e.r > o.x && e.x - e.r < o.x + o.w && e.y + e.r > o.y && e.y - e.r < o.y + o.h) pushOut(e, o.x, o.y, o.w, o.h); }
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const nearby=propCells.get(y*MW+x);
    if(nearby) for(const p of nearby) if(!hop || !p.vaultable) touchesProp(p,e,true);
  }
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
  e.yielding=false;e.lastWalk=S.min;
  const distance=dst(e.x,e.y,tx,ty);
  if(distance<1)return distance;
  const changed=!e.goal||dst(e.goal.x,e.goal.y,tx,ty)>12||e.pathRevision!==navRevision;
  if(changed){e.path=null;e.routeRetry=0;}
  if(!e.path){
    if(e.routeRetry>0){e.routeRetry-=dt;return distance;}
    e.goal={x:tx,y:ty};e.pathRevision=navRevision;e.pi=0;
    const direct=distance<260 && clearWalk(e.x,e.y,tx,ty,e.r) &&
      !anoms.some(a=>{
        const dx=tx-e.x,dy=ty-e.y,t=clamp(((a.x-e.x)*dx+(a.y-e.y)*dy)/(distance*distance),0,1);
        return dst(a.x,a.y,e.x+t*dx,e.y+t*dy)<a.r+e.r;
      });
    e.path=direct?[e.goal]:findPath(e.x,e.y,tx,ty,true,e.r);
    if(!e.path){e.routeRetry=.9;return distance;}
    if(!direct)e.path.push(e.goal);
    e.stuck=0;
  }
  // Reach the centre before turning at a door jamb. Clamp the last step to the waypoint.
  let p=e.path[e.pi];
  while(p){
    const next=e.path[e.pi+1],gap=dE(e,p);
    // Travellers sharing a gate can pass on either side of the waypoint centre.
    if(gap>=1 && !(next&&gap<24&&clearWalk(e.x,e.y,next.x,next.y,e.r)))break;
    p=e.path[++e.pi];
  }
  if(!p){e.path=null;return distance;}
  // At a shared corner, let one traveller complete the turn before the next enters.
  if((e.kind==='human'||e.fac==='mutant') && dE(e,p)<T*1.6 && ents.some(o=>{
    if(o===e||!o.alive||o.id>=e.id||!o.path||S.min-o.lastWalk>.2||dE(o,e)>T*1.7)return false;
    const next=o.path[o.pi];return next&&dE(next,p)<8&&dE(o,p)<T*1.5;
  })){
    e.yielding=true;return distance;
  }
  const d=dE(e,p),dx=(p.x-e.x)/d,dy=(p.y-e.y)/d;
  const step=Math.min(d,speed*dt*(swampAt(e.x,e.y)?.55:1)),ox=e.x,oy=e.y;
  moveE(e,dx*step,dy*step);
  e.step+=dst(ox,oy,e.x,e.y);
  e.ang+=angD(e.ang,Math.atan2(dy,dx))*Math.min(1,dt*6);
  e.stuck=d-dE(e,p)<step*.2?(e.stuck||0)+dt:0;
  if(e.stuck>.45){e.path=null;e.routeRetry=.15;}
  return dst(e.x,e.y,tx,ty);
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
function rayBox(f,x,y,dx,dy,near,far) {
    // Интервал луча внутри каждой из двух осевых полос прямоугольника.
    let enter = near, exit = far;
    if (Math.abs(dx) < 1e-9) {
      if (x < f.x || x > f.x + f.w) return Infinity;
    } else {
      const a = (f.x - x) / dx, b = (f.x + f.w - x) / dx;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < f.y || y > f.y + f.h) return Infinity;
    } else {
      const a = (f.y - y) / dy, b = (f.y + f.h - y) / dy;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    return enter <= exit ? enter : Infinity;
}
function rayFence(x, y, dx, dy, near, far) {
  let hit = Infinity;
  for (const f of fences) {
    hit = Math.min(hit,rayBox(f,x,y,dx,dy,near,far));
  }
  return hit;
}
// Ground elevations in world units, sampled from the same landforms as the renderer.
// Both ends of a shot stand on the ground; two people on one crest can see each other.
let combatRelief;
function terrainLevel(x,y) {
  if(!BIG || x<0 || y<0 || x>=(MW-1)*T || y>=(MH-1)*T)return 0;
  if(!combatRelief){
    combatRelief=new Float32Array(MW*MH);
    function mound(cx,cy,rx,ry,a,height){
      const sn=Math.sin(a),cs=Math.cos(a),r=Math.ceil(Math.max(rx,ry));
      for(let j=Math.max(0,Math.floor(cy-r));j<=Math.min(MH-1,cy+r);j++)
        for(let i=Math.max(0,Math.floor(cx-r));i<=Math.min(MW-1,cx+r);i++){
          const u=((i-cx)*cs+(j-cy)*sn)/rx,v=((j-cy)*cs-(i-cx)*sn)/ry;
          const k=j*MW+i;
          combatRelief[k]=Math.max(combatRelief[k],height*Math.max(0,1-u*u-v*v)**2);
        }
    }
    for(const [cx,cy,rx,ry,a] of knolls)mound(cx,cy,rx,ry,a,48);
    for(const [cx,cy,w,h,a] of dumpHills)mound(cx,cy,w/2,h/2,a,84);
  }
  const u=x/T,v=y/T,i=Math.floor(u),j=Math.floor(v),k=j*MW+i;
  return lerp(lerp(combatRelief[k],combatRelief[k+1],u-i),
              lerp(combatRelief[k+MW],combatRelief[k+MW+1],u-i),v-j);
}
// Clip a ray against the same convex footprint that stops a walking actor.
function propRay(p,x,y,dx,dy,near,far){
  let enter=near,exit=far;
  for(let i=0;i<p.vertices.length;i++){
    const a=p.vertices[i],b=p.vertices[(i+1)%p.vertices.length];
    const ex=b[0]-a[0],ey=b[1]-a[1],offset=ex*(y-a[1])-ey*(x-a[0]),rate=ex*dy-ey*dx;
    if(Math.abs(rate)<1e-8){if(offset<0)return Infinity;continue;}
    if(rate>0)enter=Math.max(enter,-offset/rate);
    else exit=Math.min(exit,-offset/rate);
    if(enter>exit)return Infinity;
  }
  return enter;
}
function npcBarrier(from,dx,dy,limit,target,vision=false){
  if(limit<=0)return 0;
  const {x,y}=from,base=terrainLevel(x,y)+18,range=target?dE(from,target):0;
  const slope=range>1?(terrainLevel(target.x,target.y)+18-base)/range:0;
  let i=Math.floor(x/T),j=Math.floor(y/T),near=0;
  const sx=dx>0?1:-1,sy=dy>0?1:-1;
  const stepX=dx?T/Math.abs(dx):Infinity,stepY=dy?T/Math.abs(dy):Infinity;
  let nextX=dx?((i+(dx>0))*T-x)/dx:Infinity,nextY=dy?((j+(dy>0))*T-y)/dy:Infinity;
  function tileBlocks(i,j){
    if(!inb(i,j))return true;
    const tile=map[j*MW+i];
    return OPAQ[tile] || (tile===RA && vision!=='light');
  }
  while(near<limit){
    if(tileBlocks(i,j))return near;
    const cell=j*MW+i,far=Math.min(nextX,nextY,limit);
    let hit=Infinity;
    const solids=walkSolids.get(cell),props=propCells.get(cell);
    if(solids)for(const o of solids)if(o.solid && !(vision && o.k==='fence' && !o.opaque && o.material!=='concreteWire' && o.material!=='stockade'))
      hit=Math.min(hit,rayBox(o,x,y,dx,dy,near,far));
    if(props)for(const p of props){
      if(vision==='light' && p.vaultable)continue;
      hit=Math.min(hit,propRay(p,x,y,dx,dy,near,far));
    }
    const mid=(near+far)/2;
    if(terrainLevel(x+dx*mid,y+dy*mid)>base+slope*mid)hit=Math.min(hit,mid);
    else if(terrainLevel(x+dx*far,y+dy*far)>base+slope*far)hit=Math.min(hit,far);
    if(hit<=far)return hit;
    if(far===limit)break;
    const crossX=nextX<=nextY+1e-8,crossY=nextY<=nextX+1e-8;
    if(crossX&&crossY&&(tileBlocks(i+sx,j)||tileBlocks(i,j+sy)))return far;
    if(crossX){i+=sx;nextX+=stepX;}
    if(crossY){j+=sy;nextY+=stepY;}
    near=far;
  }
  return limit;
}
function clearNPCShot(from,to,vision=false){
  const d=dE(from,to);
  return d<.01 || npcBarrier(from,(to.x-from.x)/d,(to.y-from.y)/d,d,to,vision)>=d;
}
function seesActor(observer, target, openRay=false) {
  if (!los(observer.x, observer.y, target.x, target.y)) return false;
  if(!openRay && observer.kind==='human' && !clearNPCShot(observer,target,true))return false;
  if (!target.crouch) return true;
  const dx = observer.x - target.x, dy = observer.y - target.y, d = Math.hypot(dx, dy);
  return !d || rayFence(target.x, target.y, dx / d, dy / d, 0, Math.min(d, FENCE_REACH)) === Infinity;
}
function shotBarrier(sh, ca, sa, reach, target=sh.tgt) {
  if(sh!==P && sh.kind==='human')return npcBarrier(sh,ca,sa,reach,target);
  const wall = Math.min(rayWall(sh.x, sh.y, ca, sa, reach),npcBarrier(sh,ca,sa,reach,target));
  return sh.crouch ? Math.min(wall, rayFence(sh.x, sh.y, ca, sa, 0, Math.min(wall, FENCE_REACH))) : wall;
}
const ballOff = sh => (sh.r || 11) + 8;
function shotTrace(sh, a, W, target=sh.tgt) {   // чистая функция исхода одного луча: {t, best, wall}
  const ca = Math.cos(a), sa = Math.sin(a), reach = W.range + ballOff(sh);
  const wallT = shotBarrier(sh,ca,sa,reach,target);
  let best = null, bt = wallT;

  for (const e of ents) {
    if (!e.alive || e === sh) continue;
    const t = rayCircle(sh.x, sh.y, ca, sa, e.x, e.y, e.r + (e.captive ? -4 : 0));
    if (t !== null && t <= bt) { best = e; bt = t; }
  }
  if (sh===P && best && best.crouch) {
    const centerT = (best.x - sh.x) * ca + (best.y - sh.y) * sa;
    const fence = rayFence(sh.x, sh.y, ca, sa, Math.max(0, centerT - FENCE_REACH), bt);
    if (fence <= bt) { bt = fence; best = null; }
  }
  if(sh===P){
    const box=containerOnRay(sh,ca,sa,bt);
    if(box.o)return {t:box.d,best:null,box:box.o,wall:true,ca,sa};
  }
  return { t: bt, best: best, wall: !best && bt < reach, ca: ca, sa: sa };
}
// Только реальные выстрелы между противниками продлевают локальную перестрелку.
function noteGunfight(sh, target) {
  if (!target || !hostile(sh,target)) return;
  const x=(sh.x+target.x)/2, y=(sh.y+target.y)/2;
  if (dst(P.x,P.y,x,y)>480) return;
  P.combatT=3;
  let fight=P.gunfight;
  if (!fight || fight.until<S.min || dst(x,y,fight.x,fight.y)>480) fight=P.gunfight={};
  Object.assign(fight,{x,y,until:S.min+8});
}
function fire(sh, ang, W, spread, target = sh.tgt) {
  const mz = muzzlePoint(sh, ang), n = W.pellets || 1;
  let shots;
  if(sh!==P){
    if(!target || !hostile(sh,target) || !clearNPCShot(sh,target) || !lineClear(sh,target))return false;
    shots=[];
    for(let k=0;k<n;k++){
      const a=ang+rnd(-spread,spread),r=shotTrace(sh,a,W,target);
      if(r.best && !hostile(sh,r.best))return false;
      shots.push({a,r});
    }
  }
  const ca0 = Math.cos(ang), sa0 = Math.sin(ang), mzT = Math.max(0, (mz.x - sh.x) * ca0 + (mz.y - sh.y) * sa0);
  const w0 = shotBarrier(sh, ca0, sa0, mzT + 1, target), blocked = w0 < mzT;   // ствол упёрся в стену: вспышка у стены, не за ней
  const fx = blocked ? sh.x + ca0 * Math.max(0, w0 - 1) : mz.x, fy = blocked ? sh.y + sa0 * Math.max(0, w0 - 1) : mz.y;
  if (sh!==P) noteGunfight(sh,target);
  // Дробины одного выстрела считаются одним попаданием по своим.
  const shot = sh === P ? { fight:P.gunfight, id:(P.shotId=(P.shotId || 0)+1) } : null;
  for (let k = 0; k < n; k++) {
    const a = shots ? shots[k].a : ang + (Math.random() - 0.5) * 2 * spread, r = shots ? shots[k].r : shotTrace(sh, a, W), ca = r.ca, sa = r.sa, best = r.best, bt = r.t;
    const ex = sh.x + ca * bt, ey = sh.y + sa * bt;
    if (bt > mzT + 0.5 && !blocked) tracers.push({ x0: mz.x, y0: mz.y, x1: ex, y1: ey, life: 0.07, w: n > 1 ? 1 : 1.6 });
    if(r.box && sh===P && r.box.k==='crate'){surfaceImpact(ex,ey,ca,sa,r.box);breakCrate(r.box);continue;}
    if (best && coverBlocks(best, sh.x, sh.y) && chance(best === P ? 0.6 : 0.5)) {
      const cx = best.x - ca * 22, cy = best.y - sa * 22;
      if (tracers.length && tracers[tracers.length - 1].x1 === ex) { tracers[tracers.length - 1].x1 = cx; tracers[tracers.length - 1].y1 = cy; }
      for (let i = 0; i < 4; i++) parts.push({ x: cx, y: cy, vx: rnd(-90, 90), vy: rnd(-90, 90), life: rnd(0.15, 0.3), c: '#d8c9a0', s: 1.6 });
    } else if (best && best.sid !== 'sid') {
      if (sh===P && hostile(sh,best)) noteGunfight(sh,best);
      const fall = n > 1 ? clamp(1.3 - Math.max(0, bt - ballOff(sh)) / W.range, 0.3, 1) : 1;
      hurt(best, W.dmg * fall * rnd(0.85, 1.15), sh, a, shot);
      if (sh===P) { P.hitT=.2; P.impact={x:ex,y:ey,kill:!best.alive}; }
    } else if (r.wall) surfaceImpact(ex,ey,ca,sa,r.box);
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
  return true;
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
function lineClear(sh, t, from=sh) {
  const a = Math.atan2(t.y - from.y, t.x - from.x), ca = Math.cos(a), sa = Math.sin(a), L = dE(from, t);
  for (const e of ents) {
    if (!e.alive || e === sh || e === t || hostile(sh, e)) continue;
    const vx = e.x - from.x, vy = e.y - from.y, k = vx * ca + vy * sa;
    if (k < 0 || k > L) continue;
    const px = vx - ca * k, py = vy - sa * k;
    if (px * px + py * py < (e.r + 6) ** 2) return false;
  }
  return true;
}
function melee(sh, W) {
  const passFriends = sh === P && combatNear();
  let hit = null, bd = 1e9;
  ents.forEach(e => {
    if(sh!==P && (!hostile(sh,e)||!clearNPCShot(sh,e)))return;
    if (!e.alive || e === sh || (passFriends && !hostile(sh, e))) return;
    const d = dE(e, sh);
    if (d < W.range + e.r + sh.r && Math.abs(angD(sh.ang, Math.atan2(e.y - sh.y, e.x - sh.x))) < 0.9 && d < bd) { hit = e; bd = d; }
  });
  play('knife', sh.x, sh.y);
  if(sh===P){
    const ca=Math.cos(sh.ang),sa=Math.sin(sh.ang);
    const reach=Math.min(W.range+sh.r, hit?Math.max(0,bd-hit.r):Infinity);
    const box=containerOnRay(sh,ca,sa,shotBarrier(sh,ca,sa,reach));
    if(box.o){breakCrate(box.o);return;}
  }
  if(hit && sh===P && canTakeDown(hit)){takedown(hit);return;}
  const sneak = hit && sh === P && hit.kind === 'human' && hit.tgt !== P && (hit.aw || 0) < 1;
  if(hit && hit.sid!=='sid')play('knifeHit',hit.x,hit.y);
  if (hit) hurt(hit, W.dmg * rnd(0.9, 1.1) * (sneak ? 3 : 1), sh, sh.ang);
}
function hurt(e, dmg, src, ang, shot) {
  if(BIG && src===P && e.guard==='south' && !(e.quiet && dmg>=e.hp))alarmPost();
  if (!e.alive || e.sid === 'sid' || (e.sid==='fox' && src===P)) return;
  if (src && (src === P || src.follow)) {
    e.hitByP = 1;
    if (e.sosFoe && S.sos && S.sos.act && S.sos.act.id === e.sosFoe) S.flags.sosAssist = e.sosFoe;
  }
  if (e === P) {
    if (src?.kind && src!==P) dmg*=rules().incoming;
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
    if (src === P && e.fac === 'loner' && e.hp > 0 && !hostile(e, P)) {
      const fight=shot?.fight;
      if (fight && fight.until>=S.min && dE(P,fight)<=480 && dE(e,fight)<=480 &&
          (!fight.warningShot || fight.warningShot===shot.id)) {
        if (!fight.warningShot) sayLine(e,'Свои!');
        fight.warningShot=shot.id;
      } else witnessLonerAttack(e, false,lonerWitnesses(e,!!shot || e.blastAt===S.min));
    }
    if(src===P && e.fac==='army' && !(e.quiet && e.hp<=0)){
      anger(e);
      for(const guard of ents)if(guard.alive && guard.fac==='army' && guard.guard===e.guard && dE(guard,e)<330)rememberAttacker(guard);
    }
    if (hostile(e, src)) {
      if(src===P && e.kind==='human')e.defendUntil=S.min+35;
      e.tgt = src; e.lastSeen = { x: src.x, y: src.y }; e.mem = e.angry?35:6; e.react = Math.min(e.react, 0.15); }
  }
  if (e.hp <= 0) kill(e, src,!!shot || e.blastAt===S.min);
}
function kill(e, src,loud=false) {
  if (e.sid === 'sid') return;
  if(BIG && STORY_KEYS.includes(e.sid)){
    if(src===P && e.fac==='loner')witnessLonerAttack(e,false,lonerWitnesses(e,loud));
    woundKey(e);return;
  }
  e.alive = 0; e.hp = 0;
  if (e === P) { deathT = 1.6; play('hurt'); return; }
  if (e.sid) S.dead[e.sid] = 1;
  if (e.den) clearedDen(e.den);
  const witnesses = src === P && e.fac === 'loner' ? lonerWitnesses(e,loud) : null;
  (witnesses || ents).forEach(o => { if (o.alive && o !== e && o.kind === 'human' && o.fac === e.fac && dE(o, e) < 420) o.morale = (o.morale === undefined ? 1 : o.morale) - 0.3; });
  decals.push({ x: e.x + rnd(-4, 4), y: e.y + rnd(-4, 4), r: rnd(10, 16), a: 0.75 });
  if (decals.length > 140) decals.shift();
  dropBody(e,!!witnesses?.length);
  const byPlayer = src === P;
  if (byPlayer) {
    if (e.kind !== 'human') S.stats.kM++; else S.stats.kS++;
    if (witnesses) witnessLonerAttack(e, true, witnesses);
    if (e.fac === 'bandit') S.rep += 3;
  } else if (e.fac === 'loner' && (dE(e, P) > 380 || !los(P.x, P.y, e.x, e.y))) {
    const why = src === 'blow' ? 'выброс' : src === 'anom' ? 'аномалия' : src && src.fac === 'mutant' ? 'слепые псы' : src && src.fac === 'bandit' ? 'бандиты' : src && src.fac === 'army' ? 'военные' : 'неизвестно';
    bulletin('Погиб сталкер ' + e.name + '. Причина: ' + why + '.');
  } else if (e.fac === 'bandit' && src && src.fac === 'loner' && dE(e, P) > 380) {
    bulletin('Одиночки убили бандита по кличке ' + e.name + '.');
  }
  plusKill(e, src);
}
const MUTANT_TROPHIES = {dog:'tail', boar:'hoof', sucker:'tentacle'};
function dropBody(e,identified=false) {
  const loot = {};
  const trophy = MUTANT_TROPHIES[e.kind];
  if (trophy) loot[trophy] = 1;
  else {
    if (e.money) loot.money = e.money;
    Object.keys(e.inv || {}).forEach(k => loot[k] = e.inv[k]);
    const W = WP[e.wpn];
    if (W && W.ammo) { loot[W.ammo] = (loot[W.ammo] || 0) + supplyCount((W.ammo === 'a545' || W.ammo === 'a762') ? ri(15, 35) : W.ammo === 'a12' ? ri(3, 8) : ri(6, 14)); loot[e.wpn] = (loot[e.wpn] || 0)+1; }
    if (e.fac === 'army' && chance(0.3)) loot.grenade = 1;
    if (e.sid === 'boss') { loot.ar_bandit = 1; loot.grenade = 2; }
  }
  if (e.kind === 'human' && (e.fac === 'loner' || e.fac === 'bandit') && chance(0.3)) loot.__tip = 1;
  const body = { k: 'body', x: e.x, y: e.y, ang: e.ang, fac: e.fac, kind: e.kind, name: e.name, seed: e.seed || 1, loot: loot, guns:e.guns, wcond:e.wcond, t: S.min };
  // Младший остаток визуального seed хранит расцветку и после загрузки тела.
  if (e.fac === 'loner' && e.kind === 'human') body.seed += jacketIndex(e) - body.seed % JACKET_COLORS.length;
  body.deathKnown=identified || !e.hitByP;
  objs.push(body); g7Fresh(body);   // визуальный переход падения (только в памяти, не в сейве)

}

/* ===================== ИИ ===================== */
/* стелс: насколько игрока видно (1 — обычно) и на каком расстоянии слышно его шаги */
function pVis() {
  let v = 1;
  const moving = Math.hypot(IN.moveX, IN.moveY) > 0.1 || P.jumpT > 0;
  if (P.crouch) v *= 0.55;
  if (!moving) v *= 0.75; else if (P.sprinting) v *= 1.25;
  if(darkness()>.3){
    let light=0;
    for(const lamp of siteLights())light=Math.max(light,lampExposure(lamp,P));
    v*=S.torch===false ? .6+.46*light : 1.1+.1*light;
  }   // ночью фонарь выдаёт, без него замечают на 40% позже
  return v;
}
/* враг ещё не в бою с игроком: копит подозрение (0..1). Видит только перед собой (~115°), сзади — только на слух */
function stealthTick(e, dt) {
  if (!P.alive || !hostile(e, P) || e.tgt === P || P.cloak > 0.7) { if (e.tgt === P) e.aw = 1; return; }
  const d = dE(e, P), aP = Math.atan2(P.y - e.y, P.x - e.x), range = sight(e) * pVis();
  let gain = 0;
  if (d < range && Math.abs(angD(e.ang, aP)) < 1.0 && seesActor(e, P)) gain = 0.45 + 2.4 * (1 - d / range);

  if(d<68 && Math.abs(angD(e.ang,aP))<1.15 && seesActor(e,P))gain=12;
  const was = e.aw || 0;
  e.aw = gain ? Math.min(1, was + gain * dt) : Math.max(0, was - 0.25 * dt);
  if (gain && e.aw > 0.4 && !e.sit) e.ang += angD(e.ang, aP) * Math.min(1, dt * 2.2);   // насторожился — поворачивается на звук
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

  if (SID_SHOP && e.sid === 'sid') {
    e.ang = Math.PI / 2;
    e.deskTime = (e.deskTime || 0) + dt;
    const visiting = inBunker(P.x, P.y) && dE(e, P) < 120;
    e.deskLook = lerp(e.deskLook || 0, visiting ? 1 : 0, Math.min(1, dt * 3));
    return;
  }
  if (e.captive) return;
  if(e.robberyAlarm && e.fac==='loner'){
    const responders=ents.filter(o=>o!==e && o.fac==='loner' && o.alive && !o.captive && !o.angry && dE(o,e)<170 && los(o.x,o.y,e.x,e.y));
    if(responders.length){responders.forEach(rememberAttacker);sayLine(e,'Мужики, он меня грабить хотел!');e.robberyAlarm=false;}
  }
  if((e.sid==='petr' || e.sid==='petr2' || atpVolunteers.includes(e.sid)) && !S.flags.assault && !S.flags.atpClear){
    e.tgt=null;e.path=null;return;
  }
  e.cool -= dt; e.think -= dt; stealthTick(e, dt);
  const W = WP[e.wpn];
  if (e.reload > 0) { e.reload -= dt; if (e.reload <= 0) e.mag = W.mag; }
  if (e.think <= 0) {
    e.think = 0.25 + Math.random() * 0.15;
    const t = findTarget(e);
    if (t && t !== e.tgt) { e.tgt = t; e.react = rnd(0.35, 0.8); if (chance(0.6)) callout(e, 'combat'); }
    if (!t && e.tgt && (!e.tgt.alive || !hostile(e, e.tgt))) e.tgt = null;
    // охрана южного блокпоста
    if(e.guard==='bridge' && bridgeBarrier?.solid && !S.flags.bridgePaid && !hostile(e,P) &&
       dE(P,bridgeBarrier)<120 && dE(e,P)<170 && seesActor(e,P) && warnT<=0){
      warnT=12;sayLine(e,'Стой у шлагбаума. За проход — пятьсот.');
    }
    if (e.guard === 'south' && BIG && ['case','escape'].includes(chapter()) && storyArea() && e.aw>=1)alarmPost();
    if (e.guard === 'south' && !(BIG && ['case','escape'].includes(chapter())) && P.alive && dE(e, P) < 300 && seesActor(e, P)) {
      const d = dE(e, P);
      if (d < 150 && !e.angry && !armyAngry) { e.angry=1;e.aw=1;e.tgt=P;e.react=.3;e.mem=8;e.lastSeen={x:P.x,y:P.y}; msg('Часовой: — Огонь по нарушителю!', 'bad'); }
      else if (d < 300 && warnT <= 0 && !e.angry) { warnT = 8; msg('Часовой: — Стой! Назад, стреляю без предупреждения!', 'bad'); }
    }
  }
  const t = e.tgt;
  if (t && t.alive && hostile(e, t)) { e.listen=null;combatHuman(e, t, W, dt); return; }
  if(e.inBattle){
    e.inBattle=false;e.healing=0;e.healT=0;e.firingSpot=null;e.peekTime=0;
    e.path=null;e.routeRetry=0;e.mem=0;e.lastSeen=null;
  }
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
  if (e.listen && !(e.mem>0) && investigateFootfall(e,dt))return;
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
  if (e.guard && e.guard!=='south' && e.guard!=='bridge') return 'hold';
  if(e.squadMate)return !has('flank')?'flank':'hold';
  if (WP[e.wpn].pellets && !has('push')) return 'push';
  if (mates.length >= 1 && !has('flank')) return 'flank';
  if (!has('push') && mates.length >= 2) return 'push';
  return 'hold';
}
/* укрытие: проходимая клетка рядом с препятствием, которое стоит между ней и целью */
// Search only locally connected cells. The travel cost follows doors and fence openings.
function battlePosition(e,t,minD,maxD,seekCover){
  const start=walkAnchor(e.x,e.y);
  if(start<0)return null;
  const queue=[start],steps=[0],visited=new Set(queue);
  let best=null,bestCost=Infinity;
  for(let i=0;i<queue.length;i++){
    const cell=queue[i],x=cell%MW,y=Math.floor(cell/MW),cost=steps[i]*T;
    if(cost>bestCost || steps[i]>9)break;
    const p={x:(x+.5)*T,y:(y+.5)*T},d=dE(p,t);
    if(d>=minD && d<=maxD && !ents.some(o=>o!==e&&o.alive&&o.cover&&dE(o.cover,p)<22)){
      const dx=(t.x-p.x)/d,dy=(t.y-p.y)/d;
      const usable=seekCover ? npcBarrier(p,dx,dy,54,t)<54 :
        dE(e,p)>20 && clearNPCShot(p,t) && lineClear(e,t,p);
      if(usable){
        const score=cost+Math.abs(d-(minD+maxD)/2)*.22;
        if(score<bestCost){bestCost=score;best=p;}
      }
    }
    for(let k=0;k<8;k++){
      const n=navNeighbor(x,y,k);
      if(n>=0&&!visited.has(n)){visited.add(n);queue.push(n);steps.push(steps[i]+1);}
    }
  }
  return best;
}
function findCover(e,t,minD,maxD){
  const near=Math.max(25,Math.min(minD,dE(e,t)-64));
  return battlePosition(e,t,near,maxD,true);
}
function npcHeal(e,patient=e) {
  const id = e.inv.medkit ? 'medkit' : e.inv.bandage ? 'bandage' : null;
  if (!id) return false;
  e.inv[id]--; if (!e.inv[id]) delete e.inv[id];
  patient.hp = Math.min(patient.maxhp, patient.hp + (id === 'medkit' ? 45 : 18));
  return true;
}
function npcGrenade(e, x, y) {
  const dest={x,y};
  if(!clearNPCShot(e,dest) || ents.some(o=>o!==e&&o.alive&&!hostile(e,o)&&dE(o,dest)<145))return;
  e.nade = 0;
  const a = Math.atan2(y - e.y, x - e.x), d = Math.min(260, dst(e.x, e.y, x, y));
  nades.push({ x: e.x, y: e.y, vx: Math.cos(a) * d * 1.25, vy: Math.sin(a) * d * 1.25, t: 1.6, z: 0, vz: 160, owner: e });
  callout(e, 'nade', true);
  if (dst(x, y, P.x, P.y) < 300) msg('Граната! Уходи с места!', 'bad');
}
function combatHuman(e, t, W, dt) {
  if(!e.inBattle){
    e.inBattle=true;
    if(e.sit)e.seat=1;
    if(!e.trip&&!e.follow)e.trip={stage:2,returnTo:e.guard?{...e.home}:{x:e.x,y:e.y}};
    e.coverWait=0;
    if(e.trip?.stage===1)e.trip.stage=0;
  }
  e.sit=0;e.campRise=null;e.aidTarget=null;
  const d=dE(e,t), inRange=d<sight(e)*1.45;
  const openRay=inRange && clearNPCShot(e,t);
  const visible=inRange && seesActor(e,t,openRay), see=visible && openRay;
  if (visible) { e.lastSeen = { x: t.x, y: t.y }; e.mem = t===P && e.angry?35:8; e.react -= dt; e.unseen = 0; }
  else { e.mem -= dt; e.unseen = (e.unseen || 0) + dt; }
  const want = Math.atan2(t.y - e.y, t.x - e.x);
  // Step out of a friendly firing lane while there is still room to move sideways.
  if(e.fac==='loner' && !e.guard && t!==P && P.alive && S.weapon!=='knife' && S.weapon!=='hands' &&
      (IN.btnFire || IN.aimStick?.active) && dE(e,P)<250){
    const dx=e.x-P.x,dy=e.y-P.y,fx=Math.cos(P.ang),fy=Math.sin(P.ang);
    const across=dy*fx-dx*fy,along=dx*fx+dy*fy;
    if(along>10 && along<dE(P,t) && Math.abs(across)<22){
      const side=Math.sign(across)||1,x=e.x-fy*side*48,y=e.y+fx*side*48;
      if(clearWalk(e.x,e.y,x,y,e.r)){goTo(e,x,y,110,dt);return;}
    }
  }
  const danger=nades.find(n=>n.t>0 && dE(e,n)<130 && los(e.x,e.y,n.x,n.y));
  if(danger){
    const away=Math.atan2(e.y-danger.y,e.x-danger.x);
    goTo(e,e.x+Math.cos(away)*135,e.y+Math.sin(away)*135,139,dt);return;
  }
  if (!e.role) { e.tacT=0; e.role = pickRole(e, t); e.morale = e.morale === undefined ? 1 : e.morale; if (e.nade === undefined) e.nade = (e.fac === 'army' ? 0.6 : e.fac === 'bandit' ? 0.35 : 0.2) > Math.random() ? 1 : 0; }
  e.tacT = (e.tacT || 0) - dt;
  // бегство при потере духа
  if (e.morale < 0.35 && e.hp < e.maxhp * 0.5 && !e.guard) {
    if (!e.routT) {
      e.routT=rnd(5,8);e.cover=findCover(e,t,Math.max(30,d-30),d+230);callout(e,'hurt',true);
    }
    e.routT -= dt; e.crouch = 0;
    if(e.cover)goTo(e,e.cover.x,e.cover.y,128,dt);
    else steer(e,e.x-Math.cos(want)*60,e.y-Math.sin(want)*60,128,dt);
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
  // Finish the move into cover, then seek a shooting angle on the last known position.
  if(e.cover && !see && e.role==='hold' && e.mem>0){
    if(dE(e,e.cover)>9){goTo(e,e.cover.x,e.cover.y,105,dt);return;}
    e.inCover=1;e.crouch=1;
    e.coverWait=(e.coverWait||0)+dt;
    if(e.coverWait<.85)return;
    e.coverWait=0;e.cover=null;
  }
  // цель не видна
  if (!see) {
    e.crouch = 0; e.inCover = 0;
    if(e.lastSeen && (!e.guard || e.guard==='south' || e.guard==='bridge') && e.mem>0){
      e.peekTime=(e.peekTime||0)-dt;
      if(e.peekTime<=0){
        e.peekTime=1.5;e.firingSpot=battlePosition(e,e.lastSeen,28,W.range||300,false);
      }
      const dest=e.firingSpot||e.lastSeen;
      if(e.guard==='bridge' && dE(dest,e.home)>260){
        goTo(e,e.home.x,e.home.y,75,dt);
      }else{e.cover=null;goTo(e,dest.x,dest.y,90,dt);}
    }
    if (e.mem <= 0) { e.tgt = null; e.role = null; }
    return;
  }
  e.ang += angD(e.ang, want) * Math.min(1, dt * 7);
  const pref = W.pref || 20;
  // движение по роли
  if (W.melee) { e.crouch = 0; goTo(e, t.x, t.y, 110, dt); }
  else if (e.guard && (d<W.range*.92 && lineClear(e,t) || e.guard!=='south' && e.guard!=='bridge')) { e.crouch = d > 160 ? 1 : 0; }
  else if (e.role === 'hold') {
    if (e.tacT <= 0) { e.tacT = rnd(4, 8); e.cover = findCover(e, t, Math.max(120, pref - 60), pref + 160); }
    if (e.cover && dst(e.x, e.y, e.cover.x, e.cover.y) > 10) { e.crouch = 0; e.inCover = 0; goTo(e, e.cover.x, e.cover.y, 105, dt); }
    else { e.inCover = !!e.cover; e.crouch = e.cover ? (e.cool > W.rate * 1.2 ? 1 : 0) : 0; if (!e.cover && d < pref - 60) goTo(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 70, dt); }
  } else if (e.role === 'flank') {
    if (!e.side) e.side = chance(0.5) ? 1 : -1;
    const fa = want + Math.PI + e.side * 1.25, fx = t.x + Math.cos(fa) * pref, fy = t.y + Math.sin(fa) * pref;
    e.crouch = 0; e.inCover = 0;
    if (!clearFooting(fx,fy,e.r) || goTo(e, fx, fy, 112, dt) < 30 || e.routeRetry>0 || e.stuck > 1) { e.role = 'hold'; e.cover = null; }
  } else {
    e.crouch = 0; e.inCover = 0;
    if (d > pref) goTo(e, t.x, t.y, 92, dt);
    else { e.strT = (e.strT || 0) - dt; if (e.strT <= 0) { e.strT = rnd(0.8, 1.8); e.side = chance(0.5) ? 1 : -1; } goTo(e, e.x + Math.cos(want + e.side * 1.57) * 60, e.y + Math.sin(want + e.side * 1.57) * 60, 64, dt); }
  }
  // гранату в укрывшегося
  if (e.nade && t.crouch && d > 120 && d < 260 && chance(dt * 0.25)) { npcGrenade(e, t.x, t.y); return; }
  // огонь
  if (W.melee) { if (d < e.r + t.r + W.range && e.cool <= 0) { e.cool = W.rate * 1.6; melee(e, W); } return; }
  if (e.react <= 0 && e.cool <= 0 && e.reload <= 0 && d < W.range * 0.92 && Math.abs(angD(e.ang, want)) < 0.25) {
    if (!lineClear(e,t)) {
      if(!e.guard || e.guard==='south' || e.guard==='bridge'){
        e.peekTime=(e.peekTime||0)-dt;
        if(e.peekTime<=0){e.peekTime=1;e.firingSpot=battlePosition(e,t,28,W.range,false);}
        if(e.firingSpot)goTo(e,e.firingSpot.x,e.firingSpot.y,86,dt);
      }
      return;
    }
    const moving = !e.inCover && e.role !== 'hold';
    const acc = { bandit: 0.12, loner: 0.1, army: 0.07 }[e.fac] + (night() && d > 200 ? 0.05 : 0) + (moving ? 0.04 : 0) + (t === P && P.crouch ? 0.03 : 0);
    e.crouch = 0;
    if(!fire(e,e.ang,W,W.spread+acc))return;
    e.mag--;
    e.cool = W.auto ? (e.burst = (e.burst || 0) + 1) % 4 === 0 ? rnd(0.7, 1.3) : W.rate * 1.3 : W.rate * rnd(2.2, 3.4);
    if (e.mag <= 0) { e.reload = W.reload * 1.2; if(dE(e,P)<210)play(reloadSound(e.wpn),e.x,e.y,.48); e.crouch = 1; if (chance(0.5)) callout(e, 'reload'); }
  }
}
// 0 — сидит у огня, 1 — полностью встал. При смене намерения продолжаем с текущей позы.
function setCampSeat(e, sitting) {
  if (!!e.sit === sitting) return;
  if (e.fac === 'loner' && e.fireRef && window.CORDON_G8_ON && G3_READY() && e.campRise == null)
    e.campRise = e.sit ? 0 : 1;
  e.sit = sitting ? 1 : 0;
}
// On a quiet stretch a free stalker can interrupt an errand to dress a companion's wound.
function helpCompanion(e,dt){
  if(e.fac!=='loner'||e.follow||e.guard||e.stay||e.named||e.sos||e.jobTag||e.squadMate)return false;
  const patient=o=>o!==e&&o!==P&&o.alive&&o.fac===e.fac&&!o.wounded&&!o.captive&&!o.tgt&&
    o.hp<o.maxhp*.5&&dE(e,o)<160;
  if(e.aidTarget && (!patient(e.aidTarget)||!(e.inv.medkit||e.inv.bandage)))e.aidTarget=null;
  if(!e.aidTarget){
    e.aidCheck=(e.aidCheck||0)-dt;if(e.aidCheck>0)return false;
    e.aidCheck=2+(e.id%5)*.23;
    if(e.hp<e.maxhp*.5||!(e.inv.medkit||e.inv.bandage))return false;
    let nearest=Infinity;
    for(const o of ents)if(patient(o)&&dE(e,o)<nearest&&seesActor(e,o)&&
      !ents.some(m=>m.alive&&m!==e&&m.aidTarget===o)&&walkAnchor(o.x,o.y)>=0){
      e.aidTarget=o;nearest=dE(e,o);
    }
    if(!e.aidTarget)return false;
    if(e.sit){e.seat=1;e.trip ||= {stage:2};setCampSeat(e,false);}
    e.aidTime=0;
  }
  const o=e.aidTarget;e.aidTime+=dt;
  if(dE(e,o)<34&&clearWalk(e.x,e.y,o.x,o.y,e.r)){
    npcHeal(e,o);e.assisted=o.assisted=true; sayLine(e,'Держись. Сейчас перевяжу.');
    e.aidTarget=null;e.aidCheck=12;
  }else if(e.aidTime>8){e.aidTarget=null;e.aidCheck=10;}
  else goTo(e,o.x,o.y,78,dt);
  return true;
}
function idleHuman(e, dt) {
  if(chapter()==='aid' && S.campaign.villageMedic && e.sid===S.campaign.villageMedic){
    const wolf=byS('wolf');
    if(wolf?.wounded){
      setCampSeat(e,false);
      if(dE(e,wolf)>44)goTo(e,wolf.x,wolf.y,84,dt);
      else {e.crouch=1;e.ang=Math.atan2(wolf.y-e.y,wolf.x-e.x);}
      return;
    }
  }
  if(e.squadMate && chapter()==='battle'){
    const i=Math.max(0,RAIDERS.indexOf(e.name)), site=northCamp();
    const a=Math.atan2(site.y-P.y,site.x-P.x), lateral=(i-2)*48;
    const forward=Math.min(82,dE(P,site)-122)-Math.abs(i-2)*20;
    const x=P.x+Math.cos(a)*forward-Math.sin(a)*lateral;
    const y=P.y+Math.sin(a)*forward+Math.cos(a)*lateral;
    if(dst(e.x,e.y,x,y)>40)goTo(e,x,y,90,dt);
    return;
  }
  if((e.sid==='petr' || e.sid==='petr2' || atpVolunteers.includes(e.sid)) && S.flags.assault && !S.flags.atpClear){
    const goal=atpDestination(e.sid);if(dE(e,goal)>12)goTo(e,goal.x,goal.y,82,dt);
    return;
  }
  if (followTick(e, dt)) return;
  if(e.sid==='shust' && S.campaign?.liberated){
    const room=loftAt(e);
    if(room){
      if(goTo(e,room.landing.x,room.landing.y,62,dt)<11){
        e.x=room.stair.x;e.y=room.stair.y;e.path=null;e.routeRetry=0;
        e.trip={stage:2,returnTo:{...e.home}};
      }
      return;
    }
  }
  if(e.trip?.returnTo){
    const dest=e.trip.returnTo;
    if(goTo(e,dest.x,dest.y,82,dt)<7){
      e.trip=null;if(e.seat)setCampSeat(e,true);
    }
    return;
  }
  if(e.sid==='wolf'){
    if(dE(e,e.home)>5)goTo(e,e.home.x,e.home.y,65,dt);
    else if(livingZone && P.alive && !P.crouch && P.mv>4 && dE(P,e)<100 && los(e.x,e.y,P.x,P.y))
      e.ang+=angD(e.ang,Math.atan2(P.y-e.y,P.x-e.x))*Math.min(1,dt*4);
    return;
  }
  if(helpCompanion(e,dt) || rainErrand(e,dt))return;
  if(e.guard==='south' && BIG && night()){
    if((e.aw||0)>.05 && storyArea() && seesActor(e,P)){
      const direction=Math.atan2(P.y-e.y,P.x-e.x);
      e.ang+=angD(e.ang,direction)*Math.min(1,dt*3);
      return;
    }
    const west=e.sid==='a4' || e.sid?.startsWith('reliefa4');
    const route=west?[[123,202],[122,210],[126,210]]:[[132,208],[138,208],[132,211]];
    const index=e.postWaypoint||0, [x,y]=route[index], dest=worldPoint(x+.5,y+.5);
    if(dE(e,dest)>12)goTo(e,dest.x,dest.y,42,dt);
    else if((e.idleT-=dt)<=0){e.postWaypoint=(index+1)%route.length;e.idleT=3;}
    return;
  }
  if (e.guard) {
    if (dE(e, e.home) > 8) goTo(e, e.home.x, e.home.y, 70, dt);
    else { e.ang += angD(e.ang, (e.guard === 'south' || (BIG && e.sid==='a1')) ? -Math.PI / 2 : Math.PI / 2) * dt * 2; }
    return;
  }
  if (e.sit) {
    e.ang += angD(e.ang, Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x)) * dt * 2;
    if (e.fac === 'loner' && !e.named && !e.stay && !e.squadMate && chance(dt * 0.004)) { setCampSeat(e, false); startTrip(e); }
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
      if (nav[ti] && clearWalk(e.x,e.y,wx,wy,e.r)) e.wander = { x: wx, y: wy };
    } else e.ang += rnd(-1.2, 1.2);
  }
  if (e.fac === 'loner' && !e.stay && !e.named && chance(dt * 0.003)) startTrip(e);
}
function startTrip(e) {
  // In poor weather prefer the local camp, in daylight favour a nearby unoccupied stop.
  const resting=night()||WX.rain>.45||e.hp<e.maxhp*.65;
  const spots=LOCATIONS.filter(l=>!['danger','anomaly'].includes(l.type) &&
    l.id!=='sid' && (l.anchors.fire||l.entrances?.length)).map(l=>{
    const [x,y]=l.anchors.fire||l.entrances[0],angle=e.id*2.4;
    const p=l.anchors.fire?freeTile(x+3*Math.cos(angle),y+3*Math.sin(angle)):freeTile(x,y);
    const dest={x:p.x*T,y:p.y*T},distance=dE(e,dest);
    const busy=ents.filter(m=>m!==e&&m.alive&&m.trip?.stage===0&&dE(m.trip,dest)<60).length;
    const score=distance*(.8+Math.random()*.4)+busy*180+(resting&&!l.anchors.fire?750:0);
    return {dest,score,distance};
  }).filter(s=>s.distance>90&&s.distance<2600).sort((a,b)=>a.score-b.score);
  for(const {dest} of spots){
    if(ents.some(o=>o.alive&&hostile(e,o)&&dE(o,dest)<220)||!findPath(e.x,e.y,dest.x,dest.y,true))continue;
    e.seat=e.seat||(dE(e,FIRE)<110?1:0);
    e.trip={...dest,stage:0};return;
  }
  if(e.seat)setCampSeat(e,true);
}
function aiDog(e, dt) {
  e.cool -= dt; e.think -= dt; e.barkT -= dt;
  const t=mutantTarget(e,dt,night()?320:280,520);
  if (t) {
    if (e.barkT <= 0) { e.barkT = rnd(2, 5); play(dE(e,t)<105?'growl':'dog', e.x, e.y); }
    const want=Math.atan2(e.trail.y-e.y,e.trail.x-e.x);
    e.ang+=angD(e.ang,want)*Math.min(1,dt*9);
    if (e.hp < e.maxhp * 0.35 && !e.fled) { e.fleeT = 2; e.fled = 1; }
    if(e.fleeT>0){e.fleeT-=dt;goTo(e,e.home.x,e.home.y,170,dt);return;}
    if(!canStrike(e,t,e.r+t.r+4))mutantApproach(e,e.trail,172,dt);
    else if (e.cool <= 0) {
      e.cool = rnd(0.7, 1.1);
      hurt(t, rnd(7, 13), e, want);
      e.kx -= Math.cos(want) * 140; e.ky -= Math.sin(want) * 140;
    }
    return;
  }
  roamDen(e,dt,55);
}

/* ===================== задания ===================== */
function qTargets() {
  return campaignTargets();
}
/* отслеживаемая цель: выбранное задание, иначе первое активное (SOS не перехватывает выбор) */
function trackedTarget() {
  const T0 = qTargets();
  const act = qList().filter(q => q.st === 'a');
  if (!act.some(q => q.id === S.trackedQuestId)) S.trackedQuestId = (act.find(q => q.id !== 'sos') || act[0] || {}).id || null;
  return T0.find(t => t.qid === S.trackedQuestId) || null;
}
function qList() {
  return campaignList();
}

/* ===================== жизнь мира ===================== */
function spawnTick() {
  const far = (x, y) => dst(x, y, P.x, P.y) > 520;
  const villageLoners = ents.filter(e => e.alive && e.fac === 'loner' && !e.named && dst(e.home.x, e.home.y, FIRE.x, FIRE.y) < 260).length;
  if (villageLoners < 4 && far(...RMp(21 * T, 82.5 * T))) {
    const seat = YARD_SEATS.map(s=>RMt(s.x,s.y)).find(([x,y])=>
      !ents.some(o=>o.alive && o.home && dst(x*T,y*T,o.home.x,o.home.y)<24));
    if(seat){
      const [x,y]=RMt(21,82.5);
      const e=mkHuman({fac:'loner',x,y,wpn:chance(.7)?'w_pm':'w_obrez'});
      e.home={x:seat[0]*T,y:seat[1]*T};e.seat=1;e.fireRef=FIRE;
      e.trip={...e.home,stage:2};
      ents.push(e);
    }
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
    news('Сводка: на дорогу с востока вышла группа бандитов.');
  }
  renewDens();
}
