// Coordinates are in walking tiles. Display, collision and tracks use the same survey.
const atlasSites=[
  ['Замёрзшее озеро',412,92],['Охотничья вышка',91,141],['Склад',180,215],
  ['Рыбацкий посёлок',566,150],['Сотый километр',369,265],['Замёрзшее болото',153,389],
  ['Берёзки',588,427],['Старая водокачка',235,503],['Хутор',129,622],
  ['Разрушенная военная база',369,645]
];
const baseRoad=[[369,645],[367,561],[374,472],[366,385],[371,321],[369,265]];
const atlasRoutes=[
  baseRoad,
  [[366,385],[419,391],[486,410],[549,415],[573,413],[588,411],[588,409]],
  [[573,413],[579,416],[587,418],[592,419]],
  [[379,250.5],[388,238],[423,219],[460,211],[492,184],[530,165],[548,153],[558,149.8]],
  [[388,238],[318,229],[248,223],[180,215],[135,189],[91,141]],
  [[374,472],[330,478],[288,492],[235,503],[196,546],[162,588],[129,622]],
  [[288,492],[247,452],[213,419],[153,389]],
  [[367,561],[318,587],[233,608],[129,622]]
];
const lakeShape=[417,91,174,84],marshShape=[154,390,65,44];
const oldBoats=[[549.3,139.3,.29],[552,136.9,.33],[553.6,134.3,.25]];
const playYard={x:593,y:417};
const gatePosts=[[365.6,645],[372.4,645]];
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
  clear(1,250,district.width-2,16);clear(573,395,29,43);clear(549,135,19,18);
  clear(364,641,11,10);
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
    if(prop.burial)freezeHull(prop,image);
    const c=winterCanvas(Math.ceil(prop.width),Math.ceil(prop.height)),g=c.getContext('2d');
    g.drawImage(image,0,0,c.width,c.height);g.globalCompositeOperation='source-in';
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
  g.transform(p.flip,0,-.42,.53,3,6);
  g.globalAlpha=.29;g.drawImage(p.shadow,-p.width/2,-p.foot*p.height,p.width,p.height);g.restore();
}
function drawAtlasProp(g,p,mapView=false){
  const h=p.height;
  const k=perspective && !mapView?p.lift:0;
  const [topX,topY]=roofPoint(p.x,p.y,k);
  const shearX=clamp(topX-p.x,-h*.24,h*.24),shearY=clamp(topY-p.y,-h*.18,h*.18);
  g.save();g.translate(p.x,p.y);g.rotate(p.angle);
  g.transform(p.flip,0,-shearX/h,1-shearY/h,0,0);
  g.drawImage(p.exposed||district.images[p.key],-p.width/2,-p.foot*h,p.width,h);g.restore();
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
  for(const dx of [-74,16])interiorObject('yardFrame',x+dx,y,7,28);
  atlasProp('slide',x+64,y+1,34,.042);
  interiorObject('yardFrame',x+64,y,23,61);
  for(const [gx,gy] of gatePosts){
    const sign=gx<369?-1:1;
    atlasProp('gate',gx*T+sign*28,gy*T,91,.045,{flip:sign});
    interiorObject('gatePier',gx*T,gy*T,22,22);
    interiorObject('gateLeaf',gx*T+sign*42,gy*T,61,5);
  }
  atlasProp('wood',woodStack.x+woodStack.w/2,woodStack.y+woodStack.h/2,67,.023);

}
function atlasPlace(x,y){
  let nearest=atlasSites[0],gap=Infinity;
  for(const p of atlasSites){const d=Math.hypot(x-p[1],y-p[2]);if(d<gap){nearest=p;gap=d;}}
  if(basinRadius(x,y,lakeShape)<1)return atlasSites[0][0];
  return gap<42?nearest[0]:'Зимняя дорога';
}
function upgradeAtlasSave(d){
  if(d.flags.atlasLayout)return;
  function offset(x,y){
    if(x>=58)return [700,0]; // detached upper floors
    if(y<19.95 && (x>=42 || y<15))return [shoreX,shoreY];
    if(y<=33 || y<47 && (x<14 || x>36))return [stationX,stationY];
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
  district.snow=snowMaterial();preparePropShadows();
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
function paintPlaygroundSnow(g){
  g.save();g.translate(playYard.x*T,playYard.y*T);
  const snow=g.createRadialGradient(0,0,4,0,0,116);
  snow.addColorStop(0,'#8a969b85');snow.addColorStop(.65,'#9ca5a65c');snow.addColorStop(1,'transparent');
  g.save();g.scale(1,.49);g.fillStyle=snow;g.fillRect(-117,-117,234,234);g.restore();
  const rng=mulberry32(83);
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
  g.fillStyle='#6f898d66';g.fill(district.basinPaths[1]);drawAtlasRoutes(g);roadImprints(g,l,t,r,b);
  if(b>northFence-4*T && t<southFence+8*T)paintStationGround(g,l,r);
  if(near(558,145,14*T))shoreGround(g);
  if(near(playYard.x,playYard.y,120))paintPlaygroundSnow(g);
  for(const prop of atlasProps)if(near(prop.x/T,prop.y/T,160)){
    if(prop.burial)paintFrozenBerth(g,prop);
    else paintPropShadow(g,prop);
  }
  const fire=district.fire;
  if(near(fire.x/T,fire.y/T,25))for(let i=0;i<12;i++)
    shoreEllipse(g,fire.x+14*Math.cos(i*Math.PI/6),fire.y+11*Math.sin(i*Math.PI/6),4.5,3.8,i%2?'#665e50':'#827b6a',i*.52);
  if(near(588,409,70)){
    const x=588*T,y=409*T;artFill(g,'floor_concrete',x-35,y,70,17);
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
function buildAtlasOverview(){
  const c=winterCanvas(district.width*2,district.height*2),g=c.getContext('2d');
  district.overview=c;g.scale(2,2);g.fillStyle='#b5c2c7';g.fillRect(0,0,c.width,c.height);
  g.fillStyle='#708880';
  for(let y=0;y<district.height;y++)for(let x=0;x<district.width;x++)if(tAt(x,y)===TR)g.fillRect(x,y,1.3,1.3);
  g.save();g.scale(1/T,1/T);
  g.fillStyle='#8babb9';g.fill(district.basinPaths[0]);g.fillStyle='#879593';g.fill(district.basinPaths[1]);
  for(const route of atlasRoutes){g.beginPath();for(const [x,y] of route)g.lineTo(x*T,y*T);g.strokeStyle='#8d8173';g.lineWidth=85;g.stroke();}
  g.restore();
  for(const y of [northFence/T,stationY+21,stationY+22.65,southFence/T]){
    g.fillStyle='#6c7472';g.fillRect(0,y,district.width,.6);
  }
  g.fillStyle='#999e98';g.fillRect(platform.x/T,platform.y/T,platform.w/T,platform.h/T);
  g.fillStyle='#75685a';g.fillRect(footbridge.x/T-.9,footbridge.north/T,1.8,(footbridge.south-footbridge.north)/T);
  for(const h of HOUSES)g.drawImage(ROOFS[h.roofIndex],h.x,h.y,h.w,h.h);
  for(const [x,y] of oldBoats){g.fillStyle='#665847';g.fillRect(x-1,y-.4,2,.8);}
  g.fillStyle='#806858';g.fillRect(playYard.x-2,playYard.y,4,1);
}
function atlasMapLabels(g,s,u){
  const detail=s>3*u;
  g.textAlign='center';g.font='bold '+Math.max(10*u,Math.min(13*u,s*10))+'px Arial';
  const labels=detail?[...atlasSites,['Лодки',550,132],['Прорубь',558.4,138.4],['Мост',379,251],
    ['Жилой корпус',587,402],['Детская площадка',593,417],['Заброшенный корпус',587,430]]:atlasSites;
  for(const [name,x,y] of labels){
    const margin=g.measureText(name).width/2+2*u,cx=clamp(x*s,margin,district.width*s-margin);
    g.lineWidth=2.8*u;g.strokeStyle='#384247';g.strokeText(name,cx,y*s);g.fillStyle='#f2e8ce';g.fillText(name,cx,y*s);
  }
}
