// Floor positions use the same saved world coordinates as the separate bunker interior.
const lofts=[];
const tilePoint=(x,y)=>({x:x*T,y:y*T});
function loftAt(p) {
  if(!p || !BIG || p.x<PW*T) return null;
  return lofts.find(r=>p.x>=r.x*T && p.x<(r.x+r.w)*T && p.y>=r.y*T && p.y<(r.y+r.h)*T) || null;
}
const routeToActor=e=>loftAt(e) && loftAt(e)!==loftAt(P)?loftAt(e).stair:e;
const worldMapPoint=p=>loftAt(p)?.stair || (inBunker(p.x,p.y)?HATCH:p);
function buildLandmarks(){
  if(!BIG) return;
  const axis=NORTH_ROWS+57, road=roadX[axis], gate=bridgeBarrier || objs.find(o=>o.key==='bar');
  const cx=gate?(gate.x+gate.w/2)/T:road+.5;
  Object.assign(NPCDEF.find(n=>n.sid==='a1'),{x:cx-.80,y:axis-2.15});
  Object.assign(NPCDEF.find(n=>n.sid==='a2'),{x:cx+.82,y:axis+2.95});
  // Breaks follow all three physical openings in the rail tiles. Short runs can be culled separately.
  for(const y of [axis-.79,axis+1.78]){
    for(const [start,end] of [[WEST,WEST+71],[WEST+74,road-1],[road+2,WEST+207],[WEST+209,PW]]){
      for(let x=start;x<end;x+=8) CORDON_FENCES.push(['railMesh',x,y,Math.min(end,x+8),y]);
    }
  }
  const depot=HOUSES.find(h=>h.mat==='depot');
  for(let y=depot.y+1;y<depot.y+depot.h-1;y++)
    for(let x=depot.x+1;x<depot.x+depot.w-1;x++)if(tAt(x,y)===FL)setT(x,y,CF);
  for(const x of [267,273,280,288]){
    for(const y of [34,39])addObj({k:'depotPier',x:x*T+7,y:y*T+7,w:13,h:13,solid:1});
  }
  for(const [id,x,y,w,a] of [['c1_trace_reel',266,36,38,.16],['c1_crate_army',270,33.7,30,.18],
      ['c1_barrel',282,34,24,.04],['c1_trace_sleepers',277,35,47,-.15],['c1_trace_pipes',288.8,35.6,52,.2]])
    CORDON_DETAILS.push([id,x,y,w,a]);
  for(const [id,name,y,h,stair] of [
    ['atp','Чердак АТП',65,9,tilePoint(438.5,266.73)],
    ['depot','Галерея депо',99,17,tilePoint(290.26,40.25)]
  ]){
    const r={id,name,x:PW+1,y,w:10,h,stair,landing:id==='atp'?tilePoint(PW+3.5,y+h-1.75):tilePoint(PW+2.72,y+h-5.1)};
    lofts.push(r);
    for(let j=0;j<h;j++) for(let i=0;i<r.w;i++){
      const wall=!i||!j||i===r.w-1||j===h-1;
      const voidBay=id==='depot' && i>=4 && i<=6 && j>=3 && j<=h-4 && j!==8;
      setT(r.x+i,r.y+j,wall||voidBay?CO:id==='depot'?CF:FL);
    }
    if(id==='atp') Object.assign(NPCDEF.find(e=>e.sid==='shust'),{x:r.x+7.2,y:y+2.8});
  }
  buildWorkshopRooms();
}
function drawLoftMap(g,r,size){
  const k=Math.min((size-18)/r.w,(size-18)/r.h),ox=(size-r.w*k)/2,oy=(size-r.h*k)/2;
  g.save();g.translate(ox,oy);
  for(let j=0;j<r.h;j++)for(let i=0;i<r.w;i++){
    g.fillStyle=tAt(r.x+i,r.y+j)===CO?'#35352e':nav[(r.y+j)*MW+r.x+i]?'#787158':'#5a5546';g.fillRect(i*k,j*k,k+.3,k+.3);
  }
  const dot=(p,color)=>{g.fillStyle=color;g.beginPath();g.arc((p.x/T-r.x)*k,(p.y/T-r.y)*k,Math.max(3,k*.34),0,Math.PI*2);g.fill();};
  for(const body of objs)if(body.k==='body' && body.kind!=='sack' && loftAt(body)===r)dot(body,'#a9a7a0');
  dot(r.landing,'#d5b16b');if(r.id==='atp' && byS('shust')?.captive)dot(byS('shust'),'#d0bc79');dot(P,'#70dbdc');g.restore();
}
function beam(g,x,y,x1,y1,w,color){
  g.strokeStyle=color;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(x1,y1);g.stroke();
}
function loftSurface(r){
  const c=document.createElement('canvas');c.width=r.w*T;c.height=r.h*T;
  const g=c.getContext('2d'),w=c.width,h=c.height,rand=mulberry32(r.y);
  artFill(g,r.id==='atp'?'floor_wood':'floor_concrete',0,0,w,h);
  const industrial=r.id==='depot';
  if(industrial){
    for(const [top,bottom] of [[3,8],[9,r.h-3]]){
      const x=4*T,y=top*T,v=(bottom-top)*T;
      g.save();g.beginPath();g.rect(x,y,3*T,v);g.clip();
      artFill(g,'floor_concrete',x,y,3*T,v);
      for(const offset of [15,61]){
        for(let i=0;i<v;i+=12)beam(g,x+offset-5,y+i,x+offset+21,y+i,4,'#514236');
        for(const dx of [0,15])beam(g,x+offset+dx,y,x+offset+dx,y+v,2,'#827969');
      }
      g.fillStyle='rgba(15,16,15,.66)';g.fillRect(x,y,3*T,v);
      g.restore();
      for(const [a,b,d,e] of [[x,y,x+3*T,y],[x,y+v,x+3*T,y+v],[x,y,x,y+v],[x+3*T,y,x+3*T,y+v]]){
        beam(g,a+3,b+4,d+3,e+4,4,'rgba(0,0,0,.37)');beam(g,a,b,d,e,4,'#564335');beam(g,a,b-1,d,e-1,1,'#ac9680');
        const n=Math.ceil(Math.hypot(d-a,e-b)/23);
        for(let i=0;i<=n;i++){g.fillStyle='#433d31';g.fillRect(a+(d-a)*i/n-2,b+(e-b)*i/n-2,4,5);}
      }
    }
    // Raised gallery visible above the service tracks; diagonal truss shadows run into the well.
    for(let j=2;j<r.h-2;j+=4) beam(g,T,j*T,w-T,(j+.8)*T,5,'rgba(23,20,17,.22)');
  }else{
    if(ART?.images.roomFittings){
      g.save();g.translate(w-90,89);g.rotate(1.48);
      g.drawImage(ART.images.roomFittings,...roomFittings.bedroll[0],-15,-29,30,58);g.restore();
      const pool=g.createRadialGradient(w-65,3*T,3,w-65,3*T,85);
      pool.addColorStop(0,'rgba(242,210,147,.18)');pool.addColorStop(1,'rgba(242,210,147,0)');
      g.fillStyle=pool;g.fillRect(w-150,T,150,5*T);
    }
    // Scuffed linoleum and a strip of bare boards mark the former dispatch office.
    const wash=g.createLinearGradient(4.7*T,T,w-T,5.6*T);
    wash.addColorStop(0,'rgba(114,114,84,.16)');wash.addColorStop(1,'rgba(102,90,61,.03)');
    g.fillStyle=wash;g.fillRect(4.75*T,T,w-5.75*T,4.6*T);
  }
  g.save();g.translate(-r.x*T,-r.y*T);
  for(const o of objs){
    if(o.x<r.x*T || o.x>=(r.x+r.w)*T || o.y<r.y*T || o.y>=(r.y+r.h)*T)continue;
    if(o.k==='roomFitting')drawRoomFitting(g,o);
    else if(o.k==='partition')paintPartition(g,o);
  }
  g.restore();
  const mat='wall_brick';
  artFill(g,mat,0,0,w,T);artFill(g,mat,0,h-T,w,T);
  for(const x of [0,w-T])artFill(g,mat,x,T,T,h-2*T);
  for(let j=0;j<90;j++){
    const x=rand()*w,y=rand()*h;
    if(x>T && x<w-T && y>T && y<h-T)continue;
    beam(g,x,y,x+rand()*13,y+rand()*6,1,'rgba(15,15,13,.55)');
  }
  for(let j=2;j<r.h-2;j+=3){
    const y=j*T;g.fillStyle='#242824';g.fillRect(w-19,y,11,29);
    for(let k=0;k<3;k++)g.fillRect(w-24,y+k*11,13,2);
    const light=g.createRadialGradient(w-30,y,1,w-30,y,90);
    light.addColorStop(0,'rgba(217,202,154,.21)');light.addColorStop(1,'rgba(217,202,154,0)');g.fillStyle=light;g.fillRect(w-125,y-90,125,180);
  }
  g.save();g.beginPath();g.rect(T,T,w-2*T,h-2*T);g.clip();
  for(const [x,y,angle,len] of [[T,T,0,w-2*T],[w-T,T,Math.PI/2,h-2*T],
      [w-T,h-T,Math.PI,w-2*T],[T,h-T,-Math.PI/2,h-2*T]]){
    g.save();g.translate(x,y);g.rotate(angle);
    const shadow=g.createLinearGradient(0,0,0,10);
    shadow.addColorStop(0,'rgba(31,26,21,.48)');shadow.addColorStop(1,'rgba(31,26,21,0)');
    g.fillStyle=shadow;g.fillRect(0,0,len,10);g.restore();
  }
  g.restore();
  for(const x of [T,w-T])beam(g,x,0,x,h,5,'rgba(28,24,19,.62)');
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(20,19,15,.44)');shade.addColorStop(1,'rgba(24,21,15,.14)');
  g.fillStyle=shade;g.fillRect(0,0,w,h);return c;
}
function drawLoft(r){if(!r.surface)r.surface=loftSurface(r);ctx.drawImage(r.surface,r.x*T,r.y*T);}
function weatherFacade(g,len,wood,rand){
  for(let i=0;i<Math.ceil(len/24);i++){
    const x=rand()*len,y=rand()*72,w=8+rand()*32,h=6+rand()*17;
    const stain=g.createRadialGradient(x,y,1,x,y,w);
    stain.addColorStop(0,'rgba(44,38,28,.38)');stain.addColorStop(1,'rgba(44,38,28,0)');
    g.fillStyle=stain;g.fillRect(x-w,y-w,2*w,2*w);
    g.save();g.beginPath();g.moveTo(x,y+h);
    for(let j=0;j<=8;j++)g.lineTo(x+w*j/8,y+rand()*h*.45);
    for(let j=8;j>=0;j--)g.lineTo(x+w*j/8,y+h-rand()*h*.33);
    g.clip();artFill(g,wood?'floor_wood':'wall_brick',x,y,w,h);
    g.fillStyle=wood?'rgba(45,39,30,.46)':'rgba(89,67,50,.35)';g.fillRect(x,y,w,h);g.restore();
    beam(g,x,y,x+3,y+5,1,'#443d32');beam(g,x+3,y+5,x+1,y+11,1,'#443d32');
  }
}
function drawTavernTable(g,o){
  const x=o.x,y=o.y,w=o.w,h=o.h;
  if(o.barRole==='shelf'){
    artFill(g,'floor_wood',x,y,w,h);beam(g,x,y+h,x+w,y+h,2,'#473a2b');
    for(let i=4;i<w-3;i+=6){
      const color=i%4?'#6e7350':'#876948';g.fillStyle=color;g.fillRect(x+i,y+3,3,6);
      g.fillStyle='#b2a188';g.fillRect(x+i+1,y+1,1,3);
    }
    return;
  }
  if(livingZone && o.barRole==='counter'){
    for(const u of [.24,.52,.78]){
      const at=x+w*u;
      beam(g,at-9,y+h-1,at+8,y+h-1,2.5,'#b49b76');
      g.strokeStyle='rgba(64,46,30,.52)';g.lineWidth=.9;g.beginPath();
      g.ellipse(at,y+h*.61,3.7,2.6,-.17,.45,5.84);g.stroke();
    }
  }
  if(o.barRole==='counter'){
    const lamp=g.createRadialGradient(x+w-16,y+5,0,x+w-16,y+5,43);
    lamp.addColorStop(0,'rgba(249,194,96,.43)');lamp.addColorStop(1,'rgba(249,194,96,0)');
    g.fillStyle=lamp;g.fillRect(x+w-60,y-40,88,88);g.fillStyle='#574030';g.fillRect(x,y+h-5,w,5);beam(g,x,y+h-6,x+w,y+h-6,2,'#b19468');}
  if(o.barRole==='bench'){
    for(const [dx,dy,a] of [[7,6,7],[26,10,-6],[20,4,5]]){beam(g,x+dx,y+dy,x+dx+a,y+dy+4,2,'#aba79a');}
    g.fillStyle='#484940';g.fillRect(x+w-9,y+2,7,8);
  }else for(const dx of (o.barRole==='counter'?[w-11,w-19,w-23]:[8,w-9])){
    g.fillStyle='#393c29';g.fillRect(x+dx,y+3,3.5,8);g.fillStyle='#858765';g.fillRect(x+dx+.5,y+3,1,5);
    g.fillStyle='#b8a68a';g.fillRect(x+dx-3,y+11,3,3);
  }
}
function drawDrinkingCup(e){
  const phase=(performance.now()*.00017+(e.sid==='lz_guest'?0:.43))%1;
  const reach=10-5*Math.max(0,Math.sin(phase*2*Math.PI));
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);ctx.fillStyle='#b09a79';ctx.fillRect(reach,4,3,3);
  ctx.fillStyle='#c3b498';ctx.fillRect(reach+2,3.5,3,3.5);ctx.restore();
}
const poppyTufts=[];
function poppyTuft(i){
  if(poppyTufts[i])return poppyTufts[i];
  const c=document.createElement('canvas');c.width=40;c.height=32;
  const g=c.getContext('2d'),rand=mulberry32(557+i*71);
  for(let n=0;n<7;n++){
    const x=4+rand()*32,y=3+rand()*20;
    beam(g,x+4,y+8,x,y,1,'#4e5334');beam(g,x+2,y+4,x-1,y+4,1,'#707041');
    g.fillStyle='rgba(45,30,18,.37)';g.fillRect(x+2,y+3,4,2);
    for(let j=0;j<4;j++){
      const a=j*1.57+.3;g.fillStyle=['#9f3226','#bf4130','#b53225','#873027'][j];
      g.beginPath();g.ellipse(x+Math.cos(a)*1.5,y+Math.sin(a),1.8,.95,a,0,2*Math.PI);g.fill();
    }
    g.fillStyle='#372b25';g.fillRect(x-.7,y-.5,1.4,1.2);
  }
  return poppyTufts[i]=c;
}
function eachPoppy(x,y,visit){
  const d=1-poppyBed(x+.5,y+.5);if(d<=0 || tAt(x,LESSER_TOP+y)!==GR)return;
  const rand=mulberry32(x*7321+y*343),n=Math.ceil(Math.sqrt(d)*2.3);
  for(let i=0;i<n;i++){
    const px=(x+rand())*T,py=(LESSER_TOP+y+rand())*T,which=Math.floor(rand()*8);
    visit(px,py,which,i);
  }
}
function paintPoppyHeads(g,x,y,actor){
  eachPoppy(x,y,(px,py,which,i)=>{
    if(livingZone && ART && C1 && i===0)return;
    if(actor && (py<actor.y || py>actor.y+21 || Math.abs(px-actor.x)>25))return;
    g.drawImage(poppyTuft(which),px-20,py-20);
  });
}
function drawNearPoppies(g,p){
  const x=Math.floor(p.x/T),y=Math.floor(p.y/T)-LESSER_TOP;
  if(x<18||x>71||y< -22||y>35)return;
  for(let j=y-1;j<=y+1;j++)for(let i=x-1;i<=x+1;i++)paintPoppyHeads(g,i,j,p);
}
// Cut back the banks at each tunnel mouth. Gravel and runnels share the ground chunk cache.
function paintRailSlopes(g){
  const y=(NORTH_ROWS+57.5)*T;
  if(GWP.x1<=WEST*T||GWP.y0>y+125||GWP.y1<y-125)return;
  const left=Math.max(GWP.x0,WEST*T),right=Math.min(GWP.x1,PW*T);
  const portals=[WEST+72.5,roadX[NORTH_ROWS+57]+.5,WEST+208];
  for(let x=Math.floor(left/6)*6;x<right;x+=6){
    const end=Math.min(...portals.map(c=>Math.abs(x/T-c)))*T;
    const taper=clamp((end-47)/62,0,1);
    if(!taper)continue;
    for(const side of [-1,1]){
      const foot=(86+13*Math.sin(x*.008)+8*Math.cos(x*.016+side))*taper;
      const crown=y+side*34,base=crown+side*foot;
      const slope=g.createLinearGradient(0,crown,0,base);
      slope.addColorStop(0,'rgba(62,53,40,.61)');slope.addColorStop(.19,'rgba(142,126,92,.54)');
      slope.addColorStop(.57,side>0?'rgba(64,54,42,.41)':'rgba(126,110,81,.34)');
      slope.addColorStop(1,'rgba(91,78,56,0)');g.fillStyle=slope;
      g.fillRect(x,Math.min(crown,base),6,foot);
      const rand=mulberry32(651+Math.abs(x*3+side));
      for(let i=0;i<8;i++){const px=x+rand()*6,py=crown+side*rand()*foot;
        beam(g,px,py,px+rand()*1.8,py+side*(1+rand()*3),.8,'rgba(56,49,36,.26)');}
    }
  }
}
function drawCheckpointSpan(inView){
  const y=(NORTH_ROWS+57.5)*T,cx=(roadX[NORTH_ROWS+57]+.5)*T;
  if(!inView(cx,y,7*T))return;
  for(const side of [-1,1]){
    const x=cx+side*1.53*T;ctx.save();ctx.translate(x,y);ctx.scale(-side,1);
    const dx=(x-cam.x)*.035*-side,dy=(y-cam.y)*.035;
    ctx.fillStyle='rgba(32,27,19,.31)';ctx.fillRect(-13+4,-27+6,19,64);
    // Flared masonry wing walls retain the soil on either side of the road cut.
    for(const end of [-1,1]){
      ctx.save();ctx.beginPath();ctx.moveTo(-25,end*25);ctx.lineTo(2,end*24);
      ctx.lineTo(-13,end*61);ctx.lineTo(-24,end*75);ctx.lineTo(-34,end*61);ctx.closePath();ctx.clip();
      artFill(ctx,'wall_concrete',-36,-76,42,152);
      for(let j=28;j<76;j+=9)beam(ctx,-37,j*end,1,(j+2)*end,1.4,'#534b40');
      ctx.restore();beam(ctx,1,end*25,-15,end*62,2,'#9a8c76');
    }
    artFill(ctx,'wall_concrete',-20,-33,23,66);
    for(const j of [-22,-3,17])beam(ctx,-16,j,2,j+2,1,'#574f41');
    ctx.translate(dx,dy);
    artFill(ctx,'floor_wood',-24,-25,23,50);
    for(let j=-22;j<=22;j+=11){
      beam(ctx,-34,j,side===1?11:16,j+1,3.7,'#514536');
      beam(ctx,-33,j-1,9,j,1,'#9b8564');
    }
    for(const off of [-16,16]){
      beam(ctx,-38,off,14,off+1,3,'#50483d');beam(ctx,-38,off-1,13,off,1,'#aca38d');
    }
    for(const off of [-27,27]){
      const droop=side>0?4:1;
      beam(ctx,-44,off,17,off+droop,4,'#514234');beam(ctx,-42,off-1,16,off+droop-1,1,'#a68b68');
      beam(ctx,-41,off,-37+dx,off-23+dy,3,'#584638');beam(ctx,-37+dx,off-23+dy,-8,off,2.5,'#78614a');
      beam(ctx,-37+dx,off-23+dy,-6+dx,off-23+dy,2,'#685440');
      beam(ctx,-6+dx,off-23+dy,12,off+2,2,'#775d43');
    }
    ctx.restore();
  }
}
function drawHighWire(o){
  const y=o.y+o.h*.5,x=o.x;
  const dx=(x-cam.x)*.032,dy=(y-cam.y)*.032-4;
  const w=o.w;ctx.save();
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w+dx,y+dy);ctx.lineTo(x+dx,y+dy);ctx.closePath();ctx.clip();
  ctx.strokeStyle='rgba(125,118,97,.83)';ctx.lineWidth=.85;ctx.beginPath();
  for(let s=-12;s<w+12;s+=6){
    ctx.moveTo(x+s,y);ctx.lineTo(x+s+dx+6,y+dy);ctx.moveTo(x+s,y);ctx.lineTo(x+s+dx-6,y+dy);
  }
  ctx.stroke();ctx.restore();
  const bays=Math.ceil(w/42);
  for(let i=0;i<=bays;i++){
    const xx=x+i*w/bays;beam(ctx,xx,y,xx+dx,y+dy,2.6,'#544b3f');
  }
  beam(ctx,x+dx,y+dy,x+w+dx,y+dy,1.2,'#8c8069');
}
function weatherRoof(g,h,w,depth){
  const rand=mulberry32(7201*h.x+h.y),n=Math.floor(rand()*3);
  g.save();g.shadowColor='transparent';
  for(let i=0;i<n;i++){
    const x=(.14+rand()*.68)*w,y=(.18+rand()*.57)*depth,ww=7+rand()*12,hh=6+rand()*8;
    g.save();g.translate(x,y);g.rotate((rand()-.5)*.22);
    g.beginPath();g.moveTo(0,0);g.lineTo(ww*.6,2);g.lineTo(ww,-1);g.lineTo(ww-1,hh-2);
    g.lineTo(ww*.65,hh);g.lineTo(ww*.4,hh-2);g.lineTo(1,hh);g.clip();
    g.fillStyle='#282820';g.fillRect(-1,-2,ww+3,hh+4);beam(g,2,hh+1,7,-1,2.5,'#6e5941');
    beam(g,0,hh*.7,ww,hh*.7-1,1.4,'#5f5143');g.restore();
  }
  g.restore();
}

function drawRestingCaptive(e){
  const pose=g7PoseFrame('loner','fall_mid');
  if(!pose){drawLitHuman(e);return;}
  const breath=Math.sin(performance.now()*.0022);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(-1.29+(humanMotionOn?.055*woundedAttention(e):0));ctx.scale(1+.009*breath,1);
  groundShadow(ctx,0,0,12,21,0,1);
  drawFrameAt(0,0,Math.PI/2,pose,1,1,ctx,jacketFor(e)?.images);
  ctx.restore();
}
