// The overview and the walking camera sample the same world-space material masks.
const maskScale=10, sectorSize=8, detailScale=64;
const sceneryCache=new Map(), surfaceBrushes=[], terrainMasks=[];
const landscapeAtlas=new Image(), furnishingAtlas=new Image();
landscapeAtlas.src='__LANDSCAPE_ART__';furnishingAtlas.src='__FURNISHING_ART__';
const roofAtlas=new Image();roofAtlas.src="__ROOF_ART__";
function sheetObject(ctx,id,x,y,w,h){
  if(!furnishingAtlas.naturalWidth)return;
  const cell=furnishingAtlas.width/3;
  ctx.drawImage(furnishingAtlas,(id%3)*cell,Math.floor(id/3)*cell,cell,cell,x,y,w,h);
}
function lattice(i,j){
  let h=Math.imul(i,374761393)+Math.imul(j,668265263);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
}
function softNoise(x,y){
  const i=Math.floor(x),j=Math.floor(y);
  let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
  const a=lattice(i,j),b=lattice(i+1,j),c=lattice(i,j+1),d=lattice(i+1,j+1);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function createSurfaceBrush(source,sx,sy,size){
  const c=document.createElement('canvas');c.width=c.height=192;
  const ctx=c.getContext('2d');ctx.drawImage(source,sx+2,sy+2,size-4,size-4,0,0,192,192);
  ctx.globalCompositeOperation='destination-in';
  const fade=ctx.createRadialGradient(96,96,36,96,96,96);
  fade.addColorStop(0,'#000');fade.addColorStop(.65,'rgba(0,0,0,.86)');fade.addColorStop(1,'transparent');
  ctx.fillStyle=fade;ctx.fillRect(0,0,192,192);return c;
}
function maskCanvas(paint){
  const c=document.createElement('canvas');c.width=W*maskScale;c.height=H*maskScale;
  const ctx=c.getContext('2d');ctx.scale(maskScale,maskScale);ctx.fillStyle=ctx.strokeStyle='#fff';ctx.lineCap=ctx.lineJoin='round';
  paint(ctx);return c;
}
function footprint(ctx,b,pad){
  ctx.save();ctx.translate(b[1],b[2]);ctx.rotate(b[5]);ctx.fillRect(-b[3]/2-pad,-b[4]/2-pad,b[3]+2*pad,b[4]+2*pad);ctx.restore();
}
function paintedRoad(ctx){
  for(const rd of winterMap.roads){
    for(const [w,alpha] of [[1.17,.16],[1,.45],[.78,.80]]){
      ctx.globalAlpha=alpha;stroke(ctx,rd.points,'#fff',rd.width*w);
    }
  }
  ctx.globalAlpha=.64;
  for(const b of winterMap.buildings){
    if(!accessibleBuilding(b))continue;
    footprint(ctx,b,.29);
    const [x,y]=door(b,true);
    // Walk-worn entries fade into the snow a short distance from the threshold.
    for(let k=0;k<6;k++){ctx.globalAlpha=(6-k)*.10;ellipse(ctx,x,y+k*.20,.32+k*.04,.35,'#fff');}
  }
}
function prepareLandscape(){
  const size=landscapeAtlas.width/2;
  for(let i=0;i<4;i++)surfaceBrushes[i]=createSurfaceBrush(landscapeAtlas,(i%2)*size,Math.floor(i/2)*size,size);
  surfaceBrushes[4]=createSurfaceBrush(surfaceTiles[0],0,0,256);
  surfaceBrushes[5]=createSurfaceBrush(surfaceTiles[3],0,0,256);
  const masks=[
    maskCanvas(paintedRoad),
    maskCanvas(ctx=>{for(const [a,b] of winterMap.tracks)for(const [width,alpha] of [[1.47,.35],[1.20,.86]]){ctx.globalAlpha=alpha;stroke(ctx,[a,b],'#fff',width);}}),
    maskCanvas(ctx=>{pathLine(ctx,winterMap.marsh,true);ctx.fill();}),
    maskCanvas(ctx=>{for(const t of forest){ctx.globalAlpha=.40;ellipse(ctx,t.x+.12,t.y+.18,t.size*1.45,t.size*1.12,'#fff');}}),
    maskCanvas(ctx=>{pathLine(ctx,winterMap.lake,true);ctx.fill();})
  ];
  // Distort mask sampling rather than shifting the textures. Both zoom levels share this edge.
  for(const [id,c] of masks.entries()){
    const ctx=c.getContext('2d'),raw=ctx.getImageData(0,0,c.width,c.height),out=ctx.createImageData(c.width,c.height);
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const wx=x/maskScale,wy=y/maskScale;
      const edge=(id===0?.25:id===1?.12:.37)*maskScale;
      const xx=clamp(Math.round(x+(softNoise(wx*1.8,wy*1.8)-.5)*edge*2),0,c.width-1);
      const yy=clamp(Math.round(y+(softNoise(wx*2+81,wy*2)-.5)*edge*2),0,c.height-1);
      const k=(y*c.width+x)*4,alpha=raw.data[(yy*c.width+xx)*4+3];out.data[k+3]=alpha;
      if(alpha){
        const sector=Math.floor(wx/sectorSize)+','+Math.floor(wy/sectorSize);
        if(!sectorCoverage.has(sector))sectorCoverage.set(sector,[]);
        sectorCoverage.get(sector)[id]=true;
      }
    }
    ctx.putImageData(out,0,0);terrainMasks[id]=c;
  }
}
function materialPatches(ctx,brush,x,y,w,h,spacing,seed){
  const firstX=Math.floor(x/spacing)-2,lastX=Math.ceil((x+w)/spacing)+1;
  const firstY=Math.floor(y/spacing)-2,lastY=Math.ceil((y+h)/spacing)+1;
  for(let j=firstY;j<=lastY;j++)for(let i=firstX;i<=lastX;i++){
    const rand=randomStream(Math.imul(i,1640531527)^Math.imul(j,97531)^seed);
    const px=(i+.15+rand()*.7)*spacing,py=(j+.15+rand()*.7)*spacing;
    const size=spacing*(2.5+rand()*.45);
    ctx.save();ctx.translate(px,py);ctx.rotate(rand()*6.28);
    ctx.drawImage(brush,-size/2,-size/2,size,size);ctx.restore();
  }
}
function paintSector(x,y,w,h,scale,maskPixels){
  const c=document.createElement('canvas');c.width=Math.ceil(w*scale);c.height=Math.ceil(h*scale);
  const cx=c.getContext('2d');cx.setTransform(scale,0,0,scale,-x*scale,-y*scale);
  cx.fillStyle='#c4ccce';cx.fillRect(x,y,w,h);
  materialPatches(cx,surfaceBrushes[4],x,y,w,h,1.9,771);
  snowRelief(cx,x,y,w,h);
  const layer=document.createElement('canvas');layer.width=c.width;layer.height=c.height;
  const ctx=layer.getContext('2d');
  for(const [mask,id,color,spacing] of [[3,3,'#969e98',1.6],[4,5,'#80939e',2.6],[2,2,'#918e78',1.4],[0,0,'#9a9790',1.6],[1,1,'#7d7b77',1]]){
    if(maskPixels&&!maskPixels[mask])continue;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,layer.width,layer.height);
    ctx.setTransform(scale,0,0,scale,-x*scale,-y*scale);ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
    materialPatches(ctx,surfaceBrushes[id],x,y,w,h,spacing,id+325);
    ctx.globalCompositeOperation='destination-in';
    ctx.drawImage(terrainMasks[mask],0,0,W,H);ctx.globalCompositeOperation='source-over';
    cx.globalAlpha=mask===0?.79:mask===2?.76:1;cx.drawImage(layer,x,y,w,h);cx.globalAlpha=1;
  }
  roadWear(cx,scale,x,y,w,h);return c;
}
const sectorCoverage=new Map();
function coveredMaterials(i,j){
  return sectorCoverage.get(i+','+j)||[];
}
function overviewGround(){
  const c=document.createElement('canvas');c.width=W*12;c.height=H*12;const ctx=c.getContext('2d');
  for(let j=0;j<H/sectorSize;j++)for(let i=0;i<W/sectorSize;i++){
    const x=i*sectorSize,y=j*sectorSize,w=Math.min(sectorSize,W-x),h=Math.min(sectorSize,H-y);
    ctx.drawImage(paintSector(x,y,w,h,12,coveredMaterials(i,j)),x*12,y*12);
  }
  return c;
}
function detailGround(v){
  const left=v.x-viewW/(2*v.z),top=v.y-viewH/(2*v.z);
  for(let j=Math.max(0,Math.floor(top/sectorSize));j<Math.min(H,top+viewH/v.z)/sectorSize;j++)
    for(let i=Math.max(0,Math.floor(left/sectorSize));i<Math.min(W,left+viewW/v.z)/sectorSize;i++){
      const x=i*sectorSize,y=j*sectorSize,w=Math.min(sectorSize,W-x),h=Math.min(sectorSize,H-y),key=i+','+j;
      let tile=sceneryCache.get(key);
      if(tile)sceneryCache.delete(key);
      else tile=paintSector(x,y,w,h,detailScale,coveredMaterials(i,j));
      sceneryCache.set(key,tile);
      if(sceneryCache.size>24)sceneryCache.delete(sceneryCache.keys().next().value);
      const [px,py]=screen(x,y,v);g.drawImage(tile,px,py,w*v.z+.35,h*v.z+.35);
    }
}
