// Dimensions are in the same world pixels as the floor plan. The wall along a
// stair landing gets smaller panes; the apartment windows follow the room bays.
const residenceFloorHeight=84;
const residenceTilt=235;
function residencePoint(x,y,k){
  const [u,v]=roofPoint(x,y,k);
  return [u,v-residenceTilt*k];
}
function residenceWindows(side,storey){
  const positions=side%2 ? [2.5,5.65,8.5] : [2.6,5,8.1,10.3,14,16,18.65];
  return positions.map((tile,i)=>({
    u:tile*T, width:(side%2 && i===1 || !(side%2) && i===6)?22:34,
    boards:(side*3+i+storey)%4===0?2:1,
    warm:side===2 && i===(storey===1?1:2) && storey<=3
  }));
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
    for(const win of residenceWindows(side,floor)){
      const x=win.u-win.width/2,wy=y+14,w=win.width;
      const stain=g.createLinearGradient(0,wy+46,0,wy+66);
      stain.addColorStop(0,'#56564b66');stain.addColorStop(1,'#56564b00');
      g.fillStyle=stain;g.fillRect(x-1,wy+46,w+2,21);
      g.fillStyle='#555750';g.fillRect(x-4,wy-4,w+8,53);
      g.fillStyle='#a49c84';g.fillRect(x-2,wy-2,w+4,48);
      const glass=g.createLinearGradient(0,wy,0,wy+43);
      glass.addColorStop(0,win.warm?'#5c4931':'#2d383d');glass.addColorStop(1,win.warm?'#b0935b':'#778388');
      g.fillStyle=glass;g.fillRect(x,wy,w,43);
      g.fillStyle='#574f42';g.fillRect(win.u-1,wy,3,43);g.fillRect(x,wy+10,w,2);
      for(let i=0;i<win.boards;i++){
        const ay=wy+14+i*11,delta=i?3:-4;
        beam(g,x-1,ay,x+w+1,ay+delta,5,'#6b5947');
        beam(g,x-1,ay-2,x+w+1,ay+delta-2,1,'#ab9578');
      }
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
  if(side===2){
    const door=h.entrances[0],left=door.x-door.width/2;
    g.fillStyle='#ac9e86';g.fillRect(left-4,base-65,door.width+8,65);
    g.fillStyle='#292923';g.fillRect(left,base-61,door.width,61);
    g.fillStyle='#5a5548';g.fillRect(left+2,base-57,9,55);
    beam(g,left+10,base-27,left+10,base-19,2,'#b0ac91');
    g.fillStyle='#494c45';g.fillRect(left-8,base-68,door.width+16,5);
    g.fillStyle='#d8d9d0';g.fillRect(left-8,base-69,door.width+16,2);
    g.fillStyle='#363831';g.fillRect(left+door.width+7,base-51,9,15);
    g.fillStyle='#efc781';g.fillRect(left+door.width+9,base-49,5,10);
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
  // Top view of the stair headhouse and vents also serves the map and menus.
  for(const part of h.rooftop){
    const [x,y,width,depth]=part;
    g.fillStyle='rgba(64,67,65,.47)';g.fillRect(x-3,y-3,width+9,depth+10);
    g.fillStyle='rgba(57,64,71,.28)';g.fillRect(x+12,y+9,width+4,depth+4);
    artFill(g,'wall_concrete',x,y,width,depth);g.fillStyle=snow;
    g.globalAlpha=.7;g.fillRect(x+1,y+1,width-2,depth-2);g.globalAlpha=1;
    g.strokeStyle='#696f6e';g.lineWidth=1.4;g.strokeRect(x,y,width,depth);
    if(width>40){
      for(let seam=x+7;seam<x+width;seam+=9)beam(g,seam,y+1,seam,y+depth-1,1,'#737c79');
      artFill(g,'floor_wood',x+7,y+7,19,14);g.fillStyle='#777f7b';g.fillRect(x+8,y+8,17,12);
      beam(g,x+11,y+16,x+18,y+16,2,'#494e49');
    }else{
      const cx=x+width/2,cy=y+depth/2;
      g.fillStyle='#707269';g.beginPath();g.arc(cx,cy,5.5,0,2*Math.PI);g.fill();
      g.fillStyle='#393e3c';g.beginPath();g.arc(cx,cy,3.5,0,2*Math.PI);g.fill();
    }
  }
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
    // Small affine patches follow the local slope of a bay, including its shear.
    // Their bounds meet on the shared panel edges rather than jumping a few
    // horizontal pixels between rows at the far end of the building.
    const rows=h.storeys*3,cols=Math.ceil(tex.width/(3*T));
    for(let row=0;row<rows;row++){
      const f=1-row/rows,mid=f-.5/rows,srcY=row*tex.height/rows;
      for(let col=0;col<cols;col++){
        const left=col*tex.width/cols,width=tex.width/cols;
        const shear=along+lift*(left+width/2);
        const u=left*(1+lift*mid)+along*mid+shear*(f-mid);
        ctx.save();
        ctx.transform(1+lift*mid,0,-shear/tex.height,-across/tex.height,u,across*f);
        ctx.drawImage(tex,left,srcY,width,tex.height/rows,0,0,width+.55,tex.height/rows+.65);
        ctx.restore();
      }
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
  const [rx,ry]=residencePoint(x-3,y-3,k);
  ctx.drawImage(ROOFS[i],rx,ry,(w+10)*(1+k),(d+10)*(1+k));
  for(const [u,v,width,depth,rise] of h.rooftop){
    const px=x-3+u,py=y-3+v;
    const corners=[[px,py],[px+width,py],[px+width,py+depth],[px,py+depth]];
    const bottom=corners.map(p=>residencePoint(...p,k)),top=corners.map(p=>residencePoint(...p,k+rise));
    for(const [a,b,visible,shade] of [[0,1,cam.y+residenceTilt<py,'#626963'],[1,2,cam.x>px+width,'#5f6665'],[3,2,cam.y+residenceTilt>py+depth,'#85877b'],[0,3,cam.x<px,'#72756c']]){
      if(!visible)continue;
      ctx.fillStyle=shade;ctx.beginPath();ctx.moveTo(...bottom[a]);ctx.lineTo(...bottom[b]);ctx.lineTo(...top[b]);ctx.lineTo(...top[a]);ctx.fill();
    }
    ctx.drawImage(ROOFS[i],u,v,width,depth,...top[0],width*(1+k+rise),depth*(1+k+rise));
  }
}
