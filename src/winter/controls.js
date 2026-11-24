let lastHud=-1000,lastSave=performance.now(),mapDrawn=false;
const aim={active:false,a:0,fire:false,id:null};
function deathMenu(){panel('Вы замёрзли или получили смертельное ранение',box=>{
  for(const i of ['auto',1,2,3]){const s=readSlot(i);if(s)btn(box,'Загрузить '+(i==='auto'?'автосохранение':i),()=>{restoreState(s);modal.close();});}
  btn(box,'Начать в Берёзках',()=>{restoreState(newWinterState(state.difficulty));modal.close();});
});}
function refreshHud(){
  hudRadar();
  const near=state.room<0?winterMap.places.slice().sort((a,b)=>Math.hypot(a[2]-player.x,a[3]-player.y)-Math.hypot(b[2]-player.x,b[3]-player.y))[0]:null;
  $('place').textContent=wide?'Сотый километр':near?near[1]:roomPlace(state.room,state.floor);
  $('stats').textContent=clockText(state.clock)+' · Тепло '+Math.round(state.warmth)+'% · Здоровье '+Math.ceil(state.hp)+'%'+(state.radiation>1?' · Облучение '+Math.round(state.radiation)+'%':'')+
    (state.wet>=1?' · Намокание '+Math.round(state.wet)+'%':'')+(isMarsh()?' · Вязкая трясина':'')+(state.stamina<95?' · Силы '+Math.round(state.stamina)+'%':'');
  const act=actionAt();$('act').hidden=!act;if(act)$('act').textContent=act.name;
  $('hand').textContent=heldName()+(WP[state.held]?.ammo?' '+(state.rounds[state.held]||0)+'/'+(state.inventory[WP[state.held].ammo]||0):'');
  $('stance').textContent=state.crouch?'Встать':'Присесть';$('lamp').setAttribute('aria-pressed',String(state.lamp));
  $('reload').hidden=!WP[state.held]?.ammo;$('fire').hidden=!WP[state.held];if(performance.now()>notice.until)$('details').hidden=true;
}
function interactHere(){if(!wide&&state.hp>0&&!modal.open)actionAt()?.do();}
$('more').onclick=()=>panel('Действия',box=>{
  btn(box,'Проверить поверхность грузиком',()=>{modal.close();tossProbe();},state.room>=0);
  btn(box,'Управление и звук',fieldSettings);
});
$('jump').onclick=jumpNow;$('act').onclick=interactHere;$('hand').onclick=cycleHand;$('stance').onclick=()=>{state.crouch=!state.crouch;};
$('lamp').onclick=()=>{state.lamp=!state.lamp;notice(state.lamp?'Фонарь включён':'Фонарь выключен');};
$('reload').onclick=reload;$('bag').onclick=bag;$('menu').onclick=menu;$('close').onclick=()=>modal.close();
modal.addEventListener('close',()=>{keys.clear();aim.active=false;});
function pointAim(e){
  const dx=e.clientX-viewW/2,dy=e.clientY-viewH/2;aim.a=Math.atan2(dy,dx);
}
cv.onpointerdown=e=>{if(wide||e.pointerType==='touch'||e.button!==0)return;pointAim(e);aim.active=aim.fire=true;cv.setPointerCapture(e.pointerId);};
cv.addEventListener('pointerdown',e=>{
  if(wide||e.pointerType!=='touch'||!state.controls?.tap||state.room>=0)return;
  const v=view();let best=null,range=30;
  for(const n of people){const l=actorLife(n);if(l.hp<=0||!(n.enemy||l.angry))continue;
    const [x,y]=screen(l.x,l.y,v),d=Math.hypot(e.clientX-x,e.clientY-y);if(d<range){best=l;range=d;}}
  if(best){aim.a=Math.atan2(best.y-player.y,best.x-player.x);aim.active=aim.fire=aim.tap=true;}
});
cv.onpointermove=e=>{if(aim.active&&e.pointerType!=='touch')pointAim(e);};
cv.onlostpointercapture=()=>{aim.active=aim.fire=false;};
const trigger=$('fire');
function stickAim(e){
  const rect=trigger.getBoundingClientRect(),x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;
  if(state.controls?.tap){aim.active=aim.fire=false;return;}
  const len=Math.hypot(x,y);aim.a=len>3?Math.atan2(y,x):player.a;aim.active=len>3;aim.fire=len>=Math.min(rect.width,rect.height)*.41;
}
trigger.onpointerdown=e=>{aim.id=e.pointerId;trigger.setPointerCapture(e.pointerId);stickAim(e);};
trigger.onpointermove=e=>{if(aim.id===e.pointerId)stickAim(e);};
trigger.onlostpointercapture=()=>{aim.id=null;aim.active=aim.fire=false;};
window.addEventListener('blur',()=>{aim.active=aim.fire=false;});
window.addEventListener('keydown',e=>{
  if(modal.open||e.repeat||wide)return;
  if(e.code==='KeyB')tossProbe();
  if(e.code==='Space'){e.preventDefault();jumpNow();}
  if(e.code==='KeyE')interactHere();if(e.code==='Tab'||e.code==='KeyI'){e.preventDefault();bag();}
  if(e.code==='KeyC')$('stance').click();if(e.code==='KeyR')reload();if(e.code==='KeyF')$('lamp').click();
  if(e.code==='KeyQ')cycleHand();if(e.code==='Escape')menu();
});
document.body.classList.add('walking');$('legend').hidden=true;
const auto=readSlot('auto');if(auto)restoreState(auto);else saveSlot('auto');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.hp>0)saveSlot('auto');});
window.addEventListener('resize',resize);resize();refreshHud();Promise.all([loadMaterials(),landscapeAtlas.decode(),furnishingAtlas.decode(),roofAtlas.decode(),yardArt.decode()]).then(()=>{
  prepareLandscape();prepareScenery();ground=overviewGround();
}).catch(()=>{ground=groundArt();}).finally(()=>requestAnimationFrame(frame));
