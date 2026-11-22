// Scenarios in the production map. Exercise the species' own AI without unrelated combat.
window.checkMutants=()=>{
  const failures=[],dt=1/30,regions={},doors={},dens={};
  let checks=0;
  function check(ok,label){checks++;if(!ok)failures.push(label);}
  function region(p){return inGarbage(p.x/T,p.y/T)?'Свалка':p.x<WEST*T?'Малая Зона':'Кордон';}
  function make(kind,p){
    const d={x:p.x/T,y:p.y/T,pack:'test'};
    const e=kind==='dog'?mkDog(d):kind==='boar'?mkBoar(d):mkSucker();
    Object.assign(e,p,{home:{...p},think:0});
    return e;
  }
  function tick(e){if(e.kind==='dog')aiDog(e,dt);else if(e.kind==='boar')aiBoar(e,dt);else aiSucker(e,dt);}
  function until(e,test,seconds){
    for(let i=0;i<seconds/dt;i++){if(test())return true;S.min+=dt;tick(e);}
    return test();
  }
  const species=['dog','boar','sucker'];
  const residents=ents.filter(e=>e.fac==='mutant');
  for(const e of residents){
    const i=walkAnchor(e.home.x,e.home.y,e.r);
    check(i>=0&&clearFooting(e.home.x,e.home.y,e.r),'den '+e.sid);
    dens[region(e)]=(dens[region(e)]||0)+1;
  }
  for(const kind of species){
    doors[kind]=0;
    for(const h of HOUSES.filter(h=>h.x<PW))for(const d of h.entrances){
      const mid={x:h.x*T+d.x,y:h.y*T+d.y},lanes=[0];
      for(let u=T/2;u<d.width/2;u+=T/2)lanes.push(u,-u);
      const ok=lanes.some(u=>{
        const point=n=>({x:mid.x+d.nx*n*T+d.ny*u,y:mid.y+d.ny*n*T+d.nx*u});
        const e=make(kind,mid),b=point(-1.5);
        // Approach from outside a discarded tyre, log or stump in the yard.
        const candidates=[];
        for(const n of [1.5,2,2.5,3])for(const side of [0,T,-T]){
          const p=point(n);candidates.push({x:p.x+side*d.ny,y:p.y+side*d.nx});
        }
        const a=candidates.find(p=>clearFooting(p.x,p.y,e.r));
        if(!a||!clearFooting(b.x,b.y,e.r))return false;
        Object.assign(e,a);
        for(const dest of [point(0),b,point(0),a]){
          for(let i=0;i<180&&dE(e,dest)>5;i++)goTo(e,dest.x,dest.y,95,dt);
          if(dE(e,dest)>5)return false;
        }
        return true;
      });
      check(ok,'door '+kind+' '+h.ok+' '+d.nx+','+d.ny);if(ok)doors[kind]++;
    }
    for(const name of ['Кордон','Малая Зона','Свалка']){
      const r=kind==='boar'?14:kind==='sucker'?12:10;
      let a,b,f;
      for(const o of objs){
        if(o.k!=='fence'||!o.solid||region(o)!==name||Math.max(o.w,o.h)>180)continue;
        const vertical=o.h>o.w,x=o.x+o.w/2,y=o.y+o.h/2;
        a=vertical?{x:o.x-28,y}:{x,y:o.y-28};
        b=vertical?{x:o.x+o.w+28,y}:{x,y:o.y+o.h+28};
        if(!clearFooting(a.x,a.y,r)||!clearFooting(b.x,b.y,14))continue;
        const path=findPath(a.x,a.y,b.x,b.y,true,r);
        if(path&&path.length<9){f=o;break;}
      }
      check(!!f,name+' fixture');if(!f)continue;
      const e=make(kind,a),t=mkHuman({x:b.x/T,y:b.y/T,fac:'loner',hp:999});
      ents.splice(0,ents.length,P,e,t);
      // Started pursuit before prey got around this barrier.
      e.tgt=t;e.trail={...b};e.scentTime=4;
      const attack=until(e,()=>t.hp<999,12);
      check(attack && clearNPCShot(e,t),name+' '+kind+' detour & hit');
      // The victim is alive on another part of the map. Movement must continue off camera.
      t.x+=2200;t.y+=2000;
      const back=until(e,()=>!e.tgt&&!e.returning&&dE(e,a)<12,18);
      check(back,name+' '+kind+' back');
      // Put the last attack frame across the real fence and inside strike range.
      const mid={x:f.x+f.w/2,y:f.y+f.h/2},vertical=f.h>f.w;
      const offset=(vertical?f.w:f.h)/2;
      Object.assign(e,{x:mid.x-(vertical?offset+1:0),y:mid.y-(vertical?0:offset+1),
        state:kind==='boar'?'charge':kind==='sucker'?'strike':'idle',st:0,cool:0,hit:0,think:1});
      Object.assign(t,{x:mid.x+(vertical?offset+1:0),y:mid.y+(vertical?0:offset+1)});
      e.tgt=t;e.trail={x:t.x,y:t.y};e.scentTime=4;
      const hp=t.hp;tick(e);
      check(t.hp===hp,name+' '+kind+' blocked contact');
      // Stay close, but out of sight behind an opaque wall until memory expires.
      const house=HOUSES.find(h=>h.x<PW&&region({x:h.x*T,y:h.y*T})===name&&!h.ruin);
      const wall={x:(house.x+.5)*T,y:(house.y+.5)*T};
      const beside={x:wall.x-42,y:wall.y},hidden={x:wall.x+40,y:wall.y};
      Object.assign(e,beside,{home:{...beside},tgt:t,returning:false,trail:{...beside},scentTime:4,think:0});
      Object.assign(t,hidden);
      const forgot=until(e,()=>!e.tgt,6);
      check(forgot && dE(e,t)<200,name+' '+kind+' forgotten behind wall');
      (regions[name]||=[]).push(kind);
    }
  }
  // Three packmates negotiate one doorway with normal contact forces, then return off screen.
  const h=HOUSES.find(h=>h.ok==='26,71'),door=h.entrances[0];
  const side=(out,lane=0)=>({x:h.x*T+door.x+door.nx*out+door.ny*lane,
    y:h.y*T+door.y+door.ny*out+door.nx*lane});
  const inside=side(-48);
  const target=mkHuman({x:inside.x/T,y:inside.y/T,fac:'loner',hp:9999});
  const pack=[];
  for(const lateral of [0,26,-26,52,-52,78,-78]){
    const p=side(65,lateral);
    if(clearFooting(p.x,p.y,10)&&walkAnchor(p.x,p.y,10)>=0)pack.push(make('dog',p));
    if(pack.length===3)break;
  }
  check(pack.length===3,'pack fixture');
  ents.splice(0,ents.length,P,target,...pack);
  for(const e of pack){e.tgt=target;e.trail={...inside};e.scentTime=4;}
  const crossed=new Set(),returned=new Set();
  for(let i=0;i<20/dt;i++){
    S.min+=dt;for(const e of pack){
      tick(e);
      if((e.x-side(0).x)*door.nx+(e.y-side(0).y)*door.ny < -e.r)crossed.add(e);
    }
    resolveActorContacts(dt);
  }
  check(crossed.size===3&&target.hp<9999,'pack crossed doorway '+crossed.size);
  target.alive=false;
  for(let i=0;i<25/dt;i++){
    update(dt);
    for(const e of pack)if(!e.tgt&&!e.returning&&dE(e,e.home)<12)returned.add(e);
  }
  check(returned.size===3,'offscreen pack returned '+returned.size);
  return {checks,doors,dens,regions,failures};
};
