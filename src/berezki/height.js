// Raised scenery lives on the actor depth list. Ground plans and collision keep
// the original footprints while the camera sees the sides of rails and posts.
const raisedScenery=[];
const fittingHeight={bench:9,rack:40,cabinet:32,desk:12,stove:22,bedroll:3,supper:13,
  pallet:4,cupboard:42,files:10,stool:8,sack:9};
const fencePanels=new Map();
function fencePanel(wood,width,variant){
  const key=[wood,width,variant].join('/');
  if(fencePanels.has(key))return fencePanels.get(key);
  const height=wood?30:44,c=winterCanvas(width*3,height*3),g=c.getContext('2d');
  g.scale(3,3);
  const rand=mulberry32(171+variant);
  if(wood){
    for(const y of [10,22]){
      g.save();g.translate(0,y);g.rotate((rand()-.5)*.026);
      g.drawImage(lookoutBoard(9+variant,false),0,-1.5,width,3.4);g.restore();
    }
    const count=Math.round(width/5.8);
    for(let i=0;i<count;i++){
      const x=i*width/count+rand()*.9,w=width/count*(.56+.32*rand());
      const top=1+rand()*5.2,bottom=height-rand()*2,lean=(rand()-.5)*.09;
      g.save();g.translate(x,top);g.rotate(lean);
      g.beginPath();g.moveTo(0,1.5);g.lineTo(w*.32,0);g.lineTo(w*.84,rand()*1.4);
      g.lineTo(w,2);g.lineTo(w,bottom-top);g.lineTo(.4,bottom-top-.7);g.closePath();g.clip();
      g.rotate(Math.PI/2);
      const grain=lookoutBoard(variant*7+i,i%4===1);
      g.drawImage(grain,16+i,1,149,23,0,-w,bottom-top,w);
      g.restore();
    }
    g.save();g.translate(1,0);g.rotate(Math.PI/2);
    g.drawImage(lookoutBoard(17+variant,false),0,-2.8,height,4.4);g.restore();
  }else{
    const bay=district.images.wireBay;
    g.save();
    if(variant%2){g.translate(width,0);g.scale(-1,1);}
    g.drawImage(bay,0,0,bay.width*.97,bay.height,0,0,width,height);
    g.restore();
  }
  fencePanels.set(key,c);return c;
}
function buildRaisedScenery(){
  for(const f of [...shoreFences,...hamletFences,...trackFences,...baseFences]){
    const vertical=f.h>f.w,wood=f.material==='picket',len=Math.max(f.w,f.h);
    const count=Math.ceil(len/(wood?43:52)),span=len/count;
    for(let i=0;i<count;i++){
      const x=f.x+(vertical?f.w/2:(i+.5)*span),y=f.y+(vertical?(i+.5)*span:f.h/2);
      const panel=fencePanel(wood,Math.ceil(span),i%4);
      raisedScenery.push({panel,wood,vertical,span,x,y,depth:y,underDeck:f.underDeck});
    }
  }
  for(const o of objs)if(o.k==='crate' || o.k==='openLeaf' || o.k==='roomFitting' || o.k==='partition' || o.k==='pumpMachinery' || o.k==='waypost' || o.k==='waterMain'){
    const x=o.x+o.w/2,y=o.y+o.h/2;
    // A seated-height surface can only hide boots along its rear edge.
    // Keep the standing actor's head and shoulders in front at contact.
    const low=['bench','supper','desk','stool','pallet','bedroll','files'].includes(o.fitting);
    const height=o.k==='waterMain'?18:o.k==='crate'?14:o.k==='partition'?43:fittingHeight[o.fitting]||28;
    raisedScenery.push({item:o,x,y,depth:low?o.y-16:y+o.h*.24,radius:Math.max(o.w,o.h)/2+height,height});
  }
  raisedScenery.sort((a,b)=>a.depth-b.depth);
}
// World pixels of height. Photographed props already contain the neutral
// view of their sides; only constructed geometry needs the static elevation.
const winterLens=.00032,winterTilt=.52,residenceTilt=winterTilt/winterLens;
function winterParallax(x,y,height,mapView=false){
  if(mapView || !perspective || height===0)return [0,0];
  const k=height*winterLens;
  return [(x-cam.x)*k,(y-cam.y)*k];
}
function raisedOffset(x,y,height,mapView=false){
  const [dx,dy]=winterParallax(x,y,height,mapView);
  return [dx,dy-height*winterTilt];
}
function paintRaisedScenery(g,p,mapView){
  if(p.item?.k==='openLeaf'){paintOpenLeaf(g,p.item,mapView);return;}
  if(p.item?.k==='crate'){
    if(!p.item.broken)paintWinterCrate(g,p,mapView);
    return;
  }
  if(p.item?.k==='partition'){
    paintCutWall(g,p,mapView);return;
  }
  if(p.panel){
    const h=p.wood?28:43,d=p.span/2;
    const [dx,dy]=raisedOffset(p.x,p.y,h,mapView);
    const sx=dx;
    const vx=p.vertical?0:1,vy=p.vertical?1:0;
    g.save();g.translate(p.x-vx*d,p.y-vy*d);
    g.transform(vx,vy,-sx/h,-dy/h,sx,dy);
    g.drawImage(p.panel,0,0,p.span+.15,h);g.restore();
    // Each bay has a physical post from cap to soil, even edge-on.
    const footX=p.x-vx*d,footY=p.y-vy*d;
    beam(g,footX,footY,footX+sx,footY+dy,p.wood?3.4:2.4,p.wood?'#635747':'#635e54');
    beam(g,footX-.7,footY-1,footX+sx-.7,footY+dy,1,p.wood?'#978774':'#99978a');
    shoreEllipse(g,footX,footY+.4,3.5,1.5,'#8e97998f',.13);
    g.save();g.globalAlpha=.72;
    snowDrift(g,footX-.8,footY+.9,4,1.7,-.08,9);
    if(p.wood)snowDrift(g,footX+vx*d*.92,footY+vy*d*.92+.7,6,1.65,p.vertical?1.28:-.16,15);
    g.restore();
    const x=p.x-vx*d,y=p.y-vy*d;
    // The actual top-down timber and wire cutouts retain the fence thickness
    // when the raised face is edge-on to the camera.
    g.save();g.translate(x+sx,y+dy+1);if(p.vertical)g.rotate(Math.PI/2);
    const id=p.wood?'c1_fence_picket':'c1_fence_mesh';
    const art=ART.m.sprites[id],[ax,ay,aw,ah]=art.rect;
    g.drawImage(ART.images[art.atlas],ax,ay,aw,ah,0,-1.6,p.span+.15,p.wood?4.1:3.2);
    g.restore();
    return;
  }
  if(p.item.k==='waypost'){stationSign(g,p.x,p.y,p.item.boardLabel,false,p.item.west,mapView);return;}
  const o=p.item,[dx,dy]=raisedOffset(p.x,p.y,p.height,mapView);
  if(o.k==='waterMain'){
    const vertical=o.h>o.w;
    const a=vertical?[p.x,o.y]:[o.x,p.y],b=vertical?[p.x,o.y+o.h]:[o.x+o.w,p.y];
    for(const point of [a,b]){
      const [u,v]=raisedOffset(...point,p.height,mapView);point[0]+=u;point[1]+=v;
    }
    if(o.piers)for(const x of o.piers)pipePier(g,x,p.y,mapView);
    supplyPipe(g,...a,...b,false);
    if(o.piers)for(const x of o.piers){
      const [ox,oy]=raisedOffset(x,p.y,p.height,mapView);
      beam(g,x+ox,p.y+oy-3.5,x+ox,p.y+oy+4.1,2.6,'#4b4238');
      beam(g,x+ox-.6,p.y+oy-3,x+ox-.6,p.y+oy+2.8,.7,'#aa9a81');
    }
    return;
  }
  // Cast shadows and feet stay on the footprint. Broad faces carry wood grain
  // from the same interior material as the original raster top.
  const x=o.x+1,y=o.y+1,w=o.w-2,h=o.h-2;
  g.save();
  if(SHADOWS){
    g.fillStyle='#33322d39';
    g.fillRect(x+2,y+2,w,h);
  }
  const side=(a,b,c,d,color)=>{
    g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.lineTo(c+dx,d+dy);g.lineTo(a+dx,b+dy);g.closePath();g.save();g.clip();
    artFill(g,o.fitting==='stove'?'wall_concrete':'floor_wood',x-Math.abs(dx)-2,y-Math.abs(dy)-2,w+Math.abs(dx)*2+4,h+Math.abs(dy)*2+4);
    g.fillStyle=color;g.globalAlpha=.54;g.fill();g.restore();
  };
  if(['bench','supper','desk','stool'].includes(o.fitting)){
    for(const u of [.13,.87])for(const v of [.2,.8])
      beam(g,x+w*u,y+h*v,x+w*u+dx,y+h*v+dy,2.5,'#5e5140');
  }else if(o.fitting!=='sack' && o.fitting!=='rack'){
    const edge=dx<0?x+w:x;
    side(edge,y,edge,y+h,'#655d50');side(x,y+h,x+w,y+h,o.fitting==='stove'?'#534d46':'#736752');
  }
  if(o.fitting==='rack'){
    const vertical=h>w;
    // Open timber shelves share the same feet and lens as the surrounding walls.
    for(const [u,v] of [[1,1],[w-2,1],[1,h-2],[w-2,h-2]]){
      beam(g,x+u,y+v,x+u+dx,y+v+dy,2.7,'#514b3e');
    }
    for(const t of [.12,.53,.96]){
      const sx=x+dx*t,sy=y+dy*t;
      const wood=lookoutBoard(11,false);
      g.save();g.translate(sx+(vertical?w:0),sy);
      if(vertical)g.rotate(Math.PI/2);
      const length=vertical?h:w,depth=vertical?w:h;
      g.drawImage(wood,0,0,length,depth);
      beam(g,0,depth-1,length,depth-1,2,'#584c3c');
      beam(g,0,depth-2,length,depth-2,.8,'#9e9078');
      // Two trays of contents from the original photographed shelving unit.
      if(t<.96)g.drawImage(ART.images.roomFittings,130,21,85,43,2,2,length-4,depth-5);
      else{
        const [ax,ay,aw,ah]=roomFittings.files[0];
        g.drawImage(ART.images.roomFittings,ax,ay,aw,ah,length*.44,2,length*.42,depth*.47);
      }
      g.restore();
    }
    for(const u of [1,w-2])beam(g,x+u,y+h-2,x+u+dx,y+h-2+dy,2.1,'#726552');
    g.restore();return;
  }
  if(['cupboard','cabinet'].includes(o.fitting)){
    // The storage atlas contains the upright front. Project it onto the visible
    // face and give the top its own timber or steel surface.
    const vertical=h>w;
    const ax=vertical?(dx>0?x:x+w):x,ay=vertical?y:y+h;
    const span=vertical?h:w;
    g.save();g.transform(vertical?0:1,vertical?1:0,-dx/p.height,-dy/p.height,ax+dx,ay+dy);
    g.drawImage(ART.images.roomFittings,...roomFittings[o.fitting][0],0,0,span,p.height);
    g.restore();
    artFill(g,o.fitting==='cabinet'?'wall_concrete':'floor_wood',x+dx,y+dy,w,h);
    g.fillStyle=o.fitting==='cabinet'?'#55594d7d':'#67574160';g.fillRect(x+dx,y+dy,w,h);
    beam(g,x+dx,y+h+dy,x+w+dx,y+h+dy,1.3,'#a29a8491');g.restore();return;
  }
  g.translate(dx,dy);
  if(o.fitting==='supper' || o.fitting==='desk'){
    const variant=Math.floor(o.x/29+o.y/37)%3;
    if(variant!==0){
      g.save();g.beginPath();g.roundRect(x,y,w,h,variant===1?5:1);g.clip();
      artFill(g,'floor_wood',x,y,w,h);
      g.fillStyle=variant===1?'#7e81766e':'#735b4942';g.fillRect(x,y,w,h);
      for(let v=7;v<h;v+=8)beam(g,x,y+v,x+w,y+v,.8,'#605c50');
      shoreEllipse(g,x+w*.68,y+h*.43,3.3,3,'#b5ac95',0);g.restore();
      if(o.workbench)baseBenchTools(g,o);g.restore();return;
    }
  }
  if(o.k==='pumpMachinery')g.drawImage(district.images.pumpMotor,o.x-2,o.y-3,o.w+4,o.h+6);
  else {drawRoomFitting(g,o);if(o.cabinHome)cabinFittingDetail(g,o);if(o.workbench)baseBenchTools(g,o);}
  g.restore();
}
function paintFenceFooting(g,f,left,right){
  const vertical=f.h>f.w,span=Math.max(f.w,f.h),count=Math.ceil(span/(f.material==='picket'?43:52));
  const step=span/count,first=vertical?0:Math.max(0,Math.floor((left-f.x-20)/step));
  for(let i=first;i<count;i++){
    const x=f.x+(vertical?f.w/2:i*step),y=f.y+(vertical?i*step:f.h/2);
    if(x>right+20)break;
    const endX=x+(vertical?0:step),endY=y+(vertical?step:0);
    if(SHADOWS)beam(g,x,y+.8,endX,endY+.8,3.3,'#54616d40');
    shoreEllipse(g,x,y,4.2,2.0,'#74797470',.15);
  }
}

