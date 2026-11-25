"use strict";
(() => {
  const W=window.world, screen=document.getElementById('scene'), c=screen.getContext('2d');
  const keys=new Set(), axes={x:0,y:0}, gearNames={empty:'Пустые руки',knife:'Нож',rifle:'Карабин'};
  let aimHeading=null;
  const rooms=window.interiors;
  const stationRoomSide={south:'front',platform:'platform',north:'north'};
  let p, indoor=null, exitPoint=null, paused=false, touchRun=false, started=false;
  let width=1,height=1,scale=1,dpr=1,camera={x:0,y:0},elapsed=0,animation=0,nextHud=0;
  let trail=[],routeTime=0,finished=false,routeRunning=false,near={},sound=false;
  let snowX=0,snowY=0;
  const snow=Array.from({length:195},(_,i)=>({x:((i*317)%499)/499,y:((i*443)%521)/521,z:.45+((i*17)%41)/34}));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const formatTime=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');
  let climate=window.winterClimate.sample(0), localShelter=0;
  const fires=W.points.filter(o=>o.type==='fire');
  const trucks=W.points.filter(o=>o.type==='truck');
  function locate(items,pos){
    let nearest=Infinity,pan=0;
    for(const o of items){
      const dx=o.x-pos.x,distance=Math.hypot(dx,o.y-pos.y);
      if(distance<nearest){nearest=distance;pan=clamp(dx/12,-1,1);}
    }
    return {distance:nearest,pan};
  }
  const angleDiff=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
  function faceTowards(from,to,rate,dt){return from+clamp(angleDiff(from,to),-rate*dt,rate*dt);}
  function surface(){return indoor?'wood':p.mud>.02?'marsh':W.lake(p.x,p.y)?'ice':'snow';}
  function reset(){
    hud.clearToast();
    p={x:W.gate.x,y:W.gate.y,heading:-Math.PI/2,legHeading:-Math.PI/2,travelHeading:-Math.PI/2,vx:0,vy:0,phase:0,speed:0,mud:0,sink:0,wet:0,jump:0,jumpV:0,gear:'empty',jacket:'starter',health:100,warmth:88,food:87,water:89,rations:2,bottles:2};
    window.workerGait.reset(p);camera={x:p.x,y:p.y};indoor=null;exitPoint=null;elapsed=0;started=false;finished=false;routeRunning=false;routeTime=0;trail=[];near={};
    snowX=0;snowY=0;paused=false;clearInputs();climate=window.winterClimate.sample(0);localShelter=0;nextHud=0;
  }
  function clearInputs(){keys.clear();aimHeading=null;axes.x=0;axes.y=0;touchRun=false;if(p){p.speed=0;p.vx=0;p.vy=0;}}
  function ready(){return !paused&&p.health>0;}
  function setActive(){if(ready())started=true;}
  function jump(){if(!ready()||p.jump>0||p.jumpV!==0)return;setActive();p.jumpV=3.0*(1-.82*p.mud);}
  function cycleGear(){if(!ready())return;const gears=Object.keys(gearNames);p.gear=gears[(gears.indexOf(p.gear)+1)%gears.length];nextHud=0;}
  function changeJacket(){
    if(!ready())return;
    p.jacket=p.jacket==='starter'?'insulated':'starter';
    nextHud=0;
  }
  function consume(kind){
    if(!ready())return;const food=kind==='food',count=food?'rations':'bottles',stat=food?'food':'water';
    if(!p[count]){hud.toast(food?'Паёк закончился':'Вода закончилась');return;}
    if(p[stat]>98){hud.toast(food?'Вы сыты':'Вы уже напились');return;}
    setActive();p[count]--;p[stat]=Math.min(100,p[stat]+(food?34:40));hud.toast(food?'Вы съели паёк':'Вы выпили воду');nextHud=0;
  }
  function nearestPlace(){
    if(indoor)return rooms.name(indoor,p.x,p.y);
    let best=null,min=Infinity;for(const q of W.places){const d=Math.hypot(q[1]-p.x,q[2]-p.y);if(d<min){min=d;best=q;}}
    return min<25?best[0]:'Лесная дорога';
  }
  function snapTo(target){
    p.x=target.x;p.y=target.y;p.heading=target.heading??p.heading;
    p.legHeading=p.heading;p.travelHeading=p.heading;
    p.vx=0;p.vy=0;p.speed=0;p.jump=0;p.jumpV=0;p.mud=0;p.sink=0;
    window.workerGait.reset(p);camera={x:p.x,y:p.y};nextHud=0;
  }
  function interact(){
    if(!ready())return;
    setActive();
    if(indoor){
      const action=rooms.action(indoor,p.x,p.y);
      if(!action)return;
      if(action.delta){
        snapTo(rooms.changeFloor(indoor,action.delta));
      }else if(action.exit){
        const side=action.exit==='front'?'south':action.exit;
        const to=indoor.building.type==='station'?W.stationDoors[side]:exitPoint;
        indoor=null;exitPoint=null;snapTo(to);near=W.nearby(p.x,p.y);
      }
    }else{
      near=W.nearby(p.x,p.y);
      if(near.door){
        const side=near.doorSide||'south';
        exitPoint=near.door.type==='station'?W.stationDoors[side]:{x:near.door.x,y:near.door.y+1.4};
        indoor=rooms.create(near.door,stationRoomSide[side]||'front');
        snapTo(indoor.spawn);
      }else if(near.fire){hud.toast(p.wet>2?'У костра одежда высыхает':'У костра вы согреваетесь');}
    }
    nextHud=0;
  }
  let audio;
  async function toggleSound(){
    sound=!sound;
    if(sound){audio=audio||window.createFieldSound();if(!await audio.enable()&&sound){sound=false;hud.toast('Не удалось включить звук');}}
    else audio?.mute();
    nextHud=0;
  }
  function updateSound(){
    if(!audio||!sound||paused||document.hidden)return;
    const pos=indoor?exitPoint:p;
    const fire=locate(fires,pos),truck=locate(trucks,pos),station=locate([W.entrance],pos);
    audio.tick({indoor:!!indoor,fireDistance:indoor?Infinity:fire.distance,firePan:fire.pan,
      wind:climate.wind,shelter:localShelter,truckDistance:truck.distance,truckPan:truck.pan,
      stationDistance:station.distance,stationPan:station.pan});
  }
  function movePlayer(dt){
    let dx=axes.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    let dy=axes.y+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const length=Math.hypot(dx,dy);
    if(length>1){dx/=length;dy/=length;}
    const running=touchRun||keys.has('ShiftLeft')||keys.has('ShiftRight');
    const baseSpeed=indoor?(running?2.1:1.6):(running?3.5:1.6);
    const coldFactor=.78+.22*clamp(p.warmth/14,0,1);
    const target=baseSpeed*(1-.67*p.mud)*coldFactor;
    const ax=dx*target-p.vx,ay=dy*target-p.vy;
    const rate=length>.01?(running?8:6.8):14;
    const approach=Math.min(1,rate*dt/(Math.hypot(ax,ay)||1));
    p.vx+=ax*approach;p.vy+=ay*approach;
    const ox=p.x,oy=p.y;
    const blocked=(x,y)=>indoor?rooms.blocked(indoor,x,y):W.blocked(x,y);
    if(!blocked(p.x+p.vx*dt,p.y))p.x+=p.vx*dt;else p.vx=0;
    if(!blocked(p.x,p.y+p.vy*dt))p.y+=p.vy*dt;else p.vy=0;
    const distance=Math.hypot(p.x-ox,p.y-oy);
    p.speed=distance/dt;
    if(distance>.0001)p.travelHeading=Math.atan2(p.y-oy,p.x-ox);
    const facing=aimHeading??(distance>.0001?p.travelHeading:p.heading);
    p.heading=faceTowards(p.heading,facing,9.5,dt);
    // While strafing, feet find a comfortable angle relative to the shoulders.
    const twist=aimHeading===null?0:clamp(angleDiff(p.heading,p.travelHeading),-.68,.68)*clamp(p.speed,0,1);
    p.legHeading=faceTowards(p.legHeading,p.heading+twist,8,dt);
    let landed=false;
    if(p.jump>0||p.jumpV>0){
      p.jumpV-=9.8*dt;p.jump+=p.jumpV*dt;
      if(p.jump<=0){p.jump=0;p.jumpV=0;landed=true;}
    }
    window.workerGait.advance(p,dt,landed,feet=>{
      const ground=surface();
      if(sound)audio?.step(ground,p.speed);
      if(ground==='snow')for(const foot of feet){
        const toe=.045;
        trail.push({x:foot.x+toe*Math.cos(p.legHeading),y:foot.y+toe*Math.sin(p.legHeading),a:p.legHeading,t:elapsed});
        if(trail.length>200)trail.shift();
      }
    });
    p.phase=p.gait.phase;
  }
  function update(dt){
    if(!ready()||!started)return;
    elapsed+=dt;climate=window.winterClimate.sample(elapsed);
    p.mud=indoor?0:W.marshDepth(p.x,p.y);
    movePlayer(dt);
    p.mud=indoor?0:W.marshDepth(p.x,p.y);
    p.sink+=(p.mud*.51-p.sink)*(1-Math.exp(-dt*2.8));
    localShelter=indoor?1:W.shelter(p.x,p.y);
    near=indoor?{}:W.nearby(p.x,p.y);
    if(!routeRunning&&!finished&&!indoor&&Math.hypot(p.x-W.gate.x,p.y-W.gate.y)>.12)routeRunning=true;
    if(routeRunning){
      routeTime+=dt;
      if((!indoor&&Math.hypot(p.x-W.entrance.x,p.y-W.entrance.y)<1.3)||indoor?.building.type==='station'){
        finished=true;routeRunning=false;hud.toast('Станция · время в пути '+formatTime(routeTime));
      }
    }
    const heated=!!indoor||!!near.fire;
    p.wet=clamp(p.wet+dt*(p.mud>.02?2.5*p.mud:heated?-2.2:-.10),0,100);
    const loss=window.winterClimate.cooling(climate,localShelter,p.wet,p.food);
    const heatChange=indoor?1.15:near.fire?1.60:-loss;
    const oldHeat=p.warmth;
    p.warmth=clamp(p.warmth+dt*heatChange,0,100);
    p.food=clamp(p.food-dt*(p.speed>2.2?.13:.078),0,100);
    p.water=clamp(p.water-dt*(p.speed>2.2?.20:.115),0,100);
    if(oldHeat>18&&p.warmth<=18)hud.toast('Пальцы немеют. Пора к огню.');
    if(p.warmth<=0)p.health=Math.max(0,p.health-dt*2.7);
    else if(p.food<=0||p.water<=0)p.health=Math.max(0,p.health-dt*.95);
    if(!p.health){clearInputs();nextHud=0;}
    const blend=1-Math.exp(-dt*8);
    camera.x+=(p.x-camera.x)*blend;camera.y+=(p.y-camera.y)*blend;
  }
  function size(){
    width=screen.clientWidth||innerWidth;height=screen.clientHeight||innerHeight;dpr=Math.min(1.65,window.devicePixelRatio||1);
    if(screen.width!==Math.round(width*dpr)||screen.height!==Math.round(height*dpr)){screen.width=Math.round(width*dpr);screen.height=Math.round(height*dpr);}
    scale=Math.min(width/(width<height?14:26),height/14.1);
  }
  const sx=x=>(x-camera.x)*scale+width*.5,sy=y=>(y-camera.y)*scale*W.squash+height*.57;
  function worldTransform(){c.setTransform(dpr*scale,0,0,dpr*scale*W.squash,dpr*(width*.5-camera.x*scale),dpr*(height*.57-camera.y*scale*W.squash));}
  function screenTransform(){c.setTransform(dpr,0,0,dpr,0,0);}
  function actor(x,y,state){screenTransform();window.drawWorker(c,sx(x),sy(y),scale,state);worldTransform();}
  function insideScene(){
    screenTransform();c.fillStyle='#272925';c.fillRect(0,0,width,height);
    worldTransform();rooms.draw(c,indoor,p,()=>actor(p.x,p.y,{...p,time:animation}),animation);
  }
  function render(){
    size();screenTransform();c.fillStyle='#bdc7cc';c.fillRect(0,0,width,height);
    if(indoor){insideScene();return;}
    worldTransform();W.drawGround(c,camera.x,camera.y,width/scale*.52,height/scale/W.squash*.62);
    for(const m of trail){if(Math.abs(m.x-camera.x)>width/scale*.55||Math.abs(m.y-camera.y)>height/scale)continue;c.save();c.translate(m.x,m.y);c.rotate(m.a);W.oval(c,0,0,.14,.063,'rgba(89,100,101,'+clamp(.43-(elapsed-m.t)/140,0,.43)+')');c.restore();}
    const visible=W.points.filter(o=>sx(o.x)>-o.w*scale&&sx(o.x)<width+o.w*scale&&sy(o.y)>-25&&sy(o.y)<height+o.w*scale*2.2);
    const npcY=100;
    visible.push({type:'player',x:p.x,y:p.y},{type:'npc',x:149,y:npcY});
    visible.sort((a,b)=>a.y-b.y);
    for(const o of visible){
      if(o.type==='player')actor(o.x,o.y,{...p,time:animation});
      else if(o.type==='npc'){if(Math.abs(o.y-camera.y)<28)actor(o.x,o.y,{heading:.2,time:animation,phase:elapsed*2.4,speed:0,jump:0,gear:'empty'});}
      else{
        c.globalAlpha=W.occludes(o,p.x,p.y)?.44:1;
        W.prop(c,o,animation);c.globalAlpha=1;
      }
    }
    screenTransform();
    if(climate.dark>0){c.fillStyle='rgba(23,39,65,'+climate.dark+')';c.fillRect(0,0,width,height);}
    const visualWind=climate.snow*(1-.50*localShelter);
    if(visualWind>.12){
      const haze=c.createRadialGradient(width*.5,height*.57,scale*1.4,width*.5,height*.57,Math.max(width,height)*.60);
      haze.addColorStop(0,'rgba(215,225,229,'+(visualWind*.09)+')');
      haze.addColorStop(1,'rgba(215,225,229,'+(visualWind*.75)+')');
      c.fillStyle=haze;c.fillRect(0,0,width,height);
    }
    const count=Math.floor((width<800?100:175)*visualWind);c.strokeStyle='rgba(253,254,252,.68)';c.lineWidth=1.1;
    c.beginPath();for(let i=0;i<count;i++){const f=snow[i],x=((f.x*width+snowX*f.z)%(width+10))-5;
      const y=((f.y*height+snowY*f.z)%(height+10))-5;c.moveTo(x,y);c.lineTo(x+f.z*(1+visualWind*3),y+f.z*2.1);}c.stroke();
  }
  function mapDraw(el,full){
    if(!el||el.clientWidth<1||el.clientHeight<1)return;
    const w=el.clientWidth,h=el.clientHeight,ratio=Math.min(2,devicePixelRatio||1);
    if(el.width!==Math.round(w*ratio)||el.height!==Math.round(h*ratio)){el.width=Math.round(w*ratio);el.height=Math.round(h*ratio);}
    const m=el.getContext('2d');m.setTransform(ratio,0,0,ratio,0,0);m.fillStyle='#292f2d';m.fillRect(0,0,w,h);
    const pos=indoor?exitPoint:p,k=full?Math.min((w-16)/W.width,(h-22)/W.height):Math.min(w,h)/52;
    const cx=full?W.width/2:pos.x,cy=full?W.height/2:pos.y,px=x=>(x-cx)*k+w/2,py=y=>(y-cy)*k+h/2;
    m.save();m.translate(px(0),py(0));m.scale(k,k);m.fillStyle='#48514a';m.fillRect(0,0,W.width,W.height);
    W.oval(m,157,43,83,32,'#728488');W.oval(m,62,139,33,22,'#5b6354');
    m.fillStyle='#333e36';for(const o of W.points){if(o.type==='tree')m.fillRect(o.x,o.y,o.w*.37,o.w*.35);}
    m.lineJoin='round';m.lineCap='round';
    for(const path of W.roads){m.strokeStyle='#989883';m.lineWidth=full?1.4:2.8;m.beginPath();path.forEach(([x,y],i)=>i?m.lineTo(x,y):m.moveTo(x,y));m.stroke();}
    for(const y of W.railFencesY){m.fillStyle='#878d81';m.fillRect(0,y-.20,W.width,.40);}
    for(const y of W.railsY){m.fillStyle='#272d2b';m.fillRect(0,y-.45,W.width,.9);}
    for(const o of W.buildings){m.fillStyle=o.heated?'#c2b7a0':'#919087';m.fillRect(o.x-o.solidW/2,o.y-o.solidD,o.solidW,o.solidD);}
    for(const o of W.points){if(o.type==='fire')W.oval(m,o.x,o.y,full?1.5:.65,full?1.5:.65,'#eda751');}m.restore();
    if(full){m.font='600 '+(w<430?'10':'12')+'px sans-serif';m.textAlign='center';m.textBaseline='middle';
      for(const [name,x,y] of W.places){let label=name.replace('Станция «Сотый километр»','Станция').replace('Разрушенная военная база','Военная база');
        const tw=m.measureText(label).width+7,tx=clamp(px(x),tw/2+2,w-tw/2-2),ty=py(y)+8;m.fillStyle='rgba(27,31,28,.88)';m.fillRect(tx-tw/2,ty-7,tw,15);m.fillStyle='#f3e5c9';m.fillText(label,tx,ty+1);}}
    m.save();m.translate(px(pos.x),py(pos.y));m.rotate(p.heading);m.beginPath();m.moveTo(7,0);m.lineTo(-5,-4.5);m.lineTo(-3,0);m.lineTo(-5,4.5);m.closePath();m.fillStyle='#f4c66c';m.fill();m.strokeStyle='#29251d';m.lineWidth=1;m.stroke();m.restore();
  }
  function publishHud(){
    const minutes=climate.minutes,clock=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(Math.floor(minutes%60)).padStart(2,'0');
    near=indoor?{}:W.nearby(p.x,p.y);
    const context=indoor?(rooms.action(indoor,p.x,p.y)?.label||''):near.door?(near.door.type==='station'?(near.doorSide==='north'?'В переход к вокзалу':'Войти на станцию'):near.door.type==='block'?'Войти в подъезд':'Войти'):near.fire?'Костёр':'';
    const route=finished?'Станция · '+formatTime(routeTime):'До станции · '+Math.round(Math.hypot((indoor?exitPoint.x:p.x)-W.entrance.x,(indoor?exitPoint.y:p.y)-W.entrance.y))+' м'+(routeRunning?' · '+formatTime(routeTime):'');
    const exposure=p.mud>.05?'Вязкая топь':indoor||near.fire?'В тепле':localShelter>.52?'За ветром':climate.wind>.6?'На ветру':'';
    const clothes=p.wet>=2?'Одежда мокрая · '+Math.round(p.wet)+'%':'';
    hud.update({...p,condition:[exposure,clothes].filter(Boolean).join(' · '),temp:climate.temp,time:clock,weather:climate.weather,gear:gearNames[p.gear],place:nearestPlace(),route,context,sound,dead:p.health<=0});
    mapDraw(document.getElementById('minimap'),false);if(hud.mapOpen())mapDraw(document.getElementById('map'),true);updateSound();
  }
  window.game={move(x,y){axes.x=x;axes.y=y;if(x||y)setActive();},aim(x,y){if(ready()){aimHeading=Math.hypot(x,y)>.05?Math.atan2(y,x):null;if(aimHeading!==null){setActive();}}},
    sprint(on){touchRun=on;},jump,interact,cycleGear,changeJacket,consume,toggleSound,reset,pause(on){paused=on;clearInputs();if(on)audio?.mute();else if(sound)audio?.enable();nextHud=0;}};
  screen.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&e.buttons===1&&ready())game.aim(e.clientX-sx(p.x),(e.clientY-sy(p.y))/W.squash);});
  window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')aimHeading=null;});
  const motion=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
  window.addEventListener('keydown',e=>{if(['Space','ArrowDown','ArrowUp','ArrowRight','ArrowLeft'].includes(e.code))e.preventDefault();
    if(e.code==='KeyM'&&!e.repeat){hud.toggleMap();nextHud=0;return;}if(!ready())return;
    if(motion.includes(e.code)){keys.add(e.code);setActive();return;}if(e.repeat)return;
    if(e.code==='Space')jump();if(e.code==='KeyE')interact();if(e.code==='KeyQ')cycleGear();if(e.code==='KeyJ')changeJacket();if(e.code==='Digit1')consume('food');if(e.code==='Digit2')consume('water');});
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInputs);
  document.addEventListener('visibilitychange',()=>{clearInputs();if(document.hidden)audio?.mute();else if(sound&&!paused)audio?.enable();});
  let previous=performance.now();reset();
  function frame(now){const dt=Math.min(.05,Math.max(.0001,(now-previous)/1000));previous=now;
    if(!document.hidden){update(dt);if(!paused){animation+=dt;const drift=climate.snow*(1-.50*localShelter);snowX+=dt*(19+94*drift);snowY+=dt*(26+35*drift);}
      render();if(now>=nextHud){nextHud=now+140;publishHud();}}
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
