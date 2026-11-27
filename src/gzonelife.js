const soundPrefs=(()=>{
  try{
    const saved=JSON.parse(localStorage.getItem('zona-sound')||'{}');
    return Object.fromEntries(['volume','music','nature'].map(k=>[k,Number.isFinite(saved[k])?clamp(saved[k],0,1):1]));
  }catch{return {volume:1,music:1,nature:1};}
})();
function soundSettings(nav,back){
  nav.replaceChildren();
  for(const [key,name] of [['volume','Общая громкость'],['music','Музыка'],['nature','Звуки природы']]){
    const label=el('label','difficulty-label'),input=el('input'),value=el('span');
    input.type='range';input.min=0;input.max=100;input.value=Math.round(soundPrefs[key]*100);
    input.style.cssText='width:100%;min-height:44px';input.setAttribute('aria-label',name);
    const show=()=>{value.textContent=name+' · '+input.value+'%';};show();
    input.oninput=()=>{
      soundPrefs[key]=Number(input.value)/100;show();
      try{localStorage.setItem('zona-sound',JSON.stringify(soundPrefs));}catch{}
      audioInit();if(master)master.gain.value=.55*soundPrefs.volume;
      syncSceneAudio();
    };
    label.append(value,input);nav.append(label);
  }
  nav.append(btn('','Назад',back));
}

const compatibleRifle=id=>id==='w_aksu'||id==='w_akms';
const sights=[{bit:1,id:'optic_module',name:'Оптический прицел',price:1200},{bit:2,id:'laser_module',name:'Лазерный целеуказатель',price:1800}];
for(const mod of sights)ITEMS[mod.id]={n:mod.name,price:mod.price,w:.18,d:'Модуль для АКС-74У и АКМС. Устанавливается в рюкзаке.'};
function sightInstalled(id){return compatibleRifle(id) && primaryGun(id).sights;}
function moduleOffers(){
  return sights.map(mod=>{
    const price=purchaseCost(mod.price);
    return {t:mod.name+' · '+price+' RU',d:S.money<price || !!receiveError(mod.id,1),fn:()=>{
      if(S.money<price || receiveError(mod.id,1))return;
      S.money-=price;addPacked(mod.id,1);say('Держи. Выбери автомат в рюкзаке и поставь модуль в свободный слот.');
    }};
  });
}
function moduleControls(id,index,row){
  if(!compatibleRifle(id))return;
  for(const mod of sights){
    const gun=gunCopy(id,index),mounted=!!(gun.sights & mod.bit);
    const b=btn('wide',mod.name+' · '+(mounted?'снять':has(mod.id)?'установить':'пусто'),()=>{
      if(!cnt(id) || index>=cnt(id))return;
      const current=gunCopy(id,index);
      if(mounted!==!!(current.sights&mod.bit))return;
      if(mounted){
        const cells=packCells({...S.inv,[mod.id]:cnt(mod.id)+1});
        if(cells>PACK_CELLS){panel.hint='Освободи ячейку в рюкзаке.';refresh();return;}
        addPacked(mod.id,1);
      }else if(has(mod.id))take(mod.id,1);else return;
      const changed={...current,sights:(current.sights||0)^mod.bit};
      if(index)spareList(id)[index-1]=changed;else setPrimary(id,changed);
      refresh();
    },!mounted && !has(mod.id));
    row.appendChild(b);
  }
}

