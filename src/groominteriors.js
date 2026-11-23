// Top-down cutouts of worn furniture, shared by homes, offices and workshops. Sizes are world pixels.
const roomFittings={
  bench:[[3,16,110,63],53,29], rack:[[119,4,110,88],42,28],
  cabinet:[[247,3,85,90],29,26], desk:[[357,3,98,90],38,34],
  stove:[[33,99,50,90],25,33], bedroll:[[148,99,51,90],25,46],
  supper:[[239,113,101,61],43,26], pallet:[[361,107,89,74],36,29],
  cupboard:[[37,195,41,90],17,36], files:[[141,225,66,29],34,15],
  stool:[[275,225,30,29],13,13], sack:[[377,225,57,29],21,13]
};
function drawRoomFitting(g,o){
  const [rect,w,h]=roomFittings[o.fitting];
  g.save();g.translate(o.x+o.w/2,o.y+o.h/2);
  g.rotate(o.angle);
  if(livingZone && (o.fitting==='bench' || o.fitting==='stool')){
    const rand=mulberry32(Math.floor(o.x+o.y*17));
    if(o.fitting==='bench'){
      const oil=g.createRadialGradient(8,11,1,8,11,21);
      oil.addColorStop(0,'rgba(32,30,23,.62)');oil.addColorStop(1,'rgba(46,40,31,0)');
      g.fillStyle=oil;g.fillRect(-14,-11,45,44);
    }
    for(let i=0;i<13;i++){
      const x=(rand()-.5)*w,y=h*.45+rand()*10;
      beam(g,x,y,x+rand()*7-2,y+rand()*7,1,i%3?'rgba(68,55,40,.57)':'rgba(178,149,112,.45)');
    }
  }
  spriteShadow(g,2.5,1.7);
  if(ART?.images.roomFittings){
    g.drawImage(ART.images.roomFittings,...rect,-w/2,-h/2,w,h);
  }else{
    g.fillStyle='#564d3e';g.fillRect(-w/2,-h/2,w,h);g.strokeStyle='#928269';g.strokeRect(-w/2,-h/2,w,h);
  }
  g.restore();
}
function interiorObject(kind,x,y,w,h,extra){
  return addObj({k:kind,x:x-w/2,y:y-h/2,w,h,solid:1,...extra});
}
function furnitureBounds(name,angle){
  const [,w,h]=roomFittings[name];
  return Math.abs(Math.sin(angle))>.5?[h,w]:[w,h];
}
function putFurniture(name,x,y,angle,home){
  const [w,h]=furnitureBounds(name,angle);
  return interiorObject('roomFitting',x,y,w,h,{fitting:name,angle,home});
}
function supplyBox(x,y,key,loot){
  return interiorObject('crate',x,y,24,22,{stash:'room_'+key,loot,home:key});
}
function partition(x,y,w,h,material){
  return addObj({k:'partition',x:x*T,y:y*T,w:w*T,h:h*T,material,opaque:material!=='mesh',solid:1});
}
function paintPartition(g,o){
  const length=Math.max(o.w,o.h),vertical=o.h>o.w;
  g.save();g.translate(o.x+o.w/2,o.y+o.h/2);if(vertical)g.rotate(Math.PI/2);
  g.translate(-length/2,0);const d=Math.min(o.w,o.h);
  g.fillStyle='rgba(25,21,15,.30)';g.fillRect(4,2,length,9);
  if(o.material==='mesh'){
    g.strokeStyle='#827764';g.lineWidth=1;g.beginPath();
    for(let x=0;x<length-5;x+=5){g.moveTo(x,-4);g.lineTo(x+5,3);g.moveTo(x,3);g.lineTo(x+5,-4);}g.stroke();
  }else if(ART)artFill(g,o.material==='timber'?'floor_wood':'wall_brick',0,-d/2,length,d);
  else{g.fillStyle='#675949';g.fillRect(0,-d/2,length,d);}
  beam(g,0,-d/2,length,-d/2,1.7,'#9b8b72');beam(g,0,d/2,length,d/2,2.4,'#493c30');
  for(let i=0,n=Math.ceil(length/35);i<=n;i++){
    const x=i/n*(length-4);g.fillStyle='#554637';g.fillRect(x,-d/2-1,4,d+2);
  }
  g.restore();
}
// Local u runs into the flight, v runs across it. Interaction points are outside its solid footprint.
function stairAngle(room,upper){return upper?(room.id==='atp'?0:Math.PI/2):(room.id==='atp'?Math.PI:-Math.PI/2);}
function stairRun(room,upper){
  const p=upper?room.landing:room.stair,angle=stairAngle(room,upper);
  const length=upper?76:122,across=upper?33:37;
  const mid=18+length/2, alongX=Math.abs(Math.cos(angle))>.5;
  interiorObject('stairRun',p.x+Math.cos(angle)*mid,p.y+Math.sin(angle)*mid,
    alongX?length:across,alongX?across:length,{roomId:room.id,upper});
}
function drawBuiltStair(g,room,upper){
  const p=upper?room.landing:room.stair,a=stairAngle(room,upper);
  const iron=room.id==='depot',len=upper?76:101,half=upper?16.5:18.5;
  g.save();g.translate(p.x,p.y);g.rotate(a);g.translate(18,0);
  const height=upper?0:15;
  if(!upper){
    // The enclosed stringer is fixed to the wall. The landing rests on legs above the floor.
    const outer=-half, inner=outer+height,start=len-21,end=len+21;
    g.fillStyle='rgba(25,21,17,.29)';g.beginPath();g.moveTo(3,outer);
    g.lineTo(end,outer-8);g.lineTo(end+9,half+9);g.lineTo(4,half);g.fill();
    g.save();g.beginPath();g.moveTo(0,outer);g.lineTo(len,inner);g.lineTo(end,inner);
    g.lineTo(end,outer-1);g.lineTo(len,outer-1);g.closePath();g.clip();
    if(ART)artFill(g,iron?'wall_concrete':'floor_wood',0,outer-2,end,height+4);
    g.fillStyle='rgba(47,41,32,.41)';g.fillRect(0,outer-2,end,height+4);g.restore();
    for(const t of [.32,.65,1]){
      const u=len*t;beam(g,u,outer,u,outer+height*t,3,'#574c3d');
      beam(g,u,outer+height*t,u+2,outer+height*t,1,'#ad9674');
    }
    // Move the upper treads toward the wall and shorten their visible going as the flight rises.
    g.transform(1,height/len,0,1,0,0);
    if(ART)artFill(g,iron?'wall_concrete':'floor_wood',start,-half,end-start,2*half+4);
    for(let j=start;j<end;j+=7)beam(g,j,-half,j,half,.9,'#625845');
    beam(g,start,outer,end,outer,3.5,'#5b4d3d');beam(g,start,outer+1,end,outer+1,1,'#aa987a');
    // Recess in the upper wall where the player goes out of sight.
    g.fillStyle='#322f27';g.fillRect(end-15,half-7,15,8);
    beam(g,end-15,half-7,end,half-7,2,'#928773');
  }
  const edge=iron?'#77634d':'#78654e',light=iron?'#a49379':'#b39a73',shadow='#332e26';
  const fill=(x,y,w,h,mat)=>{if(ART)artFill(g,mat,x,y,w,h);else{g.fillStyle=edge;g.fillRect(x,y,w,h);}};
  // Exposed flank below the raised landing, or the deep reveal cut through the floor above.
  if(upper){
    g.fillStyle='#24231d';g.fillRect(-3,-half-4,len+6,half*2+8);
    g.fillStyle='#10130f';g.fillRect(0,-half,len,half*2);
    fill(-14,-half,14,half*2,iron?'floor_concrete':'floor_wood');
  }else{
    g.fillStyle='rgba(23,19,15,.33)';g.beginPath();g.moveTo(0,half);g.lineTo(len,half);
    g.lineTo(len+8,half+12);g.lineTo(15,half+3);g.fill();
    fill(len-24,-half-2,25,2*half+4,iron?'wall_concrete':'floor_wood');
    beam(g,len-24,half+1,len-3,half+9,3,shadow);
    beam(g,len-3,half+9,len-3,half,3,edge);
  }
  const treadEnd=upper?len:len-22,steps=8;
  for(let i=0;i<steps;i++){
    const t=i/steps,u=t*treadEnd,depth=treadEnd/steps;
    fill(u,-half,depth+.3,2*half,iron?'wall_concrete':'floor_wood');
    g.fillStyle=upper?'rgba(20,19,15,'+(.14+.76*t)+')':'rgba(39,33,26,'+(.34-.21*t)+')';
    g.fillRect(u,-half,depth+.3,2*half);
    if(iron){
      g.fillStyle='rgba(36,36,31,.47)';
      for(let v=-half+3;v<half-1;v+=4)g.fillRect(u+3,v,3,1.3);
    }
    const nosing=g.createLinearGradient(u,0,u+depth,0);
    nosing.addColorStop(0,upper?'rgba(174,162,129,.34)':'rgba(35,30,23,.70)');
    nosing.addColorStop(.24,'rgba(73,65,50,.16)');nosing.addColorStop(.42,'rgba(190,174,138,.20)');
    nosing.addColorStop(1,upper?'rgba(22,19,16,.58)':'rgba(87,77,60,.23)');
    g.fillStyle=nosing;g.fillRect(u,-half,depth,2*half);
    beam(g,u,-half,u,half,1.4,shadow);beam(g,u+1.4,-half+1,u+1.4,half-1,1,light);
    if(!iron){beam(g,u+3,-half+3,u+3,half-4,.6,'rgba(164,143,107,.52)');
      g.fillStyle='#4e4435';for(const v of [-half+4,half-5])g.fillRect(u+4,v,1.1,1.2);}

  }
  if(!upper){
    fill(treadEnd,-half,len-treadEnd,2*half,iron?'floor_concrete':'floor_wood');
    for(let u=treadEnd;u<len;u+=6)beam(g,u,-half,u,half,.85,'#655846');
  }
  // Project the rails above their feet; their posts and the shadow open up as the player approaches.
  const cx=(p.x-cam.x)*.019,cy=(p.y-cam.y)*.019;
  const du=clamp(cx*Math.cos(a)+cy*Math.sin(a),-6,6);
  const dv=clamp(-cx*Math.sin(a)+cy*Math.cos(a),-5,5)+(upper?-7:7);
  for(const v of [-half,half]){
    const above=t=>upper?1:.52+1.35*t;
    beam(g,0,v,len,v,3,edge);
    for(const t of [0,.34,.67,1]){
      const k=above(t);beam(g,len*t,v,len*t+du*k,v+dv*k,2.4,shadow);
      g.fillStyle=light;g.fillRect(len*t+du*k-1,v+dv*k-1,2,2);
    }
    beam(g,du*above(0),v+dv*above(0),len+du*above(1),v+dv*above(1),2.4,edge);
    beam(g,du*above(0),v+dv*above(0)-1,len+du*above(1),v+dv*above(1)-1,.9,light);
  }
  if(upper){
    beam(g,len,-half-3,len,half+3,5,'#423d32');beam(g,len+2,-half-3,len+2,half+3,1.5,'#a39172');
    const dark=g.createLinearGradient(0,0,len,0);dark.addColorStop(0,'transparent');dark.addColorStop(1,'rgba(14,15,12,.77)');g.fillStyle=dark;g.fillRect(0,-half+2,len,half*2-4);}
  g.restore();
}
function buildWorkshopRooms(){
  Object.assign(NPCDEF.find(n=>n.sid==='b5'),{x:437.15,y:268.1});
  for(const r of lofts){stairRun(r,false);stairRun(r,true);}
  const atp=lofts.find(r=>r.id==='atp'),dep=lofts.find(r=>r.id==='depot');
  const x=atp.x,y=atp.y;
  // Upstairs: receiving bay on the west, sick berth on the east. The doorway faces a short corridor.
  partition(x+4.55,y+1,.20,1.92,'timber');partition(x+4.55,y+4.98,.20,.80,'timber');
  partition(x+4.55,y+5.62,2.05,.18,'timber');partition(x+8.1,y+5.62,.9,.18,'timber');
  for(const [type,i,j,a] of [
    ['rack',2.15,1.50,0],['bench',1.55,3.65,Math.PI/2],['cabinet',3.52,1.5,0],
    ['stool',2.5,3.5,0],['sack',8.45,3.65,0],['desk',6.35,1.63,0],
    ['cupboard',8.6,4.72,0],['files',8.25,1.45,0]
  ])putFurniture(type,(x+i)*T,(y+j)*T,a,'loft_atp');
  supplyBox((x+1.5)*T,(y+5.5)*T,'atp_up',{bandage:1});
  for(const [type,i,j,a] of [['rack',2.2,1.55,0],['bench',7.8,1.65,0],['cabinet',8.48,6,0],
    ['pallet',2,7.45,Math.PI/2],['files',8.4,11.3,Math.PI/2]])
    putFurniture(type,(dep.x+i)*T,(dep.y+j)*T,a,'loft_depot');
  supplyBox((dep.x+8.15)*T,(dep.y+14.9)*T,'depot_up',{a9:8});
  // A cage for spares in the garage and a dispatcher's booth in the neighbouring ATP building.
  partition(432.45,266,.16,1.55,'mesh');partition(430,268.60,1.05,.16,'mesh');
  partition(432.65,279,.18,.94,'brick');partition(432.65,281.5,.18,1.5,'brick');
}
const furnitureSets={
  home:['supper','stove','bedroll','cupboard','stool','sack'],
  store:['rack','pallet','box','sack','cabinet','pallet'],
  office:['desk','files','cabinet','stool','cupboard','box'],
  shop:['bench','rack','box','cabinet','pallet','stool'],
  ruin:['pallet','sack','box','stool','cabinet'],
  bar:['supper','stool','sack']
};
function houseUse(h){
  if(h.x===WEST+114 && h.y===NORTH_ROWS+203)return 'office';
  if(h.x===WEST+132 && h.y===NORTH_ROWS+201)return 'home';
  if(h.ruin)return 'ruin';
  const region=locAt(h.x+h.w/2,h.y+h.h/2)?.id;
  if(h.ok==='78,118')return 'bar';
  if(h.ok==='89,75')return 'office';
  if(['postal','survey','dump_watch','dump_checkpoint','bunker_lz','sphere'].includes(region))return 'office';
  if(['mill','cowsheds','farm','elevator_lz','dump_market','dump_stop'].includes(region))return 'store';
  if(['atp','pump','relay','fuel_lz','boiler_lz','dump_depot','dump_yard','dump_sorting'].includes(region) || h.mat==='conc')return 'shop';
  return 'home';
}
// Protect the current walkable component around each proposed footprint. This includes doors through
// broken walls. Restrict the flood fill to the room so a second exit outside cannot mask a blocked aisle.
function roomPassageSurvives(h,blocked){
  const reserved=new Set(blocked),adjacent=new Set(),inside=n=>{
    const x=n%MW,y=Math.floor(n/MW);
    return x>=h.x && x<h.x+h.w && y>=h.y && y<h.y+h.h;
  };
  for(const n of blocked)for(const d of [-1,1,MW,-MW]){
    const k=n+d;if(inside(k) && nav[k] && !reserved.has(k))adjacent.add(k);
  }
  if(!adjacent.size)return false;
  const queue=[adjacent.values().next().value],seen=new Set(queue);
  for(let i=0;i<queue.length;i++)for(const d of [-1,1,MW,-MW]){
    const k=queue[i]+d;
    if(inside(k) && nav[k] && !reserved.has(k) && !seen.has(k)){seen.add(k);queue.push(k);}
  }
  return [...adjacent].every(n=>seen.has(n));
}
function furnishHouses(){
  if(!BIG)return;
  for(const h of HOUSES){
    const use=houseUse(h),items=furnitureSets[use],rand=mulberry32(h.x*1361+h.y*313);
    const spots=[];
    for(let j=1;j<h.h-1;j++)for(let i=1;i<h.w-1;i++){
      const x=h.x+i,y=h.y+j;
      if(!isFloor(tAt(x,y)) || !nav[y*MW+x])continue;
      const directions=[[0,-1,0],[1,0,Math.PI/2],[0,1,Math.PI],[-1,0,-Math.PI/2]]
        .filter(([dx,dy])=>[CO,BR].includes(tAt(x+dx,y+dy)));
      if(!directions.length)continue;
      const [dx,dy,a]=directions[Math.floor(rand()*directions.length)];
      spots.push({x:(x+.5)*T+dx*2,y:(y+.5)*T+dy*2,a,rank:rand()});
    }
    spots.sort((a,b)=>a.rank-b.rank);
    const area=(h.w-2)*(h.h-2),limit=Math.min(12,Math.max(1,Math.ceil(area/(h.ruin?10:7))));
    const cx=(h.x+h.w/2)*T,cy=(h.y+h.h/2)*T;
    const local=objs.filter(o=>Math.abs(o.x-cx)<(h.w/2+1)*T && Math.abs(o.y-cy)<(h.h/2+1)*T);
    const initial=local.filter(o=>['bed','table'].includes(o.k)).length;
    let count=0,attempt=0;
    const offset=Math.floor(rand()*items.length);
    for(const p of spots){
      if(count>=Math.max(1,limit-Math.floor(initial*.5)))break;
      const type=items[(offset+attempt++)%items.length];
      const [w,d]=type==='box'?[24,22]:furnitureBounds(type,p.a);
      const left=p.x-w/2,top=p.y-d/2,right=left+w,bottom=top+d;
      const near=(x,y,r)=>Math.hypot(x-clamp(x,left,right),y-clamp(y,top,bottom))<r;
      if(h.entrances.some(e=>near(h.x*T+e.x-e.nx*32,h.y*T+e.y-e.ny*32,24+e.width*.30)))continue;
      if(NPCDEF.some(e=>near(e.x*T,e.y*T,24)) || lofts.some(r=>near(r.stair.x,r.stair.y,52)))continue;
      if(local.some(o=>left<o.x+(o.w||0)+10 && right>o.x-10 && top<o.y+(o.h||0)+10 && bottom>o.y-10))continue;
      const taken=[];
      for(let y=Math.floor(top/T);y<=Math.floor((bottom-.1)/T);y++)for(let x=Math.floor(left/T);x<=Math.floor((right-.1)/T);x++)
        taken.push(y*MW+x);
      if(taken.some(n=>!nav[n] || propCells.has(n)) || !roomPassageSurvives(h,taken))continue;
      const o=type==='box'?supplyBox(p.x,p.y,h.ok+'_'+count,{[use==='shop'?'a9':'bandage']:use==='shop'?6:1}):putFurniture(type,p.x,p.y,p.a,h.ok);
      local.push(o);for(const n of taken)nav[n]=0;count++;
    }
    // Ground-level marks can also fit in single-cell huts and ruins with no free furniture footprint.
    const trim=[];
    for(let i=1;i<h.w-1;i++)for(const j of [0,h.h-1]){
      if(![BR,CO].includes(tAt(h.x+i,h.y+j)))continue;
      trim.push({x:(h.x+i+.5)*T,y:(h.y+j+(j===0?.87:.13))*T,a:j===0?0:Math.PI});
    }
    for(let j=1;j<h.h-1;j++)for(const i of [0,h.w-1]){
      if(![BR,CO].includes(tAt(h.x+i,h.y+j)))continue;
      trim.push({x:(h.x+i+(i===0?.87:.13))*T,y:(h.y+j+.5)*T,a:i===0?-Math.PI/2:Math.PI/2});
    }
    const mountIndex=Math.floor(rand()*trim.length);
    const mounts=[];
    if(trim.length)mounts.push(trim[mountIndex]);
    if(trim.length>12)mounts.push(trim[(mountIndex+Math.floor(trim.length/2))%trim.length]);
    h.interior={use,count,mounts,mark:spots[0] || {x:cx,y:cy,a:0}};
  }
}
function drawRoomMarks(g,h){
  const layout=h.interior;if(!layout)return;
  for(const mount of layout.mounts){
    g.save();g.translate(mount.x,mount.y);g.rotate(mount.a);
    // Scuffs and worn skirting sit flush against the inside face of the wall.
    beam(g,-12,1,10,1,2,'rgba(38,31,24,.31)');
    beam(g,-9,2,4,2,1,'rgba(146,130,102,.29)');
    g.restore();
  }
  const {x,y,a}=layout.mark;
  g.save();g.translate(x,y);g.rotate(a);
  const rand=mulberry32(h.x*181+h.y);
  const stain=g.createRadialGradient(0,0,3,0,0,25);
  stain.addColorStop(0,'rgba(41,32,20,.28)');stain.addColorStop(1,'rgba(40,31,20,0)');
  g.fillStyle=stain;g.fillRect(-25,-25,50,50);
  for(let i=0;i<7;i++){
    const u=rand()*26-13,v=rand()*13;
    if(layout.use==='office' || layout.use==='home'){
      g.fillStyle=i%2?'#837b65':'#a49678';g.fillRect(u,v,3+rand()*3,2+rand()*2);
    }else{beam(g,u,v,u+rand()*9,v+rand()*4,1.6,i%2?'#655641':'#89785c');}
  }
  g.restore();
}
