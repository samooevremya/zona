// Start in the shore preview. Each independent visit starts outside its door.
async () => {
  const z=window.__z, T=32;
  z.S.min=11*60;
  for(let i=0;i<900;i++)z.update(1/30);
  function walk(x,y){
    try{
      for(let i=0;i<400;i++){
        const dx=x*T-z.P.x,dy=y*T-z.P.y,d=Math.hypot(dx,dy);
        if(d<2.1)return;
        z.IN.moveX=dx/d;z.IN.moveY=dy/d;z.update(1/60);
      }
      throw Error('Blocked '+[x,y]+' at '+[z.P.x/T,z.P.y/T]);
    }finally{z.IN.moveX=z.IN.moveY=0;z.update(.01);}
  }
  function use(k,bed=false){
    if(z.near?.k!==k || !!z.near.bed!==bed)throw Error('Interaction at '+[z.P.x/T,z.P.y/T]+' was '+[z.near?.k,z.near?.label]);
    z.interact();
    if(!z.panel)throw Error('No interaction panel');
  }
  function click(text){
    const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().endsWith(text) && b.offsetWidth);
    if(!b)throw Error('Missing '+text);
    b.click();
  }
  const homes=[
    {door:[484,137.4],inside:[484,139.65],stove:[484.68,139.73],wardrobe:[482.36,139.74],beds:[[482.1,140.63],[484.94,140.63]]},
    {door:[502,131.7],inside:[502,128],stove:[504.98,127.9],wardrobe:[501.37,126.92],beds:[[501.44,128.75],[502.65,127.43]]},
    {door:[491,132.8],inside:[491,129.5],stove:[489.2,128.55],wardrobe:[492.4,127.25],beds:[[492.3,128.65]]}
  ];
  const cleared=[];
  for(const h of homes){
    Object.assign(z.P,{x:h.door[0]*T,y:h.door[1]*T});
    walk(...h.inside);walk(...h.stove);
    use('winterRest');z.closePanel();
    z.S.flags.warmth=40;
    for(let i=0;i<70;i++)z.update(1/60);
    if(z.S.flags.warmth<41)throw Error('Stove failed');
    walk(...h.inside);walk(...h.wardrobe);
    const o=z.near?.o;
    if(o?.fitting!=='cupboard' || !Object.keys(o.loot).length)throw Error('Missing stocked cupboard at '+h.wardrobe);
    use('loot');click('Взять всё');cleared.push(o.stash);
    for(const bed of h.beds){
      walk(...h.inside);walk(...bed);use('winterRest',true);
      const before=z.S.min;click('Отдохнуть · 1 ч');
      if(Math.abs(z.S.min-before-60)>1)throw Error('Sleep failed');
    }
    walk(...h.inside);walk(...h.door);
  }
  z.save(true,1);const data=z.loadSave(1);
  const stove=z.map.objs.find(o=>o.cabinHome==='family' && o.fitting==='stove');
  Object.assign(data,{x:stove.x+stove.w/2,y:stove.y+stove.h/2});z.applyState(data);
  if(z.P.x===data.x && z.P.y===data.y || z.P.x/T<481 || z.P.x/T>486 || z.P.y/T<139 || z.P.y/T>142)throw Error('Indoor slot recovery');
  if(cleared.some(k=>!z.map.objs.find(o=>o.stash===k)?.looted))throw Error('Cupboard reset after loading');
  return {houses:3,stoves:3,beds:5,cupboards:3,exits:3,savedLoot:true,oldSlotRecovered:true};
}
