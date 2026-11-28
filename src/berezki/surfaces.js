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
  const inside=cx>=0 && cy>=0 && cx*snowCell<district.width*T && cy*snowCell<district.height*T;
  const key=inside?cy*256+cx:cx+','+cy;
  if(forestBanks.has(key))return forestBanks.get(key);
  let bank=null;
  const rand=mulberry32(Math.floor(hash2(cx+39,cy)*4294967296));
  const left=cx*snowCell,top=cy*snowCell;
  for(let n=0;n<10;n++){
    const tx=Math.floor((left+rand()*snowCell)/T),ty=Math.floor((top+rand()*snowCell)/T);
    if(!outdoorTreeAt(tx,ty))continue;
    const x=(tx+.5)*T+20+rand()*22,y=(ty+.5)*T+10+rand()*16;
    const rx=48+rand()*49,ry=16+rand()*24,margin=rx/T+1;
    if(ty>169 && ty<191 || basinRadius(tx,ty,lakeShape)<1.06 || basinRadius(tx,ty,marshShape)<1.15 ||
        inMarshChannel(tx,ty) || nearWinterRoute(x,y,rx) ||
        district.levels.some(r=>tx>=r.x-margin && tx<=r.x+r.w+margin && ty>=r.y-margin && ty<=r.y+r.h+margin))break;
    const angle=-.42+rand()*.48;
    bank={x,y,rx,ry,angle,c:Math.cos(angle),s:Math.sin(angle),variant:Math.floor(rand()*5),depth:.68+.32*rand()};
    break;
  }
  forestBanks.set(key,bank);return bank;
}
// Index the cleared ground by terrain chunk. Sampling a footstep only visits
// the nearby shoulders, yards and walls, including the rounded ends of lanes.
const packedGround=new Map();
function indexPackedGround(){
  const fade=96;
  function add(shape,l,t,r,b){
    for(let j=Math.floor((t-fade)/atlasChunk);j<=Math.floor((b+fade)/atlasChunk);j++)
      for(let i=Math.floor((l-fade)/atlasChunk);i<=Math.floor((r+fade)/atlasChunk);i++){
        const key=j*256+i;
        if(!packedGround.has(key))packedGround.set(key,[]);
        packedGround.get(key).push(shape);
      }
  }
  function yard(x,y,w,h){
    const l=x*T,t=y*T,r=l+w*T,b=t+h*T;
    add({l,t,r,b},l,t,r,b);
  }
  for(const [i,route] of atlasRoutes.entries()){
    const radius=roadWidth(route,i)*.55;
    for(let j=1;j<route.length;j++){
      const [a,b]=route[j-1],[c,d]=route[j],x=a*T,y=b*T,dx=(c-a)*T,dy=(d-b)*T;
      add({x,y,dx,dy,len2:dx*dx+dy*dy,radius},Math.min(x,c*T)-radius,Math.min(y,d*T)-radius,Math.max(x,c*T)+radius,Math.max(y,d*T)+radius);
    }
  }
  for(const r of district.levels)if(r.n===1)yard(r.x-.7,r.y-.7,r.w+1.4,r.h+1.4);
  // Maintained courtyards and the railway right of way have compacted snow.
  yard(0,stationY+17,district.width,10);yard(239,456,43,30);
  yard(406.5,285,23,17);yard(381,100,27,14);
  yard(156,344,12,6);yard(lookout.x/T-1.5,lookout.y/T-1.5,3,6);
}
function forestCover(x,y){
  if(x<0 || y<0 || x>=district.width*T || y>=district.height*T)return 0;
  const tx=x/T,ty=y/T;
  const lake=basinRadius(tx,ty,lakeShape),marsh=basinRadius(tx,ty,marshShape);
  if(lake<=1 || marsh<=1 || inMarshChannel(tx,ty))return 0;
  let gap=Math.min(96,(lake-1)*lakeShape[3]*T,(marsh-1)*marshShape[3]*T);
  if(ty>=296 && ty<353 && tx>113 && tx<173){
    const [l,r]=channelBanks(ty);gap=Math.min(gap,Math.max(l-tx,tx-r)*T);
  }
  const shapes=packedGround.get(Math.floor(y/atlasChunk)*256+Math.floor(x/atlasChunk));
  if(shapes)for(const s of shapes){
    if(s.radius!==undefined){
      const u=x-s.x,v=y-s.y,f=clamp((u*s.dx+v*s.dy)/(s.len2||1),0,1);
      gap=Math.min(gap,Math.hypot(u-f*s.dx,v-f*s.dy)-s.radius);
    }else gap=Math.min(gap,Math.hypot(Math.max(s.l-x,0,x-s.r),Math.max(s.t-y,0,y-s.b)));
    if(gap<=0)return 0;
  }
  const footWidth=72+26*vnoise(x+317,y-79,67);
  const t=clamp(gap/footWidth,0,1);return t*t*(3-2*t);
}
function forestDepth(x,y){
  const cover=forestCover(x,y);if(!cover)return 0;
  // Wind forms long ridges interrupted by smaller scoured hollows.
  const bend=55*vnoise(x+51,y,144);
  const wind=vnoise(x*.45+y*.15,y+x*.26+bend,52);
  const crust=vnoise(x*.72,y+x*.19,21);
  // A blunt crest and a broad lee face break up large stretches of powder.
  const shoulder=(wind-.47)*4.3;
  const ridge=Math.exp(-shoulder*shoulder*3.4);
  return cover*(.76+.12*wind+.095*ridge+.025*crust);
}
function forestRelief(g,l,t){
  const step=10,n=Math.ceil(atlasChunk/step)+3,c=winterCanvas(n,n),b=c.getContext('2d');
  const img=b.createImageData(n,n),z=new Float32Array((n+2)*(n+2));
  // Anchor samples to world space and draw a one-sample apron across chunk seams.
  const ox=Math.floor(l/step)*step-step,oy=Math.floor(t/step)*step-step;
  for(let j=-1;j<=n;j++)for(let i=-1;i<=n;i++)
    z[(j+1)*(n+2)+i+1]=forestDepth(ox+i*step,oy+j*step);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const k=(j+1)*(n+2)+i+1;
    const grade=(z[k+1]-z[k-1])*.38+(z[k+n+2]-z[k-n-2])*.9;
    const shade=clamp(grade*(z[k]>.72?5.3:3.5),-.40,.42),p=(j*n+i)*4;
    img.data[p]=shade>0?250:75;img.data[p+1]=shade>0?248:93;img.data[p+2]=shade>0?240:111;
    img.data[p+3]=Math.abs(shade)*255;
  }
  b.putImageData(img,0,0);g.drawImage(c,ox-step/2,oy-step/2,n*step,n*step);
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
  forestRelief(g,l,t);
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
  // Wind fills the gaps between the ties first. Vary cover along each length
  // but retain the dark inner edge of each steel head for navigation at night.
  for(let i=0;i<250;i++){
    const x=rand()*w,y=rand()*h;
    const cover=.35+.65*(.5+.5*Math.sin(x/49+Math.sin(x/31)));
    g.save();g.globalAlpha=.22+.53*cover;
    g.drawImage(district.snowStamp,x-16,y-4,32+rand()*21,7+rand()*5);g.restore();
  }
  for(const y of [10,27]){
    const rail=g.createLinearGradient(0,y-1.5,0,y+2.6);
    for(const [at,color] of [[0,'#c3c2b3'],[.27,'#acaba1'],[.5,'#77766e'],[.78,'#665850'],[1,'#444640']])rail.addColorStop(at,color);
    g.fillStyle=rail;g.fillRect(0,y-1.5,w,4.1);
    for(let x=-9;x<w;){
      const len=7+rand()*38;
      beam(g,x,y-.7,x+len,y-.7,1.8,'#d9dedd');
      x+=len+4+rand()*20;
    }
  }
  g.globalCompositeOperation='destination-in';const edge=g.createLinearGradient(0,0,0,h);
  for(const [at,a] of [[0,0],[.16,1],[.84,1],[1,0]])edge.addColorStop(at,'rgba(0,0,0,'+a+')');
  g.fillStyle=edge;g.fillRect(0,0,w,h);return c;
}

