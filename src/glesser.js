/* Малая Зона продолжает общую сетку. Координаты старого Кордона и шаг строки
   сохранений остаются прежними. Местные планы отсчитывают строки от границы. */
const LESSER_FIRE = { x: 90.5*T, y: (CORDON_ROWS+49.5)*T };
const campOf = e => BIG && e.y >= CORDON_ROWS*T ? LESSER_FIRE : FIRE;
const WORLD_FIRES = BIG ? [FIRE, FIRE2, LESSER_FIRE] : [FIRE, FIRE2];
const lesserPlaces = [
  // id, название, границы, общедоступная точка подхода
  ['zalissya','Залесье',[78,36,104,57],[91,49]],
  ['poppies','Маковое поле',[31,16,54,31],[49,27]],
  ['mill','Старая мельница',[43,62,60,74],[55,69]],
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
  lz_spool: 'Ящик с зелёным замком стоит в доме у костра. Сюда доходят вещи из твоего ящика на Кордоне.',
  lz_sieve: 'Видишь старую водонапорку за крышами? От неё одна колея идёт к коровникам, другая возвращается в деревню.',
  lz_meter: 'В старице маятник детектора тянет к воде. В самом центре завихрения лучше не задерживаться.',
  lz_watch: 'Держись дороги мимо почты и выйдешь к костру в Залесье. Обратно на Кордон можно уйти и по южной тропе.',
  lz_millhand: 'За красными цветами быстро кончаются силы. Иди по колее вдоль поля, если рюкзак тяжёлый.'
};
const poppyBed = (x,y) => ((x-42)/10)**2 + ((y-23)/6.8)**2 + .16*Math.sin(.83*x+.47*y);
const lesserLandmarks = [
  {kind:'tank', x:77, y:28, radius:36},
  {kind:'antenna', x:85.6, y:44.6, radius:27},
  {kind:'dome', x:166, y:43, radius:62},
  {kind:'silo', x:128, y:20, radius:28},
  {kind:'silo', x:131, y:20, radius:26},
  {kind:'silo', x:151, y:80, radius:37},
  {kind:'silo', x:151, y:83, radius:36},
  {kind:'tank', x:193, y:64, radius:31},
  {kind:'tank', x:196, y:64, radius:31}
];
const riverAt = y => 21 + 11*Math.sin((y-10)/17) + 6*Math.sin(y/8);
function makeLesserZone() {
  if (!BIG) return;
  useGrid({ ...BIGW, MH: WORLD_ROWS });
  const random = mulberry32(927731);
  const Y = CORDON_ROWS;
  for (let y=0; y<MH-Y; y++) {
    roadX[Y+y] = -1;
    for (let x=0; x<MW; x++) {
      let tile = GR;
      const stream = Math.abs(x-riverAt(y));
      const backwater = ((x-30)/10)**2 + ((y-84)/7)**2 < 1;
      const woodland = vnoise(x+73,y+31,12)*.6 + vnoise(x+306,y,5)*.4;
      const roll = random();
      if (x >= PW) tile = VO;
      else if (x<2 || x>=PW-2 || y>=MH-Y-2) tile = TR;
      else if (stream < 1.6 || backwater || ((x-214)/17)**2+((y-50)/29)**2<1) tile=SW;
      else if (roll < Math.max(.012,(woodland-.42)*1.43)) tile=TR;
      else if (roll > .91) tile=BU;
      setT(x,Y+y,tile);
    }
  }
  // Необитаемые участки старой южной опушки смыкаются с новым лесом.
  // Западная колея огибает Кордон, вторая тропа ведёт от южного блокпоста.
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
  for(let y=15;y<=32;y++) for(let x=30;x<=54;x++) if(poppyBed(x+.5,y+.5)<1.2) setT(x,Y+y,GR);
  for(let x=0;x<=16;x++) for(let y=115;y<=124;y++)
    if(tAt(x,y)===DI) setT(x,y,x<2?TR:GR);
  bigPath([[18,122],[11,124],[7,129],[9,139],[8,153],[15,167],[11,185],[17,202],[22,214],[25,Y+10]],1.55);
  lane([[127,-13],[118,-8],[111,-3],[111,3],[104,11],[94,23],[89,35],[90,46]],1.4);
  lane([[25,10],[36,13],[48,27],[59,32],[60,44],[76,46],[90,46],[102,48],[120,42],[140,47],[155,48],[172,50],[190,58],[191,69]],2);
  lane([[48,27],[39,29],[32,38],[29,51],[38,59],[55,69],[67,61],[82,56],[88,51],[90,46]],1.1);
  lane([[55,69],[46,77],[40,80]],1.2);
  lane([[55,69],[64,75],[74,81],[92,77],[107,75],[126,75],[144,69],[154,55],[155,48]],1.2);
  lane([[78,31],[88,33],[94,23],[108,24],[123,26],[138,30],[155,48]],1.35);
  lane([[191,69],[182,82],[164,85],[146,81],[126,75]],1.1);
  lane([[36,13],[47,11],[56,11],[70,16],[78,31]],1.2);
  lane([[172,50],[183,40],[191,36],[204,31],[222,32]],1.35);
  lane([[204,31],[199,46],[190,58]],1.1);
  lane([[92,77],[98,82],[105,82],[112,78]],1.15);
  bigPath([[31,132],[25,134],[19,135],[9,139]],1.1);
  // Два брода пересекают русло: оставляем мокрую кромку по обе стороны.
  for (const y of [12,52]) {
    const c=Math.round(riverAt(y));
    for(let i=-4;i<=4;i++) for(let j=-1;j<=1;j++) setT(c+i,Y+y+j,DI);
  }
  const cottages = [
    [78,37,7,5,'slate'],[89,38,7,6,'plank'],[98,41,6,5,'slate'],
    [79,51,8,5,'plank'],[94,53,7,5,'slate'],[56,37,7,5,'plank'],
    [42,17,5,4,'plank'],[45,63,10,5,'plank'],
    [111,18,13,5,'slate'],[117,29,13,5,'slate'],
    [153,39,8,5,'conc'],[168,50,9,5,'conc'],[67,75,7,5,'conc'],
    [140,85,11,5,'slate'],[198,24,12,5,'conc'],[210,27,5,4,'conc'],[51,6,8,4,'conc'],
    [183,63,8,5,'slate'],[187,72,12,5,'conc'],[19,4,6,4,'plank']
  ];
  for (const [x,y,w,h,roof] of cottages) {
    clear(x-1,y-1,w+2,h+2);
    house(x,Y+y,w,h,[[Math.floor(w/2),h-1]],roof==='conc'?CO:BR,0,roof,random);
    const doorX=x+Math.floor(w/2);
    for (let j=0;j<3;j++) setT(doorX,Y+y+h+j,DI);
    HOUSES[HOUSES.length-1].ok = x+','+(Y+y);
  }
  // Open strips between the pens and yards are actual walkable gates.
  for (const [kind,x1,y1,x2,y2] of [
    ['picket',78,43.5,81,43.5],['picket',84.7,43.5,87,43.5],
    ['picket',87,39,87,43.5],['picket',93,51.8,96,51.8],
    ['picket',100,50,100,51.8],['picket',98.5,51.8,100,51.8],
    ['rail',108.5,25.5,114,25.5],['rail',108.5,21,108.5,25.5],
    ['rail',128,28.2,133,28.2],['rail',133,23,133,28.2],
    ['mesh',151.5,37,168.5,37],['mesh',151.5,37,151.5,45],
    ['mesh',151.5,51,151.5,56],['mesh',151.5,56,159.5,56],
    ['mesh',176.8,39,176.8,48],['mesh',176.8,39,178.8,39]
  ]) CORDON_FENCES.push([kind,x1,Y+y1,x2,Y+y2]);
  for (const [x,y,t] of [[78,44,BU],[86,41,BU],[82,49,TR],[86,50,BU],[94,48,BU],
    [98,38,TR],[101,39,BU],[88,53,BU],[76,53,TR],[111,24,BU],[132,29,TR],
    [47,61,TR],[55,68,BU],[155,37,BU],[168,46,TR],[77,27,BU]]) {
    if(tAt(x,Y+y)===GR) setT(x,Y+y,t);
  }
  for (const sign of trailSigns) {
    const span=sign.village?40:6;
    addObj({k:'signpost',village:!!sign.village,x:sign.x*T-span/2,y:sign.y*T-3,w:span,h:6,solid:1});
  }
  // The hull rests across the reed line. Boxes and sleepers are ashore.
  addObj({k:'bargeHull',x:37*T-76,y:(Y+82)*T-20,w:152,h:40,solid:1});
  for (const l of lesserLandmarks) {
    const x=l.x*T,y=(Y+l.y)*T,r=l.radius*(l.kind==='antenna'?.38:.78);
    addObj({k:'installation',x:x-r,y:y-r,w:r*2,h:r*2,solid:1,opaque:1});
  }
  addObj({k:'fire',x:LESSER_FIRE.x-10,y:LESSER_FIRE.y-10,w:20,h:20,solid:1});
  addObj({k:'locker',baseName:'Залесье',x:92*T,y:(Y+41)*T,w:26,h:18,solid:true});
  for(const [stash,x,y,loot] of [
    ['lz_mill',51,65,{bandage:2,energy:1}], ['lz_sphere',157,41,{a9:16,medkit:1}],
    ['lz_post',58,39,{bread:1,antirad:1}], ['lz_barge',42,81,{money:75,cans:1}]
  ]) addObj({k:'crate',stash,x:x*T+3,y:(Y+y)*T+3,w:26,h:26,solid:1,loot});
  CORDON_DETAILS.push(...[
    ['c1_trace_reel',53,71,44,.25],
    ['c1_trace_pipes',208,31,65,.1],['c1_trace_reel',143,81,41,.3],
    ['c1_rock1',99,84,98,-.68],['c1_rock0',101,83.7,68,-.64],
    ['c1_rock1',102.7,84.2,76,-.57],['c1_rock0',104.7,85,52,-.51],
    ['c1_tractor',114,25,80,-.38],['c1_trace_churn',124,28,25,-.16],
    ['c1_trace_pipes',160,47,72,.57],['c1_sandbags',152,46,52,.08],
    ['c1_barrel',95,46,25,.06],['c1_tires',62,44,39,.17],
    ['c1_trace_wheel',46,69,45,-.2],['c1_trace_sleepers',41.6,83.4,61,-.28],
    ['c1_crate_army',69,82,37,.04],['c1_trace_stump',39,25,35,.8],
    ['c1_yard_car',83,46,69,-.56],['c1_trace_pipes',195,70,75,.2]
  ].map(([id,x,y,width,a])=>[id,x,Y+y,width,a]));
  ANOM0.push({id:'lz-ribs',k:'e',x:102*T,y:(Y+82)*T,r:31},{id:'lz-pool',k:'g',x:124*T,y:(Y+69)*T,r:70},
    {id:'lz-yard',k:'e',x:162*T,y:(Y+51)*T,r:37});
  ARTS0.push({key:'lz_pool',id:'art_medusa',x:126*T,y:(Y+69)*T},
    {key:'lz_yard',id:'art_bengal',x:163*T,y:(Y+51)*T});
  for(const [sid,name,x,y,wpn,fac] of [
    ['lz_spool','Катушка',89,49,'w_pm','loner'],['lz_sieve','Сито',92,50,'w_obrez','loner'],
    ['lz_millhand','Мельник',54,70,'w_pm','loner'],['lz_meter','Шкала',75,80,'w_pm','loner'],
    ['lz_watch','Кряж',23,9,'w_obrez','loner'],['lz_cut','Дежурный',157,47,'w_pm','army'],
    ['lz_rivet','Радист',170,48,'w_obrez','army']
  ]) NPCDEF.push({sid,name,x:x+.5,y:Y+y+.5,wpn,fac,named:1,stay:1,sit:sid==='lz_spool'||sid==='lz_sieve',localFire:LESSER_FIRE});
  DOGDEF.push({sid:'lz_yard_dog',pack:'lz',x:125.5,y:Y+26.5},{sid:'lz_fuel_dog',pack:'lz',x:186,y:Y+69});
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
  {x:13.45,y:126.45,label:'МАЛАЯ ЗОНА ↓',angle:-.18},
  {x:25.45,y:228.65,label:'ЗАЛЕСЬЕ →',angle:.13},
  {x:58.6,y:265.75,label:'← МЕЛЬНИЦА',angle:-.12},
  {x:112.5,y:270.45,label:'СФЕРА →',angle:.14},
  {x:75.5,y:263.45,village:true,angle:-.22},
  {x:104.35,y:271.35,village:true,angle:.18}
];
function drawTrailSigns(g) {
  if (!BIG) return;
  for (const sign of trailSigns) {
    const x=sign.x*T, y=sign.y*T, width=sign.village?75:66;
    if (x+width<GWP.x0 || x-width>GWP.x1 || y+width<GWP.y0 || y-width>GWP.y1) continue;
    const sprite=lesserSprites[sign.village?'village-sign':'fingerpost'];
    if (!sprite) continue;
    const height=width*sprite.height/sprite.width;
    g.save(); g.translate(x,y); g.rotate(sign.angle);
    g.save(); spriteShadow(g,5,2);
    g.drawImage(sprite,-width/2,-height,width,height);
    g.restore();
    if (sign.label) {
      g.fillStyle='#d2c6a7'; g.textAlign='center'; g.textBaseline='middle';
      g.font='bold 8px sans-serif';
      g.fillText(sign.label,0,-height*.78,width*.84);
    }
    g.restore();
  }
}
// Окраска соцветий, рёбра оболочек и тени попадают в те же кэшированные
// куски земли, что и местные декорации. На мини-карте используется тот же план.
function drawLesserDetails(g) {
  if (!BIG || GW.y1<CORDON_ROWS) return;
  const top=CORDON_ROWS;
  for(let y=Math.max(15,GW.y0-top);y<=Math.min(31,GW.y1-top);y++)
    for(let x=Math.max(30,GW.x0);x<=Math.min(54,GW.x1);x++) {
      const density=1-poppyBed(x+.5,y+.5);
      if(density<=0 || tAt(x,top+y)!==GR) continue;
      const rand=mulberry32(x*9181+y*731);
      const sprite=lesserSprites.poppies;
      if(!sprite) continue;
      for(let i=0;i<4*density;i++){
        const px=(x+rand())*T, py=(top+y+rand())*T, size=13+rand()*17;
        g.save();g.translate(px,py);g.rotate(rand()*Math.PI*2);
        g.drawImage(sprite,-size/2,-size/2,size,size);g.restore();
      }
    }
  const bx=37*T, by=(top+82)*T, hull=lesserSprites.barge;
  if (hull && bx+96>=GWP.x0 && bx-96<=GWP.x1 && by+48>=GWP.y0 && by-48<=GWP.y1) {
    const h=182*hull.height/hull.width;
    g.save(); g.translate(bx,by); spriteShadow(g,3,2);
    g.drawImage(hull,-91,-h/2,182,h); g.restore();
  }
  drawLesserInstallations(g,GWP);
}
function drawLesserInstallations(g,win) {
  for (const l of lesserLandmarks) {
    const x=l.x*T,y=(CORDON_ROWS+l.y)*T,r=l.radius;
    if(win && (x+r*2<win.x0 || x-r>win.x1 || y+r*2<win.y0 || y-r>win.y1)) continue;
    g.save();g.translate(x,y);
    spriteShadow(g,l.kind==='antenna'?5:r*.42,r*.16);
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
