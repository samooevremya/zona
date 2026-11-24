// Small visual traces stay in world coordinates. Ground traces are painted once per chunk.
const inhabited = BIG && !location.hash.includes('inhabited-off');
function contactInk(g,x,y,w,h,a,opacity=.52){
  if(!SHADOWS)return;
  g.save();g.translate(x,y);g.rotate(a);g.globalAlpha*=opacity;
  g.drawImage(shadowStamp,-w/2,-h/2,w,h);g.restore();
}
function paintBuildingFeet(g){
  if(!inhabited)return;
  for(const h of HOUSES){
    const w=h.w*T,d=h.h*T,x=h.x*T,y=h.y*T;
    if(!nearGroundChunk(x+w/2,y+d/2,Math.max(w,d)/2+65))continue;
    for(const e of h.entrances){
      const wx=x+e.x,wy=y+e.y,n=Math.atan2(e.ny,e.nx);
      g.save();g.translate(wx,wy);g.rotate(n);
      g.globalAlpha=h.ruin?.30:.52;
      g.drawImage(trailPrint(false,1),-8,-e.width*.64,54,e.width*1.28);
      g.globalAlpha=1;
      const width=e.width-4,style=e.approach;
      if(!e.breach){
        contactInk(g,1,0,13,width+8,0);
        g.fillStyle=style==='slab'?'#706957':'#6f5c45';
        g.fillRect(-2,-width/2,6,width);
        g.fillStyle='rgba(184,160,123,.50)';g.fillRect(2,-width/2,1,width);
        g.fillStyle='rgba(36,30,23,.66)';g.fillRect(-2,-width/2,1.5,width);
      }
      g.restore();
    }
  }
  for(const o of fences){
    if(o.material==='railMesh' || !nearGroundChunk(o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)/2+19))continue;
    const long=o.w>o.h,len=Math.max(o.w,o.h);
    for(let step=11;step<len-7;step+=14){
      const x=o.x+(long?step:o.w+3),y=o.y+(long?o.h+3:step);
      if(tAt(Math.floor(x/T),Math.floor(y/T))!==GR || hash2(x,y)<.38)continue;
      const size=10+hash2(y,x)*8;
      ART.draw(g,'c1_tuft'+Math.floor(hash2(y-1,x+1)*6),x,y,size,size,hash2(y,x)*6,.63);
    }
  }
}
function propGroundTrace(g,kind,x,y,width,a){
  if(!inhabited || !nearGroundChunk(x,y,width))return;
  const metal=/barrel|drum|reel/i.test(kind);
  if(metal){
    g.save();g.translate(x,y+width*.20);g.rotate(.4);
    g.globalAlpha=.55;g.drawImage(trailPrint(true,1),-width*.42,-width*.15,width*1.28,width*.7);
    g.globalAlpha=.73;g.fillStyle='rgba(118,59,31,.38)';
    g.beginPath();g.ellipse(width*.17,width*.13,width*.33,width*.17,0,0,Math.PI*2);g.fill();g.restore();
  }
  contactInk(g,x,y+width*.08,width*.98,width*(metal?.63:.32),a);
}
function containerContact(o){
  if(inhabited && !o.broken)contactInk(ctx,o.x+o.w/2,o.y+o.h*.64,o.w+8,o.h*.72,0,.67);
}

// The same threshold stays at the base of the wall as the roof shifts.
function lookoutPosts(h,x,y,w,d,k){
  if(!inhabited || h.x!==WEST+15 || h.y!==NORTH_ROWS+28)return;
  for(const dx of [8,w-8])for(const dy of [8,d-8]){
    if(dy<d/2 && cam.y>y+d)continue;
    const fx=x+dx,fy=y+dy,[u,v]=roofPoint(fx,fy,k);
    contactInk(ctx,fx,fy,12,8,0,.78);
    beam(ctx,fx,fy,u,v,6,'#42372b');
    beam(ctx,fx-1.4,fy,u-1.4,v,1.8,'#8d7857');
    const dir=dx<w/2?1:-1;
    const [ax,ay]=roofPoint(fx+dir*18,fy,k);
    beam(ctx,lerp(fx,u,.25),lerp(fy,v,.25),ax,ay,3,'#5d4935');
  }
}

