// The northern extension is part of the same world grid as both southern regions.
function inGarbage(x,y) {
  return !BEREZKI && BIG && x>=0 && x<PW && y>=0 && y<NORTH_ROWS;
}
const dumpFire = {x:389*T,y:31.6*T};
const dumpHills = [
  [334,84,17,8,-.18],[376,41,13,7,.20],[332,31,16,6,.11],
  [420,23,9,4,-.26],[369,58,8,4,.32]
];
const dumpTanks = [[374,30],[377.3,30]];
const dumpPlaces = [
  ['dump_yard','Кладбище техники',[342,95,363,111],[358,102]],
  ['dump_depot','Перегрузочное депо',[262,30,302,53],[294,50]],
  ['dump_market','Барахолка',[382,23,399,37],[389,33]],
  ['dump_mounds','Шлаковые отвалы',[324,77,344,90],[341,83]],
  ['dump_stop','Старая автостанция',[367,34,375,40],[369,39]],
  ['dump_pumps','Мазутная эстакада',[371,25,381,33],[376,33]],
  ['dump_ditch','Водоотводный коллектор',[316,82,328,90],[322,84]],
  ['dump_checkpoint','Северная застава',[357,9,366,17],[360,14]],
  ['dump_watch','Сторожка весовой',[405,23,416,31],[410,28]],
  ['dump_sorting','Сортировочная станция',[161,47,204,68],[180,60]]
];
// The post, the cemetery entrance and the depot junction lie on the same northbound road.
const dumpHighway=[[367,NORTH_ROWS+2],[367,119],[367,103],
  [366,95],[365,81],[363,66],[363,51],[365,42],[365,30],[362,22],[360,14]];
// The trail stays on the north-west toe of the freight embankment up to the depot deck.
const dumpTrail=[[145,181],[151,178],[165,178],[177,173],[183,162],[188,148],
  [194,135],[200,123],[208,110],[216,99],[225,85],[233,74],[241,61],
  [247,66.52],[252,71],[260,64],[270,58],[279,55],[285,52],[294,50]];
