// Light paths are in world coordinates, so moving the camera never moves a shadow.
const beamCache=new WeakMap();
function lightFootprint(source,angle,half,radius) {
  let slots=beamCache.get(source);
  if(!slots){slots=new Map();beamCache.set(source,slots);}
  const deck=BEREZKI && source===P && (S.flags.onLookout?'tower':S.flags.stationDeck?'bridge':'');
  const cached=slots.get(radius);
  if(cached && cached.x===source.x && cached.y===source.y && cached.angle===angle && cached.half===half && cached.rev===navRevision && cached.deck===deck)return cached.path;
  const path=new Path2D(),full=half>=Math.PI,steps=full?44:22;
  const reach=a=>npcBarrier(source,Math.cos(a),Math.sin(a),radius,null,'light');
  const point=(a,r)=>path.lineTo(source.x+Math.cos(a)*r,source.y+Math.sin(a)*r);
  // Bracket the shadow edge near a door instead of joining a near jamb directly to the far wall.
  function edge(a,r,b,s,depth){
    if(depth && Math.abs(r-s)>10){
      const mid=(a+b)*.5,m=reach(mid);
      edge(a,r,mid,m,depth-1);edge(mid,m,b,s,depth-1);
    }else point(b,s);
  }
  let a=angle-half,r=reach(a);
  if(!full)path.moveTo(source.x,source.y);
  point(a,r);
  for(let i=1;i<=steps;i++){
    const b=angle-half+half*2*i/steps,s=reach(b);
    edge(a,r,b,s,3);a=b;r=s;
  }
  path.closePath();slots.set(radius,{x:source.x,y:source.y,angle,half,rev:navRevision,deck,path});return path;
}
function castLight(g,source,angle,half,radius,strength,tint){
  if(BEREZKI && source.kind && source!==P && winterFloor(source.x,source.y)!==winterFloor(P.x,P.y))return;
  const path=lightFootprint(source,angle,half,radius);
  const fade=g.createRadialGradient(source.x,source.y,1,source.x,source.y,radius);
  const color=tint||'0,0,0';
  fade.addColorStop(0,'rgba('+color+','+strength+')');
  fade.addColorStop(.63,'rgba('+color+','+(strength*.58)+')');
  fade.addColorStop(1,'rgba('+color+',0)');
  g.fillStyle=fade;g.fill(path);
}
let outdoorLamps, settlementLights;
function villageBulbs(){
  if(BEREZKI)return [];
  return settlementLights ||= (LOC.village.anchors.lamps||[]).map(([x,y])=>({x:x*T,y:y*T}));
}
function siteLights(){
  if(BEREZKI)return [];
  if(!outdoorLamps)outdoorLamps=BIG?[
    {x:HATCH.x,y:HATCH.y+10,angle:Math.PI*.48,half:.39,r:96},
    {...worldPoint(122.5,202.5),angle:1.0,half:1.34,r:167}
  ]:[];
  return outdoorLamps;
}
function lampExposure(lamp,p){
  const d=dE(lamp,p);
  if(d>=lamp.r || Math.abs(angD(lamp.angle,Math.atan2(p.y-lamp.y,p.x-lamp.x)))>lamp.half)return 0;
  return d<1 || npcBarrier(lamp,(p.x-lamp.x)/d,(p.y-lamp.y)/d,d,null,'light')>=d-.1?1-d/lamp.r:0;
}
function drawLampShadows(inView){
  const dk=darkness();if(!SHADOWS || dk<.14)return;
  for(const l of siteLights()){
    if(!inView(l.x,l.y,l.r))continue;
    ctx.save();ctx.clip(lightFootprint(l,l.angle,l.half,l.r));
    for(const e of ents){
      if(!e.alive || e.kind!=='human')continue;
      const lit=lampExposure(l,e);if(lit<=0)continue;
      const a=Math.atan2(e.y-l.y,e.x-l.x),length=12+(1-lit)*31;
      ctx.save();ctx.translate(e.x,e.y);ctx.rotate(a);
      const fade=ctx.createLinearGradient(0,0,length,0);
      fade.addColorStop(0,'rgba(15,15,14,'+(.55*dk*lit)+')');fade.addColorStop(1,'rgba(15,15,14,0)');
      ctx.fillStyle=fade;ctx.beginPath();ctx.ellipse(length*.46,0,length*.55,e.crouch?6:8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.restore();
  }
}

function hitSurface(x,y,dx,dy,box){
  const p={x:x+dx*.7,y:y+dy*.7,r:.8},tx=Math.floor(p.x/T),ty=Math.floor(p.y/T),cell=ty*MW+tx;
  let kind=box?.material||box?.fitting||box?.k;
  if(!kind){
    const solid=walkSolids.get(cell)?.find(o=>o.solid && p.x>=o.x-1 && p.x<=o.x+o.w+1 && p.y>=o.y-1 && p.y<=o.y+o.h+1);
    kind=solid?.material||solid?.fitting||solid?.k||propCells.get(cell)?.find(o=>touchesProp(o,p))?.id||'';
  }
  if(/crate|stockade|picket|log|bench|plank|stump|wood|sleeper|cupboard|desk|chair|pallet|timber|spruce|birch|pine|tree/i.test(kind))return 'wood';
  if(/concrete|pier|rock|stone|pipeFoot|towerFoot/i.test(kind))return 'stone';
  if(/car|wagon|barrel|metal|bus|drum|barrier|steel|fence|tank|truck|pipe|waterMain|stove|pumpMachinery/i.test(kind))return 'metal';
  const tile=tAt(tx,ty);
  if(tile===TR)return 'wood';
  if(tile===CO)return 'stone';
  if(tile===BR){
    const h=HOUSES.find(h=>tx>=h.x && tx<h.x+h.w && ty>=h.y && ty<h.y+h.h);
    return h && !['conc','depot','brick'].includes(h.mat)?'wood':'brick';
  }
  return tile===RA?'metal':'earth';
}
const impactColors={wood:['#ba9466','#806044'],brick:['#b68a72','#907465'],stone:['#bbb7a3','#969487'],metal:['#ffcf80','#ffe4ac'],earth:['#968671','#84755f']};
function surfaceImpact(x,y,dx,dy,box,audible=false){
  if(!P || dE(P,{x,y})>970)return;
  const material=hitSurface(x,y,dx,dy,box),colors=impactColors[material];
  if(BEREZKI && audible)play(({wood:'hitTimber',brick:'hitMasonry',stone:'hitMasonry',metal:'hitSteel',earth:'hitSoil'})[material],x,y);
  if(parts.length>200)return;
  for(let i=0;i<4;i++){
    const speed=rnd(26,material==='metal'?160:92),angle=Math.atan2(-dy,-dx)+rnd(-1.2,1.2);
    parts.push({x:x-dx,y:y-dy,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rnd(.12,.30),c:colors[i%2],
      s:rnd(1,2.4),fragment:material});
  }
  if(material==='brick' || material==='stone' || material==='earth')
    parts.push({x:x-2*dx,y:y-2*dy,vx:-dx*13,vy:-dy*13,rise:6,life:.43,c:colors[1],s:4,smoke:1});
}
function drawFragment(p){
  if(p.fragment==='metal' || p.fragment==='wood'){
    const scale=p.fragment==='metal' ? .047 : .034;
    ctx.strokeStyle=p.c;ctx.lineWidth=p.fragment==='metal'?1:p.s;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*scale,p.y-p.vy*scale);ctx.stroke();
  }else{ctx.beginPath();ctx.moveTo(p.x-p.s,p.y);ctx.lineTo(p.x,p.y-p.s);ctx.lineTo(p.x+p.s,p.y+p.s*.7);ctx.fill();}
}

function paintWorkSites(g){
  const wolfHouse=HOUSES.find(h=>h.ok==='15,72');
  if(wolfHouse){
    const x=(wolfHouse.x+.6)*T,y=(wolfHouse.y+wolfHouse.h)*T+8;
    if(nearGroundChunk(x,y,68)){
      g.save();g.translate(x,y);
      g.drawImage(trailPrint(true,1),-21,-7,48,22);
      const rand=mulberry32(311);
      for(let row=0;row<3;row++)for(let i=0;i<4-row;i++){
        const u=-16+i*8+row*3,v=7-row*3;
        g.fillStyle='#463a2e';g.fillRect(u-1,v-15,7,17);
        beam(g,u+1,v-13,u+1.7,v,1,'#978974');
        g.fillStyle=rand()>.4?'#a58b65':'#8e795a';g.beginPath();g.ellipse(u+2,v,3.5,2.1,-.16,0,Math.PI*2);g.fill();
      }
      for(let i=0;i<21;i++){g.fillStyle=i%3?'#89765b':'#564a37';g.fillRect(rand()*36-15,10+rand()*12,1+rand()*3,1);}
      g.restore();
    }
  }
  const [gx,gy]=LOC.atp.anchors.garage, depot=HOUSES.find(h=>h.mat==='depot');
  function spill(x,y,w,h,seed){
    if(!nearGroundChunk(x,y,w))return;
    const rand=mulberry32(seed);g.save();g.translate(x,y);g.rotate(-.2);
    g.globalCompositeOperation='multiply';
    for(let i=0;i<15;i++){g.globalAlpha=i<4 ? .62 : .28;const s=i<4 ? .68+rand()*.32 : .08+rand()*.18;
      g.drawImage(trailPrint(true,i%4),(rand()-.5)*w-w*s/2,(rand()-.5)*h-h*s/2,w*s,h*s);}
    g.restore();
  }
  spill(gx*T,gy*T,95,41,552);
  const counter=objs.find(o=>o.barService);
  if(counter && nearGroundChunk(counter.x,counter.y,110)){
    // Scuffs from boots at the bar and the rusty rings of a pair of old kegs.
    g.save();g.globalAlpha=.5;
    for(let i=0;i<4;i++)g.drawImage(trailPrint(false,i),counter.x+i*17,counter.y+counter.h+3,31,13);
    g.strokeStyle='#67513a';g.lineWidth=1.6;
    for(let i=0;i<2;i++){g.beginPath();g.ellipse(counter.x+7+19*i,counter.y-8,7.8,6.7,-.17,.3,5.8);g.stroke();}
    g.restore();
  }
  const lamp=siteLights()[1];
  if(lamp && nearGroundChunk(lamp.x,lamp.y,40)){
    g.save();g.translate(lamp.x,lamp.y);
    g.fillStyle='#49483d';g.fillRect(-14,-12,8,8);
    beam(g,-11,-9,-6,-5,4,'#373834');beam(g,-6,-5,0,0,3,'#5c5645');
    beam(g,-11,-10,-1,-1,1,'#94846f');g.fillStyle='#48483d';g.fillRect(-4,-3,9,5);
    g.restore();
  }
  if(depot && nearGroundChunk((depot.x+depot.w/2)*T,(depot.y+depot.h/2)*T,depot.w*T)){
    for(let i=2;i<depot.w-2;i+=2){
      const x=(depot.x+i)*T,y=(depot.y+8.5)*T;
      spill(x,y+19,63,18,492+i);
      if(nearGroundChunk(x,y,70)){g.save();g.globalAlpha=.32;g.drawImage(trailPrint(false,i%4),x-34,y-9,69,17);g.restore();}
    }
  }
  for(const o of objs)if(o.k==='freightWagon' && nearGroundChunk(o.x+o.w/2,o.y+o.h/2,o.w)){
    spill(o.x+o.w*.28,o.y+o.h,65,24,786);spill(o.x+o.w*.79,o.y+o.h-2,56,22,138);
  }
}

// Small local wet depressions use three separate drying rates. Static positions are cached per sector.
const drainage=new Map();
let roadFilm=0,ditchWater=0;
function catchmentBlock(bx,by){
  const key=bx+','+by;if(drainage.has(key))return drainage.get(key);
  const spots=[];
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){
    const tx=bx*8+i,ty=by*8+j,t=tAt(tx,ty);
    if(t!==AS && t!==DI && t!==GR)continue;
    const noise=hash2(tx+48,ty-7),hard=t===AS;
    if(noise>(hard ? .5 : .27))continue;
    const dx=tAt(tx-1,ty)===AS || tAt(tx+1,ty)===AS,dy=tAt(tx,ty-1)===AS || tAt(tx,ty+1)===AS;
    if(!hard && !(dx||dy || t===DI && (tAt(tx-1,ty)===GR || tAt(tx,ty+1)===GR)))continue;
    const x=(tx+.5)*T,y=(ty+.5)*T;
    if(underRainCover(x,y))continue;
    const underVehicle=walkSolids.get(ty*MW+tx)?.some(o=>['bus','car','freightWagon'].includes(o.k) &&
      x>=o.x-8 && x<=o.x+o.w+8 && y>=o.y-8 && y<=o.y+o.h+8);
    if(!underVehicle)spots.push({x,y,hard,a:(!hard&&dx?Math.PI/2:0)+(noise-.2)*1.7,w:hard?24+noise*23:14+noise*60,h:hard?10:6+noise*14});
  }
  if(drainage.size>=100)drainage.delete(drainage.keys().next().value);
  drainage.set(key,spots);return spots;
}
function drawRoadWetness(x,y,w,h){
  if(Math.max(roadFilm,ditchWater)<.04)return;
  ctx.save();
  for(let by=Math.floor(y/(8*T));by<=Math.floor((y+h)/(8*T));by++)
    for(let bx=Math.floor(x/(8*T));bx<=Math.floor((x+w)/(8*T));bx++)
      for(const s of catchmentBlock(bx,by)){
        const wet=s.hard?roadFilm:ditchWater;
        if(wet<.04)continue;
        ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);
        ctx.globalAlpha=wet*(s.hard ? .43 : .72);ctx.drawImage(yardReflection(),-s.w*.5,-s.h*.5,s.w,s.h);
        ctx.restore();
      }
  ctx.restore();
}
let mistSprite;
function mistBank(){
  if(mistSprite)return mistSprite;
  const c=document.createElement('canvas');c.width=144;c.height=62;
  const g=c.getContext('2d'),r=mulberry32(759);
  for(let i=0;i<55;i++){
    const x=21+r()*102,y=22+r()*18,rad=7+r()*13;
    const fade=g.createRadialGradient(x,y,0,x,y,rad);
    fade.addColorStop(0,'rgba(185,188,177,.30)');fade.addColorStop(1,'rgba(185,188,177,0)');
    g.fillStyle=fade;g.fillRect(x-rad,y-rad,rad*2,rad*2);
  }
  return mistSprite=c;
}
// Repeating world positions scroll through the viewport; particles do not follow the camera.
function drawWeatherFront(){
  const fog=WX.fog,leaves=WX.gust,sleet=WX.sleet;
  if(Math.max(fog,leaves,sleet)<.045)return;
  const time=WX.time,scale=Z,left=cam.x-VW/(2*scale),top=cam.y-VH/(2*scale);
  ctx.save();ctx.translate(-left*scale,-top*scale);ctx.scale(scale,scale);
  function drift(cell,vx,vy,margin,draw){
    const ox=time*vx,oy=time*vy;
    for(let j=Math.floor((top-margin-oy)/cell);j<=Math.floor((top+VH/scale+margin-oy)/cell);j++)
      for(let i=Math.floor((left-margin-ox)/cell);i<=Math.floor((left+VW/scale+margin-ox)/cell);i++){
        const seed=hash2(i,j);
        draw((i+seed)*cell+ox,(j+hash2(i+59,j))*cell+oy,seed);
      }
  }
  if(fog>.1){ctx.globalAlpha=fog*.34;drift(240,7,1,165,(x,y,s)=>ctx.drawImage(mistBank(),x-140,y-42,240+s*110,81));}
  if(leaves>.08){ctx.globalAlpha=leaves*.88;drift(96,66,14,22,(x,y,s)=>{
    const phase=time*3+s*12;
    ctx.fillStyle=s>.5?'#95784e':'#665638';ctx.beginPath();ctx.ellipse(x+Math.sin(phase)*5,y+Math.cos(phase)*8,3.5,.6+Math.abs(Math.cos(phase)),.5+phase*.4,0,Math.PI*2);ctx.fill();
  });}
  if(sleet>.06){ctx.globalAlpha=sleet*.85;ctx.strokeStyle='#cbd1cb';ctx.lineWidth=1.3;ctx.beginPath();
    drift(42,39,92,7,(x,y,s)=>{x+=Math.sin(time*1.4+s*18)*3;ctx.moveTo(x,y);ctx.lineTo(x-1.6,y-2-s*3);});ctx.stroke();}
  ctx.restore();
}

