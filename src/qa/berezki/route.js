// Run in a new Berezki game via Playwright's page.evaluate. Use the normal simulation
// for every footstep. Only the same interaction as the HUD button changes storeys.
async () => {
  const z = window.__z;
  function walk(x, y) {
    const a = z.P, target = {x: x * 32, y: y * 32};
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
  function stairs(up) {
    if (z.near?.k !== 'winterStairs' || z.near.s.up !== up) throw Error('Wrong stair landing');
    z.interact();
  }
  function straight(x,y){
    const a=z.P;
    try{
      for(let i=0;i<600;i++){
        const dx=x*32-a.x,dy=y*32-a.y,d=Math.hypot(dx,dy);
        if(d<2.4)return;
        z.IN.moveX=dx/d;z.IN.moveY=dy/d;z.update(1/60);
      }
      throw Error('Blocked at '+[a.x/32,a.y/32]+' toward '+[x,y]);
    }finally{z.IN.moveX=z.IN.moveY=0;z.update(.01);}
  }
  walk(518,357);walk(512,355.3);
  const floors=[[506,349],[770,12],[810,12]];
  for(const [i,[x,y]] of floors.entries()){
    if(i===2)break;
    if(i===0){walk(521.5,354.5);straight(x+18,y+5.6);}
    else straight(x+17.83,y+5.6);
    straight(x+19.35,y+5.6);straight(x+19.35,y+1.48);stairs(true);
  }
  for(const [x,y] of floors.slice(1).reverse()){
    if(x===770){straight(x+19.35,y+5.6);straight(x+17.83,y+5.6);}
    straight(x+17.83,y+1.48);stairs(false);
  }
  straight(525.35,354.6);straight(518,354.6);straight(518,362);
  return {outside:z.P.y>360*32,occupiedStoreys:3,residents:z.ents.filter(e=>e!==z.P).length};
}
