const LESSER_FIRE = { x: 90.5*T, y: (LESSER_TOP+49.5)*T };
const campOf = e => inGarbage(e.x/T,e.y/T) ? dumpFire : BIG && e.x < WEST*T ? LESSER_FIRE : FIRE;
const WORLD_FIRES = BIG ? [FIRE, FIRE2, LESSER_FIRE] : [FIRE, FIRE2];
const lesserPlaces = [
  // id, название, границы, общедоступная точка подхода
  ['zalissya','Залесье',[78,36,104,57],[91,49]],
  ['poppies','Маковое поле',[20,-21,70,35],[48,27]],
  ['mill','Старая мельница',[40,62,60,79],[55,69]],
  ['cowsheds','Коровники',[111,17,132,33],[123,26]],
  ['tower_lz','Водонапорная башня',[73,25,81,32],[78,31]],
  ['sphere','Комплекс «Сфера»',[152,37,176,54],[155,48]],
  ['barge','Баржа в старице',[25,78,42,88],[40,80]],
  ['survey','Пост замеров',[67,73,80,85],[74,81]],
  ['bulge','Бульба',[118,65,133,78],[126,75]],
  ['postal','Почтовое отделение',[54,37,64,47],[60,44]],
  ['fuel_lz','Склад ГСМ',[183,62,199,76],[191,69]],
  ['elevator_lz','Старый элеватор',[139,77,154,91],[146,82]],
  ['ribs_lz','Рёбра',[97,76,108,88],[105,82]],
  ['boiler_lz','Котельная',[197,22,214,35],[204,31]],
  ['bunker_lz','Бункер наблюдений',[50,6,61,13],[56,11]],
  ['north_lz','Лесной кордон',[18,2,32,13],[25,10]]
];
const lesserLore = {
  dump_scale:'Костёр держим под стеной старой конторы. Отсюда к депо иди вдоль разгрузочной дороги на запад.',
  dump_sorter:'Сухая канава огибает южный отвал. На гребне дозиметр трещит, а внизу можно пройти.',
  dump_driver:'На Кордон держись колеи мимо южных ворот кладбища. К ангару поворачивай на запад у остановки.',
  lz_spool: 'Ящик с зелёным замком стоит в доме у костра. Сюда доходят вещи из твоего ящика на Кордоне.',
  lz_sieve: 'Видишь старую водонапорку за крышами? От неё одна колея идёт к коровникам, другая возвращается в деревню.',
  lz_meter: 'В старице маятник детектора тянет к воде. В самом центре завихрения лучше не задерживаться.',
  lz_watch: 'Держись дороги мимо почты и выйдешь к костру в Залесье. К Кордону держись восточной дороги за котельной.',
  lz_millhand: 'Среди маков глаза сами закрываются. Возьми энергетик или обходи поле по краю.'
};
const poppyBed = (x,y) => ((x-45)/23)**2 + ((y-7)/27)**2 + .09*Math.sin(.24*x+.16*y);
const lesserLandmarks = [
  {kind:'mill', x:46.8, y:73.4, radius:136, baseWidth:161, baseHeight:222, baseOffset:11},
  {kind:'tank', x:77, y:28, radius:48},
  {kind:'antenna', x:85.6, y:44.6, radius:27},
  {kind:'dome', x:165.8, y:43.4, radius:83},
  {kind:'silo', x:128, y:20, radius:28},
  {kind:'silo', x:131, y:20, radius:28},
  {kind:'silo', x:151, y:79.7, radius:40},
  {kind:'silo', x:151, y:83.2, radius:40},
  {kind:'tank', x:193, y:64, radius:31},
  {kind:'tank', x:196, y:64, radius:31}
];
const riverAt = y => 21 + 11*Math.sin((y-10)/17) + 6*Math.sin(y/8);
// Assemble the stamped Cordon once in its own coordinate frame, then place it in
// the eastern half of the final grid. Paths, collision and camera share that grid.
function placeCordon() {
  WORLD.map.fill(VO);
  for (let y=0;y<BIGW.MH;y++) {
    const start=y*BIGW.MW, dest=(NORTH_ROWS+y)*WORLD.MW+WEST;
    WORLD.map.set(BIGW.map.subarray(start,start+BIGW.PW),dest);
    WORLD.keep.set(BIGW.keep.subarray(start,start+BIGW.PW),dest);
    // The trader's interior lives outside the outdoor rectangle in its own room coordinates.
    const room=y*WORLD.MW+WORLD.PW;
    WORLD.map.set(BIGW.map.subarray(start+BIGW.PW,start+BIGW.MW),room);
    WORLD.keep.set(BIGW.keep.subarray(start+BIGW.PW,start+BIGW.MW),room);
    WORLD.roadX[NORTH_ROWS+y]=WEST+BIGW.roadX[y];
  }
  const shift=(p,unit)=>{
    if(p.x<BIGW.PW*unit) p.y+=NORTH_ROWS*unit;
    p.x+=WEST*unit;
  };
  const tile=p=>{if(p[0]<BIGW.PW)p[1]+=NORTH_ROWS;p[0]+=WEST;};
  [...objs,...ANOM0,...ARTS0,...rads,HATCH,STAIRS,FIRE,FIRE2,SUCKER_HOME,...Object.values(POI)].forEach(p=>shift(p,T));
  BUNK.x0+=WEST*T; BUNK.x1+=WEST*T;
  for(const h of HOUSES) {h.ok ||= h.x+','+h.y;shift(h,1);}
  for(const d of [...NPCDEF,...DOGDEF,...CACHES]) shift(d,1);
  for(const l of LOCATIONS){
    if(l.bounds[0]<BIGW.PW){ l.bounds[1]+=NORTH_ROWS;l.bounds[3]+=NORTH_ROWS; }
    l.bounds[0]+=WEST;l.bounds[2]+=WEST;
    const points=new Set(l.entrances||[]);
    for(const v of Object.values(l.anchors||{})) (Array.isArray(v[0])?v:[v]).forEach(p=>points.add(p));
    points.forEach(tile);
  }
  RC1.boars.forEach(b=>tile(b.at));
  SOS_SPOTS.forEach(tile); CLEAR_SPOTS.forEach(tile);
  for(const d of [...DECOR,...CORDON_DETAILS]) {d[1]+=WEST;d[2]+=NORTH_ROWS;}
  for(const f of CORDON_FENCES) { f[1]+=WEST;f[3]+=WEST;f[2]+=NORTH_ROWS;f[4]+=NORTH_ROWS; }
  for(const line of [...VILLAGE_LANES,...VEHICLE_ROUTES]) line.forEach(tile);
  for(const p of Object.values(BIG_EXITS)) shift(p,1);
  for(let i=0;i<FORD.length;i++) FORD[i]+=NORTH_ROWS;
  const oldTrees=[...yardTreeCells];yardTreeCells.clear();
  for(const i of oldTrees) yardTreeCells.add((NORTH_ROWS+Math.floor(i/BIGW.MW))*WORLD.MW+i%BIGW.MW+WEST);
  useGrid(WORLD);
}
function makeLesserZone() {
  if (!BIG) return;
  placeCordon();
  const random = mulberry32(927731);
  const Y = LESSER_TOP;
  for (let y=NORTH_ROWS-Y; y<MH-Y; y++) {
    for (let x=0; x<WEST; x++) {
      let tile = GR;
      const stream = Math.abs(x-riverAt(y));
      const backwater = ((x-30)/10)**2 + ((y-84)/7)**2 < 1;
      const woodland = vnoise(x+73,y+31,12)*.6 + vnoise(x+306,y,5)*.4;
      const roll = random();
      if (x<2 || x>=WEST-2 || y<=NORTH_ROWS+1-Y || y>=MH-Y-2) tile = TR;
      else if (stream < 1.6 || backwater) tile=SW;
      else if (roll < Math.max(.012,(woodland-.42)*1.43)) tile=TR;
      else if (roll > .91) tile=BU;
      setT(x,Y+y,tile);
    }
  }
  // Колея от Залесья смыкается с западной дорогой Кордона.
  const lane = (pts, width, tile=DI) => bigPath(pts.map(([x,y])=>[x,Y+y]),width,tile);
  const clear = (x,y,w,h) => {
    for (let i=x; i<x+w; i++) for (let j=y; j<y+h; j++) setT(i,Y+j,GR);
    reserve(x,Y+y,x+w-1,Y+y+h-1);
  };
  lesserPlaces.forEach(([id,name,b,gate]) => {
    if (id!=='barge' && id!=='poppies') clear(b[0],b[1],b[2]-b[0]+1,b[3]-b[1]+1);
    bigLoc(id,{name,gen:name,type:id==='poppies'||id==='bulge'?'anomaly':'story',
      bounds:[b[0],Y+b[1],b[2],Y+b[3]],entrances:[[gate[0],Y+gate[1]]],anchors:{approach:[gate[0],Y+gate[1]]}});
  });
  for(let y=64;y<=74;y++) for(let x=118;x<=130;x++)
    if(((x-124)/5.5)**2+((y-69)/4.2)**2+vnoise(x,y,2)*.19<1) setT(x,Y+y,SW);
  for(let y=-22;y<=35;y++) for(let x=18;x<=71;x++)
    if(poppyBed(x+.5,y+.5)<1.15 && tAt(x,Y+y)!==SW) setT(x,Y+y,GR);
  lane([[204,31],[222,32],[229,39],[232,48],[240,50],[250,52]],1.05);
  // The cowshed trail crosses the main line on its original timber deck.
  lane([[123,26],[126,21],[126,18],[133,15],[142,2],[145,-8],[145,-19]],1.15);
  bigLoc('lesser_dump',{name:'Северная тропа на Свалку',gen:'северной тропы',type:'story',
    bounds:[191,NORTH_ROWS,199,NORTH_ROWS+5],entrances:[[194,135]],anchors:{approach:[194,135]}});
  lane([[78,31],[74,34],[73,40],[74,45],[76,46]],1.1);
  lane([[36,13],[29,10],[30,-8],[44,-17],[62,-11],[69,5],[65,22],[59,32]],1.1);
  lane([[25,10],[36,13],[39,19],[40,22],[44,24],[48,27],[59,32],[64,36],[65,40],[63,44],[59,44],[68,45],[76,46],[90,46],[102,48],[120,42],[140,47],[146,56],[152,62],[169,64],[181,62],[190,58],[198,59],[198,67],[196,69],[191,69]],2);
  lane([[48,27],[39,29],[32,38],[32,46],[33,52],[34,55.9],[38,59],[42,63],[42,68],[45,69],[49,69],[55,69],[67,61],[72,55],[73,49],[76,46]],1.1);
  lane([[55,69],[53,75],[51,78],[46,80],[40,80]],1.2);
  lane([[55,69],[63,75],[65,80],[69,81],[74,81],[92,77],[107,75],[126,75],[144,69],[149,58],[149,50],[152,48],[155,48]],1.2);
  lane([[78,31],[88,33],[94,26],[105,27],[116,27],[123,26],[129,25],[131,21.5],[135,21.5],[137,30],[144,38],[149,48],[155,48]],1.35);
  lane([[191,69],[186,70],[183,76],[182,82],[164,85],[159,84],[155,82],[154,78],[150,77],[146,80],[126,75]],1.1);
  lane([[36,13],[47,11],[56,11],[70,16],[73,26],[73,29.5],[78,31]],1.2);
  lane([[146,56],[149,48],[155,48],[165,48],[172,48]],1);
  lane([[172,48],[175.5,48.6],[177.7,48.6],[179,50],[183,43],[191,36],[204,31],[222,32]],1.35);
  lane([[204,31],[199,46],[190,58]],1.1);
  lane([[92,77],[97,79],[101,80],[106,80],[112,78],[118,77],[126,75]],1.15);

  // Два брода пересекают русло: оставляем мокрую кромку по обе стороны.
  for (const y of [12,52]) {
    const c=Math.round(riverAt(y));
    for(let i=-4;i<=4;i++) for(let j=-1;j<=1;j++) setT(c+i,Y+y+j,DI);
  }
  const cottages = [
    [78,37,7,5,'slate'],[89,38,7,6,'plank'],[98,41,6,5,'slate'],
    [78,50,12,8,'plank'],[94,53,7,5,'slate'],[56,37,7,5,'plank'],
    [42,17,5,4,'plank'],[45,63,10,5,'plank'],
    [111,18,13,5,'slate'],[117,29,13,5,'slate'],
    [153,39,8,5,'conc'],[168,50,9,5,'conc'],[67,75,7,5,'conc'],
    [140,85,11,5,'slate'],[198,24,12,5,'conc'],[210,27,5,4,'conc'],[51,6,8,4,'conc'],
    [183,63,8,5,'slate'],[187,72,12,5,'conc'],[19,4,6,4,'plank']
  ];
  for (const [x,y,w,h,roof] of cottages) {
    // Leave existing road surfaces along the facade while clearing the plot.
    rcClear(x-1,Y+y-1,x+w,Y+y+h);
    house(x,Y+y,w,h,[[Math.floor(w/2),h-1]],roof==='conc'?CO:BR,0,roof,random);
    const doorX=x+Math.floor(w/2);
    for (let j=0;j<3;j++) setT(doorX,Y+y+h+j,DI);
    HOUSES[HOUSES.length-1].ok = x+','+(Y+y-NORTH_ROWS);
  }
  // Open strips between the pens and yards are actual walkable gates.
  for (const [kind,x1,y1,x2,y2] of [
    ['stockade',76,35,106,35],['stockade',76,61,106,61],
    ['stockade',76,35,76,44],['stockade',76,49,76,61],
    ['stockade',106,35,106,45],['stockade',106,50,106,61],
    ['picket',78,43.5,81,43.5],['picket',84.7,43.5,87,43.5],
    ['picket',87,39,87,43.5],['picket',93,51.8,96,51.8],
    ['picket',100,50,100,51.8],['picket',98.5,51.8,100,51.8],
    ['rail',108.5,25.5,114,25.5],['rail',108.5,21,108.5,25.5],
    ['rail',128,28.2,133,28.2],['rail',133,23,133,28.2],
    ['mesh',151.5,37,168.5,37],['mesh',151.5,37,151.5,45],
    ['mesh',151.5,51,151.5,56],['mesh',151.5,56,159.5,56],
    ['mesh',176.8,39,176.8,48],['mesh',168.5,37,176.8,37],['mesh',176.8,37,176.8,39]
  ]) CORDON_FENCES.push([kind,x1,Y+y1,x2,Y+y2]);
  for (const [x,y,t] of [[78,44,BU],[86,41,BU],[82,49,TR],[86,50,BU],[94,48,BU],
    [98,38,TR],[101,39,BU],[88,53,BU],[76,53,TR],[111,24,BU],[132,29,TR],
    [47,61,TR],[55,68,BU],[155,37,BU],[168,46,TR],[77,27,BU]]) {
    if(tAt(x,Y+y)===GR) setT(x,Y+y,t);
  }
  // Bar in the southwest plank house; leave the southern doorway clear.
  for (const [barRole,x,y,w,h] of [
    ['counter',80,53.02,96,20],['bench',87.3,52.4,41,19],
    ['guests',80.5,55.2,44,24],['guests',86.3,55.5,35,23],['shelf',79.2,51.1,83,12],['shelf',82,51.1,61,12]
  ]) addObj({k:'table',barRole,barService:barRole==='counter',x:x*T,y:(Y+y)*T,w,h,solid:1});
  for (const sign of trailSigns) {
    const tx=Math.floor(sign.x),ty=Math.floor(sign.y);
    if(tAt(tx,ty)===TR || tAt(tx,ty)===BU) setT(tx,ty,GR);
    const span=sign.village?16:4;
    addObj({k:'signpost',village:!!sign.village,x:sign.x*T-span/2,y:sign.y*T-3,w:span,h:6,solid:1});
  }
  // The hull rests across the reed line. Boxes and sleepers are ashore.
  addObj({k:'bargeHull',x:35.1*T-140,y:(Y+82)*T-26,w:280,h:52,solid:1});
  for (const l of lesserLandmarks) {
    const x=l.x*T,y=(Y+l.y)*T,r=l.radius*(l.kind==='antenna'?.38:.78);
    const w=l.baseWidth || r*2,h=l.baseHeight || r*2;
    addObj({k:'installation',x:x-w/2,y:y-h/2+(l.baseOffset||0),w,h,solid:1,opaque:1});
  }
  addObj({k:'fire',x:LESSER_FIRE.x-10,y:LESSER_FIRE.y-10,w:20,h:20,solid:1});
  addObj({k:'locker',baseName:'Залесье',x:92*T,y:(Y+41)*T,w:26,h:18,solid:true});
  for(const [stash,x,y,loot] of [
    ['lz_mill',51,65,{bandage:2,energy:1}], ['lz_sphere',157,41,{a9:16,medkit:1}],
    ['lz_post',58,39,{bread:1,antirad:1}], ['lz_barge',42,81,{money:75,cans:1}]
  ]) addObj({k:'crate',stash,x:x*T+3,y:(Y+y)*T+3,w:26,h:26,solid:1,loot});
  CORDON_DETAILS.push(...[
    ['c1_trace_reel',52.4,72.2,29,.25],
    ['c1_trace_pipes',207,33.5,65,.1],['c1_trace_reel',143,81,31,.3],
    ['c1_rock1',99,84,98,-.68],['c1_rock0',101,83.7,68,-.64],
    ['c1_rock1',102.7,84.2,76,-.57],['c1_rock0',104.7,85,52,-.51],
    ['c1_tractor',116.5,25.7,80,-.38],['c1_trace_churn',122.5,24,25,-.16],
    ['c1_trace_pipes',160,47,72,.57],['c1_sandbags',153.2,46,52,.08],
    ['c1_barrel',95,46,22,.06],['c1_tires',67,42,39,.17],
    ['c1_trace_wheel',42.7,69.7,23,-.2],['c1_trace_sleepers',41.6,83.4,61,-.28],
    ['c1_crate_army',68,83,30,.04],['c1_trace_stump',39,25,35,.8],
    ['c1_yard_car',83,48.5,69,-.56],['c1_trace_pipes',195,72,75,.2]
  ].map(([id,x,y,width,a])=>[id,x,Y+y,width,a]));
  ANOM0.push({id:'lz-ribs',k:'e',x:102*T,y:(Y+82)*T,r:31},{id:'lz-pool',k:'g',x:124*T,y:(Y+69)*T,r:70},
    {id:'lz-yard',k:'e',x:162*T,y:(Y+51)*T,r:37});
  ARTS0.push({key:'lz_pool',id:'art_medusa',x:126*T,y:(Y+69)*T},
    {key:'lz_yard',id:'art_bengal',x:163*T,y:(Y+51)*T});
  for(const [sid,name,x,y,wpn,fac] of [
    ['lz_barman','Клён',81,51.75,'w_pm','loner'],['lz_guest','Лист',80.2,54.2,'w_pm','loner'],
    ['lz_guest2','Уголёк',81,56,'w_obrez','loner'],
    ['lz_tech','Клемма',86.5,52.8,'w_pm','loner'],['lz_spool','Катушка',89,49,'w_pm','loner'],['lz_sieve','Сито',92,50,'w_obrez','loner'],
    ['lz_millhand','Мельник',54,70,'w_pm','loner'],['lz_meter','Шкала',75,80,'w_pm','loner'],
    ['lz_watch','Кряж',23,9,'w_obrez','loner'],['lz_cut','Дежурный',157,47,'w_pm','army'],
    ['lz_rivet','Радист',170,48,'w_obrez','army']
  ]) NPCDEF.push({sid,name,x:x+.5,y:Y+y+.5,wpn,fac,guard:fac==='army'?'sphere':undefined,named:1,stay:1,sit:['lz_spool','lz_sieve','lz_guest','lz_guest2'].includes(sid),localFire:sid.startsWith('lz_guest')?{x:81.2*T,y:(Y+55.55)*T}:LESSER_FIRE});
  DOGDEF.push({sid:'lz_yard_dog',pack:'lz',x:125.5,y:Y+26.5},{sid:'lz_fuel_dog',pack:'lz',x:186,y:Y+69});
}
// World tiles. The east end shares both gauge and sleeper phase with the Cordon.
const railAxis = x => NORTH_ROWS+57.5-.0034*Math.max(0,176-x)**2;
const levelCrossing = x => x>=143 && x<=147;
function buildLesserRail() {
  for(let x=0;x<WEST;x++){
    const mid=Math.floor(railAxis(x+.5));
    for(let y=Math.max(0,mid-2);y<=Math.min(MH-1,mid+2);y++){
      const core=Math.abs(y-mid)<=1;
      if(core) setT(x,y,levelCrossing(x)?DI:RA);
      else if(tAt(x,y)===TR || tAt(x,y)===BU) setT(x,y,GR);
    }
  }
}
const lesserMainTrack=Array.from({length:WEST+1},(_,x)=>[x,railAxis(x)]);
function drawLesserRail(g,win) {
  drawFreightTrack(g,lesserMainTrack,win);
  if(win && (win.x0>148*T || win.x1<143*T || win.y0>railAxis(148)*T+40 || win.y1<railAxis(143)*T-40))return;
  for(let x=143;x<148;x++){
    const cy=railAxis(x),slope=railAxis(x+1)-cy;
    g.save();g.translate(x*T,cy*T);g.transform(1,slope,0,1,0,0);
    g.fillStyle='#635849';g.fillRect(0,-8,T,14);
    g.fillStyle='#403932';g.fillRect(0,-1,T,1);g.restore();
  }
}
const lesserSprites = {};
async function loadLesserSprites() {
  await Promise.all(Object.entries(window.LESSER_ART || {}).map(async ([name,url]) => {
    const sprite = new Image(); sprite.src=url;
    try { await sprite.decode(); lesserSprites[name]=sprite; } catch { /* Render the baked map and the simple landmark silhouettes if decoding fails. */ }
  }));
}
// Foot positions, in world tiles. Lettering stays on the face as the board turns.
const trailSigns = [
  {x:369.2,y:NORTH_ROWS+4,label:'СВАЛКА ↑',angle:.08},
  {x:361,y:53.4,label:'← ДЕПО',angle:-.14},
  {x:WEST+8.45,y:NORTH_ROWS+121.35,label:'← МАЛАЯ ЗОНА',angle:-.12},
  {x:58.6,y:LESSER_TOP+45.75,label:'← МЕЛЬНИЦА',angle:-.12},
  {x:112.5,y:LESSER_TOP+50.45,label:'СФЕРА →',angle:.14},
  {x:72,y:LESSER_TOP+43.8,village:true,angle:-.22},
  {x:107.35,y:LESSER_TOP+50.75,village:true,angle:.18}
];
function drawTrailSigns(g) {
  if (!BIG || (perspective && ART)) return;
  for (const sign of trailSigns) {
    const x=sign.x*T, y=sign.y*T, width=sign.village?36:32;
    if (x+width<GWP.x0 || x-width>GWP.x1 || y+width<GWP.y0 || y-width>GWP.y1) continue;
    drawTrailSign(g,sign);
  }
}
function drawTrailSign(g,sign) {
    const x=sign.x*T,y=sign.y*T,width=sign.village?36:32;
    const sprite=lesserSprites[sign.village?'village-sign':'fingerpost'];
    if (!sprite) return;
    const height=width*sprite.height/sprite.width;
    g.save(); g.translate(x,y); g.rotate(sign.angle);
    g.save(); spriteShadow(g,2,1);
    g.globalAlpha=.87;
    g.drawImage(sprite,-width/2,-height,width,height);
    g.restore();
    if (sign.label) {
      g.fillStyle='#baaf93'; g.textAlign='center'; g.textBaseline='middle';
      g.font='600 4px sans-serif';
      g.fillText(sign.label,0,-height*.78,width*.84);
    }
    g.restore();
}
// Окраска соцветий, рёбра оболочек и тени попадают в те же кэшированные
// куски земли, что и местные декорации. На мини-карте используется тот же план.
function drawLesserDetails(g) {
  if (!BIG || GW.x0>=WEST) return;
  const top=LESSER_TOP;
  for(let y=Math.max(-22,GW.y0-top);y<=Math.min(35,GW.y1-top);y++)
    for(let x=Math.max(18,GW.x0);x<=Math.min(71,GW.x1);x++) {
      const density=1-poppyBed(x+.5,y+.5);
      if(density<=0 || tAt(x,top+y)!==GR) continue;
      const rand=mulberry32(x*9181+y*731);
      const sprite=lesserSprites.flowers;
      if(!sprite) continue;
      const clump=vnoise(x+33,y+79,3.5);
      const clusters=Math.floor(Math.sqrt(density)*(.8+4.7*clump)+rand());
      paintPoppyHeads(g,x,y);
      for(let i=0;i<clusters;i++){
        const px=(x+rand())*T, py=(top+y+rand())*T, size=21+rand()*19;
        g.save();g.translate(px,py);g.rotate(rand()*Math.PI*2);
        g.drawImage(sprite,-size/2,-size/2,size,size);g.restore();
      }
    }
  const bx=35.1*T, by=(top+82)*T, hull=lesserSprites.barge;
  if (!perspective && hull && bx+172>=GWP.x0 && bx-172<=GWP.x1 && by+48>=GWP.y0 && by-48<=GWP.y1) {
    const h=324*hull.height/hull.width;
    g.save(); g.translate(bx,by); spriteShadow(g,3,2);
    g.drawImage(hull,-162,-h/2,324,h); g.restore();
  }
  if (!perspective) drawLesserInstallations(g,GWP);
}
function drawLesserInstallations(g,win) {
  for (const l of lesserLandmarks) {
    const x=l.x*T,y=(LESSER_TOP+l.y)*T,r=l.radius;
    if(win && (x+r*2<win.x0 || x-r>win.x1 || y+r*2<win.y0 || y-r>win.y1)) continue;
    g.save();g.translate(x,y);
    spriteShadow(g,l.kind==='antenna'?5:Math.min(14,r*.2),Math.min(8,r*.1));
    const sprite=lesserSprites[l.kind];
    if(sprite) {
      const scale=2*r/Math.max(sprite.width,sprite.height), w=sprite.width*scale,h=sprite.height*scale;
      g.drawImage(sprite,-w/2,-h/2,w,h);
    }
    else {
      g.fillStyle='#79786b';g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    }
    g.restore();
  }
}

