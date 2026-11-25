/* ===================== игрок и мир за кадр ===================== */
const HURTDIR = [];
let hurtFlash = 0, deathT = 0, shakeA = 0, geigerAcc = 0, radRate = 0, ambT = 0;
const IN = { mx: 0, my: 0, fire: false, moveX: 0, moveY: 0, sprint: false, runPointer: null, aimStick: null };
function shake(a) { shakeA = Math.max(shakeA, a); }
const fog = new Uint8Array(MW * MH);
function reveal() {
  if (inBunker(P.x, P.y)) return;
  const cx = Math.floor(P.x / T), cy = Math.floor(P.y / T), r = night() ? 7 : 11;
  let ch = false;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
    if (inb(x, y) && !fog[y * MW + x] && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) { fog[y * MW + x] = 1; ch = true; }
  if (ch) {
    if (!fogDirty) fogRegion = [cx-r,cy-r,cx+r+1,cy+r+1];
    else if (fogRegion) {
      fogRegion[0]=Math.min(fogRegion[0],cx-r); fogRegion[1]=Math.min(fogRegion[1],cy-r);
      fogRegion[2]=Math.max(fogRegion[2],cx+r+1); fogRegion[3]=Math.max(fogRegion[3],cy+r+1);
    }
    fogDirty = true;
  }
}
let fogDirty = true, fogRegion = null;

