// Search only the current room, with a standing player and all its solid furniture present.
window.checkInteriors = () => {
  const rooms=HOUSES.filter(h=>h.x<PW).map(h=>({...h, entries:h.entrances.map(d=>({
    x:h.x*T+d.x-1.5*T*d.nx, y:h.y*T+d.y-1.5*T*d.ny
  }))}));
  for(const loft of lofts) rooms.push({...loft, ok:loft.id, entries:[loft.landing]});
  rooms.push({ok:'bunker',x:BUNK.x0/T,y:BUNK.y0/T,w:(BUNK.x1-BUNK.x0)/T,h:(BUNK.y1-BUNK.y0)/T,
    entries:[{x:STAIRS.x,y:(SID_SHOP?SID_STAIR_Y-.85:9.6)*T}]});
  const counts={rooms:rooms.length,entries:0,containers:0,actors:0,stairs:0},failures=[];
  const original={x:P.x,y:P.y};
  function walk(a,b){
    const e={...a,r:P.r};
    for(let i=0;i<=2;i++){
      moveE(e,i?(b.x-a.x)/2:0,i?(b.y-a.y)/2:0);
      if(Math.hypot(e.x-a.x-(b.x-a.x)*i/2,e.y-a.y-(b.y-a.y)*i/2)>.05)return false;
    }
    return true;
  }
  const caches=S.caches;
  S.caches={...caches};
  for(const o of objs)if(o.k==='cache')S.caches[o.cacheId]=1;
  try {
    for(const room of rooms){
      const contains=p=>p.x>=room.x*T && p.x<(room.x+room.w)*T && p.y>=room.y*T && p.y<(room.y+room.h)*T;
      const stride=room.w*4, step=T/4;
      const point=i=>({x:room.x*T+(i%stride)*step,y:room.y*T+Math.floor(i/stride)*step});
      const nearest=p=>Math.round((p.y-room.y*T)/step)*stride+Math.round((p.x-room.x*T)/step);
      const seen=new Set(),queue=[];
      const anchor=p=>{
        const base=nearest(p);
        for(const d of [0,1,-1,stride,-stride,stride+1,stride-1,-stride+1,-stride-1]){
          const i=base+d,q=point(i);
          if(contains(q)&&walk(p,q)&&walk(q,p))return i;
        }
        return -1;
      };
      if(room.ok==='78,118'){
        const d=room.entrances[0];
        if(room.entrances.length!==1 || d.ny!==-1)failures.push([room.ok,'village-facing door']);
        else {
          const x=room.x*T+d.x,y=room.y*T+d.y;
          for(let j=-16;j<6;j++){
            const a={x,y:y+j*T/4},b={x,y:y+(j+1)*T/4};
            if(!walk(a,b)||!walk(b,a)){failures.push([room.ok,'village street']);break;}
          }
        }
      }
      const entries=room.entries.map(anchor);counts.entries+=entries.length;
      if(entries[0]>=0){queue.push(entries[0]);seen.add(entries[0]);}
      for(let k=0;k<queue.length;k++){
        const i=queue[k],p=point(i);
        for(const d of [1,-1,stride,-stride]){
          const j=i+d,q=point(j);
          if(seen.has(j)||j<0||!contains(q)||Math.abs(q.x-p.x)>step||!isFloor(tAt(Math.floor(q.x/T),Math.floor(q.y/T))))continue;
          if(walk(p,q)&&walk(q,p)){seen.add(j);queue.push(j);}
        }
      }
      if(entries.some(i=>!seen.has(i)))failures.push([room.ok,'entry',entries.filter(i=>!seen.has(i)).length]);
      const points=queue.map(point);
      function target(group,name,center,radius,test){
        counts[group]++;
        if(!points.some(p=>{
          if(dE(p,center)>radius)return false;
          P.x=p.x;P.y=p.y;return test(p);
        }))failures.push([room.ok,name,center.x/T,center.y/T]);
      }
      for(const o of objs){
        if(!(o.stash||['locker','cache'].includes(o.k)))continue;
        const c={x:o.x+(o.w||0)/2,y:o.y+(o.h||0)/2};if(!contains(c))continue;
        if(o.k==='crate')target('containers',o.stash,c,65,p=>{
          const a=Math.atan2(c.y-p.y,c.x-p.x),dx=Math.cos(a),dy=Math.sin(a);
          return containerOnRay(P,dx,dy,shotBarrier(P,dx,dy,WP.knife.range+P.r)).o===o;
        });
        else if(o.k==='cache')target('containers',o.cacheId,o,44,()=>findInteract()?.o===o);
        else target('containers',o.stash||o.k,c,50,()=>findInteract()?.o===o);
      }
      for(const e of ents.filter(e=>e!==P&&e.alive&&e.kind==='human'&&contains(e))){
        target('actors',e.sid||e.name,e,e.sid==='sid'?120:60,p=>{
          if(e.sid==='sid')return findInteract()?.k==='trader';
          if(!los(p.x,p.y,e.x,e.y))return false;
          return hostile(e,P)?dE(p,e)<40:findInteract()?.e===e;
        });
      }
      for(const r of lofts)for(const loc of [r.stair,r.landing])if(contains(loc)){
        target('stairs',r.id,loc,41,()=>{const f=findInteract();return f?.k==='floor'&&f.room===r;});
      }
      if(room.ok==='bunker')target('stairs','exit',STAIRS,32,()=>findInteract()?.k==='up');
    }
  }finally{Object.assign(P,original);S.caches=caches;}
  const bar=HOUSES.find(h=>h.ok==='78,118');
  const saved=JSON.stringify(S), x=(bar.x+Math.floor(bar.w/2)+.5)*T, y=(bar.y+bar.h-1)*T;
  for(const fraction of [.25,.75]){
    const state=JSON.parse(saved);state.x=x;state.y=y+fraction*T;applyState(state);
    if((fraction<.5?P.y>=y:P.y<=y+T) || !walk(P,P))failures.push([bar.ok,'old save on threshold',fraction]);
  }
  return {...counts,failures};
};
