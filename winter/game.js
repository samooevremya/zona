"use strict";
(() => {
  const W=window.world, screen=document.getElementById('scene'), c=screen.getContext('2d');
  const keys=new Set(), axes={x:0,y:0}, gearNames={empty:'Пустые руки',knife:'Нож',rifle:'Карабин'};
  let aimHeading=null;
  let p, indoor=null, exitPoint=null, paused=false, touchRun=false, started=false;
  let width=1,height=1,scale=1,dpr=1,camera={x:0,y:0},elapsed=0,animation=0,nextHud=0;
  let trail=[],routeTime=0,finished=false,routeRunning=false,near={},sound=false;
  const climate=[
    ['Пасмурно',0.14,0],['Снег',0.48,-2],['Метель',1,-7],['Снег стихает',0.35,-2],['Ясно',0.03,1]
  ];
  const snow=Array.from({length:195},(_,i)=>({x:((i*317)%499)/499,y:((i*443)%521)/521,z:.45+((i*17)%41)/34}));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const formatTime=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');
  const gameClock=()=> (15*60+10+elapsed*1.65)%1440;
  let outside=-12,visualWind=.14,weather='Пасмурно',dark=0;
  function climateTick(){
    const minutes=gameClock(),night=(1-Math.cos((minutes-780)/1440*2*Math.PI))/2;
    const phase=Math.floor(elapsed/65)%climate.length, now=climate[phase],before=climate[(phase+climate.length-1)%climate.length],t=clamp((elapsed%65)/10,0,1);
    visualWind=elapsed<65?now[1]:before[1]+(now[1]-before[1])*t;
    outside=Math.round(-10-15*night+(elapsed<65?now[2]:before[2]+(now[2]-before[2])*t));
    dark=clamp((night-.30)*.86,0,.62);weather=now[0];
  }
  function reset(){
    p={x:W.gate.x,y:W.gate.y,heading:-Math.PI/2,phase:0,speed:0,jump:0,jumpV:0,gear:'empty',health:100,warmth:83,food:87,water:89,rations:2,bottles:2};
    camera={x:p.x,y:p.y};indoor=null;exitPoint=null;elapsed=0;started=false;finished=false;routeRunning=false;routeTime=0;trail=[];near={};
    paused=false;clearInputs();climateTick();nextHud=0;
  }
  function clearInputs(){keys.clear();aimHeading=null;axes.x=0;axes.y=0;touchRun=false;if(p)p.speed=0;}
  function ready(){return !paused&&p.health>0;}
  function setActive(){if(ready())started=true;}
  function jump(){if(!ready()||p.jump>0||p.jumpV!==0)return;setActive();p.jumpV=3.0;}
  function cycleGear(){if(!ready())return;const gears=Object.keys(gearNames);p.gear=gears[(gears.indexOf(p.gear)+1)%gears.length];nextHud=0;}
  function consume(kind){
    if(!ready())return;const food=kind==='food',count=food?'rations':'bottles',stat=food?'food':'water';
    if(!p[count]){hud.toast(food?'Паёк закончился':'Вода закончилась');return;}
    if(p[stat]>98){hud.toast(food?'Вы сыты':'Вы уже напились');return;}
    setActive();p[count]--;p[stat]=Math.min(100,p[stat]+(food?34:40));hud.toast(food?'Вы съели паёк':'Вы выпили воду');nextHud=0;
  }
  function nearestPlace(){
    if(indoor)return indoor.name;
    let best=null,min=Infinity;for(const q of W.places){const d=Math.hypot(q[1]-p.x,q[2]-p.y);if(d<min){min=d;best=q;}}
    return min<25?best[0]:'Лесная дорога';
  }
  function interact(){if(!ready())return;setActive();
    if(indoor){if(p.y<1.8||Math.abs(p.x)>2.3){hud.toast('Выход у южной стены');return;}
      p.x=exitPoint.x;p.y=exitPoint.y;indoor=null;camera={x:p.x,y:p.y};}
    else{near=W.nearby(p.x,p.y);if(near.door){exitPoint={x:near.door.x,y:near.door.y+1.4};indoor=near.door;p.x=0;p.y=2.6;p.heading=-Math.PI/2;camera={x:0,y:0};}
      else if(near.fire){hud.toast('Пока вы у огня, запас тепла растёт');}else{hud.toast('Подойдите к двери или костру');}}
    nextHud=0;
  }
  let audio;
  function toggleSound(){sound=!sound;if(sound){audio=audio||createAudio();audio.enable();}else audio?.mute();nextHud=0;}
  function createAudio(){
    let wind,fire,wood,ice;const steps=[];const factory=(src,loop=false)=>{const a=new Audio('audio/'+src);a.loop=loop;a.preload='auto';return a;};
    const play=a=>{if(a.paused)a.play().catch(()=>{});};
    return {enable(){if(!wind){wind=factory('wind.ogg',true);fire=factory('fire.ogg',true);wood=factory('wood1.ogg');ice=factory('ice1.ogg');for(const file of ['snow1.ogg','snow2.ogg'])steps.push(factory(file));}if(wind){wind.volume=.13;play(wind);}if(fire){fire.volume=0;play(fire);}},
      mute(){[wind,fire,wood,ice,...steps].filter(Boolean).forEach(a=>a.pause());},
      tick(){if(!sound||paused||document.hidden)return;if(wind){wind.volume=indoor?.025:.12+visualWind*.42;play(wind);}if(fire){const d=indoor?1:Math.min(...W.points.filter(o=>o.type==='fire').map(o=>Math.hypot(o.x-p.x,o.y-p.y)));fire.volume=.46*clamp(1-d/9,0,1);}},
      step(){if(!sound||!steps.length)return;const a=indoor?wood:W.lake(p.x,p.y)?ice:steps[Math.floor(Math.random()*steps.length)];a.currentTime=0;a.volume=.48;a.playbackRate=.94+Math.random()*.12;play(a);}
    };
  }
  function update(dt){
    if(!ready()||!started)return;
    elapsed+=dt;climateTick();
    let dx=axes.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    let dy=axes.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}
    let sp=touchRun||keys.has('ShiftLeft')||keys.has('ShiftRight')?3.5:1.6;if(indoor)sp=Math.min(sp,2);
    const ox=p.x,oy=p.y,nx=p.x+dx*sp*dt,ny=p.y+dy*sp*dt;
    if(indoor){p.x=clamp(nx,-4.6,4.6);p.y=clamp(ny,-3.5,3.2);}
    else{if(!W.blocked(nx,p.y))p.x=nx;if(!W.blocked(p.x,ny))p.y=ny;}
    const distance=Math.hypot(p.x-ox,p.y-oy);p.speed=distance/dt;
    if(distance>.0001||aimHeading!==null){const intended=aimHeading??Math.atan2(dy,dx);p.heading+=Math.atan2(Math.sin(intended-p.heading),Math.cos(intended-p.heading))*Math.min(1,dt*16);}
    if(p.jump>0||p.jumpV>0){p.jumpV-=9.8*dt;p.jump+=p.jumpV*dt;if(p.jump<=0){p.jump=0;p.jumpV=0;}}
    const prevStep=Math.floor(p.phase/Math.PI),stride=.32+.20*clamp((p.speed-1.7)/1.9,0,1);p.phase+=distance*Math.PI/(2*stride);
    if(Math.floor(p.phase/Math.PI)!==prevStep&&p.jump<.05){
      audio?.step();if(!indoor){const side=prevStep%2?.12:-.12;trail.push({x:p.x-Math.sin(p.heading)*side,y:p.y+Math.cos(p.heading)*side,a:p.heading,t:elapsed});if(trail.length>200)trail.shift();}
    }
    near=indoor?{}:W.nearby(p.x,p.y);
    if(!routeRunning&&!finished&&!indoor&&Math.hypot(p.x-W.gate.x,p.y-W.gate.y)>.12)routeRunning=true;
    if(routeRunning){routeTime+=dt;if(!indoor&&Math.hypot(p.x-W.entrance.x,p.y-W.entrance.y)<1.0){finished=true;routeRunning=false;hud.toast('Станция · время в пути '+formatTime(routeTime));}}
    const loss=(.26+Math.abs(outside)*.014+visualWind*.17)*(1+(p.food<25?.25:0));
    p.warmth=clamp(p.warmth+dt*(indoor?1.05:near.fire?1.7:-loss),0,100);p.food=clamp(p.food-dt*(sp>2?.13:.08),0,100);p.water=clamp(p.water-dt*(sp>2?.21:.13),0,100);
    if(p.warmth<=0||p.food<=0||p.water<=0)p.health=Math.max(0,p.health-dt*.95);
    if(!p.health){clearInputs();nextHud=0;}
    if(!indoor){const blend=1-Math.exp(-dt*7);camera.x+=(p.x-camera.x)*blend;camera.y+=(p.y-camera.y)*blend;}
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
    screenTransform();c.fillStyle='#343738';c.fillRect(0,0,width,height);worldTransform();
    c.fillStyle='#514b40';c.fillRect(-5.5,-5.2,11,9.6);
    for(let i=0;i<28;i++){const y=-4+i*.29;c.fillStyle=['#766851','#80715a','#8b7a60','#796c59'][i%4];c.fillRect(-5,y,10,.278);}
    c.fillStyle='#453e34';c.fillRect(-5.4,-5,10.8,1.45);c.fillStyle='#b69565';c.fillRect(-3.7,-4.86,1.6,1.13);
    c.fillStyle='#373d3c';c.fillRect(2,-3.94,1.1,1.35);c.fillStyle='#f4a957';c.fillRect(2.17,-3.35,.7,.36);
    c.fillStyle='#50483c';c.fillRect(-4.7,-2.8,2.4,1.2);c.fillStyle='#9d8769';c.fillRect(-4.7,-3,2.4,1.03);
    c.fillStyle='#554c40';c.fillRect(-5.4,3.55,4.25,.65);c.fillRect(1.15,3.55,4.25,.65);c.fillStyle='#beac84';c.fillRect(-1.15,3.48,2.3,.18);
    const light=c.createRadialGradient(2.55,-3,0,2.55,-3,5);light.addColorStop(0,'rgba(255,175,78,.26)');light.addColorStop(1,'rgba(255,175,78,0)');c.fillStyle=light;c.fillRect(-5,-5,10,9);
    actor(p.x,p.y,{...p,time:animation});
  }
  function render(){
    size();screenTransform();c.fillStyle='#bdc7cc';c.fillRect(0,0,width,height);
    if(indoor){insideScene();return;}
    worldTransform();W.drawGround(c,camera.x,camera.y,width/scale*.52,height/scale/W.squash*.62);
    for(const m of trail){if(Math.abs(m.x-camera.x)>width/scale*.55||Math.abs(m.y-camera.y)>height/scale)continue;c.save();c.translate(m.x,m.y);c.rotate(m.a);W.oval(c,0,0,.14,.063,'rgba(89,100,101,'+clamp(.43-(elapsed-m.t)/140,0,.43)+')');c.restore();}
    const visible=W.points.filter(o=>sx(o.x)>-o.w*scale&&sx(o.x)<width+o.w*scale&&sy(o.y)>-25&&sy(o.y)<height+o.w*scale*2.2);
    const npcY=100+Math.sin(elapsed*.15)*.4;
    visible.push({type:'player',x:p.x,y:p.y},{type:'npc',x:149,y:npcY});
    visible.sort((a,b)=>a.y-b.y);
    for(const o of visible){
      if(o.type==='player')actor(o.x,o.y,{...p,time:animation});
      else if(o.type==='npc'){if(Math.abs(o.y-camera.y)<28)actor(o.x,o.y,{heading:.2,time:animation,phase:elapsed*2.4,speed:0,jump:0,gear:'empty'});}
      else{const distX=Math.abs(p.x-o.x), obscures=o.y>p.y&&o.y-p.y<o.w*1.5&&distX<o.w*.48;
        c.globalAlpha=obscures?.49:1;W.prop(c,o,animation);c.globalAlpha=1;}
    }
    screenTransform();
    if(dark>0){c.fillStyle='rgba(23,39,65,'+dark+')';c.fillRect(0,0,width,height);}
    if(visualWind>.20){c.fillStyle='rgba(221,229,231,'+(visualWind*.18)+')';c.fillRect(0,0,width,height);}
    const count=Math.floor((width<800?100:175)*visualWind);c.strokeStyle='rgba(253,254,252,.68)';c.lineWidth=1.1;
    c.beginPath();for(let i=0;i<count;i++){const f=snow[i],x=((f.x*width+animation*(19+visualWind*94)*f.z)%(width+10))-5;
      const y=((f.y*height+animation*(26+35*visualWind)*f.z)%(height+10))-5;c.moveTo(x,y);c.lineTo(x+f.z*(1+visualWind*3),y+f.z*2.1);}c.stroke();
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
    for(const y of W.railsY){m.fillStyle='#272d2b';m.fillRect(0,y-.45,W.width,.9);}
    for(const o of W.buildings){m.fillStyle=o.heated?'#c2b7a0':'#919087';m.fillRect(o.x-o.solidW/2,o.y-o.solidD,o.solidW,o.solidD);}
    for(const o of W.points){if(o.type==='fire')W.oval(m,o.x,o.y,full?1.5:.65,full?1.5:.65,'#eda751');}m.restore();
    if(full){m.font='600 '+(w<430?'10':'12')+'px sans-serif';m.textAlign='center';m.textBaseline='middle';
      for(const [name,x,y] of W.places){let label=name.replace('Станция «Сотый километр»','Станция').replace('Разрушенная военная база','Военная база');
        const tw=m.measureText(label).width+7,tx=clamp(px(x),tw/2+2,w-tw/2-2),ty=py(y)+8;m.fillStyle='rgba(27,31,28,.88)';m.fillRect(tx-tw/2,ty-7,tw,15);m.fillStyle='#f3e5c9';m.fillText(label,tx,ty+1);}}
    m.save();m.translate(px(pos.x),py(pos.y));m.rotate(p.heading);m.beginPath();m.moveTo(7,0);m.lineTo(-5,-4.5);m.lineTo(-3,0);m.lineTo(-5,4.5);m.closePath();m.fillStyle='#f4c66c';m.fill();m.strokeStyle='#29251d';m.lineWidth=1;m.stroke();m.restore();
  }
  function publishHud(){
    const minutes=gameClock(),clock=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(Math.floor(minutes%60)).padStart(2,'0');
    near=indoor?{}:W.nearby(p.x,p.y);
    const context=indoor?(p.y>=1.8&&Math.abs(p.x)<=2.3?'Выйти':''):near.door?'Войти':near.fire?'Костёр':'';
    const route=finished?'Станция · '+formatTime(routeTime):'До станции · '+Math.round(Math.hypot((indoor?exitPoint.x:p.x)-W.entrance.x,(indoor?exitPoint.y:p.y)-W.entrance.y))+' м'+(routeRunning?' · '+formatTime(routeTime):'');
    hud.update({...p,temp:outside,time:clock,weather,gear:gearNames[p.gear],place:nearestPlace(),route,context,sound,dead:p.health<=0});
    mapDraw(document.getElementById('minimap'),false);if(hud.mapOpen())mapDraw(document.getElementById('map'),true);audio?.tick();
  }
  window.game={move(x,y){axes.x=x;axes.y=y;if(x||y)setActive();},aim(x,y){if(ready()){aimHeading=Math.hypot(x,y)>.05?Math.atan2(y,x):null;if(aimHeading!==null){p.heading=aimHeading;setActive();}}},
    sprint(on){touchRun=on;},jump,interact,cycleGear,consume,toggleSound,reset,pause(on){paused=on;clearInputs();if(on)audio?.mute();else if(sound)audio?.enable();nextHud=0;}};
  screen.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&e.buttons===1&&ready())game.aim(e.clientX-sx(p.x),(e.clientY-sy(p.y))/W.squash);});
  window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')aimHeading=null;});
  const motion=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
  window.addEventListener('keydown',e=>{if(['Space','ArrowDown','ArrowUp','ArrowRight','ArrowLeft'].includes(e.code))e.preventDefault();
    if(e.code==='KeyM'&&!e.repeat){hud.toggleMap();nextHud=0;return;}if(!ready())return;
    if(motion.includes(e.code)){keys.add(e.code);setActive();return;}if(e.repeat)return;
    if(e.code==='Space')jump();if(e.code==='KeyE')interact();if(e.code==='KeyQ')cycleGear();if(e.code==='Digit1')consume('food');if(e.code==='Digit2')consume('water');});
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInputs);
  document.addEventListener('visibilitychange',()=>{clearInputs();if(document.hidden)audio?.mute();else if(sound&&!paused)audio?.enable();});
  let previous=performance.now();reset();
  function frame(now){const dt=Math.min(.05,Math.max(.0001,(now-previous)/1000));previous=now;
    if(!document.hidden){update(dt);if(!paused)animation+=dt;render();if(now>=nextHud){nextHud=now+140;publishHud();}}
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
