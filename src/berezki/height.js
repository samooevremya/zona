// Raised scenery lives on the actor depth list. Ground plans and collision keep
// the original footprints while the camera sees the sides of rails and posts.
const raisedScenery=[];
const fittingHeight={bench:9,rack:29,cabinet:26,desk:15,stove:22,bedroll:3,supper:15,
  pallet:4,cupboard:32,files:10,stool:8,sack:9};
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
  for(const o of objs)if(o.k==='openLeaf' || o.k==='roomFitting' || o.k==='partition' || o.k==='pumpMachinery' || o.k==='waypost' || o.k==='waterMain'){
    const x=o.x+o.w/2,y=o.y+o.h/2;
    raisedScenery.push({item:o,x,y,depth:y+o.h*.24,radius:Math.max(o.w,o.h)/2+24,height:o.k==='waterMain'?18:fittingHeight[o.fitting]||28});
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
  if(p.panel){
    const h=p.wood?28:43,d=p.span/2;
    const [dx,dy]=raisedOffset(p.x,p.y,h,mapView);
    const sx=dx;
    const vx=p.vertical?0:1,vy=p.vertical?1:0;
    g.save();g.translate(p.x-vx*d,p.y-vy*d);
    g.transform(vx,vy,-sx/h,-dy/h,sx,dy);
    g.drawImage(p.panel,0,0,p.span+.15,h);g.restore();
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
    if(o.k==='partition')g.fillRect(o.x,o.y+1,o.w+1,o.h+1);
    else g.fillRect(x+3,y+4,w,h);
  }
  const side=(a,b,c,d,color)=>{
    g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.lineTo(c+dx,d+dy);g.lineTo(a+dx,b+dy);g.closePath();g.save();g.clip();
    artFill(g,o.k==='partition'||o.fitting==='stove'?'wall_concrete':'floor_wood',x-Math.abs(dx)-2,y-Math.abs(dy)-2,w+Math.abs(dx)*2+4,h+Math.abs(dy)*2+4);
    g.fillStyle=color;g.globalAlpha=.54;g.fill();g.restore();
  };
  if(['bench','supper','desk','stool'].includes(o.fitting)){
    for(const u of [.13,.87])for(const v of [.2,.8])
      beam(g,x+w*u,y+h*v,x+w*u+dx,y+h*v+dy,2.5,'#5e5140');
  }else if(o.fitting!=='sack'){
    const edge=dx<0?x+w:x;
    side(edge,y,edge,y+h,'#655d50');side(x,y+h,x+w,y+h,o.fitting==='stove'?'#534d46':'#736752');
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
  else if(o.k==='partition'){artFill(g,'wall_concrete',o.x,o.y,o.w,o.h);g.strokeStyle='#77756a';g.lineWidth=.8;g.strokeRect(o.x,o.y,o.w,o.h);}else {drawRoomFitting(g,o);if(o.cabinHome)cabinFittingDetail(g,o);if(o.workbench)baseBenchTools(g,o);}
  g.restore();
}
function paintFenceFooting(g,f,left,right){
  const vertical=f.h>f.w,span=Math.max(f.w,f.h),count=Math.ceil(span/(f.material==='picket'?43:52));
  const step=span/count,first=vertical?0:Math.max(0,Math.floor((left-f.x-20)/step));
  for(let i=first;i<count;i++){
    const x=f.x+(vertical?f.w/2:i*step),y=f.y+(vertical?i*step:f.h/2);
    if(x>right+20)break;
    if(SHADOWS){
      beam(g,x+1,y+1,x+9,y+12,2.5,'#4d535e52');
      beam(g,x+8,y+10,x+8+(vertical?0:step),y+10+(vertical?step:0),1.9,'#54616d30');
    }
    shoreEllipse(g,x,y,4.2,2.3,'#7379777a',.22);
  }
}
