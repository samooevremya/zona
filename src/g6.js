/* ===================== погода, выброс, шаги, голоса, гитара ===================== */
const WX = { cloud: 0.15, rain: 0, fog: 0, gust:0, sleet:0, time:0, wind: 0.35, flash: 0, red: 0, clouds: [], drops: [] };
// Cloud, rain, fog, mean wind, dry leaves and sleet. The save stores the weather name.
const WXT = {
  clear:[.10,0,0,.17],cloudy:[.65,0,0,.32],rain:[.85,.60,.06,.61],storm:[1,1,.06,.98],
  fog:[.45,0,.8,.10],gust:[.40,0,.04,.92,1],sleet:[.88,.10,.25,.65,0,1]
};
for (let i = 0; i < 7; i++) WX.clouds.push({ x: rnd(0, WW), y: rnd(0, WH), r: rnd(350, 700) });
function pickWeather() {
  const r = Math.random(), h = hour();
  const cold=h<9 || h>18;
  const k = r<.23?'clear':r<.40?'cloudy':r<.57?'gust':r<.72?'rain':r<.80?'storm':
    r<.91?(cold?'fog':'cloudy'):(cold?'sleet':'gust');
  S.wx = { k: k, until: S.min + rnd(120, 300) };
}
const sheltered = (x, y) => !!loftAt({x,y}) || inBunker(x, y) || HOUSES.some(h => x > h.x*T && x < (h.x+h.w)*T && y > h.y*T && y < (h.y+h.h)*T);
const safeFromBlow = e => e.guard || ['wolf', 'sid', 'petr', 'petr2', 'fox', 'shust', 'tolik'].indexOf(e.sid) >= 0;

const CALL = {
  loner: { combat: ['Контакт!', 'Вижу врага!', 'Прикрой меня!', 'Обходи слева!', 'Получай!'], reload: ['Перезаряжаюсь!', 'Пустой, прикрой!'], hurt: ['Зацепило!', 'Ах ты ж...', 'Ранен!'],
    nade: ['Граната!', 'Ложись!'], greet: ['Здоров, Меченый.', 'Привет, брат.', 'Удачной охоты.', 'О, живой ещё?', 'Заходи к костру.'], bad: ['Ходят тут всякие...', 'Иди мимо.', 'Глаза б мои не видели.'],
    idle: ['Эх, сейчас бы домой...', 'Кто знает, где тут нормальный хабар?', 'Тихо сегодня. Не к добру.', 'Опять погода портится.', 'Говорят, на Свалке опять стреляли.',
      'Дай закурить, а?', 'Слышь, а артефакты правда лечат?', 'Вчера псов у насыпи видел, штук пять.', 'Консервы кончаются, надо к Сидоровичу.', 'Ты гитару-то не ломай, она одна на всю деревню.'] },
  bandit: { combat: ['Вали его!', 'Сюда, пацаны!', 'Ща пришьём!', 'Окружай!', 'Он тут!'], reload: ['Пустой!', 'Прикрой, заряжаю!'], hurt: ['Ай, зацепило!', 'Мать честная!'],
    nade: ['Шухер, граната!'], idle: ['Чё, скучно...', 'Сиплый сказал ждать.', 'Скоро лохи с дороги пойдут.', 'Карты есть у кого?'] },
  army: { combat: ['Огонь!', 'Нарушитель!', 'Держать позицию!', 'Подавить!'], reload: ['Перезарядка!'], hurt: ['Попали!'], nade: ['Граната!'],
    idle: ['Пост два, всё спокойно, приём.', 'Когда смена-то?', 'Курить охота.', 'Тишина в эфире.'] }
};
function callout(e, kind, force) {
  if (!e.alive || e === P || e.kind !== 'human' || e.wounded || e.captive) return;
  if(kind==='idle' && campAct?.actor===e)return;
  const bank = CALL[e.fac] && CALL[e.fac][kind]; if (!bank) return;
  if (!force && e.bub && e.bub.life > 1) return;
  if (dE(e, P) > 520) return;
  if(voiceCallout(e,kind))return;
  e.bub = { t: bank[(e.seed + Math.floor(S.min * 7)) % bank.length], life: 3.2 };
  if (e.fac === 'army' && kind === 'idle') play('radio', e.x, e.y); else play('voice', e.x, e.y);
}
function sayLine(e, t) { e.bub = { t: t, life: 3.6 }; play('voice', e.x, e.y); }

