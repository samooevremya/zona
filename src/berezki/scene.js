// The winter district plugs into the Cordon movement, combat, roof, HUD and inventory systems.
// Upper storeys occupy enclosed map cells. A save position therefore identifies its floor.
const district = {
  width:535, height:521, levels:[], images:{}, plans:[], stairs:[], heaters:[],
  fire:tilePoint(421,289.6), start:tilePoint(419,284)
};
function winterCanvas(w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function winterFloor(x,y){
  return district.levels.find(r=>x>=r.x*T && x<(r.x+r.w)*T && y>=r.y*T && y<(r.y+r.h)*T);
}
function makeDistrict(){
  registerSurvival();
  seedAtlasTerrain();
  makeApartments();
  makeFishingShore();
  makeWinterStation();
  makeBase();makePumpingStation();makeWesternSites();makeHamlet();cabinDoors();
  Object.assign(FIRE,district.fire);Object.assign(FIRE2,district.heaters[0]);Object.assign(LESSER_FIRE,FIRE);
  WORLD_FIRES.splice(0,WORLD_FIRES.length,FIRE,shoreFire);
  ANOM0.length=CACHES.length=0;
  makeAtlasProps();
  supplyBox(410*T,285*T,'berezki-canteen',{bread:1,bandage:2});
  makeWinterSalvage();
  // These loose packing cases are distributed among abandoned rooms on first entry.
  for(let i=0;i<5;i++)supplyBox((245+i)*T,477*T,'expedition-'+i,{}).expeditionCrate=true;
  const office=district.levels.find(r=>r.block==='living'&&r.n===3);
  putFurniture('desk',(office.x+8.4)*T,(office.y+3.7)*T,0,'chief');
  putFurniture('stool',(office.x+8.2)*T,(office.y+2.65)*T,0,'chief');
  alignWinterStorage();
  buildGrids();
}
const fishingNames=['Илья','Павел','Денис','Макар','Никита','Олег','Тимофей','Юрий','Артём','Борис','Антон','Василий'];
function winterNew(difficulty){
  return {v:1,difficulty:difficultyKey(difficulty),...(marshPreview?tilePoint(...marshFork):basePreview?tilePoint(260,454.8):shorePreview?tilePoint(389.2,109.8):district.start),hp:100,min:marshPreview||basePreview?660:shorePreview?600:510,money:0,inv:{ar_jacket:1,w_pm:1,a9:16,bandage:2,bread:1,medkit:1,wood:1,matches:5},
    weapon:'hands',armor:'ar_jacket',belt:[],mag:{w_pm:8},q:{},q2:{},stats:{kS:0,kM:0,q:0,art:0},flags:{warmth:100,stationLayout:1,atlasLayout:3,fisherName:fishingNames[ri(0,fishingNames.length-1)]},campaign:{stage:'district',wounds:{}},
    news:[],rep:0,dead:{},fog:'',rad:0};
}
const winterResidents=[
  ['warden','Агат',417,289.5,'w_obrez'],['door','Савва',420.7,284.6,'w_pm'],
  ['cook','Тамара',410.5,281.5,'knife'],['tenant','Глеб',778.4,17.5,'knife'],
  ['fisher',null,...fishingTrack[0],'knife'],
  ['housekeeper','Вера',404.4,102.6,'knife'],['anya','Аня',383.2,114.2,'knife'],
  ['mitya','Митя',386.5,114.75,'knife'],['shorePatrol','Григорий',395.4,107.2,'w_obrez'],
  ['shorePost','Семён',382.8,108.5,'w_pm']
];
function winterRestore(d){
  S=d;survDefaults();plusDefaults();
  delete S.flags.coatWetness;marshRipples.length=0;
  upgradeStationSave(S);upgradeAtlasSave(S);restoreKit();resetCampAudio();resetInput();resetEnvironment();
  S.blow={stage:0};S.flags.warmth??=100;thermalTrackAt('street',S.min);
  if(!S.flags.flatLayout){
    if(d.x>=770*T && d.x<832*T && d.y>=49*T && d.y<60*T)Object.assign(d,tilePoint(828.1,17.6));
    S.flags.flatLayout=1;
  }
  HURTDIR.length=0;fog.fill(0);fogDirty=true;fogRegion=null;
  if(S.fog)for(let i=0;i<Math.min(S.fog.length*6,fog.length);i++){const v=S.fog.charCodeAt(Math.floor(i/6))-48;fog[i]=(v>>(i%6))&1;}
  P=mkPlayer();P.name='Путник';ents=[P];decals=[];parts=[];nades=[];tracers=[];flashes=[];bolts=[];crows=[];
  for(let i=objs.length-1;i>=0;i--)if(!objs[i].static)objs.splice(i,1);
  for(const o of objs)if(o.k==='crate'){
    o.winterOrigin||={x:o.x,y:o.y};Object.assign(o,S.flags.winterBoxSites?.[o.stash]||o.winterOrigin);
    const c=raisedScenery.find(p=>p.item===o);if(c)Object.assign(c,{x:o.x+o.w/2,y:o.y+o.h/2,depth:o.y+o.h*.74});
    const rolls=S.flags.winterBoxRolls||={};o.initialLoot=rolls[o.stash]||=rollFinds(packFinds);
  }
  if(S.inv.energy){S.inv.coffee=(S.inv.coffee||0)+S.inv.energy;delete S.inv.energy;}
  restoreFieldFires();restoreFinds();winterPeopleRestore();restoreWildlife();

  for(const o of objs)if(o.stash)restoreContainer(o);
  for(const o of objs)if(o.expeditionCrate&&!S.flags.winterBoxSites?.[o.stash])resetWinterCrate(o);
  // Older slots have no resident-name flag. A stable fallback also covers slots
  // opened repeatedly without saving and snapshots taken after the fisher died.
  const oldFisher=S.dyn.npcs.find(n=>n.sid==='fisher');
  S.flags.fisherName ||= fishingNames.includes(oldFisher?.name)?oldFisher.name:
    fishingNames[(Number(oldFisher?.uid?.slice(1))||0)%fishingNames.length];
  for(const [sid,name,x,y,wpn] of winterResidents)if(!S.dead[sid]){
    const e=mkHuman({sid,name:name??S.flags.fisherName,x,y,wpn,fac:'loner',stay:1,ang:Math.PI/2});
    const previous=S.dyn.npcs.find(n=>n.sid===sid);
    if(previous)for(const key of ['x','y','hp','mag','money','inv'])if(previous[key]!=null)e[key]=previous[key];
    e.shoreChild=sid==='anya' || sid==='mitya';
    e.protectedResident=sid==='cook' || sid==='housekeeper' || e.shoreChild;
    if(e.shoreChild)e.r=8;
    if(S.flags.angry?.[sid])e.angry=1;
    ents.push(e);
  }
  for(const b of S.flags.fieldBodies||[]){
    if(b.name==='Егор' && b.fac==='loner' && S.dead.fisher)b.name=S.flags.fisherName;
    objs.push({...b,loot:{...b.loot}});
  }
  if(S.flags.blizzard?.stage==='warning')for(const e of ents){
    if(e.kind==='human'&&e!==P&&!e.service&&!winterShelter(e))e.stormRefuge=stormRoute(e)?.to;
  }
  restoreCrateCleanup();
  ageRemains();buildGrids();
  for(const e of ents)if(e===P || shoreJobs[e.sid])restoreShoreFooting(e);
  for(const e of ents){
    if((e===P && (S.flags.stationDeck || S.flags.onLookout)) || clearFooting(e.x,e.y,e.r))continue;
    // A footprint introduced under an old save can obstruct the very first
    // step. Look for a free destination, independently of that blocked start.
    let landing=null,gap=Infinity;
    const tx=Math.floor(e.x/T),ty=Math.floor(e.y/T);
    for(let y=ty-4;y<=ty+4;y++)for(let x=tx-4;x<=tx+4;x++){
      const p=tilePoint(x+.5,y+.5),d=dE(p,e);
      if(d<gap && clearFooting(p.x,p.y,e.r)){landing=p;gap=d;}
    }
    if(landing)Object.assign(e,landing);
  }
  P.st=S.flags.savedStamina??100;
  cam.x=P.x;cam.y=P.y;G.near=null;draggedBody=null;fadeTo=null;fadeT=0;
  stepDistance=0;winterFootSide=1;deathT=0;hurtFlash=0;armyAngry=false;MSGS=[];radioQueue.length=0;
}
function winterInteractChoices(cand){
  fireChoices(cand);findChoices(cand);
  for(const s of district.stairs){const d=dE(P,s);if(d<30 && Math.abs(P.x-s.x)<.7*T)cand(d-6,{k:'winterStairs',s,label:s.up?'Подняться на этаж '+(s.room.n+1):'Спуститься на этаж '+(s.room.n-1)});}
  const room=winterFloor(P.x,P.y);
  const stove=stoveIn(room);
  if(stove && dE(P,stove.at)<53 && los(P.x,P.y,stove.at.x,stove.at.y)){
    if(!stoveBurning(stove))cand(dE(P,stove.at),{k:stove.action,stove,label:'Растопить печь'});
  }
  if(room?.n>1 || room?.heater || shoreHomes.some(home=>home.room===room))for(const o of objs){
    if(o.fitting!=='bedroll')continue;
    const center={x:o.x+o.w/2,y:o.y+o.h/2},d=dE(P,center);
    if(d<52 && winterFloor(center.x,center.y)===room && los(P.x,P.y,center.x,center.y))cand(d-4,{k:'winterRest',bed:true,label:'Отдохнуть на лежанке'});
  }
}
function winterUse(n){
  if(fireAction(n))return true;
  if(n.k==='searchFind'){openLoot(n.f);return true;}
  if(n.k==='takeFind'){if(collectStock(n.f,n.id,n.f.loot[n.id])){play('pick');save(true);}return true;}
  if(n.k==='talk'&&n.e.service){winterService(n.e);return true;}
  if(n.k==='baseKindle' || n.k==='pumpKindle' || n.k==='hamletKindle'){
    S.flags[n.stove.flag]=S.min+8*60;msg(n.k==='hamletKindle'?'Поленья затрещали. У печи теплеет.':n.stove===pumpHeater?'Дрова занялись. У печи можно согреться.':'Сухие поленья занялись. В караульной теплеет.','say');save(true);
  }else if(n.k==='winterStairs'){
    const from=n.s,to=district.stairs.find(s=>s.room.block===from.room.block && s.room.n===from.room.n+(from.up?1:-1) && s.up!==from.up);
    P.x=to.x;P.y=(to.room.y+to.room.stairY+3.18)*T;cam.x=P.x;cam.y=P.y;G.near=null;msg(to.room.name,'say');
  }else if(n.k==='winterRest'){
    const blocked=restBlock();if(blocked){msg(blocked,'bad');return true;}
    dialog({n:n.bed?'Лежанка':'У огня',grp:n.stove?n.stove.room.name:winterFloor(P.x,P.y)?.hamlet?'Хутор':shoreHomes.some(h=>h.room===winterFloor(P.x,P.y))?'Рыбацкий посёлок':'Берёзки',record:true},[n.bed?'Под одеялом ещё тепло.':'Можно отогреть руки или остаться у огня подольше.'],()=>[
      ...[1,3,8].map(h=>({t:'Отдохнуть · '+h+' ч',fn:()=>{
        sleepWinterHours(h);
        closePanel();save(true);
      }})),{t:'Встать',close:1}]);
  }else if(n.k==='talk'){
    const lines={warden:'Дверь за собой притвори. Нанесёт снегу — к утру её вдвоём не отворишь.',door:'Проходи. Налево столовая, наверх — по дальней лестнице.',cook:'Чайник ещё горячий. Кружки на полке.',fisher:'От крыльца держись по следам. У лунки лёд скользкий. Замёрзнешь — возвращайся, печь ещё держит тепло.',housekeeper:'К вечеру крыльцо снова заметёт.',anya:'Мы до следа и обратно. Смотри!',mitya:'Вон туда Аня убежала!',shorePost:'К домам проходи по тропе.',shorePatrol:'С берега ветер крепчает.',tenant:'Окна к ночи войлоком закрываем. От стекла так и тянет.'};
    dialog({ent:n.e,n:n.e.name,fac:'loner',grp:'Выживальщики',att:shoreJobs[n.e.sid]?'рыбацкий посёлок':'житель Берёзок'},[n.e.shoreAction==='net'?'Ячею прихвати, пока узел тяну. Ещё пару рядов — и к огню.':lines[n.e.sid]||'Добрый вечер.'],()=>[{t:'До встречи',close:1}],'dialog',n.e);
  }else return false;
  return true;
}
function sleepWinterHours(hours){
  const blocked=restBlock();
  if(blocked){msg(blocked,'bad');return;}
  const foodPerHour=3,healthPerHour=2;
  const slept=Math.min(hours,S.food/foodPerHour);
  const end=S.min+slept*60;
  // Advance occupied shelters and outdoor residents through any fronts crossed by sleep.
  while(S.min<end){
    const dt=Math.min(1,end-S.min);
    if(S.flags.blizzard?.stage==='warning'){
      for(const e of ents){
        if(!e.alive||!e.stormRefuge||winterShelter(e))continue;
        for(let i=0;i<5;i++)goTo(e,e.stormRefuge.x,e.stormRefuge.y,105,dt/5);
      }
    }
    S.min+=dt;winterStormTick(dt,true);
  }
  thermalTrackAt('street',S.min);
  S.food=Math.max(0,S.food-slept*foodPerHour);
  P.hp=Math.min(100,P.hp+slept*healthPerHour);P.st=100;
  clearColdFires();ageRemains();winterWildTick();cleanExpiredCrates();
  if(S.food<1e-8){S.food=0;msg('Ты проснулся от голода.','bad');}
}
let stepDistance=0,winterFootSide=1;
function winterWeather(dt){
  WX.time+=dt;environmentTime+=dt;
  if(Math.floor(S.min)!==Math.floor(S.min-dt))ageRemains();
  const r=winterFloor(P.x,P.y);
  tickFieldFire(dt);winterStormTick(dt);
  if(P.alive)winterHeatTick(dt,r);
  winterWildTick();cleanExpiredCrates();
  WX.wind=.36+.15*Math.sin(S.min*.041)+.09*Math.sin(S.min*.15);
  mixRecordedRain();
  if(!r && S.min>=(S.flags.frostSoundAt||0)){
    S.flags.frostSoundAt=S.min+35+Math.random()*90;
    const tx=Math.floor(P.x/T),ty=Math.floor(P.y/T);
    for(let i=0;i<20;i++){const x=tx+ri(-6,6),y=ty+ri(-6,6);if(tAt(x,y)===TR){play('frostCrack',x*T,y*T,soundPrefs.nature*.65);break;}}
  }
  if(decals.length)decals=decals.filter(d=>d.t==null || winterFloor(d.x,d.y) || traceAlpha(d.t)>.02);
  if(!humanMotionOn && !P.jumpT && P.step-(P.ls||0)>32){
    P.ls=P.step;
    if(swampAt(P.x,P.y))marshContact(P,P,Math.floor(P.step/32),true);
  }
  winterTracks(dt,r);
  for(const f of WORLD_FIRES)if(fireLit(f) && ((P.x-f.x)/9)**2+((P.y-f.y)/7)**2<1 && P.alive){
    P.hp-=dt*5;hurtFlash=Math.max(hurtFlash,.12);if(P.hp<=0)kill(P,'fire');
  }

}
// Extract the two overhead crowns once. Their silhouettes also cast the shadows on the snow.
function winterTreeArt(id, quarterTurn){
  const atlas=district.images.objects, cell=atlas.width/3;
  const crown=winterCanvas(cell,cell), g=crown.getContext('2d');
  g.translate(cell/2,cell/2);g.rotate(quarterTurn*2.39996);g.scale(.95+(quarterTurn%3)*.024,1-(quarterTurn%4)*.035);
  g.drawImage(atlas,id%3*cell,Math.floor(id/3)*cell,cell,cell,-cell/2,-cell/2,cell,cell);
  g.globalCompositeOperation='source-atop';
  const rand=mulberry32(id*715+quarterTurn);
  for(let i=0;i<36;i++){const u=(rand()-.5)*cell*.85,v=(rand()-.5)*cell*.82;shoreEllipse(g,u,v,3+rand()*12,2+rand()*5,'#e1e7e477',rand()*3);}
  if(id===7 && quarterTurn===6){g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(-3,1);g.lineTo(-cell*.42,-cell*.48);g.lineTo(cell*.16,-cell*.5);g.closePath();g.fill();}
  makeLeaves(crown,crown);
  const shadow=winterCanvas(64,64), sg=shadow.getContext('2d');
  sg.drawImage(crown,0,0,shadow.width,shadow.height);sg.globalCompositeOperation='source-in';
  sg.fillStyle='#354559';sg.fillRect(0,0,shadow.width,shadow.height);
  return {crown,shadow,kind:id===6?'c1_pine':'c1_birch'};
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
  for(const {x,y,size,art} of visibleAtlasTrees()){
    if(!inView(x,y,size))continue;
    const layers=canopyLayers.get(art.crown);
    if(!perspective || !layers){drawAutumnCrown(art.crown,x,y,size,size);continue;}
    // Overhead crown photography has its centre over the trunk at the neutral view.
    const height=size*(art.kind==='c1_pine'?1.25:1);
    drawAutumnCrown(layers[0],x,y,size,size);
    const [dx,dy]=winterParallax(x,y,height*.68);
    beam(ctx,x,y,x+dx,y+dy,art.kind==='c1_pine'?5:4,'#5b5448');
    for(let i=1;i<layers.length;i++){
      const z=height*[0,.25,.63,1][i],[ux,uy]=winterParallax(x,y,z);
      drawAutumnCrown(layers[i],x+ux,y+uy,size*(1+z*winterLens),size*(1+z*winterLens));
    }
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
  winterPaving(g,'slab',0,0,w,h);
  const rug=(x,y,rw,rh)=>{
    artFill(g,'floor_wood',x,y,rw,rh);g.fillStyle='rgba(93,49,39,.65)';g.fillRect(x,y,rw,rh);
    g.strokeStyle='#ac9574';g.strokeRect(x+3,y+3,rw-6,rh-6);g.strokeRect(x+6,y+6,rw-12,rh-12);
    g.save();g.beginPath();g.rect(x+8,y+8,rw-16,rh-16);g.clip();
    for(let j=0;j<rh;j+=10)for(let i=0;i<rw;i+=12){g.beginPath();g.moveTo(x+i,y+j);g.lineTo(x+i+5,y+j+4);g.lineTo(x+i+10,y+j);g.stroke();}
    g.restore();
  };
  if(r.n===1 && !r.abandoned){winterPaving(g,'boards',T,T,8*T,h-2*T);rug(2*T,6.6*T,2.5*T,2.2*T);}
  else{
    for(const y of [T,6.8*T])winterPaving(g,'boards',T,y,15*T,3*T);
    if(r.abandoned && r.n===1)winterPaving(g,'slab',11*T,6.55*T,2*T,3.45*T);
    if(!r.abandoned)for(const x of [3.2,8.2,13.2])rug(x*T,1.7*T,T*1.55,T*1.25);
  }
  const ox=r.x*T,oy=r.y*T;g.translate(-ox,-oy);
  for(let j=0;j<r.h;j++)for(let i=0;i<r.w;i++)if(tAt(r.x+i,r.y+j)===CO){
    const x=ox+i*T,y=oy+j*T;artFill(g,'wall_concrete',x,y,T,T);
    g.fillStyle='rgba(36,33,29,.33)';g.fillRect(x,y,T,T);
  }
  for(let side=0;side<4;side++){
    for(const win of residenceWindows(side,r.n,r.abandoned)){
      const length=win.width;
      g.save();
      const vertical=side%2;
      const x=vertical?(side===1?w-15:15):win.u;
      const y=vertical?win.u:(side===2?h-15:15);
      g.translate(ox+x,oy+y);
      if(vertical)g.rotate(Math.PI/2);
      winterSash(g,0,-5,length,10,win.take);
      g.restore();
    }
  }
  if(r.n===1){
    const cx=ox+12*T,edge=oy+h;
    // A worn sill separates the existing paving from the porch outside.
    artFill(g,'floor_wood',cx-T,edge-5,2*T,5);
    beam(g,cx-T,edge-1,cx+T,edge-1,1.2,'#797467');
  }
  // Quilts hang over the cold inner face, with visible stitching and uneven hems.
  for(const u of r.abandoned?[]:[2.6,8.1,14]){
    const x=ox+u*T-24,y=oy+20,cloth=r.n%2?'#696451':'#716252';
    g.fillStyle=cloth;g.beginPath();g.moveTo(x,y-10);g.lineTo(x+49,y-10);
    g.lineTo(x+48,y+6);g.quadraticCurveTo(x+35,y+10,x+20,y+6);g.lineTo(x+1,y+8);g.fill();
    g.save();g.clip();
    for(let k=-12;k<62;k+=6){beam(g,x+k,y-11,x+k+14,y+9,.7,'#908875');beam(g,x+k,y+8,x+k+12,y-10,.7,'#565146');}
    g.restore();beam(g,x-2,y-11,x+51,y-11,2,'#484038');
  }
  if(r.abandoned)abandonedFloor(g,r);

  for(const p of district.heaters.filter(p=>winterFloor(p.x,p.y)===r)){
    const glow=g.createRadialGradient(p.x,p.y,1,p.x,p.y,56);
    glow.addColorStop(0,'rgba(237,145,72,.32)');glow.addColorStop(1,'transparent');
    g.fillStyle=glow;g.fillRect(p.x-56,p.y-56,112,112);
    beam(g,p.x-5,p.y+7,p.x+4,p.y+7,2,'#e9a050');
  }
  return c;
}
function winterLandscape(){
  prepareAtlasArt();buildRaisedScenery();
  const bridge=footbridge;
  district.bridgeArt=winterCanvas(Math.ceil(bridge.width+10),Math.ceil(bridge.south-bridge.north+16));
  const bg=district.bridgeArt.getContext('2d');bg.translate(-bridge.x+bridge.width/2+5,-bridge.north+8);paintStationBridge(bg);

  district.plans=district.levels.map(r=>r.hamlet?hamletFloor(r):r===pumpRoom?pumpFloor(r):r.kind?baseInterior(r):r===stationRoom?stationInterior(r):r===fishingRoom?fishingInterior(r):villageCabins.includes(r)?cabinFloor(r):winterRoom(r));
  district.plans.forEach((plan,i)=>{
    const room=district.levels[i];
    thawAtDoor(room,plan);room.cutWalls=cutawayWalls(room,plan);
  });

}
function winterFloorPlan(r){
  if(!r.furnishedPlan){
    const i=district.levels.indexOf(r),c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
    g.drawImage(district.plans[i],0,0);g.translate(-r.x*T,-r.y*T);
    if(r.block)stairwellFloor(g,r,true);
    for(const p of raisedScenery)if(p.item && winterFloor(p.x,p.y)===r)paintRaisedScenery(g,p,true);
    r.furnishedPlan=c;
  }
  return r.furnishedPlan;
}
function winterGround(vx,vy,vw,vh){
  const upper=winterFloor(P.x,P.y);
  ctx.fillStyle=upper?.n>1?'#202324':'#cad3da';ctx.fillRect(vx,vy,vw,vh);
  if(!upper || upper.n===1)drawAtlasGround(ctx,vx,vy,vw,vh);
  district.levels.forEach((r,i)=>{
    if(r.n===1 && (!upper || (upper.n===1 && r.kind)) || r===upper)ctx.drawImage(district.plans[i],r.x*T,r.y*T);
    if(r.block && (r===upper || !upper && r.n===1) && vx+vw>=r.x*T && vx<=(r.x+r.w)*T && vy+vh>=r.y*T && vy<=(r.y+r.h)*T)stairwellFloor(ctx,r);
    if(r===upper && r.kind && r!==westStore && !['guard','barracks'].includes(r.kind))driftingBaseSnow(ctx,r);
  });
  renderWinterMarks(vx,vy,vw,vh);
  drawMarshRipples(ctx,vx,vy,vw,vh);
}
function winterRoofOrder(){
  const gap=h=>Math.hypot(Math.max(h.x*T-cam.x,cam.x-(h.x+h.w)*T,0),Math.max(h.y*T-cam.y,cam.y-(h.y+h.h)*T,0));
  return district.exteriors.sort((a,b)=>gap(b)-gap(a));
}
function winterRoofs(){
  district.exteriors=HOUSES.slice();
  for(const h of HOUSES){
    if(h.baseRoom || h.pumpingStation){
      h.storeys=1;
      h.rooftop=stoveStack(h,h.pumpingStation?pumpHearth:h.baseRoom.kind==='guard'?baseStove:null);
      h.residenceWalls=[0,1,2,3].map(side=>wallTexture(h,side,(side%2?h.h:h.w)*T,false,'concrete'));
      h.roofIndex=ROOFS.length;ROOFS.push(baseRoof(h));continue;
    }
    if(h.loadingBay){
      h.rooftop=[];
      h.storeys=1;h.residenceWalls=[0,1,2,3].map(side=>wallTexture(h,side,(side%2?h.h:h.w)*T,false,'concrete'));
      h.roofIndex=ROOFS.length;ROOFS.push(fishingRoof(h));continue;
    }
    if(h===stationHouse){h.roofIndex=ROOFS.length;ROOFS.push(stationRoof());continue;}
    if(h===fishingHouse || h.cabin){
      h.residenceWalls=[0,1,2,3].map(side=>wallTexture(h,side,(side%2?h.h:h.w)*T,true,'timber'));
      h.storeys=1;h.rooftop=stoveStack(h,h.cabin?.heater?.at || shoreHomes.find(home=>home.room===(h.cabin||fishingRoom))?.hearth);
      h.roofIndex=ROOFS.length;ROOFS.push(fishingRoof(h));continue;
    }
    const occupied=h.flat && !h.flat.abandoned;
    h.rooftop=occupied?[[4.85*T,5.85*T,13,13,20],[11.9*T,3.3*T,12,12,17]]:[];
    if(h.flat?.n===1)h.residenceWalls=[0,1,2,3].map(side=>residenceWall(h,side));
    h.roofIndex=ROOFS.length;
    ROOFS.push(residenceRoof(h));
    h.roofSurface=[h.w*T+4,h.h*T+4];
  }
}
function winterMap(g,s,_labels,options={}){
  const r=winterFloor(P.x,P.y), floor=r?.n>1?r:null;
  if(!floor){
    g.drawImage(district.images.survey,0,0,district.width*s,district.height*s);
    if(options.mini && r){
      g.drawImage(winterFloorPlan(r),r.x*s,r.y*s,r.w*s,r.h*s);
    }
  }else g.drawImage(winterFloorPlan(r),r.x*s,r.y*s,r.w*s,r.h*s);
  const u=options.u||1;
  if(!floor && options.loc){
    g.save();g.textAlign='center';g.font='bold '+Math.max(11,12*u)+'px Arial';
    atlasMapLabels(g,s,u);
    g.restore();
  }
  if(options.ppl!==0)for(const e of ents)if(e!==P && e.alive && dE(e,P)<520)mapSymbol(g,playerRelation(e),e.x/T*s,e.y/T*s,u);
  if(options.ppl!==0)drawBodyContacts(g,s,u);
  mapSymbol(g,'player',P.x/T*s,P.y/T*s,u,P.ang);
}
function winterMini(){
  const size=(mini.clientWidth||128)*2;
  if(mini.width!==size)mini.width=mini.height=size;
  const s=size/(winterFloor(P.x,P.y)?30:46);mctx.setTransform(1,0,0,1,0,0);mctx.fillStyle='#222829';mctx.fillRect(0,0,size,size);
  mctx.translate(size/2-P.x/T*s,size/2-P.y/T*s);winterMap(mctx,s,false,{u:1.5,mini:true});
  const room=winterFloor(P.x,P.y);
  $('mini-distance').textContent=room===pumpRoom || room?.kind || room?.hamlet?room.name:room===stationRoom?'Вокзал':room===fishingRoom || villageCabins.includes(room)?'Изба':room?'Эт. '+room.n:'Улица';
  $('mini-people').textContent=ents.filter(e=>e!==P && e.alive && dE(e,P)<520).length;
}
async function bootBerezki(){
  document.body.classList.add('berezki');
  bootStep('Берёзки');makeDistrict();resize();
  await Promise.all([loadArt(),...Object.entries(window.BEREZKI_ART).map(async([id,url])=>{
    const im=new Image();im.src=url;await im.decode();district.images[id]=im;
  })]);
  await loadCrateArt();
  stormMaterials();
  GRADE.mul='rgb(240,247,251)';
  winterLandscape();winterRoofs();
  PDA_TABS2[0]=['map','Карта'];
  installPagerKeys();
  drawRoomLights=(g,inView,tint)=>{
    lightShoreHomes(g,inView,tint);
    const stove=stoveIn(winterFloor(P.x,P.y));
    if(stoveBurning(stove))
      softLamp(g,stove.at.x,stove.at.y,69,60,tint?.25:.82,tint?'236,151,76':'0,0,0');
    for(const h of district.heaters)if(inView(h.x,h.y,120) && !shoreHomes.some(home=>home.hearth===h))
      softLamp(g,h.x,h.y,98,85,tint?.15:.83,tint?'255,188,116':'0,0,0');
  };
  // Install content providers before the first frame. Main simulation and input handlers are shared.
  drawGround=winterGround;drawMapTo=winterMap;drawMini=winterMini;
  qList=winterJobs;qTargets=()=>[];trackedTarget=()=>null;
  briefTask=()=>{const r=winterFloor(P.x,P.y),w=Math.round(S.flags.warmth);
    const temp=Math.round(ambientAt(r,P.x,P.y));
    const text=(stationPlace() || (r===fishingRoom?'Дом рыбака':r?.name?r.name:r?'Берёзки · этаж '+r.n:atlasPlace(P.x/T,P.y/T)))+' · '+(temp>0?'+':'')+temp+' °C · тепло '+w+'%'+(P.byHeat?' · ♨':'');
    if(H.quest.textContent!==text)H.quest.textContent=text;
  };
  intro=()=>{msg(marshPreview?'Старая водокачка. Тропа по сухой кромке огибает камыши.':basePreview?'Южная дорога. Впереди старые ворота базы.':shorePreview?'Рыбацкий посёлок. Тропа у навеса спускается ко льду.':'Жилой корпус. У входа дежурит смена.','say');save(true);};
  FAC_N.player=FAC_N.loner='Выживальщики';ITEMS.ar_jacket.n='Подбитая куртка';
  const saveData=loadSave();winterRestore(saveData||winterNew('normal'));
  $('bootlog')?.remove();addEventListener('resize',resize);setupControlEditor();showTitle();requestAnimationFrame(frame);
}
function winterPda(){
  const r=winterFloor(P.x,P.y),upper=r?.n>1;
  panel.mapBounds=upper?r:{x:0,y:0,w:district.width,h:district.height};
  const b=panel.mapBounds,view=panel.mapView||={zoom:upper?1:3,x:P.x/T-b.x,y:P.y/T-b.y};
  panel.f={ppl:1,loc:1};
  const w=el('div','mapwrap kpk-wrap pager-glass'),cv=el('canvas');cv.id='bigmap';w.append(cv);
  pbody.append(w);mountPdaMap(w,cv,panel,[],()=>{});
}
function installPagerKeys(){
  const shell=ov.querySelector('.pda');
  const group=(cls,actions)=>{
    const row=el('div','pager-hardware '+cls);
    for(const [name,action] of actions){
      const key=btn('pager-key',name,action);key.title=name;row.append(key);
    }
    shell.append(row);
  };
  function navigate(action){
    const view=panel.mapView,b=panel.mapBounds;
    if(!view || !b)return;
    if(action==='all')Object.assign(view,{x:b.w/2,y:b.h/2,zoom:1});
    else if(action==='player')Object.assign(view,{x:P.x/T-b.x,y:P.y/T-b.y,zoom:winterFloor(P.x,P.y)?.n>1?2:7});
    else view.zoom=clamp(view.zoom*(action==='in'?1.6:1/1.6),1,12);
    if(panel.tab!=='map'){panel.tab='map';drawTabs();}
    refresh();
  }
  group('pager-headkeys',[['Вся карта',()=>navigate('all')],['К игроку',()=>navigate('player')],['Закрыть',closePanel]]);
  group('pager-rocker',[['−',()=>navigate('out')],['+',()=>navigate('in')]]);

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

// Keep the player's beam on its own light mask. A tree can interrupt that
// beam without darkening a nearby hearth or casting into the unlit half-plane.
let winterBeamMask, movingBeamMask, lastWinterBeam;
function paintHumanBeamShadow(g,e,dist,angle){
  const pose=GAIT.get(e)||motionIdle;
  const stride=Math.cos(pose.cycle||0)*(pose.drive||0);
  const low=(e.sit || e.wounded) ? .56 : e.crouch ? .72 : 1;
  const size=e.shoreChild ? .73 : 1,bodyHeight=low*size*(1-.33*snowAtBoots(e));
  const reach=Math.min(135,37+1350/Math.max(18,dist))*bodyHeight;
  // Project the articulated silhouette along the incident ray. Across-ray width
  // varies with body heading; the feet remain anchored while the gait changes.
  const facing=e.ang-angle,side=Math.cos(facing),front=Math.sin(facing);
  const cross=sign=>sign*side*4.8+sign*stride*front*4.5;
  const contour=new Path2D();
  function oval(x,y,rx,ry){
    contour.moveTo(x+rx,y);contour.ellipse(x,y,rx,ry,0,0,Math.PI*2,true);
  }
  function limb(ax,ay,bx,by,ra,rb){
    const len=Math.hypot(bx-ax,by-ay)||1,nx=(ay-by)/len,ny=(bx-ax)/len;
    contour.moveTo(ax+nx*ra,ay+ny*ra);contour.lineTo(bx+nx*rb,by+ny*rb);
    contour.lineTo(bx-nx*rb,by-ny*rb);contour.lineTo(ax-nx*ra,ay-ny*ra);contour.closePath();
    oval(ax,ay,ra,ra);oval(bx,by,rb,rb);
  }
  const width=(5+3.1*Math.abs(side))*size;
  const armed=WP[e.wpn] && !WP[e.wpn].melee;
  for(const sign of [-1,1]){
    const foot=cross(sign)*size,knee=sign*(width*.55+stride*1.5);
    limb(sign*stride*3,foot,reach*.24,knee,2.2*size,3*size);
    limb(reach*.24,knee,reach*.47,sign*width*.45,3*size,3.5*size);
    const elbow=sign*(width+2.1*size);
    limb(reach*.73,sign*width*.70,reach*.58,elbow,3.5*size,2.6*size);
    limb(reach*.58,elbow,reach*(armed?.66:.46),elbow+front*(armed?6:1),2.6*size,1.9*size);
  }
  oval(reach*.55,0,reach*.17,width*.76);
  oval(reach*.68,0,reach*.16,width);
  oval(reach*.825,0,reach*.09,width*.47);
  oval(reach*.935,0,reach*.12,5.4*size);
  if(armed){
    const grip=front*6,barrel=WP[e.wpn].len || 13;
    limb(reach*.64,grip,reach*.64+side*barrel*.65,grip+front*barrel*.82,1.8,1.1);
  }
  g.save();g.translate(e.x,e.y);g.rotate(angle);
  const fall=g.createLinearGradient(0,0,reach*1.12,0);
  fall.addColorStop(0,'#000b');fall.addColorStop(.60,'#000c');fall.addColorStop(1,'#0008');
  g.fillStyle=fall;g.fill(contour);g.restore();
}
function drawMovingBeam(g,mask,source,radius,half,left,top){
  let moving=null;
  if(SHADOWS)for(const e of ents){
    if(e===source || !e.alive || e.kind!=='human')continue;
    const dx=e.x-source.x,dy=e.y-source.y,dist=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    if(dist<1 || dist>=radius || Math.abs(angD(source.ang,angle))>half+Math.atan2(9,dist))continue;
    if(npcBarrier(source,dx/dist,dy/dist,dist,null,'light')<dist-1)continue;
    if(!moving){
      movingBeamMask ||= winterCanvas(mask.width,mask.height);
      moving=movingBeamMask.getContext('2d');moving.save();
      moving.resetTransform();moving.globalCompositeOperation='copy';moving.drawImage(mask,0,0);
      moving.setTransform(.5,0,0,.5,-left*.5,-top*.5);moving.globalCompositeOperation='destination-out';
    }
    paintHumanBeamShadow(moving,e,dist,angle);
  }
  if(moving)moving.restore();
  g.drawImage(moving?movingBeamMask:mask,left,top,radius*2,radius*2);
}
function winterFlashlight(g,source){
  const radius=330,half=.42;
  const mask=winterBeamMask ||= winterCanvas(radius,radius);
  const brush=mask.getContext('2d'),left=source.x-radius,top=source.y-radius;
  const deck=S.flags.onLookout?1:S.flags.stationDeck?2:0;
  if(lastWinterBeam && lastWinterBeam.deck===deck && lastWinterBeam.x===source.x && lastWinterBeam.y===source.y &&
    lastWinterBeam.angle===source.ang && lastWinterBeam.rev===navRevision && lastWinterBeam.shadows===SHADOWS){
    drawMovingBeam(g,mask,source,radius,half,left,top);return;
  }
  lastWinterBeam={deck,x:source.x,y:source.y,angle:source.ang,rev:navRevision,shadows:SHADOWS};
  brush.setTransform(.5,0,0,.5,-left*.5,-top*.5);
  brush.clearRect(left,top,radius*2,radius*2);
  castLight(brush,source,source.ang,half,radius,.95);
  if(SHADOWS && !winterFloor(source.x,source.y)){
    brush.save();brush.globalCompositeOperation='destination-out';
    for(const p of atlasProps)if(p.yard)paintYardBeamShadow(brush,p,source,radius,half);
    for(const tree of treesInRect(left,top,left+2*radius,top+2*radius)){
      const dx=tree.x-source.x,dy=tree.y-source.y,dist=Math.hypot(dx,dy);
      if(dist<1 || dist>=radius)continue;
      const angle=Math.atan2(dy,dx);
      if(Math.abs(angD(source.ang,angle))>half+Math.atan2(tree.size*.25,dist))continue;
      const length=Math.min(radius-dist+16,tree.size*(1.05+39/Math.max(26,dist)));
      brush.save();brush.translate(tree.x,tree.y);brush.rotate(angle);
      brush.globalAlpha=.66;
      brush.drawImage(tree.art.shadow,length*.15,-tree.size*.32,length,tree.size*.64);
      const shade=brush.createLinearGradient(0,0,length*.64,0);
      shade.addColorStop(0,'#000');shade.addColorStop(1,'transparent');
      brush.fillStyle=shade;brush.beginPath();brush.ellipse(length*.31,0,length*.33,2.3,0,0,Math.PI*2);brush.fill();
      brush.restore();
    }
    brush.restore();
  }
  drawMovingBeam(g,mask,source,radius,half,left,top);
}
