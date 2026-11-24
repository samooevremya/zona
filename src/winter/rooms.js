// Interior and exterior use the same coordinates, including the position of each entrance.
function accessibleBuilding(b) {
  return !['platform','tower','tank'].includes(b[0]);
}
function localPoint(b,x,y) {
  const dx=x-b[1],dy=y-b[2],c=Math.cos(b[5]),s=Math.sin(b[5]);
  return [dx*c+dy*s,dy*c-dx*s];
}
function worldPoint(b,x,y) {
  const c=Math.cos(b[5]),s=Math.sin(b[5]);
  return [b[1]+x*c-y*s,b[2]+x*s+y*c];
}
function door(b,outside) { return worldPoint(b,0,b[4]/2+(outside?.29:-.31)); }
function flatWalls(b) {
  const w=b[3],h=b[4],lines=[];
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const a=-w/2+i*w/4,mid=a+w/8,y=side*.5;
      lines.push([[a,y],[mid-.34,y]],[[mid+.34,y],[a+w/4,y]]);
      // Short return wall between the entry and the back of each apartment.
      lines.push([[mid+w*.060,side*h/2],[mid+w*.060,side*(h/2-.57)]]);
      if(i && !(side===1 && i===2))lines.push([[a,y],[a,side*h/2]]);
    }
  }
  return lines;
}
const roomGeometry=winterMap.buildings.map(b=>b[0]==='flat'?flatWalls(b):[]);
function insideFree(i,x,y){
  const b=winterMap.buildings[i],[lx,ly]=localPoint(b,x,y);
  return Math.abs(lx)<b[3]/2-.12 && Math.abs(ly)<b[4]/2-.12 &&
    fitsFurniture(i,state.floor,lx,ly) && !roomGeometry[i].some(([a,b])=>clearance(lx,ly,a,b)<.12);
}
function stair(b,up){return worldPoint(b,up?.72:-.72,0);}
function roomPlace(i,floor){
  const b=winterMap.buildings[i];
  return b[0]==='flat'?'Берёзки · корпус '+(winterMap.buildings.slice(0,i+1).filter(k=>k[0]==='flat').length)+' · этаж '+floor:
    ({cabin:'Жилой дом',store:'Склад',shed:'Сарай',pump:'Водокачка',station:'Вокзал',ruin:'Разбитый корпус',hangar:'Ангар'})[b[0]];
}
// Individual furnishings keep their dimensions on every floor. Rotation is in quarter turns.
const furnishingSizes={
  bed:[1,2.05],table:[1.48,.88],chair:[.49,.5],cupboard:[1.25,.55],
  counter:[2.20,.62],sofa:[1.92,.91],bench:[1.78,.53],crate:[.76,.70],stove:[.69,.68],rug:[2.5,1.46]
};
const layouts=new Map();
function roomLayout(i,floor){
  const key=i*8+floor;
  if(layouts.has(key))return layouts.get(key);
  const b=winterMap.buildings[i],[kind,,,w,h]=b,layout=[];
  function put(type,x,y,turn=0){
    const [a,d]=furnishingSizes[type],ow=a*metre,oh=d*metre;
    const rx=(turn%2?oh:ow)/2,ry=(turn%2?ow:oh)/2;
    function clear(px,py){
      if(Math.abs(px)+rx>w/2-.065||Math.abs(py)+ry>h/2-.065)return false;
      if(type==='rug')return true;
      if(roomGeometry[i].some(([[ax,ay],[bx,by]])=>
        px+rx+.07>Math.min(ax,bx)&&px-rx-.07<Math.max(ax,bx)&&
        py+ry+.07>Math.min(ay,by)&&py-ry-.07<Math.max(ay,by)))return false;
      return !layout.some(q=>q.type!=='rug'&&Math.abs(px-q.x)<rx+q.rx+.035&&Math.abs(py-q.y)<ry+q.ry+.035);
    }
    for(const [dx,dy] of [[0,0],[-.19,0],[.19,0],[-.43,0],[.43,0],[0,.28],[0,-.28],[-.60,0],[.60,0]]){
      if(clear(x+dx,y+dy)){layout.push({type,x:x+dx,y:y+dy,ow,oh,turn,rx,ry});return;}
    }
  }
  const places=roomFurniture(b),[cx,cy]=localPoint(b,...places.box),[bx,by]=localPoint(b,...places.bed);
  put('cupboard',cx,cy);
  put(shelters.has(kind)?'bed':'crate',bx,by,1);
  if(kind==='flat'){
    for(const side of [-1,1])for(let n=0;n<4;n++){
      const mid=(n-1.5)*w/4, back=side*(h/2-.34);
      const variation=(n+floor+i+(side===1?2:0))%4;
      const sign=variation%2?1:-1;
      // Corner pieces are shared with the actual cupboard and bed interactions.
      const end=sign*w/11;
      if(variation===0||variation===3){
        if(side===1||n!==0&&n!==3)put('bed',mid+end,back,1);
        put('cupboard',mid-end,back);
        put('rug',mid+end*.76,side*.98);
        put('chair',mid-end+.54,back,1);
      }else if(variation===1){
        put('counter',mid+end,back);put('stove',mid+end-sign*.65,back);
        put('table',mid+.89*sign,side*(h/2-.88));
        put('chair',mid+.52*sign,side*(h/2-.66),sign>0?1:3);
        put('bench',mid-end,side*.81);
      }else{
        put('sofa',mid-end,back);put('rug',mid-end+.20,side*1.10);
        put('table',mid+end*.60,back);
        put('chair',mid+end*.60-.42,back-side*.22,1);
        put('cupboard',mid+end,side*.84);
      }
    }
    if(i===flatIndex&&floor===1)put('crate',-2.8,-.29);
  }else if(kind==='station'){
    for(let x=-w/2+.89;x<w/2-.7;x+=1.65)
      if(Math.abs(x)>1.1)put('bench',x,h/2-.42);
    put('table',-w*.24,-h*.34);put('chair',-w*.24+.48,-h*.34,1);
  }else if(kind==='cabin'||kind==='pump'){
    put('table',-w*.28,h*.24);if(w>=3)put('chair',-w*.28+.49,h*.24,1);
  }else if(w>3){
    for(let x=-w*.33;x<w*.3;x+=1.29)put('crate',x,-h/2+.87,1);
    put('table',w*.30,h*.27);
  }
  layouts.set(key,layout);return layout;
}
function fitsFurniture(i,floor,x,y){
  return !roomLayout(i,floor).some(p=>p.type!=='rug'&&Math.abs(x-p.x)<p.rx+.075&&Math.abs(y-p.y)<p.ry+.075);
}
function drawFlight(ctx,x,y,w,h,down){
  ctx.save();ctx.translate(x,y);
  const l=-w/2,t=-h/2,edge=.07,steps=Math.round(h/(metre*.30));
  ctx.fillStyle='#575b55';ctx.fillRect(l,t,w,h);
  const rise=h/steps;
  for(let n=0;n<steps;n++){
    const k=(down?n:steps-1-n)/steps,value=Math.round(61+97*k);
    ctx.fillStyle='rgb('+value+','+(value+3)+','+(value-3)+')';
    ctx.fillRect(l+edge,t+n*rise,w-edge*2,rise);
    ctx.fillStyle='rgba(32,35,32,.44)';ctx.fillRect(l+edge,t+n*rise,w-edge*2,.029);
    ctx.fillStyle='rgba(220,219,200,.34)';ctx.fillRect(l+edge,t+(n+1)*rise-.015,w-edge*2,.014);
  }
  // The stone grain is sampled from individual worn treads and mapped onto this flight.
  if(furnishingAtlas.naturalWidth){
    ctx.save();ctx.globalAlpha=.77;
    for(let n=0;n<steps;n++){
      const row=down?n:steps-1-n;
      ctx.drawImage(furnishingAtlas,49,284+(row%8)*12,142,10,l+edge,t+n*rise,w-2*edge,rise);
    }
    ctx.restore();
  }
  const well=ctx.createLinearGradient(0,down?t:-t,0,down?-t:t);
  well.addColorStop(0,'rgba(23,27,25,.90)');well.addColorStop(.40,'rgba(31,34,30,.34)');
  well.addColorStop(1,'rgba(88,83,72,.04)');
  ctx.fillStyle=well;ctx.fillRect(l+edge,t,w-2*edge,h);
  const edges=ctx.createLinearGradient(l,0,-l,0);
  edges.addColorStop(0,'rgba(17,23,21,.63)');edges.addColorStop(.22,'rgba(17,23,21,.05)');
  edges.addColorStop(.82,'rgba(17,23,21,0)');edges.addColorStop(1,'rgba(17,23,21,.57)');
  ctx.fillStyle=edges;ctx.fillRect(l,t,w,h);
  ctx.restore();
}
function scuffWood(ctx,x,y,w,h,tint){
  ctx.fillStyle=tint;ctx.fillRect(x,y,w,h);
  fillMaterial(ctx,2,x,y,w,h,.98,.37);
}
function drawPiece(ctx,p){
  const {type,x,y,ow:w,oh:h,turn}=p,l=-w/2,t=-h/2;
  ctx.save();ctx.translate(x,y);
  if(type!=='rug')contactShade(ctx,.06,.08,p.rx*1.48+.065,p.ry*1.42+.06,.62);
  ctx.rotate(turn*Math.PI/2);
  if(type==='rug'){
    scuffWood(ctx,l,t,w,h,'#63584c');
    ctx.strokeStyle='#83735e';ctx.lineWidth=.025;ctx.strokeRect(l+.052,t+.052,w-.104,h-.104);
    for(let xx=l+.12;xx<-l-.08;xx+=.12){
      stroke(ctx,[[xx-.045,0],[xx,t*.40],[xx+.045,0],[xx,-t*.40],[xx-.045,0]],'#83745e',.017);
    }
  }else if(type==='sofa'){
    scuffWood(ctx,l,t,w,h,'#4e5044');
    for(const side of [-1,1]){
      if(furnishingAtlas.naturalWidth)ctx.drawImage(furnishingAtlas,56,73,81,49,side<0?l+.03:.01,t+.05,w/2-.04,h-.08);
    }
    ctx.fillStyle='#525348';ctx.fillRect(l,t,w,.055);
  }else if(type==='counter'){
    scuffWood(ctx,l,t,w,h,'#817663');
    if(furnishingAtlas.naturalWidth)ctx.drawImage(furnishingAtlas,490,8,207,47,l,t,w,h);
    ctx.fillStyle='#4f5550';ctx.fillRect(-w*.35,t+.045,w*.31,h-.08);
    ctx.strokeStyle='#a8aba1';ctx.lineWidth=.014;ctx.strokeRect(-w*.35,t+.045,w*.31,h-.08);
  }else if(type==='bed'){
    // Crop linen only. Rails, footboard and the footprint are world geometry.
    ctx.fillStyle='#484740';ctx.fillRect(l,t+.028,w,h);
    if(furnishingAtlas.naturalWidth)ctx.drawImage(furnishingAtlas,23,26,185,168,l+.025,t+.025,w-.05,h-.063);
    for(const end of [-1,1])stroke(ctx,[[l,end*t],[-l,end*t]],'#65655a',.035);
    for(const side of [-1,1])stroke(ctx,[[side*l,t],[side*l,-t]],'#454943',.024);
  }else if(type==='table'||type==='cupboard'||type==='crate'){
    const table=type==='table';
    ctx.fillStyle='#4d483c';ctx.fillRect(l,t+.036,w,h);
    scuffWood(ctx,l,t,w,h,type==='crate'?'#806952':'#655747');
    if(furnishingAtlas.naturalWidth){
      const crop=table?[246,7,217,119]:type==='cupboard'?[486,9,214,44]:[279,323,55,74];
      ctx.drawImage(furnishingAtlas,...crop,l+.012,t+.012,w-.024,h-.024);
    }
    ctx.fillStyle='#4e5049';
    if(type==='cupboard'){ctx.fillRect(-.008,t,.016,h);ctx.fillRect(-.04,-t-.052,.08,.017);}
    if(type==='crate')for(const xx of [-w*.32,w*.28]){ctx.fillStyle='#81765e';ctx.fillRect(xx,t,.028,h);}
  }else if(type==='stove'){
    ctx.fillStyle='#504e45';ctx.fillRect(l,t,w,h);ctx.fillStyle='#79776a';ctx.fillRect(l+.02,t+.02,w-.04,h-.055);
    ellipse(ctx,.024,-.017,.064,.064,'#565950');ellipse(ctx,.024,-.017,.044,.044,'#707066');
    ctx.fillStyle='#3a3c38';ctx.fillRect(-.083,-t-.035,.166,.035);
  }else{
    scuffWood(ctx,l,t,w,h,'#796550');
    for(let yy=t+.035;yy<-t;yy+=.054){ctx.fillStyle='rgba(38,38,30,.34)';ctx.fillRect(l,yy,w,.009);}
    ctx.fillStyle='#514f43';ctx.fillRect(l,t-.025,w,.034);
  }
  ctx.restore();
}
function paintRoom(v,i,floor){
  const b=winterMap.buildings[i],[kind,bx,by,w,h,angle]=b,[px,py]=screen(bx,by,v);
  const l=-w/2,t=-h/2;
  g.save();g.translate(px,py);g.scale(v.z,v.z);g.rotate(angle);
  scuffWood(g,l,t,w,h,'#746e62');fillMaterial(g,2,l,t,w,h,2.25,.72);
  if(kind==='flat'){
    for(const side of [-1,1])for(let n=0;n<4;n++){
      const start=l+n*w/4,y=side<0?t:.5,rw=w/4,rh=h/2-.5;
      const palette=['#685f4e','#74796d','#675746','#766b57'];
      const variant=(n+floor+i+(side===1?2:0))%4;
      g.fillStyle=palette[variant];g.fillRect(start,y,rw,rh);
      fillMaterial(g,2,start,y,rw,rh,variant===1?1.23:2.10,variant===1?.24:.55);
      const ambient=g.createLinearGradient(0,side*h/2,0,side*.5);
      ambient.addColorStop(0,'rgba(28,35,33,.53)');ambient.addColorStop(.24,'rgba(52,48,34,.14)');
      ambient.addColorStop(.65,'rgba(66,60,47,.04)');ambient.addColorStop(1,'rgba(36,36,31,.24)');
      g.fillStyle=ambient;g.fillRect(start,y,rw,rh);
    }
    g.fillStyle='#706e62';g.fillRect(l,-.50,w,1);
    fillMaterial(g,2,l,-.50,w,1,1.6,.33);
  }
  const pieces=roomLayout(i,floor);
  for(const p of pieces)if(p.type==='rug')drawPiece(g,p);
  function wall(a,z){
    const shadow=[[a[0]+.065,a[1]+.10],[z[0]+.065,z[1]+.10]];
    stroke(g,shadow,'rgba(50,45,37,.21)',.24);
    stroke(g,[a,z],'#494942',.143);stroke(g,[a,z],'#948f80',.094);
    stroke(g,[[a[0]-.02,a[1]-.021],[z[0]-.02,z[1]-.021]],'#bfb6a3',.023);
  }
  if(kind==='station'){
    wall([l,t],[-.28,t]);wall([.28,t],[-l,t]);
  }else wall([l,t],[-l,t]);
  wall([l,t],[l,-t]);wall([-l,t],[-l,-t]);
  wall([l,-t],[-.28,-t]);wall([.28,-t],[-l,-t]);
  for(const [a,z] of roomGeometry[i])wall(a,z);
  for(const p of pieces)if(p.type!=='rug')drawPiece(g,p);
  if(kind==='flat'){
    for(const side of [-1,1])for(let n=0;n<4;n++){
      const mid=(n-1.5)*w/4,sy=side*h/2;
      for(const dx of [-1.13,1.13]){
        const x=mid+dx;
        stroke(g,[[x-.27,sy],[x+.27,sy]],'#aeb9b6',.09);
        stroke(g,[[x,sy-.05],[x,sy+.05]],'#65716e',.025);
        const grad=g.createRadialGradient(x,sy,0,x,sy,.95);
        grad.addColorStop(0,'rgba(226,231,214,.25)');grad.addColorStop(1,'rgba(226,231,214,0)');
        g.fillStyle=grad;g.fillRect(x-.95,side===1?sy-.95:sy,1.9,.95);
      }
      stroke(g,[[mid-.32,side*.51],[mid-.39,side*.77]],'#756957',.045);
    }
    for(const up of [true,false])if(up?floor<5:floor>1){
      const [x,y]=localPoint(b,...stair(b,up));drawFlight(g,x,y,.52,.86,!up);
    }
  }else if(kind==='station')drawFlight(g,-3.6,.72,.76,1.05,true);
  g.restore();
}
