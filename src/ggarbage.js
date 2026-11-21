// Northern industrial belt. Coordinates stay in the shared world so saves, NPCs,
// projectiles, the camera and both roads use the same navigation grid.
const dumpEdge = [[95,21],[108,35],[141,38],[153,42],[198,48],[228,49],
  [242,27],[265,17],[300,16],[325,16],[347,11],[361,7],[369,3]];
function inGarbage(x,y) {
  if (!BIG || x<dumpEdge[0][0] || x>369 || y<0 || y>50) return false;
  for (let i=1;i<dumpEdge.length;i++) {
    const [bx,by]=dumpEdge[i], [ax,ay]=dumpEdge[i-1];
    if (x<=bx) return y<=lerp(ay,by,(x-ax)/(bx-ax));
  }
  return false;
}
const dumpFire = {x:170.3*T,y:17.5*T};
const dumpHills = [
  [121,8,15,9,.11],[137,29,11,7,-.26],[157,9,10,6,.24],
  [186,22,14,9,-.13],[199,33,19,12,.23],[210,9,12,8,-.19],
  [231,15,13,7,.29],[259,7,10,5,-.15],[290,6.6,8,5,.12]
];
const dumpWagons = [[124,24],[131.1,24],[131,28]];
const dumpTanks = [[192,11],[195.4,11]];
const dumpPlaces = [
  ['dump_yard','Кладбище техники',[214,22,234,42],[221,30]],
  ['dump_depot','Перегрузочное депо',[106,13,140,30],[118,21]],
  ['dump_market','Барахолка',[160,12,177,24],[169,19]],
  ['dump_mounds','Шлаковые отвалы',[186,24,209,41],[191,31]],
  ['dump_stop','Старая автостанция',[301,6,314,14],[308,11]],
  ['dump_pumps','Мазутная эстакада',[188,6,200,14],[193,14]],
  ['dump_ditch','Водоотводный коллектор',[177,34,189,41],[183,36]],
  ['dump_checkpoint','Северная застава',[141,3,153,10],[149,7]],
  ['dump_watch','Сторожка весовой',[244,8,255,16],[249,13]]
];
const dumpHighway=[[367,9],[367,5],[364,3],[357,3],[346,6],[332,9],[310,11],[286,11],[271,14],[251,14],[237,19],[225,25],[211,22],[202,18],[183,15],[175,18],[168,20],[154,24],[143,22],[133,20],[118,21]];
const dumpTrail=[[149,39],[151,34],[148,25],[143,22]];
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
  for(let x=178;x<=189;x++){
    const mid=38+1.4*Math.sin((x-180)*.4);
    for(let y=35;y<=41;y++){
      const d=Math.abs(y-mid);
      if(d<1.3 && x!==183 && x!==184) setT(x,y,SW);
      else if(d<2.3) setT(x,y,DI);
    }
  }
  bigPath(dumpHighway,1.55,AS);
  bigPath(dumpTrail,1.25);
  bigPath([[150,4],[152,6],[156,13],[164,18],[168,20]],1.1);
  // The old highway turned into a dead end at the map edge. Its northern tip is now a verge.
  for(let y=0;y<=1;y++) for(let x=364;x<=370;x++) setT(x,y,TR);
  // Vehicle tracks around the heaps and separate foot entrances for the safe yards.
  const lanes=[
    [[225,25],[228,29],[227,36],[220,39],[211,40],[207,43],[196,43],[186,37],[184,29],[178,23],[168,20]],
    [[225,25],[221,30],[217,32],[216,35]],
    [[183,15],[187,14],[193,14],[199,14],[203,18]],
    [[184,29],[191,31],[192,36],[196,43]],
    [[118,21],[113,22],[111,27],[117,31],[130,32],[141,31],[149,26]],
    [[308,11],[308,9],[303,9]],[[184,29],[183,36],[184,39],[191,42],[196,43]],
    [[168,20],[168,16],[165,16]],[[168,20],[173,21],[175,22]]
  ];
  for(const line of lanes) bigPath(line,1.2);
  for(const [x,y,w,h,doors,mat] of [
    [106,13,15,7,[[11,6],[12,6],[0,3]],'conc'],
    [122,15,6,4,[[2,3]],'conc'],[161,12,8,4,[[4,3]],'slate'],
    [172,13,5,4,[[2,3]],'plank'],[170,22,7,4,[[3,0]],'ruin'],
    [230,34,5,5,[[0,2]],'conc'],[244,8,8,4,[[5,3]],'conc'],
    [303,6,6,3,[[4,2]],'slate'],[142,4,5,4,[[2,3]],'conc']
  ]) {
    house(x,y,w,h,doors,mat==='plank'?BR:CO,mat==='ruin'?.28:0,mat,random);
    HOUSES[HOUSES.length-1].ok='dump_'+x+'_'+y;
  }
  // The two sidings diverge from the existing embankment and end at wheel stops.
  for(const line of dumpSidings) bigPath(line,1.1);
  for(const [x,y] of dumpWagons)
    addObj({k:'installation',x:(x-2.6)*T,y:(y-.65)*T,w:5.2*T,h:1.3*T,solid:1,opaque:1});
  for(const [x,y] of dumpTanks)
    addObj({k:'installation',x:(x-.87)*T,y:(y-.87)*T,w:1.74*T,h:1.74*T,solid:1});
  for(const fence of [
    ['mesh',214,26,219,26],['mesh',225,26,231,26],['mesh',214,26,214,31],
    ['mesh',214,35,214,40],['mesh',214,40,222,40],['mesh',227,40,234,40],
    ['concreteWire',141,3,148,3],['concreteWire',152.5,3,154.5,3],
    ['rail',110,30.5,114,30.5],['mesh',190,8,198,8],['mesh',198,8,198,12]
  ]) CORDON_FENCES.push(fence);
  for(const [x,y,w,h] of [[216,27,3.9,1.5],[221,32,3.9,1.5],[302,12.7,3.9,1.5]])
    addObj({k:'bus',x:x*T,y:y*T,w:w*T,h:h*T,solid:1,opaque:1});
  CORDON_DETAILS.push(
    ['c1_trace_pipes',180,37.4,75,.29],['c1_trace_pipes',186.5,39.5,60,-.18],
    ['c1_bricks',185.3,37.4,31,.24],['c1_sandbags',147.5,4.4,44,-.17],
    ['c1_crate_army',143.7,5.5,25,0],
    ['c1_yard_car',340.5,9.8,72,-.18],['c1_trace_wheel',338.8,10.1,24,.13],
    ['c1_trace_pipes',322,7.4,67,-.22],['c1_yard_car',277,9.3,66,.24],
    ['c1_tractor',230.8,28.4,85,-.42],['c1_yard_car',217.4,36.2,73,.27],
    ['c1_yard_car',220.5,37.3,66,-.32],['c1_tires',226.7,33,37,.2],
    ['c1_trace_wheel',219.5,30,23,.12],['c1_junk',222,35.8,31,-.22],
    ['c1_trace_pipes',231,31.2,73,.35],['c1_trace_reel',229.4,39.5,35,.13],
    ['c1_trace_sleepers',135,26,57,.12],['c1_crate_army',111,17,31,0],
    ['c1_trace_reel',123.3,19.7,34,-.04],['c1_trace_pipes',190.6,13.6,54,.12],
    ['c1_barrel',197,12,24,0],['c1_trace_kettle',169.4,17.6,22,.1],
    ['c1_crate',165,13.5,32,.04],['c1_barrel',172.3,21.3,23,.21],
    ['c1_bricks',179.4,26.3,33,-.19],['c1_sandbags',246,13.8,41,.08],
    ['c1_tires',310,8.8,36,.24],['c1_trace_reel',312,9.2,26,.1]
  );
  WORLD_FIRES.push(dumpFire);
  addObj({k:'fire',x:dumpFire.x-10,y:dumpFire.y-10,w:20,h:20,solid:1});
  for(const [stash,k,x,y,loot] of [
    ['dump_manifest','safe',108,15,{money:95,bandage:2}],
    ['dump_tools','crate',228.6,37.2,{a9:12,antirad:1}],
    ['dump_drain','hiding',194,35.8,{medkit:1,energy:1}]
  ]) addObj({k,stash,x:x*T,y:y*T,w:24,h:18,solid:k!=='hiding',loot});
  for(const [sid,name,x,y,fac,wpn] of [
    ['dump_dispatch','Серый',115,17,'loner','w_obrez'],
    ['dump_sentry','Обходчик',147.5,7.7,'loner','w_obrez'],
    ['dump_scale','Латунь',166,14,'loner','w_pm'],
    ['dump_sorter','Скоба',171.5,18.8,'loner','w_pm'],
    ['dump_driver','Букса',217.4,32.5,'loner','w_obrez'],
    ['dump_band1','Шкурник',247,10,'bandit','w_pm'],
    ['dump_band2','Крюк',253.4,10.8,'bandit','w_obrez']
  ]) NPCDEF.push({sid,name,x:x+.5,y:y+.5,fac,wpn,named:1,stay:1,sit:sid==='dump_sorter',localFire:dumpFire});
  for(const [x,y] of [[199,33],[185,22],[231,16]]) rads.push({x:x*T,y:y*T,r:85,p:2.2});
  ANOM0.push({id:'dump_sink',k:'g',x:194.5*T,y:34.1*T,r:39},
    {id:'dump_coil',k:'e',x:198*T,y:10*T,r:29});
  ARTS0.push({key:'dump_coil',id:'art_bengal',x:198.5*T,y:10.6*T});
}
const dumpSidings=[
  [[97,railAxis(97)],[104,31],[111,25],[117,24],[136,24]],
  [[106,29.3],[114,28],[136,28]]
];
function drawDumpDetails(g,win) {
  if(!BIG || (win && (win.y0>52*T || win.x0>370*T || win.x1<92*T))) return;
  const visible=(x,y,r)=>!win || x+r>=win.x0 && x-r<=win.x1 && y+r>=win.y0 && y-r<=win.y1;
  for(const [x,y,w,h,a] of dumpHills){
    if(!visible(x*T,y*T,w*T) || !lesserSprites.slag) continue;
    g.save();g.translate(x*T,y*T);g.rotate(a);
    g.drawImage(lesserSprites.slag,-w*T/2,-h*T/2,w*T,h*T);g.restore();
  }
  if(ART) for(const line of dumpSidings) for(let i=1;i<line.length;i++){
    const [ax,ay]=line[i-1],[bx,by]=line[i],slope=(by-ay)/(bx-ax);
    for(let x=ax;x<bx;x++){
      const y=ay+(x-ax)*slope;
      if(!visible(x*T,y*T,3*T)) continue;
      g.save();g.translate(x*T,y*T);g.transform(1,slope,0,1,0,0);
      drawRailStrip(g,x,-1.5*T-9,3*T+18);g.restore();
    }
  }
  for(const [kind,centres,width] of [['wagon',dumpWagons,5.8],['tank',dumpTanks,2.25]]){
    const sprite=lesserSprites[kind]; if(!sprite) continue;
    for(const [x,y] of centres){
      if(!visible(x*T,y*T,width*T)) continue;
      const w=width*T,h=w*sprite.height/sprite.width;
      g.save();spriteShadow(g,3,2);g.drawImage(sprite,x*T-w/2,y*T-h/2,w,h);g.restore();
    }
  }
}
