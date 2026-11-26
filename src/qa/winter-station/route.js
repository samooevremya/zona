// Run in a new Berezki game via Playwright's page.evaluate. Use the normal simulation
// for every footstep. Only the same interaction as the HUD button changes storeys.
async () => {
  const z = window.__z;
  const stationOffset=340;
  function walk(x, y) {
    const a = z.P, target = {x: (stationOffset+x) * 32, y: (233+y) * 32};
    const path = z.findPath(a.x, a.y, target.x, target.y, true);
    if (!path) throw Error('No walking route to ' + [x, y]);
    try {
      for (const point of [...path, target]) {
        for (let i = 0; i <= 150; i++) {
          const dx = point.x - a.x, dy = point.y - a.y, d = Math.hypot(dx, dy);
          if (d < 2.4) break;
          if (i === 150) throw Error('Obstructed at ' + [a.x, a.y]);
          z.IN.moveX = dx / d;
          z.IN.moveY = dy / d;
          z.update(1 / 60);
        }
      }
    } finally {
      z.IN.moveX = z.IN.moveY = 0;
      z.update(.01);
    }
  }
  function steps(x,y,frames){
    z.IN.moveX=x;z.IN.moveY=y;
    for(let i=0;i<frames;i++)z.update(1/60);
    z.IN.moveX=z.IN.moveY=0;
  }
  function cross(to){
    to+=233;
    const dir=Math.sign(to*32-z.P.y);
    let frames=0;
    while(dir*(to*32-z.P.y)>1 && frames++<400)steps(0,dir,1);
    if(frames>=400)throw Error('Bridge obstructed '+[z.P.x/32,z.P.y/32,to]);
  }
  // Start outside the residential block and enter the hall from the square.
  Object.assign(z.P,{x:369*32,y:266*32});
  walk(29,32.8);walk(29,29);walk(29,25.3);
  walk(39,25.5);cross(22.65);
  if(!z.S.flags.stationDeck)throw Error('Did not ascend from platform');
  steps(1,0,100);
  if(z.P.x>379.6*32 || !z.S.flags.stationDeck)throw Error('Walked off the side');
  z.save(true,1);z.applyState(z.loadSave(1));
  if(!z.S.flags.stationDeck)throw Error('Lost deck level on load');
  cross(17);
  if(z.S.flags.stationDeck)throw Error('North landing did not end');
  walk(40,15);walk(39,17);cross(25.5);
  if(z.S.flags.stationDeck)throw Error('Return to platform failed');
  walk(29,29);walk(29,32.8);
  // Now use the other route. Walk west underneath the same deck at track level.
  walk(29,29);walk(29,25.3);walk(43,22.65);walk(39,22.65);
  z.save(true,2);z.applyState(z.loadSave(2));
  if(z.S.flags.stationDeck)throw Error('Rail mistaken for bridge');
  walk(1.6-stationOffset,22.65);
  if(!z.P.alive)throw Error('West approach failed');
  // Probe both fences from both sides, including the ends, with a jumping body.
  for(const [y,gaps] of [[252.95,[]],[259.05,[[362,375]]]]){
    for(let x=1.5;x<759;x+=.5){
      if(gaps.some(([lo,hi])=>x>=lo && x<=hi))continue;
      for(const dir of [-1,1]){
        const e={x:x*32,y:y*32-dir*19,r:11,jumpT:.2};
        for(let i=0;i<14;i++)z.map.moveE(e,0,dir*3);
        if(dir*(e.y-y*32)>=0)throw Error('Fence leak '+[x,y,dir]);
      }
    }
  }
  return {station:true,bridgeBothWays:true,saveOnAndUnderDeck:true,westApproach:true,bothFences:true};
}
