// Executed inside a QA-only build, after all winter geometry is prepared.
function inspectWinterClearance(){
  const rect=(x,y,w,h)=>({x,y,w,h});
  const houseBox=h=>rect(h.x*T,h.y*T,h.w*T,h.h*T);
  const gap=(a,b)=>Math.hypot(Math.max(0,b.x-a.x-a.w,a.x-b.x-b.w),Math.max(0,b.y-a.y-a.h,a.y-b.y-b.h));
  const overlap=(a,b)=>a.x<b.x+b.w-.05 && a.x+a.w>b.x+.05 && a.y<b.y+b.h-.05 && a.y+a.h>b.y+.05;
  const errors=[],outside=[],furnishings=objs.filter(o=>o.k==='roomFitting' || o.k==='crate');
  for(const f of shoreFences)outside.push([f,'ограда',27]);
  for(const p of atlasProps){
    // Largest visible extent, including rotation, roof tilt and the snow-covered footing.
    const w=p.width/2,h=p.height,cs=Math.cos(p.angle),sn=Math.sin(p.angle);
    const points=[];
    for(const u of [-w,w])for(const v of [-p.foot*h,(1-p.foot)*h]){
      points.push([p.x+u*cs-v*sn,p.y+u*sn+v*cs]);
    }
    const xx=points.map(pt=>pt[0]),yy=points.map(pt=>pt[1]);
    const left=Math.min(...xx),top=Math.min(...yy);
    outside.push([rect(left,top,Math.max(...xx)-left,Math.max(...yy)-top),p.key,9]);
  }
  for(const o of furnishings.filter(o=>!winterFloor(o.x+o.w/2,o.y+o.h/2)))outside.push([o,o.fitting,8]);
  for(const [o,label,clear] of outside)for(const h of district.exteriors)
    if(gap(o,houseBox(h))<clear)errors.push([label,Math.round(o.x/T),Math.round(o.y/T),'building',h.x,h.y,Math.round(gap(o,houseBox(h)))]);
  for(const o of furnishings){
    const r=winterFloor(o.x+o.w/2,o.y+o.h/2);if(!r)continue;
    for(let yy=Math.floor(o.y/T);yy<=Math.floor((o.y+o.h-.01)/T);yy++)for(let xx=Math.floor(o.x/T);xx<=Math.floor((o.x+o.w-.01)/T);xx++)
      if(SOLID[tAt(xx,yy)])errors.push([o.fitting,o.home,'wall',xx,yy]);
    for(const wall of objs)if(wall.k==='partition' && overlap(o,wall))errors.push([o.fitting,o.home,'partition']);
  }
  for(let i=0;i<furnishings.length;i++)for(const other of furnishings.slice(i+1))
    if(overlap(furnishings[i],other))errors.push([furnishings[i].home,furnishings[i].fitting,other.fitting]);
  // The rails meet the two side walls of the station at their endpoints.
  // They must not penetrate the interior or close either passenger door.
  for(const rail of trackFences)for(const h of district.exteriors)
    if(overlap(rail,houseBox(h)))errors.push(['railway boundary',h.x,h.y]);
  let nearTrees=0;
  for(const h of district.exteriors){
    const box=houseBox(h);
    for(const t of treesInRect(box.x-2*T,box.y-2*T,box.x+box.w+2*T,box.y+box.h+2*T)){
      nearTrees++;if(gap(rect(t.x-6,t.y-6,12,12),box)<4)errors.push(['tree footing',h.x,h.y]);
    }
  }
  // Compare the projected top of each yard fence with the eaves from eight
  // points on the walking circle around it, not just the orthographic survey.
  const saved={x:cam.x,y:cam.y};let views=0;
  try{
    for(const p of raisedScenery.filter(p=>p.wood)){
      for(let i=0;i<8;i++){
        cam.x=p.x+Math.cos(i*Math.PI/4)*150;cam.y=p.y+Math.sin(i*Math.PI/4)*130;
        const [dx,dy]=raisedOffset(p.x,p.y,28,false);
        const w=p.vertical?4:p.span,h=p.vertical?p.span:4;
        const cap=rect(p.x+dx-w/2,p.y+dy-h/2,w,h);
        for(const house of district.exteriors){
          const k=roofLift(house),[x,y]=residencePoint(house.x*T-3,house.y*T-3,k);
          if(overlap(cap,rect(x,y,(house.w*T+6)*(1+k),(house.h*T+6)*(1+k))))errors.push(['picket/eaves',house.x,house.y,i]);
        }
        views++;
      }
    }
  }finally{Object.assign(cam,saved);}
  return {nearTrees,views,railwayFences:trackFences.length,structures:district.exteriors.length,fixtures:furnishings.length,outdoorItems:outside.length,errors};
}
