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
  walk(29, 56);
  walk(23, 54.3);
  for (const [x, y] of [[17,48], [70,12], [110,12], [70,49]]) {
    walk(x + 18.7, y + 5.35);
    stairs(true);
    if (x === 17) walk(78.2, 15.4);
  }
  for (const [x, y] of [[110,49], [70,49], [110,12], [70,12]]) {
    walk(x + 16.9, y + 5.7);
    stairs(false);
  }
  walk(29, 61);
  return {outside: z.P.y > 59 * 32, residents: z.ents.filter(e => e !== z.P).length};
}