function startReload() {
  const W = WP[S.weapon];
  if (!W) return;
  if (P.jam && !W.melee) { P.jam = 0; P.reload = 0.8; play('jam'); return; }
  if (W.melee || P.reload > 0) return;
  const m = S.mag[S.weapon] || 0;
  if (m >= W.mag || !cnt(W.ammo)) return;
  P.reload = W.reload; play(reloadSound(S.weapon));
}
function finishReload() {
  const W = WP[S.weapon]; if (!W || W.melee) return;
  const m = S.mag[S.weapon] || 0, n = Math.min(W.mag - m, cnt(W.ammo));
  if(n<=0)return;
  take(W.ammo, n); S.mag[S.weapon] = m + n; hudT=quickHudT=0;
}
let noAmmoT = 0;
function playerFire() {
  const W = WP[S.weapon];
  if (!W || P.cool > 0 || P.reload > 0) return;
  if (W.toss) { P.cool = W.rate; throwNade(); if (!has('grenade')) setTimeout(() => { if (S.weapon === 'grenade') { S.weapon = 'knife'; } }, 300); return; }
  if (W.melee) { P.cool = W.rate; melee(P, W); return; }
  if (P.jam) { if (noAmmoT <= 0) { noAmmoT = 1; play('click'); } return; }
  const m = S.mag[S.weapon] || 0;
  if (m <= 0) {
    if (cnt(W.ammo)) startReload();
    else if (noAmmoT <= 0) { noAmmoT = 1.2; play('click'); msg('Нет патронов к ' + W.n + '. Переключись на другое оружие или купи патроны.'); }
    return;
  }
  if (wearAndJam(S.weapon)) { P.cool = 0.3; return; }
  if(storyArea())alarmPost();
  if(S.campaign.atpWait && !S.flags.assault && locAt(P.x/T,P.y/T)?.id==='atp')beginAssault();
  S.mag[S.weapon] = m - 1; P.cool = W.rate;
  const moving = Math.abs(IN.moveX) + Math.abs(IN.moveY) > 0.1;
  const spread = W.spread + P.bloom + (moving ? .035 : 0) + (100-cond(S.weapon))*.0008 - (P.crouch ? .015 : 0);
  fire(P, P.ang, W, Math.max(0, spread)*rules().spread);
  P.bloom = Math.min(.14, P.bloom + (W.auto ? .018 : .03));
  P.bloomDelay = .24;
  P.shotFlash = .12;
  if (m===1 && cnt(W.ammo)) {
    const gun=S.weapon, shooter=P;
    setTimeout(()=>{if(P===shooter && P.alive && S.weapon===gun && !S.mag[gun]) startReload();},150);
  }
}
function cycleWeapon(dir) {
  const own = ['knife', ...Object.keys(KIT_LABELS).map(kitItem).filter(Boolean), ...(has('guitar')?['guitar']:[]), 'hands'];
  const i = own.indexOf(S.weapon);
  setWeapon(own[(i + (dir || 1) + own.length) % own.length]);
}
function setWeapon(w) {
  if (w !== 'hands' && w !== 'knife' && !has(w)) return;
  const slot = kitSlot(w);
  if (slot) S.flags.kit[slot] = w;
  if (S.weapon !== w) {releaseFireStick();stopPlayingGuitar();}
  S.weapon = w;
  P.detD = Infinity; P.detT = 0;
  P.reload = 0; P.cool = 0.25; P.jam = 0;
}
function useItem(id) {
  const it = ITEMS[id];
  if (id === 'energy' && has(id)) {
    take(id,1); S.flags.energyUntil = S.min + 60; S.flags.poppySleep = 0; play('eat'); return true;
  }
  if (!has(id) || (it.heal === undefined && it.rad === undefined)) return false;
  take(id, 1);
  if(id==='vodka'){S.food=Math.max(0,S.food-8);S.flags.dizzyUntil=S.min+35;}
  if (it.heal) P.hp = clamp(P.hp + it.heal, 1, 100);
  if (it.rad) S.rad = Math.max(0, S.rad - it.rad);
  if (FOOD[id]) { S.food = Math.min(100, S.food + FOOD[id]); play('eat'); } else play('pick');
  if (id === 'medkit') S.bleed = 0; if (id === 'bandage') S.bleed = Math.max(0, S.bleed - 2);
  return true;
}
function healWith(id) {
  if (P.medT > 0) return; hideMedPick();
  if (!has(id)) { msg(id === 'medkit' ? 'Аптечек нет.' : 'Бинтов нет.'); return; }
  P.medT = 1; useItem(id);
}
/* кнопка аптечки: есть и бинты, и аптечки — даёт выбрать; есть что-то одно — сразу лечит */
function medButton() {
  const m = cnt('medkit'), b = cnt('bandage');
  if (!m && !b) { msg('Нечем лечиться. Аптечки и бинты продаёт Сидорович.'); return; }
  if (!m || !b) { healWith(m ? 'medkit' : 'bandage'); return; }
  const mp = document.getElementById('medpick'); if (!mp.hidden) { hideMedPick(); return; }
  mp.hidden = false; positionMedicinePicker();   // висит, пока не выберешь или не нажмёшь кнопку ещё раз
}
function hideMedPick() { const mp = document.getElementById('medpick'); if (mp) mp.hidden = true; }
function quickHeal() {
  if (P.medT > 0) return;
  P.medT = 1;
  if (S.bleed > 0 && P.hp > 60 && useItem('bandage')) return;
  if (!useItem('medkit') && !useItem('bandage')) msg('Нечем лечиться. Аптечки и бинты продаёт Сидорович.');
}
function throwBolt() {
  if (P.boltT > 0) return; P.boltT = 0.6;
  const a = P.ang, L = 170;
  let ex = P.x, ey = P.y;
  for (let t = 10; t <= L; t += 6) { const x = P.x + Math.cos(a) * t, y = P.y + Math.sin(a) * t; if (solidPx(x, y)) break; ex = x; ey = y; }
  bolts.push({ x0: P.x, y0: P.y, x1: ex, y1: ey, t: 0, dur: 0.45, hit: null });
}
/* фонарик: ночью светит конусом; выключенный — почти темнота вокруг, зато тебя хуже видно издалека */
function toggleTorch() { S.torch = S.torch === false; play('click'); }
/* прыжок: короткий рывок по направлению движения; ящики, мешки, блоки и барьеры перепрыгиваются */
function canVaultObject(o) {
  if(o.k==='fence') return !o.material || ['picket','rail'].includes(o.material);
  return o.k==='crate' || o.k==='sand' || o.k==='blocks' || o.k==='bench';
}
function energyActive() { return S.flags.energyUntil > S.min; }
function exertion(kg) {
  return (1 + .8 * clamp(kg / carryLimit(), 0, 1)) * (energyActive() ? .65 : 1);
}
function startJump() {
  if (P.jumpT > 0 || (P.jumpCD || 0) > 0 || P.sit) return;
  const cost = 15 * exertion(weight());
  if (P.st < cost) { msg('Нет сил прыгать: отдышись.'); return; }
  if (swampAt(P.x, P.y)) { msg('В болоте не прыгнешь.'); return; }
  const ml = Math.hypot(IN.moveX, IN.moveY), a = ml > 0.2 ? Math.atan2(IN.moveY, IN.moveX) : P.ang;
  P.crouch = 0; P.jumpT = JUMP_T; P.jumpCD = 0.85; P.st -= cost; P.jumpA = a; play(surf(P.x,P.y));
}
const JUMP_T = 0.42, JUMP_V = 250;
/* тихое убийство: сзади, пока враг не заметил. Тяжёлая броня защищает от мгновенного поражения */
function canTakeDown(e){
  return S.weapon==='knife' && e.kind==='human' && (hostile(e,P) || e.fac==='army') && !e.captive && e.tgt!==P && (e.aw||0)<1 &&
    dE(e,P)<42 && Math.abs(angD(e.ang,Math.atan2(P.y-e.y,P.x-e.x)))>1.9 && clearNPCShot(P,e);
}
function takedown(e) {
  if (!canTakeDown(e)) return;
  const a = Math.atan2(e.y - P.y, e.x - P.x); P.ang = a; P.cool = 0.7; play('knifeHit', e.x, e.y);
  const heavy = e.sid === 'boss' || e.heavyArmor;
  if (!heavy) { e.quiet = 1; hurt(e, e.hp + 5, P, a); msg('Тихо снял: ' + e.name + '.', 'good'); }
  else { hurt(e, 85, P, a); msg('Броня приняла удар. Добивай!', 'bad'); }
  ents.forEach(o => { if (o !== e && o.alive && hostile(o, P) && o.tgt !== P && dE(o, e) < 150 && los(o.x, o.y, e.x, e.y)) o.aw = Math.max(o.aw || 0, 0.75); });   // кто рядом и видел — насторожился
}
function solidPx(x, y, skipFences = false) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (!inb(tx, ty) || SOLID[map[ty * MW + tx]]) return true;
  if(propCells.get(ty*MW+tx)?.some(p=>touchesProp(p,{x,y,r:0}))) return true;
  return objs.some(o => o.solid && !(skipFences && o.k === 'fence') && x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h);
}
function throwNade() {
  if (!has('grenade')) { msg('Гранат нет.'); return; }
  if (!kitItem('grenade')) { msg('Положи гранату в слот снаряжения.'); return; }
  if (P.nadeT > 0) return; P.nadeT = 1;
  if(storyArea())alarmPost();
  take('grenade', 1);
  const a = P.ang;
  nades.push({ x: P.x, y: P.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, t: 1.5, z: 0, vz: 160, owner: P });
  setTimeout(() => ents.forEach(e => { if (e.alive && e !== P && dE(e, P) < 420 && chance(0.5)) callout(e, 'nade', true); }), 500);
}
function explode(n) {
  play('boom', n.x, n.y); shake(dst(n.x, n.y, P.x, P.y) < 400 ? 9 : 2);
  flashes.push({ x: n.x, y: n.y, a: 0, life: 0.18, big: 1 });
  for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), v = rnd(60, 260); parts.push({ x: n.x, y: n.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.8), c: i % 3 ? '#3a3730' : '#f0a040', s: rnd(2, 4), smoke: i % 3 ? 1 : 0 }); }
  decals.push({ x: n.x, y: n.y, r: 26, a: 0.5, burn: 1 });
  ents.forEach(e => {
    if (!e.alive) return;
    const d = dE(e, n);
    if (d<130 && los(n.x,n.y,e.x,e.y) && (n.owner===P || clearNPCShot(n,e))){
      e.blastAt=S.min;hurt(e,100*(1-d/130)+10,n.owner,Math.atan2(e.y-n.y,e.x-n.x));
    }
  });
  ents.forEach(e => { if (e !== P && e.alive && dE(e, n) < 600 && hostile(e, P) && (e.tgt===P || seesActor(e,P))) { e.lastSeen = { x: P.x, y: P.y }; e.mem = Math.max(e.mem || 0,e.angry?35:6); } });
}

