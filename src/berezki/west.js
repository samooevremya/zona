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
function lookoutOffset(y,mapView=false){
  const t=lookout,h=t.rise*clamp((t.y+t.half+t.run-y)/t.run,0,1);
  return raisedOffset(t.x,t.y,h,mapView);
}
// Project every joint from its world footing. Drawing the timber grain in
// the beam's own coordinates keeps even the diagonals continuous as the camera pans.
function paintLookout(g,mapView,front=false){
  const t=lookout,h=t.half,d=t.width/2,end=h+t.run;
  const joint=(x,y,z)=>{
    const [dx,dy]=raisedOffset(t.x,t.y,z,mapView);
    return [x+dx,y+dy];
  };
  function timber(a,b,w,frost=false){
    const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    g.save();g.translate(...a);g.rotate(Math.atan2(dy,dx));artFill(g,'floor_wood',0,-w/2,len,w);
    g.fillStyle='#51412e45';g.fillRect(0,-w/2,len,w);
    beam(g,0,w/2,len,w/2,1.5,'#383733');beam(g,0,-w/2,len,-w/2,frost?2:1,frost?'#cfd1c9':'#a09a88');
    g.restore();
  }
  const rail=(x1,y1,x2,y2,z1,z2,w,ice=false)=>timber(joint(x1,y1,z1),joint(x2,y2,z2),w,ice);
  const height=t.rise;
  g.save();g.translate(t.x,t.y);
  if(!front){
    for(const yy of [-h,h])for(const xx of [-h,h]){
      shoreEllipse(g,xx+2,yy+2,9,4,'#5c615d77');
      rail(xx,yy,xx*.9,yy*.9,0,height,8);
      snowDrift(g,xx-1,yy+2,7,2,-.14,Math.round(xx+yy+151));
    }
    for(const xx of [-h,h]){
      rail(xx,h,xx*.9,-h*.9,5,height-6,4);
      rail(xx,-h,xx*.9,h*.9,5,height-6,4);
    }
    rail(-h,h,h*.9,h*.9,4,height-6,4);rail(h,h,-h*.9,h*.9,4,height-6,4);
    const [left,top]=joint(-h,-h,height);
    artFill(g,'floor_wood',left,top,2*h,2*h);
    for(let i=0;i<2*h;i+=10){
      beam(g,left,top+i,left+2*h,top+i,1.3,'#48443b');
      beam(g,left+3,top+i+1,left+2*h-1,top+i+1,.7,'#cecfc2');
      for(const k of [4,2*h-4]){g.fillStyle='#504d44';g.fillRect(left+k,top+i+4,1.3,1.3);}
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
    for(let i=1;i<=12;i++){
      const f=i/12,yy=end-f*t.run;
      const rear=joint(-d,yy,height*f),nose=joint(-d,yy+t.run/12,height*f);
      const stepDepth=nose[1]-rear[1];
      artFill(g,'floor_wood',rear[0],rear[1],2*d,stepDepth);
      beam(g,nose[0],nose[1],nose[0]+2*d,nose[1],2,'#5d5141');
      beam(g,nose[0]+1,nose[1]-1,nose[0]+2*d-1,nose[1]-1,1.1,'#c3c5bc');
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
  if(SHADOWS){
    const x=t.x+30,y=t.y+16;
    g.fillStyle='#48566533';g.fillRect(x-t.half,y-t.half,t.half*2,t.half*2);
    for(const u of [-t.half,t.half])for(const v of [-t.half,t.half])
      beam(g,t.x+u,t.y+v,x+u,y+v,5,'#4a576338');
  }
}
