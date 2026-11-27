// Both the worn track in the snow and the resident's route use these landings.
const shoreX=443,shoreY=114;
const fishingTrack=[[46.9,14.4],[48,16.6],[48,18.8],[52.9,18.8],[53.2,12],[51.8,9.2],[48.4,8]].map(([x,y])=>[shoreX+x,shoreY+y]);
const iceHole=tilePoint(shoreX+48.4,shoreY+7.4);
const fishingRoom={x:shoreX+44,y:shoreY+11,w:8,h:7,n:1};
const villageCabins=[
  {x:480,y:138,w:7,h:5,n:1,doors:[[3,0],[4,0]],roof:'plank',ridge:'vertical',name:'Западная изба'},
  {x:499,y:125,w:8,h:6,n:1,doors:[[2,5],[3,5]],roof:'slate',name:'Восточная изба'}
];
const shoreFire=tilePoint(497.6,135.25);
const netRack=tilePoint(484.5,131.2);
const shoreLanes=[
  [[481,136],[484,135.9],[488.1,134.4],[491,132.8]],
  [[484,135.9],[484,138]],
  [[488.1,134.4],[492,134.9],[495.6,133.9],[499.3,133.4],[502,132.5],[502,131]],
  [[495.6,133.9],[496.1,135.6],[497.2,136.55],[499.1,135.7],[499.3,133.4]],
  [[488.1,134.4],[486.2,133],[483,133.1],[482.6,130.9],[483.1,129.3],[483.2,124.4]],
  [[483.2,124.4],[486.5,122.2],[488.9,121.6],[491.4,121.4]]
];
const shoreFences=[];
let fishingHouse,woodStack;
function makeVillageYards(){
  for(const r of villageCabins){
    house(r.x,r.y,r.w,r.h,r.doors,BR,0,r.roof);
    const h=HOUSES[HOUSES.length-1];h.cabin=r;buildEntrances(h);
    district.levels.push(r);
  }
  for(const [x,y,w,h] of [
    [478,138.85,.96,.16],[486,136.55,3,.16],[478,138.85,.16,4.2],
    [488.84,136.55,.16,2.4],
    // Leave open snow between the corner posts and the eaves, including projected height.
    [498.3,132.85,2.35,.16],[504.3,132.85,6,.16],[510.14,127.7,.16,5.31]

  ])shoreFences.push(addObj({k:'fence',material:'picket',solid:1,x:x*T,y:y*T,w:w*T,h:h*T}));
  for(const [x,y,angle] of [[497.5,137.45,0],[500.55,135.25,Math.PI/2]])
    putFurniture('bench',x*T,y*T,angle,'shore-court');
  interiorObject('netShelter',netRack.x,netRack.y-5,78,25);
  for(const side of [-1,1])interiorObject('netFoot',netRack.x+side*36,netRack.y+10,5,7);
  for(const sign of [-1,1])interiorObject('spitPost',shoreFire.x+sign*21,shoreFire.y+5,4,5);
}
function makeFishingShore(){
  makeVillageYards();
  const r=fishingRoom;
  house(r.x,r.y,r.w,r.h,[[3,6],[4,6]],BR,0,'plank');
  fishingHouse=HOUSES[HOUSES.length-1];buildEntrances(fishingHouse);
  district.levels.push(r);
  partition(shoreX+46.75,shoreY+15.7,.17,1.3,'timber');
  partition(shoreX+49.15,shoreY+15.7,.17,1.3,'timber');
  furnishShoreHomes();
  woodStack=interiorObject('woodStack',488.4*T,132.45*T,60,19);
}
function fishRoutine(e,dt){
  const last=fishingTrack.length-1;
  const round=S.flags.fishingRound||={index:0,outward:false,until:0};
  const hour=(S.min%1440)/60,day=hour>=7 && hour<18;
  if(!day && round.outward){
    round.outward=false;round.index=Math.max(0,round.index-1);round.until=0;
  }
  const [x,y]=fishingTrack[round.index];
  if(dst(e.x,e.y,x*T,y*T)>4){
    e.crouch=0;goTo(e,x*T,y*T,61,dt);return;
  }
  if(round.index===0 || round.index===last){
    const onIce=round.index===last;
    e.crouch=onIce?1:0;e.ang=onIce?-Math.PI/2:Math.atan2(shoreY+13.4-y,shoreX+46-x);
    if(!round.until)round.until=S.min+(onIce?9:4);
    if(S.min<round.until || (!onIce && !day))return;
    round.outward=!onIce;round.until=0;
  }
  round.index+=round.outward?1:-1;
}
// Stops are on walkable ground, including the landings on either side of a door.
// A stop's clock starts when the resident arrives, never while the path is blocked.
const shoreJobs={
  fisher:[
    [489.9,128.4,3,'home'],[491,130.6],[491,132.8],[488.1,134.4],[486.2,133],
    [484.55,131.85,16,'net'],[486.2,133],[488.1,134.4],[492,134.9],
    [495.6,133.9],[496.1,135.7],[497.5,136.62,7,'warm'],
    [496.1,135.7],[495.6,133.9],[492,134.9],[488.1,134.4],[491,132.8],[491,130.6]
  ],
  housekeeper:[
    [503.4,128.6,5,'home'],[502,131.45],[502.55,132.65,8,'sweep'],[501.1,133.1,7,'sweep'],
    [499.3,133.5],[499.58,135.2,5,'warm'],[499.3,133.5],[502,131.45]
  ],
  anya:[
    [482.2,140.2,2,'home'],[483.6,137.6],[483.7,135.7,2,'play'],[487.2,134.9],
    [490.8,135.65,2,'play'],[494.3,136],[496.35,136.6,3,'warm'],[490.2,136.5],[484,136.5],[483.6,137.6]
  ],
  mitya:[
    [485.5,140.75,3,'home'],[484.5,138],[484.7,136.3],[487.7,135.25,2,'play'],
    [490.1,136.1],[493.3,135.75,2,'play'],[496.25,135.15,3,'warm'],[490.8,135.65],[484.5,136.2],[484.5,138]
  ],
  shorePatrol:[
    [494.4,133.2,6,'watch'],[488.1,134.4],[483.2,135.3,4,'watch'],[482.6,130.9],
    [483.1,128.6,5,'watch'],[486.2,133],[492,134.9],[498.65,136.25,5,'warm']
  ],
  shorePost:[[481.8,134.5,4,'watch']]
};
const shoreHours={fisher:[7,18],housekeeper:[7.2,18.65],anya:[8,18.1],mitya:[8.15,18.32]};
function shoreRoutine(e,dt){
  const stops=shoreJobs[e.sid],hours=shoreHours[e.sid],minute=S.min%1440;
  const awake=!hours || minute>=hours[0]*60 && minute<hours[1]*60;
  const journal=S.flags.shoreJobs||={};
  const job=journal[e.sid]||={stop:0,until:0};
  // Keep an existing trip to the ice hole, including its waypoints in old slots.
  if(e.sid==='fisher' && (job.onIce || !job.started && S.flags.fishingRound)){
    job.started=true;job.onIce=true;e.shoreAction=null;
    fishRoutine(e,dt);
    const round=S.flags.fishingRound;
    if(round.outward || round.index>0)job.startIce=false;
    if((!job.startIce || !awake) && !round.outward && round.index===0 && dst(e.x,e.y,stops[0][0]*T,stops[0][1]*T)<5){
      job.onIce=false;job.stop=0;job.until=0;
    }
    return;
  }
  job.started=true;
  if(!awake && job.stop!==0){job.stop=0;job.until=0;}
  const [x,y,delay=0,act]=stops[job.stop];
  if(e.sid==='fisher'){
    const sheltered=winterFloor(e.x,e.y) || fireLit(shoreFire) && dE(e,shoreFire)<58;
    job.chill=clamp((job.chill||0)+dt*(sheltered?-.12:.035+darkness()*.045),0,1);
  }
  if(dst(e.x,e.y,x*T,y*T)>4){
    e.shoreAction=null;
    if(e.sit){setCampSeat(e,false);return;}
    goTo(e,x*T,y*T,e.shoreChild?91:61,dt);return;
  }
  e.path=null;e.shoreAction=act;
  if(act==='warm'){
    if(fireLit(shoreFire)){
      e.fireRef=shoreFire;
      e.ang+=angD(e.ang,Math.atan2(shoreFire.y-e.y,shoreFire.x-e.x))*Math.min(1,dt*5);
      if(e.sid==='fisher')setCampSeat(e,true);
    }else job.until=S.min;
  }else if(act==='net' || act==='sweep' || act==='watch'){
    const heading=act==='net'?-Math.PI/2:act==='sweep'?Math.PI*.65:
      -Math.PI*.6+.65*Math.sin(S.min*.27+e.id);
    e.ang+=angD(e.ang,heading)*Math.min(1,dt*4);
  }
  if(!awake){job.until=0;return;}
  if(!job.until)job.until=S.min+delay;
  if(S.min<job.until && !(act==='net' && job.chill>=.82))return;
  setCampSeat(e,false);e.shoreAction=null;job.until=0;
  job.stop=(job.stop+1)%stops.length;
  if(e.sid==='fisher' && !job.stop){
    // Arrive home first, then start the next existing fishing trip through the doorway.
    job.onIce=true;S.flags.fishingRound={index:0,outward:false,until:0};
    job.startIce=true;
  }
}

