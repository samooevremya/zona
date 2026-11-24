// Locations and characters belong to the winter settlement. No campaign is required.
const people=[
  {id:'market',name:'Кладовщица',trade:true,x:97.4,y:52.3},
  {id:'fisher',name:'Рыбак',trade:true,x:111.8,y:20.4},
  {id:'walker',name:'Путевой обходчик',x:73,y:28.95},
  {id:'first',name:'Дозорный',enemy:true,x:81.2,y:96.4},
  {id:'second',name:'Дозорный',enemy:true,x:49,y:98}
].map(n=>({...n,home:[n.x,n.y]}));
function actorLife(n){return state.actors[n.id]??=( {hp:100,x:n.home[0],y:n.home[1],angry:false} );}
function social(n){
  panel(n.name,box=>{
    if(!n.trade){line(box,'У станции есть огонь. На озере лёд уже встал, а в камышах до сих пор вода.');return;}
    line(box,'Припасы · '+state.money+' ₽');
    for(const [key,it] of Object.entries(backpack)){
      const price=Math.ceil(it.price*DIFFICULTIES[state.difficulty].buy*(1-Math.min(0,state.trust||0)*.08));
      if(key!=='jacket')btn(box,it.name+' · '+price+' ₽',()=>{state.money-=price;give(key);social(n);},state.money<price);
      if((state.inventory[key]||0)>0&&key!=='jacket'&&state.held!==key&&key!==(state.coat||'jacket')){
        const value=Math.max(1,Math.floor(it.price*.45*DIFFICULTIES[state.difficulty].income));
        btn(box,'Продать '+it.name+' · '+value+' ₽',()=>{state.money+=value;give(key,-1);social(n);});
      }
    }
  });
}
function outsideFree(x,y){return x>.2&&y>.2&&x<W-.2&&y<H-.2&&Math.abs(y-railNorth)>.105&&Math.abs(y-railSouth)>.105&&
  !tunnelBlocked(x,y)&&!winterMap.buildings.some(b=>b[0]!=='platform'&&overBuilding(x,y,b,.09))&&
  !enclosure.some(line=>line.slice(1).some((p,i)=>clearance(x,y,line[i],p)<.12));}