// Only the newly occupied property has a timed visual state. Legacy saves are already settled.
const atpRooms=['91,62','104,74'];
function atpAge(){
  if(!inhabited || !S || !atpSettled())return -1;
  return S.campaign?.atpOccupiedAt==null?1440:Math.max(0,S.min-S.campaign.atpOccupiedAt);
}
let settlement;
function atpScene(){
  if(settlement)return settlement;
  const garage=HOUSES.find(h=>h.ok===atpRooms[0]), quarters=HOUSES.find(h=>h.ok===atpRooms[1]);
  if(!garage || !quarters)return null;
  const floor=(h,x,y)=>({x:(h.x+x)*T,y:(h.y+y)*T});
  const lamp={...floor(garage,3.18,2.65),angle:0,half:Math.PI,r:112};
  const doorway=garage.entrances[0];
  const door={x:garage.x*T+doorway.x,y:garage.y*T+doorway.y+2,angle:Math.PI/2,half:.64,r:90};
  const guardPoint=walkPoint(door,1.7,.9);
  return settlement={lamp,door,guardPoint,
    rolls:[floor(garage,2.02,1.55),floor(garage,3.62,1.55)],
    bench:floor(quarters,1.18,2.15),
    marks:[floor(garage,4.2,6.75),floor(garage,8.5,7.45),floor(garage,11.4,6.25)]
  };
}
function drawAtpOccupation(inView){
  const age=atpAge();
  if(age<0)return;
  const s=atpScene();if(!s)return;
  if(age<1440)for(const [i,p] of s.marks.entries()){
    if(!inView(p.x,p.y,25))continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=1-age/1700;
    ctx.drawImage(trailPrint(true,i),-21,-9,41,19);
    for(let k=0;k<8;k++){
      const x=(hash2(i,k)-.5)*35,y=(hash2(k,i+7)-.5)*18;
      beam(ctx,x,y,x+2,y-1,1.2,k%3?'#6e5535':'#8b774b');
    }
    ctx.restore();
  }
  if(age<90)return;
  for(const [i,p] of s.rolls.entries()){
    if(!inView(p.x,p.y,36))continue;
    drawRoomFitting(ctx,{x:p.x-12,y:p.y-12,w:24,h:24,angle:Math.PI/2+(i?.05:-.07),fitting:'bedroll'});
  }
  if(age>=720 && inView(s.bench.x,s.bench.y,34)){
    const {x,y}=s.bench;
    ctx.save();ctx.translate(x,y);contactInk(ctx,0,1,28,16,0);
    ART.draw(ctx,'c1_crate_army',0,0,27,17,.05);
    beam(ctx,-8,1,5,-5,2.2,'#9a9990');
    beam(ctx,2,3,9,4,2.2,'#927257');ctx.restore();
  }
}
function atpNewSentry(e){
  if(!['petr','petr2','atpScout','atpRunner','atpRelief0','atpRelief1'].includes(e.sid) || atpAge()<720 || !e.alive || e.wounded || e.captive || e.follow || e.tgt || e.mem>0 ||
    e.trip || e.evacuating || e.shelterReturn || S.blow?.stage)return false;
  const guard=atpCompany().find(n=>n.alive && !n.wounded && !n.follow);
  return guard===e && !!atpScene();
}