const sortingRoad=[[241,61],[224,63],[207,68],[195,64],[190,61],[180,60],[161,61],[147,64],[132,64],[122,61]];
function easeRailBends(points) {
  const result=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const [x,y]=points[i], [ax,ay]=points[i-1], [bx,by]=points[i+1];
    const enter=Math.hypot(x-ax,y-ay), leave=Math.hypot(bx-x,by-y);
    const trim=Math.min(4,enter*.44,leave*.44);
    for(let j=0;j<=4;j++){
      const before=(1-j/4)**2*trim/enter, after=(j/4)**2*trim/leave;
      result.push([x+(ax-x)*before+(bx-x)*after,y+(ay-y)*before+(by-y)*after]);
    }
  }
  return [...result,points[points.length-1]];
}
// Cubic transitions share a tangent with the track at both ends.
function railCurve(a,b,c,d) {
  const steps=Math.ceil((Math.hypot(b[0]-a[0],b[1]-a[1])+Math.hypot(c[0]-b[0],c[1]-b[1])+Math.hypot(d[0]-c[0],d[1]-c[1]))/1.4);
  const points=[a];
  for(let i=1;i<steps;i++){
    const t=i/steps,u=1-t;
    points.push(a.map((v,j)=>u*u*u*v+3*u*u*t*b[j]+3*u*t*t*c[j]+t*t*t*d[j]));
  }
  return [...points,d];
}
const approachY=x=>77-(x-237)*22/21;
const depotPoints=[241,approachY(241)];
const sidings=[
  [depotPoints,...railCurve([249,approachY(249)],[256,approachY(256)],[263,48],[273,48]),[305,48]],
  [...railCurve(depotPoints,[249,approachY(249)],[248,42],[261,42]),[316,42]],
  [[235,42],[261,42]],
  easeRailBends([[154,railAxis(154)],[160,railAxis(154)+6*(railAxis(155)-railAxis(154))],[166,188.7],[172,187.4],[178,183.5],
   [183,177.5],[187,170],[191,160],[195,149],[200,137],[206,125],
   [213,113],[221,102],[230,88],[237,77],depotPoints]),
  easeRailBends([[81,48],[127,48],[143,48],[155,47],[174,45],[197,45],[207,44.6],[222,42.4],[229,42],[235,42]]),
  [...railCurve([135,48],[142,48],[148,50.6],[156,50.6]),
    ...railCurve([212,50.6],[219,50.6],[224,42],[234,42])],
  [...railCurve([159,50.6],[165,50.6],[169,54.7],[176,54.7]),
    ...railCurve([192,54.7],[199,54.7],[202,50.6],[211,50.6])]
];
const freightLine=sidings[3];
// Intersect the service roads with the same centrelines we render, including
// both branches at the approach. Do this once when the world is constructed.
function levelDecks(road,tracks) {
  const decks=[];
  for(let j=1;j<road.length;j++){
    const [x,y]=road[j-1],rx=road[j][0]-x,ry=road[j][1]-y;
    for(const line of tracks)for(let i=1;i<line.length;i++){
      const [ax,ay]=line[i-1],dx=line[i][0]-ax,dy=line[i][1]-ay;
      const det=rx*dy-ry*dx;
      if(Math.abs(det)<1e-8)continue;
      const along=((ax-x)*dy-(ay-y)*dx)/det, rail=((ax-x)*ry-(ay-y)*rx)/det;
      if(along>=0 && along<1 && rail>=0 && rail<1)
        decks.push({x:x+rx*along,y:y+ry*along,angle:Math.atan2(dy,dx)});
    }
  }
  return decks;
}
const depotServiceRoad=[[311,51],[315.5,46],[315.5,39],[310,36],[304,38],[297,38]];
const freightDecks=[...levelDecks(dumpTrail,sidings),...levelDecks(depotServiceRoad,sidings)];
// Keep the future works beyond a wooded cutting. Its south rim ends north of the old main line.
function cuttingDepth(x,y) {
  return Math.min(80+2*Math.sin(y*.12)-x,72+3*Math.sin(x*.10)-y);
}
function stampFreightBank() {
  // Clear the ballast under the visible branch. The wooded cutting bounds the route.
  for(let i=1;i<freightLine.length;i++){
    const [ax,ay]=freightLine[i-1],[bx,by]=freightLine[i];
    const slope=(by-ay)/(bx-ax),normal=Math.hypot(1,slope);
    for(let x=Math.ceil(ax-.5);x+.5<bx;x++){
      const cy=ay+(x+.5-ax)*slope;
      for(let y=Math.floor(cy-normal);y<=Math.ceil(cy+normal);y++){
        if(Math.abs(y+.5-cy)>.86*normal) continue;
        if(x>165 || tAt(x,y)!==RA) setT(x,y,DI);
      }
    }
  }
}
const wagonWidth=5.75, wagonDepth=1.43;
// Store a wagon on a named horizontal siding. Rail axis, body, collision and PDA
// are derived from this placement. The wheelsets sit underneath the body centre.
function addRailVehicle(siding,x,sprite='wagon',width=wagonWidth,depth=wagonDepth) {
  const line=sidings[siding];
  const segment=line.findIndex(([bx,by],i)=>i>0 && line[i-1][1]===by &&
    line[i-1][0]<=x-width/2 && bx>=x+width/2);
  if(segment<0) throw new Error('No straight track for vehicle at '+x);
  const y=line[segment][1];
  addObj({k:'freightWagon',sprite,x:(x-width/2)*T,y:(y-depth/2)*T,
    w:width*T,h:depth*T,solid:1,opaque:1});
}
function makeGarbage() {
  if (!BIG) return;
  const random=mulberry32(452788);
  // Continuous northern terrain, with open clearings separated by wooded ridges.
  for(let y=0;y<NORTH_ROWS;y++)for(let x=0;x<PW;x++){
    const woodland=.72*vnoise(x+98,y+34,16)+.28*vnoise(x+63,y+70,6);
    const depth=cuttingDepth(x,y);
    const roll=random(), edge=y<2 || x<2 || x>=PW-2 || (depth>=0 && depth<4);
    setT(x,y,edge || roll<Math.max(.018,(woodland-.34)*.97)?TR:roll>.93?BU:GR);
  }
  // Soften the old forest border where the southern maps used to end.
  for(let y=NORTH_ROWS;y<NORTH_ROWS+2;y++)for(let x=3;x<PW-3;x++){
    const cover=vnoise(x+98,y+34,16);
    if(tAt(x,y)===TR && random()>cover*.38) setT(x,y,GR);
  }
  buildLesserRail();
  for(const [id,name,bounds,gate] of dumpPlaces){
    rcClear(...bounds);
    bigLoc(id,{name,gen:name,type:id==='dump_mounds'?'anomaly':'story',
      bounds,entrances:[gate],anchors:{approach:gate}});
  }
  for(const [x,y,w,h] of dumpHills) rcClear(Math.floor(x-w/2),Math.floor(y-h/2),Math.ceil(x+w/2),Math.ceil(y+h/2));
  // A shallow drainage cut runs along the outer toe of the heap. The two
  // banks meet at a dry service ramp beside the concrete pipes.
  for(let x=317;x<=328;x++){
    const mid=86+1.4*Math.sin((x-319)*.4);
    for(let y=83;y<=89;y++){
      const d=Math.abs(y-mid);
      if(d<1.3 && x!==322 && x!==323) setT(x,y,SW);
      else if(d<2.3) setT(x,y,DI);
    }
  }
  bigPath(dumpHighway,1.55,AS);
  for(let i=1;i<dumpHighway.length;i++){
    const [ax,ay]=dumpHighway[i-1],[bx,by]=dumpHighway[i];
    for(let row=by;row<ay && row<NORTH_ROWS;row++) roadX[row]=Math.round(lerp(bx,ax,(row-by)/(ay-by)));
  }
  bigPath(dumpTrail,1.25);
  bigPath(sortingRoad,1.35);
  const lanes=[
    [[367,105],[360,106],[358,102],[354,102],[348,102],[348,105.9]],
    [[365,96],[361,92],[355,93],[353,96],[350,100],[348,102]],
    [[360,106],[356,108],[354,111],[349,113],[342,111],[337,106],[331,94],[323,90],[322,87],[322,84]],
    [[363,51],[356,51],[345,48],[332,49],[322,51],[311,51],[299,51],[291,51]],
    depotServiceRoad,
    [[294,50],[287,51.5],[280,51.5],[274,50],[265,49]],
    [[315.5,39],[313,34],[311,26],[318,25],[332,33],[346,24],[360,14]],
    [[365,42],[369,39],[378,36],[389,33],[397,32]],
    [[362,22],[369,26],[370.5,31],[373,33],[376,33],[381,33],[389,33]],
    [[389,33],[398,33],[405,29],[410,28]],
    [[322,84],[322,66],[322,51]],[[341,83],[352,78],[363,66]]
  ];
  for(const line of lanes) bigPath(line,1.2);
  for(const [x,y,w,h,doors,mat] of [
    [264,32,28,13,[[0,9],[0,10],[27,9],[27,10],[21,12],[22,12]],'depot'],
    [294,32,7,5,[[3,4]],'conc'],[298,44,6,3,[[2,2]],'slate'],
    [383,23,8,5,[[4,4]],'slate'],[393,26,6,4,[[2,3]],'plank'],
    [391,34,8,5,[[4,0]],'ruin'],[342,104,5,5,[[4,2]],'conc'],
    [405,23,8,4,[[5,3]],'conc'],[369,34,6,3,[[2,2]],'slate'],
    [357,10,5,3,[[2,2]],'conc'],
    [230,55,6,4,[[3,3]],'conc'],[174,63,15,6,[[4,0],[11,0]],'slate'],
    [197,57,5,4,[[2,3]],'plank'],[123,55,5,4,[[2,3]],'conc']
  ]) {
    for(let row=y-2;row<=y+h+1;row++)for(let col=x-2;col<=x+w+1;col++){
      if(tAt(col,row)===TR || tAt(col,row)===BU) setT(col,row,GR);
    }
    house(x,y,w,h,doors,mat==='plank'||mat==='depot'?BR:CO,mat==='ruin'?.28:0,mat,random);
    HOUSES[HOUSES.length-1].ok='dump_'+x+'_'+y;
  }
  // The two sidings diverge from the existing embankment and end at wheel stops.
  rcClear(245,40,262,48);
  for(const line of sidings) bigPath(line,1.1);
  stampFreightBank();
  // Clear the same corridor the sleepers and ballast occupy, also between tile centres.
  for(const line of sidings) for(let i=1;i<line.length;i++){
    const [ax,ay]=line[i-1],[bx,by]=line[i], dx=bx-ax,dy=by-ay;
    for(let x=Math.floor(ax-2);x<=Math.ceil(bx+2);x++){
      for(let y=Math.floor(Math.min(ay,by)-2);y<=Math.ceil(Math.max(ay,by)+2);y++){
        const t=tAt(x,y);if(t!==TR && t!==BU)continue;
        const along=clamp(((x+.5-ax)*dx+(y+.5-ay)*dy)/(dx*dx+dy*dy),0,1);
        if(Math.hypot(x+.5-ax-along*dx,y+.5-ay-along*dy)<1.95)setT(x,y,GR);
      }
    }
  }
  for(const spur of [[[233,59],[233,62]],[[178,62],[178,60]],[[199,61],[199,65]],[[125,59],[125,62]]])
    bigPath(spur,1.1);
  for(const [track,x] of [[0,280.5],[0,287.1],[1,297.3],[1,304.3],[1,311.3]]) addRailVehicle(track,x);
  addRailVehicle(2,243,'shunter',5.2,1.45);
  for(const x of [181.5,188.3]) addRailVehicle(6,x);
  addObj({k:'scrapCrane',x:246*T,y:46*T,w:1.65*T,h:1.2*T,solid:1,opaque:1});
  for(const [x,y] of dumpTanks)
    addObj({k:'installation',x:(x-.87)*T,y:(y-.87)*T,w:1.74*T,h:1.74*T,solid:1});
  for(const fence of [
    ['mesh',342,95,351,95],['mesh',356,95,363,95],['mesh',342,95,342,103],
    ['mesh',344,110.5,352,110.5],['mesh',357,110.5,363,110.5],
    ['mesh',262,30,301,30],['mesh',262,30,262,39],
    ['mesh',265,53,277,53],['mesh',300,53,305,53],
    ['concreteWire',356,9.5,361,9.5],['concreteWire',364,9.5,366,9.5],
    ['mesh',372,25,380,25],['mesh',380,25,380,29],
    ['mesh',170,69.8,194,69.8],['mesh',170,64,170,69.8],['mesh',194,67,194,69.8]
  ]) CORDON_FENCES.push(fence);
  for(const [x,y,w,h] of [[344,97,3.9,1.5],[353,98,3.9,1.5],[372.6,40.7,3.9,1.5]])
    addObj({k:'bus',x:x*T,y:y*T,w:w*T,h:h*T,solid:1,opaque:1});
  CORDON_DETAILS.push(
    ['c1_trace_sleepers',191,146.5,56,-.25],['c1_trace_reel',211,109,31,-.15],
    ['c1_trace_pipes',227.5,84.8,60,-.3],['c1_yard_car',241,57,63,-.27],
    ['c1_trace_sleepers',162,57.4,52,.09],['c1_trace_reel',172.4,65.6,33,-.15],
    ['c1_crate_army',189.6,59.5,29,-.04],['c1_trace_pipes',192,64,57,.08],
    ['c1_bricks',130,58.5,28,-.12],['c1_rock0',79,45.7,106,-.3],
    ['c1_rock1',79.5,49.3,86,.22],['c1_trace_sleepers',82.6,50.4,46,.35],
    ['c1_trace_pipes',319,85.4,66,.29],['c1_trace_pipes',325.5,87.5,56,-.18],
    ['c1_bricks',324.7,85.4,30,.24],['c1_sandbags',363.3,12,42,-.17],
    ['c1_yard_car',370,109.8,72,-.18],['c1_trace_wheel',369.1,108.7,24,.13],
    ['c1_trace_pipes',362,87.4,64,-.22],['c1_yard_car',359.8,64.3,66,.24],
    ['c1_tractor',359.7,96.8,83,-.42],['c1_yard_car',351,104.5,74,.27],
    ['c1_yard_car',351.6,107.3,68,-.32],['c1_tires',361,100,35,.2],
    ['c1_trace_wheel',349.8,99.1,21,.12],['c1_junk',355,104,30,-.22],
    ['c1_trace_pipes',361.5,108,68,.35],['c1_trace_reel',344.8,102,32,.13],
    ['c1_trace_sleepers',301,50,57,.12],['c1_crate_army',268,37,31,0],
    ['c1_trace_reel',294,45,34,-.04],['c1_trace_pipes',371.5,34,52,.12],
    ['c1_barrel',379,27,24,0],['c1_trace_kettle',388.2,31.6,20,.1],
    ['c1_crate',385,25,32,.04],['c1_barrel',392,32.1,23,.21],
    ['c1_bricks',400.5,39,32,-.19],['c1_sandbags',406.5,31,41,.08],
    ['c1_tires',375.8,36.3,34,.24],['c1_trace_reel',379.2,38,25,.1]
  );
  // Small side clearings with an open south approach; no structures on the roads.
  rcClear(384,96,390,104);
  rcClear(302,74,308,82);
  CORDON_DETAILS.push(['c1_trace_pipes',386.5,96.5,61,-.17],
    ['c1_tires',389.5,98,26,.31],['c1_rock0',303,75,48,.4]);
  for(const [i,x,y] of [[1,386.5,98.5],[2,388.5,98.5],[3,387.5,99.5]])
    DOGDEF.push({sid:'dump_dog'+i,pack:'dump_pipes',x,y});
  for(const [i,x,y] of [[1,304.5,77.5],[2,306.5,77.5]])
    RC1.boars.push({sid:'dump_boar'+i,pack:'dump_hollow',at:[x,y]});
  WORLD_FIRES.push(dumpFire);
  addObj({k:'fire',x:dumpFire.x-10,y:dumpFire.y-10,w:20,h:20,solid:1});
  for(const [stash,k,x,y,loot] of [
    ['dump_manifest','safe',267,35,{money:95,bandage:2}],
    ['dump_tools','crate',344.1,105.5,{a9:12,antirad:1}],
    ['dump_drain','hiding',324.3,84.2,{medkit:1,energy:1}]
  ]) addObj({k,stash,x:x*T,y:y*T,w:24,h:18,solid:k!=='hiding',loot});
  for(const [sid,name,x,y,fac,wpn] of [
    ['dump_loader','Клин',393,35.5,'loner','w_obrez'],
    ['dump_sentry','Обходчик',362.5,14.6,'loner','w_obrez'],
    ['dump_scale','Латунь',386.4,25.4,'loner','w_pm'],
    ['dump_sorter','Скоба',390.3,31.4,'loner','w_pm'],
    ['dump_driver','Букса',355,102.2,'loner','w_obrez'],
    ['dump_band1','Шкурник',273,38,'bandit','w_aps'],
    ['dump_band2','Крюк',297,34,'bandit','w_akms'],
    ['dump_band3','Копоть',290.1,46,'bandit','w_pm']
  ]) NPCDEF.push({sid,name,x:x+.5,y:y+.5,fac,wpn,named:1,stay:1,sit:sid==='dump_sorter',localFire:dumpFire});
  for(const [x,y] of [[334,84],[376,41],[332,31]]) rads.push({x:x*T,y:y*T,r:85,p:2.2});
  ANOM0.push({id:'dump_sink',k:'g',x:325.5*T,y:86.1*T,r:39},
    {id:'dump_coil',k:'e',x:379*T,y:29*T,r:29});
  ARTS0.push({key:'dump_coil',id:'art_bengal',x:379.5*T,y:29.6*T});
}
function freightBallast(g) {
  if(!PATS.freightBallast){
    const h=3*T+18,s=ART.m.sprites.rail;
    const strip=document.createElement('canvas');
    strip.height=h;strip.width=Math.round(h*s.rect[2]/s.rect[3]);
    const ctx=strip.getContext('2d');
    ctx.drawImage(ART.images[s.atlas],...s.rect,0,0,strip.width,h);
    const edge=ctx.createLinearGradient(0,0,0,h);
    for(const [at,alpha] of [[0,0],[.18,1],[.82,1],[1,0]])edge.addColorStop(at,'rgba(0,0,0,'+alpha+')');
    ctx.globalCompositeOperation='destination-in';ctx.fillStyle=edge;ctx.fillRect(0,0,strip.width,h);
    PATS.freightBallast=g.createPattern(strip,'repeat-x');
  }
  return PATS.freightBallast;
}
// The clipping plane at a joint bisects the bend. Both ribbons end on the
// same line across the ballast, even when a branch runs nearly north-south.
const railSegments=new WeakMap();
function trackSegments(line) {
  if(railSegments.has(line))return railSegments.get(line);
  const segments=[];
  let phase=line[0][0]*T;
  for(let i=1;i<line.length;i++){
    const [x,y]=line[i-1],[bx,by]=line[i],dx=bx-x,dy=by-y;
    const len=Math.hypot(dx,dy)*T,angle=Math.atan2(dy,dx);
    segments.push({x:x*T,y:y*T,bx:bx*T,by:by*T,len,angle,phase});
    phase+=len;
  }
  const phaseOffset=line===lesserMainTrack ? WEST*T-phase : 0;
  for(let i=0;i<segments.length;i++){
    const s=segments[i];
    s.phase+=phaseOffset;
    s.start=Math.tan((s.angle-(segments[i-1]?.angle??s.angle))/2);
    s.end=Math.tan((s.angle-(segments[i+1]?.angle??s.angle))/2);
  }
  railSegments.set(line,segments);
  return segments;
}
function drawFreightTrack(g,line,win,steelOnly=false) {
  const half=(3*T+18)/2, pattern=ART && freightBallast(g);
  for(const s of trackSegments(line)){
    const pad=half*(1+Math.max(Math.abs(s.start),Math.abs(s.end)))+1;
    if(win && (Math.max(s.x,s.bx)+pad<win.x0 || Math.min(s.x,s.bx)-pad>win.x1 ||
        Math.max(s.y,s.by)+pad<win.y0 || Math.min(s.y,s.by)-pad>win.y1))continue;
    g.save();g.translate(s.x,s.y);g.rotate(s.angle);
    g.beginPath();g.moveTo(-s.start*half-.35,-half);g.lineTo(s.len-s.end*half+.35,-half);
    g.lineTo(s.len+s.end*half+.35,half);g.lineTo(s.start*half-.35,half);g.closePath();g.clip();
    if(steelOnly){
      g.beginPath();for(const y of [-17,7])g.rect(-pad,y,s.len+2*pad,5);
      g.clip();
    }
    g.translate(-s.phase,-half);
    if(!pattern){
      if(!steelOnly){
        g.fillStyle='#524d43';g.fillRect(s.phase-pad,0,s.len+2*pad,2*half);
        g.fillStyle='#44392e';
        for(let x=Math.floor((s.phase-pad)/14)*14;x<s.phase+s.len+pad;x+=14)g.fillRect(x,half-25,5,47);
      }
      g.fillStyle='#8a8171';
      for(const y of [-16,8])g.fillRect(s.phase-pad,half+y,s.len+2*pad,2);
      g.restore();continue;
    }
    g.fillStyle=pattern;
    g.fillRect(s.phase-pad,0,s.len+2*pad,2*half);
    if(perspective && !steelOnly && win)ballastSlope(g,s.phase-pad,0,s.len+2*pad,2*half);
    g.restore();
  }
}
function drawDepotDeck(g,deck) {
  g.save();g.translate(deck.x*T,deck.y*T);g.rotate(deck.angle);
  for(const [y,h] of [[-48,29],[-11,17],[13,35]]){
    artFill(g,'floor_wood',-52,y,104,h);
    g.fillStyle='rgba(45,38,31,.35)';g.fillRect(-52,y,104,h);
    for(let x=-51;x<52;x+=12)g.fillRect(x,y,1,h);
  }
  g.restore();
}
function drawWorldTracks(g,win) {
  if(!BIG)return;
  const visible=(x,y,r)=>!win || x+r>=win.x0 && x-r<=win.x1 && y+r>=win.y0 && y-r<=win.y1;
  if(!win || win.x0<=WEST*T+60)drawLesserRail(g,win);
  if(!win || (win.x0<318*T && win.x1>78*T && win.y0<192*T)){
    for(const line of sidings)drawFreightTrack(g,line,win);
    for(const deck of freightDecks)if(ART && visible(deck.x*T,deck.y*T,4*T))drawDepotDeck(g,deck);
    for(const line of sidings)drawFreightTrack(g,line,win,true);
    if(visible(165*T,188*T,16*T))drawFreightTrack(g,lesserMainTrack,{
      x0:Math.max(151*T,win?.x0??0),x1:Math.min(180*T,win?.x1??PW*T),
      y0:win?.y0??0,y1:win?.y1??WH
    },true);

  }
  if(!ART || !C1)return;
  const row=NORTH_ROWS+57,cy=(row+.5)*T;
  // The ruined highway bridge is drawn above the road separately. The two
  // culverts and the stream have a short deck carrying the track over the gap.
  for(const [start,end] of [[WEST+71,WEST+74],[WEST+207,WEST+209],[STREAM_X(row)-1,STREAM_X(row)+2]]){
    const left=start*T,w=(end-start)*T;
    if(!visible(left+w/2,cy,w/2+40))continue;
    g.save();g.fillStyle='rgba(25,23,20,.4)';g.fillRect(left+3,cy-21,w,55);
    for(const side of [-1,1]){
      const edge=cy+side*24;
      artFill(g,'wall_concrete',left-4,edge-3,w+8,6);
      g.fillStyle='#52493e';g.fillRect(left,edge-1,w,2);
    }
    g.beginPath();g.rect(left,cy-22,w,44);g.clip();
    for(let x=start;x<end;x++){
      g.save();g.translate(x*T,cy);drawRailStrip(g,x,-1.5*T-9,3*T+18);g.restore();
    }
    g.restore();
  }
}
function drawDumpDetails(g,win) {
  if(!BIG || (win && (win.y0>(NORTH_ROWS+60)*T || win.x0>425*T || win.x1<77*T))) return;
  const visible=(x,y,r)=>!win || x+r>=win.x0 && x-r<=win.x1 && y+r>=win.y0 && y-r<=win.y1;
  for(const [x,y,w,h,a] of dumpHills){
    if((perspective && win) || !visible(x*T,y*T,w*T) || !lesserSprites.slag) continue;
    g.save();g.globalAlpha=.66;g.translate(x*T,y*T);g.rotate(a);
    g.drawImage(lesserSprites.slag,-w*T/2,-h*T/2,w*T,h*T);g.restore();
  }
  for(const [kind,centres,width] of [['tank',dumpTanks,2.25]]){
    const sprite=lesserSprites[kind]; if(!sprite) continue;
    for(const [x,y] of centres){
      if((perspective && win) || !visible(x*T,y*T,width*T)) continue;
      const w=width*T,h=w*sprite.height/sprite.width;
      g.save();spriteShadow(g,3,2);g.drawImage(sprite,x*T-w/2,y*T-h/2,w,h);g.restore();
    }
  }
}
