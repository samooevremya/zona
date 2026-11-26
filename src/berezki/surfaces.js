// World-space materials and leeward snow banks. The same height profile lights
// the crust, covers the boots and sets resistance to movement.
const snowCell=160, forestBanks=new Map();
const bankArt=[], bootDepthCache=new WeakMap();
function windProfile(u,v,variant){
  const bend=.19*Math.sin(u*3.8+variant)+.07*Math.sin(u*7.1-variant);
  const across=v-bend;
  const s=across/(across<0?.62:1.04);
  const edge=Math.max(0,1-u*u-s*s);
  return edge*edge*(.92+.08*Math.cos(u*4+variant));
}
function makeBankArt(variant){
  const c=winterCanvas(192,108),g=c.getContext('2d'),im=g.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    const u=(x+.5)/96-1,v=((y+.5)/54-1)*1.38;
    const z=windProfile(u,v,variant);
    if(z<=0)continue;
    const delta=windProfile(u-.012,v-.038,variant)-windProfile(u+.012,v+.038,variant);
    const light=-delta*390-9*z,grain=(hash2(x+variant,y)-.5)*4;
    const k=4*(y*c.width+x);
    im.data[k]=210+light+grain;im.data[k+1]=219+light*.86+grain;im.data[k+2]=226+light*.72+grain;
    im.data[k+3]=Math.min(210,Math.sqrt(z)*240);
  }
  g.putImageData(im,0,0);return c;
}
function surfacePatterns(){
  const atlas=district.images.groundscan,size=atlas.width/2,result={};
  for(const [i,[name,scale]] of [['powder',.63],['pack',.36],['boards',.235],['slab',.46]].entries()){
    const c=winterCanvas(size,size),g=c.getContext('2d');
    g.drawImage(atlas,(i%2)*size,Math.floor(i/2)*size,size,size,0,0,size,size);
    const pat=g.createPattern(c,'repeat');pat.setTransform(new DOMMatrix().scale(scale));result[name]=pat;
  }
  return result;
}
function winterPaving(g,key,x,y,w,h){g.fillStyle=district.surface[key];g.fillRect(x,y,w,h);}
function nearWinterRoute(x,y,buffer){
  for(const [i,route] of atlasRoutes.entries()){
    const radius=buffer+(i===0?57:i===1?40:25);
    for(let j=1;j<route.length;j++){
      const [a,b]=route[j-1],[c,d]=route[j],ox=x-a*T,oy=y-b*T,dx=(c-a)*T,dy=(d-b)*T;
      const t=clamp((ox*dx+oy*dy)/(dx*dx+dy*dy||1),0,1);
      if((ox-t*dx)**2+(oy-t*dy)**2<radius*radius)return true;
    }
  }
  return false;
}
function forestBank(cx,cy){
  if(cx<0||cy<0||cx*snowCell>=district.width*T||cy*snowCell>=district.height*T)return null;
  const key=cy*256+cx;
  if(forestBanks.has(key))return forestBanks.get(key);
  let bank=null;
  const rand=mulberry32(Math.floor(hash2(cx+39,cy)*4294967296));
  const left=cx*snowCell,top=cy*snowCell;
  for(let n=0;n<10;n++){
    const tx=Math.floor((left+rand()*snowCell)/T),ty=Math.floor((top+rand()*snowCell)/T);
    if(tAt(tx,ty)!==TR)continue;
    const x=(tx+.5)*T+20+rand()*22,y=(ty+.5)*T+10+rand()*16;
    const rx=48+rand()*49,ry=16+rand()*24,margin=rx/T+1;
    if(ty>214 && ty<236 || basinRadius(tx,ty,lakeShape)<1.06 || basinRadius(tx,ty,marshShape)<1.15 ||
        inMarshChannel(tx,ty) || nearWinterRoute(x,y,rx) ||
        district.levels.some(r=>tx>=r.x-margin && tx<=r.x+r.w+margin && ty>=r.y-margin && ty<=r.y+r.h+margin))break;
    const angle=-.42+rand()*.48;
    bank={x,y,rx,ry,angle,c:Math.cos(angle),s:Math.sin(angle),variant:Math.floor(rand()*5),depth:.68+.32*rand()};
    break;
  }
  forestBanks.set(key,bank);return bank;
}
function forestDepth(x,y){
  if(x>district.width*T || y>district.height*T)return 0;
  let height=0;
  for(let j=Math.floor((y-145)/snowCell);j<=Math.floor((y+110)/snowCell);j++)
    for(let i=Math.floor((x-160)/snowCell);i<=Math.floor((x+110)/snowCell);i++){
      const b=forestBank(i,j);if(!b)continue;
      const dx=x-b.x,dy=y-b.y;
      if(Math.abs(dx)>b.rx+8 || Math.abs(dy)>b.ry*1.38+b.rx*.42)continue;
      const u=(dx*b.c+dy*b.s)/b.rx,v=(-dx*b.s+dy*b.c)/b.ry;
      height=Math.max(height,b.depth*windProfile(u,v,b.variant));
    }
  return height;
}
function snowAtBoots(actor){
  let sample=bootDepthCache.get(actor);
  if(!sample){sample={};bootDepthCache.set(actor,sample);}
  if(sample.x!==actor.x || sample.y!==actor.y){
    sample.x=actor.x;sample.y=actor.y;
    sample.depth=forestDepth(actor.x,actor.y);
  }
  return sample.depth;
}
function drawForestSnow(g,l,t,r,bottom){
  for(let j=Math.floor((t-180)/snowCell);j<=Math.floor((bottom+150)/snowCell);j++)
    for(let i=Math.floor((l-180)/snowCell);i<=Math.floor((r+150)/snowCell);i++){
      const bank=forestBank(i,j);if(!bank)continue;
      const {x,y,rx,ry,angle,variant,depth}=bank;
      g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=depth;
      g.drawImage(bankArt[variant],-rx,-ry*1.38,2*rx,2.76*ry);
      g.restore();
    }
}

