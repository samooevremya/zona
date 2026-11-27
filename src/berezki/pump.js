// The drainage channel runs south from the existing marsh. Its banks supply both
// the terrain mask and the waterline rendered into the outdoor tiles and survey.
const pumpRoom={x:203,y:431,w:9,h:7,n:1,name:'Насосная',doors:[[0,4],[0,5]],roof:'slate'};
const pumpTower=tilePoint(194.85,432.35),pumpHearth=tilePoint(210.55,436.25);
const pumpHeater={at:pumpHearth,flag:'pumpStoveUntil',room:pumpRoom,action:'pumpKindle'};
const towerFeet=[[-35,-18],[35,-18],[-35,18],[35,18]];
const marshFork=[183.8,434.2],pumpDoor=[203.5,436];
const marshCrossing=[marshFork,[192,434.5],[197.8,435.6],[200.6,436],pumpDoor];
const marshBank=[marshFork,[183.7,437.6],[185.7,440.8],[188.2,444.2],[194.7,445.6],[200.7,443.4],[201.5,440],[201.3,436.55],[201.8,436],pumpDoor];
const pumpPaths=[marshCrossing,marshBank,
  [[172.48,480.48],[179,458],[184.6,446],marshFork],
  [[134.64,342.32],[149,368],[166.5,390],[179.2,409],[185.2,423.2],marshFork],
  [[206.8,442.64],[201.5,440]]];
