// The approach road ends at the existing gate. Keep the whole compound south of it.
const baseRooms=[
  {kind:'guard',name:'Караульная',x:312,y:570,w:8,h:6,doors:[[7,2],[7,3]],
    fittings:[['stove',2,2],['desk',5,1.8],['bench',3.6,4.3],['rack',1.8,4.1]]},
  {kind:'barracks',name:'Казарма',x:331,y:570,w:13,h:8,doors:[[0,3],[0,4]],
    fittings:[['bedroll',2.5,1.9,1],['bedroll',5.3,1.9,1],['bedroll',8.1,1.9,1],
      ['cupboard',10.8,2.2,0,{ar_jacket:1}],['bench',3.3,6],['desk',10.4,5.85],['bedroll',6.7,6,1]]},
  {kind:'stores',name:'Вещевой склад',x:307,y:585,w:12,h:8,doors:[[11,3],[11,4]],
    fittings:[['rack',2.2,2.2],['rack',5.4,2.2],['pallet',8.7,2.2],['rack',2,5.5],
      ['cabinet',8.6,5.8,0,{cans:2,bandage:1}],['sack',5.4,5.8]]},
  {kind:'hangar',name:'Ремонтный ангар',x:329,y:585,w:15,h:10,
    doors:[[6,0],[7,0],[8,0],[6,9],[7,9],[8,9]],fittings:[['desk',2.4,2.1],['rack',2,7.7],
      ['cabinet',12.8,2.2,0,{bandage:1}],['pallet',12.7,7.3],['files',11,7.5]]}
];
const baseFences=[];
const baseLanes=[[[325,568],[325,573],[324,582],[324,589],[324,596],[336.5,597],[336.5,595]],
  [[320,573],[325,573],[331,574]],[[324,589],[319,589]],[[324,582],[336.5,581.5],[336.5,585]]];