/* ---------- шаги ---------- */
function surf(x, y) {
  const loft=loftAt({x,y});
  if(loft)return loft.id==='depot'?'stepMetal':'stepWood';
  const t = tAt(Math.floor(x / T), Math.floor(y / T));
  if (t===AS)return 'stepAsphalt';
  if (t === CF || t === CO) return 'stepHard';
  if (t === FL) return 'stepWood';
  if (t === SW) return 'stepWater';
  if (t === RA) return Math.floor(x/12)%3 ? 'stepWood' : 'stepGravel';
  const wet=livingZone?surfaceWater:WX.rain;
  if (t === DI) return wet > 0.3 ? 'stepWet' : 'stepDirt';
  return wet > 0.4 ? 'stepWet' : 'stepGrass';
}

/* ---------- звук дождя ---------- */
let rainG = null;
/* ---------- главный шаг атмосферы ---------- */
let chatT = 2;
function worldFx(dt) {
  if (!S.wx) S.wx = { k: 'clear', until: S.min + 180 };
  if (!S.blow) S.blow = { stage: 0, next: S.min + rnd(900, 1500), t: 0 };
  if (S.min > S.wx.until) pickWeather();
  const tg = WXT[S.wx.k] || WXT.clear, k = Math.min(1, dt * 0.05);
  WX.cloud = lerp(WX.cloud, tg[0], k); WX.rain = lerp(WX.rain, tg[1], k); WX.fog = lerp(WX.fog, tg[2], k);
  WX.time+=dt;WX.gust=lerp(WX.gust,tg[4]||0,k);WX.sleet=lerp(WX.sleet,tg[5]||0,k);
  WX.wind=lerp(WX.wind,tg[3]+.18*WX.gust*Math.sin(WX.time*.74),Math.min(1,dt*.21));
  WX.clouds.forEach(c => { c.x += WX.wind * 40 * dt; c.y += WX.wind * 12 * dt; if (c.x > WW + 700) { c.x = -700; c.y = rnd(0, WH); } if (c.y > WH + 700) c.y = -700; });
  WX.flash = Math.max(0, WX.flash - dt * 3);
  if (S.wx.k === 'storm' && WX.rain > 0.7 && chance(dt * 0.07)) { WX.flash = 1; setTimeout(() => play('thunder'), rnd(400, 2200)); }
  updateCoat(dt);
  if(livingZone)updateEnvironment(dt);
  mixRecordedRain();
  blowout(dt);
  // шаги и анимация ног
  for (const e of ents) {
    if (!e.alive) continue;
    const mv = (e.step - (e.ps || 0)) / Math.max(dt, 0.001); e.ps = e.step; e.mv = lerp(e.mv || 0, mv, 0.3);
    const stride = e.kind === 'dog' ? 26 : e === P && P.sprinting ? 44 : 36;
    if ((!humanMotionOn || e.kind!=='human') && e.step - (e.ls || 0) > stride) {
      e.ls = e.step;
      if (e === P && !(P.jumpT>0)) {
        if(livingZone)leaveBootMark(e);
        const surface=surf(e.x,e.y);
        emitFootfall(surface);
        play(surface,undefined,undefined,P.crouch ? .36 : P.sprinting ? 1.3 : 1);
        if(surface==='stepWood' && loftAt(e) && Math.floor(e.step/stride)%4===1)play('creak');
      }
      else if (e!==P && dE(e, P) < 380 && e.kind === 'human') play(surf(e.x, e.y), e.x, e.y, 0.6);
      else if (dE(e, P) < 320 && e.kind === 'dog') play('stepDog', e.x, e.y);
    }
    if (e.bub) { e.bub.life -= dt; if (e.bub.life <= 0) e.bub = null; }
  }
  // разговоры рядом
  chatT -= dt;
  if (chatT <= 0 && P.alive) {
    chatT = rnd(1, 2.5);
    const near = ents.filter(e => e.alive && e !== P && e.kind === 'human' && !e.tgt && !e.captive && dE(e, P) < 420 && e.fac !== 'trader');
    near.forEach(e => {
      const d = dE(e, P);
      if (e.fac === 'loner' && !hostile(e, P) && d < 90 && !e.greeted) { e.greeted = 1; callout(e, S.rep < 0 ? 'bad' : 'greet', true); return; }
      if (d > 140) e.greeted = 0;
      if (!e.sit && chance(0.045)) callout(e, 'idle');
    });
  }
  campAndRadio(dt);
}
const BLOW_WARNING = 'Приближается выброс! Укройтесь в ближайшем здании или бункере. Ближайшее укрытие отмечено на карте.';
// One flood from all usable doorways gives each reachable tile its closest shelter.
function shelterRoutes(includeHatch) {
  return { includeHatch, revision: -1, owner: new Int16Array(MW * MH), doors: [] };
}
const playerShelters = shelterRoutes(true), lonerShelters = shelterRoutes(false);
function rebuildShelterRoutes(routes) {
  const { owner: shelterOwner, doors: shelterDoors } = routes;
  shelterOwner.fill(-1);
  shelterDoors.length = 0;
  let head = 0, tail = 0;
  function seed(x, y, house) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), i = cy * MW + cx;
    if (!inb(cx, cy) || !nav[i] || shelterOwner[i] >= 0) return;
    shelterOwner[i] = shelterDoors.length;
    shelterDoors.push({ x, y, house });
    bfsQ[tail++] = i;
  }
  for (const h of HOUSES) {
    for (const d of h.entrances) {
      const lanes = Math.round(d.width / T);
      for (let lane = 0; lane < lanes; lane++) {
        const offset = (lane - (lanes - 1) / 2) * T;
        seed(h.x*T + d.x - 1.5*T*d.nx + offset*d.ny,
             h.y*T + d.y - 1.5*T*d.ny + offset*d.nx,h);
      }
    }
  }
  if (routes.includeHatch) seed(HATCH.x, HATCH.y + (SID_SHOP ? 27 : -30));
  while (head < tail) {
    const i = bfsQ[head++], x = i % MW, y = Math.floor(i / MW);
    for (let k = 0; k < DIRS.length; k++) {
      const j = navNeighbor(x, y, k);
      if (j < 0 || shelterOwner[j] >= 0) continue;
      shelterOwner[j] = shelterOwner[i];
      bfsQ[tail++] = j;
    }
  }
  routes.revision = navRevision;
}
function routeToShelter(actor, routes) {
  if (routes.revision !== navRevision) rebuildShelterRoutes(routes);
  const cell = walkAnchor(actor.x,actor.y);
  return routes.doors[routes.owner[cell]] || null;
}
function blowShelterTarget() {
  if (!P || !P.alive || !S.blow?.stage || sheltered(P.x, P.y)) return null;
  return routeToShelter(P, playerShelters);
}
// Pick a reachable place behind the doorway. A narrow shop may only have its landing.
function roomShelterPlace(e,door){
  const h=door.house,start=Math.floor(door.y/T)*MW+Math.floor(door.x/T);
  const queue=[start],seen=new Set(queue);
  const neighbours=ents.filter(o=>o!==e&&o.alive&&o.kind==='human'&&
    (o.shelterSpot || o.rainRest || sheltered(o.x,o.y))).map(o=>o.shelterSpot||o.rainRest||o);
  let best=null,score=Infinity;
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%MW,y=Math.floor(n/MW),p={x:(x+.5)*T,y:(y+.5)*T};
    const nearDoor=h.entrances.some(d=>dst(p.x,p.y,h.x*T+d.x,h.y*T+d.y)<2*T);
    const cost=dE(p,door)+(nearDoor?140:0)+neighbours.reduce((v,o)=>v+Math.max(0,50-dE(o,p))*9,0);
    if(cost<score && neighbours.every(o=>dE(o,p)>2*e.r+3)){best=p;score=cost;}
    for(let k=0;k<4;k++){
      const m=navNeighbor(x,y,k),nx=m%MW,ny=Math.floor(m/MW);
      if(m>=0&&!seen.has(m)&&nx>h.x&&nx<h.x+h.w-1&&ny>h.y&&ny<h.y+h.h-1){
        seen.add(m);queue.push(m);
      }
    }
  }
  return best && {...best,house:h.ok};
}
function shelterPlace(e,avoid){
  if(e.guard==='bridge' && bridgeBarrier){
    // The underpass itself is their assigned covered station on either approach.
    const post=NPCDEF.find(n=>n.sid===e.sid);
    if(post)return {x:post.x*T,y:post.y*T,underpass:true};
  }
  const nearest=routeToShelter(e,lonerShelters);
  if(nearest && nearest.house.ok!==avoid){
    const spot=roomShelterPlace(e,nearest);if(spot)return spot;
  }
  const doors=lonerShelters.doors.slice().sort((a,b)=>dE(e,a)-dE(e,b));
  for(const d of doors){
    if(d===nearest || d.house.ok===avoid)continue;
    const spot=roomShelterPlace(e,d);
    if(spot && findPath(e.x,e.y,spot.x,spot.y,true))return spot;
  }
  return nearest && {x:nearest.x,y:nearest.y,house:nearest.house.ok};
}
function blowoutHumanAI(e, dt) {
  if(e.kind!=='human'||e.sid==='sid'||e.wounded||e.captive)return false;
  if(!S.blow?.stage){
    if(e.evacuating){
      e.evacuating=false;e.shelterSpot=null;e.path=null;e.routeRetry=0;
      if(e.trip?.shelter)e.trip=null;
      if(e.trip?.stage===1)e.trip.stage=0;
      // Followers retain their current orders; travellers retain their destination and stage.
      if(!e.follow && !e.trip && e.shelterOrigin && dE(e,e.shelterOrigin)>5)
        e.trip={stage:2,returnTo:e.shelterOrigin};
      else if(e.seat&&!e.sit&&!e.follow&&!e.trip)e.trip={stage:2};
      e.shelterOrigin=null;
    }
    return false;
  }
  if(!e.evacuating){
    e.evacuating=true;e.shelterOrigin={x:e.x,y:e.y};
    e.shelterProbe=null;e.shelterRevision=-1;
    e.path=e.cover=e.role=e.aidTarget=null;e.inCover=0;e.routeRetry=0;
    if(e.trip?.shelter)e.trip=null;
    if(e.sit)e.seat=1;
  }
  // A sheltered witness can defend the room without running outside after the shooter.
  if(e.angry && S.min<(e.defendUntil||0) && P.alive && sheltered(e.x,e.y) && sheltered(P.x,P.y) && dE(e,P)<190 && clearNPCShot(e,P)){
    const w=WP[e.wpn],a=Math.atan2(P.y-e.y,P.x-e.x);
    e.sit=0;e.ang+=angD(e.ang,a)*Math.min(1,7*dt);e.cool-=dt;
    if(e.cool<=0 && Math.abs(angD(e.ang,a))<.28 && w.ammo){
      if(e.mag<=0){e.mag=w.mag;e.cool=w.reload;}
      else if(fire(e,e.ang,w,w.spread,P)){e.mag--;e.cool=Math.max(.36,w.rate);}
    }
    return true;
  }
  e.tgt=e.lastSeen=null;e.mem=e.aw=0;
  if(e.guard==='bridge' && e.shelterSpot?.underpass){
    const post=e.shelterSpot;
    if(dE(e,post)>9)goTo(e,post.x,post.y,90,dt);
    else e.path=null;
    return true;
  }
  if(sheltered(e.x,e.y)){
    const spot=e.shelterSpot,h=spot && HOUSES.find(h=>h.ok===spot.house);
    if(h && e.x>(h.x+.6)*T && e.x<(h.x+h.w-.6)*T && e.y>(h.y+.6)*T && e.y<(h.y+h.h-.6)*T &&
        dE(e,spot)>7 && clearWalk(e.x,e.y,spot.x,spot.y,e.r)){
      goTo(e,spot.x,spot.y,76,dt);return true;
    }
    e.path=null;e.yielding=false;
    return true;
  }
  const probe=e.shelterProbe;
  if(probe)probe.time-=dt;
  const stalled=probe && probe.time<=0 && dE(e,probe)<12 && !sheltered(e.x,e.y);
  if(e.shelterRevision!==navRevision || stalled){
    if(!clearFooting(e.x,e.y,e.r))moveE(e,0,0);
    e.shelterSpot=shelterPlace(e,stalled?e.shelterSpot?.house:null);
    e.shelterRevision=navRevision;e.path=null;
  }
  if(!probe||probe.time<=0)e.shelterProbe={x:e.x,y:e.y,time:2.5};
  e.sit=e.crouch=0;e.campRise=null;
  if(e.shelterSpot && dE(e,e.shelterSpot)>5)goTo(e,e.shelterSpot.x,e.shelterSpot.y,122,dt);
  else {e.path=null;e.yielding=false;}
  return true;
}
function blowout(dt) {
  const B = S.blow;
  if (B.stage === 0 && S.min >= B.next && P.alive) {
    B.stage = 1; B.t = 42; play('warning');
    radioNews(BLOW_WARNING, true);
  }
  if (B.stage === 1) {
    B.t -= dt; WX.red = lerp(WX.red, 0.5, Math.min(1,dt * 0.05));

    if (B.t <= 0) {
      B.stage = 2; B.t = 26; play('blow');
      ents.forEach(e => {
        if (!e.alive || e === P || sheltered(e.x, e.y) || safeFromBlow(e)) return;
        if (chance(e.kind === 'dog' ? 0.5 : 0.6)) { e.hp = 0; kill(e, 'blow'); }
      });
    }
  } else if (B.stage === 2) {
    B.t -= dt; WX.red = lerp(WX.red, 1, Math.min(1,dt * 2));
    if (chance(dt * 1.5)) WX.flash = 0.8;
    if (P.alive && !sheltered(P.x, P.y)) { P.hp -= 9 * dt; S.rad = Math.min(100, S.rad + 1.5 * dt); if (P.hp <= 0) kill(P, 'blow'); }
    if (B.t <= 0) {
      S.flags.blowClearUntil=S.min+12;
      B.stage = 0; B.next = S.min + rnd(1440, 2400);
      ents.forEach(e => { if (e.trip && e.trip.shelter) e.trip.stage = 2; });
      let born = 0;
      ARTS0.forEach(a => {
        if (!S.flags['art_' + a.key] || arts.some(x => x.key === a.key)) return;
        delete S.flags['art_' + a.key];
        arts.push(reachableArtifact({...a,x:a.x+rnd(-10,10),y:a.y+rnd(-10,10)})); born++;
      });
      radioNews('Выброс закончился.' + (born ? ' В аномалиях наверняка родились новые артефакты.' : ''), true);
    }
  } else WX.red = Math.max(0, WX.red - dt * 0.3);
}