function wallDistance(x,y,a,range){
  for(let d=.1;d<range;d+=.1){
    const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
    if(!(state.room<0?outsideFree(px,py):insideFree(state.room,px,py)))return d;
  }
  return range;
}
function reload(){
  const w=WP[state.held];if(!w?.ammo||reloadTime||!state.inventory[w.ammo]||(state.rounds[state.held]||0)>=w.mag)return;
  reloadWeapon=state.held;reloadTime=w.reload;notice('Перезарядка');effect(w.ammo==='a12'?'loadShell':w.ammo==='a9'?'loadPistol':'loadRifle');
}
function strike(){
  if(modal.open||wide||state.hp<=0||cooldown>0||reloadTime>0)return;
  if(state.held==='grenade'){throwGrenade();return;}
  const w=WP[state.held];if(!w)return;
  if(w.ammo){
    if(!(state.rounds[state.held]>0)){reload();return;}state.rounds[state.held]--;const wear=state.wear??={};wear[state.held]=Math.max(5,(wear[state.held]??100)-.34);noiseAt={x:player.x,y:player.y,time:state.clock,room:state.room};effect(w.ammo==='a12'?'shotgun':w.ammo==='a9'?'pistol':'rifle',.38);
  }else effect('swing');
  state.burst=Math.min(12,(state.burst||0)+1);cooldown=w.rate;
  for(let shot=0;shot<(w.pellets||1);shot++){
    const a=player.a+(Math.random()-.5)*(w.spread||0)*(1+((100-(state.wear?.[state.held]??100))*.004)+(state.burst||0)*.035)*DIFFICULTIES[state.difficulty].spread;
    const dist=wallDistance(player.x,player.y,a,w.range/64),c=Math.cos(a),s=Math.sin(a);
    let closest=dist,target=null;
    if(state.room<0)for(const npc of people){
      if(actorLife(npc).hp<=0)continue;
      const dx=npc.x-player.x,dy=npc.y-player.y,along=dx*c+dy*s;
      if(along>=0&&along<closest&&Math.abs(dx*s-dy*c)<.20){closest=along;target=npc;}
    }
    if(target){
      const life=actorLife(target);life.hp=Math.max(0,life.hp-w.dmg);alarm(target,people.some(n=>n.enemy&&actorLife(n).hp>0&&actorLife(n).alert>state.clock));
      if(life.hp===0)life.died=state.clock;
    }
    if(w.ammo)traces.push({x:player.x,y:player.y,a,d:closest,t:.09});
  }
}
function actorsStep(dt){
  cooldown=Math.max(0,cooldown-dt);state.burst=Math.max(0,(state.burst||0)-dt*2.4);
  if(reloadTime>0&&(reloadTime-=dt)<=0){
    reloadTime=0;const w=WP[reloadWeapon],q=Math.min(w.mag-(state.rounds[reloadWeapon]||0),state.inventory[w.ammo]||0);
    give(w.ammo,-q);state.rounds[reloadWeapon]=(state.rounds[reloadWeapon]||0)+q;
  }
  for(const n of people){
    const life=actorLife(n);n.x=life.x;n.y=life.y;if(life.hp<=0||state.room>=0)continue;
    const dx=player.x-n.x,dy=player.y-n.y,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    if(noiseAt?.room===-1&&state.clock-noiseAt.time<2&&(n.enemy||life.angry)&&Math.hypot(noiseAt.x-n.x,noiseAt.y-n.y)<7){
      life.alert=state.clock+14;life.tx=noiseAt.x;life.ty=noiseAt.y;
    }
    if((n.enemy||life.angry)&&dist<(state.crouch&&!state.lamp?2.8:4.6)&&wallDistance(n.x,n.y,a,dist)>=dist){
      life.alert=state.clock+14;life.tx=player.x;life.ty=player.y;
      if(dist<(n.animal?.34:2.3)&&(!life.nextShot||state.clock>=life.nextShot)){
        life.nextShot=state.clock+1.9;state.hp=Math.max(0,state.hp-7*DIFFICULTIES[state.difficulty].incoming*(1-armour[state.coat||'jacket'].armor));
        if(!n.animal)traces.push({x:n.x,y:n.y,a,d:dist,t:.12});
      }
    }
    const pursue=life.alert>state.clock;
    const follow=!pursue&&life.follow&&!life.angry&&sameRailSide(n.y,player.y);
    const gx=pursue?life.tx:follow?player.x-.64:n.home[0],gy=pursue?life.ty:follow?player.y+.36:n.home[1];
    if(Math.hypot(gx-n.x,gy-n.y)<(pursue?(n.animal?.23:1.65):.10))continue;
    const [tx,ty]=nextStep(n,life,gx,gy);
    const d=Math.hypot(tx-n.x,ty-n.y);if(d<.018)continue;
    const step=Math.min(d,dt*(pursue?.48:.26));
    const nx=n.x+(tx-n.x)/d*step,ny=n.y+(ty-n.y)/d*step;
    if(outsideFree(nx,n.y)&&!lowObstacle(nx,n.y))life.x=nx;if(outsideFree(life.x,ny)&&!lowObstacle(life.x,ny)&&sameRailSide(n.y,ny))life.y=ny;
  }
  traces=traces.filter(tr=>(tr.t-=dt)>0);
}
function paintDetails(v){
  const xy=(x,y)=>screen(x,y,v);
  for(const [i,f] of campfires.entries()){
    const [x,y]=xy(...f),p=v.z;contactShade(g,x+.04*p,y+.06*p,p*.38,p*.31,.70);
    if(state.fires[i]){
      const glow=g.createRadialGradient(x,y,0,x,y,p*.85);
      glow.addColorStop(0,'rgba(241,169,80,.48)');glow.addColorStop(1,'rgba(241,169,80,0)');ellipse(g,x,y,p*.85,p*.85,glow);
      yardObject(g,8,x,y,p*.58,p*.52);
    }else{
      ellipse(g,x,y,p*.18,p*.15,'#504638');
    }
  }
  for(const n of people){
    const life=actorLife(n);if(n.animal&&life.hp>0)continue;if(life.hp<=0&&state.clock-life.died>1440)continue;
    const [x,y]=xy(life.x,life.y),p=v.z;
    contactShade(g,x+p*.065,y+p*.06,p*.20,p*.14,.55);
    g.save();g.translate(x,y);g.rotate(life.hp<=0?2.2:n.trade?-.5:1.18);
    stamp(g,8,-p*.16,-p*.16,p*(life.hp<=0?.43:.33),p*.32);
    g.restore();
  }
  for(const b of winterMap.buildings.filter(b=>accessibleBuilding(b)&&b[0]!=='station')){
    const [x,y]=door(b,true),[sx,sy]=xy(x,y);
    g.save();g.translate(sx,sy);g.rotate(b[5]);g.scale(v.z,v.z);
    g.fillStyle='#6a675d';g.fillRect(-.29,-.27,.58,.28);
    if(furnishingAtlas.naturalWidth)g.drawImage(furnishingAtlas,44,420,152,48,-.29,-.27,.58,.28);
    stroke(g,[[-.29,-.02],[.29,-.02]],'#b1b1a1',.018);g.restore();
  }
}