const baseStove=tilePoint(314,572);
const baseHeater={at:baseStove,flag:'baseStoveUntil',room:baseRooms[0],action:'baseKindle'};
function stoveIn(room){return room===baseRooms[0]?baseHeater:room===pumpRoom?pumpHeater:room?.heater;}
function stoveBurning(stove){return stove && (S.flags[stove.flag]||0)>S.min;}
function makeBase(){
  for(const r of baseRooms){
    r.n=1;house(r.x,r.y,r.w,r.h,r.doors,CO,0,'conc');
    const h=HOUSES[HOUSES.length-1];h.baseRoom=r;buildEntrances(h);district.levels.push(r);
    for(const [type,u,v,turn=0,loot] of r.fittings){
      const o=putFurniture(type,(r.x+u)*T,(r.y+v)*T,turn*Math.PI/2,'base-'+r.kind);
      if(loot)o.loot=loot;
      if(r.kind==='hangar' && type==='desk')o.workbench=true;
    }
    if(r.kind==='hangar')interiorObject('servicePit',(r.x+4.2)*T,(r.y+5)*T,1.25*T,3*T);
  }
  // The gap in the western fence is a second way back into the yard.
  for(const [x,y,w,h] of [[304,568,16.3,.16],[329.7,568,17.3,.16],[347,568,.16,30],
    [304,598,43.16,.16],[304,568,.16,11],[304,582,.16,16]])
    baseFences.push(addObj({k:'fence',material:'stationMesh',x:x*T,y:y*T,w:w*T,h:h*T,solid:1}));
}
// The same floor atlas and furniture footprints are used in the scene and PDA.
function baseInterior(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d'),w=c.width,h=c.height;
  winterPaving(g,r.kind==='barracks'?'boards':'slab',0,0,w,h);
  const rand=mulberry32(r.x*391+r.y);
  for(let i=0;i<52;i++){
    const x=rand()*w,y=rand()*h;
    shoreEllipse(g,x,y,2+rand()*13,.5+rand()*2,'#4b483920',rand()*.5);
  }
  for(let j=0;j<r.h;j++)for(let i=0;i<r.w;i++)if(tAt(r.x+i,r.y+j)===CO){
    artFill(g,'wall_concrete',i*T,j*T,T,T);
    g.fillStyle='#393d3980';g.fillRect(i*T,j*T,T,T);
  }
  if(r.kind==='hangar'){
    const x=(4.2-.625)*T,y=3.5*T,pw=1.25*T,ph=3*T;
    artFill(g,'wall_concrete',x-3,y-3,pw+6,ph+6);
    const depth=g.createLinearGradient(x,y,x+pw,y+7);
    depth.addColorStop(0,'#181c1b');depth.addColorStop(.68,'#484941');depth.addColorStop(1,'#737268');
    g.fillStyle=depth;g.fillRect(x,y,pw,ph);
    for(let i=0;i<6;i++){
      beam(g,x,y+i*16,x+6,y+i*16+4,1,'#b5a58b88');
      beam(g,x+7,y+i*16+4,x+pw-5,y+i*16+4,.7,'#625c4e');
    }
    beam(g,x-1,y,x-1,y+ph,2,'#977c59');
    beam(g,x+pw+1,y,x+pw+1,y+ph,2,'#483c31');
    for(let j=1;j<=5;j++)beam(g,x+4,y+j*4,x+pw-4,y+j*4,2,'#918575');
    for(const u of [6.2,8.75])for(let j=0;j<32;j++)
      beam(g,u*T,j*10,u*T+1,j*10+8,2.2,'#514c4138');
  }
  if(r!==westStore && r.kind && r.kind!=='guard'){
    const u=r.kind==='stores'?.62:.73,v=r.kind==='barracks'?.64:.42;
    g.save();g.globalAlpha=.76;g.translate(u*w,v*h);g.rotate(-.33);
    g.drawImage(district.snowStamp,-55,-31,110,62);g.restore();
  }
  for(const d of r.doors){
    g.save();g.globalAlpha=.5;g.drawImage(district.snowStamp,(d[0]-.23)*T,(d[1]-.16)*T,1.5*T,1.35*T);g.restore();
  }
  return c;
}
// Retracted steel leaves sit flush with the masonry on either side of the drive-through.
function paintHangarGate(g,{u,w}){
  const left=u-w/2,right=u+w/2,leaf=w*.51,rand=mulberry32(Math.round(u)+89);
  const opening=g.createLinearGradient(0,14,0,88);
  opening.addColorStop(0,'#131918');opening.addColorStop(.75,'#292b26');opening.addColorStop(1,'#56534b');
  g.fillStyle=opening;g.fillRect(left,13,w,75);
  const sheet=ART.m.sprites.c1_roof_hangar,[sx,sy,sw,sh]=sheet.rect;
  for(const x of [left-leaf,right]){
    g.fillStyle='#242723';g.fillRect(x-1,12,leaf+3,75);
    g.drawImage(ART.images[sheet.atlas],sx+sw*.2,sy+sh*.18,sw*.29,sh*.32,x,13,leaf,71);
    g.fillStyle='#404a40a8';g.fillRect(x,13,leaf,71);
    for(let i=2;i<leaf-1;i+=7){
      beam(g,x+i,14,x+i,82,1.5,'#252922ab');
      beam(g,x+i+1,14,x+i+1,82,.8,'#c1b9a16b');
    }
    for(let i=0;i<84;i++){
      const u=rand()*leaf,v=rand()*69;
      g.fillStyle=rand()<.5?'#704e37a8':'#aea68b80';
      g.fillRect(x+u,14+v,.6+rand()*1.4,.6+rand()*3.5);
    }
    for(const y of [16,48,82]){
      beam(g,x,y,x+leaf,y,2,'#544d3f');beam(g,x,y-1,x+leaf,y-1,.9,'#a39a88');
      for(let k=4;k<leaf;k+=13){g.fillStyle='#302e28';g.fillRect(x+k,y,1.8,2);}
    }
    const handle=x===right?x+4:x+leaf-7;
    g.strokeStyle='#242825';g.lineWidth=1.7;g.strokeRect(handle,48,3,8);
    for(const k of [.16,.84]){
      g.fillStyle='#343630';g.fillRect(x+k*leaf,6,3,9);
      shoreEllipse(g,x+k*leaf+1,7,2.8,2.8,'#272923');
    }
  }
  beam(g,left-leaf-3,8,right+leaf+3,8,3,'#443e34');
  beam(g,left-leaf-3,6,right+leaf+3,6,1.4,'#bcbdb4');
  for(const x of [left,right])beam(g,x,14,x,87,2,'#756d5f');
  beam(g,left,86,right,86,2,'#898777');
}
function baseRoof(h){
  const r=h.baseRoom || pumpRoom,w=r.w*T+10,d=r.h*T+10,c=winterCanvas(w,d),g=c.getContext('2d');
  artFill(g,'wall_concrete',0,0,w,d);
  const rand=mulberry32(h.x*317+h.y);
  g.fillStyle=r.kind==='hangar'?'#655c5199':'#77796770';g.fillRect(0,0,w,d);
  const sprite=ART.m.sprites[r.kind==='hangar'?'c1_roof_hangar':'c1_roof_office'];
  g.drawImage(ART.images[sprite.atlas],...sprite.rect,0,0,w,d);
  const rib=r.kind==='hangar'?10:24;
  for(let x=3;x<w;x+=rib){
    beam(g,x,0,x,d,2,'#403e3666');beam(g,x+2,0,x+2,d,1,'#cec9b499');
  }
  const snow=g.createPattern(district.snow,'repeat');
  g.globalAlpha=.44;g.fillStyle=snow;g.fillRect(0,0,w,d);g.globalAlpha=1;
  for(let i=0;i<w/2;i++){
    const x=rand()*w,y=rand()*d,l=rand()*52+12;
    g.save();g.globalAlpha=.36;g.drawImage(district.snowStamp,x-l/2,y-l*.19,l,l*.38);g.restore();
  }
  beam(g,0,d*.5,w,d*.5,4,'#666960');beam(g,0,d*.5-1,w,d*.5-1,2,'#dddcd1');
  if(r!==westStore && r.kind && r.kind!=='guard'){
    // Remove a ragged section of roof so the real floor and broken rafters show through.
    const cx=w*(r.kind==='stores'?.62:.73),cy=d*(r.kind==='barracks'?.64:.42);
    const hole=baseBreach(r,w,d);g.lineWidth=6;g.strokeStyle='#59554a';g.stroke(hole);
    g.save();g.clip(hole);g.clearRect(0,0,w,d);
    for(let x=cx-w*.19;x<cx+w*.2;x+=29){
      const end=cy-d*.18+rand()*d*.18;
      beam(g,x,cy-d*.3,x+4,end,5,'#53483b');beam(g,x,cy-d*.3,x+3,end,1.4,'#bcad94');
    }
    g.restore();
  }
  g.strokeStyle='#7d8076';g.lineWidth=4;g.strokeRect(2,2,w-4,d-4);
  if(r.kind==='guard' || r===pumpRoom){
    const x=r===pumpRoom?pumpHearth.x-r.x*T:2*T,y=r===pumpRoom?pumpHearth.y-r.y*T:2*T;
    g.fillStyle='#605e54';g.fillRect(x-7,y-8,16,16);
    shoreEllipse(g,x,y,6,6,'#323532');shoreEllipse(g,x-1,y-1,4,4,'#141916');
  }
  return c;
}
let baseApron;
function paintBaseYard(g){
  if(!baseApron){
    const w=24*T,h=8*T,c=winterCanvas(w,h),b=c.getContext('2d');
    artFill(b,'floor_concrete',0,0,w,h);
    for(let j=0;j<h;j+=49)for(let i=(j%2)*31-32;i<w;i+=85){
      beam(b,i,j,i+84,j+1,1.5,'#565853a3');beam(b,i,j,i,j+48,1,'#646259aa');
    }
    for(const [x,y] of [[100,122],[121,147],[575,108]])beam(b,x,y,x+24,y+13,1,'#434743');
    b.globalCompositeOperation='destination-in';
    b.save();b.scale(w/2,h/2);const edge=b.createRadialGradient(1,1,.3,1,1,1);
    edge.addColorStop(0,'#fff');edge.addColorStop(.75,'#fffc');edge.addColorStop(1,'transparent');
    b.fillStyle=edge;b.fillRect(0,0,2,2);b.restore();baseApron=c;
  }
  g.drawImage(baseApron,313*T,577*T);
  snowDrift(g,320.1*T,581.1*T,46,11,-.08,488);
  for(const r of baseRooms){
    snowDrift(g,(r.x+.8)*T,(r.y+r.h)*T,41,10,-.12,r.x);
    snowDrift(g,(r.x+r.w)*T,(r.y+.7)*T,19,8,-.35,r.y);
  }
}

