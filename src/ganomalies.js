/* S.min advances by one game minute per second of unpaused play.
   Absolute deadlines keep probes and gravity pulses in sync across reloads and rest. */
const ELECTRA_WINDOW = 3, GRAVITY_PERIOD = 8, GRAVITY_CALM = 3.5, GRAVITY_WARNING = 1.25;

function spawnAnomaly(site) {
  const key = site.id || site.k+'_'+Math.round(site.x)+'_'+Math.round(site.y);
  return {...site, key, until:S.flags.anomalyDischarges?.[key] || 0,
    lastProbe:S.flags.gravityProbes?.[key] ?? null,
    offset:((Math.floor(site.x/T)*17 + Math.floor(site.y/T)*31) % 80)/10,
    hitUntil:new WeakMap(), reveal:0, fx:0, soundAt:0};
}
function gravityClock(a) {
  return a.lastProbe==null ? (S.min+a.offset)%GRAVITY_PERIOD : (S.min-a.lastProbe)%GRAVITY_PERIOD;
}
function anomalyPhase(a) {
  if (a.k === 'e') {
    const remaining = a.until - S.min;
    return remaining <= 0 ? 'active' : remaining <= 1.25 ? 'warning' : 'quiet';
  }
  const t = gravityClock(a);
  return t < GRAVITY_CALM ? 'quiet' : t < GRAVITY_CALM+GRAVITY_WARNING ? 'warning' : 'active';
}
function anomalyHint() {
  let nearest = null, edge = 135;
  for (const a of anoms) {
    const d = dE(a,P) - a.r;
    if (d < edge) { edge=d; nearest=a; }
  }
  if (!nearest) return '';
  const phase = anomalyPhase(nearest);
  if (nearest.k === 'g') {
    if (nearest.reveal>0) {
      const clock=gravityClock(nearest);
      if (phase==='quiet') return 'Воронка · затишье ещё '+Math.ceil(GRAVITY_CALM-clock)+' с';
      if (phase==='active') return 'Воронка · затишье через '+Math.ceil(GRAVITY_PERIOD-clock)+' с';
    }
    if (phase === 'quiet') return 'Воронка · пыль осела, проходи';
    return phase === 'warning' ? 'Воронка · пыль поднимается!' : 'Воронка · пережди тягу';
  }
  return '';
}

function anomalyBurst(a) {
  a.fx=1;
  play(a.k==='e'?'anomE':'anomG',a.x,a.y);
  if (a.k==='e') flashes.push({x:a.x,y:a.y,a:0,life:.12,big:1,blue:1});
  for(let i=0;i<12;i++){
    const angle=rnd(0,2*Math.PI), speed=rnd(14,50);
    parts.push({x:a.x+Math.cos(angle)*a.r*.7,y:a.y+Math.sin(angle)*a.r*.7,
      vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rnd(.22,.52),
      c:a.k==='e'?'#9dc0c8':'#9a805d',s:1.5});
  }
}
function probeAnomaly(a,b,x,y) {
  a.reveal=10;
  b.x0=x; b.y0=y; b.hit=a; b.t=0; b.dur=.3;
  if (a.k==='e') {
    a.until=S.min+ELECTRA_WINDOW;
    (S.flags.anomalyDischarges ||= {})[a.key]=a.until;
    anomalyBurst(a);
    b.x1=x; b.y1=y;
  } else {
    // The bolt is drawn inward before the dust settles. A second bolt during the
    // same recovery period cannot prolong it.
    const wasActive=anomalyPhase(a)==='active';
    if(wasActive && (a.lastProbe==null || S.min-a.lastProbe>=GRAVITY_PERIOD)){
      a.lastProbe=S.min;(S.flags.gravityProbes ||= {})[a.key]=S.min;
    }
    play('bolt',x,y);
    const pull=wasActive ? .9 : .2;
    b.x1=lerp(x,a.x,pull); b.y1=lerp(y,a.y,pull);
  }
}
function updateBolts(dt) {
  for (let i=bolts.length-1;i>=0;i--) {
    const b=bolts[i], start=Math.min(1,b.t/b.dur);
    b.t+=dt;
    const end=Math.min(1,b.t/b.dur), dx=b.x1-b.x0, dy=b.y1-b.y0;
    const length=Math.hypot(dx,dy), x=b.x0+dx*start,y=b.y0+dy*start;
    if (!b.hit && length>0) {
      let first=null, dist=(end-start)*length;
      for (const a of anoms) {
        if (a.k==='e' && a.until>S.min) continue;
        const hit=rayCircle(x,y,dx/length,dy/length,a.x,a.y,a.r);
        if (hit!==null && hit<=dist) { first=a; dist=hit; }
      }
      if (first) { probeAnomaly(first,b,x+dx/length*dist,y+dy/length*dist); continue; }
    }
    if (end===1) {
      if (!b.hit) play('bolt',b.x1,b.y1);
      bolts.splice(i,1);
    }
  }
}

