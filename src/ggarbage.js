// Northern industrial belt. Coordinates stay in the shared world so saves, NPCs,
// projectiles, the camera and both roads use the same navigation grid.
const dumpEdge = [[80,23],[92,27],[108,35],[141,38],[153,42],[198,48],[228,49],
  [242,27],[265,17],[300,16],[325,16],[347,11],[361,7],[369,3]];
function inGarbage(x,y) {
  if (!BIG || x<dumpEdge[0][0] || x>369 || y<0 || y>50) return false;
  for (let i=1;i<dumpEdge.length;i++) {
    const [bx,by]=dumpEdge[i], [ax,ay]=dumpEdge[i-1];
    if (x<=bx) return y<=lerp(ay,by,(x-ax)/(bx-ax));
  }
  return false;
}
const dumpFire = {x:228*T,y:16.6*T};
const dumpHills = [
  [173,36,17,8,-.18],[215,26,13,7,.20],[171,9,16,6,.11],
  [259,8,9,4,-.26],[208,36,8,4,.32]
];
const dumpTanks = [[213,15],[216.3,15]];
const dumpPlaces = [
  ['dump_yard','Кладбище техники',[181,31,202,47],[197,38]],
  ['dump_depot','Перегрузочное депо',[101,8,141,31],[133,28]],
  ['dump_market','Барахолка',[221,8,238,22],[228,18]],
  ['dump_mounds','Шлаковые отвалы',[163,29,183,42],[180,35]],
  ['dump_stop','Старая автостанция',[206,19,214,25],[208,24]],
  ['dump_pumps','Мазутная эстакада',[210,10,220,18],[215,18]],
  ['dump_ditch','Водоотводный коллектор',[155,34,167,42],[161,36]],
  ['dump_checkpoint','Северная застава',[196,2,205,10],[199,7]],
  ['dump_watch','Сторожка весовой',[244,8,255,16],[249,13]]
];
// The approach from the Cordon curves around the ridge into the southern yard.
// The main road then passes the depot turn and ends at the northern weigh station.
const dumpHighway=[[367,9],[367,5],[364,3],[357,3],[346,6],[332,9],[310,11],
  [286,11],[271,14],[251,14],[241,22],[238,33],[232,41],[221,46],[209,46],
  [205,42],[206,35],[202,29],[204,23],[204,17],[201,12],[199,7]];
