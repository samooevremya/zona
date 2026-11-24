// These marks belong to the ground. They add detail without introducing new obstacles.
const groundClutter=[];
function prepareScenery(){
  const rand=randomStream(51873);
  for(const tree of forest){
    if(rand()>.58)continue;
    const x=tree.x+(rand()-.5)*1.8,y=tree.y+(rand()-.5)*1.8;
    if(y>railNorth-.45&&y<railSouth+.45)continue;
    if(winterMap.buildings.some(b=>overBuilding(x,y,b,.35)))continue;
    groundClutter.push({x,y,id:rand()<.89?6:7,size:.36+rand()*.84,angle:rand()*6.28});
  }
  for(let i=0;i<760;i++){
    const x=7+rand()*33,y=43+rand()*22;
    if(polygonContains(marshShore,x,y))groundClutter.push({x,y,id:6,size:.2+rand()*.5,angle:rand()*6.28});
  }
  for(const [n,branch] of winterMap.roads.entries()){
    for(let j=1;j<branch.points.length;j++){
      const a=branch.points[j-1],b=branch.points[j],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
      for(let k=0;k<d*1.6;k++){
        const t=rand(),off=(rand()>.5?1:-1)*(branch.width*.54+.12+rand()*.85);
        const x=a[0]+dx*t-dy/d*off,y=a[1]+dy*t+dx/d*off;
        if(y>railNorth-.25&&y<railSouth+.48||winterMap.buildings.some(b=>overBuilding(x,y,b,.34)))continue;
        const size=.24+rand()*(n===0?.43:.66);
        groundClutter.push({x,y,id:rand()>.91?7:6,size,angle:rand()*6.28});
      }
    }
  }
  // Pre-sort by sector; camera panning does not scan the whole map.
  for(const p of groundClutter){
    const key=Math.floor(p.x/sectorSize)+','+Math.floor(p.y/sectorSize);
    if(!clutterSectors.has(key))clutterSectors.set(key,[]);
    clutterSectors.get(key).push(p);
  }
  for(let i=0;i<crowns.length;i++){
    const c=document.createElement('canvas');c.width=c.height=182;
    const ctx=c.getContext('2d');ctx.translate(91,91);ctx.rotate(i*.79);
    stamp(ctx,i<14?6:7,-81,-83,162,166);
    ctx.globalCompositeOperation='source-atop';
    ctx.fillStyle=i%3===0?'rgba(36,52,62,.20)':i%3===1?'rgba(143,123,82,.10)':'rgba(189,205,206,.13)';
    ctx.fillRect(-140,-140,280,280);crowns[i]=c;
  }
}
const clutterSectors=new Map();
function undergrowth(v){
  const left=v.x-viewW/(2*v.z)-2,top=v.y-viewH/(2*v.z)-2;
  for(let j=Math.max(0,Math.floor(top/sectorSize));j<Math.min(H,2*v.y-top)/sectorSize;j++)
    for(let i=Math.max(0,Math.floor(left/sectorSize));i<Math.min(W,2*v.x-left)/sectorSize;i++){
      for(const p of clutterSectors.get(i+','+j)||[]){
        if(p.x<left||p.x>2*v.x-left||p.y<top||p.y>2*v.y-top)continue;
        g.save();g.translate(p.x,p.y);g.rotate(p.angle);
        sheetObject(g,p.id,-p.size*.5,-p.size*.47,p.size,p.size*.94);g.restore();
      }
    }
}
function contactShade(ctx,x,y,rx,ry,strength){
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const grad=ctx.createRadialGradient(0,0,.13,0,0,1);
  grad.addColorStop(0,'rgba(34,44,56,'+strength+')');grad.addColorStop(1,'rgba(34,44,56,0)');
  ctx.fillStyle=grad;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function shadowField(v){
  const trees=visibleForest(v);
  g.save();g.translate(viewW/2-v.x*v.z,viewH/2-v.y*v.z);g.scale(v.z,v.z);
  for(const t of trees) {
    g.save();g.translate(t.x+t.size*.65,t.y+t.size*.38);g.rotate(.46);
    contactShade(g,0,0,t.size*1.7,t.size*.72,.52);g.restore();
  }
  g.restore();
}
function worldScenery(v){
  const [left,top]=screen(0,0,v);
  g.drawImage(ground,left,top,W*v.z,H*v.z);
  if(!wide&&terrainMasks.length)detailGround(v);
  shadowField(v);
  g.save();g.translate(left,top);g.scale(v.z,v.z);undergrowth(v);stationPlatform(g,v);paintSites(v);
  for(const [a] of winterMap.tracks){
    const lo=Math.max(0,Math.floor((v.x-viewW/(2*v.z))/sleeperSpacing)*sleeperSpacing),hi=Math.min(W,v.x+viewW/(2*v.z)+.35);
    if(Math.abs(a[1]-v.y)>viewH/(2*v.z)+1)continue;
    for(let rx=lo;rx<hi;rx+=sleeperSpacing){
      const tone=lattice(Math.round(rx/sleeperSpacing),Math.round(a[1]*10)),offset=(tone-.5)*.045;
      const x=rx+.06,y=a[1]-sleeperLength/2+offset;
      g.fillStyle=tone>.54?'#716a5b':'#514e46';g.fillRect(x,y,.088,sleeperLength);
      if(!wide&&furnishingAtlas.naturalWidth)
        g.drawImage(furnishingAtlas,250+tone*83,7,12,85,x,y,.088,sleeperLength);
      g.fillStyle='rgba(207,213,210,.65)';g.fillRect(x+.006,y+.013,.057,.10+tone*.32);
      if(!wide){g.fillStyle='#524e43';g.fillRect(x-.012,a[1]-trackGauge/2-.028,.116,.056);g.fillRect(x-.012,a[1]+trackGauge/2-.028,.116,.056);}
    }
    for(const off of [-trackGauge/2,trackGauge/2]){
      stroke(g,[[lo,a[1]+off+.025],[hi,a[1]+off+.025]],'#69594c',.061);
      stroke(g,[[lo,a[1]+off],[hi,a[1]+off]],'#555961',.044);
      stroke(g,[[lo,a[1]+off-.009],[hi,a[1]+off-.009]],'#b6bdba',.017);
    }
  }
  g.restore();groundObjects(v);
  for(const [i,b] of winterMap.buildings.entries()){
    if(!wide&&state.room===i)continue;
    renderBuilding(b,i,v);
  }
  if(!wide){renderFieldGear(v);drawLowProps(v);paintDetails(v);if(state.room<0)person(v);}
  for(const t of visibleForest(v)){
    const [x,y]=screen(t.x,t.y,v),size=t.size*v.z*2.9;
    if(x+size<0||y+size<0||x-size>viewW||y-size>viewH)continue;
    const close=!wide&&state.room<0&&Math.hypot(t.x-player.x,t.y-player.y)<t.size;
    if(close)g.globalAlpha=.54;
    const canopy=wide?0:.092,top=screen(...liftPoint(t.x,t.y,canopy,v),v);
    g.drawImage(crowns[t.id],x-size*.39,y-size*.39,size*.78,size*.78);
    g.drawImage(crowns[t.id],top[0]-size*.5,top[1]-size*.5,size,size);
    if(close)g.globalAlpha=1;
  }
}

const yardArt=new Image();
yardArt.src='__YARD_ART__';
function yardObject(ctx,id,x,y,w,h,angle=0){
  if(!yardArt.naturalWidth)return;
  const cell=yardArt.width/3;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.drawImage(yardArt,id%3*cell,Math.floor(id/3)*cell,cell,cell,-w/2,-h/2,w,h);ctx.restore();
}
// Placed beside existing entrances, fence runs, yards and shoreline.
const siteDetails=[
  [1,66.6,33.84,1.02,.45],[1,73.2,33.84,1.02,.45],[7,61.9,34.04,.46,.48],
  [1,56.4,34.08,1.05,.44],[1,84.4,34.08,1.05,.44],[2,68.78,39.49,.34,1.05],[2,71.26,39.49,.34,1.05],
  [7,71.47,39.77,.39,.48],[7,65.1,33.90,.37,.41],[1,96.7,51.42,1.02,.45],[1,100.4,65.5,.96,.43],
  [3,85.70,47.65,1.06,.48,1.5708],[7,108.7,50.8,.35,.42],[2,93,51.5,.31,.90],[2,103.7,65,.30,.88],
  [6,101.3,17.2,.92,.48,.34],[6,103.8,20.6,.83,.57,-.64],[3,111.8,15.3,1.18,.57,-.09],
  [7,42.1,66.8,.39,.50],[4,44,68.8,.95,.53,.12],[4,39.7,65.9,.7,.49,-.29],
  [3,28.3,25.6,1.28,.61,-.12],[7,33.7,26.15,.35,.43],[3,13.6,18.48,.83,.48],
  [5,55.3,95.2,2.1,.98,.17],[5,80.4,93.7,1.55,.87,-.4],[5,87.2,104.3,2.2,1.15,-.27],
  [4,80.5,101.4,1.07,.68,.3],[5,50.2,97.4,1.71,.89,.42],[7,62.7,87.3,.42,.56],
];
function paintSites(v){
  for(const [id,x,y,w,h,angle] of siteDetails){
    if(Math.abs(x-v.x)>(viewW/2)/v.z+2||Math.abs(y-v.y)>(viewH/2)/v.z+2)continue;
    const high=[.095,.021,.064,.044,.04,.025,.016,.028,.013][id],top=liftPoint(x,y,wide?0:high,v);
    contactShade(g,x+.12,y+.11,w*.64,h*.60,.39);
    if(id===3){stackedWood(g,x,y,w,h,angle||0,v);continue;}
    const base=[[x-w/2,y-h/2],[x+w/2,y-h/2],[x+w/2,y+h/2],[x-w/2,y+h/2]];
    if(!angle&&[1,4,7].includes(id)){
      for(let side=0;side<4;side++){
        const a=base[side],b=base[(side+1)%4];
        polygon(g,[a,b,liftPoint(...b,high,v),liftPoint(...a,high,v)],side%2?'#57594e':'#737367');
      }
    }
    yardObject(g,id,...top,w,h,angle);
  }
}
function roadWear(ctx,scale,x,y,w,h){
  ctx.lineCap=ctx.lineJoin='round';
  for(const road of winterMap.roads){
    for(const side of [-1,1]){
      const rut=road.points.map(([px,py],i,pts)=>{
        const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];
        const offset=side*Math.min(.45,road.width*.245)/Math.hypot(b[0]-a[0],b[1]-a[1]);
        return [px-(b[1]-a[1])*offset,py+(b[0]-a[0])*offset];
      });
      stroke(ctx,rut,'rgba(222,223,211,.13)',.13);
      stroke(ctx,rut,'rgba(68,66,60,.19)',.08);
    }
  }
  // Naturally branching fractures, clipped to the playable frozen lake.
  if(y<30&&x<105&&x+w>31){
    ctx.save();pathLine(ctx,winterMap.lake,true);ctx.clip();
    const rand=randomStream(211024);
    for(let i=0;i<165;i++){
      let px=32+rand()*73,py=3+rand()*24,a=rand()*6.28,points=[[px,py]];
      for(let j=0;j<7;j++){
        a+=(rand()-.5)*1.04;const len=.16+rand()*.72;
        px+=Math.cos(a)*len;py+=Math.sin(a)*len;points.push([px,py]);
      }
      if(!points.some(([xx,yy])=>xx>x-1&&xx<x+w+1&&yy>y-1&&yy<y+h+1))continue;
      stroke(ctx,points,'rgba(36,58,66,.39)',.058);stroke(ctx,points,'rgba(229,240,236,.67)',.024);
      const root=points[3];stroke(ctx,[root,[root[0]-.27,root[1]+.42],[root[0]-.56,root[1]+.61]],'rgba(227,238,234,.48)',.020);
    }
    ctx.restore();
  }
}
function atmosphereGrade(v){
  if(wide)return;
  const day=state.clock%1440/1440,glancing=.5+.5*Math.cos(day*2*Math.PI);
  const haze=g.createLinearGradient(0,0,viewW,viewH);
  haze.addColorStop(0,'rgba(241,203,139,'+(.046+.034*glancing)+')');
  haze.addColorStop(.43,'rgba(201,211,213,0)');haze.addColorStop(1,'rgba(46,65,85,.085)');
  g.fillStyle=haze;g.fillRect(0,0,viewW,viewH);
  const radius=Math.hypot(viewW,viewH)*.52,shade=g.createRadialGradient(viewW*.50,viewH*.46,radius*.36,viewW*.50,viewH*.46,radius);
  shade.addColorStop(0,'rgba(16,25,31,0)');shade.addColorStop(1,'rgba(19,27,33,.22)');
  g.fillStyle=shade;g.fillRect(0,0,viewW,viewH);
}

// Short jetties project over the existing shore. Narrow slats and lashing follow the hulls.
function lakeJetties(ctx){
  for(const [x,y,length,angle] of [[99.8,15.5,1.65,-.32],[101.2,17.45,2.15,.35],[97.3,21.4,1.35,-.37]]){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    contactShade(ctx,.12,.10,length*.57,.23,.33);
    for(let s=-length/2,n=0;s<length/2;s+=.11,n++){
      const tone=lattice(n,Math.floor(y));
      ctx.fillStyle=tone>.44?'#756b58':'#8a806c';ctx.fillRect(s,-.20,.10,.40);
      ctx.fillStyle='rgba(219,220,206,.6)';ctx.fillRect(s+.01,-.20,.095,.065+tone*.21);
    }
    for(const end of [-1,1])for(const side of [-1,1])ellipse(ctx,end*(length*.5-.06),side*.19,.039,.039,'#544c41');
    ctx.restore();
  }
}
