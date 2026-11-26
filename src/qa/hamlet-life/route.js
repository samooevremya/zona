// Start the shore preview and run the unmodified movement and interaction loop.
async () => {
  const z=__z, who=id=>z.ents.find(e=>e.sid===id);
  const near=(e,x,y)=>Math.hypot(e.x/32-x,e.y/32-y)<.25;
  const states=new Set();
  let saved=false,returned=false,patrolMoved=false;
  for(let i=0;i<4200;i++){
    z.update(1/60);
    const e=who('fisher');
    for(const a of z.ents)if(a.shoreAction)states.add(a.sid+':'+a.shoreAction);
    if(!saved && e.shoreAction==='net'){
      if(e.ang>0 && Math.cos(e.ang)>0.9)continue;
      z.save(true,1);const before=[e.x,e.y,z.S.flags.shoreJobs.fisher.stop];
      z.applyState(z.loadSave(1));const f=who('fisher');
      if(Math.hypot(f.x-before[0],f.y-before[1])>1 || before[2]!==z.S.flags.shoreJobs.fisher.stop)
        throw Error('Save did not resume work');
      saved=true;
    }
    if(!near(who('shorePatrol'),494.4,133.2))patrolMoved=true;
    if(!near(who('shorePost'),481.8,134.5))throw Error('Entrance abandoned');
    if(states.has('fisher:warm') && near(e,489.9,128.4)){returned=true;break;}
  }
  for(const s of ['fisher:net','fisher:warm','housekeeper:sweep','housekeeper:warm','anya:play','anya:warm','mitya:play','mitya:warm'])if(!states.has(s))throw Error(s);
  if(!saved || !returned || !patrolMoved)throw Error('Incomplete circuit');
  // Skip to dusk as when resting, then let everyone take their own door on foot.
  z.S.min=18*60+2;
  for(let i=0;i<65*30;i++)z.update(1/30);
  for(const [id,x,y] of [['anya',482.2,140.2],['mitya',485.5,140.75],['housekeeper',503.4,128.6],['fisher',489.9,128.4]])
    if(!near(who(id),x,y))throw Error('Did not return home: '+id+' '+[who(id).x/32,who(id).y/32]);
  if(!near(who('shorePost'),481.8,134.5))throw Error('Night post');
  z.S.min=1440+8*60+15;
  for(let i=0;i<11*30;i++)z.update(1/30);
  if(near(who('anya'),482.2,140.2) || near(who('fisher'),489.9,128.4))throw Error('Stayed home after dawn');
  return {net:true,fire:true,returned,saved,children:true,sweeping:true,nightWatch:true,nextMorning:true};
}