// Wall runs use the collision tiles, including every doorway and breach.
// Cropping the lid from the room plan also keeps each sill on its own wall.
function cutawayWalls(r,plan){
  const walls=[];
  for(const side of [0,1,2,3]){
    const vertical=side%2===1,begin=vertical?1:0,end=vertical?r.h-1:r.w;
    let start=begin;
    for(let i=begin;i<=end;i++){
      const tx=vertical?(side===1?r.w-1:0):i,ty=vertical?i:(side===2?r.h-1:0);
      const tile=i<end?tAt(r.x+tx,r.y+ty):null;
      if(tile===CO || tile===BR)continue;
      if(i>start){
        const x=(r.x+(vertical?tx:start))*T,y=(r.y+(vertical?start:ty))*T;
        const w=(vertical?1:i-start)*T,h=(vertical?i-start:1)*T;
        const timber=r.hamlet || r===fishingRoom || villageCabins.includes(r);
        const wall={x,y,w,h,material:timber?'timber':'concrete',room:r,plan};
        walls.push({wall,x:x+w/2,y:y+h/2,depth:y+h*.55,radius:Math.max(w,h)/2+60,height:38});
      }
      start=i+1;
    }
  }
  return walls;
}
function paintCutWall(g,p,mapView){
  const o=p.wall||p.item;
  const {x,y,w,h}=o;
  // Shared vertices must meet at the same height, including the ends of the jambs.
  const height=30;
  if(SHADOWS){
    g.save();g.shadowColor='#29261e6a';g.shadowBlur=3;g.shadowOffsetX=1.2;g.shadowOffsetY=1.7;
    g.fillStyle='#4a44375a';g.fillRect(x+.5,y+.5,w-1,h-1);g.restore();
  }
  const corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const elevated=corners.map(([u,v])=>{
    const [dx,dy]=raisedOffset(u,v,height,mapView);return [u+dx,v+dy];
  });
  const material=o.material==='timber'?'floor_wood':o.material==='brick'?'wall_brick':'wall_concrete';
  for(let i=0;i<4;i++){
    const j=(i+1)%4,[ax,ay]=corners[i],[bx,by]=corners[j],[tx,ty]=elevated[i];
    const ex=bx-ax,ey=by-ay,length=Math.hypot(ex,ey);
    if(ex*(ty-ay)-ey*(tx-ax)<=0)continue;
    // Project the vertical face from its actual toe to its coping.
    const [ux,uy]=elevated[j];
    g.save();g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.lineTo(ux,uy);g.lineTo(tx,ty);g.closePath();g.clip();
    g.transform(ex/length,ey/length,(ax-tx)/height,(ay-ty)/height,tx,ty);
    artFill(g,material,-2,-1,length+5,height+3);
    const shade=g.createLinearGradient(0,0,0,height);
    shade.addColorStop(0,'#443c3030');shade.addColorStop(.78,'#302e2a49');shade.addColorStop(1,'#211e1be0');
    g.fillStyle=shade;g.fillRect(-2,0,length+5,height);
    if(o.material==='timber')for(let v=7;v<height;v+=8)beam(g,0,v,length,v,1.15,'#362e26a8');
    g.restore();
  }
  const [[lx,ly],[rx],[,by]]=elevated;
  if(o.plan)g.drawImage(o.plan,x-o.room.x*T,y-o.room.y*T,w,h,lx,ly,rx-lx,by-ly);
  else{
    // Exposed aggregate or end grain at the section cut reads differently
    // from the paving beside it, even looking straight down a long wall.
    artFill(g,material,lx,ly,rx-lx,by-ly);
    g.fillStyle=o.material==='timber'?'#8b765667':'#b1a99476';
    g.fillRect(lx,ly,rx-lx,by-ly);
    const vertical=h>w,run=vertical?h:w;
    for(let n=17;n<run;n+=32){
      const u=vertical?lx:lx+n,v=vertical?ly+n:ly;
      beam(g,u,v,u+(vertical?rx-lx-1:.9),v+(vertical?.65:by-ly-1),.8,'#72695b91');
    }
  }
  g.lineWidth=1.3;g.strokeStyle='#514c43';g.strokeRect(lx+.55,ly+.55,rx-lx-1.1,by-ly-1.1);
  beam(g,lx+1,ly+1,rx-1,ly+1,1.25,'#b1a99a');
}
function paintWinterCrate(g,p,mapView){
  const o=p.item,w=o.w-1,h=o.h-1,x=p.x-w/2,y=p.y-h/2;
  const [dx,dy]=raisedOffset(p.x,p.y,p.height,mapView);
  const lid=o.sprite|| (o.stash?'c1_crate_army':'c1_crate');
  g.save();
  if(SHADOWS)shoreEllipse(g,p.x,p.y+h*.34,w*.57,h*.29,'#322e286e',0);
  function face(ax,ay,bx,by,tint){
    const length=Math.hypot(bx-ax,by-ay);
    g.save();g.transform((bx-ax)/length,(by-ay)/length,-dx/p.height,-dy/p.height,ax+dx,ay+dy);
    g.fillStyle='#4e4938';g.fillRect(0,0,length,p.height);
    g.drawImage(lookoutBoard(8,false),0,0,length,p.height);
    g.fillStyle=tint;g.fillRect(0,0,length,p.height);
    g.fillStyle='#37382d';g.fillRect(0,p.height-1.7,length,1.7);
    for(const f of [.12,.86]){g.fillStyle='#3c392dc7';g.fillRect(f*length,0,1.45,p.height);}
    g.restore();
  }
  const side=dx>0?x:x+w;
  face(side,y,side,y+h,'#363c2bb5');face(x,y+h,x+w,y+h,'#55583b99');
  ART.draw(g,lid,p.x+dx,p.y+dy,w,h,0);
  g.restore();
}
