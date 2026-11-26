// Start at the real new-game spawn. Drive the normal analog input at 60 Hz, including the bridge deck.
async () => {
  const z=window.__z;
  function walk(x,y){
    let frames=0;
    while(frames<4000){
      const dx=x*32-z.P.x,dy=y*32-z.P.y,d=Math.hypot(dx,dy);
      if(d<1.9)break;
      z.IN.moveX=dx/d;z.IN.moveY=dy/d;
      z.update(1/60);frames++;
    }
    z.IN.moveX=z.IN.moveY=0;
    if(frames===4000 || !z.P.alive)throw Error('Blocked at '+[z.P.x/32,z.P.y/32]+' toward '+[x,y]);
    return frames/60;
  }
  const yard=[[518,360],[518,362],[503,364],[483.12,365.2],[427.68,360.8],[368.72,344.08],[322.08,338.8],[326.48,282.48],[325,235]];
  const hall=[[325,231],[325,226.9],[335,226.9]];
  const bank=[[335,219],[341.44,209.44],[372.24,192.72],[404.8,185.68],[432.96,161.92],[466.4,145.2],[481,136],[491,132.8]];
  const shore=[[495.9,132.8],[496.2,126],[494.8,123.2],[491.4,122]];
  const follow=route=>route.reduce((sec,p)=>sec+walk(...p),0);
  const homeSeconds=follow(yard);follow(hall);walk(335,224.5);
  if(!z.S.flags.stationDeck)throw Error('Bridge entry');
  z.save(true,1);z.applyState(z.loadSave(1));
  if(!z.S.flags.stationDeck)throw Error('Deck changed on reload');
  const shoreSeconds=follow(bank);follow(shore);
  follow([...shore].reverse());follow([...bank].reverse());walk(335,226.9);
  if(z.S.flags.stationDeck)throw Error('Deck exit');
  follow([...hall].reverse());follow([...yard].reverse());walk(518,357);
  const road=[[325,568],[322.96,493.68],[329.12,415.36],[322.08,338.8],[326.48,282.48],[325,234]];
  // Set up a separate stopwatch at the gate, then walk the complete road without repositioning.
  Object.assign(z.P,{x:road[0][0]*32,y:road[0][1]*32});
  const seconds=road.slice(1).reduce((elapsed,point)=>elapsed+walk(...point),0);
  for(const [now,previous] of [[homeSeconds,94.8],[shoreSeconds,58.2],[seconds,103.28]]){
    if(now/previous<.85 || now/previous>.90)throw Error('Travel-time regression '+[now,previous]);
  }
  if(seconds<90 || seconds>93)throw Error('Gate to station took '+seconds);
  for(const y of [221.95,228.05]){
    for(let x=1.5;x<668;x+=.5){
      if(y>224 && x>=318 && x<=331)continue;
      for(const sign of [-1,1]){
        const e={x:x*32,y:y*32-sign*18,r:11,jumpT:.2};
        for(let n=0;n<12;n++)z.map.moveE(e,0,sign*3);
        if(sign*(e.y-y*32)>=0)throw Error('Fence leak '+[x,y]);
      }
    }
  }
  const boats=z.map.objs.filter(o=>o.k==='beachedBoat'),yardProps=z.map.objs.filter(o=>o.k==='yardFrame');
  if(boats.length!==9 || new Set(yardProps.map(o=>o.fixture)).size!==4)throw Error('Missing fixtures');
  for(const o of [...boats,...yardProps]){
    const e={x:o.x+o.w/2,y:o.y-18,r:10};
    for(let i=0;i<24;i++)z.map.moveE(e,0,3);
    if(e.y>o.y)throw Error('Fixture lost collision');
  }
  // Probe the visible seats, deck, plank and chute, not just collider edges.
  const ox=523*32,oy=368*32;
  for(const [label,x,y,rx,ry] of [
    ['left seat',-49,-5,31,26],['right seat',-10,-5,31,26],
    ['slide',64,-8,28,43],['roundabout',-94,90,51,48],['seesaw',71,96,64,22]
  ]){
    for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      const e={x:ox+x+dx*(rx+45),y:oy+y+dy*(ry+45),r:11,jumpT:.24};
      for(let i=0;i<85;i++)z.map.moveE(e,-dx*2,-dy*2);
      if((e.x-ox-x)*dx+(e.y-oy-y)*dy<11)throw Error('Crossed '+label+' from '+[dx,dy]);
    }
  }
  for(const lane of [[-157,45,139,45],[-1,45,-1,148]]){
    const [x,y,tx,ty]=lane;
    Object.assign(z.P,{x:ox+x,y:oy+y});walk((ox+tx)/32,(oy+ty)/32);
  }
  return {homeSeconds,shoreSeconds,gateToStationSeconds:+seconds.toFixed(2),roundTrip:true,bridgeReload:true,bothFences:true,boats:boats.length/3,playground:true};
}
