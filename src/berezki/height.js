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
    for(const y of [9,21]){
      g.fillStyle='#534c41';g.fillRect(0,y,width,3);
      g.fillStyle='#a0947c';g.fillRect(0,y,width,.8);
    }
    const count=Math.round(width/5.6);
    for(let i=0;i<count;i++){
      const x=i*width/count+.6,top=2+rand()*3,w=width/count-1.45;
      artFill(g,'floor_wood',x,top,w,height-top-1);
      g.fillStyle=['#645a4866','#76695084','#655e5277'][i%3];g.fillRect(x,top,w,height-top-1);
      beam(g,x+w-.5,top,x+w-.5,height-1,.85,'#443f37');
      beam(g,x,top,x+w-.8,top+.5,1.3,'#d0cfc2');
      for(const y of [10,22]){g.fillStyle='#554e43';g.fillRect(x+w/2,y,.8,1);}
    }
  }else{
    g.save();g.beginPath();g.rect(0,3,width,height-5);g.clip();
    for(let x=-height;x<width+height;x+=7){
      beam(g,x,2,x+height*.48,height,.78,'#636963');
      beam(g,x,2,x-height*.48,height,.72,'#777a70');
    }
    g.restore();
    for(const y of [2,height-3])beam(g,0,y,width,y,1.3,'#56574f');
  }
  g.fillStyle=wood?'#5f5341':'#565a55';g.fillRect(0,0,wood?3.8:2.5,height);
  g.fillStyle='#a8a292';g.fillRect(.4,0,1,height);
  g.fillStyle='#d5d7d0';g.fillRect(0,0,wood?4:3,1.6);
  fencePanels.set(key,c);return c;
}
function buildRaisedScenery(){
  for(const f of [...shoreFences,...trackFences]){
    const vertical=f.h>f.w,wood=f.material==='picket',len=Math.max(f.w,f.h);
    const count=Math.ceil(len/(wood?43:52)),span=len/count;
    for(let i=0;i<count;i++){
      const x=f.x+(vertical?f.w/2:(i+.5)*span),y=f.y+(vertical?(i+.5)*span:f.h/2);
      const panel=fencePanel(wood,Math.ceil(span),i%4);
      raisedScenery.push({panel,wood,vertical,span,x,y,depth:y,underDeck:f.underDeck});
    }
  }
  for(const o of objs)if(o.k==='roomFitting' || o.k==='partition'){
    const x=o.x+o.w/2,y=o.y+o.h/2;
    raisedScenery.push({item:o,x,y,depth:y+o.h*.24,height:fittingHeight[o.fitting]||28});
  }
  raisedScenery.sort((a,b)=>a.depth-b.depth);
}
function raisedOffset(x,y,h,mapView){
  const k=perspective&&!mapView?h*.00125:0;
  return [clamp((x-cam.x)*k,-h*.45,h*.45)-h*.13,
    clamp((y-cam.y)*k,-h*.30,h*.30)-h*.50];
}
function paintRaisedScenery(g,p,mapView){
  if(p.panel){
    const h=p.wood?28:43,d=p.span/2;
    const [dx,dy]=raisedOffset(p.x,p.y,h,mapView);
    // Slight side view keeps a lengthwise fence readable even on the camera axis.
    const sx=p.vertical && Math.abs(dx)<2?(dx>0?2:-2):dx;
    const vx=p.vertical?0:1,vy=p.vertical?1:0;
    g.save();g.translate(p.x-vx*d,p.y-vy*d);
    g.transform(vx,vy,-sx/h,-dy/h,sx,dy);
    g.drawImage(p.panel,0,0,p.span+.15,h);g.restore();
    const x=p.x-vx*d,y=p.y-vy*d;
    beam(g,x,y,x+sx,y+dy,p.wood?3.8:2.5,'#605c50');
    beam(g,x+sx-1.4,y+dy,x+sx+1.5,y+dy,1.8,'#dadad0');
    return;
  }
  const o=p.item,[dx,dy]=raisedOffset(p.x,p.y,p.height,mapView);
  // Cast shadows and feet stay on the footprint. Broad faces carry wood grain
  // from the same interior material as the original raster top.
  const x=o.x+1,y=o.y+1,w=o.w-2,h=o.h-2;
  g.save();
  if(SHADOWS){g.fillStyle='#33322d39';g.fillRect(x+3,y+4,w,h);}
  const side=(a,b,c,d,color)=>{
    g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.lineTo(c+dx,d+dy);g.lineTo(a+dx,b+dy);g.closePath();g.save();g.clip();
    artFill(g,o.fitting==='stove'?'wall_concrete':'floor_wood',x-Math.abs(dx)-2,y-Math.abs(dy)-2,w+Math.abs(dx)*2+4,h+Math.abs(dy)*2+4);
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
  if(o.k==='partition')paintPartition(g,o);else {drawRoomFitting(g,o);if(o.cabinHome)cabinFittingDetail(g,o);}
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
