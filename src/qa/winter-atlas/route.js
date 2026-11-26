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
  const yard=[[588,409],[588,411],[573,413],[549,415],[486,410],[419,391],[366,385],[371,321],[369,266]];
  const hall=[[369,262],[369,257.9],[379,257.9]];
  const bank=[[379,250],[388,238],[423,219],[460,211],[492,184],[530,165],[548,153],[558,149.8]];
  const shore=[[562.9,149.8],[563.2,143],[561.8,140.2],[558.4,139]];
  const follow=route=>route.forEach(p=>walk(...p));
  follow(yard);follow(hall);walk(379,255.5);
  if(!z.S.flags.stationDeck)throw Error('Bridge entry');
  z.save(true,1);z.applyState(z.loadSave(1));
  if(!z.S.flags.stationDeck)throw Error('Deck changed on reload');
  follow(bank);follow(shore);
  follow([...shore].reverse());follow([...bank].reverse());walk(379,257.9);
  if(z.S.flags.stationDeck)throw Error('Deck exit');
  follow([...hall].reverse());follow([...yard].reverse());walk(588,406);
  const road=[[369,645],[367,561],[374,472],[366,385],[371,321],[369,265]];
  // Set up a separate stopwatch at the gate, then walk the complete road without repositioning.
  Object.assign(z.P,{x:road[0][0]*32,y:road[0][1]*32});
  const seconds=road.slice(1).reduce((elapsed,point)=>elapsed+walk(...point),0);
  if(seconds<90 || seconds>120)throw Error('Gate to station took '+seconds);
  for(const y of [252.95,259.05]){
    for(let x=1.5;x<759;x+=.5){
      if(y>255 && x>=362 && x<=375)continue;
      for(const sign of [-1,1]){
        const e={x:x*32,y:y*32-sign*18,r:11,jumpT:.2};
        for(let n=0;n<12;n++)z.map.moveE(e,0,sign*3);
        if(sign*(e.y-y*32)>=0)throw Error('Fence leak '+[x,y]);
      }
    }
  }
  const boats=z.map.objs.filter(o=>o.k==='beachedBoat'),yardProps=z.map.objs.filter(o=>o.k==='yardFrame');
  if(boats.length!==9 || yardProps.length!==3)throw Error('Missing fixtures');
  for(const o of [...boats,...yardProps]){
    const e={x:o.x+o.w/2,y:o.y-18,r:10};
    for(let i=0;i<24;i++)z.map.moveE(e,0,3);
    if(e.y>o.y)throw Error('Fixture lost collision');
  }
  return {gateToStationSeconds:+seconds.toFixed(2),roundTrip:true,bridgeReload:true,bothFences:true,boats:boats.length/3,playground:true};
}
