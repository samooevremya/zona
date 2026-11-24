// Equipment, condition and exposure are ordinary save data, independent of the plot.
Object.assign(backpack,{
  workcoat:{name:'Утеплённая спецовка',price:900,weight:4},
  vest:{name:'Рабочий бронежилет',price:6000,weight:5},
  energy:{name:'Энергетик',price:150,weight:.35},antirad:{name:'Радиопротектор',price:250,weight:.1},
  vodka:{name:'Крепкая настойка',price:100,weight:.6}
});
const armour={jacket:{warm:1,armor:.1},workcoat:{warm:1.5,armor:.2},vest:{warm:1.16,armor:.4}};
const contamination=[[85.9,96.4,1.4],[46,102.8,.95]];
const tracksInSnow=[];
let footSide=1;
let nextTick=0,probe=null,lastMark=null;
function fieldExposure(dt){
  state.radiation??=0;
  const spot=state.room<0&&contamination.find(([x,y,r])=>Math.hypot(player.x-x,player.y-y)<r);
  state.radiation=clamp(state.radiation+dt*(spot?.95:-.03),0,100);
  if(state.radiation>65)state.hp=Math.max(0,state.hp-dt*.45);
  if(spot&&state.clock>nextTick){effect('metalLatch',.055);nextTick=state.clock+1.4;}
  if(probe&&(probe.time+=dt)>1.3)probe=null;
  if(state.room<0&&!isMarsh()&&!polygonContains(winterMap.lake,player.x,player.y)&&
      (!lastMark||Math.hypot(player.x-lastMark[0],player.y-lastMark[1])>.18)){
    const direction=lastMark?Math.atan2(player.y-lastMark[1],player.x-lastMark[0]):player.a;
    lastMark=[player.x,player.y];footSide*=-1;
    tracksInSnow.push([player.x-Math.sin(direction)*footSide*.07,player.y+Math.cos(direction)*footSide*.07,direction,state.clock]);
    if(tracksInSnow.length>100)tracksInSnow.shift();
  }
}
function tossProbe(){
  if(wide||state.room>=0||modal.open)return;
  const dist=Math.max(0,wallDistance(player.x,player.y,player.a,1.9)-.12);
  probe={x:player.x,y:player.y,dx:Math.cos(player.a)*dist,dy:Math.sin(player.a)*dist,time:0};
  const px=probe.x+probe.dx,py=probe.y+probe.dy;
  notice(polygonContains(marshShore,px,py)?'Груз ушёл под корку льда':'Слышен удар о твёрдую поверхность');
}
function renderFieldGear(v){
  if(wide||state.room>=0)return;
  for(const m of tracksInSnow){
    const age=state.clock-m[3];if(age<0||age>60)continue;
    const [x,y]=screen(m[0],m[1],v);g.save();g.translate(x,y);g.rotate(m[2]);
    ellipse(g,0,0,.057*v.z,.026*v.z,'rgba(95,110,114,'+(.30*(1-age/60))+')');g.restore();
  }
  for(const [x,y,r] of contamination){
    if(Math.hypot(player.x-x,player.y-y)>10)continue;
    const [px,py]=screen(x+r,y,v);g.fillStyle='#857b5d';g.fillRect(px,py,.17*v.z,.14*v.z);
    g.fillStyle='#493e33';g.font=(.14*v.z)+'px sans-serif';g.textAlign='center';g.fillText('☢',px+.085*v.z,py+.12*v.z);
  }
  if(probe){const t=Math.min(1,probe.time/.45),[x,y]=screen(probe.x+probe.dx*t,probe.y+probe.dy*t,v);
    ellipse(g,x,y-Math.sin(t*Math.PI)*v.z*.33,v.z*.035,v.z*.025,'#535b5b');}
}
const lowProps=[[95.7,52.9,.32,.24],[31.6,26.1,.44,.25],[73.8,30.3,.35,.24],[52.3,96.5,.45,.21],[112.3,20.6,.4,.25]];
function lowObstacle(x,y){
  return lowProps.some(([px,py,w,h],n)=>!state.broken?.['yard-'+n]&&Math.abs(x-px)<w+.08&&Math.abs(y-py)<h+.08);
}
function drawLowProps(v){
  if(wide||state.room>=0)return;
  g.save();g.translate(viewW/2-v.x*v.z,viewH/2-v.y*v.z);g.scale(v.z,v.z);
  for(const [n,[x,y,w,h]] of lowProps.entries()){
    if(state.broken?.['yard-'+n]){brokenPlanks(g,x,y,w*2);continue;}
    contactShade(g,x+.08,y+.06,w*1.26,h*1.2,.5);
    sheetObject(g,4,x-w,y-h,w*2,h*2);
  }
  g.restore();
}
function tendFires(dt){
  state.weatherHour??=Math.floor(state.clock/60);
  const hour=Math.floor(state.clock/60);
  if(hour!==state.weatherHour){
    state.weatherHour=hour;
    if(Math.sin(state.clock/38)>.75){
      const i=hour%campfires.length;
      if(fireIndex(2)!==i&&!people.some(n=>actorLife(n).hp>0&&!n.enemy&&nearActor(n,campfires[i],2)))state.fires[i]=false;
    }
  }
  state.fireCheck=(state.fireCheck||0)-dt;
  if(state.fireCheck<=0){
    state.fireCheck=12;
    campfires.forEach((pos,i)=>{if(!state.fires[i]&&people.some(n=>!n.enemy&&actorLife(n).hp>0&&nearActor(n,pos,1.3)))state.fires[i]=true;});
  }
}