function restoreShoreFooting(actor){
  const room=winterFloor(actor.x,actor.y);
  const nearShore=actor.x>477*T && actor.x<512*T && actor.y>120*T && actor.y<146*T;
  const nearStation=actor.x>platform.x && actor.x<platform.x+platform.w && actor.y>platform.y && actor.y<platform.y+platform.h;
  const nearPump=actor.x>193*T && actor.x<213*T && actor.y>426*T && actor.y<441*T;
  if((actor===P && S.flags.stationDeck) || (!room && !nearShore && !nearStation && !nearPump && !(actor.x>303*T && actor.x<348*T && actor.y>567*T && actor.y<599*T)) || clearFooting(actor.x,actor.y,actor.r))return;
  // Slots saved on a newly occupied footprint resume at its closest free spot.
  let best=null,gap=Infinity;
  const tx=Math.floor(actor.x/T),ty=Math.floor(actor.y/T);
  for(let y=ty-5;y<=ty+5;y++)for(let x=tx-5;x<=tx+5;x++){
    const p=tilePoint(x+.5,y+.5),d=dE(actor,p);
    if(d<gap && winterFloor(p.x,p.y)===room && clearFooting(p.x,p.y,actor.r)){best=p;gap=d;}
  }
  if(best)Object.assign(actor,best);
}
function shoreEllipse(g,x,y,rx,ry,color,angle=0){
  g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,angle,0,Math.PI*2);g.fill();
}
// Weathered snow with a shallow windward lip and a softer leeward slope.
// Bake these little patches once; both the survey and play view use world pixels.
const shoreDrifts=new Map();
function snowDrift(g,x,y,rx,ry,angle,seed){
  const key=[rx,ry,seed].join(':');
  let c=shoreDrifts.get(key);
  if(!c){
    c=winterCanvas(Math.ceil(rx*2)+4,Math.ceil(ry*2)+4);
    const b=c.getContext('2d'),img=b.createImageData(c.width,c.height);
    const height=(px,py)=>{
      const u=(px-c.width/2)/rx,v=(py-c.height/2)/ry;
      const ripple=.16*(vnoise(px+seed,py,5)-.5)+.13*Math.sin(4*u+seed);
      return Math.max(0,1-u*u-(v+ripple)*(v+ripple))**1.55;
    };
    for(let j=0;j<c.height;j++)for(let i=0;i<c.width;i++){
      const h=height(i,j);if(h===0)continue;
      const grade=(height(i+1,j+1)-height(i-1,j-1))*ry;
      const light=clamp(grade*23,-44,34)+7*(hash2(i+seed,j)-.5);
      const k=4*(i+j*c.width);
      img.data[k]=196+light;img.data[k+1]=207+light;img.data[k+2]=214+light;
      img.data[k+3]=Math.round(168*Math.sqrt(h));
    }
    b.putImageData(img,0,0);shoreDrifts.set(key,c);
  }
  g.save();g.translate(x,y);g.rotate(angle);g.drawImage(c,-c.width/2,-c.height/2);g.restore();
}
function packedSnow(g,x,y,rx,ry,strength){
  g.save();g.translate(x,y);g.scale(rx,ry);
  const f=g.createRadialGradient(0,0,0,0,0,1);
  f.addColorStop(0,'rgba(94,86,72,'+strength+')');
  f.addColorStop(.56,'rgba(109,105,94,'+strength*.62+')');f.addColorStop(1,'transparent');
  g.fillStyle=f;g.fillRect(-1,-1,2,2);g.restore();
}
function workingSurface(p){
  const w=Math.ceil(p.width*1.66),h=p.key==='wood'?53:76;
  const c=winterCanvas(w,h),g=c.getContext('2d'),cy=h*.47;
  artFill(g,'dirt',0,0,w,h);
  const data=g.getImageData(0,0,w,h),a=data.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=(x-w*.50)/(w*.52),v=(y-cy)/(h*.48);
    const crust=vnoise(x+p.x,y+p.y,8),grain=hash2(x+p.x,y+p.y);
    const wear=clamp(1-u*u-v*v+.58*(crust-.54),0,1);
    const k=(y*w+x)*4,grey=a[k]*.31+a[k+1]*.58+a[k+2]*.11;
    a[k]=61+grey*.55;a[k+1]=67+grey*.52;a[k+2]=68+grey*.49;
    a[k+3]=Math.round(195*wear*wear*(.24+.76*crust)*(.62+.38*grain));
  }
  g.putImageData(data,0,0);return c;
}
function shelterGround(g,p){
  const w=p.width,wood=p.key==='wood';
  g.save();g.translate(p.x,p.y);
  const soil=p.workBed??=workingSurface(p);
  g.drawImage(soil,-soil.width/2,-soil.height*.46);
  // Dry, darker snow beneath the roof, widening at the side people work from.
  packedSnow(g,0,-5,w*.65,wood?19:31,.60);
  packedSnow(g,-w*.16,9,w*.57,wood?13:24,.30);
  const rand=mulberry32(Math.round(p.x+p.y));
  for(let i=0;i<(wood?39:21);i++){
    const x=(rand()-.52)*w*1.15,y=rand()*(wood?19:24)-2;
    if(wood){
      const len=1+rand()*3.8;
      beam(g,x,y,x+len,y+(rand()-.5)*3,1+rand(),i%4?'#6f614e9c':'#ad997ca3');
    }else{
      const a=rand()*.9;
      shoreEllipse(g,x,y,2+rand()*4,1.3,'#64727a49',a);
    }
  }
  // The rear edge traps snow; the front edge is scoured by boots and handling timber.
  g.globalAlpha=.49;
  snowDrift(g,-w*.42,-14,wood?16:22,5,-.24,14);
  snowDrift(g,w*.42,-12,wood?18:24,5,-.19,23);
  g.globalAlpha=1;
  for(const side of [-1,1]){
    packedSnow(g,side*w*.40,0,wood?6:5,3,.85);
    packedSnow(g,side*w*.35,-8,5,2.6,.62);
  }
  g.restore();
}
function drawShoreFence(g,o){
  const vertical=o.h>o.w,length=Math.max(o.w,o.h),count=Math.ceil(length/45);
  g.save();g.translate(o.x+o.w/2,o.y+o.h/2);
  if(vertical)g.rotate(Math.PI/2);
  packedSnow(g,0,1,length*.62,8,.48);

  for(let i=0;i<count;i++){
    const x=(i+.5)*length/count-length/2;
    snowDrift(g,x,4,Math.round(length/count*.56),5+(i%2),-.06,31+i%4);
  }
  for(let i=0;i<=count;i++){
    const x=length*i/count-length/2;
    snowDrift(g,x-1,4,7,3,.12,17);
  }
  g.restore();
}
function shoreGround(g){
  const rand=mulberry32(24485);
  // Broken crust follows the width of the lane and thins along its edges.
  const workTracks=[
    [[486.2,133],[485.25,132.35],[484.7,131.95]],
    [[502,132.5],[503.3,132.04],[507.8,132.04],[508.95,130.75]],
    [[483,133.1],[482.6,130.9],[483.2,128.7],[484.6,128.4]]
  ];
  for(const trail of [...shoreLanes,...workTracks]){
    for(let i=1;i<trail.length;i++){
      const [x,y]=trail[i-1],[u,v]=trail[i],angle=Math.atan2(v-y,u-x);
      const len=Math.hypot(u-x,v-y)*T,dx=Math.cos(angle),dy=Math.sin(angle);
      for(let step=0;step<len;step+=4+rand()*6){
        const offset=(rand()-.5)*32;
        const px=x*T+dx*step-dy*offset,py=y*T+dy*step+dx*offset;
        shoreEllipse(g,px,py,6+rand()*9,2+rand()*3,'#79868e28',angle+(rand()-.5)*.45);
        if(rand()<.32)shoreEllipse(g,px,py+1,3+rand()*2,1.6,'#e5e8e341',angle);
      }
    }
  }
  for(const trail of [fishingTrack.slice(2)]){
    let step=0;
    for(let i=1;i<trail.length;i++){
      const [x,y]=trail[i-1],[tx,ty]=trail[i],dx=(tx-x)*T,dy=(ty-y)*T;
      const length=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
      for(let s=0;s<length;s+=10,step++){
        const side=(step%2?3.4:-3.4)+rand()*2-1;
        const px=x*T+dx*s/length-Math.sin(a)*side,py=y*T+dy*s/length+Math.cos(a)*side;
        shoreEllipse(g,px,py+1,5.4,2.5,'rgba(243,245,239,.39)',a);
        shoreEllipse(g,px,py,5,2.2,'rgba(73,82,86,.31)',a);
      }
    }
  }
  const {x,y}=iceHole;
  shoreEllipse(g,x,y,14,11,'#c6ced0');shoreEllipse(g,x-1,y,10,7.6,'#364b53');
  shoreEllipse(g,x-1,y+1.3,9,5.2,'#263a44');
  for(let i=0;i<23;i++){
    const a=rand()*6.28;shoreEllipse(g,x+Math.cos(a)*(12+rand()*5),y+Math.sin(a)*(9+rand()*5),1+rand()*2,1,'#e5ebe9',a);
  }
  beam(g,x+12,y+11,x+5,y-1,1.7,'#775d45');
  for(const h of HOUSES)if(h===fishingHouse || villageCabins.includes(h.cabin))paintCabinThreshold(g,h);
  for(const o of shoreFences)drawShoreFence(g,o);
  for(const o of shoreFences)paintFenceFooting(g,o,-Infinity,Infinity);
  const ash=g.createRadialGradient(shoreFire.x,shoreFire.y,5,shoreFire.x,shoreFire.y,29);
  ash.addColorStop(0,'#37312b');ash.addColorStop(.5,'#6f655cb3');ash.addColorStop(1,'#908c8000');
  g.fillStyle=ash;g.fillRect(shoreFire.x-29,shoreFire.y-29,58,58);
}
function paintCabinThreshold(g,h){
  const door=h.entrances[0],cx=h.x*T+door.x,edge=h.y*T+door.y;
  const py=edge+(door.ny<0?-19:0);
  const lip=edge+door.ny*19;
  packedSnow(g,cx,lip,door.width*.65,20,.45);
  // Wind piles snow against the sill and exposed foundation but leaves the worn step clear.
  for(const side of [-1,1]){
    const post=cx+side*(door.width/2+2);
    const wallEnd=(side<0?h.x:h.x+h.w)*T;
    const span=Math.abs(wallEnd-post);
    snowDrift(g,(wallEnd+post)/2,edge+door.ny*3,Math.round(span*.53),9,0,side+51);
  }
  artFill(g,'floor_wood',cx-door.width/2-3,py,door.width+6,19);
  for(const v of [4,10,17])beam(g,cx-door.width/2-3,py+v,cx+door.width/2+3,py+v,1.4,'#746859');
  for(const side of [-1,1]){
    snowDrift(g,cx+side*door.width/2,lip,12,5,side*.22,side+12);
    snowDrift(g,cx+side*(door.width/2+3),py+8,6,10,side*.14,side+29);
  }
}
function cabinFloor(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
  winterPaving(g,'boards',0,0,c.width,c.height);
  for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)if(tAt(r.x+x,r.y+y)===BR){
    artFill(g,'floor_wood',x*T,y*T,T,T);
    g.fillStyle='#493f3480';g.fillRect(x*T,y*T,T,T);
  }
  if(!r.hamlet)paintCabinTextiles(g,shoreHomes.find(home=>home.room===r));
  return c;
}
function fishingInterior(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
  const x=r.x*T,y=r.y*T;g.translate(-x,-y);
  winterPaving(g,'boards',x,y,c.width,c.height);
  for(let v=0;v<r.h;v++)for(let u=0;u<r.w;u++){
    if(tAt(r.x+u,r.y+v)!==BR)continue;
    const left=x+u*T,top=y+v*T;
    artFill(g,'floor_wood',left,top,T,T);
    g.fillStyle='#423b2e80';g.fillRect(left,top,T,T);
    for(let i=2;i<T;i+=8)beam(g,left,top+i,left+T,top+i,1,'#352e2470');
  }
  g.save();g.translate(shoreX*T,shoreY*T);
  g.fillStyle='#695545';g.fillRect(47*T,16*T,2*T,1.4*T);
  for(let i=1;i<43;i+=5)beam(g,47*T,16*T+i,49*T,16*T+i,1.2,'#918071');
  // Folded felt over the window and a clothesline close to the stove.
  artFill(g,'floor_wood',46.8*T,12*T-7,44,10);
  g.fillStyle='#716e5f';g.fillRect(46.8*T,12*T-4,43,12);
  for(let i=2;i<42;i+=5)beam(g,46.8*T+i,12*T-4,46.8*T+i-1,12*T+8,1,'#827e6e');
  beam(g,45.5*T,12.25*T,47.3*T,12.42*T,1.1,'#695741');
  for(const ix of [46.15,46.45]){
    shoreEllipse(g,ix*T,12.47*T,3,5,'#74533a',-.17);
    shoreEllipse(g,ix*T+2.5,12.50*T,1.6,2.6,'#74533a',-.7);
  }
  g.restore();
  g.save();g.translate(x,y);paintCabinTextiles(g,shoreHomes.find(home=>home.room===r));g.restore();
  g.translate(shoreX*T,shoreY*T);
  const glow=g.createRadialGradient(46*T,13.4*T,2,46*T,13.4*T,53);
  glow.addColorStop(0,'rgba(238,146,57,.36)');glow.addColorStop(1,'transparent');
  g.fillStyle=glow;g.fillRect(46*T-53,13.4*T-53,106,106);
  beam(g,46*T-5,13.4*T+8,46*T+5,13.4*T+8,2,'#d68f52');
  return c;
}
function fishingRoof(h){
  const w=h.w*T+10,d=h.h*T+10,c=winterCanvas(w,d),g=c.getContext('2d');
  const vertical=h.cabin?.ridge==='vertical';
  const width=vertical?d:w,depth=vertical?w:d;
  g.save();
  if(vertical){g.translate(w,0);g.rotate(Math.PI/2);}
  g.drawImage(winterGable(h.mat==='slate'?'c1_roof_slate':'c1_roof_plank'),0,0,width,depth);
  const snow=g.createPattern(snowMaterial(),'repeat');snow.setTransform(new DOMMatrix().scale(.42));
  g.fillStyle=snow;g.globalAlpha=h.mat==='slate'?.49:.69;g.fillRect(2,2,width-6,depth-7);g.globalAlpha=1;
  g.fillStyle='#50617633';g.fillRect(2,depth/2,width-6,depth/2-5);
  beam(g,2,depth/2,width-4,depth/2,3,'#d5d9d6');
  for(let x=12;x<width-6;x+=17)beam(g,x,depth/2+2,x-2,depth-6,1,'#66727952');
  g.restore();
  return c;
}