let draggedBody=null, bodyCheck=0;
function updateBodies(dt){
  if(draggedBody){
    const b=draggedBody,d=dE(b,P);
    if(!P.alive || !objs.includes(b) || P.sprinting || d>70)draggedBody=null;
    else if(d>23){
      b.deathSpot ||= {x:b.x,y:b.y};
      const pull=(d-23)*(1-Math.exp(-12*dt))/d;
      const x=b.x+(P.x-b.x)*pull,y=b.y+(P.y-b.y)*pull;
      if(clearWalk(b.x,b.y,x,y,5)){b.x=x;b.y=y;}
      else if(clearWalk(b.x,b.y,x,b.y,5))b.x=x;
      else if(clearWalk(b.x,b.y,b.x,y,5))b.y=y;
      const turn=angD(b.ang||0,Math.atan2(P.y-b.y,P.x-b.x));
      b.ang=(b.ang||0)+turn*(1-Math.exp(-7*dt));
    }
  }
  bodyCheck-=dt;if(bodyCheck>0)return;bodyCheck=2;ageRemains();
  for(const b of objs){
    if(b.k!=='body' || b.fac!=='loner' || b.discovered || b.raidBody || dE(b,P)>900)continue;
    const witness=ents.find(e=>e.alive && e.fac==='loner' && !e.captive && dE(e,b)<120 && seesActor(e,b));
    if(!witness)continue;
    b.discovered=true;
    if(!b.deathKnown){
      const discoveries=S.flags.unsolvedDeaths ||= [];
      S.flags.unsolvedDeaths=discoveries.filter(t=>t>S.min-1440).concat(S.min).slice(-5);
    }
    sayLine(witness,'Человек лежит! Кто-нибудь видел, что случилось?');
    witness.sit=0;witness.lastSeen={x:b.x,y:b.y};witness.mem=15;
    if(b===draggedBody && seesActor(witness,P)){S.rep-=18;rememberAttacker(witness);}
  }
}
function resolveActorContacts(dt){
  // толкотня и отдача
  for (let i = 0; i < ents.length; i++) {
    const a = ents[i]; if (!a.alive) continue;
    if (a.sid === 'sid') { a.x = a.home.x; a.y = a.home.y; a.kx = a.ky = 0; }
    if (a.kx || a.ky) { moveE(a, a.kx * dt, a.ky * dt); a.kx *= Math.pow(0.02, dt); a.ky *= Math.pow(0.02, dt); if (Math.abs(a.kx) + Math.abs(a.ky) < 2) a.kx = a.ky = 0; }
    a.flash = Math.max(0, a.flash - dt);
    for (let j = i + 1; j < ents.length; j++) {
      const b = ents[j]; if (!b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const other = a === P ? b : b === P ? a : null;
      const atSeat = other && other.sit && other.fac === 'loner' && other.fireRef === FIRE && dE(other, FIRE) < 130;
      const friendly=other?.kind==='human' && other.fac==='loner' && !hostile(other,P);
      const rr=(a.r+b.r)*(friendly ? .72 : 1);
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy);
      if(other?.kind==='human' && d<rr && (IN.moveX || IN.moveY) &&
          !other.captive && !other.wounded && other.sid!=='sid' && loftAt(P)===loftAt(other) &&
          los(P.x,P.y,other.x,other.y) && S.min>=(other.bumpAfter||0)){
        other.bumpAfter=S.min+4;
        other.ang=Math.atan2(P.y-other.y,P.x-other.x);
        if(hostile(other,P)){
          other.aw=1;other.tgt=P;other.lastSeen={x:P.x,y:P.y};other.mem=8;other.react=.25;
          if(other.guard==='south' && storyArea())alarmPost();
        }else if(!other.tgt)sayLine(other,'Осторожнее. Дай пройду.');
      }
      if (friendly && !other.sit && !other.captive && !other.wounded && d<rr &&
          (IN.moveX || IN.moveY) && !other.tgt) {
        // Give the moving player right of way, including narrow thresholds.
        const sign=IN.moveX*(other.y-P.y)-IN.moveY*(other.x-P.x)>=0?1:-1;
        const step=Math.min(65*dt,rr-d+1);
        const sx=-IN.moveY*sign*step,sy=IN.moveX*sign*step;
        if(clearWalk(other.x,other.y,other.x+sx,other.y+sy,other.r))moveE(other,sx,sy);
        continue;
      }
      if (atSeat && d < rr) {
        // Сидящий остаётся на месте, вокруг него можно пройти.
        const angle = d > 0.01 ? Math.atan2(P.y - other.y, P.x - other.x) : other.ang + Math.PI;
        moveE(P, (rr - d) * Math.cos(angle), (rr - d) * Math.sin(angle));
      } else if (d < rr && d > 0.01) {
        const overlap=rr-d,ux=dx/d,uy=dy/d;
        const share=a.yielding&&!b.yielding?.95:b.yielding&&!a.yielding?.05:.5;
        if (!a.captive && a.sid !== 'sid') moveE(a,-ux*overlap*share,-uy*overlap*share);
        if (!b.captive && b.sid !== 'sid') moveE(b,ux*overlap*(1-share),uy*overlap*(1-share));
      }
    }
  }
}

