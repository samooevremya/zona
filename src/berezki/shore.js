// Both the worn track in the snow and the resident's route use these landings.
const shoreX=443,shoreY=114;
const fishingTrack=[[46.9,14.4],[48,16.6],[48,18.8],[52.9,18.8],[53.2,12],[51.8,9.2],[48.4,8]].map(([x,y])=>[shoreX+x,shoreY+y]);
const iceHole=tilePoint(shoreX+48.4,shoreY+7.4);
const fishingRoom={x:shoreX+44,y:shoreY+11,w:8,h:7,n:1};
const villageCabins=[
  {x:480,y:138,w:7,h:5,n:1,doors:[[3,0],[4,0]],roof:'plank',ridge:'vertical',name:'Западная изба'},
  {x:499,y:125,w:8,h:6,n:1,doors:[[2,5],[3,5]],roof:'slate',name:'Восточная изба'}
];
const shoreFire=tilePoint(497.6,135.25);
const netRack=tilePoint(484.5,131.2);
const shoreLanes=[
  [[481,136],[484,135.9],[488.1,134.4],[491,132.8]],
  [[484,135.9],[484,138]],
  [[488.1,134.4],[492,134.9],[495.6,133.9],[499.3,133.4],[502,132.5],[502,131]],
  [[495.6,133.9],[496.1,135.6],[497.2,136.55],[499.1,135.7],[499.3,133.4]],
  [[488.1,134.4],[486.2,133],[483,133.1],[482.6,130.9],[483.1,129.3],[483.2,124.4]],
  [[483.2,124.4],[486.5,122.2],[488.9,121.6],[491.4,121.4]]
];
const shoreFences=[];
const outdoorSeats=[];
let fishingHouse,woodStack;
function makeVillageYards(){
  for(const r of villageCabins){
    house(r.x,r.y,r.w,r.h,r.doors,BR,0,r.roof);
    const h=HOUSES[HOUSES.length-1];h.cabin=r;buildEntrances(h);
    district.levels.push(r);
  }
  for(const [x,y,w,h] of [
    [479,137,3,.16],[486,137,2,.16],[479,137,.16,6],
    [499.4,132.1,1.25,.16],[504.3,132.1,3.5,.16],[507.65,127.7,.16,4.55],
    [479.8,131.9,1.6,.16]
  ])shoreFences.push(addObj({k:'fence',material:'picket',solid:1,x:x*T,y:y*T,w:w*T,h:h*T}));
  for(const [x,y,angle] of [[497.5,137.45,0],[500.55,135.25,Math.PI/2]])
    outdoorSeats.push(putFurniture('bench',x*T,y*T,angle,'shore-court'));
  interiorObject('netShelter',netRack.x,netRack.y,78,36);
  interiorObject('roastingPit',shoreFire.x,shoreFire.y,41,24);
}
function makeFishingShore(){
  makeVillageYards();
  const r=fishingRoom;
  house(r.x,r.y,r.w,r.h,[[3,6],[4,6]],BR,0,'plank');
  fishingHouse=HOUSES[HOUSES.length-1];buildEntrances(fishingHouse);
  district.levels.push(r);
  partition(shoreX+46.75,shoreY+15.7,.17,1.3,'timber');
  partition(shoreX+49.15,shoreY+15.7,.17,1.3,'timber');
  putFurniture('stove',(shoreX+46)*T,(shoreY+13.4)*T,0,'shore');
  district.heaters.push(tilePoint(shoreX+46,shoreY+13.4));
  putFurniture('bedroll',(shoreX+50.1)*T,(shoreY+13.9)*T,0,'shore');
  putFurniture('cupboard',(shoreX+49.4)*T,(shoreY+12.5)*T,Math.PI/2,'shore').loot={bandage:1};
  putFurniture('supper',(shoreX+45.9)*T,(shoreY+16.25)*T,0,'shore');
  woodStack=interiorObject('woodStack',(shoreX+45.5)*T,(shoreY+18.43)*T,60,19);
}
function fishRoutine(e,dt){
  const last=fishingTrack.length-1;
  const round=S.flags.fishingRound||={index:0,outward:false,until:0};
  const hour=(S.min%1440)/60,day=hour>=7 && hour<18;
  if(!day && round.outward){
    round.outward=false;round.index=Math.max(0,round.index-1);round.until=0;
  }
  const [x,y]=fishingTrack[round.index];
  if(dst(e.x,e.y,x*T,y*T)>4){
    e.crouch=0;goTo(e,x*T,y*T,61,dt);return;
  }
  if(round.index===0 || round.index===last){
    const onIce=round.index===last;
    e.crouch=onIce?1:0;e.ang=onIce?-Math.PI/2:Math.atan2(shoreY+13.4-y,shoreX+46-x);
    if(!round.until)round.until=S.min+(onIce?9:4);
    if(S.min<round.until || (!onIce && !day))return;
    round.outward=!onIce;round.until=0;
  }
  round.index+=round.outward?1:-1;
}
function restoreShoreFooting(){
  if(P.x<478*T || P.x>509*T || P.y<121*T || P.y>145*T || clearFooting(P.x,P.y,P.r))return;
  // Slots saved on a newly occupied footprint resume at its closest free spot.
  let best=null,gap=Infinity;
  const tx=Math.floor(P.x/T),ty=Math.floor(P.y/T);
  for(let y=ty-5;y<=ty+5;y++)for(let x=tx-5;x<=tx+5;x++){
    const p=tilePoint(x+.5,y+.5),d=dE(P,p);
    if(d<gap && clearFooting(p.x,p.y,P.r)){best=p;gap=d;}
  }
  if(best)Object.assign(P,best);
}
function shoreEllipse(g,x,y,rx,ry,color,angle=0){
  g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,angle,0,Math.PI*2);g.fill();
}
function shoreGround(g){
  const rand=mulberry32(24485);
  // Broken crust follows the width of the lane and thins along its edges.
  for(const trail of shoreLanes){
    for(let i=1;i<trail.length;i++){
      const [x,y]=trail[i-1],[u,v]=trail[i],angle=Math.atan2(v-y,u-x);
      const len=Math.hypot(u-x,v-y)*T,dx=Math.cos(angle),dy=Math.sin(angle);
      for(let step=0;step<len;step+=4+rand()*6){
        const offset=(rand()-.5)*32;
        const px=x*T+dx*step-dy*offset,py=y*T+dy*step+dx*offset;
        shoreEllipse(g,px,py,6+rand()*9,2+rand()*3,'#79868e28',angle+(rand()-.5)*.45);
        if(rand()<.32)shoreEllipse(g,px,py+1,3+rand()*2,1.6,'#e5e8e341',angle);
      }
    }
  }
  for(const trail of [fishingTrack.slice(2)]){
    let step=0;
    for(let i=1;i<trail.length;i++){
      const [x,y]=trail[i-1],[tx,ty]=trail[i],dx=(tx-x)*T,dy=(ty-y)*T;
      const length=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
      for(let s=0;s<length;s+=10,step++){
        const side=(step%2?3.4:-3.4)+rand()*2-1;
        const px=x*T+dx*s/length-Math.sin(a)*side,py=y*T+dy*s/length+Math.cos(a)*side;
        shoreEllipse(g,px,py+1,5.4,2.5,'rgba(243,245,239,.39)',a);
        shoreEllipse(g,px,py,5,2.2,'rgba(73,82,86,.31)',a);
      }
    }
  }
  const {x,y}=iceHole;
  shoreEllipse(g,x,y,14,11,'#c6ced0');shoreEllipse(g,x-1,y,10,7.6,'#364b53');
  shoreEllipse(g,x-1,y+1.3,9,5.2,'#263a44');
  for(let i=0;i<23;i++){
    const a=rand()*6.28;shoreEllipse(g,x+Math.cos(a)*(12+rand()*5),y+Math.sin(a)*(9+rand()*5),1+rand()*2,1,'#e5ebe9',a);
  }
  beam(g,x+12,y+11,x+5,y-1,1.7,'#775d45');
  for(const h of HOUSES.filter(h=>h===fishingHouse || h.cabin)){
    const door=h.entrances[0],cx=h.x*T+door.x,edge=h.y*T+door.y;
    const py=edge+(door.ny<0?-19:0);
    artFill(g,'floor_wood',cx-door.width/2-3,py,door.width+6,19);
    for(const v of [4,10,17])beam(g,cx-door.width/2-3,py+v,cx+door.width/2+3,py+v,1.4,'#746859');
  }
  for(const o of shoreFences)drawFenceRun(g,o);
  for(const o of outdoorSeats)drawRoomFitting(g,o);
  const ash=g.createRadialGradient(shoreFire.x,shoreFire.y,5,shoreFire.x,shoreFire.y,29);
  ash.addColorStop(0,'#37312b');ash.addColorStop(.5,'#6f655cb3');ash.addColorStop(1,'#908c8000');
  g.fillStyle=ash;g.fillRect(shoreFire.x-29,shoreFire.y-29,58,58);
}
function cabinFloor(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
  artFill(g,'floor_wood',0,0,c.width,c.height);
  for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)if(tAt(r.x+x,r.y+y)===BR){
    artFill(g,'floor_wood',x*T,y*T,T,T);
    g.fillStyle='#493f3480';g.fillRect(x*T,y*T,T,T);
  }
  return c;
}
function fishingInterior(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
  const x=r.x*T,y=r.y*T;g.translate(-x,-y);
  artFill(g,'floor_wood',x,y,c.width,c.height);
  for(let v=0;v<r.h;v++)for(let u=0;u<r.w;u++){
    if(tAt(r.x+u,r.y+v)!==BR)continue;
    const left=x+u*T,top=y+v*T;
    artFill(g,'floor_wood',left,top,T,T);
    g.fillStyle='#423b2e80';g.fillRect(left,top,T,T);
    for(let i=2;i<T;i+=8)beam(g,left,top+i,left+T,top+i,1,'#352e2470');
  }
  g.save();g.translate(shoreX*T,shoreY*T);
  g.fillStyle='#695545';g.fillRect(47*T,16*T,2*T,1.4*T);
  for(let i=1;i<43;i+=5)beam(g,47*T,16*T+i,49*T,16*T+i,1.2,'#918071');
  // Folded felt over the window and a clothesline close to the stove.
  artFill(g,'floor_wood',46.8*T,12*T-7,44,10);
  g.fillStyle='#716e5f';g.fillRect(46.8*T,12*T-4,43,12);
  for(let i=2;i<42;i+=5)beam(g,46.8*T+i,12*T-4,46.8*T+i-1,12*T+8,1,'#827e6e');
  beam(g,45.5*T,12.25*T,47.3*T,12.42*T,1.1,'#695741');
  for(const ix of [46.15,46.45]){
    shoreEllipse(g,ix*T,12.47*T,3,5,'#74533a',-.17);
    shoreEllipse(g,ix*T+2.5,12.50*T,1.6,2.6,'#74533a',-.7);
  }
  g.restore();
  for(const o of objs){
    if(winterFloor(o.x,o.y)!==r)continue;
    if(o.k==='roomFitting')drawRoomFitting(g,o);
    if(o.k==='partition')paintPartition(g,o);
  }
  g.translate(shoreX*T,shoreY*T);
  const glow=g.createRadialGradient(46*T,13.4*T,2,46*T,13.4*T,53);
  glow.addColorStop(0,'rgba(238,146,57,.36)');glow.addColorStop(1,'transparent');
  g.fillStyle=glow;g.fillRect(46*T-53,13.4*T-53,106,106);
  beam(g,46*T-5,13.4*T+8,46*T+5,13.4*T+8,2,'#d68f52');
  return c;
}
function fishingRoof(h){
  const w=h.w*T+10,d=h.h*T+10,c=winterCanvas(w,d),g=c.getContext('2d');
  const vertical=h.cabin?.ridge==='vertical';
  const width=vertical?d:w,depth=vertical?w:d;
  g.save();
  if(vertical){g.translate(w,0);g.rotate(Math.PI/2);}
  g.drawImage(balancedGable(h.mat==='slate'?'c1_roof_slate':'c1_roof_plank'),0,0,width,depth);
  const snow=g.createPattern(snowMaterial(),'repeat');snow.setTransform(new DOMMatrix().scale(.42));
  g.fillStyle=snow;g.globalAlpha=h.mat==='slate'?.49:.69;g.fillRect(2,2,width-6,depth-7);g.globalAlpha=1;
  g.fillStyle='#50617633';g.fillRect(2,depth/2,width-6,depth/2-5);
  beam(g,2,depth/2,width-4,depth/2,3,'#d5d9d6');
  for(let x=12;x<width-6;x+=17)beam(g,x,depth/2+2,x-2,depth-6,1,'#66727952');
  g.restore();
  const cx=h.cabin?(h.w-2)*T:2*T,cy=2.4*T;g.fillStyle='#514f4c66';g.fillRect(cx-2,cy+3,17,15);
  artFill(g,'wall_brick',cx-6,cy-7,14,15);g.fillStyle='#312f2a';g.fillRect(cx-3,cy-5,8,8);
  beam(g,cx-7,cy-7,cx+8,cy-7,2,'#c4c6c0');
  return c;
}
