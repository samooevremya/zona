// The drainage channel runs south from the existing marsh. Its banks supply both
// the terrain mask and the waterline rendered into the outdoor tiles and survey.
const pumpRoom={x:203,y:432,w:9,h:7,n:1,name:'Насосная',doors:[[0,3],[0,4]],roof:'slate'};
const pumpTower=tilePoint(194.85,432.35),pumpHearth=tilePoint(210.2,437);
const pumpHeater={at:pumpHearth,flag:'pumpStoveUntil',room:pumpRoom,action:'pumpKindle'};
const towerFeet=[[-35,-18],[35,-18],[-35,18],[35,18]];
const marshFork=[183.8,434.2],pumpDoor=[203.5,436];
const marshCrossing=[marshFork,[192,434.5],[197.8,435.6],[200.6,436],pumpDoor];
const marshBank=[marshFork,[183.7,437.6],[185.7,440.8],[188.2,444.2],[194.7,445.6],[200.7,443.4],[201.5,440],[201.5,437],pumpDoor];
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
let channelOutline;
function paintMarshChannel(g){
  if(!channelOutline){
    channelOutline=new Path2D();
    for(let y=369;y<=440;y+=.25)channelOutline.lineTo(channelBanks(y)[0]*T,y*T);
    for(let y=440;y>=369;y-=.25)channelOutline.lineTo(channelBanks(y)[1]*T,y*T);
    channelOutline.closePath();
  }
  g.save();g.clip(channelOutline);
  g.fillStyle=g.createPattern(district.ice,'repeat');g.globalAlpha=.62;g.fill(channelOutline);
  g.globalAlpha=1;g.fillStyle='#4d686d54';g.fill(channelOutline);
  g.strokeStyle=g.createPattern(district.snow,'repeat');
  for(const [width,opacity] of [[67,.20],[45,.34],[32,.46],[20,.62],[10,.83],[4,1]]){
    g.lineWidth=width;g.globalAlpha=opacity;g.stroke(channelOutline);
  }
  g.restore();
}
function paintMarshCover(g,l,t,r,b){
  // Candidate tufts belong to a world cell. Include neighbours so crossing a
  // render-tile edge never cuts a reed or a patch of exposed water in half.
  const cell=64;
  for(let j=Math.floor((t-35)/cell);j<=Math.floor((b+35)/cell);j++)
    for(let i=Math.floor((l-35)/cell);i<=Math.floor((r+35)/cell);i++){
      const rand=mulberry32((i*73856093 ^ j*19349663)>>>0);
      const x=(i+rand())*cell,y=(j+rand())*cell;
      if(!swampAt(x,y) || rand()<.28+.18*Math.sin(i*.76+j*.43))continue;
      const size=10+rand()*17,angle=-.39+rand()*.4;
      g.save();g.translate(x,y);g.rotate(angle);
      const melt=g.createRadialGradient(0,0,0,0,0,1);
      melt.addColorStop(0,'#273e48ad');melt.addColorStop(.68,'#374f5e88');melt.addColorStop(1,'#81939a00');
      g.save();g.scale(size,size*.34);g.fillStyle=melt;g.fillRect(-1,-1,2,2);g.restore();
      beam(g,-size*.64,1,size*.32,1.4,.85,'#b7c7c375');
      if(rand()<.22){
        beam(g,size*.45,1,size*.72,4,.8,'#516269');
        beam(g,size*.72,4,size,3.4,.6,'#65777e');
      }
      const stalks=3+Math.floor(rand()*7);
      for(let k=0;k<stalks;k++){
        const foot=(rand()-.5)*15,base=rand()*3,dx=(rand()-.38)*13,dy=4+rand()*15;
        beam(g,foot,base,foot+dx*.7+4,base+dy*.45,1,'#45545645');
        beam(g,foot,base,foot+dx,base-dy,1,'#786747');
        beam(g,foot+.5,base,foot+dx+.6,base-dy,.55,'#c7b79a');
        if(k%3===0)beam(g,foot+dx,base-dy,foot+dx*.9,base-dy+3.1,1.8,'#64523c');
      }
      g.restore();
    }
}
function makePumpingStation(){
  const r=pumpRoom;
  house(r.x,r.y,r.w,r.h,r.doors,CO,0,r.roof);
  const h=HOUSES[HOUSES.length-1];h.pumpingStation=true;buildEntrances(h);district.levels.push(r);
  for(const [type,u,v,turn] of [['stove',7.2,5,0],['desk',6.9,1.9,0],['bench',2.5,5.4,0],['rack',1.8,1.9,1]]){
    const o=putFurniture(type,(r.x+u)*T,(r.y+v)*T,turn*Math.PI/2,'pumping-station');
    if(type==='desk')o.workbench=true;
  }
  const x=(r.x+4)*T,y=(r.y+2.55)*T;
  interiorObject('pumpMachinery',x,y-4,46,32);
  atlasProp('waterTower',pumpTower.x,pumpTower.y,120,190);
  for(const [dx,dy] of towerFeet)interiorObject('towerFoot',pumpTower.x+dx,pumpTower.y+dy,11,11);
  // Insulated supply line runs beside the building above the entrance.
  const px=pumpTower.x+35,py=pumpTower.y+7,ex=(r.x+4)*T,ey=(r.y+1.55)*T;
  const feed=interiorObject('waterMain',(px+ex)/2,py,ex-px,8);
  feed.piers=[];
  for(const u of [.28,.60,.9]){
    const x=px+u*(ex-px);
    interiorObject('pipeFoot',x,py,12,13);
    feed.piers.push(x);
  }
  interiorObject('waterMain',ex,(py+ey)/2,8,ey-py);
}
function preparePumpArt(){
  const s=ART.m.sprites.c1_pump,[,,w,h]=s.rect,c=winterCanvas(w,h);
  c.getContext('2d').drawImage(ART.images[s.atlas],...s.rect,0,0,w,h);
  district.images.pumpMotor=c;
}
let winterPipeSkin;
function ironPipeSkin(){
  if(winterPipeSkin)return winterPipeSkin;
  const c=winterCanvas(64,16),g=c.getContext('2d');
  const sprite=ART.m.sprites.c1_trace_pipes,[x,y]=sprite.rect;
  // Unroll a strip from the weathered straight pipe. Its seam, oxidation and
  // round shading stay fixed to the metal as the pipe changes direction.
  g.rotate(-.22);g.translate(-22,-62);
  g.drawImage(ART.images[sprite.atlas],x,y,116,115,0,0,116,115);
  winterPipeSkin=c;return c;
}
function supplyPipe(g,x1,y1,x2,y2,shadow=true){
  if(shadow)beam(g,x1+2,y1+3,x2+2,y2+3,10,'#49515766');
  const length=Math.hypot(x2-x1,y2-y1);
  g.save();g.translate(x1,y1);g.rotate(Math.atan2(y2-y1,x2-x1));
  const skin=ironPipeSkin();
  for(let x=0;x<length;x+=32){
    const span=Math.min(32,length-x);
    g.drawImage(skin,0,0,span*2,16,x,-4,span,8);
  }
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
  const x=pumpTower.x,y=pumpTower.y,px=(pumpRoom.x+4)*T;
  if(SHADOWS){
    beam(g,x+37,y+10,px+2,y+10,10,'#49515766');
    beam(g,px+2,y+10,px+2,(pumpRoom.y+1.55)*T+3,10,'#49515766');
  }
  for(const [dx,dy] of towerFeet){
    shoreEllipse(g,x+dx,y+dy,10,7,'#5f696c70');
    artFill(g,'wall_concrete',x+dx-5.5,y+dy-5.5,11,11);
    snowDrift(g,x+dx-3,y+dy+4,9,3,-.16,21+dx+dy);
  }
  snowDrift(g,pumpRoom.x*T+34,(pumpRoom.y+pumpRoom.h)*T,36,9,-.21,614);
}
function pumpFloor(r){
  const c=baseInterior(r),g=c.getContext('2d'),cx=4*T,cy=2.55*T;
  artFill(g,'wall_concrete',cx-31,cy-24,62,44);
  supplyPipe(g,cx,0,cx,cy-13);
  for(let i=0;i<7;i++)beam(g,cx+30,cy-20+i*4,cx+41,cy-20+i*4,1.7,'#444640');
  return c;
}

