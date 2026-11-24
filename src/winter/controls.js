let lastHud=-1000,lastSave=performance.now(),mapDrawn=false;
const aim={active:false,a:0,fire:false,id:null};
function deathMenu(){panel('Вы замёрзли или получили смертельное ранение',box=>{
  for(const i of ['auto',1,2,3]){const s=readSlot(i);if(s)btn(box,'Загрузить '+(i==='auto'?'автосохранение':i),()=>{restoreState(s);modal.close();});}
  btn(box,'Начать в Берёзках',()=>{restoreState(newWinterState(state.difficulty));modal.close();});
});}
function refreshHud(){
  hudRadar();
  const near=state.room<0?winterMap.places.slice().sort((a,b)=>Math.hypot(a[2]-player.x,a[3]-player.y)-Math.hypot(b[2]-player.x,b[3]-player.y))[0]:null;
  $('place').textContent=wide?'Сотый километр':state.floor===0?'Подземный переход':near?near[1]:roomPlace(state.room,state.floor);
  $('clock').textContent=clockText(state.clock);$('money').textContent=state.money+' ₽';
  $('stats').textContent='Тепло '+Math.round(state.warmth)+'%'+(state.wet>1?' · Намокание '+Math.round(state.wet)+'%':'');
  $('s-bleed').classList.toggle('on',state.wet>1);$('s-bleed').title='Намокание';
  $('s-rad').classList.toggle('on',state.radiation>1);
  for(const [id,value] of [['hp',state.hp],['st',state.stamina],['fd',state.food]]){
    $(id+'b').style.width=value+'%';$(id+'v').textContent=Math.ceil(value);
  }
  $('mini-people').textContent=state.room<0?people.filter(n=>!n.animal&&actorLife(n).hp>0&&Math.hypot(n.x-player.x,n.y-player.y)<6).length:0;
  $('mb-m').textContent=state.inventory.medkit||0;$('mb-b').textContent=state.inventory.bandage||0;
  const act=actionAt();$('act').hidden=!act;if(act)$('act').textContent=act.name;
  const weapon=WP[state.held],icon=handIcons['item_'+state.held]||(weapon?.ammo?handIcons[weapon.ammo==='a9'?'item_w_pm':'item_w_aksu']:null);
  $('medpick').hidden ||= wide;
  $('wn').textContent=heldName();$('am').textContent=weapon?.ammo?(state.rounds[state.held]||0)+' / '+(state.inventory[weapon.ammo]||0):'';
  $('wico').style.backgroundImage=icon?'url("'+icon+'")':'none';
  $('wcn').textContent=weapon?.ammo?'Состояние '+Math.round(state.wear?.[state.held]??100)+'%':'';
  $('wcb').style.width=(weapon?.ammo?state.wear?.[state.held]??100:0)+'%';
  $('stance').setAttribute('aria-pressed',String(state.crouch));$('lamp').setAttribute('aria-pressed',String(state.lamp));
  $('reload').hidden=!WP[state.held]?.ammo;$('fire').hidden=!WP[state.held]&&state.held!=='grenade';if(performance.now()>notice.until)$('details').hidden=true;
}
function interactHere(){if(!wide&&state.hp>0&&!modal.open)actionAt()?.do();}
const handIcons=__HAND_ICONS__;
let touchRun=false;
$('b-run').onpointerdown=e=>{touchRun=true;e.currentTarget.setPointerCapture(e.pointerId);};
$('b-run').onlostpointercapture=()=>touchRun=false;
function heal(k){
  if(!state.inventory[k]){notice('Нет в рюкзаке');return;}
  if(state.hp>=100){notice('Здоровье полное');return;}
  give(k,-1);state.hp=Math.min(100,state.hp+(k==='medkit'?50:15));refreshHud();
}
$('b-bolt').onclick=tossProbe;
$('b-med').onclick=()=>{const pick=$('medpick');pick.hidden=!pick.hidden;
  $('mp-bn').textContent=state.inventory.bandage||0;$('mp-mn').textContent=state.inventory.medkit||0;};
