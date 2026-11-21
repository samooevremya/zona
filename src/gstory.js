/* Большой Кордон. Строковый этап и выбранный канал живут в обычных flags.
   Координаты двух сюжетных жителей подхватывает существующий снимок resident. */
const CORDON_CHAPTERS = ['Чужой голос', 'Двое у колонны', 'Кому слышно', 'На связи — Серый'];
const CORDON_STEPS = {
  broken: [0,'atp','garage','Осмотреть вещи Шустрого','Ищи сломанный КПК в гараже на АТП.'],
  decode: [0,'sid','trader','Отнести КПК Сидоровичу','Торговец может прочитать память курьера.'],
  foxNote: [0,'farm','fox','Найти запись Лиса','Осмотри место Лиса на ферме.'],
  voice: [0,'village','shust','Выслушать Шустрого','У Шустрого сохранилась копия подозрительного вызова.'],
  confirm: [0,'village','wolf','Сверить позывные в деревне','Узнай, кто ушёл по ложному вызову.'],
  relay: [0,'relay','booth','Настроить приёмник в будке','Найди местный повторитель и прослушай хвост передачи.'],
  cache: [1,'column','note','Проверить схрон у колонны','Крышку схрона можно открыть, когда пыль воронки осядет.'],
  tracks: [1,'column','note','Осмотреть след у схрона','От схрона тянется борозда. Иди по следу к разбитой машине.'],
  rescue: [2,'column','wreck','Найти людей у машины','Окликни людей за кузовом и реши, как их выводить.'],
  pickup: [2,'village','fire','Встретить спасённых в деревне','За людьми вышла группа. Встреться с выжившими у костра.'],
  escort: [2,'farm','safe','Проводить людей на ферму','Держись рядом. У фермы дождись всех, кто ещё в пути.'],
  listen: [2,'relay','booth','Перехватить второй сеанс','Вернись к приёмнику, пока отправитель считает частоту чистой.'],
  lastLog: [2,'column','wreck','Забрать журнал частот','У разбитой машины осталась резервная запись с частотой Серого.'],
  north: [3,'exit','gate','Вызвать Серого у перехода','У северного перехода КПК сможет поймать ответ со Свалки.']
};
const CORDON_MEN = [{sid:'column_spool',name:'Катушка'}, {sid:'column_chalk',name:'Мел'}];
function cordonMen() { return CORDON_MEN.map(m=>byS(m.sid)).filter(Boolean); }
function cordonStage() { return BIG && S.flags.cordonStage; }
function cordonSet(stage,notice) {
  if (stage===cordonStage()) return;
  const previous=CORDON_STEPS[cordonStage()], next=CORDON_STEPS[stage];
  S.flags.cordonStage=stage;
  if (next && (!S.trackedQuestId || ['fox','foxLead','flash'].includes(S.trackedQuestId) || S.trackedQuestId==='cordon'+previous?.[0]))
    S.trackedQuestId='cordon'+next[0];
  if (stage==='rescue') cordonCast();
  if (notice) bulletin(notice);
  save(true);
}
function cordonStart() {
  if (!BIG) return;
  const stage=cordonStage();
  if (S.q.flash===1 && S.dead.wolf && !S.dead.shust) { S.q.flash=2; bulletin('Волк погиб. Шустрый в гараже на АТП.'); }
  if (!stage && S.dead.shust && S.q.flash>0 && S.q.flash<3) { S.q.flash=4; S.flags.flashFail=1; }
  if (!stage && S.flags.flashFail) {
    cordonSet('broken','В гараже Шустрого могли остаться записи. Проверь АТП.'); return;
  }
  if (stage && stage!=='waitFox') return;
  if (!S.flags.flashDone && !S.flags.courierDecoded) return;
  if (S.dead.fox && (S.flags.foxFail || (S.q2.fox>0 && S.q2.fox<4))) {
    S.q2.fox=4; S.flags.foxFail=1; cordonSet('foxNote','Лис погиб. Проверь его вещи на ферме.'); return;
  }
  if (S.q2.fox!==4) return;
  if (S.dead.shust) cordonSet('confirm','В записи курьера слышны два позывных. Сверь их в деревне.');
  else cordonSet('voice','Шустрый по КПК: «Меченый, зайди. Надо дать тебе кое-что послушать».');
}
function cordonPoint(step) {
  if (step[2]==='note') {
    const stash=objs.find(o=>o.stash==='column_wayman');
    return {x:stash.x+stash.w/2,y:stash.y+stash.h/2};
  }
  return locPt(step[1],step[2]);
}
function cordonTarget() {
  const stage=cordonStage(), step=CORDON_STEPS[stage];
  if (!step) return null;
  let pos=cordonPoint(step), label=step[3];
  if (stage==='voice' && byS('shust')) pos=byS('shust');
  if (stage==='confirm' && byS('wolf') && !hostile(byS('wolf'),P)) pos=byS('wolf');
  if (stage==='confirm' && (!byS('wolf') || hostile(byS('wolf'),P))) { pos=locPt('village','fire'); label='Проверить журнал у костра'; }
  if (stage==='escort') {
    const missing=cordonMen().filter(e=>dE(e,P)>400).sort((a,b)=>dE(b,P)-dE(a,P))[0];
    if(missing) { pos=missing; label='Вернуться за сталкером: '+missing.name; }
  }
  if (stage==='decode' && !inBunker(P.x,P.y)) pos=locPt('sid','hatch');
  if (stage==='rescue' || (stage==='pickup' && S.flags.cordonExtracted)) pos=cordonMen()[0] || pos;
  return {qid:'cordon'+step[0],x:pos.x,y:pos.y,n:label};
}
function cordonList(list) {
  const stage=cordonStage(), step=CORDON_STEPS[stage];
  if (!step && stage!=='done') return;
  const current=step ? step[0] : CORDON_CHAPTERS.length;
  const finished=['Ложный вызов передавала релейная будка.','След от схрона привёл к машине.',
    S.flags.cordonLoss?'Журнал частот найден у разбитой машины.':S.flags.cordonQuiet?'Удалось записать второй сеанс.':'Спасённых приняли в деревне.',
    'Серый ответил. Встреча назначена в ангаре на Свалке.'];
  for(let i=0;i<CORDON_CHAPTERS.length && i<=current;i++)
    list.push({id:'cordon'+i,n:CORDON_CHAPTERS[i],loc:i===current?step[1]:['relay','column','farm','exit'][i],
      st:i===current?'a':'d',d:i===current?step[4]:finished[i]});
}
function cordonMessage(name,lines) {
  const npc=ents.find(e=>e.alive && e.name===name);
  dialog(npc?cardOf(npc):{n:name,grp:'Запись в КПК',record:true},lines,()=> [{t:'Убрать КПК',close:1}]);
}
function cordonRelay() {
  if (cordonStage()==='listen') {
    cordonSet('north','Второй сеанс записан. Серого можно вызвать у северного перехода.');
    cordonMessage('Релейная будка',['В наушниках два щелчка. «Седьмой вагон, приём. Запись курьера сработала. Жду следующую пару».',
      'Ты сохраняешь передачу вместе с позывным отправителя. Серому будет что послушать.']);
  } else {
    cordonSet('cache','Разбитая колонна. Ищи схрон путейца, пока воронка спокойна.');
    cordonMessage('Релейная будка',['На повторе крутится обрезанная фраза Шустрого. Ты отключаешь петлю. Из шороха проступает другой голос.',
      '«Мел ранен. Оставил записку под крышкой путейского схрона, у колонны. Если слышите, ответьте».']);
  }
}
function cordonCast() {
  const stage=cordonStage();
  if (!['rescue','pickup','escort','listen','north','done'].includes(stage) || S.flags.cordonLoss) return;
  const settled=(stage==='pickup' && S.flags.cordonExtracted) || ['listen','north','done'].includes(stage);
  const point=settled ? (S.flags.cordonQuiet ? locPt('farm','safe'):locPt('village','fire')) : locPt('column','wreck');
  CORDON_MEN.forEach((m,i)=>{
    if (S.dead[m.sid] || byS(m.sid)) return;
    const tile=freeTile(point.x/T+(i?1:-1),point.y/T+(settled?1:0));
    const e=mkHuman({...m,x:tile.x,y:tile.y,fac:'loner',wpn:i?'knife':'w_pm',rank:0,stay:1,named:1});
    e.resident=1; e.storyMan=1; e.sit=stage!=='escort'; e.seat=e.sit;
    ents.push(e);
  });
}
function settleCordonMen(loc,anchor) {
  const p=locPt(loc,anchor);
  cordonMen().forEach((e,i)=>{
    const tile=freeTile(p.x/T+(i?1:-1),p.y/T+1);
    e.x=tile.x*T; e.y=tile.y*T; e.home={x:e.x,y:e.y}; e.sit=e.seat=1; e.path=e.tgt=null;
  });
}
function cordonAI(e,dt) {
  if (cordonStage()==='escort' && !inBunker(P.x,P.y)) {
    e.sit=e.seat=0;
    const gap=dE(e,P);
    if (gap>35 && gap<750) goTo(e,P.x,P.y,e.sid==='column_chalk'?84:96,dt);
  }
}
function cordonSurvivor(e) {
  const stage=cordonStage(), together=cordonMen().length===2;
  if (stage==='rescue') return dialog(cardOf(e),[together?'«Кто-то звал нас голосом Шустрого. У Мела нога перебита. На общей частоте услышат и деревня, и тот, кто нас сюда привёл».':'«Второго не уберёг. У меня есть рация. Вызовешь деревню или выйдем тихо?»'],()=>[
    {t:'Вызвать помощь из деревни',fn:()=>{
      cordonSet('pickup','Деревня приняла вызов. Встреть группу у костра.');
      cordonMessage('Эфир деревни',['«Приняли. Носилки есть. Встречаемся у костра». Через минуту ложный вызов обрывается.']);}},
    {t:'Сохранить тишину и вести людей на ферму',fn:()=>{
      S.flags.cordonQuiet=1; cordonSet('escort','Веди группу на ферму. Если оторвёшься, люди будут ждать.');
      cordonMessage(e.name,[together?'«Рацию выключил. До фермы дойдём вдвоём. Иди так, чтобы мы тебя видели».':'«Рацию выключил. Показывай дорогу на ферму».']);}},
    {t:'Погоди здесь',close:1}]);
  if (stage==='pickup' && !S.flags.cordonExtracted) return cordonMessage(e.name,['«Слышу группу. Иди, встретимся у костра».']);
  if (stage==='pickup') {
    cordonSet('north','Спасённые передали частоту Серого. Выйди на связь у северного перехода.');
    return cordonMessage(e.name,['«А то бы так и лежали у колеса. Бери частоту Серого. Вызывай с насыпи у северных ворот, отсюда ангар не слышно».']);
  }
  return cordonMessage(e.name,[stage==='escort'?'«Идём за тобой до фермы. Если потеряемся — вернись».':'«Руку пожал бы, да бинт жалко. Спасибо, что зашёл».']);
}
function cordonTick() {
  if (!BIG) return;
  cordonStart();
  const stage=cordonStage();
  if (stage==='voice' && (S.dead.shust || (byS('shust') && hostile(byS('shust'),P)))) cordonSet('confirm','У костра осталась копия вызова Шустрого.');
  if (S.blow?.stage || !['escort','rescue','pickup'].includes(stage)) return;
  const men=cordonMen();
  if (!men.length) { S.flags.cordonLoss=1; cordonSet('lastLog','Оба сталкера погибли. Отыщи резервный журнал у машины.'); return; }
  if (stage==='pickup' && !S.flags.cordonExtracted && men.every(e=>dE(e,P)>650)) {
    settleCordonMen('village','fire'); S.flags.cordonExtracted=1; save(true);
  }
  if (stage==='escort') {
    const safe=locPt('farm','safe');
    if (dE(P,safe)<96 && men.every(e=>dE(e,safe)<128)) {
      settleCordonMen('farm','safe');
      cordonSet('listen','На ферме тебе передали частоту Серого. Остался второй сеанс в релейной будке.');
    }
  }
}
function storyPrompt(cand) {
  const stage=cordonStage(), step=CORDON_STEPS[stage];
  if (!step) return;
  if (['voice','pickup','rescue'].includes(stage) || (stage==='confirm' && byS('wolf') && !hostile(byS('wolf'),P)) || stage==='escort' || stage==='north' || stage==='decode') return;
  const p=stage==='confirm'?locPt('village','fire'):cordonPoint(step), d=dE(P,p);
  if(d<48 && los(P.x,P.y,p.x,p.y)) {
    const label=stage==='tracks'?'Осмотреть борозду в земле':stage==='confirm'?'Прочитать вахтенный журнал':step[3];
    if (stage==='cache') {
      const stash=objs.find(o=>o.stash==='column_wayman');
      if(stash && d<44) cand(d-16,{k:'loot',o:stash,label:cacheFieldQuiet(stash)?'Прочитать записку в схроне':'Схрон путейца · дождись затишья'});
    } else cand(d-35,{k:'story',stage,label});
  }
}
function cordonConfirm() {
  cordonSet('relay','Катушка и Мел ушли по ложному вызову. Проверь релейную будку у Восточной канавы.');
  cordonMessage('Вахтенный журнал',['Две подписи карандашом: Катушка и Мел. Ушли к разбитой колонне. Обратно никто не расписался.',
    'Напротив позывного Шустрого дежурный приписал: «Сигнал местный. Слишком чистый для севера». В этих местах ещё стоит релейная будка.']);
}
function cordonUse(stage) {
  if (stage!==cordonStage()) return;
  switch(stage) {
    case 'broken':
      cordonSet('decode','Память КПК Шустрого цела. Неси её в бункер.');
      return cordonMessage('КПК Шустрого',['Экран треснул, под крышкой осталась карта памяти. Ты заворачиваешь её в кусок сухой подкладки.']);
    case 'foxNote':
      cordonSet(S.dead.shust?'confirm':'voice','В блокноте Лиса записан позывной его брата Серого. Проверь копию вызова в деревне.');
      return cordonMessage('Блокнот Лиса',['«Серый, ангар. Передать лично». Между страниц лежит расшифровка вызова Шустрого с двумя незнакомыми позывными.']);
    case 'confirm': return cordonConfirm();
    case 'relay': case 'listen': return cordonRelay();
    case 'tracks':
      cordonSet('rescue','След тянется к разбитой машине. Кто-то укрылся за колесом.');
      return cordonMessage('След у колонны',['Два отпечатка каблука, потом длинная борозда. На глине осталась нитка от лямки. След уходит от схрона к машине на северо-востоке.']);
    case 'lastLog':
      cordonSet('north','Из аварийного журнала восстановлена частота Серого.');
      return cordonMessage('Аварийный журнал',['Между кузовом и колесом зажат пакет с промасленной тетрадью. Последняя строка: «Серый. Северные ворота. Слушает до отбоя».']);
  }
}
function cordonExit() {
  const stage=cordonStage();
  if (stage!=='north' && stage!=='done') return false;
  if (stage==='done') { msg('Серый ждёт в ангаре. Кордон остаётся открыт для свободной игры.','say'); return true; }
  const line=S.flags.cordonLoss?'«Журнал принял. Имена тоже запишу. Приходи в ангар, поговорим о том, кто их вызвал».':
    S.flags.cordonQuiet?'«Слышу запись. Седьмой вагон… Знаю, чей это голос. Сохрани оригинал и приходи в ангар».':
      '«Я Серый. Из деревни передали, что ты вывел людей. По поводу Стрелка поговорим лично. Найдёшь меня в ангаре».';
  S.stats.q++; S.flags.reachedExit=1;
  cordonSet('done','Глава «Кордон» завершена. Серый на связи, встреча назначена в ангаре на Свалке.');
  cordonMessage('Серый · северный канал',[line,'Связь обрывается. Координаты ангара записаны в КПК. До открытия Свалки можно остаться на Кордоне.']);
  return true;
}
// Тёмная колея и раздельные отпечатки связывают крышку с машиной.
function drawCordonTrail(inView) {
  if (!['tracks','rescue'].includes(cordonStage())) return;
  const a=cordonPoint(CORDON_STEPS.cache), b=locPt('column','wreck');
  if (!inView(a.x,a.y,180)) return;
  const ang=Math.atan2(b.y-a.y,b.x-a.x);
  ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(ang);
  const distance=dE(a,b);
  for(let i=15;i<distance-7;i+=7) {
    ctx.fillStyle='rgba(54,32,21,.42)';
    ctx.beginPath(); ctx.ellipse(i,2*Math.sin(i*.09),5.5,1.8,0,0,2*Math.PI); ctx.fill();
    if(i%2) { ctx.fillStyle='rgba(42,28,19,.58)'; ctx.beginPath(); ctx.ellipse(i,-7+2*Math.cos(i),3.6,1.8,.2,0,2*Math.PI); ctx.fill(); }
  }
  ctx.restore();
}