// The lattice, shell and roof occupy separate elevations. Only their centres
// move in perspective; a camera change never stretches the tank or its feet.
let towerTank;
function waterTankArt(){
  if(towerTank)return towerTank;
  const c=winterCanvas(208,280),g=c.getContext('2d');
  g.scale(2,2);g.translate(52,63);
  const rx=46,ry=35,wall=29;
  // Rolled bearing ring below the shell; its underside catches the sky light.
  const ring=g.createLinearGradient(0,wall+4,0,wall+ry+6);
  ring.addColorStop(0,'#454640');ring.addColorStop(.85,'#464943');ring.addColorStop(1,'#77766a');
  shoreEllipse(g,0,wall+3,rx+.5,ry+2,ring);
  const side=new Path2D();
  side.moveTo(-rx,0);side.lineTo(-rx,wall);side.ellipse(0,wall,rx,ry,0,Math.PI,0,true);
  side.lineTo(rx,0);side.ellipse(0,0,rx,ry,0,0,Math.PI);side.closePath();
  g.save();g.clip(side);
  artFill(g,'wall_concrete',-rx,-1,2*rx,wall+ry+2);
  const shade=g.createLinearGradient(-rx,0,rx,0);
  for(const [at,color] of [[0,'#353932de'],[.18,'#7972699e'],[.36,'#8a7f6aab'],[.72,'#575449c9'],[1,'#333933e0']])shade.addColorStop(at,color);
  g.fillStyle=shade;g.fillRect(-rx,0,rx*2,wall+ry);
  const rand=mulberry32(3677);
  for(let i=0;i<180;i++){
    const x=rx*(rand()*2-1),top=ry*Math.sqrt(1-(x/rx)**2);
    const y=top+rand()*wall;
    beam(g,x,y,x+.2,y+rand()*7,.35+rand(),'#59473466');
  }
  for(let a=.12;a<Math.PI;a+=.34){
    const x=rx*Math.cos(a),y=ry*Math.sin(a);
    beam(g,x,y,x,y+wall,1.1,'#464438');
    for(let v=3;v<wall;v+=6)shoreEllipse(g,x-.6,y+v,.65,.65,'#b0a18b');
  }
  for(const v of [2,wall-3,wall]){
    g.beginPath();g.ellipse(0,v,rx,ry,0,0,Math.PI);g.lineWidth=2;g.strokeStyle='#40453e';g.stroke();
    g.translate(0,-1.2);g.lineWidth=.8;g.strokeStyle='#afa998';g.stroke();g.translate(0,1.2);
  }
  g.restore();
  // Conical sheet-metal roof. Snow texture and joint shadows are baked once
  // at double resolution and keep their scale on the in-game map.
  const cap=new Path2D();cap.ellipse(0,-1,rx+1,ry+1,0,0,Math.PI*2);
  g.save();g.clip(cap);
  g.fillStyle=g.createPattern(district.snow,'repeat');g.fillRect(-49,-38,98,76);
  const hub=[-1,-10];
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    g.beginPath();g.moveTo(...hub);g.ellipse(0,-1,rx+1,ry+1,0,a,a+Math.PI/8);g.closePath();
    g.fillStyle='rgba(43,49,49,'+(.06+.24*(1+Math.cos(a-.65))/2)+')';g.fill();
    const x=(rx+1)*Math.cos(a),y=-1+(ry+1)*Math.sin(a);
    beam(g,...hub,x,y,.8,'#62665f77');beam(g,hub[0]+1,hub[1],x+1,y,.6,'#e0e4e18e');
  }
  for(let i=0;i<58;i++){
    const a=rand()*Math.PI*2,u=.83+rand()*.17;
    shoreEllipse(g,rx*u*Math.cos(a),ry*u*Math.sin(a)-1,.45+rand()*1.3,.6,'#6e685c66');
  }
  g.restore();g.strokeStyle='#646660';g.lineWidth=1.8;g.stroke(cap);
  shoreEllipse(g,...hub,4.4,3.1,'#5a5c55');shoreEllipse(g,hub[0]-.5,hub[1]-1,4,2.2,'#bac1be');
  g.save();g.translate(21,-10);g.rotate(.35);g.fillStyle='#4f514b';g.fillRect(-6,-4,13,9);
  artFill(g,'wall_concrete',-5,-4,11,7);beam(g,-4,-4,5,-4,1.3,'#ccd1cc');g.restore();
  towerTank=c;return c;
}
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
  g.drawImage(waterTankArt(),dx-52,dy-99-63,104,140);
  const lx=24,top=dy-76;
  for(const x of [lx,lx+7])upright(x,18,x+dx,top,1.55);
  for(let i=1;i<15;i++){
    const u=i/15;
    beam(g,lx+dx*u,18+(top-18)*u,lx+7+dx*u,18+(top-18)*u,1.1,'#817d6d');
  }
  g.restore();
}