// Old maps used either stacked regions (252 columns) or a western region (492 columns).
// Move coordinates, explored cells and tile-keyed loot before restoring actors.
function migrateNorthernWorld(s) {
  const stacked=s.mapVersion==='kordon-big', columns=stacked?252:MW;
  // These landmarks only existed in the preview of the east-west belt.
  const oldPlaces=[
    ['dump_depot',101,8,141,31],['dump_yard',181,31,202,47],['dump_market',221,8,238,22],
    ['dump_mounds',163,29,183,42],['dump_stop',206,19,214,25],['dump_pumps',210,10,220,18],
    ['dump_ditch',155,34,167,42],['dump_checkpoint',196,2,205,10],['dump_watch',244,8,255,16]
  ];
  const point=(p,unit)=>{
    if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if(stacked){
      if(p.y>=CORDON_ROWS*unit) p.y+=(LESSER_TOP-CORDON_ROWS)*unit;
      else { if(p.x<BIGW.PW*unit)p.y+=NORTH_ROWS*unit;p.x+=WEST*unit; }
      return;
    }
    if(p.x>=PW*unit) return;
    if(s.flags?.visitedDump){
      const x=p.x/unit,y=p.y/unit;
      const site=oldPlaces.find(([,l,t,r,b])=>x>=l && x<r+1 && y>=t && y<b+1);
      if(site){
        const [id,l,t]=site, bounds=LOC[id].bounds;
        p.x+=(bounds[0]-l)*unit;p.y+=(bounds[1]-t)*unit;return;
      }
    }
    p.y+=NORTH_ROWS*unit;
  };
  const index=i=>{
    const p={x:i%columns,y:Math.floor(i/columns)};
    point(p,1);return p.y*MW+p.x;
  };
  point(s,T);
  for(const e of s.dyn?.npcs||[]) {
    point(e,T);point(e.home,T);point(e.trip,T);point(e.waitAt,T);point(e.ringPt,T);point(e.evacuation?.trip,T);
  }
  point(s.jobs?.act,1);point(s.sos?.act,1);
  for(const job of s.jobs?.offer||[]) point(job,1);
  const flags=s.flags||{}, stock=flags.fieldCrates;
  if(stock) {
    for(const slot of stock.slots) slot.tile=index(slot.tile);
    stock.drops=Object.fromEntries(Object.entries(stock.drops||{}).map(([k,v])=>[index(+k),v]));
  }
  for(const key of ['groundItems','crateCleanup']) if(flags[key]){
    flags[key]=Object.fromEntries(Object.entries(flags[key]).map(([k,v])=>[
      /^field_\d+$/.test(k)?'field_'+index(+k.slice(6)):k,v]));
  }
  const renamed=[];
  for(const key of Object.keys(flags)){
    const match=/^(broken_|contents_|st_)field_(\d+)$/.exec(key);
    if(match){renamed.push([match[1]+'field_'+index(+match[2]),flags[key]]);delete flags[key];}
  }
  Object.assign(flags,Object.fromEntries(renamed));
  const bits=new Uint8Array(Math.ceil(MW*MH/6));
  for(let i=0;i<(s.fog||'').length;i++){
    const mask=s.fog.charCodeAt(i)-48;
    for(let b=0;b<6;b++) if(mask&(1<<b)){
      const target=index(i*6+b);bits[Math.floor(target/6)]|=1<<(target%6);
    }
  }
  s.fog=Array.from(bits,n=>String.fromCharCode(48+n)).join('');
  s.mapVersion=MAP_VERSION;
}
