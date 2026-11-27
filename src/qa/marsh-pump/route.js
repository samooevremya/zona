// Exercise both paths with actual player movement and identical starting gear.
async () => {
  const z=window.__z,T=32,flags=()=>z.S.flags;
  const direct=[[192,434.5],[197.8,435.6],[200.6,436],[203.5,436]];
  const bank=[[183.7,437.6],[185.7,440.8],[188.2,444.2],[194.7,445.6],[200.7,443.4],[201.5,440],[201.5,437],[203.5,436]];
  function walk(points){
    let ticks=0;
    try{
      for(const [x,y] of points){
        let i=0;
        for(;i<900;i++){
          const dx=x*T-z.P.x,dy=y*T-z.P.y,dist=Math.hypot(dx,dy);
          if(dist<2)break;
          z.IN.moveX=dx/dist;z.IN.moveY=dy/dist;z.update(1/60);ticks++;
        }
        if(i===900)throw Error('Blocked near '+[z.P.x/T,z.P.y/T]+' walking to '+[x,y]);
      }
    }finally{z.IN.moveX=z.IN.moveY=0;z.update(.01);}
    return ticks/60;
  }
  const check=(ok,why)=>{if(!ok)throw Error(why);};
  check(Math.abs(z.P.x/T-183.8)<.1,'Wrong fork');
  z.save(true,1);const start=z.loadSave(1),results=[];
  for(const hour of [11,23]){
    const routeStats=[];
    for(const path of [bank,direct]){
      z.applyState(structuredClone(start));z.S.min=hour*60;flags().coatWetness=0;flags().warmth=100;
      const seconds=walk(path),wet=flags().coatWetness,heat=flags().warmth;
      routeStats.push({seconds:+seconds.toFixed(2),wet:+wet.toFixed(3),heat:+heat.toFixed(2)});
    }
    const [dry,wet]=routeStats;
    check(dry.wet===0 && wet.wet>.1 && wet.heat<dry.heat && wet.seconds<dry.seconds,JSON.stringify(routeStats));
    results.push({hour,dry,wet});
  }
  walk([[205,436],[209.45,435.98]]);
  check(z.near?.k==='pumpKindle','Missing stove '+z.near?.k);
  z.interact();const heat=flags().warmth,wet=flags().coatWetness;
  for(let i=0;i<150;i++)z.update(1/60);
  check(flags().warmth>heat && flags().coatWetness<wet,'Stove failed');
  z.save(true,1);z.applyState(z.loadSave(1));z.update(.01);
  check(z.near?.k==='winterRest' && !flags().baseStoveUntil,'Stove save isolation');
  z.interact();const rest=[...document.querySelectorAll('button')].find(b=>b.offsetWidth && b.textContent.includes('Отдохнуть · 1 ч'));
  check(rest,'Missing rest');rest.click();check(flags().coatWetness===0,'Wet after drying');
  z.S.min=flags().pumpStoveUntil+1;z.update(.02);check(z.near?.k==='pumpKindle','Stove expiry');
  walk([[205,436],...bank.slice().reverse(),[183.8,434.2]]);
  // Reach all four sides on foot. The raised supply line joins the building
  // to the east, so take the open passage between the uprights on the return.
  walk([...direct.slice(0,2),[198.4,433.4],[194.85,434.2],[192.9,434.1],
    [192.9,430.2],[194.85,429.8],[198.4,430.4],[194.85,430.4],
    [194.85,432.35],[194.85,434.2]]);
  const feet=z.map.objs.filter(o=>o.k==='towerFoot');check(feet.length===4,'Missing tower support');
  for(const o of feet){
    const cy=o.y+o.h/2,dir=Math.sign(cy-432.35*T);
    const probe={x:o.x+o.w/2,y:cy+dir*30,r:8};
    for(let k=0;k<30;k++)z.map.moveE(probe,0,-2*dir);
    check(Math.abs((probe.y-cy)*dir-o.h/2-probe.r)<.01,'Walked through tower support '+JSON.stringify({o,probe}));
  }
  return {results,supports:feet.length,returnToFork:true,driedAfterRest:true,stoveReloadAndExpiry:true};
}
