// Project each footprint corner away from the camera, keeping foundations on the ground.
function liftPoint(x,y,k,v){
  return [x+(x-v.x)*k,y+(y-v.y-(wide?0:6))*k];
}
function polygon(ctx,points,fill){
  ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
}
const wallSheets=new Map();
function elevation(kind,side,length,doorway){
  const key=[kind,side,length,doorway].join(':');if(wallSheets.has(key))return wallSheets.get(key);
  const c=document.createElement('canvas'),floors=kind==='flat'?5:1;
  c.width=Math.round(length*84);c.height=80*floors;
  const ctx=c.getContext('2d'),w=c.width,h=c.height,r=randomStream(707+side+w);
  const masonry=['flat','station','ruin','hangar'].includes(kind);
  ctx.fillStyle=masonry?'#96988d':'#685f4d';ctx.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=masonry?13:9){
    ctx.fillStyle=masonry?'rgba(62,62,55,.20)':'rgba(36,36,30,.54)';ctx.fillRect(0,y,w,1.4);
    if(masonry)for(let x=(y%2)*13;x<w;x+=28)ctx.fillRect(x,y,1,12);
  }
  for(let i=0;i<w*h/35;i++){
    ctx.fillStyle=r()>.48?'rgba(218,214,193,.18)':'rgba(49,51,45,.14)';
    ctx.fillRect(r()*w,r()*h,1+r()*4,1+r()*4);
  }
  const bays=Math.max(1,Math.floor(length/(kind==='flat'?1.45:1.12)));
  for(let f=0;f<floors;f++)for(let j=0;j<bays;j++){
    const x=(j+.5)*w/bays,y=f*80+17;
    if(doorway&&f===floors-1&&Math.abs(x-w/2)<43)continue;
    ctx.fillStyle='#494b44';ctx.fillRect(x-21,y-2,42,38);
    const glass=ctx.createLinearGradient(x,y,x+15,y+33);
    glass.addColorStop(0,'#333c3b');glass.addColorStop(1,r()>.8?'#a29470':'#768282');
    ctx.fillStyle=glass;ctx.fillRect(x-17,y+1,34,31);
    ctx.fillStyle='#999686';ctx.fillRect(x-1,y,3,34);ctx.fillRect(x-17,y+10,34,2);
    ctx.fillStyle='#c4c6ba';ctx.fillRect(x-23,y+33,46,3);
  }
  if(doorway){ctx.fillStyle='#292d2a';ctx.fillRect(w/2-22,h-59,44,59);
    ctx.fillStyle='#665e4c';ctx.fillRect(w/2-21,h-55,9,52);}
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(24,31,31,.52)');
  shade.addColorStop(.26,'rgba(32,36,34,.10)');shade.addColorStop(1,'rgba(33,37,34,.23)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  wallSheets.set(key,c);return c;
}
function facade(ctx,texture,a,b,c,d){
  // Parallel strips share projected top and bottom endpoints, including at rotated corners.
  const n=Math.max(1,Math.ceil(texture.width/38));
  for(let j=0;j<n;j++){
    const t=j/n,end=(j+1)/n,lerp=(p,q,k)=>[p[0]+(q[0]-p[0])*k,p[1]+(q[1]-p[1])*k];
    const base=lerp(a,b,t),top=lerp(d,c,t),right=lerp(d,c,end);
    ctx.save();ctx.transform(right[0]-top[0],right[1]-top[1],base[0]-top[0],base[1]-top[1],...top);
    ctx.drawImage(texture,t*texture.width,0,texture.width/n,texture.height,0,0,1.015,1);ctx.restore();
  }
}
function renderBuilding(b,i,v){
  const [kind,x,y,w,h,angle]=b;
  if(kind==='platform'||Math.abs(x-v.x)>viewW/(2*v.z)+w+h||Math.abs(y-v.y)>viewH/(2*v.z)+w+h)return;
  const k=wide?.018:kind==='flat'?.24:kind==='tower'||kind==='tank'?.135:kind==='station'?.14:.095;
  const footprint=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(p=>worldPoint(b,...p));
  const roof=footprint.map(p=>liftPoint(...p,k,v)),[sx,sy]=screen(0,0,v);
  g.save();g.translate(sx,sy);g.scale(v.z,v.z);
  contactShade(g,x+.21,y+.22,w*.60,h*.58,.52);
  if(kind==='tower'||kind==='tank'){
    for(const p of footprint){
      const top=liftPoint(...p,k,v);
      stroke(g,[p,top],kind==='tower'?'#6b5b45':'#596161',.08);
    }
  }
  for(let s=0;s<4&&kind!=='tower'&&kind!=='tank';s++){
    const a=footprint[s],z=footprint[(s+1)%4],d=roof[s],c=roof[(s+1)%4];
    if((z[0]-a[0])*(v.y+(wide?0:6)-a[1])-(z[1]-a[1])*(v.x-a[0])>=0)continue;
    polygon(g,[a,z,c,d],'#706e61');
    facade(g,elevation(kind,s,s%2?h:w,s===2||kind==='station'&&s===0),a,z,c,d);
  }
  const pos=liftPoint(x,y,k,v);g.translate(...pos);g.rotate(angle);g.scale(1+k,1+k);
  const l=-w/2,t=-h/2;
  if(kind==='tower'||kind==='tank'){
    if(kind==='tank')stamp(g,5,l,t,w,h);else yardObject(g,0,0,0,w,h);
  }else{
    g.fillStyle='#969c99';g.fillRect(l,t,w,h);fillMaterial(g,1,l,t,w,h,2.2,.88);
    if(kind==='station'||kind==='flat'){
      const sh=roofAtlas.height/2;
      g.drawImage(roofAtlas,0,kind==='flat'?sh:0,roofAtlas.width,sh,l,t,w,h);
    }else{
      const id=kind==='cabin'?2:kind==='ruin'||kind==='hangar'?3:4;
      stamp(g,id,l,t,w,h,.08,id===3?.80:.60);
    }
    g.strokeStyle='#929791';g.lineWidth=.035;g.strokeRect(l,t,w,h);
  }
  g.restore();
}
function snowRelief(ctx,x,y,w,h){
  for(let j=Math.floor(y/1.7)-1;j<=(y+h)/1.7+1;j++)for(let i=Math.floor(x/2.3)-1;i<=(x+w)/2.3+1;i++){
    const r=randomStream(Math.imul(i,49297)^Math.imul(j,7933)^445);
    const px=(i+r())*2.3,py=(j+r())*1.7;
    const size=.45+r()*.77;
    ctx.save();ctx.translate(px,py);ctx.rotate(-.36+r()*.19);ctx.scale(size,size*(.18+r()*.17));
    const light=ctx.createLinearGradient(0,-1,0,1);
    light.addColorStop(0,'rgba(230,237,235,0)');light.addColorStop(.32,'rgba(242,245,237,.31)');
    light.addColorStop(.67,'rgba(114,134,151,.19)');light.addColorStop(1,'rgba(116,137,151,0)');
    ellipse(ctx,0,0,1,1,light);ctx.restore();
  }
}

