// Coordinates are in walking tiles. Display, collision and tracks use the same survey.
const atlasSites=[
  ['Замёрзшее озеро',294.34,62.5],['Охотничья вышка',62.08,98.08],['Склад',132.4,152.2],
  ['Рыбацкий посёлок',400,107],['Сотый километр',260,189],['Замёрзшее болото',116.64,269.32],
  ['Берёзки',419,305],['Старая водокачка',170.8,355.64],['Хутор',95.52,435.36],
  ['Разрушенная военная база',260,456]
];
const baseRoad=[[260,456],[257.96,392.62],[264.12,332.03],[257.08,265.8],[261.48,225.22],[260,193],[260,189.1]];
const atlasRoutes=[
  baseRoad,
  [[257.08,265.8],[298.78,271.08],[341.31,287.8],[384.12,292.2],[404,291],[419,289],[419,287]],
  [[404,291],[410,294],[418,296],[423,297]],
  [[270,174.5],[276.44,164.44],[301.32,154.19],[324.81,148.68],[345.12,130.45],[369.24,119.2],[382,110],[392,106.8]],
  [[276.44,164.44],[219.73,156.52],[181.04,154.58],[132.4,152.2],[126,152.35],[123.3,151.75],[120.86,149.6],[100.8,133.24],[65,101.7],[61,99.8],[61,98.8]],
  [[264.12,332.03],[226.37,335.07],[203.15,345.96],[170.8,355.64],[142.83,383.4],[119.79,409.22],[95.52,435.36]],
  [[203.15,345.96],[180.48,321.89],[151.44,295.72],[116.64,269.32]],
  [[257.96,392.62],[219.73,408.61],[169.04,423.04],[95.52,435.36]],
  ...shoreLanes,...baseLanes,...pumpPaths,...hamletLanes,[[132.4,152.2],[131.5,149.5]]
];
const lakeShape=[290.27,62.86,122.5,59.14],marshShape=[117.52,270.2,46,31];
const oldBoats=[[383.3,96.3,.29],[386,93.9,.33],[387.6,91.3,.25]];
const playYard={x:424,y:295};
const gatePosts=[[256.6,456],[263.4,456]];
const atlasChunks=new Map(),atlasChunk=512;