function winterRailBed(){
  const w=16*T,h=38,c=winterCanvas(w,h),g=c.getContext('2d'),rand=mulberry32(7713);
  winterPaving(g,'pack',0,0,w,h);
  g.fillStyle='#4c4c494d';g.fillRect(0,3,w,32);
  for(let i=0;i<1900;i++){
    const x=rand()*w,y=rand()*h,size=.55+rand()*1.45;
    shoreEllipse(g,x,y,size,size*.65,['#555755a6','#83827bb0','#c0bfaf9c','#646562ad'][i%4],rand()*3);
  }
  for(let x=4;x<w;x+=8){
    const y=4+rand()*1.7,foot=29-rand()*2;
    g.fillStyle='#4245418a';g.fillRect(x+.8,y+.8,3.8,foot);
    g.save();g.translate(x,y);g.rotate(Math.PI/2);
    winterPaving(g,'boards',0,-3.3,foot,3.3);g.restore();
    for(const yy of [10,27]){
      g.fillStyle='#4a4843';g.fillRect(x-.8,yy-1.9,4.8,3.9);
      g.fillStyle='#9f9d92';g.fillRect(x,yy-1.7,1,1);
    }
  }
  for(let i=0;i<240;i++){
    const x=rand()*w,y=rand()*h,edge=Math.min(y,h-y);
    if(edge<6 || (edge<15 && rand()<.17))shoreEllipse(g,x,y,1+rand()*5,.6+rand(), '#e2e5e1ad',-.21);
  }
  for(const y of [10,27]){
    const rail=g.createLinearGradient(0,y-1.5,0,y+2.6);
    for(const [at,color] of [[0,'#c3c2b3'],[.27,'#acaba1'],[.5,'#77766e'],[.78,'#665850'],[1,'#444640']])rail.addColorStop(at,color);
    g.fillStyle=rail;g.fillRect(0,y-1.5,w,4.1);
  }
  g.globalCompositeOperation='destination-in';const edge=g.createLinearGradient(0,0,0,h);
  for(const [at,a] of [[0,0],[.16,1],[.84,1],[1,0]])edge.addColorStop(at,'rgba(0,0,0,'+a+')');
  g.fillStyle=edge;g.fillRect(0,0,w,h);return c;
}

