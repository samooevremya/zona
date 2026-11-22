// Browser scenarios use the live world grid, NPC physics, weapon code and faction rules.
window.checkNPCCombat=()=>{
  const failures=[],regions={},dt=1/30;
  let checks=0;
  function check(ok,label){checks++;if(!ok)failures.push(label);}
  const region=o=>inGarbage(o.x/T,o.y/T)?'Свалка':o.x/T<WEST?'Малая Зона':'Кордон';
  function actor(at,fac){return mkHuman({x:at.x/T,y:at.y/T,fac,rank:1,wpn:'w_pm'});}
  function across(o,pad){
    const x=o.x+o.w/2,y=o.y+o.h/2;
    return o.w>o.h ? [{x,y:o.y-pad},{x,y:o.y+o.h+pad}] :
      [{x:o.x-pad,y},{x:o.x+o.w+pad,y}];
  }
  const buildings=HOUSES.filter(h=>h.x<PW);
  for(const h of buildings){
    for(let j=h.y;j<h.y+h.h;j++)for(let i=h.x;i<h.x+h.w;i++){
      if(!OPAQ[tAt(i,j)] || !(i===h.x || j===h.y))continue;
      const x=(i+.5)*T,y=(j+.5)*T;
      check(!clearNPCShot({x:x-21,y},{x:x+21,y}),'wall '+h.ok);
    }
  }
  const trains=objs.filter(o=>o.k==='freightWagon');
  for(const o of trains){
    const [a,b]=across(o,25);
    check(!clearNPCShot(a,b)&&!clearNPCShot(b,a),'wagon '+o.x);
  }
  const fences=objs.filter(o=>o.k==='fence'&&o.solid);
  for(const o of fences){
    const [a,b]=across(o,14);check(!clearNPCShot(a,b)&&!clearNPCShot(b,a),'fence '+o.x+','+o.y);
  }
  for(const [x,y,w,h,a] of [...knolls,...dumpHills]){
    const from={x:x*T-h*T*Math.sin(a),y:y*T+h*T*Math.cos(a)};
    const to={x:2*x*T-from.x,y:2*y*T-from.y};
    check(terrainLevel(x*T,y*T)>Math.max(terrainLevel(from.x,from.y),terrainLevel(to.x,to.y))+18 &&
      !clearNPCShot(from,to),'crest '+x+','+y);
  }
  for(const name of ['Кордон','Малая Зона','Свалка']){
    // Find a real, short fence reach with navigable approaches and a way around the end.
    const f=fences.find(o=>{
      if(region(o)!==name || Math.max(o.w,o.h)>210)return false;
      const [a,b]=across(o,34),path=findPath(a.x,a.y,b.x,b.y,true);
      return clearFooting(a.x,a.y,11)&&clearFooting(b.x,b.y,11)&&path&&path.length<10;
    });
    check(!!f,name+' fixture');if(!f)continue;
    const [a,b]=across(f,34),e=actor(a,'loner'),t=actor(b,'bandit');
    ents.splice(0,ents.length,P,e,t);t.hp=t.maxhp=9000;
    e.tgt=t;e.lastSeen={...b};e.mem=8;e.sit=1;e.nade=0;
    const magazine=e.mag;
    check(!fire(e,Math.atan2(b.y-a.y,b.x-a.x),WP.w_pm,0,t)&&t.hp===9000,name+' blocked');
    const cover=findCover(e,t,32,400);
    check(cover&&findPath(e.x,e.y,cover.x,cover.y,true)&&!clearNPCShot(cover,t),name+' reachable cover');
    let clearAtFirstShot=false;
    for(let i=0;i<25/dt&&e.mag===magazine;i++){
      S.min+=dt;aiHuman(e,dt);
      if(e.mag<magazine)clearAtFirstShot=clearNPCShot(e,t);
    }
    const moved=dE(e,a);
    check(clearAtFirstShot&&moved>15,name+' rounded fence');
    t.alive=0;
    for(let i=0;i<25/dt&&(!e.sit||dE(e,a)>8);i++){S.min+=dt;aiHuman(e,dt);}
    check(e.sit&&dE(e,a)<8,name+' returned to seat');
    const returned=!!e.sit;
    // Re-enter the fight wounded; a usable shelter must actually be reached before healing.
    Object.assign(e,{x:a.x,y:a.y,hp:20,inv:{medkit:1},morale:1,sit:0,tgt:t,mem:8,lastSeen:{...b},path:null});
    Object.assign(t,{alive:1,x:b.x,y:b.y});
    let healedUnderCover=false;
    for(let i=0;i<12/dt && e.hp===20;i++){
      S.min+=dt;aiHuman(e,dt);
      if(e.hp>20)healedUnderCover=!clearNPCShot(e,t)&&!e.inv.medkit;
    }
    check(healedUnderCover,name+' healed in cover');
    regions[name]={around:clearAtFirstShot,returned,healedUnderCover};
  }
  const p=locPt('village','safe');
  // Select a clear shot and put an ally between the two actors, then off the centre line
  // on one pellet's actual ray. A rejected shot must produce no sound cue, tracer or damage.
  let a,b;
  for(let j=-4;j<=4&&!a;j++)for(let i=-4;i<=4&&!a;i++){
    const q={x:p.x+i*T,y:p.y+j*T},r={x:q.x+5*T,y:q.y};
    if(clearWalk(q.x,q.y,r.x,r.y)&&clearNPCShot(q,r)){a=q;b=r;}
  }
  check(!!a,'open lane');
  if(a){
    const sh=actor(a,'loner'),enemy=actor(b,'bandit'),ally=actor({x:(a.x+b.x)/2,y:a.y},'loner');
    ents.splice(0,ents.length,P,sh,enemy,ally);
    const hp=ally.hp,flash=flashes.length;
    check(!fire(sh,0,WP.w_obrez,.15,enemy)&&ally.hp===hp&&flashes.length===flash,'ally ahead');
    ally.x=a.x+130;ally.y=a.y+22;
    check(!fire(sh,Math.atan2(22,130),WP.w_obrez,0,enemy)&&ally.hp===hp&&flashes.length===flash,'off-axis ally');
    ally.y+=80;
    check(fire(sh,0,WP.w_pm,0,enemy)&&enemy.hp<enemy.maxhp,'clear lane shoots');
    sh.trip={x:b.x,y:b.y,stage:0};sh.tgt=enemy;sh.nade=0;
    aiHuman(sh,dt);enemy.alive=0;aiHuman(sh,dt);
    check(sh.trip?.x===b.x&&sh.trip.stage===0,'interrupted errand');
    enemy.alive=1;sh.tgt=enemy;sh.trip=null;sh.guard='bridge';sh.aw=1;
    aiHuman(sh,dt);enemy.x+=1200;
    for(let i=0;i<12/dt;i++){S.min+=dt;aiHuman(sh,dt);}
    check(!sh.tgt&&!sh.inBattle&&dE(sh,sh.home)<10,'living opponent lost, guard back on duty');
  }
  return {checks,failures,regions,buildings:buildings.length,trains:trains.length,fences:fences.length,hills:knolls.length+dumpHills.length};
};
