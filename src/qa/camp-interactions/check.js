window.campChecks=()=>{
  const results=[];
  const check=(v,label)=>{if(!v)throw Error(label);results.push(label);};
  closePanel();applyState(freshS());S.flags.intro=1;S.blow={stage:0,next:S.min+9999};
  S.wx={k:'clear',until:S.min+9999};WX.rain=0;
  const near=WORLD_FIRES[0];P.x=near.x+18;P.y=near.y;
  S.wx.k='rain';S.min+=2;updateCampFires();
  check(WORLD_FIRES.every(f=>!fireLit(f)),'rain puts fires out');
  check(!relightFire(near,P),'no relighting during rain');
  save(true,2);applyState(loadSave(2));
  check(!fireLit(near),'cold hearth saved');
  WX.rain=0;S.wx.k='clear';P.x=near.x+18;P.y=near.y;G.near=findInteract();interact();check(fireLit(near),'player relights hearth via action');
  S.min+=2;S.wx.k='rain';updateCampFires();S.wx.k='clear';S.min+=16;
  const camper=byS('wolf');Object.assign(camper,{x:near.x+40,y:near.y,tgt:null,wounded:0,angry:0,captive:0,evacuating:false});
  updateCampFires();check(fireLit(near),'nearby NPC relights after rain');
  const cabinet=objs.find(o=>o.k==='roomFitting' && o.stash && o.loot && Object.keys(o.loot).length && !loftAt(o));
  check(cabinet,'stocked household cupboard');
  const cx=cabinet.x+cabinet.w/2,cy=cabinet.y+cabinet.h/2;
  let found=false;
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;P.x=cx+35*Math.cos(a);P.y=cy+35*Math.sin(a);
    if(clearFooting(P.x,P.y,11) && findInteract()?.o===cabinet){found=true;break;}
  }
  check(found,'search from walkable floor');G.near=findInteract();interact();
  check(panel?.kind==='loot' && panel.o===cabinet,'search opens inventory');
  lootAll(cabinet);closePanel();save(true,2);applyState(loadSave(2));
  check(!Object.keys(cabinet.loot).length && cabinet.looted,'empty after reload');
  const bar=HOUSES.find(h=>h.ok==='78,118');S.min=1300;
  check(occupiedWindow(bar) && HOUSES.some(h=>!h.ruin && !occupiedWindow(h)),'occupied and unlit houses');
  P.x=near.x;P.y=near.y;S.blow={stage:1,t:12};check(emissionStatus(null).includes('12 с'),'time until impact');
  S.blow={stage:2,t:23};P.hp=45;check(emissionStatus(null).includes('5 с'),'remaining exposure outside');
  P.x=(bar.x+2)*T;P.y=(bar.y+2)*T;check(emissionStatus(null).includes('до отбоя 23 с'),'remaining shelter time');
  S.blow={stage:0,next:S.min+999};
  const v=LOC.village.anchors.safe;P.x=v[0]*T;P.y=v[1]*T;P.sprinting=false;
  const body={k:'body',kind:'human',fac:'bandit',x:P.x-38,y:P.y,seed:19,ang:1,t:S.min,loot:{}};
  objs.push(body);const start=body.x,variant=deadVariant(body);draggedBody=body;
  let largest=0;for(let i=0;i<24;i++){const last=body.x;updateBodies(1/60);largest=Math.max(largest,Math.abs(body.x-last));}
  check(body.x>start+8 && largest<4 && body.deathSpot.x===start && deadVariant(body)===variant,'drag motion, fixed pose and blood');
  save(true,2);applyState(loadSave(2));
  check(objs.some(o=>o.seed===19&&o.deathSpot?.x===start),'blood position saved');
  return results;
};