let barLamp;
function householdLights(){
  if(!inhabited)return [];
  const counter=objs.find(o=>o.barRole==='counter');
  if(counter)barLamp ||= {x:counter.x+counter.w-16,y:counter.y+counter.h+13,angle:Math.PI/2,half:Math.PI,r:142};
  const stage=atpAge(),s=stage>=90?atpScene():null;
  return [barLamp,s?.lamp,s?.door].filter(Boolean);
}
function occupiedWindow(h){
  if(!inhabited || h.ruin || darkness()<.14)return false;
  return ['15,72','26,71','78,118'].includes(h.ok) || atpRooms.includes(h.ok) && atpAge()>=90;
}
function windowOcclusion(x,y,nx,ny){
  for(const e of ents){
    if(!e.alive || e.kind!=='human' || e.sit)continue;
    const dx=e.x-x,dy=e.y-y,behind=-(dx*nx+dy*ny),across=dx*ny-dy*nx;
    if(behind>0 && behind<47 && Math.abs(across)<15)return {offset:across,w:8+behind*.11};
  }
  return null;
}
function glowingPane(g,u,x,y,nx,ny){
  g.fillStyle='#e1b773';g.fillRect(u-11,24,22,25);
  g.fillStyle='#9d7652';g.fillRect(u-11,44,22,5);
  const shadow=windowOcclusion(x,y,nx,ny);
  if(shadow){
    g.save();g.beginPath();g.rect(u-11,24,22,25);g.clip();g.fillStyle='#523e2e';
    g.beginPath();g.ellipse(u+shadow.offset,40,shadow.w/2,13,0,0,Math.PI*2);g.fill();g.restore();
  }
  g.fillStyle='#6d573d';g.fillRect(u-1,23,2,28);g.fillRect(u-11,34,22,1.6);
}
function paneSpill(inView){
  if(!inhabited || darkness()<.14)return [];
  const lights=[];
  for(const h of HOUSES){
    if(h.a<.5 || !occupiedWindow(h) || !inView((h.x+h.w/2)*T,(h.y+h.h/2)*T,Math.max(h.w,h.h)*T/2+80))continue;
    for(const s of h.litPanes || []){
      if(inView(s.x,s.y,80))lights.push(s);
    }
  }
  return lights;
}

function idleWeight(e){
  if(!inhabited || e===P || (!e.guard && !e.seat && !e.resident) || e.tgt || e.crouch)return 0;
  const phase=(G7.vt+(e.seed||0)%19)%17;
  return phase<3?Math.sin(Math.PI*phase/3)*.8:0;
}
const campPacks=new WeakMap();
function restingPack(e){
  if(!inhabited || e===P || e.fac!=='loner' || (!e.sit && !(e.campRise!=null && e.campRise<.68)) || !e.fireRef || dE(e,e.fireRef)>80 || e.id%2)return null;
  const old=campPacks.get(e);
  if(old && dE(e,old.holder)<3)return old;
  const p=localToWorld(e,e.ang,-19,-6),tile=tAt(Math.floor(p.x/T),Math.floor(p.y/T));
  if(SOLID[tile])return null;
  const bag={...p,holder:{x:e.x,y:e.y},a:e.ang+.3};
  campPacks.set(e,bag);return bag;
}
function drawRestingPack(e){
  const p=restingPack(e);if(!p)return;
  const roll=packImage('assets/g8/player_bedroll.webp');
  if(!roll)return;
  const lift=clamp((e.campRise||0)/.68,0,1),back=localToWorld(e,e.ang,-7,-10);
  const x=lerp(p.x,back.x,lift),y=lerp(p.y,back.y,lift);
  if(lift<.7)contactInk(ctx,p.x,p.y,14,10,p.a,.56*(1-lift));
  ctx.save();ctx.translate(x,y);ctx.rotate(p.a);
  ctx.fillStyle='#514738';ctx.fillRect(-5,-4,10,9);
  ctx.drawImage(roll,-6,-5,12,5);
  beam(ctx,-3,-4,-3,5,1,'#342d23');beam(ctx,3,-4,3,5,1,'#342d23');ctx.restore();
}

function facadePane(h,side,u,corner){
  const panes=h.paneSources ||= [];
  if(panes[side])return panes[side];
  const [nx,ny]=[[0,-1],[1,0],[0,1],[-1,0]][side];
  const wallX=corner[0]+(side%2?0:u),wallY=corner[1]+(side%2?u:0);
  return panes[side]={wallX,wallY,nx,ny,x:wallX+nx*3,y:wallY+ny*3,angle:Math.atan2(ny,nx),r:70};
}