const dumpTrail=[[149,39],[151,34],[150,29],[144,29],[138,29],[133,28]];
const sidings=[
  [[97,railAxis(97)],[100,27],[105,26],[144,26]],
  [[97,railAxis(97)],[99,24],[102,20],[155,20]],
  [[84,20],[103,20]]
];
const wagonWidth=5.75, wagonDepth=1.43;
// Store a wagon on a named horizontal siding. Rail axis, body, collision and PDA
// are derived from this placement. The wheelsets sit underneath the body centre.
function addRailVehicle(siding,x,sprite='wagon',width=wagonWidth,depth=wagonDepth) {
  const line=sidings[siding],y=line[line.length-1][1];
  addObj({k:'freightWagon',sprite,x:(x-width/2)*T,y:(y-depth/2)*T,
    w:width*T,h:depth*T,solid:1,opaque:1});
}
function makeGarbage() {
  if (!BIG) return;
  const random=mulberry32(452788);
  // Woodland islands survive around the yards; leave the existing rail and its ballast intact.
  for(let x=96;x<=365;x++) for(let y=2;y<=49;y++){
    if(!inGarbage(x,y)) continue;
    const t=tAt(x,y);
    if((t===TR || t===BU) && vnoise(x+12,y,9)+random()*.65>.49) setT(x,y,GR);
  }
  for(const [id,name,bounds,gate] of dumpPlaces){
    rcClear(...bounds);
    bigLoc(id,{name,gen:name,type:id==='dump_mounds'?'anomaly':'story',
      bounds,entrances:[gate],anchors:{approach:gate}});
  }
  for(const [x,y,w,h] of dumpHills) rcClear(Math.floor(x-w/2),Math.floor(y-h/2),Math.ceil(x+w/2),Math.ceil(y+h/2));
  // A shallow drainage cut runs along the outer toe of the heap. The two
  // banks meet at a dry service ramp beside the concrete pipes.
  for(let x=156;x<=167;x++){
    const mid=38+1.4*Math.sin((x-158)*.4);
    for(let y=35;y<=41;y++){
      const d=Math.abs(y-mid);
      if(d<1.3 && x!==161 && x!==162) setT(x,y,SW);
      else if(d<2.3) setT(x,y,DI);
    }
  }
  bigPath(dumpHighway,1.55,AS);
  bigPath(dumpTrail,1.25);
  for(let y=0;y<=1;y++) for(let x=364;x<=370;x++) setT(x,y,TR);
  const lanes=[
    [[205,42],[199,41],[197,38],[193,38],[187,38],[184,40]],
    [[199,41],[201,46],[190,48],[180,44],[173,43],[162,40],[161,36]],
    [[202,29],[195,29],[184,26],[171,27],[161,29],[150,29],[138,29],[130,29]],
    [[150,29],[152,22],[153,15],[145,11],[136,12],[134,16]],
    [[133,28],[126,31],[119,31],[109,29],[104,27]],
    [[149,25],[149,16],[150,4],[157,8],[171,15],[185,12],[199,7]],
    [[204,23],[208,24],[217,21],[228,18],[236,17]],
    [[201,12],[209,11],[215,18],[220,18],[228,18]],
    [[161,36],[161,29]],[[180,35],[185,31],[195,29]]
  ];
  for(const line of lanes) bigPath(line,1.2);
  for(const [x,y,w,h,doors,mat] of [
    [103,10,28,13,[[0,9],[0,10],[27,9],[27,10],[21,12],[22,12]],'depot'],
    [133,10,7,5,[[3,4]],'conc'],[137,22,6,3,[[2,2]],'slate'],
    [222,8,8,5,[[4,4]],'slate'],[232,11,6,4,[[2,3]],'plank'],
    [230,19,8,5,[[4,0]],'ruin'],[181,40,5,5,[[4,2]],'conc'],
    [244,8,8,4,[[5,3]],'conc'],[208,19,6,3,[[2,2]],'slate'],
    [196,3,5,3,[[2,2]],'conc']
  ]) {
    house(x,y,w,h,doors,mat==='plank'||mat==='depot'?BR:CO,mat==='ruin'?.28:0,mat,random);
    HOUSES[HOUSES.length-1].ok='dump_'+x+'_'+y;
  }
  // The two sidings diverge from the existing embankment and end at wheel stops.
  rcClear(84,18,101,26);
  for(const line of sidings) bigPath(line,1.1);
  for(const [track,x] of [[0,119.5],[0,126.1],[1,136.3],[1,143.3],[1,150.3]]) addRailVehicle(track,x);
  addRailVehicle(2,91,'shunter',5.2,1.45);
  addObj({k:'scrapCrane',x:89.4*T,y:23.6*T,w:1.65*T,h:1.2*T,solid:1,opaque:1});
  for(const [x,y] of dumpTanks)
    addObj({k:'installation',x:(x-.87)*T,y:(y-.87)*T,w:1.74*T,h:1.74*T,solid:1});
  for(const fence of [
    ['mesh',181,31,190,31],['mesh',195,31,202,31],['mesh',181,31,181,39],
    ['mesh',183,46.5,191,46.5],['mesh',196,46.5,202,46.5],
    ['mesh',101,8,140,8],['mesh',101,8,101,17],['mesh',101,24,101,31],
    ['mesh',101,31,116,31],['mesh',139,31,144,31],
    ['concreteWire',195,2.5,200,2.5],['concreteWire',203,2.5,205,2.5],
    ['mesh',211,10,219,10],['mesh',219,10,219,14]
  ]) CORDON_FENCES.push(fence);
  for(const [x,y,w,h] of [[183,33,3.9,1.5],[192,34,3.9,1.5],[211.6,25.7,3.9,1.5]])
    addObj({k:'bus',x:x*T,y:y*T,w:w*T,h:h*T,solid:1,opaque:1});
  CORDON_DETAILS.push(
    ['c1_trace_pipes',158,37.4,66,.29],['c1_trace_pipes',164.5,39.5,56,-.18],
    ['c1_bricks',163.7,37.4,30,.24],['c1_sandbags',202.3,5,42,-.17],
    ['c1_yard_car',340.5,9.8,72,-.18],['c1_trace_wheel',338.8,10.1,24,.13],
    ['c1_trace_pipes',322,7.4,64,-.22],['c1_yard_car',277,9.3,66,.24],
    ['c1_tractor',198.7,32.8,83,-.42],['c1_yard_car',188,42.4,74,.27],
    ['c1_yard_car',190.6,43.3,68,-.32],['c1_tires',200,36,35,.2],
    ['c1_trace_wheel',188.8,35.1,21,.12],['c1_junk',194,40,30,-.22],
    ['c1_trace_pipes',198,44,68,.35],['c1_trace_reel',183.8,38,32,.13],
    ['c1_trace_sleepers',140,28,57,.12],['c1_crate_army',107,15,31,0],
    ['c1_trace_reel',133,23,34,-.04],['c1_trace_pipes',211.4,17.5,52,.12],
    ['c1_barrel',218,12,24,0],['c1_trace_kettle',227.2,16.6,20,.1],
    ['c1_crate',224,10,32,.04],['c1_barrel',231,17.1,23,.21],
    ['c1_bricks',239.5,24,32,-.19],['c1_sandbags',246,13.8,41,.08],
    ['c1_tires',214.8,21.3,34,.24],['c1_trace_reel',216.2,21.4,25,.1]
  );
  WORLD_FIRES.push(dumpFire);
  addObj({k:'fire',x:dumpFire.x-10,y:dumpFire.y-10,w:20,h:20,solid:1});
  for(const [stash,k,x,y,loot] of [
    ['dump_manifest','safe',106,13,{money:95,bandage:2}],
    ['dump_tools','crate',183.1,41.5,{a9:12,antirad:1}],
    ['dump_drain','hiding',163.3,36.2,{medkit:1,energy:1}]
  ]) addObj({k,stash,x:x*T,y:y*T,w:24,h:18,solid:k!=='hiding',loot});
  for(const [sid,name,x,y,fac,wpn] of [
    ['dump_loader','Клин',232,20.5,'loner','w_obrez'],
    ['dump_sentry','Обходчик',201.5,7.6,'loner','w_obrez'],
    ['dump_scale','Латунь',225.4,10.4,'loner','w_pm'],
    ['dump_sorter','Скоба',229.3,16.4,'loner','w_pm'],
    ['dump_driver','Букса',194,38.2,'loner','w_obrez'],
    ['dump_band1','Шкурник',112,16,'bandit','w_pm'],
    ['dump_band2','Крюк',136,12,'bandit','w_obrez'],
    ['dump_band3','Копоть',129.1,24,'bandit','w_pm']
  ]) NPCDEF.push({sid,name,x:x+.5,y:y+.5,fac,wpn,named:1,stay:1,sit:sid==='dump_sorter',localFire:dumpFire});
  for(const [x,y] of [[173,36],[215,26],[171,9]]) rads.push({x:x*T,y:y*T,r:85,p:2.2});
  ANOM0.push({id:'dump_sink',k:'g',x:164.5*T,y:38.1*T,r:39},
    {id:'dump_coil',k:'e',x:218*T,y:14*T,r:29});
  ARTS0.push({key:'dump_coil',id:'art_bengal',x:218.5*T,y:14.6*T});
}
function drawDumpDetails(g,win) {
  if(!BIG || (win && (win.y0>52*T || win.x0>370*T || win.x1<78*T))) return;
  const visible=(x,y,r)=>!win || x+r>=win.x0 && x-r<=win.x1 && y+r>=win.y0 && y-r<=win.y1;
  for(const [x,y,w,h,a] of dumpHills){
    if(!visible(x*T,y*T,w*T) || !lesserSprites.slag) continue;
    g.save();g.globalAlpha=.66;g.translate(x*T,y*T);g.rotate(a);
    g.drawImage(lesserSprites.slag,-w*T/2,-h*T/2,w*T,h*T);g.restore();
  }
  if(ART) for(const line of sidings) for(let i=1;i<line.length;i++){
    const [ax,ay]=line[i-1],[bx,by]=line[i],slope=(by-ay)/(bx-ax);
    for(let x=ax;x<bx;x++){
      const y=ay+(x-ax)*slope;
      if(!visible(x*T,y*T,3*T)) continue;
      g.save();g.translate(x*T,y*T);g.transform(1,slope,0,1,0,0);
      drawRailStrip(g,x,-1.5*T-9,3*T+18);g.restore();
    }
  }
  for(const [kind,centres,width] of [['tank',dumpTanks,2.25]]){
    const sprite=lesserSprites[kind]; if(!sprite) continue;
    for(const [x,y] of centres){
      if(!visible(x*T,y*T,width*T)) continue;
      const w=width*T,h=w*sprite.height/sprite.width;
      g.save();spriteShadow(g,3,2);g.drawImage(sprite,x*T-w/2,y*T-h/2,w,h);g.restore();
    }
  }
}
