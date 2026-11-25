// The winter district plugs into the Cordon movement, combat, roof, HUD and inventory systems.
// Upper storeys occupy enclosed map cells. A save position therefore identifies its floor.
const district = {
  width:58, height:52, levels:[], images:{}, ground:null, plans:[], stairs:[], heaters:[], trees:[],
  fire:tilePoint(31,32.6), start:tilePoint(29,32.4)
};
function winterCanvas(w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function winterFloor(x,y){
  return district.levels.find(r=>x>=r.x*T && x<(r.x+r.w)*T && y>=r.y*T && y<(r.y+r.h)*T);
}
function makeDistrict(){
  map.fill(VO);
  for(let y=1;y<district.height-1;y++)for(let x=1;x<district.width-1;x++)setT(x,y,GR);
  const rand=mulberry32(1724);
  for(let y=0;y<district.height;y++)for(let x=0;x<district.width;x++){
    const edge=Math.min(x,y,district.width-1-x,district.height-1-y);
    if(edge===0 || (edge<5 && rand()<.36) || (x>46 && rand()<.12) || (x<11 && rand()<.12))setT(x,y,TR);
  }
  for(const [x,y] of [[13,31],[14,36],[40,33],[38,40],[36,10],[42,17]])setT(x,y,TR);
  house(17,19,22,11,[[11,10],[12,10]],CO,0,'conc');
  house(14,5,22,10,[],CO,0,'conc');
  HOUSES.forEach(h=>{h.storeys=5;buildEntrances(h);});
  for(let n=1;n<=5;n++){
    const x=n===1?17:n%2===0?70:110, y=n===1?19:n<=3?12:49;
    const r={x,y,w:22,h:11,n};
    district.levels.push(r);
    if(n>1)house(x,y,r.w,r.h,[],CO,0,'none');
    const fit=(key,u,v,angle=0)=>putFurniture(key,(x+u)*T,(y+v)*T,angle,'berezki-'+n);
    const wall=(a,b,w,h)=>partition(x+a,y+b,w,h,'timber');
    const stove=(u,v)=>{fit('stove',u,v);district.heaters.push(tilePoint(x+u,y+v));};
    if(n===1){
      wall(9,1,.18,4.5);wall(9,8,.18,2); // canteen doorway opens onto the entrance hall
      stove(5,6);fit('supper',3,3.5);fit('bench',3,2.5);fit('supper',6.9,8);fit('bench',7,9);
      fit('desk',14.8,8.6);fit('cabinet',19.8,9);fit('rack',2.1,8.8);
    }else{
      // An open central corridor connects the stair landing to each room.
      for(const u of [1,6.6,13]){wall(u,4.6,2.9,.17);wall(u,6.7,2.9,.17);}
      for(const u of [6.5,12.9]){wall(u,1,.17,3.6);wall(u,6.8,.17,3.2);}
      for(const u of [2.3,8,14.3]){
        fit('bedroll',u,2.4);fit('cupboard',u+2.6,1.8);fit('supper',u+1.2,8.6);
      }
      stove(11.7,2.7);fit('cabinet',3,9.3);fit('bedroll',14.5,8.7);
    }
    if(n<5)district.stairs.push({room:r,up:true,...tilePoint(x+18.7,y+5.35)});
    if(n>1)district.stairs.push({room:r,up:false,...tilePoint(x+16.9,y+5.7)});
  }
  Object.assign(FIRE,district.fire);Object.assign(FIRE2,district.heaters[0]);Object.assign(LESSER_FIRE,FIRE);
  WORLD_FIRES.splice(0,WORLD_FIRES.length,FIRE);
  ANOM0.length=CACHES.length=0;
  supplyBox(20*T,28*T,'berezki-canteen',{bread:1,bandage:2});
  for(const s of district.stairs){
    stairRun({id:'berezki',stair:s,landing:s},!s.up);
  }
  buildGrids();
}
function winterNew(difficulty){
  return {v:1,difficulty:difficultyKey(difficulty),...district.start,hp:100,min:510,money:0,inv:{ar_jacket:1,w_pm:1,a9:16,bandage:2,bread:1,medkit:1},
    weapon:'hands',armor:'ar_jacket',belt:[],mag:{w_pm:8},q:{},q2:{},stats:{kS:0,kM:0,q:0,art:0},flags:{warmth:100},campaign:{stage:'district',wounds:{}},
    news:[],rep:0,dead:{},fog:'',rad:0};
}
const winterResidents=[
  ['warden','Агат',27,32.5,'w_obrez'],['door','Савва',30.7,27.6,'w_pm'],
  ['cook','Тамара',20.5,24.5,'knife'],['tenant','Глеб',78.4,17.5,'knife']
];
function winterRestore(d){
  S=d;survDefaults();plusDefaults();restoreKit();resetCampAudio();resetInput();resetEnvironment();
  S.blow={stage:0};S.flags.warmth??=100;
  HURTDIR.length=0;fog.fill(0);fogDirty=true;fogRegion=null;
  if(S.fog)for(let i=0;i<fog.length;i++){const v=S.fog.charCodeAt(Math.floor(i/6))-48;fog[i]=(v>>(i%6))&1;}
  P=mkPlayer();P.name='Путник';ents=[P];decals=[];parts=[];nades=[];tracers=[];flashes=[];bolts=[];crows=[];
  for(let i=objs.length-1;i>=0;i--)if(!objs[i].static)objs.splice(i,1);
  for(const o of objs)if(o.stash)restoreContainer(o);
  for(const [sid,name,x,y,wpn] of winterResidents)if(!S.dead[sid]){
    const e=mkHuman({sid,name,x,y,wpn,fac:'loner',stay:1,ang:Math.PI/2});
    const previous=S.dyn.npcs.find(n=>n.sid===sid);
    if(previous)for(const key of ['x','y','hp','mag','money','inv'])if(previous[key]!=null)e[key]=previous[key];
    e.protectedResident=sid==='cook';
    if(S.flags.angry?.[sid])e.angry=1;
    ents.push(e);
  }
  for(const b of S.flags.fieldBodies||[])objs.push({...b,loot:{...b.loot}});
  ageRemains();buildGrids();cam.x=P.x;cam.y=P.y;G.near=null;draggedBody=null;fadeTo=null;fadeT=0;
  envSteps.length=0;stepDistance=0;winterFootSide=1;deathT=0;hurtFlash=0;armyAngry=false;MSGS=[];radioQueue.length=0;
}
function winterInteractChoices(cand){
  for(const s of district.stairs){const d=dE(P,s);if(d<32)cand(d-6,{k:'winterStairs',s,label:s.up?'Подняться на этаж '+(s.room.n+1):'Спуститься на этаж '+(s.room.n-1)});}
  const room=winterFloor(P.x,P.y);
  if(room?.n>1)for(const o of objs){
    if(o.fitting!=='bedroll')continue;
    const center={x:o.x+o.w/2,y:o.y+o.h/2},d=dE(P,center);
    if(d<44 && los(P.x,P.y,center.x,center.y))cand(d,{k:'winterRest',bed:true,label:'Отдохнуть на лежанке'});
  }
  const f=district.heaters.concat(FIRE).find(h=>dE(P,h)<53);
  if(f)cand(dE(P,f),{k:'winterRest',label:'Согреться и отдохнуть'});
}
function winterUse(n){
  if(n.k==='winterStairs'){
    const from=n.s,to=district.stairs.find(s=>s.room.n===from.room.n+(from.up?1:-1) && s.up!==from.up);
    P.x=to.x;P.y=to.y+(to.up?1:-1)*.38*T;cam.x=P.x;cam.y=P.y;G.near=null;msg('Берёзки · этаж '+to.room.n,'say');
  }else if(n.k==='winterRest'){
    const blocked=restBlock();if(blocked){msg(blocked,'bad');return true;}
    dialog({n:n.bed?'Лежанка':'У огня',grp:'Берёзки',record:true},[n.bed?'Под одеялом ещё тепло.':'Можно отогреть руки или остаться у огня подольше.'],()=>[
      ...[1,3,8].map(h=>({t:'Отдохнуть · '+h+' ч',fn:()=>{
        const result=restPreview(h,n.bed?'sleep':'rest');
        S.min+=result.minutes;S.food=result.food;P.hp=result.hp;
        if(result.minutes){P.st=100;S.flags.warmth=100;ageRemains();}
        closePanel();if(result.stop)msg('Проснулся от голода.','say');save(true);
      }})),{t:'Встать',close:1}]);
  }else if(n.k==='talk'){
    const lines={warden:'Дверь за собой притвори. Нанесёт снегу — к утру её вдвоём не отворишь.',door:'Проходи. Налево столовая, наверх — по дальней лестнице.',cook:'Чайник ещё горячий. Кружки на полке.',tenant:'Окна к ночи войлоком закрываем. От стекла так и тянет.'};
    dialog({ent:n.e,n:n.e.name,fac:'loner',grp:'Выживальщики',att:'житель Берёзок'},[lines[n.e.sid]||'Добрый вечер.'],()=>[{t:'До встречи',close:1}],'dialog',n.e);
  }else return false;
  return true;
}
const envSteps=[];let stepDistance=0,winterFootSide=1;
function winterWeather(dt){
  WX.time+=dt;environmentTime+=dt;
  if(Math.floor(S.min)!==Math.floor(S.min-dt))ageRemains();
  const r=winterFloor(P.x,P.y), warm=[FIRE,...district.heaters].some(f=>dE(P,f)<90 && los(P.x,P.y,f.x,f.y));
  S.flags.warmth=clamp(S.flags.warmth+dt*(warm ? 1.3 : r ? .2 : night() ? -.22 : -.07),0,100);
  if(S.flags.warmth===0 && P.alive){P.hp-=dt*.4;if(P.hp<=0)kill(P,'cold');}
  if(r || P.jumpT)stepDistance=P.step;
  if(!r && P.step-stepDistance>20 && !P.jumpT){
    stepDistance=P.step;const g=GAIT.get(P),a=g&&Math.hypot(P.x-g.x,P.y-g.y)>.01?Math.atan2(P.y-g.y,P.x-g.x):P.ang;
    winterFootSide=-winterFootSide;const side=winterFootSide*4;
    envSteps.push({x:P.x-Math.sin(a)*side,y:P.y+Math.cos(a)*side,a,t:S.min});
  }
  while(envSteps.length>100 || envSteps.length && envSteps[0].t<S.min-70)envSteps.shift();
}
// Extract the two overhead crowns once. Their silhouettes also cast the shadows on the snow.
function winterTreeArt(id, quarterTurn){
  const atlas=district.images.objects, cell=atlas.width/3;
  const crown=winterCanvas(cell,cell), g=crown.getContext('2d');
  g.translate(cell/2,cell/2);g.rotate(quarterTurn*Math.PI/2);
  g.drawImage(atlas,id%3*cell,Math.floor(id/3)*cell,cell,cell,-cell/2,-cell/2,cell,cell);
  makeLeaves(crown,crown);
  const shadow=winterCanvas(64,64), sg=shadow.getContext('2d');
  sg.drawImage(crown,0,0,shadow.width,shadow.height);sg.globalCompositeOperation='source-in';
  sg.fillStyle='#354559';sg.fillRect(0,0,shadow.width,shadow.height);
  return {crown,shadow,kind:id===6?'c1_pine':'c1_birch'};
}
function plantWinterTrees(g){
  const crowns=[6,7].map(id=>Array.from({length:4},(_,turn)=>winterTreeArt(id,turn)));
  for(let y=0;y<district.height;y++)for(let x=0;x<district.width;x++){
    if(tAt(x,y)!==TR)continue;
    const h=hash2(x,y), size=76+42*h;
    const art=crowns[h>.54?0:1][Math.floor(hash2(x+31,y+7)*4)];
    const px=(x+.5)*T, py=(y+.5)*T;
    district.trees.push({x:px,y:py,size,art});
    g.save();g.translate(px,py);
    if(SHADOWS){
      g.save();g.globalAlpha=.32;
      g.transform(.91,0,.16,.78,size*.14,size*.15);
      g.drawImage(art.shadow,-size/2,-size/2,size,size);g.restore();
    }
    // A hollow in the snow, deepest immediately around the root collar.
    g.scale(1,.76);
    const hollow=g.createRadialGradient(0,0,1,0,0,size*.19);
    hollow.addColorStop(0,'rgba(54,52,46,.85)');
    hollow.addColorStop(.30,'rgba(84,82,72,.57)');
    hollow.addColorStop(.67,'rgba(125,137,143,.28)');hollow.addColorStop(1,'transparent');
    g.fillStyle=hollow;g.fillRect(-size*.2,-size*.2,size*.4,size*.4);
    g.restore();
  }
}
function drawWinterTrees(inView){
  const room=winterFloor(P.x,P.y);
  if(room?.n>1)return;
  ctx.save();
  if(room){
    // Cutaway rooms expose the floor beneath the roof, never the street vegetation.
    ctx.beginPath();ctx.rect(0,0,district.width*T,district.height*T);
    ctx.rect(room.x*T,room.y*T,room.w*T,room.h*T);ctx.clip('evenodd');
  }
  for(const {x,y,size,art} of district.trees){
    if(!inView(x,y,size))continue;
    const lift=perspective ? (art.kind==='c1_pine'?.12:.096)*clamp(size/150,.72,1.2) : 0;
    const [tipX,tipY]=roofPoint(x,y,lift*.68);
    beam(ctx,x,y,tipX,tipY,art.kind==='c1_pine'?5:4,'#5b5448');
    if(perspective)drawLayeredCrown(art.crown,x,y,size,size,art.kind);
    else drawAutumnCrown(art.crown,x,y,size,size);
  }
  ctx.restore();
}
function winterFacade(canvas,h,doors){
  const row=winterCanvas(canvas.width,88),g=row.getContext('2d');g.drawImage(canvas,0,0);
  // The ground-floor doorway occurs only once. Other floors use a window bay.
  for(const d of doors){const l=Math.max(0,d.u-d.w/2-4),w=Math.min(row.width-l,d.w+8);g.drawImage(canvas,2,0,w,88,l,0,w,88);}
  const ground=winterCanvas(canvas.width,88);ground.getContext('2d').drawImage(canvas,0,0);
  canvas.height=88*h.storeys;
  const out=canvas.getContext('2d');
  for(let i=0;i<h.storeys;i++){out.drawImage(i===h.storeys-1?ground:row,0,i*88);out.fillStyle='rgba(238,241,235,.64)';out.fillRect(0,i*88+1,row.width,2);}
}
function snowMaterial(){
  const c=winterCanvas(512,512),g=c.getContext('2d'),im=district.images.materials,half=im.width/2;
  for(const mx of [0,1])for(const my of [0,1]){
    g.save();g.translate(mx*512,my*512);g.scale(mx?-1:1,my?-1:1);g.drawImage(im,2,2,half-4,half-4,0,0,256,256);g.restore();
  }
  return c;
}
function winterRoom(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d'),w=c.width,h=c.height;
  artFill(g,'floor_concrete',0,0,w,h);
  const rug=(x,y,rw,rh)=>{
    artFill(g,'floor_wood',x,y,rw,rh);g.fillStyle='rgba(93,49,39,.65)';g.fillRect(x,y,rw,rh);
    g.strokeStyle='#ac9574';g.strokeRect(x+3,y+3,rw-6,rh-6);g.strokeRect(x+6,y+6,rw-12,rh-12);
    g.save();g.beginPath();g.rect(x+8,y+8,rw-16,rh-16);g.clip();
    for(let j=0;j<rh;j+=10)for(let i=0;i<rw;i+=12){g.beginPath();g.moveTo(x+i,y+j);g.lineTo(x+i+5,y+j+4);g.lineTo(x+i+10,y+j);g.stroke();}
    g.restore();
  };
  if(r.n===1){artFill(g,'floor_wood',T,T,8*T,h-2*T);rug(2*T,6.6*T,2.5*T,2.2*T);}
  else{
    for(const y of [T,6.8*T])artFill(g,'floor_wood',T,y,15*T,3*T);
    for(const x of [3.4,9.4,14.9])rug(x*T,1.7*T,T*1.55,T*1.25);
  }
  const ox=r.x*T,oy=r.y*T;g.translate(-ox,-oy);
  for(let j=0;j<r.h;j++)for(let i=0;i<r.w;i++)if(tAt(r.x+i,r.y+j)===CO){
    const x=ox+i*T,y=oy+j*T;artFill(g,'wall_concrete',x,y,T,T);
    g.fillStyle='rgba(36,33,29,.33)';g.fillRect(x,y,T,T);
  }
  for(let side=0;side<4;side++){
    for(const win of residenceWindows(side,r.n)){
      const length=win.width;
      g.save();
      const vertical=side%2;
      const x=vertical?(side===1?w-15:15):win.u;
      const y=vertical?win.u:(side===2?h-15:15);
      g.translate(ox+x,oy+y);
      if(vertical)g.rotate(Math.PI/2);
      g.fillStyle='#49473e';g.fillRect(-length/2-2,-6,length+4,13);
      g.fillStyle=win.warm?'#928267':'#647275';g.fillRect(-length/2,-4,length,8);
      for(let i=0;i<win.boards;i++)beam(g,-length/2,-3+i*5,length/2,i*5,3,'#847058');
      g.fillStyle='#a39b85';g.fillRect(-length/2-2,5,length+4,2);g.restore();
    }
  }
  if(r.n===1){
    const entrance=HOUSES[0].entrances[0],cx=ox+entrance.x;
    artFill(g,'floor_concrete',cx-37,oy+h-79,74,78);
    g.fillStyle='#48453c';g.fillRect(cx-24,oy+h-51,48,30);
    for(let v=0;v<29;v+=4)beam(g,cx-23,oy+h-50+v,cx+23,oy+h-50+v,1.2,'#7b7561');
  }
  // Quilts hang over the cold inner face, with visible stitching and uneven hems.
  for(const u of [2.8,8.8,15]){
    const x=ox+u*T,y=oy+T-4,cloth=r.n%2?'#696451':'#716252';
    g.fillStyle=cloth;g.beginPath();g.moveTo(x,y-10);g.lineTo(x+49,y-10);
    g.lineTo(x+48,y+6);g.quadraticCurveTo(x+35,y+10,x+20,y+6);g.lineTo(x+1,y+8);g.fill();
    g.save();g.clip();
    for(let k=-12;k<62;k+=6){beam(g,x+k,y-11,x+k+14,y+9,.7,'#908875');beam(g,x+k,y+8,x+k+12,y-10,.7,'#565146');}
    g.restore();beam(g,x-2,y-11,x+51,y-11,2,'#484038');
  }
  for(const o of objs){
    if(o.x<ox || o.y<oy || o.x>=ox+w || o.y>=oy+h)continue;
    if(o.k==='roomFitting')drawRoomFitting(g,o);
    if(o.k==='partition')paintPartition(g,o);
  }
  for(const s of district.stairs.filter(s=>s.room===r)){
    // Two flights run in parallel. Each mouth opens onto the corridor.
    drawBuiltStair(g,{id:'berezki',stair:s,landing:s},!s.up);
  }
  for(const p of district.heaters.filter(p=>winterFloor(p.x,p.y)===r)){
    const glow=g.createRadialGradient(p.x,p.y,1,p.x,p.y,56);
    glow.addColorStop(0,'rgba(237,145,72,.32)');glow.addColorStop(1,'transparent');
    g.fillStyle=glow;g.fillRect(p.x-56,p.y-56,112,112);
    beam(g,p.x-5,p.y+7,p.x+4,p.y+7,2,'#e9a050');
  }
  return c;
}
function winterLandscape(){
  const c=winterCanvas(district.width*T,district.height*T),g=c.getContext('2d'),rand=mulberry32(916);
  const pattern=g.createPattern(snowMaterial(),'repeat');pattern.setTransform(new DOMMatrix().scale(.76));
  g.fillStyle=pattern;g.fillRect(0,0,c.width,c.height);
  // World-space drifts and worn paths are baked once. Snow stays fixed as the camera travels.
  const brush=winterCanvas(190,190),b=brush.getContext('2d'),im=district.images.materials;
  b.drawImage(im,6,6,im.width/2-12,im.width/2-12,0,0,190,190);
  b.globalCompositeOperation='destination-in';
  const fall=b.createRadialGradient(95,95,42,95,95,95);fall.addColorStop(0,'#fff');fall.addColorStop(1,'transparent');b.fillStyle=fall;b.fillRect(0,0,190,190);
  for(let i=0;i<1800;i++){
    const x=rand()*c.width,y=rand()*c.height,size=90+rand()*90;
    g.save();g.translate(x,y);g.rotate(rand()*6.28);g.drawImage(brush,-size/2,-size/2,size,size);g.restore();
  }
  for(let i=0;i<780;i++){
    const x=rand()*c.width,y=rand()*c.height,w=rand()*57+8,h=w*(.13+rand()*.23);
    g.save();g.translate(x,y);g.rotate(-.45+rand()*.24);g.scale(w,h);
    const fade=g.createRadialGradient(0,0,0,0,0,1);fade.addColorStop(0,i%3?'rgba(239,244,243,.27)':'rgba(80,100,118,.21)');fade.addColorStop(1,'transparent');g.fillStyle=fade;g.fillRect(-1,-1,2,2);g.restore();
  }
  for(let i=0;i<9400;i++){
    const lane=i%3,u=rand(),off=(rand()+rand()+rand()-1.5)*(lane===0?47:30);
    let x,y;
    if(lane===0){x=u*c.width;y=(36.5-2*Math.sin(u*5))*T+off;}
    else if(lane===1){x=(29+.7*Math.sin(u*3))*T+off;y=(29+7*u)*T;}
    else{x=(31+9*u)*T+off;y=(33-1.2*Math.sin(u*3))*T+off;}
    g.fillStyle=i%3?'rgba(95,99,99,.059)':'rgba(76,73,62,.12)';g.beginPath();g.ellipse(x,y,rand()*6+1,rand()*2+1,-.5,0,2*Math.PI);g.fill();
  }
  plantWinterTrees(g);
  district.ground=c;
  district.plans=district.levels.map(winterRoom);
  const f=district.fire;for(let j=0;j<12;j++){
    const a=j*Math.PI/6;g.fillStyle=j%2?'#665e50':'#827b6a';g.beginPath();g.ellipse(f.x+14*Math.cos(a),f.y+11*Math.sin(a),4.6,3.8,a,0,7);g.fill();
  }
  g.fillStyle='rgba(225,233,238,.16)';g.fillRect(0,0,c.width,c.height);
  // Keep the granite sill legible under the projected front wall, even on a small screen.
  const home=HOUSES[0],door=home.entrances[0];
  const x=home.x*T+door.x,y=(home.y+home.h)*T;
  artFill(g,'floor_concrete',x-door.width/2-4,y,door.width+8,17);
  for(const v of [3,9,16])beam(g,x-door.width/2-4,y+v,x+door.width/2+4,y+v,1.3,'#857f74');
  for(let track=0;track<3;track++)for(let step=0;step<15;step++){
    const u=step/15,dx=(track-1)*u*u*46+Math.sin(step*.3)*3+(step%2?4:-4);
    g.fillStyle='rgba(79,82,78,'+(.20-.10*u)+')';
    g.beginPath();g.ellipse(x+dx,y+22+step*8,2.6,5,(track-1)*u*.7,0,Math.PI*2);g.fill();
  }
  const abandoned=HOUSES[1];
  g.fillStyle='#625f57';g.fillRect(abandoned.x*T,abandoned.y*T,abandoned.w*T,abandoned.h*T);
}
function winterGround(vx,vy,vw,vh){
  const upper=winterFloor(P.x,P.y);
  ctx.fillStyle=upper?.n>1?'#202324':'#cad3da';ctx.fillRect(vx,vy,vw,vh);
  if(!upper || upper.n===1)ctx.drawImage(district.ground,0,0);
  for(const r of district.levels)if(r.n===1 && !upper || r===upper)ctx.drawImage(district.plans[r.n-1],r.x*T,r.y*T);
  for(const p of envSteps){
    ctx.fillStyle='rgba(85,100,115,'+(.28*clamp(1-(S.min-p.t)/70,0,1))+')';
    ctx.beginPath();ctx.ellipse(p.x,p.y,4.5,2,p.a,0,Math.PI*2);ctx.fill();
  }
}
function winterRoofOrder(){
  const gap=h=>Math.hypot(Math.max(h.x*T-cam.x,cam.x-(h.x+h.w)*T,0),Math.max(h.y*T-cam.y,cam.y-(h.y+h.h)*T,0));
  return district.exteriors.sort((a,b)=>gap(b)-gap(a));
}
function winterRoofs(){
  district.exteriors=HOUSES.slice();
  for(const h of HOUSES){
    const occupied=h===HOUSES[0];
    h.rooftop=occupied?[[17.4*T,3.7*T,62,45,.047],[4.9*T,5.9*T,16,15,.029],[11.7*T,2.7*T,16,15,.029]]:
      [[3*T,2*T,32,21,.02],[16*T,6*T,23,18,.02]];
    if(occupied)h.residenceWalls=[0,1,2,3].map(side=>residenceWall(h,side));
    h.roofIndex=ROOFS.length;
    ROOFS.push(residenceRoof(h));
    h.roofSurface=[h.w*T+4,h.h*T+4];
  }
}
function winterMap(g,s,_labels,options={}){
  const r=winterFloor(P.x,P.y), floor=r?.n>1?r:null;
  if(!floor){
    g.drawImage(district.ground,0,0,district.width*s,district.height*s);
    for(let y=0;y<district.height;y++)for(let x=0;x<district.width;x++)if(tAt(x,y)===TR){
      g.fillStyle='#627570';g.fillRect(x*s,y*s,s,s);
    }
    HOUSES.forEach((h,i)=>g.drawImage(ROOFS[i],h.x*s,h.y*s,h.w*s,h.h*s));
  }else g.drawImage(district.plans[r.n-1],r.x*s,r.y*s,r.w*s,r.h*s);
  const u=options.u||1;
  if(!floor && options.loc){
    g.save();g.textAlign='center';g.font='bold '+Math.max(11,12*u)+'px Arial';
    for(const [text,x,y] of [['Жилой корпус',28,26],['Заколоченный корпус',25,11],['Костёр',31,34]]){
      g.lineWidth=3*u;g.strokeStyle='#343b3d';g.strokeText(text,x*s,y*s);g.fillStyle='#f2e8cd';g.fillText(text,x*s,y*s);
    }
    g.restore();
  }
  if(options.ppl!==0)for(const e of ents)if(e!==P && e.alive && dE(e,P)<520)mapSymbol(g,playerRelation(e),e.x/T*s,e.y/T*s,u);
  if(options.ppl!==0)drawBodyContacts(g,s,u);
  mapSymbol(g,'player',P.x/T*s,P.y/T*s,u,P.ang);
}
function winterMini(){
  const size=(mini.clientWidth||128)*2;
  if(mini.width!==size)mini.width=mini.height=size;
  const s=size/30;mctx.setTransform(1,0,0,1,0,0);mctx.fillStyle='#222829';mctx.fillRect(0,0,size,size);
  mctx.translate(size/2-P.x/T*s,size/2-P.y/T*s);winterMap(mctx,s,false,{u:1.5});
  $('mini-distance').textContent=winterFloor(P.x,P.y)?.n?'Эт. '+winterFloor(P.x,P.y).n:'Двор';
  $('mini-people').textContent=ents.filter(e=>e!==P && e.alive && dE(e,P)<520).length;
}
async function bootBerezki(){
  document.body.classList.add('berezki');
  bootStep('Берёзки');makeDistrict();resize();
  await Promise.all([loadArt(),...Object.entries(window.BEREZKI_ART).map(async([id,url])=>{
    const im=new Image();im.src=url;await im.decode();district.images[id]=im;
  })]);
  GRADE.mul='rgb(240,247,251)';
  winterLandscape();winterRoofs();
  PDA_TABS2[0]=['map','Карта'];
  drawRoomLights=(g,inView,tint)=>{
    const house=HOUSES[0],entry=house.entrances[0];
    const x=house.x*T+entry.x+entry.width/2+11,y=(house.y+house.h)*T;
    if(inView(x,y,45))softLamp(g,x,y+5,39,30,tint?.25:.63,tint?'255,186,103':'0,0,0');
    for(const h of district.heaters)if(inView(h.x,h.y,120))
      softLamp(g,h.x,h.y,98,85,tint?.15:.83,tint?'255,188,116':'0,0,0');
  };
  // Bake a winter view for the shared title and pause menus.
  const cover=winterCanvas(900,490),cg=cover.getContext('2d');
  cg.drawImage(district.ground,310,260,1150,680,0,0,900,490);
  for(const h of HOUSES)cg.drawImage(ROOFS[HOUSES.indexOf(h)],(h.x*T-310)*900/1150,(h.y*T-260)*490/680,h.w*T*900/1150,h.h*T*490/680);
  const scene='url('+cover.toDataURL('image/webp',.86)+')';
  $('title').style.setProperty('--signal-scene',scene);$('ov').style.setProperty('--signal-scene',scene);
  // Install content providers before the first frame. Main simulation and input handlers are shared.
  drawGround=winterGround;drawMapTo=winterMap;drawMini=winterMini;
  qList=()=>[];qTargets=()=>[];trackedTarget=()=>null;
  briefTask=()=>{const r=winterFloor(P.x,P.y),w=Math.round(S.flags.warmth);
    const temp=r?(r.n===1?2:4):Math.round(-18-28*darkness()/.8);
    const text=(r?'Берёзки · этаж '+r.n:'Берёзки · двор')+' · '+(temp>0?'+':'')+temp+' °C · тепло '+w+'%';
    if(H.quest.textContent!==text)H.quest.textContent=text;
  };
  intro=()=>{msg('Жилой корпус. У входа дежурит смена.','say');save(true);};
  FAC_N.player=FAC_N.loner='Выживальщики';ITEMS.ar_jacket.n='Подбитая куртка';
  const saveData=loadSave();winterRestore(saveData||winterNew('normal'));
  $('bootlog')?.remove();addEventListener('resize',resize);setupControlEditor();showTitle();requestAnimationFrame(frame);
}
function winterPda(){
  const r=winterFloor(P.x,P.y),upper=r?.n>1;
  panel.mapBounds=upper?r:{x:0,y:0,w:district.width,h:district.height};
  const b=panel.mapBounds,view=panel.mapView||={zoom:1,x:b.w/2,y:b.h/2};
  panel.f={ppl:1,loc:1};
  const box=el('div','kpk-map'),bar=el('div','kpk-bar'),scale=el('span','zl');
  bar.append(el('span','zl',upper?'Жилой корпус · этаж '+r.n:'Берёзки'),
    btn('chip','−',()=>{view.zoom=clamp(view.zoom/1.6,1,12);refresh();}),scale,
    btn('chip','+',()=>{view.zoom=clamp(view.zoom*1.6,1,12);refresh();}),
    btn('chip','К игроку',()=>{view.x=P.x/T-b.x;view.y=P.y/T-b.y;view.zoom=3;refresh();}));
  const w=el('div','mapwrap kpk-wrap'),cv=el('canvas');cv.id='bigmap';w.append(cv);
  box.append(bar,w);pbody.append(box);mountPdaMap(w,cv,panel,[],()=>{},scale);
}
function winterCloth(img,part,tone){
  // Keep the original joint anchors and alpha masks. Dye each fabric panel before animation.
  const c=frameCanvas(img),g=c.getContext('2d');
  g.drawImage(img,0,0);
  const pixels=g.getImageData(0,0,c.width,c.height),a=pixels.data;
  const dye={slate:[.82,.96,1.02],ochre:[1.12,.94,.77],ash:[1.02,1.04,1.05]}[tone];
  for(let i=0;i<a.length;i+=4){
    if(!a[i+3])continue;
    const y=(Math.floor(i/4/c.width)+.5)/c.height;
    const v=.27*a[i]+.58*a[i+1]+.15*a[i+2];
    const band=part==='core' && y>.71 && y<.78;
    for(let j=0;j<3;j++)a[i+j]=(v*.88+a[i+j]*.12)*dye[j]+(band?30:3);
  }
  g.putImageData(pixels,0,0);return c;
}
function winterPortrait(e){
  const c=winterCanvas(120,120),g=c.getContext('2d');
  c.className='ava';c.setAttribute('aria-label',e.name);
  const bg=g.createRadialGradient(57,43,2,60,60,83);bg.addColorStop(0,'#625e50');bg.addColorStop(1,'#292c2a');
  g.fillStyle=bg;g.fillRect(0,0,120,120);g.translate(60,61);g.scale(3.35,3.35);g.rotate(Math.PI/2-e.ang);g.translate(-e.x,-e.y);
  drawHuman(e,g);return c;
}