function brokenPlanks(ctx,x,y,w){
  ctx.save();ctx.translate(x,y);ctx.rotate(.32);
  for(let n=0;n<4;n++)stroke(ctx,[[-w*.45+n*.05,-.08+n*.04],[w*(.12+n*.08),-.04+n*.05]],n%2?'#786548':'#615845',.029);
  ctx.restore();
}
function stackedWood(ctx,x,y,w,h,angle,v){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const ca=Math.cos(angle),sa=Math.sin(angle),dx=(x-v.x)*.033,dy=(y-v.y-6)*.033;
  const ox=dx*ca+dy*sa,oy=dy*ca-dx*sa;
  for(let row=0;row<3;row++)for(let n=0;n<8;n++){
    const lx=-w*.43+n*w*.118+(row%2)*.023,ly=h*.26;
    const tone=lattice(n,row);
    ellipse(ctx,lx+ox*row/3,ly+oy*row/3,w*.067,h*.105,tone>.5?'#705b40':'#8e7553');
    ellipse(ctx,lx+ox*row/3-.009,ly+oy*row/3,w*.044,h*.075,'#ab9271');
  }
  const end=oy>=0?-h*.39:h*.39;
  polygon(ctx,[[-w/2,end],[w/2,end],[w/2+ox,end+oy],[-w/2+ox,end+oy]],'#69685a');
  ctx.translate(ox,oy);ctx.fillStyle='#9d9c8f';ctx.fillRect(-w/2,-h*.41,w,h*.82);
  fillMaterial(ctx,1,-w/2,-h*.41,w,h*.82,1.6,.81);
  stroke(ctx,[[-w/2,-h*.38],[w/2,-h*.38]],'#dbded2',.033);ctx.restore();
}
