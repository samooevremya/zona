// Run in the shore preview. Only the save-recovery fixture repositions the player.
async () => {
  const z=window.__z;
  function walk(x,y){
    for(let i=0;i<500;i++){
      const dx=x*32-z.P.x,dy=y*32-z.P.y,d=Math.hypot(dx,dy);
      if(d<2){z.IN.moveX=z.IN.moveY=0;return;}
      z.IN.moveX=dx/d;z.IN.moveY=dy/d;z.update(1/60);
    }
    throw Error('Blocked at '+[z.P.x/32,z.P.y/32]+' walking to '+[x,y]);
  }
  const follow=points=>points.forEach(p=>walk(...p));
  if(Math.abs(z.P.x/32-488.2)>.3)throw Error('Preview spawn');
  follow([[484,135.9],[484,139.6],[484,135.9],[488.1,134.4],[491,132.8],[491,130.5],[491,132.8]]);
  follow([[492,134.9],[495.6,133.9],[499.3,133.4],[502,132.5],[502,129.3],[502,132.5],[499.3,133.4]]);
  follow([[495.6,133.9],[496.1,135.6],[497.2,136.55],[498.65,135.8]]);
  z.S.flags.warmth=50;
  for(let i=0;i<65;i++)z.update(1/60);
  if(z.S.flags.warmth<=51 || z.near?.k!=='winterRest')throw Error('Campfire warmth or rest');
  follow([[499.1,135.7],[499.3,133.4],[495.6,133.9],[492,134.9],[488.1,134.4]]);
  follow([[486.2,133],[483,133.1],[482.6,130.9],[483.1,129.3],[483.2,124.4],[486.5,122.2],[488.9,121.6],[491.4,121.4]]);
  for(const kind of ['netShelter','roastingPit']){
    const o=z.map.objs.find(p=>p.k===kind);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const x=o.x+o.w/2,y=o.y+o.h/2;
      const e={x:x+dx*(o.w/2+22),y:y+dy*(o.h/2+22),r:11};
      for(let i=0;i<60;i++)z.map.moveE(e,-2*dx,-2*dy);
      if((e.x-x)*dx+(e.y-y)*dy<=10)throw Error('Walked through '+kind);
    }
  }
  z.save(true,1);const data=z.loadSave(1);
  data.x=480.5*32;data.y=139.5*32;z.applyState(data);
  if(z.P.x===data.x && z.P.y===data.y)throw Error('Save inside new wall');
  return {doorways:3,fire:true,ice:true,solidProps:2,oldSlotRecovered:true};
}
