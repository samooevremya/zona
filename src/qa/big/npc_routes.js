// Run against the built game. Use real movement, collision shapes and warning duration.
window.checkNPCRoutes=()=>{
  const dt=.05,failures=[],result={doors:0,residents:0,regions:{},failures};
  function approach(e,target,seconds){
    for(let i=0;i<seconds/dt;i++){
      if(dE(e,target)<6)return true;
      goTo(e,target.x,target.y,95,dt);
    }
    return dE(e,target)<6;
  }
  for(const h of HOUSES.filter(h=>h.x<PW))for(const d of h.entrances){
    const center={x:h.x*T+d.x,y:h.y*T+d.y};
    const at=t=>({x:center.x+d.nx*T*t,y:center.y+d.ny*T*t});
    const moves=[0];
    for(let u=T/2;u<d.width/2;u+=T/2)moves.push(u,-u);
    result.doors++;
    const usable=moves.some(u=>{
      const a=at(1.5),b=at(-1.5);
      for(const p of [a,b]){p.x+=u*d.ny;p.y+=u*d.nx;}
      if(!clearFooting(a.x,a.y,11)||!clearFooting(b.x,b.y,11))return false;
      const e={...a,r:11,step:0,ang:0};
      return approach(e,b,8)&&approach(e,a,8);
    });
    if(!usable)failures.push(['door',h.ok,d.nx,d.ny]);
  }
  const people=ents.filter(e=>e!==P&&e.alive&&e.kind==='human'&&e.sid!=='sid'&&!e.captive&&!e.wounded);
  const origins=new Map(people.map(e=>[e,{x:e.x,y:e.y}]));
  function advance(seconds){
    for(let i=0;i<seconds/dt;i++){
      for(const e of people)blowoutHumanAI(e,dt);
      resolveActorContacts(dt);
    }
  }
  S.blow={stage:1,t:80};
  advance(80);
  for(const e of people){
    const origin=origins.get(e),region=inGarbage(origin.x/T,origin.y/T)?'Свалка':origin.x<WEST*T?'Малая Зона':'Кордон';
    result.regions[region]=(result.regions[region]||0)+1;result.residents++;
    if(!sheltered(e.x,e.y))failures.push(['shelter',e.sid||e.name,Math.round(e.x/T),Math.round(e.y/T),e.shelterSpot,e.path?.[e.pi],e.trip]);
  }
  S.blow.stage=2;
  advance(26);
  for(const e of people)if(!sheltered(e.x,e.y))failures.push(['left shelter',e.sid]);
  S.blow.stage=0;
  const returned=new Set();
  for(let i=0;i<170/dt;i++){
    resolveActorContacts(dt);
    for(const e of people){
      if(returned.has(e))continue;
      if(!blowoutHumanAI(e,dt))idleHuman(e,dt);
      if(dE(e,origins.get(e))<10&&!e.evacuating)returned.add(e);
    }
  }
  for(const e of people)if(!returned.has(e))
    failures.push(['return',e.sid||e.name,e.x/T,e.y/T]);
  const stops=[locPt('village','safe'),locPt('zalissya','approach'),locPt('dump_depot','approach')];
  result.interregional=0;
  for(const a of stops)for(const b of stops){
    if(a===b)continue;
    const centre=p=>{
      const i=walkAnchor(p.x,p.y);
      if(i<0)throw Error('No walking lane at '+p.loc);
      return {x:(i%MW+.5)*T,y:(Math.floor(i/MW)+.5)*T};
    };
    const e={...centre(a),r:11,step:0,ang:0};
    if(approach(e,centre(b),420))result.interregional++;
    else failures.push(['long walk',a.loc,b.loc,e.x/T,e.y/T]);
  }
  // A free traveller can help, resume the errand, and remember the expenditure.
  const at=stops[0], actor=()=>mkHuman({fac:'loner',x:at.x/T,y:at.y/T,rank:0});
  const helper=actor(),patient=actor();
  helper.trip={x:stops[1].x,y:stops[1].y,stage:0};
  helper.inv={medkit:1};patient.hp=10;patient.captive=1;
  ents.push(helper,patient);
  helpCompanion(helper,dt);
  const respectedQuest=patient.hp===10;
  patient.captive=0;helper.aidCheck=0;
  helpCompanion(helper,dt);
  result.aid=respectedQuest&&patient.hp===55&&!helper.inv.medkit&&helper.trip.stage===0;
  if(!result.aid)failures.push(['aid',patient.hp,helper.inv,helper.aidTarget?.name]);
  // Round-trip the production save while a guard is away from his post.
  const guard=people.find(e=>e.guard&&e.sid);
  const sid=guard.sid,origin={x:guard.x,y:guard.y};
  S.blow.stage=1;advance(80);
  save(true);
  applyState(loadSave());
  const saved=ents.find(e=>e.sid===sid);
  result.saveReturn=!!saved?.evacuating && sheltered(saved.x,saved.y) && dE(saved.shelterOrigin,origin)<1;
  S.blow.stage=0;
  for(let i=0;i<150/dt&&dE(saved,origin)>=8;i++){
    blowoutHumanAI(saved,dt);idleHuman(saved,dt);
  }
  result.saveReturn=result.saveReturn&&dE(saved,origin)<8;
  if(!result.saveReturn)failures.push(['save/return',sid]);
  return result;
};
