// Local, bounded A* is only used when an actor's direct path is obstructed.
function clearWalk(ax,ay,bx,by){
  if(!sameRailSide(ay,by))return false;
  const d=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(d/.18));
  for(let i=1;i<=n;i++)if(!outsideFree(ax+(bx-ax)*i/n,ay+(by-ay)*i/n)||lowObstacle(ax+(bx-ax)*i/n,ay+(by-ay)*i/n))return false;
  return true;
}
function nextStep(n,life,tx,ty){
  if(clearWalk(n.x,n.y,tx,ty))return [tx,ty];
  if(life.routeUntil>state.clock && life.route?.length){
    while(life.route.length&&nearActor(n,life.route[0],.18))life.route.shift();
    if(life.route.length)return life.route[0];
  }
  const size=.45,start=[Math.round(n.x/size),Math.round(n.y/size)],score=new Map(),parent=new Map();
  const key=(x,y)=>x+':'+y,heur=(x,y)=>Math.hypot(x*size-tx,y*size-ty);
  const first={x:start[0],y:start[1],g:0,f:heur(...start)},open=[first];
  score.set(key(...start),0);let best=first;
  for(let count=0;open.length&&count<180;count++){
    let idx=0;for(let i=1;i<open.length;i++)if(open[i].f<open[idx].f)idx=i;
    const u=open.splice(idx,1)[0];if(heur(u.x,u.y)<heur(best.x,best.y))best=u;
    if(heur(u.x,u.y)<.65)break;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
      const x=u.x+dx,y=u.y+dy,k=key(x,y),g=u.g+size*Math.hypot(dx,dy);
      if((score.get(k)??Infinity)<=g||!clearWalk(u.x*size,u.y*size,x*size,y*size))continue;
      score.set(k,g);parent.set(k,u);open.push({x,y,g,f:g+heur(x,y)});
    }
  }
  const route=[];for(let u=best;u&&u!==first;u=parent.get(key(u.x,u.y)))route.unshift([u.x*size,u.y*size]);
  life.route=route;life.routeUntil=state.clock+2.5;return route[0]||[n.x,n.y];
}
function nearActor(n,p,d){return Math.hypot(n.x-p[0],n.y-p[1])<d;}
function witnessed(n,subject){
  if(n.animal||n.enemy||actorLife(n).hp<=0||n===subject)return false;
  const dx=subject.x-n.x,dy=subject.y-n.y,d=Math.hypot(dx,dy);
  return d<4&&wallDistance(n.x,n.y,Math.atan2(dy,dx),d)>=d;
}
function alarm(victim,accidental=false){
  if(victim.enemy||victim.animal)return;
  const v=actorLife(victim);
  if(accidental&&!v.warned){v.warned=true;notice(victim.name+' · Свои!');return;}
  v.angry=true;state.trust=Math.max(-10,(state.trust||0)-1);
  for(const n of people)if(witnessed(n,victim)){actorLife(n).angry=true;actorLife(n).alert=state.clock+45;}
}
function greet(n){
  panel(n.name,box=>{
    const words=n.trade?'Огонь во дворе, заходи погреться.':n.tech?'С мокрым оружием сразу к печи не подходи.':'За камышами открытая вода, под снегом не видно.';
    line(box,words);
    if(n.trade)btn(box,'Припасы и торговля',()=>social(n));
    if(n.tech)btn(box,'В мастерскую',workshop);
    if(!n.trade&&!n.tech){
      const life=actorLife(n);btn(box,life.follow?'Разойтись':'Идём вместе',()=>{life.follow=!life.follow;modal.close();});
    }
    if(WP[state.held])btn(box,'Потребовать припасы',()=>{alarm(n);modal.close();notice('Жители подняли тревогу');});
  });
}
function hudRadar(){
  const el=$('radar');el.hidden=wide;
  if(wide)return;
  const ctx=el.getContext('2d'),s=el.width,unit=s/12;
  ctx.clearRect(0,0,s,s);ctx.fillStyle='#334542';ctx.fillRect(0,0,s,s);
  if(ground)ctx.drawImage(ground,(player.x-6)/W*ground.width,(player.y-6)/H*ground.height,12/W*ground.width,12/H*ground.height,0,0,s,s);
  const point=(x,y)=>[(x-player.x)*unit+s/2,(y-player.y)*unit+s/2];
  for(const b of winterMap.buildings){
    const [x,y]=point(b[1],b[2]);ctx.fillStyle='#707471';ctx.fillRect(x-b[3]*unit/2,y-b[4]*unit/2,b[3]*unit,b[4]*unit);
  }
  if(state.room<0)for(const n of people){
    const life=actorLife(n);if(life.hp<=0&&state.clock-life.died>1440)continue;
    const [x,y]=point(life.x,life.y);ellipse(ctx,x,y,2,2,life.hp<=0?'#747474':n.enemy?'#b06855':'#c3cba7');
  }
  ctx.save();ctx.translate(s/2,s/2);ctx.rotate(player.a);ctx.fillStyle='#ffc86e';ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(-3,-3);ctx.lineTo(-3,3);ctx.fill();ctx.restore();
}
function assistedAngle(angle){
  const w=WP[state.held],strength=(state.controls?.assist??35)/100;
  if(state.room>=0||!w?.ammo||!strength)return angle;
  let delta=.22,chosen=angle;
  for(const n of people){
    const life=actorLife(n);if(life.hp<=0||(!n.enemy&&!life.angry))continue;
    const dx=n.x-player.x,dy=n.y-player.y,d=Math.hypot(dx,dy),to=Math.atan2(dy,dx);
    const diff=Math.atan2(Math.sin(to-angle),Math.cos(to-angle));
    if(d>w.range/64||Math.abs(diff)>=delta||wallDistance(player.x,player.y,to,d)<d)continue;
    delta=Math.abs(diff);chosen=angle+diff*strength;
  }
  return chosen;
}
function fieldSettings(){
  state.controls??={assist:35,tap:false,sound:75};
  panel('Управление и звук',box=>{
    for(const [k,name] of [['assist','Помощь при прицеливании'],['sound','Громкость']]){
      const label=document.createElement('label'),input=document.createElement('input');
      input.type='range';input.min=0;input.max=100;input.value=state.controls[k];
      label.textContent=name+' ';label.style.display='block';label.style.margin='12px 0';label.append(input);box.append(label);
      input.oninput=()=>{state.controls[k]=Number(input.value);};
    }
    btn(box,'Раскладка кнопок',()=>{modal.close();editWinterControls();});
    btn(box,state.controls.tap?'Стрельба · тап по противнику':'Стрельба · край стика',()=>{state.controls.tap=!state.controls.tap;fieldSettings();});
  });
}
function adjustBodyLocation(){
  for(const n of people){
    const life=actorLife(n);if(life.hp>0||life.died===undefined||state.room>=0||state.clock-life.died<=1440||state.clock-life.died>2880)continue;
    const [x,y]=screen(life.x,life.y,view()),size=view().z;
    for(const k of [-1,1])stroke(g,[[x-k*.08*size,y-.05*size],[x+k*.08*size,y+.06*size]],'#d1c7ac',.031*size);
  }
}
function bedsideGlow(v){
  if(state.floor===0||state.room<0||!shelters.has(winterMap.buildings[state.room][0]))return;
  const b=winterMap.buildings[state.room],[wx,wy]=roomFurniture(b).bed;
  const [x,y]=screen(wx-.15,wy,v),r=v.z*.92;
  const grad=g.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,'rgba(255,201,116,.36)');grad.addColorStop(1,'rgba(255,201,116,0)');
  ellipse(g,x,y,r,r,grad);
}