// Reuse the overhead lorry from the world atlas. Snow adheres to the canvas
// cover and bonnet but the tires, cab glass and sagging side panels stay exposed.
function prepareBaseLorry(){
  const s=ART.m.sprites.c1_army0,[,,w,h]=s.rect,c=winterCanvas(w,h),g=c.getContext('2d');
  g.drawImage(ART.images[s.atlas],...s.rect,0,0,w,h);
  g.globalCompositeOperation='source-atop';
  const frost=g.createPattern(district.snow,'repeat'),rand=mulberry32(516);
  for(let i=0;i<85;i++){
    const cab=i%5===0,x=(cab?.8+rand()*.15:.03+rand()*.55)*w,y=(.12+rand()*.7)*h;
    g.globalAlpha=.17+rand()*.25;
    shoreEllipse(g,x,y,3+rand()*16,2+rand()*5,frost,-.12);
  }
  g.globalAlpha=1;g.globalCompositeOperation='source-over';district.images.baseLorry=c;
}

function baseBreach(r,w,h){
  const cx=w*(r.kind==='stores'?.62:.73),cy=h*(r.kind==='barracks'?.64:.42);
  const hole=new Path2D(),rand=mulberry32(r.x+53);
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,k=.72+.28*rand();
    hole.lineTo(cx+Math.cos(a)*w*.21*k,cy+Math.sin(a)*h*.28*k);
  }
  hole.closePath();return hole;
}
function driftingBaseSnow(g,r){
  const w=r.w*T,h=r.h*T;
  r.breach ||= baseBreach(r,w,h);
  g.save();g.translate(r.x*T,r.y*T);g.clip(r.breach);
  for(let i=0;i<64;i++){
    const x=(i*137+WX.time*25)%w,y=(i*97+WX.time*38)%h;
    beam(g,x,y,x+1.3,y+2,.95,'#e6eff1a3');
  }
  g.restore();
}
function baseBenchTools(g,o){
  const x=o.x+o.w/2,y=o.y+o.h/2;
  for(const [u,v] of [[-9,-6],[1,1]]){
    beam(g,x+u,y+v,x+u+7,y+v+3,1.9,'#969689');
    beam(g,x+u+6,y+v+3,x+u+9,y+v+2,1.3,'#b1aca0');
    beam(g,x+u+6,y+v+3,x+u+7,y+v+5,1.3,'#8c877b');
  }
}