for(const k of ['bandage','medkit'])$('mp-'+k).onclick=()=>{heal(k);$('medpick').hidden=true;};
$('jump').onclick=jumpNow;$('act').onclick=interactHere;$('hand').onclick=cycleHand;$('stance').onclick=()=>{state.crouch=!state.crouch;};
$('lamp').onclick=()=>{state.lamp=!state.lamp;notice(state.lamp?'Фонарь включён':'Фонарь выключен');};
$('reload').onclick=reload;$('bag').onclick=bag;$('menu').onclick=menu;$('close').onclick=()=>modal.close();
modal.addEventListener('close',()=>{keys.clear();aim.active=false;});
function pointAim(e){
  const dx=e.clientX-viewW/2,dy=e.clientY-viewH/2;aim.a=Math.atan2(dy,dx);
}
cv.onpointerdown=e=>{if(wide||e.pointerType==='touch'||e.button!==0)return;pointAim(e);aim.active=aim.fire=true;cv.setPointerCapture(e.pointerId);};
cv.addEventListener('pointerdown',e=>{
  if(wide||e.pointerType!=='touch'||!state.controls?.tap||!WP[state.held]?.ammo||state.room>=0)return;
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

  const len=Math.hypot(x,y);trigger.style.setProperty('--aim-x',x/Math.max(1,len)*Math.min(len,14)+'px');trigger.style.setProperty('--aim-y',y/Math.max(1,len)*Math.min(len,14)+'px');aim.a=len>3?Math.atan2(y,x):player.a;aim.active=len>3;aim.fire=(!state.controls?.tap||!WP[state.held]?.ammo)&&len>=Math.min(rect.width,rect.height)*.41;
}
trigger.onpointerdown=e=>{if(aim.id!==null)return;aim.id=e.pointerId;trigger.setPointerCapture(e.pointerId);stickAim(e);};
trigger.onpointermove=e=>{if(aim.id===e.pointerId)stickAim(e);};
trigger.onlostpointercapture=()=>{aim.id=null;aim.active=aim.fire=false;trigger.style.removeProperty('--aim-x');trigger.style.removeProperty('--aim-y');};
window.addEventListener('blur',()=>{aim.active=aim.fire=false;});
window.addEventListener('keydown',e=>{
  if(modal.open||document.body.classList.contains('layout-edit')||e.repeat||wide)return;
  if(e.code==='KeyB')heal('bandage');if(e.code==='KeyF')tossProbe();if(e.code==='KeyG')throwGrenade();
  if((e.code==='Space'||e.code==='KeyV')){e.preventDefault();jumpNow();}
  if(e.code==='KeyE')interactHere();if(e.code==='Tab'||e.code==='KeyI'){e.preventDefault();bag();}
  if(e.code==='KeyC')$('stance').click();if(e.code==='KeyR')reload();if(e.code==='KeyL')$('lamp').click();
  if(e.code==='KeyQ')heal('medkit');if(e.code==='KeyX')cycleHand();if(e.code==='Escape')menu();
});
// Browsers synthesize click only for the primary finger. Accept a second finger
// on action buttons while the first one owns the movement stick.
for(const id of ['lamp','stance','jump','reload','b-med','mp-medkit','mp-bandage','b-bolt','act','hand','bag','menu','map']){
  const button=$(id);
  let secondary=null,handled=null;
  button.addEventListener('pointerdown',e=>{
    handled=null;
    if(e.pointerType!=='touch'||e.isPrimary||secondary!==null)return;
    secondary=e.pointerId;button.setPointerCapture(e.pointerId);e.preventDefault();
  });
  button.addEventListener('pointerup',e=>{
    if(e.pointerId!==secondary)return;
    handled=e.pointerId;secondary=null;const r=button.getBoundingClientRect();
    if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)button.click();
  });
  button.addEventListener('lostpointercapture',e=>{if(e.pointerId===secondary)secondary=null;});
  button.addEventListener('click',e=>{if(e.isTrusted&&handled!==null&&e.pointerId===handled)e.stopImmediatePropagation();},true);
}
document.body.classList.toggle('is-touch',navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches);
document.body.classList.add('walking');$('legend').hidden=true;
const auto=readSlot('auto');if(auto)restoreState(auto);else saveSlot('auto');
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.hp>0)saveSlot('auto');});
window.addEventListener('resize',resize);resize();refreshHud();Promise.all([loadMaterials(),landscapeAtlas.decode(),furnishingAtlas.decode(),roofAtlas.decode(),yardArt.decode()]).then(()=>{
  prepareLandscape();prepareScenery();worldSolids();settleSavedPosition();ground=overviewGround();
}).catch(()=>{ground=groundArt();}).finally(()=>requestAnimationFrame(frame));
