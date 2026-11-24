const soundPrefs=(()=>{
  try{
    const saved=JSON.parse(localStorage.getItem('zona-sound')||'{}');
    return Object.fromEntries(['volume','music','speech'].map(k=>[k,Number.isFinite(saved[k])?clamp(saved[k],0,1):1]));
  }catch{return {volume:1,music:1,speech:1};}
})();
function soundSettings(nav,back){
  nav.replaceChildren();
  for(const [key,name] of [['volume','Общая громкость'],['music','Музыка'],['speech','Голоса']]){
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

function sameBedroom(o){
  const x=o.x+o.w/2,y=o.y+o.h/2;
  return HOUSES.some(h=>!h.ruin && x>h.x*T && y>h.y*T && x<(h.x+h.w)*T && y<(h.y+h.h)*T &&
    P.x>h.x*T && P.y>h.y*T && P.x<(h.x+h.w)*T && P.y<(h.y+h.h)*T);
}
function sleepAtBed(o){
  if(!o || !sameBedroom(o))return;
  const choices=()=>[...[1,4,8].map(h=>{
    const why=restBlock();
    return {t:why||restLabel('Спать',h*60,'sleep'),d:!!why,fn:()=>{
      if(restBlock()||!sameBedroom(o))return;
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
function reloadSound(id){return WP[id]?.ammo==='a12'?'loadShell':compatibleRifle(id)?'loadRifle':'loadPistol';}

const campStories=[
  [['camp01','У кого вчера часы утащили?'],['camp02','У меня. Теперь вор точно знает, сколько ему осталось.']],
  [['camp03','На насыпи всю ночь кто-то стучал. По три раза.'],['camp04','Я там ночевал. Котелок с ветки снять пытался.']],
  [['camp05','До дождя успеем дойти?'],['camp06','До первого точно. А их тут сегодня штуки три.']]
];
const battleVoice={loner:[['ally01','Вижу его!'],['ally02','Прикрой, меняю магазин!']],bandit:[['foe01','Вот он, мужики!'],['foe02','Пустой! Прикрой!']],army:[['army01','Контакт!'],['army02','Перезаряжаюсь!']]};
let campAct=null,campDelay=9,campIndex=0,voiceDelay=0,radioAudio=null,voiceAudio=null;
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
function syncSceneAudio(){mixScene(voiceAudio);mixScene(radioAudio);mixScene(campAct?.clip);}
function resetCampAudio(){
  stopScene(campAct?.clip);stopScene(voiceAudio);stopScene(radioAudio);
  campAct=radioAudio=voiceAudio=null;campDelay=9;voiceDelay=0;campIndex=0;
}
function voiceCallout(e,kind){
  if(!['combat','reload'].includes(kind)||!battleVoice[e.fac]||voiceDelay>0||dE(e,P)>250||
    inBunker(e.x,e.y)!==inBunker(P.x,P.y)||loftAt(e)!==loftAt(P))return false;
  const [clip,line]=battleVoice[e.fac][kind==='reload'?1:0];
  stopScene(campAct?.clip);campAct=null;campDelay=22;
  const sound=sceneClip(clip,.52,'speech',e);if(!sound)return false;
  voiceAudio=sound;voiceDelay=9+(e.seed%6);e.bub={t:line,life:2.7};return true;
}
function atFire(e){
  return e?.alive && e.sit && !e.wounded && !e.captive && !e.tgt && !e.evacuating &&
    e.fireRef && dE(e,e.fireRef)<80 && dE(e,P)<255;
}
function campAndRadio(dt){
  voiceDelay=Math.max(0,voiceDelay-dt);
  const underground=inBunker(P.x,P.y);
  if(underground && !radioAudio){radioAudio=sceneClip('deskRadio',.22,'music',byS('sid'),true);}
  if(!underground && radioAudio){stopScene(radioAudio);radioAudio=null;}
  syncSceneAudio();
  const quiet=!underground && !loftAt(P) && !S.blow?.stage && WX.rain<.6 && voiceDelay<=0;
  if(campAct){
    const act=campAct;
    if(!quiet || !atFire(act.actor)){stopScene(act.clip);campAct=null;campDelay=16;return;}
    if(!act.clip.done)return;
    if(act.reply && atFire(act.reply)){
      const [name,t]=act.lines[1];act.actor=act.reply;act.reply=null;
      act.clip=sceneClip(name,.44,'speech',act.actor);
      if(act.clip){act.actor.bub={t,life:4};return;}
    }
    campAct=null;campDelay=25+(campIndex*7)%19;return;
  }
  if(!quiet||!AC||(campDelay-=dt)>0)return;
  campDelay=4;
  const seats=ents.filter(atFire).sort((a,b)=>dE(a,P)-dE(b,P));if(!seats.length)return;
  const actor=seats[campIndex%seats.length], reply=seats.find(e=>e!==actor && dE(e,actor)<105);
  const music=campIndex%2===1 || !reply;
  const lines=campStories[Math.floor(campIndex/2)%campStories.length];
  const song=['emberSong','roadSong','latePicking'][Math.floor(campIndex/2)%3];
  const clip=sceneClip(music?song:lines[0][0],music?.29:.48,music?'music':'speech',actor);
  if(!clip)return;
  if(!music)actor.bub={t:lines[0][1],life:4};
  campAct={actor,reply:music?null:reply,music,lines,clip};campIndex++;
}
function drawCampGuitar(e){
  const g=ctx;g.save();g.translate(e.x,e.y);g.rotate(e.ang-.95);g.translate(4,1);
  g.fillStyle='#60422b';g.strokeStyle='#362e26';g.lineWidth=1;
  g.beginPath();g.ellipse(-1,5,4.8,3.8,-.32,0,7);g.ellipse(3.8,3.4,3,2.7,-.32,0,7);g.fill();g.stroke();
  g.strokeStyle='#866748';g.lineWidth=2.3;g.beginPath();g.moveTo(3,4);g.lineTo(14,-.8);g.stroke();
  g.fillStyle='#312921';g.beginPath();g.arc(1.8,4,1.4,0,7);g.fill();
  g.fillStyle='#a38a6a';g.fillRect(-1+Math.sin(G7.vt*6),4,2.4,1.6);g.restore();
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
