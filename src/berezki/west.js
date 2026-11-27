// The public trail passes in front of the loading bay. Its two retracted steel
// leaves run along the wall, leaving three full tiles clear between the jambs.
const westStore={name:'Западный склад',kind:'warehouse',n:1,x:151,y:180,w:13,h:7,
  doors:[[5,6],[6,6],[7,6]]};
const lookout={x:79*T,y:121*T,half:40,run:92,width:45,rise:105};
function makeWesternSites(){
  const r=westStore;
  house(r.x,r.y,r.w,r.h,r.doors,CO,0,'slate');
  const h=HOUSES.at(-1);h.loadingBay=true;buildEntrances(h);district.levels.push(r);
  for(const [k,x,y,a] of [['rack',2.2,1.8,0],['rack',5.3,1.8,0],['rack',9.1,1.8,0],
    ['pallet',2.3,4.6,0],['sack',3.75,4.85,0],['desk',10.8,3.15,1],['cabinet',10.9,5,0]]){
    const o=putFurniture(k,(r.x+x)*T,(r.y+y)*T,a*Math.PI/2,'west-store');
    if(k==='cabinet')o.loot={bandage:1,candle:1};
  }
  const {x,y,half,run,width}=lookout;
  // Braced bays are impassable below the platform. The timber stringers
  // prevent side entry onto the flight, and share its exact physical edges.
  interiorObject('lookoutFrame',x,y,2*half,2*half,{belowLookout:true});
  for(const sign of [-1,1])interiorObject('lookoutRail',x+sign*width/2,y+half+run/2,4,run,{belowLookout:true});
  raisedScenery.push({westDeck:true,x,y,depth:y+half+run-1});
}
function walkLookout(e,oldY){
  const t=lookout,edge=t.y+t.half,foot=edge+t.run;
  if(!S.flags.onLookout){
    if(oldY<foot || e.y>=foot || Math.abs(e.x-t.x)>t.width/2-e.r-2)return;
    S.flags.onLookout=true;
  }
  if(e.y>=foot){delete S.flags.onLookout;return;}
  const onFlight=e.y>=edge-e.r || oldY>=edge && e.y<edge;
  if(oldY<edge-e.r && Math.abs(e.x-t.x)>t.width/2-e.r-2 && e.y>=edge-e.r){
    e.y=edge-e.r-.01;
  }
  const half=(onFlight && e.y>=edge-e.r?t.width/2-2:t.half-3)-e.r;
  e.x=clamp(e.x,t.x-half,t.x+half);
  e.y=Math.max(e.y,t.y-t.half+e.r+3);
}
// The same optical centre as liftContainer. A tall structure shows more
// parallax than the box; keep the vertical elevation independent of that lean.
function lookoutProjection(height,mapView){
  const t=lookout,k=perspective && !mapView ? .00032*height : 0;
  const [x,y]=roofPoint(t.x,t.y,k);
  return [clamp(x-t.x,-height*.078,height*.078),clamp(y-t.y,-height*.055,height*.055)-height*.52];
}
function lookoutOffset(y,mapView=false){
  const t=lookout;
  return lookoutProjection(t.rise*clamp((t.y+t.half+t.run-y)/t.run,0,1),mapView);
}

