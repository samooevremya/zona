// Dimensions are in the same world pixels as the floor plan. The wall along a
// stair landing gets smaller panes; the apartment windows follow the room bays.
const residenceFloorHeight=84;
function residencePoint(x,y,k){
  const [dx,dy]=raisedOffset(x,y,k/winterLens);
  return [x+dx,y+dy];
}
const winterRoofSkins=new Map();
function winterGable(id){
  if(winterRoofSkins.has(id))return winterRoofSkins.get(id);
  const src=balancedGable(id),w=src.width,h=src.height,skin=winterCanvas(w,h),g=skin.getContext('2d');
  g.drawImage(src,0,0);
  // Restore the roof courses beneath the chimney embedded in the source photograph.
  const start=Math.round(w*(id==='c1_roof_slate'?.68:.12)),span=Math.round(w*.23);
  const source=start+(id==='c1_roof_slate'?-1:1)*Math.round(w*.34);
  for(let i=0;i<span;i++){
    g.globalAlpha=Math.min(1,i/7,(span-i)/7);
    g.drawImage(src,source+i,0,1,h,start+i,0,1,h);
  }
  winterRoofSkins.set(id,skin);return skin;
}
function stoveStack(h,at){
  return at?[[at.x-h.x*T-6,at.y-h.y*T-6,12,12,17]]:[];
}
function residenceWindows(side,storey,abandoned=false){
  // Keep openings clear of the end of a partition, the guard desk and the stair head.
  const positions=side%2?[2.65,5.6,8.65]:[2.5,4.75,7.65,10.35,13.65,15.15,18.8];
  return positions.flatMap((tile,i)=>{
    if(side===0 && tile>17 || side===2 && storey===1 && Math.abs(tile-12)<1.4)return [];
    if(!abandoned && storey===1 && side%2 && i===1)return [];
    const seed=hash2(i+storey*13,side*11+(abandoned?31:0));
    const take=abandoned || storey>3?(seed<.46?3:seed<.78?4:0):[0,1,5,2,4][Math.floor(seed*5)];
    return [{u:tile*T,width:(side%2?23:26)+Math.floor(seed*8),take}];
  });
}
function residenceWall(h,side){
  const len=(side%2?h.h:h.w)*T, fh=residenceFloorHeight;
  const canvas=winterCanvas(len,h.storeys*fh),g=canvas.getContext('2d');
  const rnd=mulberry32(864+side);
  artFill(g,'wall_concrete',0,0,len,canvas.height);
  g.fillStyle=['#414b504d','#53606955','#c2b69838','#99998c44'][side];
  g.fillRect(0,0,len,canvas.height);
  for(let floor=1;floor<=h.storeys;floor++){
    const y=(h.storeys-floor)*fh;
    g.fillStyle='rgba(35,39,37,.52)';g.fillRect(0,y,len,3);
    g.fillStyle='#bdbbb1';g.fillRect(0,y+3,len,1);
    for(let x=0;x<len;x+=3*T){
      g.fillStyle='rgba(38,42,40,.47)';g.fillRect(x,y+4,2,fh-4);
      g.fillStyle='rgba(218,216,204,.5)';g.fillRect(x+2,y+4,1,fh-4);
      const sx=x+rnd()*60,sy=y+11+rnd()*23;
      beam(g,sx,sy,sx+3,sy+8,.9,'#706e64');beam(g,sx+3,sy+8,sx+2,sy+14,.8,'#706e64');
    }
    for(const win of residenceWindows(side,floor,h.flat?.abandoned)){
      const x=win.u-win.width/2,wy=y+14,w=win.width;
      const stain=g.createLinearGradient(0,wy+46,0,wy+66);
      stain.addColorStop(0,'#56564b66');stain.addColorStop(1,'#56564b00');
      g.fillStyle=stain;g.fillRect(x-1,wy+46,w+2,21);
      winterSash(g,win.u,wy-1,w+4,44,win.take);
      g.fillStyle='#474a46';g.fillRect(x-4,wy+45,w+8,4);
      g.fillStyle='#d6d9d4';g.fillRect(x-4,wy+44,w+7,2);
    }
  }
  const base=canvas.height;
  g.fillStyle='#595b53';g.fillRect(0,base-9,len,9);
  for(const x of [10,len-14]){
    g.fillStyle='#303732';g.fillRect(x+2,0,6,base-7);
    g.fillStyle='#80867e';g.fillRect(x,0,5,base-7);
    for(let y=18;y<base-8;y+=43){g.fillStyle='#424743';g.fillRect(x-1,y,7,2);}
  }
  if(side===2 && h.entrances.length){
    const door=h.entrances[0],left=door.x-door.width/2;
    g.fillStyle='#ac9e86';g.fillRect(left-4,base-65,door.width+8,65);
    g.fillStyle='#292923';g.fillRect(left,base-61,door.width,61);
    g.fillStyle='#5a5548';g.fillRect(left+2,base-57,9,55);
    beam(g,left+10,base-27,left+10,base-19,2,'#b0ac91');
    g.fillStyle='#494c45';g.fillRect(left-8,base-68,door.width+16,5);
    g.fillStyle='#d8d9d0';g.fillRect(left-8,base-69,door.width+16,2);

  }
  return canvas;
}
function residenceRoof(h){
  const w=h.w*T+10,d=h.h*T+10,c=winterCanvas(w,d),g=c.getContext('2d'),rand=mulberry32(342);
  artFill(g,'floor_concrete',0,0,w,d);
  const snow=g.createPattern(snowMaterial(),'repeat');snow.setTransform(new DOMMatrix().scale(.49));
  g.fillStyle='#b1b9bb';g.fillRect(0,0,w,d);
  g.fillStyle=snow;g.globalAlpha=.22;g.fillRect(0,0,w,d);g.globalAlpha=1;
  for(let i=0;i<175;i++){
    const x=rand()*w,y=rand()*d,r=rand()*46+12;
    g.save();g.translate(x,y);g.rotate(-.14);g.scale(r,r*.32);
    const dust=g.createRadialGradient(0,0,0,0,0,1);
    dust.addColorStop(0,'rgba(245,246,239,.48)');dust.addColorStop(1,'rgba(245,246,239,0)');
    g.fillStyle=dust;g.fillRect(-1,-1,2,2);g.restore();
  }
  // Felt seams peek through wind-scoured lanes; parapets collect deeper snow.
  for(let y=27;y<d-12;y+=29){
    for(let x=10;x<w-15;){
      const len=10+rand()*60;
      beam(g,x,y,x+len,y,1+rand()*1.2,'rgba(86,91,92,.47)');
      x+=len+rand()*48;
    }
  }
  for(let i=0;i<115;i++){
    const x=rand()*w,y=rand()*d,r=rand()*37+8;
    g.save();g.translate(x,y);g.rotate(-.18);g.scale(r,r*.24);
    const drift=g.createRadialGradient(0,0,.05,0,0,1);
    drift.addColorStop(0,'rgba(239,244,245,.63)');drift.addColorStop(1,'rgba(236,241,243,0)');
    g.fillStyle=drift;g.fillRect(-1,-1,2,2);g.restore();
  }
  g.strokeStyle='#5d6261';g.lineWidth=7;g.strokeRect(5,5,w-10,d-10);
  g.strokeStyle='#d5d8d5';g.lineWidth=4;g.strokeRect(4,4,w-8,d-8);
  return c;
}
// Both endpoints of a horizontal wall course share the same projected depth.
// Sampling by courses keeps the entrance and window bays on their world axes
// all the way to a corner, where a single affine facade would smear its border.
function drawResidenceFace(h,side){
  const tex=h.residenceWalls[side],vertical=side%2;
  const x=h.x*T+(side===1?h.w*T:0),y=h.y*T+(side===2?h.h*T:0);
  const lift=roofLift(h),[tx,ty]=residencePoint(x,y,lift);
  ctx.save();
  if(vertical)ctx.transform(0,1,1,0,x,y);
  else ctx.translate(x,y);
  const along=vertical?ty-y:tx-x,across=vertical?tx-x:ty-y;
  if(Math.abs(across)>.01){
    // Project continuous horizontal courses across the entire face. Adjacent bays
    // share one scale, so mullions and jambs remain joined as the camera moves.
    const rows=Math.min(tex.height,Math.max(1,Math.ceil(Math.abs(across)/2)));
    for(let i=0;i<rows;i++){
      const f=1-i/rows,mid=f-.5/rows,scale=1+lift*mid,src=i*tex.height/rows;
      ctx.save();
      ctx.transform(scale,0,-(along+lift*tex.width/2)/tex.height,-across/tex.height,
        along*mid+(along+lift*tex.width/2)*(f-mid),across*f);
      ctx.drawImage(tex,0,src,tex.width,tex.height/rows,0,0,tex.width,tex.height/rows+.12);
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawResidence(h,i){
  const x=h.x*T,y=h.y*T,w=h.w*T,d=h.h*T,k=roofLift(h);
  if(cam.y+residenceTilt<y)drawResidenceFace(h,0);
  if(cam.x>x+w)drawResidenceFace(h,1);
  if(cam.y+residenceTilt>y+d)drawResidenceFace(h,2);
  if(cam.x<x)drawResidenceFace(h,3);
  if(h.storeys>1 && cam.y+residenceTilt>y+d){
    const door=h.entrances[0],width=door.width+14,capLift=k*.15;
    const [left,back]=residencePoint(x+door.x-width/2,y+d,capLift);
    const cw=width*(1+capLift),cd=15*(1+capLift);
    ctx.fillStyle='#504d41';ctx.fillRect(left,back+2,cw,cd+2);
    artFill(ctx,'wall_concrete',left,back,cw,cd);
    ctx.fillStyle='rgba(204,212,211,.62)';ctx.fillRect(left,back,cw,cd-2);
    beam(ctx,left,back+cd-2,left+cw,back+cd-2,2,'#e0e3db');
  }
  const [rx,ry]=residencePoint(x,y,k);
  ctx.drawImage(ROOFS[i],rx,ry,w*(1+k),d*(1+k));
  for(const [u,v,width,depth,rise] of h.rooftop)
    weatheredFlue(ctx,x+u+width/2,y+v+depth/2,k,width,depth,rise);
}