// Vary the width of the packed shoulders and the lateral position of wheel ruts.
// These paths are built once. Their coordinates continue across terrain chunks.
function winterRoadBed(route,index){
  const width=index===0?108:index===1?72:44,samples=[];
  let distance=0;
  for(let i=1;i<route.length;i++){
    const [a,b]=route[i-1],[c,d]=route[i],dx=(c-a)*T,dy=(d-b)*T,len=Math.hypot(dx,dy);
    const divisions=Math.ceil(len/19);
    for(let j=0;j<divisions+(i===route.length-1?1:0);j++){
      const k=j/divisions,x=a*T+k*dx,y=b*T+k*dy,s=distance+k*len;
      const wear=vnoise(x+67,y-41,47)-.5;
      samples.push({x,y,nx:-dy/len,ny:dx/len,s,w:width*(.48+.12*wear+.033*Math.sin(s/93))});
    }
    distance+=len;
  }
  const shoulder=ratio=>{
    const path=new Path2D();
    for(const side of [1,-1]){
      for(let j=0;j<samples.length;j++){
        const p=samples[side===1?j:samples.length-1-j];
        const offset=side*ratio*(p.w+2*Math.sin(p.s/33+side));
        path.lineTo(p.x+p.nx*offset,p.y+p.ny*offset);
      }
    }
    path.closePath();return path;
  };
  const tracks=[];
  if(index<2)for(const side of [-1,1]){
    const path=new Path2D();
    for(const p of samples){
      const offset=width*.18*side+2.2*Math.sin(p.s/97)+1.3*Math.sin(p.s/46+.4);
      path.lineTo(p.x+p.nx*offset,p.y+p.ny*offset);
    }
    tracks.push(path);
  }
  const x=route.map(p=>p[0]*T),y=route.map(p=>p[1]*T);
  return {l:Math.min(...x)-width,r:Math.max(...x)+width,t:Math.min(...y)-width,b:Math.max(...y)+width,
    bands:[1,.93,.81,.65].map(shoulder),tracks};
}

function thawAtDoor(room,plan){
  if(room.n!==1)return;
  const house=HOUSES.find(h=>h.x===room.x && h.y===room.y);
  const g=plan.getContext('2d'),rand=mulberry32(room.x*797+room.y);
  for(const d of house?.entrances||[]){
    g.save();g.translate(d.x,d.y);g.rotate(Math.atan2(-d.ny,-d.nx));
    // Wet grit dries towards the inside of a busy doorway.
    for(let i=0;i<45;i++){
      const x=4+rand()**1.6*47,y=(rand()-.5)*Math.min(d.width-9,28);
      shoreEllipse(g,x,y,.7+rand()*2.3,.45+rand()*.85,'#4a45393b',rand()*.6);
    }
    g.restore();
  }
}
function lakeIceDetail(g,l,t,r,b){
  const size=220;
  for(let cy=Math.floor((t-110)/size);cy<=Math.floor((b+110)/size);cy++)
    for(let cx=Math.floor((l-110)/size);cx<=Math.floor((r+110)/size);cx++){
      const rand=mulberry32(Math.floor(hash2(cx+414,cy-57)*4294967296));
      let x=(cx+rand())*size,y=(cy+rand())*size;
      for(let j=0;j<6;j++){
        const u=x+(rand()-.5)*22,v=y+(rand()-.5)*12,radius=.6+rand()*1.6;
        shoreEllipse(g,u+.6,v+.7,radius*1.3,radius,'#6d838b55');
        shoreEllipse(g,u,v,radius,radius*.74,'#e0e7e5a1');
      }
      const angle=rand()*Math.PI*2;
      for(let j=0;j<5;j++){
        const a=angle+(rand()-.5)*.9,len=7+rand()*12,xx=x+Math.cos(a)*len,yy=y+Math.sin(a)*len;
        beam(g,x+.45,y+.6,xx+.45,yy+.6,.9,'#566e803b');
        beam(g,x,y,xx,yy,.7,'#e4efed8a');x=xx;y=yy;
      }
    }
}