/* ---------- отрисовка атмосферы ---------- */
function drawCloudShadows() {
  if (WX.cloud < 0.2 || (P && (loftAt(P) || inBunker(P.x, P.y)))) return;
  WX.clouds.forEach(c => {
    const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.2, c.x, c.y, c.r);
    g.addColorStop(0, 'rgba(0,0,0,' + (WX.cloud * 0.22) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
  });
}
function drawBubbles(inView) {
  ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
  for (const e of ents) {
    if (!e.alive || !e.bub || !inView(e.x, e.y, 120)) continue;
    if (HOUSES.some(h => h.a > 0.5 && e.x > h.x * T && e.x < (h.x + h.w) * T && e.y > h.y * T && e.y < (h.y + h.h) * T)) continue;
    const t = e.bub.t, w = ctx.measureText(t).width + 12, a = clamp(e.bub.life / 0.5, 0, 1), y = e.y - 34;
    const bk = 1 / ZNEAR ** (BIG ? 0.75 : 0); ctx.save(); ctx.translate(e.x, e.y - 14); ctx.scale(bk, bk); ctx.translate(-e.x, -e.y + 14);   // камера ближе — облачко той же экранной величины
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(14,18,12,0.86)'; ctx.strokeStyle = e.fac === 'bandit' ? '#a79cc4' : e.fac === 'army' ? '#6fa35c' : '#d9c25a';
    ctx.beginPath(); ctx.rect(e.x - w / 2, y - 12, w, 17); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.x - 4, y + 5); ctx.lineTo(e.x, y + 10); ctx.lineTo(e.x + 4, y + 5); ctx.fill();
    ctx.fillStyle = '#e8e0c4'; ctx.fillText(t, e.x, y); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawWeatherScreen() {
  const bunk = P && (loftAt(P) || inBunker(P.x, P.y));
  if (!bunk) {
    if (WX.cloud > 0.3 || WX.rain > 0.1) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(' + Math.round(255 - WX.cloud * 45) + ',' + Math.round(255 - WX.cloud * 40) + ',' + Math.round(255 - WX.cloud * 25) + ')'; ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over'; }
    const room=HOUSES.find(h=>!h.ruin && roofHidden(h));
    ctx.save();
    if(room){
      ctx.beginPath();ctx.rect(0,0,VW,VH);
      ctx.rect((room.x*T-cam.x)*Z+VW/2,(room.y*T-cam.y)*Z+VH/2,room.w*T*Z,room.h*T*Z);
      ctx.clip('evenodd');
    }
    if (WX.fog > 0.05) {
      const s = [(P.x - cam.x) * Z + VW / 2, (P.y - cam.y) * Z + VH / 2];
      const g = ctx.createRadialGradient(s[0], s[1], 60 * Z, s[0], s[1], 460 * Z);
      g.addColorStop(0, 'rgba(170,176,166,' + WX.fog * 0.12 + ')'); g.addColorStop(1, 'rgba(170,176,166,' + WX.fog * 0.72 + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    drawWeatherFront();
    const n = Math.floor(WX.rain * 240);
    while (WX.drops.length < n) WX.drops.push({ x: rnd(0, VW), y: rnd(-VH, VH), l: rnd(10, 22), v: rnd(700, 1000) });
    if (WX.drops.length > n) WX.drops.length = n;
    if (n) {
      ctx.save();
      ctx.strokeStyle = 'rgba(190,200,210,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
      const sx = WX.wind * 0.35;
      for (const d of WX.drops) {
        d.y += d.v / 60; d.x += d.v / 60 * sx;
        if (d.y > VH) { d.y = rnd(-60, 0); d.x = rnd(-100, VW); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * sx, d.y - d.l);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,210,220,0.25)';
      for (let i = 0; i < n / 8; i++) { ctx.beginPath(); ctx.ellipse(Math.random() * VW, Math.random() * VH, 3, 1.2, 0, 0, 6.28); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }
  const exposed = S.blow?.stage && !sheltered(P.x, P.y);
  if (WX.red > 0.02 && exposed) {
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(255,' + Math.round(255 - WX.red * 140) + ',' + Math.round(255 - WX.red * 160) + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    if (S.blow?.stage === 2) { ctx.fillStyle = 'rgba(200,40,20,' + (0.12 + 0.1 * Math.sin(S.min * 14)) + ')'; ctx.fillRect(0, 0, VW, VH); }
  }
  if (WX.flash > 0 && !bunk && (!S.blow?.stage || exposed)) { ctx.fillStyle = 'rgba(235,240,255,' + WX.flash * 0.45 + ')'; ctx.fillRect(0, 0, VW, VH); }
}