function basinRadius(x,y,[cx,cy,rx,ry]){
  const u=(x-cx)/rx,v=(y-cy)/ry,a=Math.atan2(v,u);
  return Math.hypot(u,v)/(1+.034*Math.sin(5*a)+.023*Math.cos(8*a));
}
const neighbouringTrunks=[[1,0],[0,1],[1,1],[-1,1],[2,0],[0,2]];
function wildTreeAt(x,y){
  const edge=Math.min(Math.abs(x),Math.abs(y),Math.abs(x-district.width),Math.abs(y-district.height));
  const stand=.62*vnoise(x-27,y+14,23)+.38*vnoise(x+17,y-42,8);
  const density=.042+.17*stand+.04*clamp(1-edge/10,0,1);
  const rank=hash2(x,y);
  return rank<density && !neighbouringTrunks.some(([u,v])=>hash2(x-u,y-v)<rank);
}
// Exterior scenery samples absolute tile coordinates. The loaded navigation
// grid alone determines how far an actor can travel in this district.
function outdoorTreeAt(x,y){
  if(x>=1 && x<district.width-1 && y>=1 && y<district.height-1)return tAt(x,y)===TR;
  if(y>=174 && y<190 && x<district.width)return false;
  return wildTreeAt(x,y) && basinRadius(x,y,lakeShape)>1.02;
}
function seedAtlasTerrain(){
  map.fill(VO);
  for(let y=1;y<district.height-1;y++)for(let x=1;x<district.width-1;x++){
    let cell=GR;
    if(basinRadius(x,y,marshShape)<1 || inMarshChannel(x+.5,y+.5))cell=SW;
    else if(basinRadius(x,y,lakeShape)>1.02 && wildTreeAt(x,y))cell=TR;
    setT(x,y,cell);
  }
  // Clear every route shoulder and doorway before planting the woods.
  const clear=(x,y,w,h)=>{
    for(let v=Math.max(1,Math.floor(y));v<Math.min(district.height-1,y+h);v++)
      for(let u=Math.max(1,Math.floor(x));u<Math.min(district.width-1,x+w);u++)
        if(tAt(u,v)===TR)setT(u,v,GR);
  };
  for(const route of atlasRoutes){
    for(let i=1;i<route.length;i++){
      const [x,y]=route[i-1],[u,v]=route[i],n=Math.ceil(Math.hypot(u-x,v-y));
      for(let j=0;j<=n;j++)clear(x+(u-x)*j/n-3,y+(v-y)*j/n-3,6,6);
    }
  }
  clear(1,174,district.width-2,16);clear(404,273,29,43);clear(383,92,19,18);
  for(const r of [...villageCabins,...hamletRooms])clear(r.x-1.5,r.y-1.5,r.w+3,r.h+3);
  clear(396,106,7,7);clear(123,141,17,11);clear(57,91,9,11);
  clear(258,329.52,6,4);clear(273,161,3,3);clear(106,426,5,6);
  clear(237,454,47,35);clear(150,340,28,14);
}
const atlasProps=[];
function atlasProp(key,x,y,width,worldHeight,{angle=0,flip=1}={}){
  const p={key,x,y,width,worldHeight,angle,flip};
  atlasProps.push(p);return p;
}
function preparePropShadows(){
  for(const prop of atlasProps){
    if(prop.key==='gate'){prop.height=84;prop.foot=.5;prop.depth=prop.y+26;continue;}
    if(prop.key==='waterTower'){prop.height=160;prop.foot=.875;prop.depth=prop.y+18;continue;}
    const image=district.images[prop.key];
    prop.height=prop.width*image.height/image.width;
    if(yardEquipment.has(prop.key)){prepareYardEquipment(prop,image);continue;}
    // The foot line lies below the centre in the photo. Its world position stays fixed.
    prop.foot=prop.key==='gate'?.86:.65;
    prop.depth=prop.y+prop.height*(1-prop.foot);
    if(prop.key==='netrack' || prop.key==='wood'){
      prop.foot=.88;
      prop.depth=prop.y;
      // Bury the lowest part of the posts. The new contact line is the pivot for parallax.
      const c=winterCanvas(image.width,image.height),b=c.getContext('2d');
      b.drawImage(image,0,0);
      const line=new Path2D();
      for(let x=0;x<=c.width;x++){
        const u=x/c.width;
        line.lineTo(x,c.height*(prop.foot+.022*Math.sin(18*u+prop.x)+.013*Math.sin(47*u)));
      }
      line.lineTo(c.width,c.height);line.lineTo(0,c.height);line.closePath();
      b.globalCompositeOperation='destination-out';b.fill(line);
      b.strokeStyle='#0006';b.lineWidth=c.width/prop.width;b.stroke(line);prop.exposed=c;
    }
    if(prop.burial)freezeHull(prop,image);
    const c=winterCanvas(Math.ceil(prop.width),Math.ceil(prop.height)),g=c.getContext('2d');
    g.drawImage(prop.exposed||image,0,0,c.width,c.height);g.globalCompositeOperation='source-in';
    g.fillStyle='#344453';g.fillRect(0,0,c.width,c.height);prop.shadow=c;
  }
  atlasProps.sort((a,b)=>a.depth-b.depth);
}
// Follow the lower silhouette column by column: the straight stern, pointed bow
// and overturned keel each meet the ice at a different height.
function freezeHull(p,image){
  const c=winterCanvas(image.width,image.height),g=c.getContext('2d');g.drawImage(image,0,0);
  const pixels=g.getImageData(0,0,c.width,c.height).data,line=[];
  for(let x=0;x<c.width;x++){
    let top=0,bottom=c.height-1;
    while(top<=bottom && pixels[(top*c.width+x)*4+3]<100)top++;
    while(bottom>top && pixels[(bottom*c.width+x)*4+3]<100)bottom--;
    if(bottom<=top)continue;
    const u=x/c.width;
    const drift=p.burial+.08*Math.sin(8*u+p.x)+.025*Math.sin(21*u)+.018*Math.sin(42*u);
    line.push([x,bottom-(bottom-top)*drift]);
  }
  const cut=new Path2D();
  for(const [x,y] of line)cut.lineTo(x,y);
  cut.lineTo(c.width,c.height);cut.lineTo(0,c.height);cut.closePath();
  g.globalCompositeOperation='destination-out';g.fill(cut);
  g.strokeStyle='#0009';g.lineWidth=2;g.stroke(cut);
  // Ice haze climbs a little above the snow line, leaving the high gunwale exposed.
  g.globalCompositeOperation='source-atop';g.strokeStyle='#d2e0e589';g.lineWidth=6;g.stroke(cut);
  g.strokeStyle='#b7cbd747';g.lineWidth=13;g.stroke(cut);p.exposed=c;
  p.iceLine=line.filter((_,i)=>i%3===0).map(([x,y])=>[(x/c.width-.5)*p.width,(y/c.height-p.foot)*p.height]);
}
function paintFrozenBerth(g,p){
  g.save();g.translate(p.x,p.y);g.rotate(p.angle);
  const pts=p.iceLine,drift=new Path2D();
  for(const [x,y] of pts)drift.lineTo(x,y-1.6);
  for(let i=pts.length-1;i>=0;i--){
    const [x,y]=pts[i],u=i/(pts.length-1);
    drift.lineTo(x+2*Math.sin(u*4),y+1+Math.sin(Math.PI*u)*(8+4*Math.sin(8*u+p.y)));
  }
  drift.closePath();
  g.save();g.clip(drift);
  g.globalAlpha=.75;g.fillStyle=g.createPattern(district.snow,'repeat');g.fillRect(-p.width,-p.height,2*p.width,p.height*2);
  const edge=new Path2D();for(const [x,y] of pts)edge.lineTo(x,y);
  g.strokeStyle='#f1f4ee99';g.lineWidth=3.1;g.stroke(edge);g.restore();
  const rand=mulberry32(Math.floor(p.x));
  for(let i=0;i<16;i++){
    const [x,y]=pts[Math.floor(rand()*pts.length)],size=1+rand()*3;
    shoreEllipse(g,x+rand()*4,y+4+rand()*7,size,size*.42,'#e0e6e07c',rand()*.7);
  }
  // A few hairline fractures issue from the hull into the surrounding ice.
  for(const i of [1,pts.length-3]){
    const [x,y]=pts[i],dir=Math.sign(x),len=12+rand()*10;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+dir*6,y+2);g.lineTo(x+dir*len,y+8);g.lineTo(x+dir*(len+5),y+7);
    g.lineWidth=.8;g.strokeStyle='#dce7ef9e';g.stroke();
  }
  g.restore();
}
function paintPropShadow(g,p){
  if(!SHADOWS || p.burial)return;
  if(yardEquipment.has(p.key)){paintEquipment(g,p,true,true);return;}
  if(p.key==='gate'){drawBaseGate(g,p,true,true);return;}
  if(p.key==='waterTower'){
    for(const [dx,dy] of towerFeet)beam(g,p.x+dx,p.y+dy,p.x+dx+29,p.y+dy+16,3,'#48566840');
    shoreEllipse(g,p.x+42,p.y+23,42,26,'#49586a40',.2);return;
  }
  g.save();g.translate(p.x,p.y);g.rotate(p.angle);
  // Low hulls rest on the ice. Tall open frames cast the outline of their uprights.
  if(p.key==='netrack' || p.key==='wood'){
    g.transform(p.flip,0,-.27,-.21,0,0);
    g.filter='blur(2px)';g.globalAlpha=.20;
  }else{
    g.transform(p.flip,0,-.42,.53,3,6);g.globalAlpha=.29;
  }
  g.drawImage(p.shadow,-p.width/2,-p.foot*p.height,p.width,p.height);g.restore();
}
function drawAtlasProp(g,p,mapView=false){
  if(yardEquipment.has(p.key)){paintEquipment(g,p,mapView);paintYardFooting(g,p,true);return;}
  if(p.key==='waterTower'){drawWaterTower(g,p,mapView);return;}
  if(p.key==='gate'){drawBaseGate(g,p,mapView);return;}
  if(p.westDeck){paintLookout(g,mapView);if(mapView || !S.flags.onLookout)paintLookout(g,mapView,true);return;}
  if(p.wall){paintCutWall(g,p,mapView);return;}
  if(p.item || p.panel){paintRaisedScenery(g,p,mapView);return;}
  const h=p.height;
  const [dx,dy]=winterParallax(p.x,p.y,p.worldHeight,mapView);
  // Rotate the photograph first in world space. A sideways boat must still
  // lean away from the camera in world axes, with its ice line held in place.
  const cs=Math.cos(p.angle),sn=Math.sin(p.angle),rise=h*p.foot;
  g.save();g.translate(p.x,p.y);
  g.transform(cs*p.flip,sn*p.flip,-sn-dx/rise,cs-dy/rise,0,0);
  g.drawImage(p.exposed||district.images[p.key],-p.width/2,-p.foot*h,p.width,h);g.restore();
  if(p.key==='netrack' || p.key==='wood'){
    // Foreground crust stays at ground level when the roof shifts with the camera.
    g.save();g.globalAlpha=.54;
    snowDrift(g,p.x-p.width*.43-1,p.y+1.5,6,2,-.13,33);
    snowDrift(g,p.x+p.width*.43+2,p.y+1,8,2,-.26,13);
    if(p.key==='wood')snowDrift(g,p.x+p.width*.13,p.y+.8,13,3,-.08,36);
    g.restore();
  }
}
const pumpCulvert={x:264.05*T,y:331.56*T,half:2.24*T};
const hamletWoodpile={x:108.15*T,y:428.8*T};
function makeRouteLandmarks(){
  for(const side of [-1,1])interiorObject('culvertRim',pumpCulvert.x+side*pumpCulvert.half,pumpCulvert.y+side*4,12,16);
  for(const [x,y,label] of [[261.2,330.81,'НАСОСНАЯ'],[275.05,162.7,'СКЛАД']]){
    const post=interiorObject('waypost',x*T,y*T,4,5);
    post.boardLabel=label;post.west=true;
  }
  const pile=hamletWoodpile;
  interiorObject('woodStack',pile.x,pile.y-5,60,19);
  atlasProp('wood',pile.x,pile.y+3.5,67,42);
}
function paintRoadCulvert(g){
  const {x,y,half}=pumpCulvert;
  const spr=ART.m.sprites.c1_trace_pipes,[u,v]=spr.rect;
  for(const side of [-1,1]){
    const lip=x+side*half,bed=y+side*4;
    g.save();g.translate(lip,bed);g.scale(side,1);
    // Meltwater has cut a shallow ditch into each verge. The packed crown
    // of the road passes over the pipe and stays clear for walking.
    const rand=mulberry32(side+71);
    const count=side<0?17:26,curve=side<0?-.19:.34;
    for(let n=0;n<count;n++){
      const along=n*2.65,cy=Math.sin(n*.22)*3+n*curve;
      packedSnow(g,along,cy,16-n*.25,8-n*.11,.16);
    }
    for(let i=0;i<45;i++){
      const u=rand()*count*2.4,v=rand()*9-4+Math.sin(u*.085)*3+u*curve/2.65;
      shoreEllipse(g,u,v,1+rand()*3,.35+rand(),i%4?'#89999979':'#c2cdd09c',-.12);
    }
    for(const j of [-1,1])snowDrift(g,18,j*9,31,5,j*.12,36+j);
    // Just the flared mouth of the original rusted pipe is exposed. Its
    // cut edge points out into the ditch and its sleeve disappears in snow.
    g.drawImage(ART.images[spr.atlas],u+74,v+75,31,24,-13,-8,18,15);
    // Stones hold the shoulder above the mouth. Keep the throat and its
    // shadow clear, with loose fill gathering along the lower rim.
    for(const [ox,oy,w] of [[-7,-7,11],[-11,4,8],[-3,6.5,7],[8,7,4]]){
      const sz=w*(.86+.2*rand());
      ART.draw(g,'c1_rock2',ox,oy,sz,sz*.62);
      snowDrift(g,ox-1,oy-1,Math.ceil(sz*.38),2,-.15,68+Math.round(w));
    }
    snowDrift(g,-11,-2,11,9,-.17,51);
    for(let j=0;j<13;j++){
      const ax=8+rand()*40,ay=8+rand()*5;
      beam(g,ax,ay,ax+rand()*4,ay-2-rand()*6,.7,'#81755b9c');
    }
    g.restore();
  }
}
function makeAtlasProps(){
  makeRouteLandmarks();
  for(const [i,[x,y,angle]] of oldBoats.entries()){
    const width=[106,98,111][i];
    const boat=atlasProp(['boat','skiff','keel'][i],x*T,y*T,width,5,{angle});
    boat.burial=[.24,.37,.29][i];
    // Three short sections follow the tapered, angled hull without filling its bounding box.
    for(const [offset,len,depth] of [[-.32,.24,19],[0,.40,27],[.32,.23,17]])
      interiorObject('beachedBoat',boat.x+Math.cos(angle)*offset*width,boat.y+Math.sin(angle)*offset*width,len*width,depth);
  }
  const x=playYard.x*T,y=playYard.y*T;
  atlasProp('swing',x-29,y,99,75);
  // The seats and swept space join both A-frames at the player's foot level.
  for(const sign of [-1,1])for(const [offset,v] of [[33,-10],[46,14]])
    interiorObject('yardUpright',x-29+sign*offset,y+v,5,5);
  for(const u of [-20,20])interiorObject('yardSeat',x-29+u,y,22,10);
  atlasProp('slide',x+64,y+1,34,56);
  interiorObject('yardFrame',x+64,y-8,32,62,{fixture:'slide'});
  atlasProp('roundabout',x-94,y+94,81,29);
  for(const [offset,w,h] of [[-22,48,16],[0,77,32],[22,48,16]])
    interiorObject('yardFrame',x-94,y+94+offset-4,w,h,{fixture:'roundabout'});
  atlasProp('seesaw',x+71,y+98,102,33);
  interiorObject('yardFrame',x+71,y+96,99,19,{fixture:'seesaw'});
  atlasProp('baseLorry',255.55*T,468.6*T,124,56);
  interiorObject('parkedLorry',255.55*T,468.6*T-8,117,46);
  for(const [gx,gy] of gatePosts){
    const sign=gx<260?-1:1;
    atlasProp('gate',gx*T,gy*T,87,53,{flip:-sign});
    interiorObject('gatePier',gx*T,gy*T,22,22);
    for(let step=0;step<7;step++){
      const t=(step+.5)/7;
      interiorObject('gateLeaf',gx*T-sign*(9+32*t),gy*T+2+49*t,6.4,8.5);
    }
  }
  atlasProp('netrack',netRack.x,netRack.y+10,89,46);
  atlasProp('roastspit',shoreFire.x,shoreFire.y+2,47,22);
  const pile=tilePoint(406.8,105.35);
  atlasProp('wood',pile.x,pile.y+6,54,38);
  interiorObject('woodStack',pile.x,pile.y,51,16);
  atlasProp('wood',woodStack.x+woodStack.w/2,woodStack.y+woodStack.h-1,67,42);

}
function atlasPlace(x,y){
  let nearest=atlasSites[0],gap=Infinity;
  for(const p of atlasSites){const d=Math.hypot(x-p[1],y-p[2]);if(d<gap){nearest=p;gap=d;}}
  if(basinRadius(x,y,lakeShape)<1)return atlasSites[0][0];
  if(inMarshChannel(x,y) || basinRadius(x,y,marshShape)<1)return 'Замёрзшее болото';
  return gap<42?nearest[0]:'Зимняя дорога';
}
function upgradePrototypeAtlas(d){
  if(d.flags.atlasLayout)return;
  function offset(x,y){
    if(x>=58)return [700,0]; // detached upper floors
    if(y<19.95 && (x>=42 || y<15))return [510,131];
    if(y<=33 || y<47 && (x<14 || x>36))return [340,233];
    if(y<46)return [562,390]; // abandoned block was northwest of the occupied one
    return [559,350];
  }
  for(const e of [d,...d.dyn.npcs,...(d.flags.fieldBodies||[])]){
    const [dx,dy]=offset(e.x/T,e.y/T);e.x+=dx*T;e.y+=dy*T;
  }
  for(const key of Object.keys(d.flags)){
    const m=/^(contents_|st_)cupboard_(\d+)_(\d+)$/.exec(key);
    if(!m)continue;
    const x=Number(m[2]),y=Number(m[3]),[dx,dy]=offset(x/T,y/T);
    d.flags[m[1]+'cupboard_'+(x+dx*T)+'_'+(y+dy*T)]=d.flags[key];delete d.flags[key];
  }
  if(d.fog){
    const bytes=new Uint8Array(Math.ceil(MW*MH/6));
    for(let i=0;i<Math.min(160*82,d.fog.length*6);i++){
      if(!((d.fog.charCodeAt(Math.floor(i/6))-48)&(1<<(i%6))))continue;
      const x=i%160,y=Math.floor(i/160),[dx,dy]=offset(x+.5,y+.5),j=(y+dy)*MW+x+dx;
      bytes[Math.floor(j/6)]|=1<<(j%6);
    }
    d.fog=Array.from(bytes,b=>String.fromCharCode(48+b)).join('');
  }
  d.flags.atlasLayout=1;
}
// Re-site the outdoor settlements as units. An occupied bed, the bridge deck
// and the room on the other side of an upstairs landing keep their local footing.
function compactOldPosition(x,y){
  if(x>=760)return [x,y];
  if(x>=570 && x<=606 && y>=392 && y<=439)return [x-70,y-49];
  if(x>=541 && x<=571 && y>=130 && y<=155)return [x-67,y-17];
  if(y>=247 && y<=270)return [x>=345 && x<=385?x-44:x*.88,y-31];
  if(x>=360 && x<=380 && y>=639 && y<=650)return [x-44,y-77];
  return [x*.88,y*.88];
}
function upgradeAtlasV2(d){
  upgradePrototypeAtlas(d);
  if(d.flags.atlasLayout>=2)return;
  for(const e of [d,...d.dyn.npcs,...(d.flags.fieldBodies||[])]){
    const [x,y]=compactOldPosition(e.x/T,e.y/T);e.x=x*T;e.y=y*T;
  }
  for(const key of Object.keys(d.flags)){
    const m=/^(contents_|st_)cupboard_(\d+)_(\d+)$/.exec(key);
    if(!m)continue;
    const [x,y]=compactOldPosition(Number(m[2])/T,Number(m[3])/T);
    const dest=m[1]+'cupboard_'+Math.round(x*T)+'_'+Math.round(y*T);
    if(dest!==key){d.flags[dest]=d.flags[key];delete d.flags[key];}
  }
  if(d.fog){
    const bytes=new Uint8Array(Math.ceil(MW*MH/6));
    for(let i=0;i<Math.min(MW*MH,d.fog.length*6);i++){
      if(!((d.fog.charCodeAt(Math.floor(i/6))-48)&(1<<(i%6))))continue;
      const [x,y]=compactOldPosition(i%MW+.5,Math.floor(i/MW)+.5);
      const j=Math.floor(y)*MW+Math.floor(x);
      bytes[Math.floor(j/6)]|=1<<(j%6);
    }
    d.fog=Array.from(bytes,b=>String.fromCharCode(48+b)).join('');
  }
  d.flags.atlasLayout=2;
}
// Coordinates inside settlements move together. Only the unbuilt intervals contract.
const winterSurveyX=[[0,0],[72,54],[136,118],[147,121],[167,141],[182,146],[215,179],[293,228],[351,286],[473,374],[537,438],[669,535]];
const winterSurveyY=[[0,0],[114,88],[147,121],[177,140],[191,154],[200,155],[240,195],[337,264],[391,318],[424,337],[447,360],[530,418],[601,489],[651,521]];
function surveyAxis(value,knots){
  for(let i=1;i<knots.length;i++){
    const [end,to]=knots[i];
    if(value<=end){
      const [start,from]=knots[i-1];return from+(value-start)*(to-from)/(end-start);
    }
  }
  const [end,to]=knots.at(-1);return value-end+to;
}
function upgradeAtlasSave(d){
  upgradeAtlasV2(d);
  if(d.flags.atlasLayout>=3)return;
  function move(p){
    if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x>=760*T)return;
    p.x=surveyAxis(p.x/T,winterSurveyX)*T;p.y=surveyAxis(p.y/T,winterSurveyY)*T;
  }
  for(const e of [d,...d.dyn.npcs,...(d.flags.fieldBodies||[]),...(d.flags.snowMarks||[])]){
    move(e);move(e.deathSpot);move(e.trackAt);
  }
  for(const key of Object.keys(d.flags)){
    const match=/^(contents_cupboard_|st_cupboard_|hutStove)(\d+)([_x])(\d+)$/.exec(key);
    if(!match)continue;
    const unit=match[1]==='hutStove'?1:T;
    const pos={x:Number(match[2])*T/unit,y:Number(match[4])*T/unit};move(pos);
    const dest=match[1]+Math.round(pos.x*unit/T)+match[3]+Math.round(pos.y*unit/T);
    if(dest!==key){d.flags[dest]=d.flags[key];delete d.flags[key];}
  }
  if(d.fog){
    const bytes=new Uint8Array(Math.ceil(MW*MH/6));
    const xs=Array.from({length:MW},(_,i)=>i>=760?i:Math.floor(surveyAxis(i+.5,winterSurveyX)));
    const ys=Array.from({length:MH},(_,i)=>Math.floor(surveyAxis(i+.5,winterSurveyY)));
    for(let i=0;i<Math.min(MW*MH,d.fog.length*6);i++){
      if(!((d.fog.charCodeAt(Math.floor(i/6))-48)&(1<<(i%6))))continue;
      const x=i%MW,j=(x>=760?Math.floor(i/MW):ys[Math.floor(i/MW)])*MW+xs[x];
      bytes[Math.floor(j/6)]|=1<<(j%6);
    }
    d.fog=Array.from(bytes,b=>String.fromCharCode(48+b)).join('');
  }
  d.flags.atlasLayout=3;
}
function atlasTree(x,y){
  const h=hash2(x+91,y-77),size=68+49*hash2(x-18,y+29);
  const art=district.crowns[h>.54?0:1][Math.floor(hash2(x+31,y+7)*8)];
  return {x:(x+.5)*T,y:(y+.5)*T,size,art};
}
function* treesInRect(l,t,r,b){
  for(let y=Math.floor(t/T);y<=Math.floor(b/T);y++)
    for(let x=Math.floor(l/T);x<=Math.floor(r/T);x++)
      if(outdoorTreeAt(x,y))yield atlasTree(x,y);
}
function visibleAtlasTrees(){
  const w=VW/(2*Z)+140,h=VH/(2*Z)+140;
  return treesInRect(cam.x-w,cam.y-h,cam.x+w,cam.y+h);
}
function prepareAtlasArt(){
  district.surface=surfacePatterns();
  district.roadBeds=atlasRoutes.map(winterRoadBed);
  for(let i=0;i<5;i++)bankArt[i]=makeBankArt(i);
  district.crowns=[6,7].map(id=>Array.from({length:8},(_,turn)=>winterTreeArt(id,turn)));
  district.snow=snowMaterial();prepareBaseLorry();preparePumpArt();preparePropShadows();
  const m=district.images.materials,s=m.width/2;
  district.ice=district.images.lakeIce;
  const stamp=winterCanvas(192,192),brush=stamp.getContext('2d');
  brush.drawImage(m,6,6,s-12,s-12,0,0,192,192);
  brush.globalCompositeOperation='destination-in';
  const fade=brush.createRadialGradient(96,96,39,96,96,96);fade.addColorStop(0,'white');fade.addColorStop(1,'transparent');
  brush.fillStyle=fade;brush.fillRect(0,0,192,192);district.snowStamp=stamp;
  district.sleeperBed=winterRailBed();
  district.basinPaths=[lakeShape].map(([cx,cy,rx,ry])=>{
    const path=new Path2D();
    for(let i=0;i<=240;i++){
      const a=i*Math.PI/120,k=1+.034*Math.sin(5*a)+.023*Math.cos(8*a);
      path.lineTo((cx+rx*k*Math.cos(a))*T,(cy+ry*k*Math.sin(a))*T);
    }
    path.closePath();return path;
  });
}
function drawAtlasRoutes(g,l,t,r,b){
  g.save();g.fillStyle=g.strokeStyle=district.surface.pack;g.lineJoin=g.lineCap='round';
  for(const bed of district.roadBeds){
    if(bed.r<l || bed.l>r || bed.b<t || bed.t>b)continue;
    for(const [i,band] of bed.bands.entries()){
      g.globalAlpha=[.10,.15,.19,.23][i];g.fill(band);
    }
    for(const rut of bed.tracks){
      for(const [width,opacity] of [[11,.17],[6,.41]]){
        g.lineWidth=width;g.globalAlpha=opacity;g.stroke(rut);
      }
    }
  }
  g.restore();
}
function roadImprints(g,l,t,r,b){
  for(const [i,route] of atlasRoutes.entries()){
    for(let n=1;n<route.length;n++){
      const [x,y]=route[n-1].map(v=>v*T),[u,v]=route[n].map(w=>w*T);
      if(Math.max(x,u)<l-50 || Math.min(x,u)>r+50 || Math.max(y,v)<t-50 || Math.min(y,v)>b+50)continue;
      const d=Math.hypot(u-x,v-y),dx=(u-x)/d,dy=(v-y)/d;
      for(let j=0;j*16<d;j++){
        const k=j*16,px=x+k*dx,py=y+k*dy;
        if(px<l-55 || px>r+55 || py<t-55 || py>b+55)continue;
        for(let lane=0;lane<(i===0?3:1);lane++){
          const offset=(lane-1)*14+(j%2?3:-3)+4*Math.sin(j/7+lane);
          shoreEllipse(g,px-dy*offset,py+dx*offset,3.8,1.65,'#66707835',Math.atan2(dy,dx));
        }
      }
    }
  }
}
function paintPlaygroundSnow(g,offsetX,offsetY){
  g.save();g.translate(playYard.x*T+offsetX,playYard.y*T+offsetY);
  const snow=g.createRadialGradient(0,0,4,0,0,116);
  snow.addColorStop(0,'#8a969b85');snow.addColorStop(.65,'#9ca5a65c');snow.addColorStop(1,'transparent');
  g.save();g.scale(1,.49);g.fillStyle=snow;g.fillRect(-117,-117,234,234);g.restore();
  const rng=mulberry32(83+offsetY);
  for(let i=0;i<95;i++){
    const a=rng()*6.28,d=Math.sqrt(rng());shoreEllipse(g,Math.cos(a)*102*d,Math.sin(a)*41*d,3.5,1.6,'#52626d36',a+i);
  }
  g.restore();
}
function atlasTerrainChunk(cx,cy){
  const c=winterCanvas(atlasChunk,atlasChunk),g=c.getContext('2d'),l=cx*atlasChunk,t=cy*atlasChunk,r=l+atlasChunk,b=t+atlasChunk;
  g.translate(-l,-t);
  const near=(x,y,pad)=>x*T>=l-pad && x*T<=r+pad && y*T>=t-pad && y*T<=b+pad;
  const snow=district.surface.powder;
  g.fillStyle=snow;g.fillRect(l,t,atlasChunk,atlasChunk);
  for(let j=cy-1;j<=cy+1;j++)for(let i=cx-1;i<=cx+1;i++){
    const random=mulberry32((hash2(i,j)*4294967296)>>>0);
    for(let n=0;n<20;n++){
      const x=(i+random())*atlasChunk,y=(j+random())*atlasChunk,size=112+random()*146,turn=random()*6.28;
      if(x<l-size || x>r+size || y<t-size || y>b+size)continue;
      g.save();g.translate(x,y);g.rotate(turn);g.globalAlpha=.22;g.drawImage(district.snowStamp,-size/2,-size/2,size,size);g.restore();
    }
    for(let n=0;n<28;n++){
      const x=(i+random())*atlasChunk,y=(j+random())*atlasChunk,w=random()*52+12,h=w*(.17+random()*.18);
      if(x<l-w || x>r+w || y<t-w || y>b+w)continue;
      g.save();g.translate(x,y);g.rotate(-.38);g.scale(w,h);
      const f=g.createRadialGradient(0,0,0,0,0,1);f.addColorStop(0,n%3?'#f3f5f331':'#5b708221');f.addColorStop(1,'transparent');g.fillStyle=f;g.fillRect(-1,-1,2,2);g.restore();
    }
  }
  drawForestSnow(g,l,t,r,b);
  if(near(lakeShape[0],lakeShape[1],185*T)){
    const path=district.basinPaths[0];
    g.fillStyle=g.createPattern(district.ice,'repeat');g.fill(path);
    g.save();g.clip(path);
    lakeIceDetail(g,l,t,r,b);
    const iceWash=district.surface.powder;
    g.globalAlpha=.14;g.fillStyle=iceWash;g.fillRect(l,t,atlasChunk,atlasChunk);g.globalAlpha=1;
    // Wind packs snow along the shore. Broad translucent courses soften the ice margin.
    for(const [w,col] of [[8*T,'#e0e6e218'],[4*T,'#e2e7e327'],[1.5*T,'#e1e5e238']]){
      g.lineWidth=w;g.strokeStyle=col;g.stroke(path);
    }
    g.restore();
    for(const [w,col] of [[18,'#d5dede38'],[8,'#ebeee77c']]){
      g.lineWidth=w;g.strokeStyle=col;g.stroke(path);
    }
  }
  const marsh=l<169*T && r>55*T && t<355*T && b>237*T;
  if(near(264.05,331.56,150))paintRoadCulvert(g);
  if(near(61,95,155))westGround(g);
  if(near(166,347,13*T))pumpYardGround(g);
  drawAtlasRoutes(g,l,t,r,b);roadImprints(g,l,t,r,b);
  if(near(260,471,25*T))paintBaseYard(g);
  if(marsh){paintThaw(g,l,t);paintMarshCover(g,l,t,r,b);}
  if(b>northFence-4*T && t<southFence+8*T)paintStationGround(g,l,r);
  if(near(394,106,18*T))shoreGround(g);
  if(near(95,435,24*T))hamletGround(g);
  if(near(playYard.x,playYard.y,230)){
    paintPlaygroundSnow(g,0,0);paintPlaygroundSnow(g,-40,94);paintPlaygroundSnow(g,60,98);
  }
  for(const prop of atlasProps)if(near(prop.x/T,prop.y/T,160)){
    if(yardEquipment.has(prop.key))paintWornYardSnow(g,prop);
    if(prop.burial)paintFrozenBerth(g,prop);
    else {
      if(prop.key==='netrack' || prop.key==='wood')shelterGround(g,prop);
      paintPropShadow(g,prop);
    }
  }
  for(const fire of [district.fire,shoreFire])if(near(fire.x/T,fire.y/T,25))for(let i=0;i<12;i++)
    shoreEllipse(g,fire.x+14*Math.cos(i*Math.PI/6),fire.y+11*Math.sin(i*Math.PI/6),4.5,3.8,i%2?'#665e50':'#827b6a',i*.52);
  for(const h of HOUSES)if(h.flat?.n===1 && near(h.x+h.w/2,h.y+h.h,80))apartmentPorch(g,h);
  for(const tree of treesInRect(l-100,t-100,r+100,b+100)){
    const {x,y,size,art}=tree;g.save();g.translate(x,y);
    const rand=mulberry32(Math.floor(x*37+y));
    for(let i=0;i<17;i++){
      const a=rand()*Math.PI*2,rad=(rand()**1.3)*size*.32;
      const u=Math.cos(a)*rad,v=Math.sin(a)*rad*.62;
      beam(g,u,v,u+rand()*3.2-1.6,v+rand()*2.1-1,.55+rand()*.55,'#70674f68');
    }
    if(SHADOWS){g.save();g.globalAlpha=.32;g.transform(.91,0,.16,.78,size*.14,size*.15);g.drawImage(art.shadow,-size/2,-size/2,size,size);g.restore();}
    g.scale(1,.76);const f=g.createRadialGradient(0,0,1,0,0,size*.19);
    f.addColorStop(0,'#4b4940cf');f.addColorStop(.4,'#64645583');f.addColorStop(1,'transparent');g.fillStyle=f;g.fillRect(-size*.2,-size*.2,size*.4,size*.4);g.restore();
  }
  return c;
}
function drawAtlasGround(g,x,y,w,h){
  for(let j=Math.floor(y/atlasChunk);j<Math.ceil((y+h)/atlasChunk);j++)
    for(let i=Math.floor(x/atlasChunk);i<Math.ceil((x+w)/atlasChunk);i++){
      const key=i+','+j;let c=atlasChunks.get(key);
      if(!c)c=atlasTerrainChunk(i,j);else atlasChunks.delete(key);
      atlasChunks.set(key,c);
      if(atlasChunks.size>36)atlasChunks.delete(atlasChunks.keys().next().value);
      g.drawImage(c,i*atlasChunk,j*atlasChunk);
    }
}
// Offline orthophoto: take the same terrain, crowns, cast shadows, roofs and
// shoreline as the play view. North is up and the scale is uniform across chunks.
function bakeSurvey(){
  const scale=5/T;
  const c=winterCanvas(district.width*5,district.height*5),g=c.getContext('2d');
  g.scale(scale,scale);
  for(let y=0;y<district.height*T;y+=atlasChunk)for(let x=0;x<district.width*T;x+=atlasChunk){
    const tile=atlasTerrainChunk(x/atlasChunk,y/atlasChunk);
    g.drawImage(tile,x,y);tile.width=tile.height=1;
  }
  // The snow and canopy read at landscape scale as well as up close.
  const relief=winterCanvas(district.width,district.height),rg=relief.getContext('2d');
  const patch=rg.createImageData(relief.width,relief.height);
  for(let y=0;y<relief.height;y++)for(let x=0;x<relief.width;x++){
    const n=vnoise(x,y,29)*.7+vnoise(x+44,y,9)*.3;
    const i=(x+y*relief.width)*4;
    patch.data[i]=58;patch.data[i+1]=77;patch.data[i+2]=85;
    patch.data[i+3]=Math.round(74*n);
  }
  rg.putImageData(patch,0,0);g.drawImage(relief,0,0,district.width*T,district.height*T);
  // Snow is darker under a stand than in a clearing. Accumulate from actual
  // crowns, so the soft canopy shadows break at roads and at the treeline.
  const shade=winterCanvas(29,29),sg=shade.getContext('2d');
  const f=sg.createRadialGradient(14.5,14.5,1,14.5,14.5,14.5);
  f.addColorStop(0,'#31463f77');f.addColorStop(.45,'#35484139');f.addColorStop(1,'#38494000');
  sg.fillStyle=f;sg.fillRect(0,0,29,29);
  const stands=winterCanvas(district.width*2,district.height*2),fg=stands.getContext('2d');
  for(const tree of treesInRect(0,0,district.width*T,district.height*T)){
    const u=tree.x/T*2,v=tree.y/T*2,r=tree.size/T*1.15;
    fg.drawImage(shade,u-r,v-r,r*2,r*2);
  }
  g.drawImage(stands,0,0,district.width*T,district.height*T);
  for(const tree of treesInRect(0,0,district.width*T,district.height*T)){
    const {x,y,size,art}=tree;g.drawImage(art.crown,x-size/2,y-size/2,size,size);
  }
  for(const p of [...raisedScenery,...atlasProps])drawAtlasProp(g,p,true);
  drawWinterBridge(g,true);paintBridgeRails(g,true);
  for(const h of HOUSES)if(h.x<district.width){
    g.shadowColor='#374859aa';g.shadowBlur=2;g.shadowOffsetX=2;g.shadowOffsetY=3;
    g.drawImage(ROOFS[h.roofIndex],h.x*T,h.y*T,h.w*T,h.h*T);
  }
  return c;
}
function atlasMapLabels(g,s,u){
  const labels=s>3*u?[...atlasSites,['Лодки',384,89],['Прорубь',392.4,95.4],['Мост',270,175],
    ['Жилой корпус',418,280],['Детская площадка',424,295],['Заброшенный корпус',418,308]]:atlasSites;
  g.font='600 '+13*u+'px Arial';
  g.textAlign='center';g.textBaseline='middle';
  const occupied=[],h=20*u;
  for(const [name,x,y] of labels){
    const w=g.measureText(name).width+12*u;
    const left=clamp(x*s-w/2,0,Math.max(0,district.width*s-w));
    for(const offset of [0,h+3*u,-h-3*u]){
      const top=y*s-h/2+offset;
      if(top<0 || top+h>district.height*s || occupied.some(r=>
        left<r.right+2*u && left+w>r.left-2*u && top<r.bottom+2*u && top+h>r.top-2*u))continue;
      g.fillStyle='rgba(29,37,36,.94)';g.beginPath();g.roundRect(left,top,w,h,3*u);g.fill();
      g.fillStyle='#fff4da';g.fillText(name,left+w/2,top+h/2+.4*u);
      occupied.push({left,top,right:left+w,bottom:top+h});break;
    }
  }
}
