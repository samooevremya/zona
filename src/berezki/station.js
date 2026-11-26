// The station doors are the only cut in the railway boundary. The footbridge
// has its own walking surface above the continuous northern fence and rails.
const stationX=296,stationY=202;
const stationRoom={x:stationX+22,y:stationY+26,w:13,h:6,n:1};
const footbridge={x:(stationX+39)*T,width:1.8*T,north:(stationY+17.6)*T,south:(stationY+24.5)*T};
const platform={x:(stationX+16)*T,y:(stationY+23.5)*T,w:26*T,h:2.5*T};
const northFence=(stationY+19.95)*T,southFence=(stationY+26.05)*T;
let stationHouse;
const trackFences=[];

function makeWinterStation(){
  const r=stationRoom;
  house(r.x,r.y,r.w,r.h,[[6,0],[7,0],[6,5],[7,5]],CO,0,'slate');
  stationHouse=HOUSES[HOUSES.length-1];buildEntrances(stationHouse);
  district.levels.push(r);
  for(const [key,x,y,angle] of [['bench',25,28,0],['bench',32.5,28,0],['desk',24,30.2,0],['stove',33.1,29.95,0]]){
    putFurniture(key,(stationX+x)*T,(stationY+y)*T,angle,'winter-station');
  }
  district.heaters.push(tilePoint(stationX+33.1,stationY+29.95));
  function fence(x,end,y,underDeck=false){
    trackFences.push(addObj({k:'fence',material:'stationMesh',solid:1,underDeck,x,y:y-3,w:end-x,h:6}));
  }
  fence(0,district.width*T,northFence,true);
  fence(0,r.x*T,southFence);fence((r.x+r.w)*T,district.width*T,southFence);
  for(const x of [20,41])putFurniture('bench',(stationX+x)*T,(stationY+25.05)*T,0,'station-platform');
  const b=footbridge;
  // The stair stringers block side entry at ground level. The open span
  // between them leaves both tracks walkable underneath.
  for(const [y,length] of [[b.north,1.65*T],[b.south-1.0*T,1.0*T]]){
    for(const x of [b.x-b.width/2,b.x+b.width/2])addObj({k:'stairRail',x:x-2,y,w:4,h:length,solid:1,underDeck:true});
    const back=y===b.north?y+length:y;
    addObj({k:'stairBack',x:b.x-b.width/2,y:back-2,w:b.width,h:4,solid:1,underDeck:true});
  }
}
function moveOnStationBridge(e,oldY){
  if(e!==P)return;
  const b=footbridge,inside=Math.abs(e.x-b.x)<=b.width/2-e.r;
  if(!S.flags.stationDeck && inside){
    if(oldY>=b.south && e.y<b.south || oldY<=b.north && e.y>b.north)S.flags.stationDeck=true;
  }
  if(S.flags.stationDeck){
    if(e.y<=b.north || e.y>=b.south){delete S.flags.stationDeck;return;}
    e.x=clamp(e.x,b.x-b.width/2+e.r+2,b.x+b.width/2-e.r-2);
  }
}
function stationPlace(){
  const r=winterFloor(P.x,P.y);
  if(r===stationRoom)return 'Вокзал · Сотый километр';
  if(S.flags.stationDeck)return 'Пешеходный мост';
  if(P.x<district.width*T && P.y>=northFence && P.y<southFence){
    if(P.x<3*T)return 'Западный перегон · путь пока закрыт';
    return P.x>=platform.x && P.x<platform.x+platform.w && P.y>=platform.y?'Перрон':'Железная дорога';
  }
  return '';
}
function upgradeStationSave(d){
  if(d.flags.stationLayout)return;
  // Insert the station strip between the two original neighbourhoods. Upper
  // floors have separate world space and retain their original coordinates.
  function moved(x,y){return x<58*T && (y>=19*T || x<37*T);}
  for(const e of [d,...(d.dyn?.npcs||[]),...(d.flags.fieldBodies||[])]){
    if(moved(e.x,e.y))e.y+=29*T;
  }
  const key='cupboard_'+Math.round(36.8*T)+'_';
  for(const prefix of ['contents_','st_']){
    const old=prefix+key+28*T;
    if(old in d.flags){d.flags[prefix+key+57*T]=d.flags[old];delete d.flags[old];}
  }
  if(d.fog){
    const packed=new Uint8Array(Math.ceil(160*82/6));
    for(let i=0;i<160*82;i++)if((d.fog.charCodeAt(Math.floor(i/6))-48)&(1<<(i%6))){
      const x=i%160,y=Math.floor(i/160);
      const j=i+(y<52 && moved(x*T,y*T)?29*160:0);
      packed[Math.floor(j/6)]|=1<<(j%6);
    }
    d.fog=Array.from(packed,n=>String.fromCharCode(48+n)).join('');
  }
  d.flags.stationLayout=1;
}
function stationInterior(r){
  const c=winterCanvas(r.w*T,r.h*T),g=c.getContext('2d');
  const x=r.x*T,y=r.y*T,w=c.width,h=c.height;
  g.translate(-x,-y);artFill(g,'floor_concrete',x,y,w,h);
  for(let j=0;j<r.h;j++)for(let i=0;i<r.w;i++){
    const xx=x+i*T,yy=y+j*T;
    if(tAt(r.x+i,r.y+j)===CO){artFill(g,'wall_brick',xx,yy,T,T);g.fillStyle='#524d4290';g.fillRect(xx,yy,T,T);}
    else{beam(g,xx,yy,xx+T,yy,.85,'#686559');beam(g,xx,yy,xx,yy+T,.85,'#686559');}
  }
  return c;
}
function stationRoof(){
  const h=stationHouse,w=h.w*T+10,d=h.h*T+10;
  h.residenceWalls=[0,1,2,3].map(s=>wallTexture(h,s,(s%2?h.h:h.w)*T,false,'station'));
  const front=h.residenceWalls[2].getContext('2d');
  front.save();front.translate(7*T,19);front.scale(1.4,1.4);stationSign(front,0,0,'СОТЫЙ КИЛОМЕТР');front.restore();
  h.storeys=1;h.rooftop=[];
  const c=winterCanvas(w,d),g=c.getContext('2d');
  g.drawImage(balancedGable('c1_roof_slate'),0,0,w,d);
  const snow=g.createPattern(snowMaterial(),'repeat');snow.setTransform(new DOMMatrix().scale(.5));
  g.globalAlpha=.59;g.fillStyle=snow;g.fillRect(2,2,w-5,d-6);g.globalAlpha=1;
  g.fillStyle='#41506530';g.fillRect(2,d/2,w-5,d/2-4);
  beam(g,3,d/2,w-3,d/2,3,'#d1d5cf');
  // A cross-gable over the central entrance breaks up the long roofline.
  const cx=7*T;
  for(const s of [-1,1]){
    g.save();g.beginPath();g.moveTo(cx,d*.38);g.lineTo(cx+s*48,d*.73);g.lineTo(cx+s*48,d-3);g.lineTo(cx,d-3);g.closePath();g.clip();
    g.translate(cx,d*.7);g.rotate(Math.PI/2);g.drawImage(balancedGable('c1_roof_slate'),-d*.36,-49,d*.72,98);
    g.globalAlpha=.42;g.fillStyle=snow;g.fillRect(-d*.36,-49,d*.72,98);g.restore();
  }
  return c;
}
function stationSign(g,x,y,label){
  if(label!=='ВОКЗАЛ'){
    beam(g,x,y+3,x,y-17,3.5,'#655846');shoreEllipse(g,x,y+3,4,1.7,'#aeb9be',.1);
    y-=12;
  }
  g.font='bold 8px Arial';g.textAlign='center';
  const w=g.measureText(label).width+9;
  g.fillStyle='#453e34';g.fillRect(x-w/2-1,y-9,w+2,13);
  g.fillStyle='#344744';g.fillRect(x-w/2,y-8,w,10);
  g.fillStyle='#eee3c7';g.fillText(label,x,y);
}
function paintStationGround(g,left,right){
  g.save();
  const start=Math.max(0,Math.floor(left/T)),end=Math.min(district.width,Math.ceil(right/T));
  for(const line of [21.05,22.65]){
    const y=(stationY+line)*T;
    for(let i=start;i<end;i++)g.drawImage(district.sleeperBed,(i%16)*T,0,T,38,i*T,y-19,T,38);
    if(end===district.width){
      const x=(district.width-1.05)*T;
      for(const dy of [-8,8])beam(g,x-19,y+dy,x,y+dy,3,'#575046');
      beam(g,x-4,y-14,x-4,y+14,5,'#59433b');
    }
  }
  const p=platform;
  g.fillStyle='#55554c';g.fillRect(p.x,p.y-3,p.w,p.h+4);
  artFill(g,'floor_concrete',p.x,p.y,p.w,p.h);
  for(let x=p.x;x<p.x+p.w;x+=32){
    beam(g,x,p.y,x,p.y+p.h,1,'#64645a');beam(g,x,p.y+4,x+27,p.y+4,2,'#d2c8aa');
  }
  for(const f of trackFences)paintFenceFooting(g,f,left,right);
  const doorX=(stationX+29)*T;
  artFill(g,'floor_concrete',doorX-35,(stationY+32)*T,70,18);
  for(const i of [4,10,16])beam(g,doorX-35,(stationY+32)*T+i,doorX+35,(stationY+32)*T+i,1.2,'#68695f');

  stationSign(g,(stationX+36.8)*T,(stationY+25.6)*T,'К ОЗЕРУ →');
  stationSign(g,2.8*T,(stationY+24.6)*T,'← ПЕРЕГОН ЗАКРЫТ');
  const b=footbridge;
  g.fillStyle='rgba(42,49,53,.23)';g.beginPath();
  for(const side of [-1,1]){
    const x=b.x+side*b.width/2,ys=[b.north,b.north+2.3*T,b.south-2.3*T,b.south];
    if(side>0)ys.reverse();
    for(const yy of ys){
      const lift=yy===b.south || yy===b.north?2:25;
      g.lineTo(x+lift*.7,yy+lift*.6);
    }
  }
  g.closePath();g.fill();
  for(const y of [b.north+1.8*T,b.south-1.4*T])for(const s of [-1,1]){
    const x=b.x+s*(b.width/2+2);artFill(g,'floor_concrete',x-5,y-6,10,13);
  }
  g.restore();
}
function paintStationBridge(g){
  const b=footbridge,x=b.x-b.width/2,y=b.north,w=b.width,h=b.south-y;
  g.save();
  artFill(g,'floor_wood',x,y,w,h);
  const rand=mulberry32(7164);
  for(let v=0;v<h;v+=7){
    const stair=v<2.5*T || h-v<2.5*T;
    if(!stair){
      if(v%21===0)beam(g,x,y+v,x+w,y+v,1.1,'#534b3e');
      continue;
    }
    beam(g,x,y+v,x+w,y+v,2.3,'#504c42');
    beam(g,x+1,y+v+2,x+w-1,y+v+2,1.6,'#bcb8a5');
    const len=2+rand()*14;
    beam(g,x+2,y+v+4,x+len,y+v+4,2.1,'#c3c9c6');
  }
  // Upright and diagonal steelwork is visible below the raised central span.
  for(const side of [-1,1]){
    const xx=side<0?x:x+w;
    for(let v=2.35*T;v<h-2.35*T;v+=19){
      const end=Math.min(v+19,h-2.35*T);
      beam(g,xx,y+v,xx+5,y+v+7,2.2,'#534f45');
      beam(g,xx+5,y+v+7,xx,y+end,1.7,'#8b8170');
    }
  }
  for(const xx of [x,x+w]){
    beam(g,xx,y,xx,y+h,4,'#524b3f');

  }
  g.restore();
}

// The deck is cached; the guard rails above it lean with the same projection
// as the station mesh. Draw the posts from their actual attachment to the deck.
function paintBridgeRails(g,mapView=false){
  const b=footbridge,span=b.south-b.north,count=Math.ceil(span/24);
  for(const sign of [-1,1]){
    const x=b.x+sign*b.width/2;
    let previous=null;
    for(let i=0;i<=count;i++){
      const y=b.north+span*i/count,[dx,dy]=raisedOffset(x,y,22,mapView);
      const top=[x+dx,y+dy];
      beam(g,x,y,...top,2.7,'#62594d');
      if(previous){
        beam(g,...previous,...top,2.6,'#766e60');
        beam(g,previous[0],previous[1]-.6,top[0],top[1]-.6,.95,'#c9cbc2');
      }
      previous=top;
    }
  }
}
