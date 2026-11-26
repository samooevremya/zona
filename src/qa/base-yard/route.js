// Take one continuous walk from the base preview; no repositioning until the legacy-slot fixture.
async () => {
  const z=window.__z,T=32;
  const walk=(x,y)=>{
    try{
      for(let i=0;i<940;i++){
        const dx=x*T-z.P.x,dy=y*T-z.P.y,d=Math.hypot(dx,dy);
        if(d<2)return;
        z.IN.moveX=dx/d;z.IN.moveY=dy/d;z.update(1/60);
      }
      throw Error('Blocked at '+[z.P.x/T,z.P.y/T]+' toward '+[x,y]);
    }finally{z.IN.moveX=z.IN.moveY=0;z.update(.01);}
  };
  const follow=pts=>pts.forEach(p=>walk(...p));
  const use=k=>{if(z.near?.k!==k)throw Error('Expected '+k+' got '+z.near?.label);z.interact();};
  const loot=id=>{
    if(!z.near?.o?.loot[id])throw Error('Missing '+id);
    const o=z.near.o;use('loot');
    const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Взять всё' && b.offsetWidth);
    button.click();if(!o.looted)throw Error('Cupboard failed');
  };
  if(Math.abs(z.P.y/T-566.8)>.2)throw Error('Preview spawn');
  if(z.ents.some(e=>e!==z.P && e.y>560*T))throw Error('Unexpected resident');
  follow([[325,569.5],[324,573],[317,573],[314.8,572.3]]);
  z.S.flags.warmth=50;use('baseKindle');
  for(let i=0;i<120;i++)z.update(1/60);
  if(z.S.flags.warmth<52)throw Error('Cold stove');
  z.save(true,1);z.applyState(z.loadSave(1));z.update(.01);use('winterRest');z.closePanel();
  follow([[317,573],[324,573],[328,574],[335,574],[340.85,573.1]]);
  loot('ar_jacket');
  follow([[335,574],[328,574],[325,579],[324,585],[324,589],[317,589],[315.6,589.95]]);
  loot('cans');
  follow([[317,589],[324,589],[324,582],[336.5,582],[336.5,590],[341.65,588.16]]);
  loot('bandage');
  follow([[336.5,590],[336.5,596.5],[324,596.5],[324,589],[322.8,583],[320,582.5],[310,581],[302.9,580.5],
    [310,580.5],[320,578.8],[325,578],[325,567]]);
  const pit=z.map.objs.find(o=>o.k==='servicePit'),lorry=z.map.objs.find(o=>o.k==='parkedLorry');
  for(const o of [pit,lorry]){
    const probe={x:o.x+o.w/2,y:o.y-20,r:10};
    for(let i=0;i<50;i++)z.map.moveE(probe,0,2);
    if(probe.y>=o.y)throw Error('Walked through '+o.k);
  }
  z.save(true,1);const slot=z.loadSave(1);
  Object.assign(slot,{x:pit.x+pit.w/2,y:pit.y+pit.h/2});z.applyState(slot);
  if(z.P.x===slot.x && z.P.y===slot.y)throw Error('Legacy slot in inspection pit');
  return {interiors:4,cupboards:3,stoveSurvivedReload:true,loop:true,throughHangar:true,legacySlot:true,baseNPCs:0};
}
