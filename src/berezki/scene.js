// The winter district plugs into the Cordon movement, combat, roof, HUD and inventory systems.
// Upper storeys occupy enclosed map cells. A save position therefore identifies its floor.
const district = {
  width:669, height:651, levels:[], images:{}, plans:[], stairs:[], heaters:[],
  fire:tilePoint(520,362.6), start:tilePoint(518,357)
};
function winterCanvas(w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function winterFloor(x,y){
  return district.levels.find(r=>x>=r.x*T && x<(r.x+r.w)*T && y>=r.y*T && y<(r.y+r.h)*T);
}
function makeDistrict(){
  seedAtlasTerrain();
  makeApartments();
  makeFishingShore();
  makeWinterStation();
  makeBase();makePumpingStation();
  Object.assign(FIRE,district.fire);Object.assign(FIRE2,district.heaters[0]);Object.assign(LESSER_FIRE,FIRE);
  WORLD_FIRES.splice(0,WORLD_FIRES.length,FIRE,shoreFire);
  ANOM0.length=CACHES.length=0;
  makeAtlasProps();
  supplyBox(509*T,358*T,'berezki-canteen',{bread:1,bandage:2});
  makeWinterSalvage();
  buildGrids();
}
const fishingNames=['Илья','Павел','Денис','Макар','Никита','Олег','Тимофей','Юрий','Артём','Борис','Антон','Василий'];
function winterNew(difficulty){
  return {v:1,difficulty:difficultyKey(difficulty),...(marshPreview?tilePoint(...marshFork):basePreview?tilePoint(325,566.8):shorePreview?tilePoint(488.2,135.8):district.start),hp:100,min:marshPreview||basePreview?660:shorePreview?600:510,money:0,inv:{ar_jacket:1,w_pm:1,a9:16,bandage:2,bread:1,medkit:1},
    weapon:'hands',armor:'ar_jacket',belt:[],mag:{w_pm:8},q:{},q2:{},stats:{kS:0,kM:0,q:0,art:0},flags:{warmth:100,stationLayout:1,atlasLayout:2,fisherName:fishingNames[ri(0,fishingNames.length-1)]},campaign:{stage:'district',wounds:{}},
    news:[],rep:0,dead:{},fog:'',rad:0};
}
const winterResidents=[
  ['warden','Агат',516,362.5,'w_obrez'],['door','Савва',519.7,357.6,'w_pm'],
  ['cook','Тамара',509.5,354.5,'knife'],['tenant','Глеб',778.4,17.5,'knife'],
  ['fisher',null,...fishingTrack[0],'knife'],
  ['housekeeper','Вера',503.4,128.6,'knife'],['anya','Аня',482.2,140.2,'knife'],
  ['mitya','Митя',485.5,140.75,'knife'],['shorePatrol','Григорий',494.4,133.2,'w_obrez'],
  ['shorePost','Семён',481.8,134.5,'w_pm']
];
function winterRestore(d){
  S=d;survDefaults();plusDefaults();
  upgradeStationSave(S);upgradeAtlasSave(S);restoreKit();resetCampAudio();resetInput();resetEnvironment();
  S.blow={stage:0};S.flags.warmth??=100;
  if(!S.flags.flatLayout){
    if(d.x>=770*T && d.x<832*T && d.y>=49*T && d.y<60*T)Object.assign(d,tilePoint(828.1,17.6));
    S.flags.flatLayout=1;
  }
  HURTDIR.length=0;fog.fill(0);fogDirty=true;fogRegion=null;
  if(S.fog)for(let i=0;i<Math.min(S.fog.length*6,fog.length);i++){const v=S.fog.charCodeAt(Math.floor(i/6))-48;fog[i]=(v>>(i%6))&1;}
  P=mkPlayer();P.name='Путник';ents=[P];decals=[];parts=[];nades=[];tracers=[];flashes=[];bolts=[];crows=[];
  for(let i=objs.length-1;i>=0;i--)if(!objs[i].static)objs.splice(i,1);
  for(const o of objs)if(o.stash)restoreContainer(o);
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
  ageRemains();buildGrids();
  for(const e of ents)if(e===P || shoreJobs[e.sid])restoreShoreFooting(e);
  for(const e of ents){
    if((e===P && S.flags.stationDeck) || clearFooting(e.x,e.y,e.r))continue;
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
  cam.x=P.x;cam.y=P.y;G.near=null;draggedBody=null;fadeTo=null;fadeT=0;
  stepDistance=0;winterFootSide=1;deathT=0;hurtFlash=0;armyAngry=false;MSGS=[];radioQueue.length=0;
}
function winterInteractChoices(cand){
  for(const s of district.stairs){const d=dE(P,s);if(d<32)cand(d-6,{k:'winterStairs',s,label:s.up?'Подняться на этаж '+(s.room.n+1):'Спуститься на этаж '+(s.room.n-1)});}
  const room=winterFloor(P.x,P.y);
  const stove=stoveIn(room);
  if(stove && dE(P,stove.at)<53 && los(P.x,P.y,stove.at.x,stove.at.y)){
    const lit=stoveBurning(stove);
    cand(dE(P,stove.at),{k:lit?'winterRest':stove.action,stove,label:lit?'Согреться у печи':'Растопить печь'});
  }
  if(room?.n>1 || shoreHomes.some(home=>home.room===room))for(const o of objs){
    if(o.fitting!=='bedroll')continue;
    const center={x:o.x+o.w/2,y:o.y+o.h/2},d=dE(P,center);
    if(d<52 && winterFloor(center.x,center.y)===room && los(P.x,P.y,center.x,center.y))cand(d-4,{k:'winterRest',bed:true,label:'Отдохнуть на лежанке'});
  }
  const f=district.heaters.concat(WORLD_FIRES.filter(fireLit)).find(h=>dE(P,h)<53 && winterFloor(h.x,h.y)===room && los(P.x,P.y,h.x,h.y));
  if(f)cand(dE(P,f),{k:'winterRest',label:'Согреться и отдохнуть'});
}
function winterUse(n){
  if(n.k==='baseKindle' || n.k==='pumpKindle'){
    S.flags[n.stove.flag]=S.min+8*60;msg(n.stove===pumpHeater?'Дрова занялись. Здесь можно просушить одежду.':'Сухие поленья занялись. В караульной теплеет.','say');save(true);
  }else if(n.k==='winterStairs'){
    const from=n.s,to=district.stairs.find(s=>s.room.block===from.room.block && s.room.n===from.room.n+(from.up?1:-1) && s.up!==from.up);
    P.x=to.x;P.y=to.y+1.45*T;cam.x=P.x;cam.y=P.y;G.near=null;msg(to.room.name,'say');
  }else if(n.k==='winterRest'){
    const blocked=restBlock();if(blocked){msg(blocked,'bad');return true;}
    dialog({n:n.bed?'Лежанка':'У огня',grp:n.stove?n.stove.room.name:shoreHomes.some(h=>h.room===winterFloor(P.x,P.y))?'Рыбацкий посёлок':'Берёзки',record:true},[n.bed?'Под одеялом ещё тепло.':'Можно отогреть руки или остаться у огня подольше.'],()=>[
      ...[1,3,8].map(h=>({t:'Отдохнуть · '+h+' ч',fn:()=>{
        const result=restPreview(h,n.bed?'sleep':'rest');
        S.min+=result.minutes;S.food=result.food;P.hp=result.hp;
        if(result.minutes){
          P.st=100;S.flags.warmth=100;
          if(n.stove===pumpHeater){
            const heated=Math.min(result.minutes,Math.max(0,S.flags[n.stove.flag]-(S.min-result.minutes)));
            S.flags.coatWetness=Math.max(0,(S.flags.coatWetness||0)-heated*.045);
          }
          ageRemains();
        }
        closePanel();if(result.stop)msg('Проснулся от голода.','say');save(true);
      }})),{t:'Встать',close:1}]);
  }else if(n.k==='talk'){
    const lines={warden:'Дверь за собой притвори. Нанесёт снегу — к утру её вдвоём не отворишь.',door:'Проходи. Налево столовая, наверх — по дальней лестнице.',cook:'Чайник ещё горячий. Кружки на полке.',fisher:'От крыльца держись по следам. У лунки лёд скользкий. Замёрзнешь — возвращайся, печь ещё держит тепло.',housekeeper:'К вечеру крыльцо снова заметёт.',anya:'Мы до следа и обратно. Смотри!',mitya:'Вон туда Аня убежала!',shorePost:'К домам проходи по тропе.',shorePatrol:'С берега ветер крепчает.',tenant:'Окна к ночи войлоком закрываем. От стекла так и тянет.'};
    dialog({ent:n.e,n:n.e.name,fac:'loner',grp:'Выживальщики',att:shoreJobs[n.e.sid]?'рыбацкий посёлок':'житель Берёзок'},[n.e.shoreAction==='net'?'Ячею прихвати, пока узел тяну. Ещё пару рядов — и к огню.':lines[n.e.sid]||'Добрый вечер.'],()=>[{t:'До встречи',close:1}],'dialog',n.e);
  }else return false;
  return true;
}
let stepDistance=0,winterFootSide=1;
function winterWeather(dt){
  WX.time+=dt;environmentTime+=dt;
  if(Math.floor(S.min)!==Math.floor(S.min-dt))ageRemains();
  const r=winterFloor(P.x,P.y),stove=stoveIn(r);
  const warm=(stoveBurning(stove) && dE(P,stove.at)<90 && los(P.x,P.y,stove.at.x,stove.at.y)) || district.heaters.concat(WORLD_FIRES.filter(fireLit)).some(f=>dE(P,f)<90 && winterFloor(f.x,f.y)===r && los(P.x,P.y,f.x,f.y));
  const wet=swampAt(P.x,P.y);
  S.flags.coatWetness=clamp((S.flags.coatWetness||0)+dt*(wet?.05:warm?-.045:r?-.012:-.001),0,1);
  const cooling=(night()?.22:.07)*(1+2*S.flags.coatWetness);
  let thermalRate=-cooling-(wet?(night()?.95:.55):0);
  if(r)thermalRate=stove?-cooling*.4:r.kind || r.abandoned?-cooling*.75:.2;
  if(warm)thermalRate=1.3;
  S.flags.warmth=clamp(S.flags.warmth+dt*thermalRate,0,100);
  if(S.flags.warmth===0 && P.alive){P.hp-=dt*.4;if(P.hp<=0)kill(P,'cold');}
  WX.wind=.36+.15*Math.sin(S.min*.041)+.09*Math.sin(S.min*.15);
  mixRecordedRain();
  if(!r && S.min>=(S.flags.frostSoundAt||0)){
    S.flags.frostSoundAt=S.min+35+Math.random()*90;
    const tx=Math.floor(P.x/T),ty=Math.floor(P.y/T);
    for(let i=0;i<20;i++){const x=tx+ri(-6,6),y=ty+ri(-6,6);if(tAt(x,y)===TR){play('frostCrack',x*T,y*T,soundPrefs.nature*.65);break;}}
  }
  if(decals.length)decals=decals.filter(d=>d.t==null || winterFloor(d.x,d.y) || traceAlpha(d.t)>.02);
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
  if(r.n===1 && !r.abandoned){artFill(g,'floor_wood',T,T,8*T,h-2*T);rug(2*T,6.6*T,2.5*T,2.2*T);}
  else{
    for(const y of [T,6.8*T])artFill(g,'floor_wood',T,y,15*T,3*T);
    if(!r.abandoned)for(const x of [3.2,8.2,13.2])rug(x*T,1.7*T,T*1.55,T*1.25);
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
  for(const u of r.abandoned?[]:[2.6,8.1,14]){
    const x=ox+u*T-24,y=oy+20,cloth=r.n%2?'#696451':'#716252';
    g.fillStyle=cloth;g.beginPath();g.moveTo(x,y-10);g.lineTo(x+49,y-10);
    g.lineTo(x+48,y+6);g.quadraticCurveTo(x+35,y+10,x+20,y+6);g.lineTo(x+1,y+8);g.fill();
    g.save();g.clip();
    for(let k=-12;k<62;k+=6){beam(g,x+k,y-11,x+k+14,y+9,.7,'#908875');beam(g,x+k,y+8,x+k+12,y-10,.7,'#565146');}
    g.restore();beam(g,x-2,y-11,x+51,y-11,2,'#484038');
  }
  if(r.abandoned)abandonedFloor(g,r);
  stairwellFloor(g,r);
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

  district.plans=district.levels.map(r=>r===pumpRoom?pumpFloor(r):r.kind?baseInterior(r):r===stationRoom?stationInterior(r):r===fishingRoom?fishingInterior(r):villageCabins.includes(r)?cabinFloor(r):winterRoom(r));

}
function winterFloorPlan(r){
  if(!r.furnishedPlan){
    const i=district.levels.indexOf(r),c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
    g.drawImage(district.plans[i],0,0);g.translate(-r.x*T,-r.y*T);
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
    if(r===upper && r.kind && r.kind!=='guard')driftingBaseSnow(ctx,r);
  });
  renderWinterMarks(vx,vy,vw,vh);
}
function winterRoofOrder(){
  const gap=h=>Math.hypot(Math.max(h.x*T-cam.x,cam.x-(h.x+h.w)*T,0),Math.max(h.y*T-cam.y,cam.y-(h.y+h.h)*T,0));
  return district.exteriors.sort((a,b)=>gap(b)-gap(a));
}
function winterRoofs(){
  district.exteriors=HOUSES.slice();
  for(const h of HOUSES){
    if(h.baseRoom || h.pumpingStation){
      h.storeys=1;h.rooftop=h.baseRoom && h.baseRoom.kind!=='guard'?
        [[h.w*T*.18,h.h*T*.23,32,23,.053],[h.w*T*.65,h.h*T*.10,26,18,.043],[h.w*T*.80,h.h*T*.74,24,24,.046]]:[];h.residenceWalls=[0,1,2,3].map(side=>wallTexture(h,side,(side%2?h.h:h.w)*T,false,'concrete'));
      h.roofIndex=ROOFS.length;ROOFS.push(baseRoof(h));continue;
    }
    if(h===stationHouse){h.roofIndex=ROOFS.length;ROOFS.push(stationRoof());continue;}
    if(h===fishingHouse || h.cabin){
      h.residenceWalls=[0,1,2,3].map(side=>wallTexture(h,side,(side%2?h.h:h.w)*T,true,'timber'));
      h.storeys=1;h.rooftop=[[(h.cabin?h.w-2:2)*T-5,2.4*T-7,14,15,.035]];
      h.roofIndex=ROOFS.length;ROOFS.push(fishingRoof(h));continue;
    }
    const occupied=h.flat && !h.flat.abandoned;
    h.rooftop=occupied?[[17.4*T,3.7*T,62,45,.047],[4.9*T,5.9*T,16,15,.029],[11.7*T,2.7*T,16,15,.029]]:
      [[3*T,2*T,32,21,.02],[16*T,6*T,23,18,.02]];
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
  $('mini-distance').textContent=room===pumpRoom || room?.kind?room.name:room===stationRoom?'Вокзал':room===fishingRoom || villageCabins.includes(room)?'Изба':room?'Эт. '+room.n:'Улица';
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
    lightShoreHomes(g,inView,tint);
    const stove=stoveIn(winterFloor(P.x,P.y));
    if(stoveBurning(stove))
      softLamp(g,stove.at.x,stove.at.y,69,60,tint?.25:.82,tint?'236,151,76':'0,0,0');
    for(const h of district.heaters)if(inView(h.x,h.y,120) && !shoreHomes.some(home=>home.hearth===h))
      softLamp(g,h.x,h.y,98,85,tint?.15:.83,tint?'255,188,116':'0,0,0');
  };
  // Install content providers before the first frame. Main simulation and input handlers are shared.
  drawGround=winterGround;drawMapTo=winterMap;drawMini=winterMini;
  qList=()=>[];qTargets=()=>[];trackedTarget=()=>null;
  briefTask=()=>{const r=winterFloor(P.x,P.y),w=Math.round(S.flags.warmth);
    const outside=Math.round(-18-28*darkness()/.8);
    const stove=stoveIn(r),temp=stove?(stoveBurning(stove)?3:outside+9):r?.abandoned?outside+4:r?.kind?outside+3:r?(r.n===1?2:4):outside;
    const text=(stationPlace() || (r===fishingRoom?'Дом рыбака':r?.name?r.name:r?'Берёзки · этаж '+r.n:atlasPlace(P.x/T,P.y/T)))+' · '+(temp>0?'+':'')+temp+' °C · тепло '+w+'%'+(S.flags.coatWetness>=.01?' · одежда мокрая '+Math.round(S.flags.coatWetness*100)+'%':'');
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
  const box=el('div','kpk-map'),bar=el('div','kpk-bar'),scale=el('span','zl');
  bar.append(el('span','zl',upper?r.name:'Сотый километр'),
    btn('chip','−',()=>{view.zoom=clamp(view.zoom/1.6,1,12);refresh();}),scale,
    btn('chip','+',()=>{view.zoom=clamp(view.zoom*1.6,1,12);refresh();}),
    btn('chip','Вся карта',()=>{view.x=b.w/2;view.y=b.h/2;view.zoom=1;refresh();}),
    btn('chip','К игроку',()=>{view.x=P.x/T-b.x;view.y=P.y/T-b.y;view.zoom=upper?2:7;refresh();}));
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