function updateAnoms(dt) {
  for (const a of anoms) {
    a.reveal=Math.max(0,a.reveal-dt); a.fx=Math.max(0,a.fx-dt*2.8);
    if (a.until && a.until<=S.min) {
      a.until=0;
      delete S.flags.anomalyDischarges[a.key];
    }
    if (anomalyPhase(a)!=='active') continue;
    const electric=a.k==='e';
    if (electric && S.min>=a.soundAt && dE(a,P)<160) {
      play('zap',a.x,a.y,.35); a.soundAt=S.min+2+a.offset*.09;
    }
    for (const e of ents) {
      if (!e.alive || e.captive) continue;
      const d=dE(e,a);
      if (d>=a.r+e.r*.5) continue;
      // Electricity repels at the rim; the vortex pulls towards its damaging core.
      const x=e.x-a.x,y=e.y-a.y, angle=d<1 ? e.ang+Math.PI : Math.atan2(y,x);
      if (electric) { e.kx=Math.cos(angle)*330; e.ky=Math.sin(angle)*330; }
      else {
        e.kx-=x*dt*105; e.ky-=y*dt*105;
        if (d>a.r*.72) continue;
      }
      if ((a.hitUntil.get(e)||0)>S.min) continue;
      a.hitUntil.set(e,S.min+(electric ? 1.15 : GRAVITY_PERIOD-gravityClock(a)));
      if (a.fx<=0) anomalyBurst(a);
      if (!electric) { e.kx=Math.cos(angle)*390; e.ky=Math.sin(angle)*390; }
      const dmg=electric ? (e===P && beltCount('art_bengal') ? 13 : 26) : 30;
      hurt(e,dmg,'anom');
    }
  }
}
function cacheFieldQuiet(o) {
  if (!o.anomalyId) return true;
  const field=anoms.find(a=>a.id===o.anomalyId);
  return !!field && anomalyPhase(field)==='quiet';
}

// Anchor a discharge to an actual piece of the map. Empty fields only spark on the ground.
function conductorAt(a){
  let best=null,reach=a.r+85;
  for(const o of objs){
    if(o.k!=='fence' || !['mesh','railMesh','concreteWire','wire'].includes(o.material))continue;
    const x=clamp(a.x,o.x,o.x+o.w),y=clamp(a.y,o.y,o.y+o.h),d=dst(a.x,a.y,x,y);
    if(d<reach){reach=d;best={x:x-a.x,y:y-a.y,alongX:o.w>o.h,edge:o};}
  }
  return best;
}
function drawFieldDebris(a,phase,t){
  if(phase==='quiet')return;
  if(a.k==='e'){
    if(a.conductor===undefined)a.conductor=conductorAt(a);
    const p=a.conductor;
    if(!p || ((t+a.offset)*1.65)%1>.18)return;
    const end=p.alongX ? clamp(a.x+p.x+17,p.edge.x,p.edge.x+p.edge.w)-a.x : p.x;
    const bottom=p.alongX ? p.y : clamp(a.y+p.y+17,p.edge.y,p.edge.y+p.edge.h)-a.y;
    ctx.strokeStyle=phase==='warning'?'#9cabb0':'#c4d8d8';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo((p.x+end)*.5+2,(p.y+bottom)*.5-3);
    ctx.lineTo(end,bottom);ctx.stroke();return;
  }
  const age=gravityClock(a)-GRAVITY_CALM;
  for(let i=0;i<7;i++){
    const progress=(age*(phase==='warning' ? .19 : .42)+i*.173)%1;
    const angle=a.offset+i*2.4+progress*1.6,rad=a.r*(1.15-.93*progress);
    const x=Math.cos(angle)*rad,y=Math.sin(angle)*rad;
    ctx.fillStyle=i%2?'#7f6747':'#a28b60';
    ctx.beginPath();ctx.ellipse(x,y-3,3.4,1.2,angle+.8,0,Math.PI*2);ctx.fill();
  }
}
