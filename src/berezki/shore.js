// Both the worn track in the snow and the resident's route use these landings.
const fishingTrack=[[46.9,14.4],[48,16.6],[48,18.8],[52.9,18.8],[53.2,12],[51.8,9.2],[48.4,8]];
const iceHole=tilePoint(48.4,7.4);
const fishingRoom={x:44,y:11,w:8,h:7,n:1};
let fishingHouse,woodStack;
function makeFishingShore(){
  for(let y=1;y<=20;y++)for(let x=37;x<56;x++){
    if(tAt(x,y)===TR && (y<11 || x>=43))setT(x,y,GR);
  }
  setT(42,15,TR);setT(54,13,TR);setT(55,17,TR);
  const r=fishingRoom;
  house(r.x,r.y,r.w,r.h,[[3,6],[4,6]],BR,0,'plank');
  fishingHouse=HOUSES[HOUSES.length-1];buildEntrances(fishingHouse);
  district.levels.push(r);
  partition(46.75,15.7,.17,1.3,'timber');
  partition(49.15,15.7,.17,1.3,'timber');
  putFurniture('stove',46*T,13.4*T,0,'shore');
  district.heaters.push(tilePoint(46,13.4));
  putFurniture('bedroll',50.1*T,13.9*T,0,'shore');
  putFurniture('cupboard',49.4*T,12.5*T,Math.PI/2,'shore').loot={bandage:1};
  putFurniture('supper',45.9*T,16.25*T,0,'shore');
  woodStack=interiorObject('woodStack',45.5*T,18.43*T,60,19);
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
    e.crouch=onIce?1:0;e.ang=onIce?-Math.PI/2:Math.atan2(13.4-y,46-x);
    if(!round.until)round.until=S.min+(onIce?9:4);
    if(S.min<round.until || (!onIce && !day))return;
    round.outward=!onIce;round.until=0;
  }
  round.index+=round.outward?1:-1;
}
function restoreShoreFooting(){
  const inYard=P.x>=42*T && P.x<56*T && P.y>=10*T && P.y<20*T;
  if(!inYard || clearFooting(P.x,P.y,P.r))return;
  // An older save can put the player inside a newly built wall or fitting.
  let best=null,gap=Infinity;
  for(let y=9;y<=20;y++)for(let x=41;x<=56;x++){
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
  const basin=new Path2D();
  for(let i=0;i<=120;i++){
    const a=i*Math.PI/60,edge=1+.044*Math.sin(a*5)+.026*Math.sin(a*9+.7);
    const x=(45.9+8.65*Math.cos(a)*edge)*T,y=(5.9+4.2*Math.sin(a)*edge)*T;
    if(i)basin.lineTo(x,y);else basin.moveTo(x,y);
  }
  basin.closePath();
  const im=district.images.materials,half=im.width/2,tile=winterCanvas(432,432),t=tile.getContext('2d');
  for(const u of [0,1])for(const v of [0,1]){
    t.save();t.translate(u*432,v*432);t.scale(u?-1:1,v?-1:1);
    t.drawImage(im,half+2,half+2,half-4,half-4,0,0,216,216);t.restore();
  }
  const left=36*T,top=T,ice=winterCanvas(20*T,10*T),ig=ice.getContext('2d');
  ig.translate(-left,-top);ig.fillStyle=ig.createPattern(tile,'repeat');ig.fillRect(left,top,ice.width,ice.height);
  // Feather the bank into the existing snow. Both surfaces are fixed in world space.
  const mask=winterCanvas(ice.width,ice.height),mg=mask.getContext('2d');
  mg.translate(-left,-top);mg.filter='blur(10px)';mg.fill(basin);
  ig.globalCompositeOperation='destination-in';ig.drawImage(mask,left,top);
  g.drawImage(ice,left,top);
  // Stay on the bank until the last few metres. The two soles alternate on bends.
  const approach=[[33,33],[39.8,30.8],[42.1,23],[45.4,20],[48,18.8]];
  for(const trail of [approach,fishingTrack.slice(2)]){
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
  const door=fishingHouse.entrances[0],cx=fishingHouse.x*T+door.x,py=(fishingHouse.y+fishingHouse.h)*T;
  artFill(g,'floor_wood',cx-door.width/2-3,py,door.width+6,16);
  for(const h of [5,10,15])beam(g,cx-door.width/2-3,py+h,cx+door.width/2+3,py+h,1.4,'#746859');
  const o=woodStack;
  g.fillStyle='#42434166';g.fillRect(o.x+4,o.y+5,o.w,o.h);
  artFill(g,'floor_wood',o.x,o.y,o.w,o.h);
  for(let row=0;row<2;row++)for(let i=0;i<9;i++){
    const ax=o.x+4+i*6+(row?2:0),ay=o.y+o.h-2-row*5;
    shoreEllipse(g,ax,ay,3.4,2.9,'#504532');shoreEllipse(g,ax,ay,2.4,2,'#ac9070');
  }
  artFill(g,'floor_wood',o.x-2,o.y-3,o.w+4,12);
  g.fillStyle=g.createPattern(snowMaterial(),'repeat');g.fillRect(o.x-2,o.y-3,o.w+4,9);
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
  for(const o of objs){
    if(winterFloor(o.x,o.y)!==r)continue;
    if(o.k==='roomFitting')drawRoomFitting(g,o);
    if(o.k==='partition')paintPartition(g,o);
  }
  const glow=g.createRadialGradient(46*T,13.4*T,2,46*T,13.4*T,53);
  glow.addColorStop(0,'rgba(238,146,57,.36)');glow.addColorStop(1,'transparent');
  g.fillStyle=glow;g.fillRect(46*T-53,13.4*T-53,106,106);
  beam(g,46*T-5,13.4*T+8,46*T+5,13.4*T+8,2,'#d68f52');
  return c;
}
function fishingRoof(h){
  const w=h.w*T+10,d=h.h*T+10,c=winterCanvas(w,d),g=c.getContext('2d');
  g.drawImage(balancedGable('c1_roof_plank'),0,0,w,d);
  const snow=g.createPattern(snowMaterial(),'repeat');snow.setTransform(new DOMMatrix().scale(.42));
  g.fillStyle=snow;g.globalAlpha=.69;g.fillRect(2,2,w-6,d-7);g.globalAlpha=1;
  g.fillStyle='#50617633';g.fillRect(2,d/2,w-6,d/2-5);
  beam(g,2,d/2,w-4,d/2,3,'#d5d9d6');
  for(let x=12;x<w-6;x+=17)beam(g,x,d/2+2,x-2,d-6,1,'#66727952');
  const cx=2*T,cy=2.4*T;g.fillStyle='#514f4c66';g.fillRect(cx-2,cy+3,17,15);
  artFill(g,'wall_brick',cx-6,cy-7,14,15);g.fillStyle='#312f2a';g.fillRect(cx-3,cy-5,8,8);
  beam(g,cx-7,cy-7,cx+8,cy-7,2,'#c4c6c0');
  return c;
}