/* ===================== главный шаг ===================== */
function update(dt) {
  S.min += dt;
  cleanExpiredCrates();
  renewFieldCrates();
  noAmmoT -= dt; warnT -= dt;
  if (fadeT > 0) { fadeT -= dt; if (fadeT <= 0.25 && fadeTo) { P.x = fadeTo.x; P.y = fadeTo.y; P.ang = fadeTo.a; cam.x = P.x; cam.y = P.y; fadeTo = null; save(true); } }
  if (BIG && P.alive && !inBunker(P.x,P.y) && P.y < WORLD_ROWS*T && warnT <= 0 && P.x < PW*T && P.x > (PW-5)*T && Math.abs(P.y/T-BIG_EXITS.east.y)<5) { warnT=6; msg('Дальше Затон. Эта часть Зоны появится в следующей версии.', 'say'); }
  const oldX = P.x, oldY = P.y;
  if (P.alive) updatePlayer(dt);
  updateBodies(dt);
  if (!P.alive && deathT > 0) { deathT -= dt; if (deathT <= 0) onDeath(); }
  if(BIG) {
    checkSpherePerimeter();
    if(P.alive && !S.flags.visitedDump && inGarbage(P.x/T,P.y/T)){
      S.flags.visitedDump=1;
      bulletin('Свалка. На западной дороге работает перегрузочное депо.');
    }
  }
  worldFx(dt);
  const tolik=byS('tolik');
  if(tolik?.wounded && dE(P,tolik)<175 && S.min>=(tolik.nextGroan||0)){
    play('groan',tolik.x,tolik.y,.6*(1-dE(P,tolik)/190));tolik.nextGroan=S.min+9+Math.random()*3;
  }
  for (const e of ents) {
    if (!e.alive || e === P) continue;
    if (e.qaHold || blowoutHumanAI(e, dt)) continue;
    if (Math.abs(e.x - P.x) > 1400 && Math.abs(e.y - P.y) > 1400 && !e.trip && !e.tgt && !e.returning) continue;
    if (e.sosPhase && sosFoeAI(e, dt)) continue;
    if (e.kind === 'dog') aiDog(e, dt); else if (e.kind === 'boar') aiBoar(e, dt); else if (e.kind === 'sucker') aiSucker(e, dt); else aiHuman(e, dt);
  }
  resolveActorContacts(dt);
  updateBolts(dt);
  updateAnoms(dt);
  deliverLonerReports();
  checkBridgeCrossing(oldX, oldY);
  g7Tick(dt);
  // гранаты
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i];
    n.t -= dt; n.vz -= 520 * dt; n.z = Math.max(0, n.z + n.vz * dt);
    if (n.z <= 0 && n.vz < 0) { n.vz = -n.vz * 0.35; n.vx *= 0.6; n.vy *= 0.6; }
    const nx = n.x + n.vx * dt, ny = n.y + n.vy * dt;
    if (solidPx(nx, n.y)) n.vx = -n.vx * 0.4; else n.x = nx;
    if (solidPx(n.x, ny)) n.vy = -n.vy * 0.4; else n.y = ny;
    n.vx *= Math.pow(0.4, dt); n.vy *= Math.pow(0.4, dt);
    if (n.t <= 0) { nades.splice(i, 1); explode(n); }
  }
  // частицы
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.05, dt); p.vy *= Math.pow(0.05, dt);
    if (p.rise) p.y -= p.rise * dt;
    if (p.hearth) p.x += (WX.wind*19 + 4*Math.sin(S.min*.39+p.life)) * dt;
    if (p.life <= 0) { if (p.blood && chance(0.4)) decals.push({ x: p.x, y: p.y, r: rnd(2, 4), a: 0.7 }); parts.splice(i, 1); }
  }
  if (decals.length > 160) decals.splice(0, decals.length - 160);
  for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1); }
  for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }
  // атмосфера: вороны, дым костра
  ambT -= dt;
  if (ambT <= 0) {
    ambT = rnd(45, 95);
    if (!night() && !inBunker(P.x,P.y) && !loftAt(P)) { const y0 = P.y + rnd(-300, 300), dir = chance(0.5) ? 1 : -1, n = ri(3, 6); for (let i = 0; i < n; i++) crows.push({ x: P.x - dir * 800 + rnd(-40, 40), y: y0 + rnd(-50, 50), vx: dir * rnd(110, 140), vy: rnd(-12, 12), ph: rnd(0, 6), caller:i===0 && chance(.5), callIn:3.5 }); }
  }
  for (let i = crows.length - 1; i >= 0; i--) { const c = crows[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.ph += dt * 9;
    if(c.caller && (c.callIn-=dt)<=0){
      c.caller=false;
      if(!inBunker(P.x,P.y) && !loftAt(P))play('crow',c.x,c.y,sheltered(P.x,P.y) ? .09 : .38);
    }
    if (Math.abs(c.x - P.x) > 1100) crows.splice(i, 1); }
  [FIRE, FIRE2].forEach(F => { if (chance(dt * 7)) { const l = rnd(2.2, 3.6); parts.push({ x: F.x + rnd(-3, 3), y: F.y - 6, vx: rnd(-5, 5) + WX.wind * 8, vy: 0, rise: rnd(14, 22), life: l, ml: l, c: '#8a8a84', s: rnd(1.6, 2.6), smoke: 1, hearth: villageAtmosphere && F===FIRE }); } });
  // тела исчезают через двое суток

  // таймеры мира
  spawnT -= dt; if (spawnT <= 0) { spawnT = 20; spawnTick(); }
  fogT -= dt; if (fogT <= 0 && P.alive) { fogT = 0.4; reveal(); }
  saveT -= dt;
  if (saveT <= 0 && P.alive && (dE(P, campOf(P)) < 300 || inBunker(P.x, P.y)) && !ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 500)) { saveT = 60; save(true); }
  if(chapter()==='rescue' && S.campaign.atpWait && !S.flags.assault){
    const inside=locAt(P.x/T,P.y/T)?.id==='atp';
    if(inside && ATP_BANDITS.some(id=>byS(id)?.tgt===P))beginAssault();
  }
  if(BIG)updatePostShift();
  if (radioQueue.length && (radioQueue[0].life -= dt) <= 0) radioQueue.shift();
  for (const m of MSGS) m.life -= dt;
  MSGS = MSGS.filter(m => m.life > 0);
  hurtFlash = Math.max(0, hurtFlash - dt * 1.2);
  shakeA = Math.max(0, shakeA - dt * 20);
}
const bearingTo = e => Math.atan2(e.y-P.y,e.x-P.x);
function targetInSight(e,W) {
  return e?.alive && hostile(P,e) && !e.captive && !(e.cloak>.7) &&
    dE(P,e)<=W.range+ballOff(P)+e.r && seesActor(P,e) &&
    !HOUSES.some(h=>h.a>.5 && e.x>h.x*T && e.x<(h.x+h.w)*T && e.y>h.y*T && e.y<(h.y+h.h)*T && !roofHidden(h)) &&
    shotTrace(P,bearingTo(e),W).best===e;
}
function assistedTarget(dir,W,cone) {
  let best=null, score=Infinity;
  for (const e of ents) {
    if (e===P || !e.alive || !hostile(P,e)) continue;
    const error=Math.abs(angD(dir,bearingTo(e)));
    if (error>cone) continue;
    const rank=error + .025*dE(P,e)/W.range;
    if (rank<score && targetInSight(e,W)) {best=e;score=rank;}
  }
  return best;
}
function updatePlayerAim(dt,mx,my) {
  const W=WP[S.weapon], stick=IN.aimStick;
  let tap=IN.tapShot;
  if (tap && (!W || tap.weapon!==S.weapon || (tap.ttl-=dt)<=0 || !targetInSight(tap.enemy,W))) tap=IN.tapShot=null;
  const aiming=!IN.touch || stick?.active || tap;
  P.aimRay=null;
  if (!aiming) {
    P.lock=null;
    if (P.tapFlash && P.shotFlash>0 && W && !W.melee) {
      P.aimRay=shotTrace(P,P.ang,W);
      return;
    }
    P.tapFlash=false;
    if (Math.hypot(mx,my)>.1) P.ang+=angD(P.ang,Math.atan2(my,mx))*Math.min(1,dt*10);
    return;
  }
  const dir=tap ? bearingTo(tap.enemy) : IN.touch ? stick.a : bearingTo(screenToWorld(IN.mx,IN.my));
  let desired=dir;
  const gun=W && !W.melee;
  const assist=firePrefs.strength/100;
  if (tap) P.lock=tap.enemy;
  else if (gun && assist>0) {
    const cone=IN.touch ? .08+.15*assist : .14;
    P.lockT=(P.lockT || 0)-dt;
    if (P.lockT<=0 || Math.abs(angD(P.scanDir ?? dir,dir))>.06) {
      P.lock=assistedTarget(dir,W,cone);
      P.lockT=.1; P.scanDir=dir;
    }
    if (P.lock) {
      const delta=angD(dir,bearingTo(P.lock));
      if (Math.abs(delta)>cone || !targetInSight(P.lock,W)) P.lock=null;
      else desired+=delta*assist;
    }
  } else P.lock=null;
  const delta=angD(P.ang,desired);
  P.ang+=IN.touch ? clamp(delta,-9*dt,9*dt) : delta;
  const aligned=Math.abs(angD(P.ang,desired))<.025;
  if (aligned) P.ang=desired;
  if (gun && (IN.touch || sightInstalled(S.weapon))) {
    P.aimRay=shotTrace(P,P.ang,W);
    if (!P.lock && P.aimRay.best && hostile(P,P.aimRay.best) && targetInSight(P.aimRay.best,W)) P.lock=P.aimRay.best;
  }
  if (aligned && (tap || IN.btnFire || IN.fire)) {
    if (tap && P.cool>0) return;
    if (tap) IN.tapShot=null;
    playerFire();
    P.tapFlash=!!tap && P.shotFlash>0;
  }
}
function updatePlayer(dt) {
  P.cool -= dt; P.medT -= dt; P.boltT = (P.boltT || 0) - dt; P.nadeT = (P.nadeT || 0) - dt;
  P.bloomDelay = Math.max(0,(P.bloomDelay || 0)-dt);
  if (!P.bloomDelay) P.bloom = Math.max(0,P.bloom-dt*.17);
  P.shotFlash = Math.max(0,(P.shotFlash || 0)-dt);
  survival(dt); plusTick(dt);
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) finishReload(); }
  // движение
  let mx = IN.moveX, my = IN.moveY;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const kg = weight(), over = kg > carryLimit();
  const sprint = (IN.sprint || IN.runPointer !== null) && P.st > 5 && !over && ml > 0.1;
  if (sprint) P.crouch = 0; P.sprinting = sprint;
  let sp = (sprint ? 190 : P.crouch ? 62 : 118) * (over ? 0.55 : 1) * (swampAt(P.x, P.y) ? 0.55 : 1);
  if (sprint) P.st = Math.max(0, P.st - 22 * exertion(kg) * (1 + Math.min(5, S.weapon==='knife' ? 0.3 : (ITEMS[S.weapon]?.w || 0)) * .085) * dt); else P.st = Math.min(100, P.st + 14 * (energyActive() ? 1.5 : 1) * (1-.12*(S.flags.coatWetness||0)) * dt);
  if (BIG) {
    const inField=P.x<WEST*T && poppyBed(P.x/T,P.y/T-LESSER_TOP)<1 &&
      ![FL,CF,SW].includes(tAt(Math.floor(P.x/T),Math.floor(P.y/T)));
    const exposure=S.flags.poppySleep || 0;
    if (inField && !energyActive()) {
      S.flags.poppySleep=Math.min(42,exposure+dt*(1+.35*exposure/42));
      P.st=Math.max(0,P.st-18*dt);
      sp*=1-.37*S.flags.poppySleep/42;
      if(S.flags.poppySleep>=42) {kill(P,'poppies');return;}
    } else if (exposure) S.flags.poppySleep=Math.max(0,exposure-5*dt);
  }
  P.jumpCD = (P.jumpCD || 0) - dt;
  if (P.jumpT > 0) { P.jumpT -= dt; const ox = P.x, oy = P.y; moveE(P, Math.cos(P.jumpA) * JUMP_V * dt, Math.sin(P.jumpA) * JUMP_V * dt); P.step += dst(ox, oy, P.x, P.y); if (P.jumpT <= 0) { P.jumpT = 0; collide(P); const ground=surf(P.x,P.y);emitFootfall(ground,1.35);play(ground); } }
  else if (ml > 0.08) { const ox = P.x, oy = P.y; moveE(P, mx * sp * dt, my * sp * dt); P.step += dst(ox, oy, P.x, P.y); }
  P.combatT = Math.max(0,(P.combatT || 0)-dt);
  P.hitT = Math.max(0,(P.hitT || 0)-dt);
  for (let i=HURTDIR.length-1;i>=0;i--) {
    HURTDIR[i].life-=dt;
    if (HURTDIR[i].life<=0) HURTDIR.splice(i,1);
  }
  updatePlayerAim(dt, mx, my);
  // радиация и артефакты
  const previousRate=radRate; radRate = 0;
  rads.forEach(z => { const d = dst(P.x, P.y, z.x, z.y); if (d < z.r) radRate += z.p * (1 - d / z.r); });
  if (beltCount('art_blood')) { radRate += 0.15 * beltCount('art_blood'); P.hp = Math.min(100, P.hp + 0.3 * beltCount('art_blood') * dt); }
  if (beltCount('art_medusa')) { radRate *= 0.5; S.rad = Math.max(0, S.rad - 0.35 * dt); }
  S.rad = clamp(S.rad + radRate * dt, 0, 100);
  if (S.rad > 15) P.hp -= (S.rad - 10) * 0.007 * dt;
  if(radRate>0 && previousRate<=0){play('geiger');geigerAcc=0;}
  geigerAcc += (radRate>0?Math.min(12,1.4+radRate*3):0)*dt;
  while (geigerAcc > 1) { geigerAcc -= 1 + Math.random() * 0.6; play('geiger'); }
  if (P.hp <= 0 && P.alive) kill(P, 'rad');
  // подсветка тайника/артефакта
  const near = findInteract();
  G.near = near;
}
function screenToWorld(sx, sy) { return { x: cam.x + (sx - VW / 2) / Z, y: cam.y + (sy - VH / 2) / Z }; }

