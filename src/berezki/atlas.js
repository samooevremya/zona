// Coordinates are in walking tiles. Display, collision and tracks use the same survey.
const atlasSites=[
  ['Замёрзшее озеро',362.56,80.96],['Охотничья вышка',80.08,124.08],['Склад',158.4,189.2],
  ['Рыбацкий посёлок',499,133],['Сотый километр',325,234],['Замёрзшее болото',134.64,342.32],
  ['Берёзки',518,378],['Старая водокачка',206.8,442.64],['Хутор',113.52,547.36],
  ['Разрушенная военная база',325,568]
];
const baseRoad=[[325,568],[322.96,493.68],[329.12,415.36],[322.08,338.8],[326.48,282.48],[325,234]];
const atlasRoutes=[
  baseRoad,
  [[322.08,338.8],[368.72,344.08],[427.68,360.8],[483.12,365.2],[503,364],[518,362],[518,360]],
  [[503,364],[509,367],[517,369],[522,370]],
  [[335,219.5],[341.44,209.44],[372.24,192.72],[404.8,185.68],[432.96,161.92],[466.4,145.2],[481,136],[491,132.8]],
  [[341.44,209.44],[279.84,201.52],[218.24,196.24],[158.4,189.2],[118.8,166.32],[80.08,124.08]],
  [[329.12,415.36],[290.4,420.64],[253.44,432.96],[206.8,442.64],[172.48,480.48],[142.56,517.44],[113.52,547.36]],
  [[253.44,432.96],[217.36,397.76],[187.44,368.72],[134.64,342.32]],
  [[322.96,493.68],[279.84,516.56],[205.04,535.04],[113.52,547.36]],
  ...shoreLanes,...baseLanes
];
const lakeShape=[366.96,80.08,153.12,73.92],marshShape=[135.52,343.2,57.2,38.72];
const oldBoats=[[482.3,122.3,.29],[485,119.9,.33],[486.6,117.3,.25]];
const playYard={x:523,y:368};
const gatePosts=[[321.6,568],[328.4,568]];
const atlasChunks=new Map(),atlasChunk=512;

