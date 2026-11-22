// Run in the built world with its ordinary AI, death, interaction and slot save/load paths.
window.checkDens = () => {
  const failures=[], hunted=[], packs=[...mutantDens.keys()];
  let checks=0;
  function check(ok,label) { checks++; if(!ok) failures.push(label); }
  const original=ents.slice(), dt=1/30, dump=original.filter(e=>e.den?.startsWith('dump_'));
  check(dump.length===5,'initial Garbage population');
  for(const e of dump) {
    const home={...e.home}, meadow={x:home.x,y:home.y+4*T};
    ents=[P,e];Object.assign(P,meadow);P.hp=500;P.alive=1;
    const tick=e.kind==='dog'?aiDog:aiBoar;
    for(let i=0;i<12/dt && P.hp===500;i++)tick(e,dt);
    check(P.hp<500 && dE(e,home)>2*T,'hunt from '+e.sid);
    P.y+=2000;
    for(let i=0;i<20/dt;i++){
      tick(e,dt);
      if (!e.tgt&&!e.returning&&dE(e,home)<12) break;
    }
    check(!e.tgt&&!e.returning&&dE(e,home)<12,'return to '+e.sid);
    hunted.push(e.sid);
  }
  ents=original;
  P.x=cam.x=STAIRS.x; P.y=cam.y=STAIRS.y;
  const all=ents.filter(e=>e.den);
  for(const e of all) kill(e,P);
  for(const pack of packs) check(S.flags.denRecovery[pack]===S.min+DEN_RECOVERY,'deadline '+pack);
  const until=S.min+DEN_RECOVERY;
  const restore=()=>{check(save(true,2),'write save');applyState(loadSave(2));};
  restore();
  S.min=until-1;spawnTick();
  check(ents.every(e=>!e.den||!e.alive),'empty after reload before deadline');
  const watched=dump[0];P.x=cam.x=watched.home.x;P.y=cam.y=watched.home.y;
  S.min=until;spawnTick();
  check(!ents.some(e=>e.alive&&e.den===watched.den),'player at den prevents repopulation');
  P.x=cam.x=STAIRS.x;P.y=cam.y=STAIRS.y;spawnTick();spawnTick();restore();
  for(const pack of packs){
    const group=ents.filter(e=>e.alive && e.den===pack);
    check(group.length===mutantDens.get(pack).length && new Set(group.map(e=>e.sid)).size===group.length,'one replacement pack '+pack);
  }
  const dogs=ents.filter(e=>e.den===watched.den);
  kill(dogs[0],P);S.min+=DEN_RECOVERY+10;spawnTick();
  check(!byS(dogs[0].sid) && byS(dogs[1].sid),'partial pack is never topped up');

  const point=dogs[1].home;
  Object.assign(P,point);
  for(const kind of ['dog','boar','sucker']){
    for(let i=objs.length-1;i>=0;i--) if(objs[i].k==='body') objs.splice(i,1);
    const d={x:P.x/T,y:P.y/T};
    const e=kind==='sucker'?mkSucker():kind==='boar'?mkBoar(d):mkDog(d);
    Object.assign(e,point);ents.push(e);kill(e,P);
    const id=MUTANT_TROPHIES[kind], before=cnt(id);
    function use() {G.near=findInteract();interact();}
    S.weapon='w_pm';use();
    check(cnt(id)===before && G.near?.k==='carve','holstered knife '+kind);
    restore();
    S.weapon='knife';S.inv.bread=10000;use();
    check(cnt(id)===before && G.near?.o?.loot[id]===1,'full backpack '+kind);
    delete S.inv.bread;use();interact();
    check(cnt(id)===before+1 && !G.near.o.loot[id],'one trophy '+kind);
    restore();use();
    check(cnt(id)===before+1 && !objs.some(o=>o.k==='body'&&o.loot[id]),'harvest persists '+kind);
  }
  return {checks,packs,hunted,failures};
};