// Vary the width of the packed shoulders and the lateral position of wheel ruts.
// These paths are built once. Their coordinates continue across terrain chunks.
function roadWidth(route,index){return index===0?108:index===1?72:route===woodpileTrack?29:44;}
function winterRoadBed(route,index){
  const width=roadWidth(route,index),samples=[];
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
  if(route===woodpileTrack)for(const p of samples)p.w*=clamp((distance-p.s)/29,.12,1);
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

function powderFootwell(g,e,depth){
  const x=e.x,y=e.y+4,rx=8+6*depth,ry=6+3*depth;
  g.save();g.translate(x,y);g.scale(rx,ry);
  const hollow=g.createRadialGradient(0,-.15,.12,0,0,1.28);
  hollow.addColorStop(0,'rgba(59,74,88,'+(.50*depth)+')');
  hollow.addColorStop(.72,'rgba(99,119,136,'+(.32*depth)+')');hollow.addColorStop(1,'transparent');
  g.fillStyle=hollow;g.fillRect(-1.3,-1.3,2.6,2.6);g.restore();
}

// Bake a handful of wind-scoured profiles from the winter ground scan. The
// granular edge is partially transparent, so the original boards and joints
// remain visible where the snow thins.
const interiorSnowArt=[];
function interiorDrift(g,x,y,rx,ry,angle,variant){
  const id=Math.abs(Math.floor(variant))%8;
  if(!interiorSnowArt[id]){
    const w=176,h=104,c=winterCanvas(w,h),b=c.getContext('2d');
    b.fillStyle=district.surface.powder;b.translate(-id*19,-id*13);
    b.fillRect(id*19,id*13,w,h);b.resetTransform();
    const img=b.getImageData(0,0,w,h),z=new Float32Array((w+2)*(h+2));
    for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){
      const u=(i-w*.5)/(w*.46),v=(j-h*.5)/(h*.42);
      const grain=vnoise(i+id*217,j+id*83,7)-.5;
      const warp=.26*(vnoise(i+id*49,j,32)-.5)+.085*Math.sin(4*u+id);
      const across=v+warp,edge=1-u*u-across*across+.19*grain;
      const crest=.54+.46*Math.exp(-8*(across+.16+warp)**2);
      z[(j+1)*(w+2)+i+1]=Math.max(0,edge)*crest;
    }
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const k=(j+1)*(w+2)+i+1,o=(j*w+i)*4,v=z[k];
      const slope=(z[k+1]-z[k-1])*.55+(z[k+w+2]-z[k-w-2]);
      const grit=hash2(i+id*83,j);
      const light=clamp(slope*560,-43,34)+(grit-.5)*6;
      img.data[o]=img.data[o]*.92+light;
      img.data[o+1]=img.data[o+1]*.94+light*.9;
      img.data[o+2]=img.data[o+2]*.94+light*.78;
      img.data[o+3]=255*clamp((v-.025+(grit-.5)*.12)*3.4,0,.98);
    }
    b.putImageData(img,0,0);interiorSnowArt[id]=c;
  }
  g.save();g.translate(x,y);g.rotate(angle);
  g.drawImage(interiorSnowArt[id],-rx,-ry,rx*2,ry*2);g.restore();
}

// The packed lip is anchored to the hollow at the actor's feet. A curved,
// granular rim lets the same ground texture show through at the coat hem.
function bootRim(e,depth){
  const path=new Path2D(),y=e.y+24-18*depth;
  path.moveTo(e.x-48,y-3);
  for(let u=-18;u<=18;u++){
    const bend=1-Math.min(1,(u/17)**2);
    const grit=vnoise(e.x+u,e.y,3)-.5;
    path.lineTo(e.x+u,y-3+5*bend+2.4*grit);
  }
  path.lineTo(e.x+48,y-3);return path;
}
function powderCrumbs(g,e,rim,depth){
  g.save();
  // Only the narrow region directly in front of the coat disturbs the surface.
  g.beginPath();g.ellipse(e.x,e.y+24-18*depth,12*depth,6,0,0,Math.PI*2);g.clip();
  g.globalAlpha=.36*depth;g.lineWidth=2.6;g.strokeStyle=district.surface.powder;g.stroke(rim);
  g.globalAlpha=.48*depth;g.lineWidth=.85;g.strokeStyle='#e1e6e8';g.stroke(rim);
  g.restore();
}