function lampShadowOnWall(a,b,texture){
  if(!SHADOWS || darkness()<.14)return;
  const horizontal=a[1]===b[1],axis=horizontal?1:0,across=1-axis;
  for(const lamp of siteLights()){
    const lp=[lamp.x,lamp.y],delta=a[axis]-lp[axis];
    const nearestX=clamp(lamp.x,Math.min(a[0],b[0]),Math.max(a[0],b[0]));
    const nearestY=clamp(lamp.y,Math.min(a[1],b[1]),Math.max(a[1],b[1]));
    if(dst(lamp.x,lamp.y,nearestX,nearestY)>lamp.r)continue;
    for(const e of ents){
      if(!e.alive || e.kind!=='human' || dE(lamp,e)>lamp.r)continue;
      const ep=[e.x,e.y],offset=ep[axis]-lp[axis],ratio=delta/offset;
      if(!Number.isFinite(ratio)||ratio<1 || ratio>2.9)continue;
      const u=(lp[across]+(ep[across]-lp[across])*ratio-a[across])/(b[across]-a[across]);
      if(u<=0 || u>=1)continue;
      const dx=e.x-lamp.x,dy=e.y-lamp.y,d=Math.hypot(dx,dy),end=d*ratio;
      if(!d || end>lamp.r || !lampExposure(lamp,e) || npcBarrier(lamp,dx/d,dy/d,end-.8,null,'light')<end-1)continue;
      const height=(e.crouch?26:48)*ratio,x=u*texture.width;
      ctx.save();ctx.fillStyle='rgba(27,24,22,'+(.56*(1-end/lamp.r))+')';
      ctx.beginPath();ctx.ellipse(x,texture.height-4,8*ratio,height*.78,0,0,Math.PI*2);
      ctx.ellipse(x,texture.height-height,4.6*ratio,5.7*ratio,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
}
