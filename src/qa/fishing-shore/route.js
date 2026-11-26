// Run in a new Berezki game via Playwright's page.evaluate. Use the normal simulation
// for every footstep. Only the same interaction as the HUD button changes storeys.
async () => {
  const z = window.__z;
  function walk(x, y) {
    const a = z.P, target = {x: (x+510) * 32, y: (y+131) * 32};
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
  Object.assign(z.P,{x:558*32,y:150*32});
  let fisher=z.ents.find(e=>e.sid==='fisher');
  if(!fisher)throw Error('Missing fisherman');
  let sawIce=false,sawHome=false,resumed=false;
  for(let frame=0;frame<5400;frame++){
    z.update(1/60);
    if(!resumed && z.S.flags.fishingRound?.index===4){
      if(!z.save(true,1))throw Error('Could not save');
      const x=fisher.x,y=fisher.y;
      z.applyState(z.loadSave(1));fisher=z.ents.find(e=>e.sid==='fisher');
      if(!fisher || Math.hypot(fisher.x-x,fisher.y-y)>1)throw Error('Fisher moved on load');
      resumed=true;
    }
    if(fisher.crouch && Math.hypot(fisher.x-558.4*32,fisher.y-139*32)<5)sawIce=true;
    if(sawIce && Math.hypot(fisher.x-556.9*32,fisher.y-145.4*32)<5){sawHome=true;break;}
  }
  if(!sawHome)throw Error('Incomplete fishing round '+JSON.stringify([fisher.x/32,fisher.y/32,z.S.flags.fishingRound]));
  z.S.min=20*60;
  for(const p of [[48,18.8],[48,16.6],[49.4,13.25]])walk(...p);
  if(z.near?.k!=='loot' || z.near.o?.fitting!=='cupboard')throw Error('Wardrobe out of reach');
  walk(49.3,14.65);
  if(z.near?.k!=='winterRest' || !z.near.bed)throw Error('Bed out of reach '+JSON.stringify([z.near?.k,z.near?.label,z.P.x/32,z.P.y/32]));
  walk(46.2,14.55);
  z.S.flags.warmth=50;
  for(let i=0;i<60;i++)z.update(1/60);
  if(z.S.flags.warmth<51)throw Error('Cold next to stove');
  for(const p of [[48,16.6],[48,18.8],[52.9,18.8],[53.2,12],[51.8,9.2],[48.4,8]])walk(...p);
  if(Math.hypot(fisher.x-556.9*32,fisher.y-145.4*32)>12)throw Error('Fisher left after dark');
  const old=z.loadSave(1);
  Object.assign(old,{x:554.5*32,y:145.5*32});delete old.flags.fishingRound;
  old.dyn.npcs=old.dyn.npcs.filter(e=>e.sid!=='fisher');
  z.applyState(old);
  if(Math.hypot(z.P.x-old.x,z.P.y-old.y)<3 || !z.ents.some(e=>e.sid==='fisher'))throw Error('Old save inside cabin wall');
  return {sawIce,sawHome,resumed,oldSave:true,wardrobe:true,bed:true,stove:true,night:true};
}