function channelBanks(y){
  const u=(y-369)/71;
  const center=152+43*u+1.8*Math.sin(u*12);
  const radius=(3.8+1.45*Math.sin(u*15)+1.1*Math.cos(u*31))*Math.sqrt(clamp((1-u)*15,0,1));
  const tip=clamp((1-u)*12,0,1);
  return [center-radius+tip*.36*Math.sin(y*1.25),center+radius+tip*.39*Math.sin(y*1.4)];
}
function inMarshChannel(x,y){
  if(y<369 || y>=440 || x<145 || x>203)return false;
  const [l,r]=channelBanks(y);return x>=l && x<r;
}
// Water depth is continuous across the old navigation tiles. The last few metres
// of each bank are slush, while channels and hollows hold standing water.
function marshDepth(x,y){
  const u=x/T,v=y/T;
  if(u<73 || u>204 || v<300 || v>441)return 0;
  let inward=(1-basinRadius(u,v,marshShape))*marshShape[3];
  if(v>=369 && v<440){
    const [l,r]=channelBanks(v);
    inward=Math.max(inward,Math.min(u-l,r-u));
  }
  if(inward<-.38)return 0;
  const grain=vnoise(u+32,v-11,1.8);
  const shore=clamp((inward+(grain-.5)*.72)/1.45,0,1);
  if(!shore)return 0;
  return shore*clamp(.28+vnoise(u,v,7)*.58+grain*.28,.16,1);
}
// The depth mask is sampled only when baking a terrain chunk. The one-sample
// apron makes bilinear filtering continuous between neighbouring chunks.
function paintThaw(g,l,t){
  const size=atlasChunk,spacing=8,n=size/spacing+2;
  const mask=winterCanvas(n,n),m=mask.getContext('2d'),pixels=m.createImageData(n,n);
  let present=false;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const d=marshDepth(l+(i-.5)*spacing,t+(j-.5)*spacing);
    if(!d)continue;
    present=true;pixels.data[(j*n+i)*4+3]=Math.round(249*Math.pow(d,.59));
  }
  if(!present)return;
  m.putImageData(pixels,0,0);
  const c=winterCanvas(size,size),q=c.getContext('2d');
  const material=q.createPattern(district.images.marshWater,'repeat');
  material.setTransform(new DOMMatrix().translate(-l,-t).rotate(-13).scale(.68));
  q.fillStyle=material;q.fillRect(0,0,size,size);
  q.globalCompositeOperation='destination-in';
  q.drawImage(mask,-spacing,-spacing,n*spacing,n*spacing);
  g.drawImage(c,l,t);
}
// Shoreline belts have openings at the channel and occasional sheltered islands.
function reedDensity(x,y){
  const u=x/T,v=y/T;
  if(u<73 || u>204 || v<300 || v>441 || !swampAt(x,y))return 0;
  let shore;
  if(v>=369 && inMarshChannel(u,v)){
    const [l,r]=channelBanks(v);shore=Math.abs(2*(u-l)/(r-l)-1);
  }else shore=basinRadius(u,v,marshShape);
  const pocket=vnoise(u+24,v-11,5),band=clamp((shore-.48)*2.8,0,1);
  return clamp((band*.78+pocket*.73+vnoise(u,v,2.3)*.2-.52)*1.9,0,1);
}
let rushShadow;
function visitReeds(l,t,r,b,visit){
  const cell=23;
  for(let j=Math.floor(t/cell);j<=Math.floor(b/cell);j++)
    for(let i=Math.floor(l/cell);i<=Math.floor(r/cell);i++){
      const rand=mulberry32((i*73856093 ^ j*19349663)>>>0);
      const x=(i+.1+rand()*.8)*cell,y=(j+.1+rand()*.8)*cell,d=reedDensity(x,y);
      if(rand()>=d)continue;
      const w=(16+rand()*21)*(.72+d*.4),h=w*(.78+rand()*.51);
      const flip=rand()<.5?-1:1,angle=(rand()-.5)*.36;
      visit(x,y,w,h,flip,angle);
    }
}
function reedStand(g,x,y,w,h,flip,angle){
  g.save();g.translate(x,y);g.scale(flip,1);g.rotate(angle);
  g.drawImage(district.images.reedStand,-w/2,-h*.94,w,h);g.restore();
}
function paintMarshCover(g,l,t,r,b){
  const im=district.images.reedStand;
  if(!rushShadow){
    rushShadow=winterCanvas(im.width,im.height);
    const q=rushShadow.getContext('2d');q.drawImage(im,0,0);
    q.globalCompositeOperation='source-in';q.fillStyle='#35444b';q.fillRect(0,0,im.width,im.height);
  }
  visitReeds(l-48,t-35,r+48,b+60,(x,y,w,h,flip,angle)=>{
    if(SHADOWS){
      g.save();g.translate(x,y);g.transform(flip,0,-.49,-.32,1,1);
      g.globalAlpha=.32;g.drawImage(rushShadow,-w/2,-h,w,h);g.restore();
    }
    reedStand(g,x,y,w,h,flip,angle);
  });
}
function reedsInFront(g,e){
  if(e.x<72*T || e.x>205*T || e.y<299*T || e.y>443*T)return;
  // The static silhouettes already live in the terrain cache. Restore only
  // foreground stems within the part that a passing actor could have covered.
  g.save();g.beginPath();g.rect(e.x-24,e.y-26,48,53);g.clip();
  visitReeds(e.x-60,e.y,e.x+60,e.y+82,(x,y,w,h,flip,a)=>{
    if(y>=e.y && y-h<e.y+27 && Math.abs(x-e.x)<w*.65+24)reedStand(g,x,y,w,h,flip,a);
  });
  g.restore();
}
const marshRipples=[];
function marshContact(e,foot,step,fallback=false){
  const depth=marshDepth(foot.x,foot.y);
  if(depth<=.035)return;
  marshRipples.push({x:foot.x,y:foot.y,t:environmentTime,d:depth,a:foot.a??e.ang});
  if(marshRipples.length>32)marshRipples.shift();
  if(fallback){const s=surf(foot.x,foot.y);emitFootfall(s);play(s);}
  if(step%2 && reedDensity(foot.x,foot.y)>.28)play('winterReeds',foot.x,foot.y,.43);
}
function drawMarshRipples(g,vx,vy,vw,vh){
  while(marshRipples.length && environmentTime-marshRipples[0].t>1.25)marshRipples.shift();
  g.save();
  for(const p of marshRipples){
    if(p.x<vx-28||p.y<vy-28||p.x>vx+vw+28||p.y>vy+vh+28)continue;
    const age=environmentTime-p.t,fade=(1-age/1.25)*p.d;
    const r=3+age*(8+7*p.d);
    g.lineWidth=.85;
    for(const [offset,color] of [[0,'53,65,63'],[1,'198,201,181']]){
      g.strokeStyle='rgba('+color+','+(.73*fade)+')';
      g.beginPath();g.ellipse(p.x,p.y+offset,r,r*.72,p.a,.34,3.65);g.stroke();
      g.beginPath();g.ellipse(p.x,p.y+offset,r*.93,r*.67,p.a,4.3,6.13);g.stroke();
    }
  }
  g.restore();
}
function makePumpingStation(){
  const r=pumpRoom;
  house(r.x,r.y,r.w,r.h,r.doors,CO,0,r.roof);
  const h=HOUSES[HOUSES.length-1];h.pumpingStation=true;buildEntrances(h);district.levels.push(r);
  for(const [type,u,v,turn] of [['stove',7.55,5.25,1],['desk',6.7,1.9,0],['bench',3.3,5.83,2],['rack',7.33,3.4,1]]){
    putFurniture(type,(r.x+u)*T,(r.y+v)*T,turn*Math.PI/2,'pumping-station');
  }
  const py=pumpTower.y+7,px=pumpTower.x+35,ex=r.x*T+10;
  interiorObject('pumpMachinery',(r.x+1.84)*T,py,46,32);
  atlasProp('waterTower',pumpTower.x,pumpTower.y,120,190);
  for(const [dx,dy] of towerFeet)interiorObject('towerFoot',pumpTower.x+dx,pumpTower.y+dy,11,11);
  const feed=interiorObject('waterMain',(px+ex)/2,py,ex-px,8,{belowLamp:true});
  feed.piers=[];
  for(const u of [.28,.60,.9]){
    const x=px+u*(ex-px);
    interiorObject('pipeFoot',x,py,12,13,{belowLamp:true});
    feed.piers.push(x);
  }

}
function preparePumpArt(){
  const s=ART.m.sprites.c1_pump,[,,w,h]=s.rect,c=winterCanvas(w,h);
  c.getContext('2d').drawImage(ART.images[s.atlas],...s.rect,0,0,w,h);
  district.images.pumpMotor=c;
}
function supplyPipe(g,x1,y1,x2,y2,shadow=true){
  const length=Math.hypot(x2-x1,y2-y1),skin=district.images.mainPipe;
  if(shadow)beam(g,x1+2,y1+3,x2+2,y2+3,9,'#49515766');
  g.save();g.translate(x1,y1);g.rotate(Math.atan2(y2-y1,x2-x1));
  const bays=Math.max(1,Math.round(length/69)),span=length/bays;
  for(let i=0;i<bays;i++)g.drawImage(skin,i*span,-5,span+.25,10);
  g.restore();
}
function pipePier(g,x,y,mapView){
  const [sx,sy]=raisedOffset(x,y,13,mapView);
  g.save();g.translate(x,y);
  if(SHADOWS)shoreEllipse(g,3,4,10,4,'#47515a52',.2);
  for(const [xa,ya,xb,yb] of [[-6,6,6,6],[6,6,6,-6],[-6,-6,-6,6]]){
    g.save();g.beginPath();g.moveTo(xa,ya);g.lineTo(xb,yb);g.lineTo(xb+sx,yb+sy);g.lineTo(xa+sx,ya+sy);g.closePath();g.clip();
    artFill(g,'wall_concrete',-12,-18,27,29);g.fillStyle='#514e454f';g.fill();g.restore();
  }
  artFill(g,'floor_concrete',sx-6,sy-6,12,12);
  snowDrift(g,-5,5,7,3,-.17,94);
  g.restore();
}
function pumpYardGround(g){
  const x=pumpTower.x,y=pumpTower.y,px=pumpRoom.x*T+10;
  if(SHADOWS){
    beam(g,x+37,y+10,px+2,y+10,10,'#49515766');

  }
  for(const [dx,dy] of towerFeet){
    shoreEllipse(g,x+dx,y+dy,10,7,'#5f696c70');
    artFill(g,'wall_concrete',x+dx-5.5,y+dy-5.5,11,11);
    snowDrift(g,x+dx-3,y+dy+4,9,3,-.16,21+dx+dy);
  }
  snowDrift(g,pumpRoom.x*T+34,(pumpRoom.y+pumpRoom.h)*T,36,9,-.21,614);
}
function pumpFloor(r){
  const c=baseInterior(r),g=c.getContext('2d'),cx=1.84*T,cy=pumpTower.y+7-r.y*T;
  artFill(g,'wall_concrete',cx-31,cy-24,62,44);
  supplyPipe(g,0,cy,cx-13,cy);
  supplyPipe(g,7.6*T,5.25*T,8.52*T,5.25*T);
  for(let i=0;i<7;i++)beam(g,cx+30,cy-20+i*4,cx+41,cy-20+i*4,1.7,'#444640');
  return c;
}