/* ===================== взаимодействие ===================== */
const G = { near: null };
function findInteract() {
  let best = null, bd = 1e9;
  const cand = (d, o) => { if (d < bd) { bd = d; best = o; } };
  for (const e of ents) {
    if (e.alive && hostile(e,P) && canTakeDown(e)) { cand(dE(e, P) - 200, { k: 'kill', e: e, label: 'Убить ножом: ' + e.name }); continue; }   // сзади и незаметно
    if (!e.alive || e === P) continue;
    const d = dE(e, P);
    if (d > 60) continue;
    if (e.storyMan && !hostile(e, P)) { cand(d,{k:'talk',e,label:'Поговорить: '+e.name}); continue; }
    if (e.wounded) cand(d, { k: 'heal', e: e, label: 'Помочь раненому: ' + e.name });
    else if (e.captive) cand(d, { k: 'free', e: e, label: 'Освободить: ' + e.name });
    else if (e.kind === 'human' && !hostile(e, P) && !e.tgt && e.fac !== 'trader') cand(d, { k: 'talk', e: e, label: 'Поговорить: ' + e.name });
  }
  for(const room of lofts) {
    const upstairs=loftAt(P)===room, p=upstairs?room.landing:room.stair;
    const dist=dE(P,p);
    const a=stairAngle(room,upstairs);
    const u=(P.x-p.x)*Math.cos(a)+(P.y-p.y)*Math.sin(a);
    if(dist<41 && u<17 && los(P.x,P.y,p.x,p.y)) cand(dist-4,{k:'floor',room,upstairs,label:upstairs?'Спуститься на первый этаж':'Подняться · '+room.name});
  }
  const sd = byS('sid');
  if (sd && inBunker(P.x, P.y) && dE(sd, P) < 120) cand(dE(sd, P) - 30, { k: 'trader', label: 'Поговорить: Сидорович' });
  const dh = dst(P.x, P.y, HATCH.x, HATCH.y);
  const atEntrance = SID_SHOP ? Math.abs(P.x-HATCH.x)<25 && P.y>=HATCH.y-62 && P.y<HATCH.y+45 : dh<54;
  if (atEntrance) cand(dh, { k: 'down', label: 'Спуститься в бункер' });
  const ds = dst(P.x, P.y, STAIRS.x, STAIRS.y);
  if (ds < (SID_SHOP ? 32 : 56)) cand(ds, { k: 'up', label: 'Подняться наверх' });
  for (const o of objs) {
    if(o.k==='bed' || o.fitting==='bedroll'){
      const x=o.x+o.w/2,y=o.y+o.h/2,d=dst(x,y,P.x,P.y);
      if(d<52 && inFurnishedRoom(o) && los(P.x,P.y,x,y))cand(d-4,{k:'sleep',o,label:'Спать · спальное место'});
    }
    if (o.k === 'locker') {
      const x=o.x+o.w/2,y=o.y+o.h/2,d=dst(P.x,P.y,x,y);
      if (d<49 && los(P.x,P.y,x,y)) cand(d,{k:'locker',o,label:'Открыть личный ящик'});
    }
    if ((o.k==='crate' && o.broken && !o.looted) || o.kind==='sack') {
      nearbyGroundItems(o,cand); continue;
    }
    if (o.k === 'body' && MUTANT_TROPHIES[o.kind]) {
      const trophy=MUTANT_TROPHIES[o.kind], d=dE(P,o);
      if (o.loot[trophy] && d<42 && clearNPCShot(P,o))
        cand(d,{k:'carve',o,label:S.weapon==='knife'?'Срезать трофей · '+ITEMS[trophy].n:'Для разделки нужен нож'});
      continue;
    }
    if (o.k === 'body' && (o.kind==='human' || Object.keys(o.loot).length)) { const d = dst(P.x, P.y, o.x, o.y); if (d < 42) cand(d, { k: 'loot', o: o, label: 'Обыскать: ' + o.name }); }
    if(o.stash && (!o.looted || o.k==='roomFitting') && o.k!=='crate'){
      const x=o.x+o.w/2,y=o.y+o.h/2,d=dst(P.x,P.y,x,y);
      if(d<46 && los(P.x,P.y,x,y)){
        if(o.k==='roomFitting'){
          if(inFurnishedRoom(o,true) || (loftAt(P) && loftAt(P)===loftAt(o)))
            cand(d,{k:'loot',o,label:'Обыскать шкаф'+(o.looted?' · пусто':'')});
        } else if (o.anomalyId) {
          const quiet=cacheFieldQuiet(o);
          cand(d,{k:'loot',o,label:quiet?'Обыскать схрон путейца':'Схрон путейца · дождись затишья'});
        } else cand(d,{k:'loot',o,label:o.k==='safe'?'Обыскать сейф':'Обыскать тайник'});
      }
    }
  }
  if (activeDetectorRange()) for (const a of arts) { const d = dE(P, a); if (d < 38) cand(d - 10, { k: 'art', a: a, label: 'Подобрать: ' + ITEMS[a.id].n }); }
  const cn = cacheNear(); if (cn) cand(dst(P.x, P.y, cn.x, cn.y), { k: 'loot', o: cn, label: 'Открыть тайник' });
  plusInteract(cand);
  return best;
}
function carveMutant(o) {
  const id = MUTANT_TROPHIES[o.kind];
  if (!id || !o.loot[id] || !objs.includes(o) || dE(P,o)>=42 || !clearNPCShot(P,o)) return;
  if (S.weapon !== 'knife') { msg('Возьми нож в руки.', 'say'); return; }
  const error = receiveError(id,1);
  if (error) { msg(error,'bad'); return; }
  collectStock(o,id,1);
  play('carve',P.x,P.y);
  msg('Получен трофей · '+ITEMS[id].n,'say');
}
function lootAll(o) {
  let pickedUp = false;
  for (const id of Object.keys(o.loot)) {
    if (id !== '__tip' && collectStock(o,id)) pickedUp = true;
  }
  if (Object.keys(o.loot).some(id=>ITEMS[id])) msg('Рюкзак заполнен. Остаток можно забрать позже.', 'bad');
  recordContents(o);
  if (pickedUp) play('pick');
}
function takeArt(a) {
  if (!activeDetectorRange() || !arts.includes(a) || dE(P, a) >= 38) return;
  const err=receiveError(a.id,1); if(err) { msg(err,'bad'); return; }
  addPacked(a.id, 1); S.stats.art++; S.flags['art_' + a.key] = 1;
  arts.splice(arts.indexOf(a), 1);
  play('pick');
  news('Найден ' + ITEMS[a.id].n + '.');
}
let fadeT = 0, fadeTo = null;
function goThrough(down) {
  if (fadeT > 0) return;
  fadeT = 0.5; fadeTo = down ? { x:STAIRS.x, y:(SID_SHOP ? SID_STAIR_Y-.85 : 9.6)*T, a:-Math.PI/2 }
    : { x:HATCH.x+2, y:HATCH.y+(SID_SHOP ? 27 : -30), a:SID_SHOP ? Math.PI/2 : -Math.PI/2 };
  play('reload');
}
function healWounded(e) {
  if (!has('medkit')) { msg('Нужна аптечка. Купи у Сидоровича.', 'bad'); return false; }
  take('medkit', 1); e.captive = 0; e.wounded = 0; e.hp = e.maxhp * 0.7;
  if (e.sid === 'tolik') {
    S.flags.tolikBlood={x:e.x,y:e.y,t:S.min};S.flags.tolikUp = 1; S.rep += 10; S.money += 300; give('antirad', 1);rewardReceipt('Помощь Толику',['300 RU','Антирад']);
    e.home = (h => ({ x: h[0], y: h[1] }))(RMp(35 * T, 81 * T)); e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
    news('Толик получил помощь и вернулся в деревню.');
  }
  return true;
}

