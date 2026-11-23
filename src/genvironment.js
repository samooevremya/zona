// Transient world effects use world pixels and simulation time. They never enter the save.
const livingZone=BIG && !location.hash.includes('living-off');
let surfaceWater=0,wetBoots=0,footSide=1,environmentTime=0;
const bootMarks=[],plantBlocks=new Map(),bentPlants=new Map();
function resetEnvironment(){
  bootMarks.length=0;bentPlants.clear();
  surfaceWater=WXT[S.wx?.k]?.[1] || 0; wetBoots=0;environmentTime=0;footSide=1;
}
function updateEnvironment(dt){
  environmentTime+=dt;
  surfaceWater=lerp(surfaceWater,WX.rain,1-Math.exp(-dt/(WX.rain>surfaceWater?6:55)));
  while(bootMarks.length && environmentTime-bootMarks[0].time>23)bootMarks.shift();
  for(const [plant,bend] of bentPlants)if(environmentTime-bend.time>1.35)bentPlants.delete(plant);
}
function leaveBootMark(e){
  const t=tAt(Math.floor(e.x/T),Math.floor(e.y/T));
  if(t===SW || ((t===DI||t===GR||t===BU) && surfaceWater>.24)){wetBoots=1;return;}
  if(wetBoots<.08)return;
  if(t===CF || t===FL || t===AS || loftAt(e)){
    footSide*=-1;
    const a=e.ang,side=4*footSide;
    bootMarks.push({x:e.x-Math.sin(a)*side,y:e.y+Math.cos(a)*side,a,time:environmentTime,wet:wetBoots,level:loftAt(e)});
    if(bootMarks.length>45)bootMarks.shift();
  }
  wetBoots*=.72;
}
function drawBootMarks(level,inView){
  for(const m of bootMarks){
    if(m.level!==level || !inView(m.x,m.y,12))continue;
    ctx.save();ctx.translate(m.x,m.y);ctx.rotate(m.a);
    ctx.globalAlpha=.66*m.wet*(1-(environmentTime-m.time)/23);
    ctx.fillStyle='#3a342a';ctx.beginPath();ctx.ellipse(2,0,4.3,2.4,0,0,6.29);ctx.fill();
    ctx.fillRect(-5,-1.9,2.7,3.8);ctx.restore();
  }
}
function reactiveTuft(x,y){return hash2(y+9,x+61)<.52;}
function plantsInBlock(bx,by){
  const key=by*MW+bx;
  if(plantBlocks.has(key))return plantBlocks.get(key);
  const plants=[];
  for(let y=by*8;y<by*8+8;y++)for(let x=bx*8;x<bx*8+8;x++){
    const t=tAt(x,y),seed=hash2(x+17,y+83);
    if(t===GR && seed<=.32 && reactiveTuft(x,y)){
      plants.push({x:(x+.18+seed*2)*T,y:(y+.2+.6*hash2(y+7,x))*T-2,w:14+seed*24,a:seed*5,id:'c1_tuft'+Math.floor(seed*18)});
    }
    if(t===BU && seed<.65)plants.push({x:(x+.53)*T,y:(y+.64)*T,w:24,a:seed*6,id:'c1_bush1'});
    const py=y-LESSER_TOP;
    if(t!==GR || x<18 || x>71 || py< -22 || py>35)continue;
    eachPoppy(x,py,(px,wy,which,i)=>{if(i===0)plants.push({x:px,y:wy,w:40,flower:which});});
  }
  if(plantBlocks.size>=128)plantBlocks.delete(plantBlocks.keys().next().value);
  plantBlocks.set(key,plants);return plants;
}
function visiblePlants(vx,vy,vw,vh,actors){
  const items=[];
  for(let by=Math.max(0,Math.floor((vy-33)/(8*T)));by<=Math.min(Math.floor((MH-1)/8),Math.floor((vy+vh+33)/(8*T)));by++)
    for(let bx=Math.max(0,Math.floor((vx-33)/(8*T)));bx<=Math.min(Math.floor((PW-1)/8),Math.floor((vx+vw+33)/(8*T)));bx++)
      for(const p of plantsInBlock(bx,by)){
        if(p.x<vx-30||p.y<vy-30||p.x>vx+vw+30||p.y>vy+vh+30)continue;
        for(const e of actors){
          const dx=p.x-e.x,dy=p.y-e.y;
          if(Math.abs(dx)>20 || Math.abs(dy)>18 || (e.mv||0)<2 || e.sit || e.wounded)continue;
          const contact=1-Math.hypot(dx/21,dy/20);
          if(contact>0)bentPlants.set(p,{dx:(dx*.19+Math.cos(e.ang)*6)*contact,dy:(dy*.19+Math.sin(e.ang)*5)*contact,time:environmentTime});
        }
        items.push(p);
      }
  return items.sort((a,b)=>a.y-b.y);
}
function drawPlant(p){
  const bend=bentPlants.get(p),k=bend?Math.exp(-3.6*(environmentTime-bend.time)):0;
  const dx=bend?bend.dx*k:0,dy=bend?bend.dy*k:0;
  if(p.flower!==undefined)ctx.drawImage(poppyTuft(p.flower),p.x-20+dx,p.y-20+dy);
  else ART.draw(ctx,p.id,p.x+dx,p.y+dy,p.w,p.w*.86,p.a+dx*.025,.86);
}
function drawRunoff(inView){
  if(surfaceWater<.035)return;
  for(const h of HOUSES){
    if(h.ruin || h.x>=PW)continue;
    const x=(h.x+h.w-.70)*T,y=(h.y+h.h)*T;
    if(!inView(x,y,80))continue;
    const phase=(environmentTime*(.8+WX.rain)+hash2(h.x,h.y))%1;
    ctx.save();ctx.translate(x,y);
    // A sheltered strip under the eave and a single depression below its drip edge.
    ctx.globalAlpha=surfaceWater*.47;
    ctx.drawImage(trailPrint(false,1),-63,-5,77,12);
    ctx.drawImage(trailPrint(true,2),-28,3,65,23);
    ctx.drawImage(yardReflection(),-21,6,48,16);
    if(WX.rain>.10){
      if(phase<.42)beam(ctx,3,phase*30-3,3,phase*30,1.1,'#d7d6c6');
      else{const a=(phase-.42)/.58;ctx.strokeStyle='rgba(202,211,204,'+(.75*(1-a))+')';ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(3,13,1+12*a,.8+4*a,0,0,6.29);ctx.stroke();}
    }
    ctx.restore();
  }
}
// Only unassigned residents leave the hearth. Each reserves a separate reachable resting place.
function rainErrand(e,dt){
  if(!livingZone || e.fac!=='loner' || e.named || e.sid==='wolf' || e.guard || e.follow || e.squadMate ||
     e.stay || e.jobTag || e.sos || e.wounded || e.captive || e.evacuating || S.blow?.stage)return false;
  if(e.rainRest && WX.rain<.2){
    e.rainRest=null;e.path=null;e.trip={stage:2,returnTo:{...e.home}};return false;
  }
  if(!e.rainRest){
    if(!e.sit || !e.fireRef || dE(e,e.fireRef)>95 || WX.rain<.45)return false;
    e.rainWait=(e.rainWait??(1+e.seed%9))-dt;if(e.rainWait>0)return false;
    e.rainWait=5;
    const door=routeToShelter(e,lonerShelters);
    if(!door || dE(door,e)>650)return false;
    const busy=ents.some(o=>o!==e && o.rainRest?.house===door.house.ok);
    const alternate=busy?shelterPlace(e,door.house.ok):null;
    const rest=alternate && dE(e,alternate)<650 ? alternate : roomShelterPlace(e,door);
    if(!rest)return false;
    e.rainRest=rest;e.seat=1;setCampSeat(e,false);e.wander=null;e.path=null;
  }
  if(dE(e,e.rainRest)>8)goTo(e,e.rainRest.x,e.rainRest.y,67,dt);
  else {
    e.path=null;e.yielding=false;
    e.ang+=angD(e.ang,Math.atan2(e.fireRef.y-e.y,e.fireRef.x-e.x))*Math.min(1,dt*2);
  }
  return true;
}
function drawHearthGesture(e){
  if(!e.sit || e.tgt || e.wounded || !e.fireRef || dE(e,e.fireRef)>76)return;
  const phase=(environmentTime+e.seed%19)%13;if(phase>3.4)return;
  const reach=Math.sin(Math.PI*phase/3.4);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  for(const sign of [-1,1]){
    beam(ctx,5,sign*8,9+reach*6,sign*(8-reach*4),3.4,'#655b46');
    beam(ctx,9+reach*6,sign*(8-reach*4),11+reach*6,sign*(8-reach*4),2.8,'#97836a');
  }
  if(e.seed%2 && phase>.65 && phase<2.8)beam(ctx,13+reach*4,4,21+reach*8,1,1.5,'#6e5440');
  ctx.restore();
}