// The lattice, shell and roof occupy separate elevations. Only their centres
// move in perspective; a camera change never stretches the tank or its feet.
function drawWaterTower(g,p,mapView){
  const bearingHeight=68;
  const [dx,dy]=winterParallax(p.x,p.y,bearingHeight/winterTilt,mapView);
  g.save();g.translate(p.x,p.y);
  const upright=(x,y,a,b,w)=>{
    beam(g,x,y,a,b,w,'#46473f');
    beam(g,x-.8,y,a-.8,b,w*.46,'#8d8876');
    beam(g,x-1.4,y-1,a-1.4,b-1,.75,'#b0b0a1');
  };
  // The front crossbeam seats under the tank at both posts. The curved rim
  // projects beyond that beam in the centre while all feet stay on their pads.
  for(const y of [-18,18]){
    const ey=y-bearingHeight+dy,shift=dx;
    upright(-35,y,35+shift,ey,2.4);upright(35,y,-35+shift,ey,2.4);
    for(const x of [-35,35]){
      upright(x,y,x+shift,ey,5.1);
      beam(g,x-4.5,y+1,x+4.5,y+1,2.4,'#6c7068');
    }
    upright(-35+shift,ey,35+shift,ey,4);
  }
  for(const x of [-35,35])upright(x,-18,x+dx,18-bearingHeight+dy,2.1);
  // Canvas origin of the tank is the centre of the eaves.
  const tank=district.images.tankShell,w=99,h=w*tank.height/tank.width;
  g.drawImage(tank,dx-w/2,dy-bearingHeight+19-h,w,h);
  const lx=24,top=dy-76;
  for(const x of [lx,lx+7])upright(x,18,x+dx,top,1.55);
  for(let i=1;i<15;i++){
    const u=i/15;
    beam(g,lx+dx*u,18+(top-18)*u,lx+7+dx*u,18+(top-18)*u,1.1,'#817d6d');
  }
  g.restore();
}