/* ===================== сохранение ===================== */
const KEY = /qa/.test(location.hash) ? 'zona2d-kordon-qa' : 'zona2d-kordon-v2';   // QA-прогоны не трогают сохранение игрока
const SAVE_VERSION = 3;
function save(quiet,slot=0) {
  if (!P || !P.alive) return false;
  if(!slot && BIG && chapter()==='rescue' && !S.flags.atpClear &&
      ATP_BANDITS.some(id=>{const e=byS(id);return e && dE(e,P)<380;}))return false;
  S.x = P.x; S.y = P.y; S.hp = P.hp;
  let f = ''; for (let i = 0; i < fog.length; i += 6) { let v = 0; for (let b = 0; b < 6; b++) v |= (fog[i + b] ? 1 : 0) << b; f += String.fromCharCode(48 + v); }
  S.fog = f;
  dynSnapshot();
  try { localStorage.setItem(slotKey(slot), JSON.stringify(S)); } catch (e) { if (!quiet) msg('Сохранить не вышло: браузер не даёт места.'); return false; }
  return true;
}
function loadSave(slot=0) {
  try { const raw = localStorage.getItem(slotKey(slot)); if (!raw) return null; const d = JSON.parse(raw); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
function applyState(d) {
  document.getElementById('field-notices')?.replaceChildren();
  draggedBody=null;bodyCheck=geigerAcc=radRate=0; S = d; S.difficulty=difficultyKey(d.difficulty); prepareCampaign(); lastShiftState=null;
  if (BIG && (S.mapVersion==='kordon-big' || S.mapVersion==='kordon-west')) migrateNorthernWorld(S);
  restoreKit();
  fog.fill(0);
  if (S.fog) for (let i = 0; i < S.fog.length; i++) { const v = S.fog.charCodeAt(i) - 48; for (let b = 0; b < 6; b++) if (i * 6 + b < fog.length) fog[i * 6 + b] = (v >> b) & 1; }
  fogDirty = true; fogRegion = null;
  spawnWorld();
  if(BIG && storyArea() && !nav[Math.floor(P.y/T)*MW+Math.floor(P.x/T)]){
    const p=walkPoint(P);P.x=S.x=p.x;P.y=S.y=p.y;
  }
  if(BIG)updatePostShift();
  survDefaults(); ensureCaches(); dynRestore();
  if(BIG && !S.campaign.northSiteUpdated){
    if(chapter()==='battle'){
      const site=northCamp();
      ents.filter(e=>e.assailant).forEach((e,i)=>{
        const p=walkPoint(site,(i%3-1)*2,-Math.floor(i/3)*2);
        e.x=p.x;e.y=p.y;e.home=p;e.path=e.tgt=null;
      });
    }
    S.campaign.northSiteUpdated=true;
  }
  if(S.campaign.liberated)occupyATP();
  resetEnvironment();
  villageAftermath();
  if(BIG){
    // Saves on the former south threshold should load on their own side of the new wall.
    const bar=HOUSES.find(h=>h.ok==='78,118');
    if(bar){
      const x=(bar.x+Math.floor(bar.w/2))*T,y=(bar.y+bar.h-1)*T;
      if(P.x>=x-P.r && P.x<=x+T+P.r && P.y>y-P.r && P.y<y+T+P.r)
        P.y=S.y=P.y<y+T/2?y-P.r-1:y+T+P.r+1;
    }
    // A trader snapshot from the old bar also stores its old home and seat.
    for(const sid of ['lz_barman','lz_guest','lz_guest2','a1','a2','shust','wolf']){
      const e=byS(sid), d=NPCDEF.find(n=>n.sid===sid);
      if(!e?.alive || !d || e.evacuating || e.follow || e.wounded || (sid==='shust' && S.flags.shustFree))continue;
      if(e.home && (e.home.x!==d.x*T || e.home.y!==d.y*T)){
        e.home={x:d.x*T,y:d.y*T};e.x=e.home.x;e.y=e.home.y;e.path=null;
      }
    }
  }
  loadFieldCrates(); restoreCrateCleanup(); renewFieldCrates();
  for (const e of ents) if (e !== P && e.home && e.sid !== 'sid') clearPropSpawn(e);
  // Older northern-map saves could stand inside the now closed western cutting.
  if(BIG && cuttingDepth(Math.floor(P.x/T),Math.floor(P.y/T))>=0){
    const verge=freeTile(122,61);
    P.x=S.x=verge.x*T;P.y=S.y=verge.y*T;
  }
  if(BIG && P.x<WEST*T && tAt(Math.floor(P.x/T),Math.floor(P.y/T))===RA){
    const verge=freeTile(P.x/T,P.y/T);
    P.x=S.x=verge.x*T;P.y=S.y=verge.y*T;
  }
  if(inGarbage(P.x/T,P.y/T) && !nav[Math.floor(P.y/T)*MW+Math.floor(P.x/T)]){
    const probe={x:P.x,y:P.y,r:P.r}; collide(probe);
    if(Math.hypot(probe.x-P.x,probe.y-P.y)>.1){
      const free=freeTile(P.x/T,P.y/T); P.x=S.x=free.x*T; P.y=S.y=free.y*T;
    }
  }
  // A saved position can be under an enlarged landmark after the world update.
  if (BIG && objs.some(o=>(o.k==='installation'||o.k==='bargeHull') &&
      P.x+P.r>o.x && P.x-P.r<o.x+o.w && P.y+P.r>o.y && P.y-P.r<o.y+o.h)) {
    collide(P); S.x=P.x; S.y=P.y;
  }
  if(BIG && objs.some(o=>o.solid && (o.home || ['stairRun','partition'].includes(o.k)) &&
      P.x+P.r>o.x && P.x-P.r<o.x+o.w && P.y+P.r>o.y && P.y-P.r<o.y+o.h)){
    const bounds=loftAt(P) || HOUSES.find(h=>P.x>=h.x*T && P.x<(h.x+h.w)*T && P.y>=h.y*T && P.y<(h.y+h.h)*T);
    if(bounds){
      let best=Infinity,position=null;
      for(let ty=bounds.y+1;ty<bounds.y+bounds.h-1;ty++)for(let tx=bounds.x+1;tx<bounds.x+bounds.w-1;tx++){
        if(!nav[ty*MW+tx])continue;
        const x=(tx+.5)*T,y=(ty+.5)*T,d=dst(P.x,P.y,x,y),probe={x,y,r:P.r};
        if(d>=best)continue;
        collide(probe);if(dst(x,y,probe.x,probe.y)>.1)continue;
        best=d;position={x,y};
      }
      if(position){P.x=S.x=position.x;P.y=S.y=position.y;}
    }
  }
  if (SID_SHOP && inBunker(P.x,P.y)) {
    // Сохранения из более просторного подвала могли оставить героя за новой стеной.
    const inside = Math.abs(P.x-STAIRS.x) <= 3*T-P.r && P.y >= SHOP_ROOM.counterFront*T+P.r && P.y <= 10*T-P.r;
    const probe = {x:P.x,y:P.y,r:P.r}; collide(probe);
    if (!inside || Math.hypot(P.x-probe.x,P.y-probe.y)>.1) {
      P.x=S.x=STAIRS.x; P.y=S.y=SID_SPAWN_Y*T;
    }
  }
  cam.x = P.x; cam.y = P.y;
  deathT = 0; hurtFlash = 0; MSGS = []; radioQueue.length = 0;
  if (S.blow?.stage === 1) radioNotice(BLOW_WARNING, true);
}