function inFurnishedRoom(o,allowRuin=false){
  const x=o.x+o.w/2,y=o.y+o.h/2;
  return HOUSES.some(h=>(allowRuin || !h.ruin) && x>h.x*T && y>h.y*T && x<(h.x+h.w)*T && y<(h.y+h.h)*T &&
    P.x>h.x*T && P.y>h.y*T && P.x<(h.x+h.w)*T && P.y<(h.y+h.h)*T);
}
function sleepAtBed(o){
  if(!o || !inFurnishedRoom(o))return;
  const choices=()=>[...[1,4,8].map(h=>{
    const why=restBlock();
    return {t:why||restLabel('Спать',h*60,'sleep'),d:!!why,fn:()=>{
      if(restBlock()||!inFurnishedRoom(o))return;
      const r=advanceWorldTime(60*h,'sleep');closePanel();msg('Сон · '+fmtH(r.minutes)+'. Сейчас '+clockStr(S.min)+'. '+(r.stop||''),'say');save(true);
    }};
  }),{t:'Встать',close:1}];
  dialog({n:'Спальное место',grp:'Отдых',record:true},['Здесь можно выспаться.'],choices);
}
function ageRemains(){
  for(let i=objs.length-1;i>=0;i--){
    const o=objs[i];if((o.k!=='body' && o.k!=='bones') || o.kind==='sack')continue;
    const age=S.min-o.t;
    if(age<1440)continue;
    if(draggedBody===o)draggedBody=null;
    if(age>=2880){objs.splice(i,1);continue;}
    if(o.k==='body')objs[i]={k:'bones',kind:o.kind,x:o.x,y:o.y,ang:o.ang||0,seed:o.seed||0,t:o.t};
  }
}
function drawBones(o){
  const g=ctx;g.save();g.translate(o.x,o.y);g.rotate(o.ang);
  const length=o.kind==='human'?12:o.kind==='boar'?11:8;
  g.lineCap='round';g.strokeStyle='#555044';g.lineWidth=2.8;
  for(const color of ['#514b3e','#a39679']){
    g.strokeStyle=color;g.lineWidth=color[1]==='5'?2.8:1.35;
    g.beginPath();g.moveTo(-length,0);g.lineTo(length*.55,.9);
    for(let i=0;i<5;i++){
      const x=-3+i*1.7;
      g.moveTo(x,-.3);g.quadraticCurveTo(x-2,-3.5,x-1,-4.3);
      g.moveTo(x,.7);g.quadraticCurveTo(x-1,3.3,x-2,4.4);
    }
    g.moveTo(-6,4);g.lineTo(-length,7);g.moveTo(5,-6);g.lineTo(10,-8);g.stroke();
  }
  g.fillStyle='#a39579';g.beginPath();g.ellipse(length*.88,1.2,3.1,2,0,0,Math.PI*2);g.fill();
  g.fillStyle='#484238';g.fillRect(length*.9,-.1,1.1,1);g.restore();
}
function drawFlyingCrow(c){
  const g=ctx,flap=Math.sin(c.ph),span=10+2.5*flap;
  g.save();g.translate(c.x,c.y);g.rotate(Math.atan2(c.vy,c.vx));
  for(const side of [-1,1]){
    g.save();g.scale(1,side);g.fillStyle='#2e302c';g.beginPath();g.moveTo(2,0);
    g.quadraticCurveTo(3.3,4.1,1.3,span*.65);
    for(let i=0;i<4;i++){g.lineTo(-2.7-i*1.5,span-i*.7);g.lineTo(-2.2-i*1.5,span-2.0-i*.7);}
    g.quadraticCurveTo(-4.2,3.6,-2,0);g.closePath();g.fill();
    g.strokeStyle='#44423a';g.lineWidth=.75;g.beginPath();g.moveTo(.6,1.2);g.lineTo(.8,span*.62);g.stroke();g.restore();
  }
  g.fillStyle='#222420';g.beginPath();g.moveTo(-2.4,-1);g.lineTo(-8,-2.2);g.lineTo(-8.6,2);g.lineTo(-2,.9);g.fill();
  g.beginPath();g.ellipse(0,0,4.5,1.8,0,0,7);g.ellipse(3.8,-.2,1.6,1.4,0,0,7);g.fill();
  g.beginPath();g.moveTo(4.8,-.8);g.lineTo(7,.1);g.lineTo(4.8,.5);g.fill();g.restore();
}
function reloadSound(id,rounds=2){return WP[id]?.ammo==='a12'?(BEREZKI && rounds===1?'loadShellOne':'loadShell'):compatibleRifle(id)?'loadRifle':'loadPistol';}

