/* ===================== RC1: «Свет в деревне», улики «Ночного гостя», переход на Свалку =====================
   Состояния цепочек хранятся в S и проходят через сохранение; награды выдаются один раз (флаг rewarded). */
function q5() { if (!S.q5) S.q5 = { st: 'not_started', rewarded: 0 }; return S.q5; }
function q3c() { if (!S.q3c) S.q3c = { story: 0, tracks: 0, barn: 0, warned: 0 }; return S.q3c; }
const villageLit = () => MAP_ID === 'rc1' && S && S.q5 && S.q5.st === 'completed';

/* предметы на земле (предохранитель, канистра): не запекаются в фон, исчезают после подбора */
function rcSpawnObjs() {
  if (MAP_ID !== 'rc1') return;
  for (let i = objs.length - 1; i >= 0; i--) if (objs[i].pick) objs.splice(i, 1);   // повторный applyState (загрузка/новая игра) не дублирует предметы
  [['fuse', 'fusebox', 'pump', 'fuse'], ['fuel', 'fuelcan', 'atp', 'fuel']].forEach(([id, k, loc, an]) => {
    if (S.flags['pk_' + id]) return;
    const p = locPt(loc, an); objs.push({ k: k, pick: id, x: p.x - 9, y: p.y - 8, w: 18, h: 16 });
  });
}
function drawPick(o) {   // растр G4 (gg7.js: g7Pick); ниже — прежняя отрисовка как запасной путь
  if (g7Pick(o)) return;
  ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-7, -4, 16, 12);
  if (o.pick === 'fuel') { ctx.fillStyle = '#9b2a1c'; ctx.fillRect(-8, -7, 15, 14); ctx.fillStyle = '#5a160e'; ctx.fillRect(-4, -10, 6, 4); }
  else { ctx.fillStyle = '#c9b88a'; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-2, -6, 4, 12); }
  ctx.restore();
}
function pickUp(o) {
  const err=receiveError(o.pick,1); if(err) { msg(err,'bad'); return; }
  addPacked(o.pick, 1); S.flags['pk_' + o.pick] = 1;
  const i = objs.indexOf(o); if (i >= 0) objs.splice(i, 1);
  play('pick');
  const q = q5();
  if (q.st === 'collecting' && has('fuse') && has('fuel')) { q.st = 'ready'; bulletin('Предохранитель и топливо у тебя. Неси к генератору у костра.'); }
  else if (q.st === 'not_started') news('Нашёл ' + ITEMS[o.pick].n.toLowerCase() + '. Кому-то в деревне это может пригодиться.');
}
/* разговор с Волком */
function wolfRC1Opts() {
  if (MAP_ID !== 'rc1') return [];
  const o = [], q = q5(), c = q3c();
  if (q.st === 'not_started' && S.q.flash >= 1) o.push({ t: 'Что с генератором у костра?', fn: () => {
    say('Стоит без дела с весны. Мотор целый, сгорел предохранитель, и бензина ни капли. Предохранитель поищи на старой водокачке к северу, там щиток был. Канистры видели на АТП, у бандитов. Принесёшь — вечером будет свет, и верстак заработает.');
    q.st = has('fuse') && has('fuel') ? 'ready' : 'collecting'; bulletin('Задание: Свет в деревне. Предохранитель — водокачка, топливо — АТП.');
  } });
  if (q.st === 'completed') o.push({ t: 'Как вам со светом?', fn: () => say('Живём как люди. Вечером у костра видно, кто пришёл, а не только кто стреляет. И верстак теперь твой, пользуйся.') });
  if (S.q3.sucker >= 1 && S.q3.sucker < 3 && !c.story) o.push({ t: 'Расскажи подробнее про хлев', fn: () => {
    c.story = 1;
    say('Хомяк ночью шёл мимо фермы и видел следы босых ног, будто человек, только пальцы длинные. От фермы они уходят к хлеву на востоке. Если пойдёшь — бинты возьми побольше: кого оно цепляет, тот кровью истекает.');
    bulletin('Ночной гость: следы у фермы ведут к хлеву. Возьми бинты.');
  } });
  if (S.q3.sucker === 3) o.push({ t: 'Ферма теперь спокойная?', fn: () => say('Лис говорит, по ночам больше никто не скребётся в стену. Спасибо тебе от всех, кто туда ходит.') });
  return o;
}
/* верстак после генератора: ремонт до 70%, оплата за каждый процент */
function benchOpts() {
  const worn=gunsBelow(70);
  const cost=worn.reduce((sum,gun)=>sum+Math.ceil((70-gun.cond)*6),0);
  return worn.length ? [{ t: 'Подлатать оружие до 70% · ' + cost + ' RU', k: 'key', d: S.money < cost, fn: () => { S.money -= cost; repairCopies(worn,70); sys('Оружие подлатано до 70%. Полный ремонт — у Сидоровича.'); } }]
    : [{ t: 'Оружие в порядке (выше 70%) — верстаку делать нечего', d: true, fn: () => {} }];
}
function gensetUse() {
  const q = q5();
  if (q.st === 'completed') { dialog(meCard(), ['Генератор ровно гудит. Рядом верстак: можно подлатать оружие, но не лучше 70%.'], () => benchOpts().concat([{ t: 'Отойти', close: 1 }]), 'dialog'); return; }
  if (q.st === 'not_started') { msg('Старый генератор. Без предохранителя и топлива не заведётся.', 'say'); return; }
  if (!has('fuse') || !has('fuel')) { msg('Не хватает: ' + [has('fuse') ? '' : 'предохранителя', has('fuel') ? '' : 'топлива'].filter(Boolean).join(' и ') + '.', 'bad'); return; }
  take('fuse', 1); take('fuel', 1); q.st = 'completed';
  if (!q.rewarded) { q.rewarded = 1; S.money += 600; S.rep += 10; S.stats.q++; }
  play('reload'); msg('Генератор заработал. Вечером в деревне будет свет.', 'good');
  bulletin('Выполнено: Свет в деревне. Деревня скинулась 600 RU, верстак у генератора открыт.'); save(true);
}
function qListRC1(L) {
  if (MAP_ID !== 'rc1') return;
  cordonList(L);
  const q = q5();
  if (q.st !== 'not_started') L.push({ id: 'light', loc: 'village', n: 'Свет в деревне', st: q.st === 'completed' ? 'd' : 'a',
    d: q.st === 'completed' ? 'Генератор работает, верстак у костра открыт.' : 'Нужны предохранитель (водокачка) и канистра топлива (АТП) — в любом порядке. ' + (has('fuse') ? 'Предохранитель есть. ' : '') + (has('fuel') ? 'Топливо есть. ' : '') + (q.st === 'ready' ? 'Неси к генератору у костра.' : '') });
}
function targetsRC1(out) {
  if (MAP_ID !== 'rc1') return;
  const story=cordonTarget(); if(story) out.push(story);
  const q = q5();
  if (q.st === 'collecting') {
    if (!has('fuse')) { const p = locPt('pump', 'fuse'); out.push({ qid: 'light', x: p.x, y: p.y, n: 'Предохранитель на водокачке' }); }
    if (!has('fuel')) { const p = locPt('atp', 'fuel'); out.push({ qid: 'light', x: p.x, y: p.y, n: 'Канистра на АТП' }); }
  }
  if (q.st === 'ready') { const p = locPt('village', 'generator'); out.push({ qid: 'light', x: p.x, y: p.y, n: 'Починить генератор' }); }
  const c = q3c();
  if (S.q3.sucker === 1 && !c.tracks) { const p = locPt('farm', 'tracks'); out.push({ qid: 'sucker', x: p.x, y: p.y, n: 'Следы у фермы' }); }
}
/* улики «Ночного гостя»: следы у фермы → осмотр хлева с предупреждением; убийство раньше улик тоже закрывает цепочку */
function cluesTick() {
  if (MAP_ID !== 'rc1' || !P || !P.alive || S.q3.sucker !== 1) return;
  const c = q3c();
  if (!c.tracks && dst(P.x, P.y, locPt('farm', 'tracks').x, locPt('farm', 'tracks').y) < 70) { c.tracks = 1; msg('Следы босых ног с длинными пальцами. Уходят на восток, к хлеву.', 'say'); bulletin('Ночной гость: следы у фермы ведут к хлеву.'); }
  const porch = locPt('lair', 'porch');
  if (!c.warned && dst(P.x, P.y, porch.x, porch.y) < 160) { c.warned = 1; msg('Внутри что-то дышит. Тварь невидима, пока не кинется; её удар вызывает кровотечение. Держи бинты под рукой.', 'bad'); }
  const ins = locPt('lair', 'inside');
  if (!c.barn && dst(P.x, P.y, ins.x, ins.y) < 90) { c.barn = 1; bulletin('Ночной гость: в хлеву кости и обрывки курток. Тварь где-то рядом.'); }
}
/* переход на Свалку: критерий «добраться до перехода» */
function exitUse() {
  if (cordonExit()) return;
  if (!S.flags.reachedExit) { S.flags.reachedExit = 1; news('Дошёл до северного перехода на Свалку.'); save(true); }
  msg(BIG ? 'За поворотом начинается дорога к кладбищу техники.' : 'Северный переход.', 'say');
}
function interactRC1(cand) {
  if (MAP_ID !== 'rc1') return;
  storyPrompt(cand);
  for (const o of objs) if (o.pick) { const d = dst(P.x, P.y, o.x + o.w / 2, o.y + o.h / 2); if (d < 44) cand(d - 15, { k: 'pick', o: o, label: 'Взять: ' + ITEMS[o.pick].n }); }
  const g = locPt('village', 'generator'), dg = dst(P.x, P.y, g.x, g.y);
  if (dg < 56) cand(dg - 5, { k: 'genset', label: q5().st === 'completed' ? 'Верстак у генератора' : 'Генератор' });
  const ex = locPt('exit', 'gate'), de = dst(P.x, P.y, ex.x, ex.y);
  if (de < 90) cand(de, { k: 'exit', label: cordonStage()==='north'?'Вызвать Серого':BIG?'Сверить маршрут':'Переход на Свалку' });
}
