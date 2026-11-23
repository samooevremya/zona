/* Campaign data is separate from inventory and old quest counters. Named actors
   are reconstructed before resident snapshots, so reloading never rerolls a loss. */
const CHAPTERS=['Последний пассажир','Шустрый влип','Уговор с Сидоровичем','Должок за Кордон','У старой колеи','Чужая начинка','Цена ремонта','Беда с севера','След ведёт в Залесье'];
const STORY={
  wake:[0,'sid','Поговорить с Сидоровичем'],wolf:[1,'village','Получить оружие у Волка'],
  rescue:[1,'atp','Освободить Шустрого на АТП'],flash:[2,'sid','Передать флешку Сидоровичу'],
  fox:[3,'farm','Помочь раненому Лису'],dogs:[3,'farm','Отбиться от слепых собак'],
  favour:[4,'farm','Расспросить Лиса об аварии'],wreck:[4,'column','Найти ПМ и осмотреть серый рюкзак'],
  returnGun:[4,'farm','Вернуть Лису наградной ПМ'],device:[5,'atp','Показать разбитый КПК Шустрому'],
  bargain:[6,'sid','Узнать цену ремонта'],case:[6,'army','Ночью забрать кейс без тревоги'],
  escape:[6,'army','Незаметно вынести кейс за ограду'],deliver:[6,'sid','Доставить кейс Сидоровичу'],
  muster:[7,'village','Найти Волка в деревне'],ready:[7,'village','Собраться с отрядом'],battle:[7,'village','Разбить наёмников к северу от деревни'],
  aid:[7,'village','Вернуться в деревню и помочь Волку'],reward:[7,'sid','Забрать награду и КПК'],
  listen:[8,'sid','Прослушать восстановленную запись'],west:[8,'zalissya','Дойти до Залесья в Малой Зоне'],done:[9,'zalissya','Кордон пройден']
};
const STORY_KEYS=['wolf','fox','shust'], RAIDERS=['Шнур','Кедр','Бухта','Сыч','Грач'];
const ATP_BANDITS=['b1','b2','b3','b4','b5','b6','boss'];
function chapter(){return S.campaign.stage;}
function prepareCampaign(){
  if(!S.campaign){
    const rescued=!!(S.flags.shustFree || S.flags.flashDone);
    S.campaign={stage:S.flags.flashDone?'fox':rescued?'flash':'wake',wounds:{},liberated:rescued};
    if(rescued && !S.flags.flashDone && !S.inv.flash){S.inv.flash=1;if(S.flags.personalStock?.loot)delete S.flags.personalStock.loot.flash;}
    if(rescued){ S.flags.shustFree=S.flags.atpClear=1; ATP_BANDITS.forEach(id=>S.dead[id]=1); }
    delete S.flags.foxUp;
    delete S.flags.cordonStage;
    if(S.news)S.news=S.news.filter(n=>!/(ложный вызов|связаться с серым|серый ждёт|ночной гость|след стрелка|колонн.*частот|свет в деревне|схрон путейца|флешка шустрого|раненый у дороги|медузу.*сидоровичу)/i.test(n.x||''));
    if(S.q3)S.q3.sucker=0;
    if(S.jobs) S.jobs.act=null;
    if(S.dyn?.npcs) S.dyn.npcs=S.dyn.npcs.filter(r=>!r.jobTag && !['column_spool','column_chalk'].includes(r.sid));
    S.q2 ||= {}; S.q2.fox=0;
  }
  for(const id of STORY_KEYS) delete S.dead[id];
}
function nextChapter(stage){
  if(chapter()===stage)return;
  const prev=STORY[chapter()][0], curr=STORY[stage][0];
  if(curr>prev && prev>0)S.stats.q++;
  S.campaign.stage=stage; S.trackedQuestId='chapter'+curr;
  campaignCast(); bulletin(STORY[stage][2]); save(true);
}
const chapterReports=[
  ['sid','Лис вытащил тебя из разбитого грузовика и довёз до бункера.'],
  ['atp','Шустрый свободен. Выжившие одиночки обосновались на АТП.'],
  ['sid','Сидорович получил флешку и подсказал, где искать Лиса.'],
  ['farm','Лис получил аптечку. Стая у фермы разбежалась.'],
  ['column','Ты вернул Лису именной ПМ. На разбитом КПК уцелел голос Стрелка.'],
  ['atp','Шустрый узнал монолитовский КПК и отправил тебя к Сидоровичу.'],
  ['army','Кейс доставлен. Сидорович занялся ремонтом КПК.'],
  ['village','Деревня отбилась. Волк получил помощь, а ты забрал восстановленный КПК.'],
  ['zalissya','Запись Стрелка привела тебя в Залесье.']
];
function campaignList(){
  const [n,loc]=STORY[chapter()];
  const list=CHAPTERS.slice(0,n+1).map((name,i)=>({id:'chapter'+i,n:name,loc:i===n?loc:chapterReports[i][0],st:i===n?'a':'d',d:i===n?campaignLabel():chapterReports[i][1]}));
  if(S.sos?.act)list.push({id:'sos',loc:S.sos.act.loc,n:'Сигнал SOS',st:'a',d:'Сталкерам нужна помощь у '+S.sos.act.where+'.'});
  const job=S.jobs?.act;
  if(job)list.push({id:'job',loc:job.loc||'sid',n:job.n_,d:job.d+' '+(jobReady(job)?'Готово. Вернись к Сидоровичу.':jobProgress(job)),st:'a'});
  return list;
}
function worldPoint(x,y){return {x:(WEST+x)*T,y:(NORTH_ROWS+y)*T};}
function walkPoint(p,dx=0,dy=0){const t=freeTile(p.x/T+dx,p.y/T+dy);return {x:t.x*T,y:t.y*T};}
function storyArea(){return P.x/T-WEST>=112 && P.x/T-WEST<=143 && P.y/T-NORTH_ROWS>=198 && P.y/T-NORTH_ROWS<=215;}
function shiftNumber(){return Math.floor((S.min-21*60)/1440);}
function raidAllies(){return ents.filter(e=>e.alive && e.squadMate);}
function campaignLabel(){
  const c=S.campaign;
  if(c.stage==='case' && (c.mustLeave || c.failedShift===shiftNumber()))return c.mustLeave?'Отступить с южного КПП':'Дождаться следующей ночной смены';
  if(c.stage==='rescue' && !S.flags.assault && atpCompany().length)return 'Поговорить с Петрухой у АТП';
  if(c.stage==='wreck')return c.pistol?'Осмотреть серый рюкзак':c.bag?'Найти наградной ПМ Лиса':STORY.wreck[2];
  return STORY[c.stage][2];
}
function storyPoint(stage=chapter()){
  const a=STORY[stage], actor={wolf:'wolf',fox:'fox',favour:'fox',returnGun:'fox',dogs:'fox',device:'shust',rescue:'shust',aid:'wolf',muster:'wolf'}[stage];
  if(stage==='rescue' && !S.flags.assault && atpCompany().length)return atpCompany()[0];
  if(actor && byS(actor))return routeToActor(byS(actor)) || byS(actor);
  if(a[1]==='sid')return locPt('sid',inBunker(P.x,P.y)?'trader':'hatch');
  if(stage==='wreck')return findSite(S.campaign.pistol?'bag':'pistol');
  if(stage==='case')return S.campaign.mustLeave?worldPoint(110.5,207.5):findSite('case');
  if(stage==='escape')return worldPoint(110.5,207.5);
  if(stage==='ready')return raidAllies()[0] || FIRE;
  if(stage==='battle')return ents.find(e=>e.alive && e.assailant) || northCamp();
  return LESSER_FIRE;
}
function northCamp(){return walkPoint(worldPoint(74.5,128.5));}
function campaignTargets(){
  const targets=[];
  if(chapter()!=='done'){
    const p=storyPoint();targets.push({x:p.x,y:p.y,qid:'chapter'+STORY[chapter()][0],n:campaignLabel()});
  }
  const sos=S.sos?.act;
  if(sos)targets.push({qid:'sos',x:sos.x*T,y:sos.y*T,n:'Сигнал SOS: '+sos.where});
  const job=S.jobs?.act;
  if(job){
    let point, label=job.n_;
    if(jobReady(job)){point=locPt('sid',inBunker(P.x,P.y)?'trader':'hatch');label='Сдать заказ';}
    else if(job.k==='clear')point={x:job.x*T,y:job.y*T};
    else if(job.k==='hunt'||job.k==='trophy'){
      const kind=job.kind || (job.item==='hoof'?'boar':'dog');
      const closest=ents.filter(e=>e.alive && e.den && e.kind===kind).sort((a,b)=>dE(P,a.home)-dE(P,b.home))[0];
      point=closest?.home;
    }else if(job.k==='art'){
      point=locPt('field','medusa');label='Обследовать поле аномалий';
    }
    if(point)targets.push({qid:'job',x:point.x,y:point.y,n:label});
  }
  return targets;
}
let campaignSites;
function findSite(id){
  if(!campaignSites){
    const wreck=locPt('column','wreck');
    campaignSites={pistol:walkPoint(wreck,-1,1),bag:walkPoint(wreck,2,2),case:walkPoint(worldPoint(117.5,205.5))};
  }
  return campaignSites[id];
}
function woundKey(e){
  e.hp=1;e.wounded=e.captive=1;e.tgt=e.path=e.trip=null;e.kx=e.ky=0;e.sit=0;
  S.campaign.wounds[e.sid]=true;
}
function helpStory(e){
  const step=chapter();
  if(e.sid==='fox' && step!=='fox' && !S.flags.foxUp){msg('Лис просит подойти после разговора с Сидоровичем.','say');return;}
  if(!has('medkit')){msg('Нужна аптечка. Можно вернуться с ней позже.','say');return;}
  take('medkit',1);delete S.campaign.wounds[e.sid];e.hp=e.maxhp*.7;e.wounded=0;
  e.captive=e.sid==='shust' && !S.campaign.liberated;
  if(e.sid==='fox' && step==='fox'){
    S.flags.foxUp=1;nextChapter('dogs');playConversation(e,'fox','Выйти во двор');
  }else if(e.sid==='wolf' && step==='aid'){
    nextChapter('reward');playConversation(e,'aid','К Сидоровичу');
  }else {save(true);sayLine(e,'Живой… Спасибо.');}
}
function addCast(id,point,def,tag){
  if(S.dead[id] || byS(id))return;
  const e=def.pack?mkDog({...def,sid:id,x:point.x/T,y:point.y/T}):mkHuman({...def,sid:id,x:point.x/T,y:point.y/T,named:1,stay:1});
  e[tag]=true;e.resident=1;ents.push(e);
}
function campaignCast(){
  if(!BIG)return;
  const c=S.campaign;
  for(const id of STORY_KEYS){
    const e=byS(id);if(!e)continue;
    if(c.wounds[id])woundKey(e);
  }
  if(chapter()==='dogs'){
    const p=locPt('farm','fox');
    for(let i=0;i<4;i++)addCast('traildog'+i,walkPoint(p,5+i%2,4+i),{pack:'foxdogs'},'trailDog');
  }
  if(c.atpReliefSent)spawnAtpRelief();
  if(c.raid){
    RAIDERS.forEach((name,i)=>addCast('northAlly'+i,walkPoint(c.northHeld?northCamp():FIRE,(i-2)*1.8,5),{name,fac:'loner',wpn:i%2?'w_aksu':'w_obrez'},'squadMate'));
    if(chapter()==='battle')for(let i=0;i<6;i++)addCast('northMerc'+i,walkPoint(northCamp(),(i%3-1)*2,-Math.floor(i/3)*2),{name:'Наёмник',fac:'bandit',wpn:i%2?'w_aksu':'w_pm'},'assailant');
  }
}
function atpCompany(){
  return ['petr','petr2','atpRelief0','atpRelief1'].map(byS).filter(Boolean);
}
function spawnAtpRelief(){
  const gate=locPt('atp','petr');
  ['Чибис','Тихон'].forEach((name,i)=>{
    const id='atpRelief'+i;
    if(byS(id)||S.dead[id])return;
    const from=walkPoint(gate,-11-i,5+i),dest=walkPoint(gate,i?2:0,i?3:1);
    addCast(id,from,{name,fac:'loner',wpn:i?'w_pm':'w_obrez'},'relief');
    const e=byS(id);e.home=dest;e.trip={stage:2,returnTo:dest};
  });
}
function occupyATP(){
  const first=!S.campaign.liberated;
  S.campaign.liberated=true;S.flags.atpClear=S.flags.shustFree=1;
  ['petr','petr2','shust'].forEach((id,i)=>{
    const e=byS(id);if(!e)return;
    const p=walkPoint(locPt('atp',i===1?'petr2':'petr'),i===2?3:0,i===2?2:0);
    e.captive=e.wounded?1:0;e.home=p;e.stay=1;e.resident=1;
    if(first){e.follow=e.sit=0;e.path=null;e.trip={stage:2,returnTo:p};}
  });
  if(!atpCompany().length && !S.campaign.atpReliefSent)S.campaign.atpCallAt??=S.min+30;
}
function shustCampLine(){
  if(atpCompany().some(e=>!e.relief || dE(e,e.home)<95))return 'Мы остаёмся на АТП. Обживём гараж.';
  if(S.campaign.atpReliefSent)return 'Ребята ответили по КПК. Жду их здесь.';
  return 'Я пока один. Свяжусь с ребятами по КПК, попрошу прийти на АТП.';
}
function storyRead(name,lines){dialog({n:name,record:true,grp:'Кордон'},lines,()=>[{t:'Понятно',close:1}]);}
function beginAssault(){
  if(chapter()!=='rescue'||S.flags.assault)return;
  S.flags.assault=1;
  for(const e of atpCompany()){
    e.sit=0;e.trip=e.path=null;e.home=locPt('atp',e.sid);e.stay=1;
  }
  bulletin('Отряд Петрухи выдвигается на АТП.');save(true);
}
function petrBriefing(e){
  const decline={t:'Пока не готов. Ждите здесь.',close:1,fn:()=>{S.campaign.atpWait=true;save(true);}};
  playConversation(e,'petr','Готов. Пошли за ним.',beginAssault,decline);
}
// A scene owns only the reply buttons. The conversation panel owns its transcript.
function playConversation(e,key,finishLabel,finish,alternative){
  const trader=!e, stage=chapter(), script=CORDON_SCRIPT[key];
  if(!panel || (trader ? panel.kind!=='trader' : panel.e!==e))
    dialog(trader?SIDCARD():cardOf(e),[],()=>[],trader?'trader':'dialog',e);
  let index=0;
  function advance(){
    while(index<script.length && script[index][0]!=='Меченый'){
      const [name,text]=script[index++];
      const speech=key==='free' && index===script.length && !atpCompany().length?shustCampLine():text;
      panel.lines.push({s:name?'npc':'sys',name:name==='Сталкер'?e?.name:name,t:speech});
    }
    if(index<script.length){
      const reply=script[index++][1];
      panel.opts=()=>[{t:reply,fn:advance}];
    }else{
      panel.opts=()=>[{t:finishLabel,k:'key',fn:()=>{
        if(chapter()!==stage)return;
        if(finish)finish();
        if(trader){panel.opts=traderOpts;refresh();}else closePanel();
      }},...(alternative?[alternative]:[])];
    }
    refresh();
  }
  advance();
}
function storyTalk(e){
  const stage=chapter();
  const scene=(key,label,to,effect)=>playConversation(e,key,label,()=>{effect?.();nextChapter(to);});
  if(e.sid==='wolf' && stage==='wolf')return scene('wolf','Забрать оружие','rescue',()=>{
    const gun=give('w_pm',1,{cond:85,mag:8});give('a9',16);
    if(gun)mountGear('w_pm',cnt('w_pm')-1,true);S.q.flash=2;
  });
  if(e.sid==='fox' && stage==='favour')return scene('favour','Идти к грузовику','wreck');
  if(e.sid==='fox' && stage==='returnGun')return scene('returnGun','Убрать КПК','device',()=>take('engraved_pm'));
  if(e.sid==='shust' && stage==='device')return scene('device','К Сидоровичу','bargain');
  if(e.sid==='wolf' && stage==='muster')return scene('muster','Встретиться с отрядом','ready',()=>{S.campaign.raid=true;});
  if(e.squadMate && stage==='ready')return playConversation(e,'ready','Я готов. Выходим',()=>nextChapter('battle'),{t:'Ещё подготовлюсь',close:1});
  const line=e.sid==='shust'?shustCampLine():e.squadMate?(S.campaign.northHeld?raidDebrief():'Держим этот участок.'):e.sid==='fox'?'С этой ногой далеко не уйдёшь.':'Здорово, Меченый.';
  dialog(cardOf(e),[line],()=>[{t:'До встречи',close:1}],'dialog',e);
}
function raidDebrief(){
  const n=raidAllies().length;
  return n===5?CORDON_SCRIPT.held[0][1]:n?'Не всех уберегли… Я останусь здесь, проверю округу. А ты возвращайся к Волку.':'Волк по КПК: «Меченый, возвращайся. Есть раненые».';
}
function storyTraderOptions(){
  const stage=chapter(), opts=[];
  function offer(at,title,end,to,effect){
    if(stage===at)opts.push({t:title,k:'key',fn:()=>playConversation(null,at,end,()=>{effect?.();nextChapter(to);})});
  }
  offer('wake','Кто меня нашёл?','Найти Волка','wolf');
  if(has('flash'))offer('flash','Передать флешку Шустрого','Забрать медикаменты','fox',()=>{
    take('flash',1);S.flags.flashDone=1;S.q.flash=4;give('medkit',2);give('bandage',3);
  });
  offer('bargain','Показать монолитовский КПК','Договорились','case',()=>take('damaged_pda'));
  if(stage==='case')opts.push({t:'Что делать до следующей смены?',fn:()=>say('Костёр в деревне ещё горит. Передохни там или возьми у меня заказ, пока ждёшь. После тревоги раньше следующей ночи делать там нечего.')});
  offer('deliver','Отдать кейс','К Волку','muster',()=>take('post_case'));
  offer('reward','Получить награду и КПК','Забрать награду','listen',()=>{S.inv.restored_pda=1;S.money+=5000;give('ar_zarya',1);});
  offer('listen','Включить восстановленную запись','Отправиться в Залесье','west');
  return opts;
}
function alarmPost(){
  if(!BIG || !['case','escape'].includes(chapter()) || !night() || S.campaign.failedShift===shiftNumber())return;
  take('post_case',1);
  S.campaign.failedShift=shiftNumber();S.campaign.mustLeave=true;
  S.campaign.stage='case';bulletin('КПП поднял тревогу. Отступи. Кейс снова доставят со следующей ночной сменой.');save(true);
}
function campaignTick(){
  if(!BIG || !P.alive)return;
  const c=S.campaign;
  if(c.liberated && !c.atpReliefSent && !atpCompany().length){
    c.atpCallAt??=S.min+30;
    if(S.min>=c.atpCallAt && !byS('shust')?.wounded){
      c.atpReliefSent=true;spawnAtpRelief();
      bulletin('Шустрый вызывает одиночек на АТП. Чибис и Тихон откликнулись и идут к гаражам.');save(true);
    }
  }
  if(chapter()==='ready' && !raidAllies().length)nextChapter('battle');
  if(chapter()==='dogs' && !ents.some(e=>e.alive && e.trailDog))nextChapter('favour');
  if(['case','escape'].includes(chapter())){
    if(c.mustLeave && !storyArea()){c.mustLeave=false;save(true);}
    if(chapter()==='escape'){
      if(!night() || c.caseShift!==shiftNumber()){take('post_case',1);c.stage='case';bulletin('Смена закончилась. Кейс остался на КПП.');save(true);}
      else if(!storyArea())nextChapter('deliver');
    }
  }
  if(chapter()==='battle' && !ents.some(e=>e.alive && e.assailant)){
    c.northHeld=true;const alive=raidAllies();
    for(const e of alive){e.home={x:e.x,y:e.y};e.trip=e.path=null;e.stay=1;}
    const line=raidDebrief();
    bulletin(line);if(alive.length)sayLine(alive[0],line);
    const wolf=byS('wolf'), village=locPt('village','wolf');
    wolf.x=village.x;wolf.y=village.y;wolf.home=village;woundKey(wolf);
    c.raidAftermath=S.min;villageAftermath();nextChapter('aid');
  }
  if(chapter()==='west' && dE(P,LESSER_FIRE)<145)nextChapter('done');
}
function villageAftermath(){
  if(S.campaign.raidAftermath==null || S.min-S.campaign.raidAftermath>720 || objs.some(o=>o.raidBody))return;
  for(let i=0;i<4;i++){const p=walkPoint(FIRE,i%2?4:-3,2+i);
    objs.push({k:'body',...p,raidBody:true,fac:i<2?'bandit':'loner',name:i<2?'Наёмник':'Защитник деревни',kind:'human',seed:17+i,ang:i*2.3,loot:{},t:S.campaign.raidAftermath});}
}
function storyPrompt(cand){
  const c=S.campaign;
  for(const id of chapter()==='wreck'?['pistol','bag']:chapter()==='case'?['case']:[]){
    if(id!=='case' && c[id])continue;
    const p=findSite(id),d=dE(P,p);if(d<45 && los(P.x,P.y,p.x,p.y))cand(d-35,{k:'story',stage:id,label:{pistol:'Поднять именной ПМ',bag:'Осмотреть серый рюкзак',case:campaignLabel()}[id]});
  }
}
function cordonUse(id){
  const c=S.campaign;
  if(id==='case' && chapter()==='case'){
    if(!night() || c.failedShift===shiftNumber() || c.mustLeave){msg('Кейс под охраной. Дождись ночной смены.','say');return;}
    c.caseShift=shiftNumber();S.inv.post_case=1;nextChapter('escape');return;
  }
  if(chapter()!=='wreck' || !['bag','pistol'].includes(id) || c[id])return;
  c[id]=true;S.inv[id==='bag'?'damaged_pda':'engraved_pm']=1;
  if(c.bag && c.pistol)nextChapter('returnGun');else save(true);
  storyRead(id==='bag'?'Серый рюкзак':'Наградной ПМ',[id==='bag'?'Стекло наладонника разбито. Ты нажимаешь кнопку. Корпус коротко вибрирует, но экран остаётся чёрным.':'На рукояти под грязью проступает пластинка с фамилией. Это пистолет Лиса.']);
}
let storyGunIcon;
function drawCordonTrail(inView){
  if(!BIG || !S?.campaign)return;
  const c=S.campaign;
  for(const id of chapter()==='wreck'?['pistol','bag']:chapter()==='case'?['case']:[]){
    if(id!=='case' && c[id])continue;
    const p=findSite(id);if(!inView(p.x,p.y,32))continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.27);
    if(id==='pistol' && (storyGunIcon ||= itemIcon('w_pm')).naturalWidth)ctx.drawImage(storyGunIcon,-9,-5,18,10);
    else {ctx.shadowColor='#211c19';ctx.shadowOffsetY=2;ctx.fillStyle=id==='case'?'#585947':id==='bag'?'#726e60':'#403c34';ctx.fillRect(-10,-6,20,12);ctx.shadowOffsetY=0;ctx.strokeStyle='#afa488';ctx.strokeRect(-7,-4,14,8);}
    ctx.restore();
  }
}
// Day shift has four additional guards. They leave the playable post at 21:00.
let lastShiftState=null;
function updatePostShift(){
  const day=!night();
  const key=day+':'+shiftNumber();
  if(lastShiftState===key)return;
  lastShiftState=key;
  ents=ents.filter(e=>!e.dayGuard && !e.reliefGuard);
  for(const id of ['a4','a5'])if(!byS(id)){
    const def=NPCDEF.find(e=>e.sid===id);
    addCast('relief'+id+'_'+shiftNumber(),{x:def.x*T,y:def.y*T},def,'reliefGuard');
  }
  if(!day)return;
  for(let i=0;i<4;i++)addCast('postDay'+shiftNumber()+'_'+i,walkPoint(worldPoint(123+i*2,201+i%2)),{name:'Дневной караул',fac:'army',wpn:'w_aksu',guard:'south'},'dayGuard');
}