const campStories=[
  ['У кого вчера часы утащили?','У меня. Теперь вор точно знает, сколько ему осталось.'],
  ['На насыпи всю ночь кто-то стучал. По три раза.','Я там ночевал. Котелок с ветки снять пытался.'],
  ['До дождя успеем дойти?','До первого точно. А их тут сегодня штуки три.']
];
const songBook=[
  ['latePicking','Последний перебор'],['riverWaltz','Вальс у переправы'],['emberSong','Дым над золою'],['roadSong','Дремлет дорога']
];
let campAct=null,campDelay=18,campIndex=0,radioAudio=null,playerSong=null;
function stopPlayingGuitar(){
  if(!playerSong)return;
  stopScene(playerSong);
  playerSong=null;P.sit=0;campDelay=35;
}
function playerSongOptions(){
  if(S.weapon!=='guitar' || !has('guitar'))return [];
  return songBook.map(([track,title])=>({t:'Сыграть · '+title,fn:()=>{
    const fire=WORLD_FIRES.find(f=>dE(f,P)<52);
    if(!fireLit(fire) || S.weapon!=='guitar' || !has('guitar') || S.blow?.stage){sys('Сейчас не до песен.');return;}
    const clip=sceneClip(track,.42,'music',P);
    if(!clip){sys('Инструмент ещё настраивается. Попробуй через секунду.');return;}
    stopPlayingGuitar();stopScene(campAct?.clip);campAct=null;
    closePanel();playerSong=clip;P.sit=1;P.fireRef=fire;P.ang=Math.atan2(fire.y-P.y,fire.x-P.x);
    msg('Играешь «'+title+'». Двинься, чтобы встать.','say');
  }}));
}
function stopScene(sound){
  if(!sound)return;
  try{sound.source.stop();}catch{}
}
function sceneClip(name,volume,group,actor,loop=false){
  const buffer=fieldBuffers.get(name);
  if(!AC || !buffer)return null;
  const source=AC.createBufferSource(),gain=AC.createGain();source.buffer=buffer;source.loop=loop;
  const clip={source,gain,volume,group,actor,done:false};
  gain.gain.value=0;source.connect(gain);gain.connect(master);
  source.onended=()=>{clip.done=true;source.disconnect();gain.disconnect();};
  source.start();mixScene(clip);return clip;
}
function mixScene(s){
  if(!s||s.done||!P)return;
  const distance=s.actor?Math.max(0,1-dE(s.actor,P)/270):1;
  s.gain.gain.setTargetAtTime(s.volume*soundPrefs[s.group]*distance*distance,AC.currentTime,.06);
}
function syncSceneAudio(){mixScene(playerSong);mixScene(radioAudio);mixScene(campAct?.clip);}
function resetCampAudio(){
  stopPlayingGuitar();stopScene(campAct?.clip);stopScene(radioAudio);
  campAct=radioAudio=null;campDelay=18;campIndex=0;
}
function atFire(e){
  return e?.alive && e.sit && !e.wounded && !e.captive && !e.tgt && !e.evacuating &&
    fireLit(e.fireRef) && dE(e,e.fireRef)<80 && dE(e,P)<255;
}
function campAndRadio(dt){
  if(playerSong && (!fireLit(P.fireRef) || playerSong.done || !P.alive || S.weapon!=='guitar' || !has('guitar') ||
    IN.moveX || IN.moveY || S.blow?.stage || P.flash>0 || dE(P,P.fireRef)>56))stopPlayingGuitar();
  const underground=inBunker(P.x,P.y);
  if(underground && !radioAudio){radioAudio=sceneClip('deskRadio',.22,'music',byS('sid'),true);}
  if(!underground && radioAudio){stopScene(radioAudio);radioAudio=null;}
  syncSceneAudio();
  const quiet=!underground && !loftAt(P) && !S.blow?.stage && WX.rain<.6 && !playerSong;
  if(campAct){
    const act=campAct;
    if(!quiet || !atFire(act.actor)){stopScene(act.clip);campAct=null;campDelay=16;return;}
    if(act.music && !act.clip.done)return;
    if(!act.music && (act.wait-=dt)>0)return;
    if(act.reply && atFire(act.reply))act.reply.bub={t:act.lines[1],life:4};
    campAct=null;campDelay=rnd(38,65);return;
  }
  if(!quiet||!AC||(campDelay-=dt)>0)return;
  campDelay=6;
  const seats=ents.filter(e=>e!==P && atFire(e)).sort((a,b)=>dE(a,P)-dE(b,P));
  if(!seats.length)return;
  const actor=seats[campIndex%seats.length],reply=seats.find(e=>e!==actor && dE(e,actor)<105);
  const music=campIndex%2===1 || !reply;
  const lines=campStories[Math.floor(campIndex/2)%campStories.length];
  const clip=music?sceneClip(songBook[Math.floor(campIndex/2)%2][0],.18,'music',actor):null;
  if(music && !clip)return;
  if(!music)actor.bub={t:lines[0],life:4};
  campAct={actor,reply:music?null:reply,music,lines,clip,wait:4.2};campIndex++;

}
function holdsGuitar(e){return e===P?S.weapon==='guitar':campAct?.actor===e && campAct.music;}
function guitarHands(e){
  const strum=e.sit?Math.sin(G7.vt*7)*1.25:0;
  return [[-4.3,9+strum],[8.4,5.3]];
}
// The player's inventory illustration is rotated to lie across the torso.
// Its soundhole and frets align with the same two sockets used by the sleeves.
function paintGuitar(g){
  const im=packImage('assets/field/item_guitar.svg');
  if(!im)return;
  g.save();g.translate(-4.3,9);g.rotate(Math.PI/3-.26);
  g.scale(.41,.41);g.translate(-27,-48);g.drawImage(im,0,0,76,84);g.restore();
}
function seatedGuitar(g,e){
  paintGuitar(g);
  const hands=guitarHands(e);
  for(const [i,[x,y]] of hands.entries()){
    const side=i?1:-1;
    beam(g,side*8,5,x,y,3.4,'#5c5443');
    g.fillStyle='#9c876c';g.beginPath();g.ellipse(x,y,1.9,1.55,-.3,0,Math.PI*2);g.fill();
  }
}

function drawDeskRadio(){
  const g=ctx, sid=byS('sid');if(!sid)return;
  g.save();g.translate(sid.x+35,SHOP_ROOM.counterY*T-4);g.rotate(-.08);
  g.fillStyle='#302c24';g.fillRect(-10,-5,21,11);g.fillStyle='#66583f';g.fillRect(-10,-6,20,9);
  g.fillStyle='#35362c';g.fillRect(-8,-4,11,5);
  g.fillStyle='#887a5b';for(let i=0;i<5;i++)g.fillRect(i*2-7,-3,.7,3);
  g.fillStyle='#c5a166';g.fillRect(5,-3,3,1);g.fillStyle='#302e29';g.fillRect(6,0,2,2);
  g.strokeStyle='#777566';g.lineWidth=.75;g.beginPath();g.moveTo(6,-5);g.lineTo(11,-12);g.stroke();g.restore();
}