// Crop real weathered boards from the same timber artwork as the village.
// Cut edges and frost are baked once per board, so moving the camera never
// changes the grain, the nail heads or the patches of compacted snow.
const lookoutBoards=new Map();
function lookoutBoard(seed,exposed){
  const variant=Math.abs(seed)%24,key=variant+(exposed?24:0);
  if(lookoutBoards.has(key))return lookoutBoards.get(key);
  const c=winterCanvas(192,25),b=c.getContext('2d'),rng=mulberry32(271+variant*199);
  const s=ART.m.sprites.c1_roof_plank,[sx,sy,sw,sh]=s.rect;
  const u=.31+.64*rng(),v=variant%3===0?.54:.016,strip=.021+rng()*.014;
  const edge=new Path2D();edge.moveTo(0,1);
  for(let x=0;x<=192;x+=6)edge.lineTo(x,.7+rng()*1.65);
  for(let x=192;x>=0;x-=6)edge.lineTo(x,24.8-rng()*1.7);
  edge.closePath();b.clip(edge);
  b.save();b.translate(0,25);b.rotate(-Math.PI/2);
  b.drawImage(ART.images[s.atlas],sx+u*sw,sy+v*sh,sw*strip,sh*.435,0,0,25,192);b.restore();
  const shade=b.createLinearGradient(0,0,0,25);
  shade.addColorStop(0,'#ece6d440');shade.addColorStop(.35,'#72655208');shade.addColorStop(.82,'#39352820');shade.addColorStop(1,'#352e2694');
  b.fillStyle=shade;b.fillRect(0,0,192,25);
  if(exposed){
    b.globalAlpha=.6;b.drawImage(district.snowStamp,rng()*125-28,-8-rng()*5,86+rng()*67,20+rng()*10);
    b.globalAlpha=.34;b.drawImage(district.snowStamp,139+rng()*20,1,63,11);b.globalAlpha=1;
  }
  const split=rng()*100,y=5+rng()*14;
  beam(b,split,y,split+24,y+.5,1,'#423a2c70');
  for(const x of [6+rng()*3,181+rng()*4]){
    shoreEllipse(b,x,y+1.2,1.8,1.45,'#927966ae');
    shoreEllipse(b,x,y,1.25,1.4,'#453f36da');
  }
  lookoutBoards.set(key,c);return c;
}
function paintLookout(g,mapView,front=false){
  const t=lookout,h=t.half,d=t.width/2,end=h+t.run;
  const [ux,uy]=lookoutProjection(1,mapView);
  const joint=(x,y,z)=>[x+ux*z,y+uy*z];
  function timber(a,b,w,exposed,seed){
    const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    g.save();g.translate(...a);g.rotate(Math.atan2(dy,dx));
    g.drawImage(lookoutBoard(seed,exposed),0,-w/2,len,w);g.restore();
  }
  const rail=(x1,y1,x2,y2,z1,z2,w,ice=false)=>{
    const seed=Math.round(x1*7+y1*13+x2*19+y2*17+z1*5+z2*3);
    timber(joint(x1,y1,z1),joint(x2,y2,z2),w,ice,seed);
  };
  const height=t.rise;
  g.save();g.translate(t.x,t.y);
  if(!front){
    for(const yy of [-h,h])for(const xx of [-h,h]){
      rail(xx,yy,xx*.96,yy*.96,0,height,8.6);
      snowDrift(g,xx-1,yy+2,7,2,-.14,Math.round(xx+yy+151));
    }
    for(const xx of [-h,h]){
      rail(xx,h,xx*.96,-h*.96,5,height-6,4);
      rail(xx,-h,xx*.96,h*.96,5,height-6,4);
    }
    rail(-h,h,h*.96,h*.96,4,height-6,4);rail(h,h,-h*.96,h*.96,4,height-6,4);
    const [left,top]=joint(-h,-h,height);
    g.fillStyle='#49453b';g.fillRect(left,top,2*h,2*h);
    for(let i=0;i<8;i++){
      g.drawImage(lookoutBoard(17+i,true),left,top+i*10-.35,2*h,10.6);
    }
    // A half-height windbreak shelters the back of this open observation stand.
    for(let j=0;j<4;j++)rail(-h,-h,h,-h,height+3+j*5,height+3+j*5,4.8,j===3);
    g.save();g.beginPath();g.rect(left,top,2*h,2*h);g.clip();
    g.globalAlpha=.72;g.drawImage(district.snowStamp,left-16,top-17,83,44);
    g.globalAlpha=.48;g.drawImage(district.snowStamp,left+46,top-7,57,28);
    g.restore();
    rail(-h,-h,h,-h,height+23,height+23,4,true);
    for(const x of [-h,0,h])rail(x,-h,x,-h,height,height+24,4);
    for(const x of [-h,h])rail(x,-h,x,h,height+23,height+23,4,true);
    for(let i=12;i>=1;i--){
      const f=i/12,yy=end-f*t.run;
      const rear=joint(-d,yy,height*f),nose=joint(-d,yy+t.run/12,height*f);
      const stepDepth=nose[1]-rear[1];
      const lower=joint(-d,yy+t.run/12,height*(i-1)/12);
      g.drawImage(lookoutBoard(i+9,false),nose[0],nose[1]-.4,2*d,lower[1]-nose[1]+.9);
      g.fillStyle='#38352e72';g.fillRect(nose[0],nose[1],2*d,lower[1]-nose[1]);
      g.drawImage(lookoutBoard(i,true),rear[0]-.4,rear[1]-.4,2*d+.8,stepDepth+1);
    }
    for(const x of [-d,d])rail(x,end,x,h,0,height,4);
  }else{
    for(const side of [-1,1]){
      rail(side*h,h,side*h,h,height,height+24,4);
      rail(side*d,h,side*d,h,height,height+24,4);
      rail(side*h,h,side*d,h,height+23,height+23,4,true);
      for(const f of [0,.5])rail(side*d,end-t.run*f,side*d,end-t.run*f,height*f,height*f+22,3.2);
      rail(side*d,end,side*d,h,22,height+23,3.4,true);
    }
  }
  g.restore();
}
function westGround(g){
  const t=lookout;
  const landing=t.y+t.half+t.run;
  for(const side of [-1,1])snowDrift(g,t.x+side*(t.width/2+3),landing+1,10,3,-.12,83+side);
  for(const x of [-t.half,t.half])for(const y of [-t.half,t.half]){
    const ox=t.x+x,oy=t.y+y;
    g.save();g.translate(ox+2,oy+1);g.scale(1,.46);
    const contact=g.createRadialGradient(0,0,1,0,0,11);
    contact.addColorStop(0,'#3d433e8c');contact.addColorStop(.53,'#55605d42');contact.addColorStop(1,'#66716b00');
    g.fillStyle=contact;g.fillRect(-11,-11,22,22);g.restore();
    snowDrift(g,ox-3,oy+2,12,4,-.22,Math.round(192+x+y));
  }
  if(!SHADOWS)return;
  // Bake a soft deck shadow, with slit light and slender diagonal stringers,
  // in ground space. Snow texture stays visible through it.
  const c=winterCanvas(200,229),b=c.getContext('2d');
  b.translate(68,68);b.filter='blur(3px)';
  b.fillStyle='#4453633d';
  for(let v=-t.half;v<t.half;v+=10)b.fillRect(26-t.half,16+v,t.half*2,8.7);
  for(const x of [-t.half,t.half])for(const y of [-t.half,t.half])
    beam(b,x,y,x+26,y+16,4,'#49566850');
  for(const side of [-1,1])beam(b,side*t.width/2,t.half+t.run,side*t.width/2+26,t.half+16,3,'#4856654a');
  g.drawImage(c,t.x-68,t.y-68);
}