function basinRadius(x,y,[cx,cy,rx,ry]){
  const u=(x-cx)/rx,v=(y-cy)/ry,a=Math.atan2(v,u);
  return Math.hypot(u,v)/(1+.034*Math.sin(5*a)+.023*Math.cos(8*a));
}
function seedAtlasTerrain(){
  map.fill(VO);
  for(let y=1;y<district.height-1;y++)for(let x=1;x<district.width-1;x++){
    let cell=GR;
    if(basinRadius(x,y,marshShape)<1)cell=SW;
    else if(basinRadius(x,y,lakeShape)>1.02 && hash2(x,y)<.075 && vnoise(x,y,13)>.38)cell=TR;
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
  clear(1,219,district.width-2,16);clear(503,346,29,43);clear(482,118,19,18);
  for(const r of villageCabins)clear(r.x-1.5,r.y-1.5,r.w+3,r.h+3);
  clear(495,132,7,7);
  clear(302,566,47,35);
}
const atlasProps=[];
function atlasProp(key,x,y,width,lift,{angle=0,flip=1}={}){
  const p={key,x,y,width,lift,angle,flip};
  atlasProps.push(p);return p;
}
function preparePropShadows(){
  for(const prop of atlasProps){
    const image=district.images[prop.key];
    prop.height=prop.width*image.height/image.width;
    // The foot line lies below the centre in the photo. Its world position stays fixed.
    prop.foot=prop.key==='swing'?.79:prop.key==='slide'?.66:prop.key==='gate'?.86:.65;
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
  if(p.item || p.panel){paintRaisedScenery(g,p,mapView);return;}
  const h=p.height;
  const k=perspective && !mapView?p.lift:0;
  const [topX,topY]=roofPoint(p.x,p.y,k);
  const shearX=clamp(topX-p.x,-h*.24,h*.24),shearY=clamp(topY-p.y,-h*.18,h*.18);
  g.save();g.translate(p.x,p.y);g.rotate(p.angle);
  g.transform(p.flip,0,-shearX/h,1-shearY/h,0,0);
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
function makeAtlasProps(){
  for(const [i,[x,y,angle]] of oldBoats.entries()){
    const width=[106,98,111][i];
    const boat=atlasProp(['boat','skiff','keel'][i],x*T,y*T,width,.004,{angle});
    boat.burial=[.24,.37,.29][i];
    // Three short sections follow the tapered, angled hull without filling its bounding box.
    for(const [offset,len,depth] of [[-.32,.24,19],[0,.40,27],[.32,.23,17]])
      interiorObject('beachedBoat',boat.x+Math.cos(angle)*offset*width,boat.y+Math.sin(angle)*offset*width,len*width,depth);
  }
  const x=playYard.x*T,y=playYard.y*T;
  atlasProp('swing',x-29,y,99,.051);
  // The seats and swept space join both A-frames at the player's foot level.
  interiorObject('yardFrame',x-29,y-5,98,38,{fixture:'swing'});
  atlasProp('slide',x+64,y+1,34,.042);
  interiorObject('yardFrame',x+64,y-8,32,62,{fixture:'slide'});
  atlasProp('roundabout',x-94,y+94,81,.021);
  for(const [offset,w,h] of [[-22,48,16],[0,77,32],[22,48,16]])
    interiorObject('yardFrame',x-94,y+94+offset-4,w,h,{fixture:'roundabout'});
  atlasProp('seesaw',x+71,y+98,102,.023);
  interiorObject('yardFrame',x+71,y+96,99,19,{fixture:'seesaw'});
  atlasProp('baseLorry',320.55*T,580.6*T,124,.022);
  interiorObject('parkedLorry',320.55*T,580.6*T-8,117,46);
  for(const [gx,gy] of gatePosts){
    const sign=gx<325?-1:1;
    atlasProp('gate',gx*T+sign*28,gy*T,91,.045,{flip:sign});
    interiorObject('gatePier',gx*T,gy*T,22,22);
    interiorObject('gateLeaf',gx*T+sign*42,gy*T,61,5);
  }
  atlasProp('netrack',netRack.x,netRack.y+10,89,.044);
  atlasProp('roastspit',shoreFire.x,shoreFire.y+2,47,.022);
  const pile=tilePoint(509.05,130.15);
  atlasProp('wood',pile.x,pile.y+6,54,.019);
  interiorObject('woodStack',pile.x,pile.y,51,16);
  atlasProp('wood',woodStack.x+woodStack.w/2,woodStack.y+woodStack.h-1,67,.023);

}
function atlasPlace(x,y){
  let nearest=atlasSites[0],gap=Infinity;
  for(const p of atlasSites){const d=Math.hypot(x-p[1],y-p[2]);if(d<gap){nearest=p;gap=d;}}
  if(basinRadius(x,y,lakeShape)<1)return atlasSites[0][0];
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
function upgradeAtlasSave(d){
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
function atlasTree(x,y){
  const h=hash2(x,y),size=76+42*h;
  const art=district.crowns[h>.54?0:1][Math.floor(hash2(x+31,y+7)*4)];
  return {x:(x+.5)*T,y:(y+.5)*T,size,art};
}
function* treesInRect(l,t,r,b){
  for(let y=Math.max(0,Math.floor(t/T));y<=Math.min(district.height-1,Math.floor(b/T));y++)
    for(let x=Math.max(0,Math.floor(l/T));x<=Math.min(district.width-1,Math.floor(r/T));x++)
      if(tAt(x,y)===TR)yield atlasTree(x,y);
}
function visibleAtlasTrees(){
  const w=VW/(2*Z)+140,h=VH/(2*Z)+140;
  return treesInRect(cam.x-w,cam.y-h,cam.x+w,cam.y+h);
}
function prepareAtlasArt(){
  district.crowns=[6,7].map(id=>Array.from({length:4},(_,turn)=>winterTreeArt(id,turn)));
  district.snow=snowMaterial();prepareBaseLorry();preparePropShadows();
  const ice=winterCanvas(512,512),g=ice.getContext('2d'),m=district.images.materials,s=m.width/2;
  for(const u of [0,1])for(const v of [0,1]){
    g.save();g.translate(u*512,v*512);g.scale(u?-1:1,v?-1:1);
    g.drawImage(m,s+2,s+2,s-4,s-4,0,0,256,256);g.restore();
  }
  district.ice=ice;
  const stamp=winterCanvas(192,192),brush=stamp.getContext('2d');
  brush.drawImage(m,6,6,s-12,s-12,0,0,192,192);
  brush.globalCompositeOperation='destination-in';
  const fade=brush.createRadialGradient(96,96,39,96,96,96);fade.addColorStop(0,'white');fade.addColorStop(1,'transparent');
  brush.fillStyle=fade;brush.fillRect(0,0,192,192);district.snowStamp=stamp;
  district.sleeperBed=winterCanvas(16*T,38);
  const b=district.sleeperBed.getContext('2d');for(let i=0;i<16;i++){b.save();b.translate(i*T,0);drawRailStrip(b,i,0,38);b.restore();}
  for(const y of [14,23]){beam(b,0,y+1,16*T,y+1,2,'#4e4a41');beam(b,0,y,16*T,y,1,'#a5a397');}
  b.globalCompositeOperation='destination-in';const edge=b.createLinearGradient(0,0,0,38);
  for(const [at,alpha] of [[0,0],[.24,1],[.76,1],[1,0]])edge.addColorStop(at,'rgba(0,0,0,'+alpha+')');
  b.fillStyle=edge;b.fillRect(0,0,16*T,38);
  district.basinPaths=[lakeShape,marshShape].map(([cx,cy,rx,ry])=>{
    const path=new Path2D();
    for(let i=0;i<=240;i++){
      const a=i*Math.PI/120,k=1+.034*Math.sin(5*a)+.023*Math.cos(8*a);
      path.lineTo((cx+rx*k*Math.cos(a))*T,(cy+ry*k*Math.sin(a))*T);
    }
    path.closePath();return path;
  });
}
function drawAtlasRoutes(g){
  g.save();g.lineJoin=g.lineCap='round';
  for(const [i,route] of atlasRoutes.entries()){
    g.beginPath();for(const [x,y] of route)g.lineTo(x*T,y*T);
    const w=i===0?108:i===1?72:44;
    for(const [width,color] of [[w,'#85939a18'],[w*.84,'#747f8622'],[w*.64,'#76818a24']]){
      g.lineWidth=width;g.strokeStyle=color;g.stroke();
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
          shoreEllipse(g,px-dy*offset,py+dx*offset,4.7,2.3,'#58667149',Math.atan2(dy,dx));
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
  const snow=g.createPattern(district.snow,'repeat');snow.setTransform(new DOMMatrix().scale(.76));
  g.fillStyle=snow;g.fillRect(l,t,atlasChunk,atlasChunk);
  for(let j=cy-1;j<=cy+1;j++)for(let i=cx-1;i<=cx+1;i++){
    const random=mulberry32((hash2(i,j)*4294967296)>>>0);
    for(let n=0;n<36;n++){
      const x=(i+random())*atlasChunk,y=(j+random())*atlasChunk,size=112+random()*146,turn=random()*6.28;
      if(x<l-size || x>r+size || y<t-size || y>b+size)continue;
      g.save();g.translate(x,y);g.rotate(turn);g.drawImage(district.snowStamp,-size/2,-size/2,size,size);g.restore();
    }
    for(let n=0;n<28;n++){
      const x=(i+random())*atlasChunk,y=(j+random())*atlasChunk,w=random()*52+12,h=w*(.17+random()*.18);
      if(x<l-w || x>r+w || y<t-w || y>b+w)continue;
      g.save();g.translate(x,y);g.rotate(-.38);g.scale(w,h);
      const f=g.createRadialGradient(0,0,0,0,0,1);f.addColorStop(0,n%3?'#f3f5f34a':'#5b708239');f.addColorStop(1,'transparent');g.fillStyle=f;g.fillRect(-1,-1,2,2);g.restore();
    }
  }
  if(near(lakeShape[0],lakeShape[1],185*T)){
    const path=district.basinPaths[0];
    g.fillStyle=g.createPattern(district.ice,'repeat');g.fill(path);
    g.save();g.clip(path);
    const iceWash=g.createPattern(district.snow,'repeat');
    iceWash.setTransform(new DOMMatrix().rotate(26).scale(1.31));
    g.globalAlpha=.34;g.fillStyle=iceWash;g.fillRect(l,t,atlasChunk,atlasChunk);g.globalAlpha=1;
    // Wind packs snow along the shore. Broad translucent courses soften the ice margin.
    for(const [w,col] of [[8*T,'#e0e6e218'],[4*T,'#e2e7e327'],[1.5*T,'#e1e5e238']]){
      g.lineWidth=w;g.strokeStyle=col;g.stroke(path);
    }
    g.restore();
    for(const [w,col] of [[18,'#d5dede38'],[8,'#ebeee77c']]){
      g.lineWidth=w;g.strokeStyle=col;g.stroke(path);
    }
  }
  if(near(marshShape[0],marshShape[1],62*T)){
    const wet=district.basinPaths[1];
    g.save();g.clip(wet);
    const texture=g.createPattern(district.ice,'repeat');
    texture.setTransform(new DOMMatrix().rotate(-17).scale(.68));
    g.globalAlpha=.44;g.fillStyle=texture;g.fill(wet);g.globalAlpha=1;
    g.fillStyle='#65726c53';g.fill(wet);
    for(const [w,opacity] of [[11*T,.22],[5*T,.35],[2*T,.49]]){
      g.strokeStyle=snow;g.lineWidth=w;g.globalAlpha=opacity;g.stroke(wet);
    }
    g.restore();
  }
  if(near(325,583,25*T))paintBaseYard(g);
  drawAtlasRoutes(g);roadImprints(g,l,t,r,b);
  if(b>northFence-4*T && t<southFence+8*T)paintStationGround(g,l,r);
  if(near(493,132,18*T))shoreGround(g);
  if(near(playYard.x,playYard.y,230)){
    paintPlaygroundSnow(g,0,0);paintPlaygroundSnow(g,-40,94);paintPlaygroundSnow(g,60,98);
  }
  for(const prop of atlasProps)if(near(prop.x/T,prop.y/T,160)){
    if(prop.burial)paintFrozenBerth(g,prop);
    else {
      if(prop.key==='netrack' || prop.key==='wood')shelterGround(g,prop);
      paintPropShadow(g,prop);
    }
  }
  for(const fire of [district.fire,shoreFire])if(near(fire.x/T,fire.y/T,25))for(let i=0;i<12;i++)
    shoreEllipse(g,fire.x+14*Math.cos(i*Math.PI/6),fire.y+11*Math.sin(i*Math.PI/6),4.5,3.8,i%2?'#665e50':'#827b6a',i*.52);
  if(near(518,360,70)){
    const x=518*T,y=360*T;artFill(g,'floor_concrete',x-35,y,70,17);
    for(const h of [3,9,16])beam(g,x-35,y+h,x+35,y+h,1.3,'#857f74');
  }
  for(const tree of treesInRect(l-100,t-100,r+100,b+100)){
    const {x,y,size,art}=tree;g.save();g.translate(x,y);
    if(SHADOWS){g.save();g.globalAlpha=.32;g.transform(.91,0,.16,.78,size*.14,size*.15);g.drawImage(art.shadow,-size/2,-size/2,size,size);g.restore();}
    g.scale(1,.76);const f=g.createRadialGradient(0,0,1,0,0,size*.19);
    f.addColorStop(0,'#4b4940cf');f.addColorStop(.4,'#64645583');f.addColorStop(1,'transparent');g.fillStyle=f;g.fillRect(-size*.2,-size*.2,size*.4,size*.4);g.restore();
  }
  return c;
}
function drawAtlasGround(g,x,y,w,h){
  for(let j=Math.max(0,Math.floor(y/atlasChunk));j<Math.ceil(Math.min(district.height*T,y+h)/atlasChunk);j++)
    for(let i=Math.max(0,Math.floor(x/atlasChunk));i<Math.ceil(Math.min(district.width*T,x+w)/atlasChunk);i++){
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
  g.drawImage(district.bridgeArt,footbridge.x-footbridge.width/2-5,footbridge.north-8);paintBridgeRails(g,true);
  for(const h of HOUSES)if(h.x<district.width){
    g.shadowColor='#374859aa';g.shadowBlur=2;g.shadowOffsetX=2;g.shadowOffsetY=3;
    g.drawImage(ROOFS[h.roofIndex],h.x*T,h.y*T,h.w*T,h.h*T);
  }
  return c;
}
function atlasMapLabels(g,s,u){
  const detail=s>3*u;
  g.textAlign='center';g.font='bold '+Math.max(10*u,Math.min(13*u,s*10))+'px Arial';
  const labels=detail?[...atlasSites,['Лодки',483,115],['Прорубь',491.4,121.4],['Мост',335,220],
    ['Жилой корпус',517,353],['Детская площадка',523,368],['Заброшенный корпус',517,381]]:atlasSites;
  for(const [name,x,y] of labels){
    const margin=g.measureText(name).width/2+2*u,cx=clamp(x*s,margin,district.width*s-margin);
    g.lineWidth=2.8*u;g.strokeStyle='#384247';g.strokeText(name,cx,y*s);g.fillStyle='#f2e8ce';g.fillText(name,cx,y*s);
  }
}
