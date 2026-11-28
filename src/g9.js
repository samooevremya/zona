/* ===================== Кордон+: заказы, напарники, костёр, сигналы SOS, кровосос ===================== */
/* все места берутся из справочника локаций (gloc.js) */
const SOS_SPOTS = locAnchors('sos').map(a => [a.x, a.y, a.loc]);
const CLEAR_SPOTS = locAnchors('clear').map(a => [a.x, a.y, 'у ' + LOC[a.loc].gen, a.loc]);
const SUCKER_HOME = locPt('lair', 'sucker');
const TALES = [
  'Был у нас один, Чижом звали. Нашёл «Каплю», обрадовался, сунул за пазуху и пошёл в бар хвастать. Неделю потом не мог согреться, хоть водкой отпаивай. Артефакт без контейнера носить — себя не уважать.',
  'Говорят, если ночью у насыпи слышишь, как кто-то зовёт по имени, не оборачивайся. Мой напарник обернулся. Нашли его ботинки, а самого нет.',
  'Сидорович, думаешь, жадный? Жадный. Но в долг даёт, если видит, что вернёшься. Мне в первую ходку аптечку дал, сказал: «Помрёшь — с тебя спишу».',
  'Вояки под мостом раньше за бутылку пропускали. Потом прапорщика сменили, теперь деньги подавай. Зона меняется, люди тоже.',
  'Слепой пёс глаз не имеет, а ты для него как фонарь. Чуют страх, честное слово. Стой спокойно, стреляй в первого, остальные дрогнут.',
  'Был тут один умник, хотел болт в «Трамплин» кинуть, чтобы посмотреть, как летает. Болт вернулся. Прямо в лоб. Шишка неделю держалась, зато теперь он аккуратный.',
  'Кабан в Зоне не тот, что в лесу дома. Он не убегает. Видишь, землю роет — отходи вбок, по прямой он быстрее тебя.',
  'Я как-то тайник нашёл, а в нём записка: «Брат, оставь хоть патроны». Оставил. Через месяц в том же месте нашёл аптечку и тушёнку. Тут так принято.',
  'После выброса небо ещё час красное. Старики говорят, в это время артефакты сами светятся. Только лезть туда рано, аномалии злые.',
  'Хлев за фермой на северо-востоке обходи. Оттуда наши не возвращаются, а Хомяк говорит, что видел там, как воздух сам по себе дышит.'
];
const RUMOR_FLAVOR = ['Сталкер наклоняется ближе и шепчет координаты.', 'Под водку язык развязался: он рассказал про чужой схрон.', 'Он чертит палкой на земле, где лежит заначка покойного товарища.'];

function plusDefaults() {
  if (!S.jobs) S.jobs = { offer: [], day: -1, act: null, done: 0, seq: 0 };
  if (S.jobs.seq == null) S.jobs.seq = 0;
  if (!S.sos) S.sos = { next: null, act: null };
  if (!S.dyn) S.dyn = { v: 0, seq: 0, npcs: [] };
  if (!S.q3) S.q3 = { sucker: 0 };
}
let plusInit = false;
function plusSounds() {
  if (plusInit) return; plusInit = true;
  SND.sucker = v => { tn(90, 55, 0.6, 0.22 * v, 'sawtooth', 0); tn(140, 70, 0.5, 0.1 * v, 'square', 0.05); nz(0.5, 500, 1.5, 0.12 * v, 'lowpass'); };
  SND.breath = v => { nz(0.9, 380, 1, 0.06 * v, 'lowpass'); };
}

/* ---------- заказы Сидоровича ----------
   у заказа есть id и статус: offered → active → rewarded | cancelled.
   группа зачистки помечена jobTag = id заказа; прогресс идёт только от своей группы. */
function jobGen(day) {
  let seed = day * 7919 + 13; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = [];
  const pool = ['hunt', 'trophy', 'art', 'clear', 'hunt2'];
  let guard = 0;
  while (out.length < 3 && guard++ < 50) {
    const k = pool[Math.floor(r() * pool.length)];
    if (out.some(o => o.t === k)) continue;
    let j = null;
    if (k === 'hunt') { const n = 3 + Math.floor(r() * 3); j = { k: 'hunt', kind: 'dog', n: n, got: 0, pay: n * 160, n_: 'Отстрел: слепые псы ×' + n, d: 'Псы обнаглели, к самому бункеру подходят. Перебей ' + n + ' штук где угодно на Кордоне. Засчитываются твои выстрелы и выстрелы нанятого напарника.' }; }
    if (k === 'hunt2') { const n = 1 + Math.floor(r() * 2); j = { k: 'hunt', kind: 'boar', n: n, got: 0, pay: n * 420, n_: 'Отстрел: кабаны ×' + n, d: 'Кабаны за насыпью разбивают тропу. Завали ' + n + '. Засчитываются твои выстрелы и выстрелы нанятого напарника.' }; }
    if (k === 'trophy') { const it = r() < 0.5 ? 'tail' : 'hoof', n = it === 'tail' ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2); j = { k: 'trophy', item: it, n: n, pay: sellPrice(it) * 2 * n, n_: 'Трофеи: ' + ITEMS[it].n + ' ×' + n, d: 'Заказчик из-за кордона платит вдвое против обычного: ' + sellPrice(it) * 2 + ' RU за штуку вместо ' + sellPrice(it) + '. Принеси ' + n + ' шт.' }; }
    if (k === 'art') j = { k: 'art', pay: 0, n_: 'Любой артефакт', d: 'Клиенту всё равно какой, лишь бы светился. Плачу в полтора раза больше обычной цены. Какой отдать, выберешь сам.' };
    if (k === 'clear') { const okSp = CLEAR_SPOTS.filter(clearReachable); if (!okSp.length) continue; const sp = okSp[Math.floor(r() * okSp.length)]; j = { k: 'clear', loc: sp[3], x: sp[0], y: sp[1], where: sp[2], n: 3, got: 0, pay: 1100, n_: 'Зачистка: бандиты ' + sp[2], d: 'Там встала группа бандитов и трясёт новичков. Убери всех троих. Неважно, кто их добьёт: важно, чтобы группы не стало.' }; }
    if (j.pay && k!=='trophy') j.pay=earnings(j.pay);
    j.t = k; out.push(j);
  }
  return out;
}
/* цель зачистки: на проходимой клетке, достижима пешком от деревни (с учётом закрытого моста) */
function clearReachable(sp) { const f = freeTile(sp[0], sp[1]); const v = LOC.village ? locPt('village', 'safe') : FIRE; return Math.hypot(f.x - sp[0], f.y - sp[1]) < 2.5 && !nearAnom(f.x * T, f.y * T, 30) && !!findPath(v.x, v.y, f.x * T, f.y * T); }
function jobOffers() {
  const day = Math.floor((S.min - 360) / 1440);
  if (S.jobs.day !== day) { S.jobs.day = day; S.jobs.offer = jobGen(day + (S.jobs.done || 0) * 31); }
  return S.jobs.offer;
}
const artIds = () => Object.keys(S.inv).filter(id => id.indexOf('art_') === 0 && S.inv[id] > 0);
const artFree = id => cnt(id) - S.belt.filter(b => b === id).length;
function jobReady(j) {
  if (!j || j.status !== 'active') return false;
  if (j.k === 'hunt' || j.k === 'clear') return j.got >= j.n;
  if (j.k === 'trophy') return cnt(j.item) >= j.n;
  if (j.k === 'art') return artIds().length > 0;
  return false;
}
function jobTake(j) {
  const a = JSON.parse(JSON.stringify(j));
  a.id = 'c' + (++S.jobs.seq); a.status = 'active'; a.taken = S.min;
  S.jobs.act = a;
  S.jobs.offer = S.jobs.offer.filter(o => o !== j);
  if (a.k === 'clear') spawnClear(a);
  bulletin('Заказ взят: ' + a.n_ + '.');
}
function spawnClear(j) {
  const have = ents.filter(e => e.alive && e.jobTag === j.id).length;
  for (let i = have; i < j.n - j.got; i++) {
    const p = freeTile(j.x + (i - 1) * 1.2, j.y + (i % 2) * 1.2);
    const e = mkHuman({ fac: 'bandit', x: p.x, y: p.y, wpn: i === 0 ? 'w_obrez' : 'w_pm' });
    e.jobTag = j.id; e.uid = dynId(); e.home = { x: p.x * T, y: p.y * T }; e.stay = 1; ents.push(e);
  }
}
/* отменённая/закрытая группа становится обычными бандитами: больше не связана с заказом */
function releaseGroup(id) { ents.forEach(e => { if (e.jobTag === id) { e.jobTag = 0; e.stay = 0; if (!e.angry) e.uid = null; } }); }
function jobCancel() {
  const j = S.jobs.act; if (!j) return;
  j.status = 'cancelled'; releaseGroup(j.id); S.jobs.act = null; S.rep -= 2;
  bulletin('Заказ отменён: ' + j.n_ + '.');
}
function jobTurnIn(artId) {
  const j = S.jobs.act;
  if (!j || j.status !== 'active' || !jobReady(j)) return false;
  let pay = j.pay;
  if (j.k === 'art') {
    const id = artId || artIds().find(x => artFree(x) > 0) || artIds()[0];
    if (!id || !cnt(id)) return false;
    pay = artPay(id);
    if (artFree(id) <= 0) { const i = S.belt.indexOf(id); if (i >= 0) S.belt.splice(i, 1); }
    take(id, 1);
  }
  if (j.k === 'trophy') take(j.item, j.n);
  j.status = 'rewarded'; S.jobs.act = null;          // сначала закрываем, потом платим: повторная сдача невозможна
  if (j.k === 'clear') releaseGroup(j.id);
  S.money += pay; S.jobs.done = (S.jobs.done || 0) + 1; S.rep += 4; S.stats.q++;
  if (S.jobs.done % 5 === 0) { give('medkit', 2); give('grenade', 1); sys('Премия за постоянство: аптечка ×2, граната.'); }
  say(['Вот это я понимаю, работа. Держи.', 'Без обмана. Деньги твои.', 'Нормально. Заходи ещё, заказы будут.'][S.jobs.done % 3]);
  rewardReceipt(j.n_,[pay+' RU',...(S.jobs.done%5===0?['Аптечка ×2','Граната']:[])]); save(true);
  return true;
}
const artPay = id => Math.round(sellPrice(id) * 1.5 / 10) * 10;
function previewOffer(title,description,reward,accept) {
  const previous=panel.opts;
  say(description);sys('Награда · '+reward);
  panel.opts=()=>[
    {t:'Принять · '+title,k:'key',fn:()=>{panel.opts=previous;accept();}},
    {t:'Пока откажусь',fn:()=>{panel.opts=previous;say('Хорошо. Если передумаешь, заходи.');}}
  ];
}
function jobOpts() {
  const o = [];
  const j = S.jobs.act;
  if (j) {
    if (j.k === 'art' && jobReady(j)) {
      artIds().forEach(id => {
        const onBelt = artFree(id) <= 0;
        const sure = panel && panel.artSure === id;
        o.push({ t: 'Сдать: ' + ITEMS[id].n + ' · ' + artPay(id) + ' RU' + (onBelt ? (sure ? ' · снять с пояса, подтверждаю' : ' · надет на пояс') : ''), k: onBelt ? 'bad' : 'key', fn: () => {
          if (onBelt && !sure) { panel.artSure = id; sys('«' + ITEMS[id].n + '» висит на поясе. Нажми ещё раз, чтобы снять и сдать.'); return; }
          panel.artSure = null; jobTurnIn(id);
        } });
      });
    } else if (jobReady(j)) o.push({ t: 'Сдать заказ: ' + j.n_ + ' · ' + j.pay + ' RU', k: 'key', fn: () => jobTurnIn() });
    else o.push({ t: 'Как там мой заказ?', fn: () => say('«' + j.n_ + '». ' + jobProgress(j) + ' Не тяни.') });
    o.push({ t: 'Отказаться от заказа', k: 'bad', fn: () => { jobCancel(); say('Ну и ладно. Найду другого.'); } });
  } else {
    const L = jobOffers();
    if (!L.length) o.push({ t: 'Есть заказы?', fn: () => say('На сегодня всё разобрали. Завтра приходи.') });
    L.forEach(x => o.push({ t: 'Заказ: ' + x.n_ + (x.pay ? ' · ' + x.pay + ' RU' : ' · ×1,5 от цены'), fn: () => previewOffer(x.n_,x.d,x.pay ? x.pay+" RU" : "полторы цены артефакта",()=>{ if(!S.jobs.act && jobOffers().includes(x)) jobTake(x); }) }));
  }
  return o;
}
function jobProgress(j) {
  if (j.k === 'hunt' || j.k === 'clear') return 'Сделано ' + Math.min(j.got, j.n) + ' из ' + j.n + '.';
  if (j.k === 'trophy') return 'С собой ' + cnt(j.item) + ' из ' + j.n + '.';
  return 'Артефакта при тебе нет.';
}
function freeTile(x, y) {
  for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = Math.floor(x) + dx, ty = Math.floor(y) + dy;
    if (tx > 1 && ty > 1 && tx < PW - 1 && ty < MH - 1 && nav[ty * MW + tx]) return { x: tx + 0.5, y: ty + 0.5 };
  }
  return { x: x, y: y };
}

/* ---------- напарник ---------- */
function hireOpts(e) {
  const o = [];
  if (e.named || e.robbed || e.guard || e.patrol || e.sos) return o;
  if (e.follow) {
    o.push({ t: e.wait ? 'Пошли дальше' : 'Жди здесь', fn: () => { e.wait = !e.wait; e.waitAt = e.wait ? { x: e.x, y: e.y } : null; say(e.wait ? 'Понял, держу место.' : 'Иду за тобой.'); } });
    o.push({ t: 'Свободен, спасибо', fn: () => { endHire(e, 'Бывай. Если что, я у костра.'); } });
  } else if (!ents.some(x => x.alive && x.follow)) {
    const price = 350;
    o.push({ t: 'Пойдёшь со мной? · ' + price + ' RU на сутки', k: 'key', d: S.money < price || S.rep < 0, fn: () => {
      S.money -= price; e.follow = 1; e.wait = 0; e.hireEnd = S.min + 1440; e.hirePaid = price; setCampSeat(e, false); e.trip = null; if (!e.uid) e.uid = dynId();
      say(['Деньги вперёд, это правильно. Веди, только под пули зря не подставляй.', 'Сутки мои. Спину прикрою, но в аномалии за тобой не полезу.', 'Договорились. Скажешь ждать — буду ждать.'][e.seed % 3]);
      sys(e.name + ' идёт с тобой до ' + clockStr(e.hireEnd) + '.'); news('Нанят напарник: ' + e.name + '.');
    } });
  }
  return o;
}
function endHire(e, line) {
  e.follow = 0; e.wait = 0; e.waitAt = null;
  e.home = { x: FIRE.x + rnd(-60, 60), y: FIRE.y + rnd(-40, 40) }; e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
  if (!e.sid && !e.angry) e.uid = null;
  if (line) say(line);
}
const offCam = o => Math.abs(o.x - cam.x) > VW / 2 / Z + 48 || Math.abs(o.y - cam.y) > VH / 2 / Z + 48;
function nearAnom(x, y, pad) { return anoms.find(a => dst(a.x, a.y, x, y) < a.r + pad) || null; }
function followTick(e, dt) {
  if (!e.follow) return false;
  if (S.min > e.hireEnd) { endHire(e); msg(e.name + ': срок вышел, я в деревню.', 'say'); news('Контракт с напарником ' + e.name + ' закончился.'); return true; }
  if (e.wait && e.waitAt) { if (dE(e, e.waitAt) > 10) goTo(e, e.waitAt.x, e.waitAt.y, 70, dt); return true; }
  const tgt = inBunker(P.x, P.y) ? { x: HATCH.x + 30, y: HATCH.y + 20 } : (loftAt(P)?.stair || P);
  const d = dst(e.x, e.y, tgt.x, tgt.y);
  // догоняющий телепорт: только вне камеры, вне боя и в проверенную безопасную точку позади игрока
  if (d > 900 && !loftAt(P) && !inBunker(P.x, P.y) && !(P.combatT > 0) && offCam(e)) {
    const back = VW / 2 / Z / T + 3, p = freeTile(P.x / T - Math.cos(P.ang) * back, P.y / T - Math.sin(P.ang) * back);
    if (offCam({ x: p.x * T, y: p.y * T }) && !nearAnom(p.x * T, p.y * T, 20) && findPath(p.x * T, p.y * T, P.x, P.y,true)) {
      e.x = p.x * T; e.y = p.y * T; e.path = null; return true;
    }
  }
  const an = nearAnom(e.x, e.y, 26);
  if (an) { steer(e, e.x + (e.x - an.x), e.y + (e.y - an.y), 110, dt); return true; }   // в известную аномалию не идёт
  if (d > 70) goTo(e, tgt.x, tgt.y, d > 220 ? 125 : 88, dt);
  else e.ang += angD(e.ang, P.ang) * Math.min(1, dt * 2);
  return true;
}

/* ---------- время: отдых и сон проходят через одну модель ----------
   за час отдыха: сытость −2,4 (в движении −3,9); лечение +12 только без кровотечения и при сытости от 30;
   при нулевой сытости здоровье падает. Мир не симулируется покадрово: таймеры событий сверяются по S.min. */
const REST = { food: 2.4, heal: 12, starve: 7, danger: 12 };   // danger: ниже этой сытости отдых прерывается
/* одна модель и для прогноза, и для выполнения: simRest ничего не меняет, advanceWorldTime применяет её результат */
function simRest(minutes, ctx, st) {
  let food = st.food, hp = st.hp, done = 0, stop = '';
  const hours = minutes / 60;
  for (let i = 0; i < Math.ceil(hours - 1e-9); i++) {
    const part = Math.min(1, hours - i);
    if (food - REST.food * part < REST.danger) { stop = 'hunger'; break; }
    const fed = food >= 30;
    food = Math.max(0, food - REST.food * part);
    if (food <= 0) hp -= REST.starve * part;
    else if (fed && !st.bleed) hp += REST.heal * part * (ctx === 'sleep' ? 1.5 : 1);
    done += part * 60;
  }
  return { minutes: done, food: food, hp: clamp(hp, 1, 100), stop: stop, asked: minutes, healed: hp > st.hp };
}
function restPreview(h, ctx) { return simRest(h * 60, ctx || 'rest', { food: S.food, hp: P.hp, bleed: S.bleed }); }
const fmtH = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return (h ? h + ' ч' : '') + (mm ? (h ? ' ' : '') + mm + ' мин' : '') || '0 мин'; };
/* подпись кнопки: что будет на самом деле */
function restLabel(verb, minutes, ctx) {
  const r = simRest(minutes, ctx, { food: S.food, hp: P.hp, bleed: S.bleed });
  const real = r.minutes < minutes - 0.5;
  return verb + ' ' + fmtH(minutes) + (real ? ' → прервётся через ' + fmtH(r.minutes) + ' (голод)' : '') +
    ' · сытость ' + (Math.round(S.food * 10) / 10) + '→' + (Math.round(r.food * 10) / 10) + ', здоровье ' + Math.round(P.hp) + '→' + Math.round(r.hp) +
    (!r.healed && r.minutes > 0 && S.food < 30 ? ' (голодным не лечишься)' : '');
}
function restBlock(h) {
  if (S.bleed > 0) return BEREZKI?'Сначала останови кровь бинтом.':'Сначала останови кровь: перевяжись или используй аптечку.';
  if (S.food < REST.danger + REST.food) return 'Слишком голоден, чтобы отдыхать: сытость ' + Math.round(S.food) + '. Сначала поешь.';
  if (ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 520)) return 'Рядом враги, не до отдыха.';
  return '';
}
function advanceWorldTime(minutes, ctx) {
  const before = S.min;
  const blow=S.blow, safe=sheltered(P.x,P.y);
  if(blow && !blow.stage && blow.next<=before)blowout(0);
  const limit=!safe && blow?(blow.stage?0:Math.max(0,blow.next-before)):minutes;
  const r = simRest(Math.min(limit,minutes), ctx, { food: S.food, hp: P.hp, bleed: S.bleed });
  S.food = r.food; P.hp = r.hp; if (r.minutes > 0) P.st = 100;
  const end=before+r.minutes;
  while(blow && S.min<end){
    if(!blow.stage){
      S.min=Math.min(end,Math.max(S.min,blow.next));
      if(S.min>=blow.next)blowout(0);
    }else{
      const elapsed=Math.min(end-S.min,Math.max(0,blow.t));
      S.min+=elapsed;blowout(elapsed);
      if(!blow.stage)WX.red=0;
    }
  }
  S.min=end;ageRemains();
  if(r.minutes>0){
    updateCoat(r.minutes);
    if(livingZone)updateEnvironment(r.minutes);
  }
  cleanExpiredCrates();
  renewFieldCrates();
  const stop = r.stop === 'hunger' ? 'Отдых прерван через ' + fmtH(r.minutes) + ': голод стал опасным (сытость ' + (Math.round(S.food * 10) / 10) + '). Поешь, потом отдыхай.' : '';
  const done = r.minutes;
  // события, у которых прошёл срок, закрываются сразу и честно
  plusDefaults();
  if (S.sos.act && S.min > S.sos.act.until) finishEncounter('timeout');
  ents.forEach(e => { if (e.alive && e.follow && S.min > e.hireEnd) { endHire(e); news('Контракт с напарником ' + e.name + ' закончился, пока ты отдыхал.'); } });
  if(r.minutes<minutes && !stop && !safe && blow?.stage)return {from:before,to:S.min,minutes:done,stop:'Надвигается выброс. Найди укрытие.'};
  return { from: before, to: S.min, minutes: done, stop: stop };
}

/* ---------- костёр ---------- */
const fireKey=f=>f.x+','+f.y;
const fireLit=f=>!!f && (!f.field||f.flame>S.min) && S.flags.coldHearths?.[fireKey(f)]==null;
const fireRain=()=>WX.rain>=.16 || ['rain','storm'].includes(S.wx?.k);
function relightFire(f,actor){
  if(fireLit(f) || fireRain() || S.blow?.stage || !actor?.alive || dE(actor,f)>80)return false;
  delete S.flags.coldHearths[fireKey(f)];
  if(actor===P)msg('Костёр разгорелся.','say');
  else {actor.ang=Math.atan2(f.y-actor.y,f.x-actor.x);sayLine(actor,'Дрова ещё сухие. Разгорится.');}
  return true;
}
let fireCheckState,fireCheckAt=-Infinity;
function updateCampFires(){
  if(fireCheckState===S && S.min>=fireCheckAt && S.min-fireCheckAt<1)return;
  fireCheckState=S;fireCheckAt=S.min;
  for(const f of WORLD_FIRES){
    if(fireRain()){
      (S.flags.coldHearths ||= {})[fireKey(f)]=S.min;
    }else if(!fireLit(f) && !S.blow?.stage && S.min-S.flags.coldHearths[fireKey(f)]>=15){
      const camper=ents.find(e=>e!==P && e.kind==='human' && e.alive && !e.tgt && !e.wounded &&
        !e.captive && !e.evacuating && !e.angry && dE(e,f)<75);
      if(camper)relightFire(f,camper);
    }
  }
}
function fireTeller() {
  const camp = WORLD_FIRES.reduce((best,f)=>dE(P,f)<dE(P,best)?f:best);
  const people=ents.filter(e=>e.alive && !e.wounded && !e.captive && !e.angry && e.fac==='loner' && !e.follow && !e.sos && dE(e,camp)<200);
  return people.length?people[(S.flags.tale||0)%people.length]:null;
}
function nearestFreeCache(x, y) {
  let b = -1, bd = 1e12;
  CACHES.forEach((c, i) => { if (S.caches[i]) return; const d = (c.x * T - x) ** 2 + (c.y * T - y) ** 2; if (d < bd) { bd = d; b = i; } });
  return b;
}
function restOpts(te) {
  const o = [], blk = restBlock();
  [1, 3].forEach(h => {
    o.push({ t: restLabel('Отдохнуть', h * 60, 'rest'), d: !!blk, fn: () => {
      const b2 = restBlock(); if (b2) { sys(b2); return; }
      const r = advanceWorldTime(h * 60, 'rest');
      if(te && r.minutes>0 && S.min>=(S.flags.nextCampTale||0)){
        const ti=((S.flags.lastTale||0)+1)%TALES.length;
        say(TALES[ti]);S.flags.lastTale=ti;S.flags.nextCampTale=S.min+240;
      }
      sys((r.minutes > 0 ? 'Прошло ' + fmtH(r.minutes) + '. Сейчас ' + clockStr(S.min) + '. ' : '') + (r.stop || '')); save(true);
    } });
  });
  if (blk) o.push({ t: blk, d: true, fn: () => {} });
  return o;
}
function atpSettled(){return !!(S.flags.atpClear || S.flags.shustFree || S.campaign?.liberated);}
function talkMemory(e){
  const notes=S.flags.campContacts ||= {};
  const key=e.sid || e.uid || (e.name+'_'+e.id);
  return notes[key] ||= {};
}
function rotatingLine(e,key,lines){
  const note=talkMemory(e);
  const index=note[key] ?? ((e.id||0)%lines.length);
  note[key]=index+1;
  return lines[index%lines.length];
}
function fieldGreeting(e){
  const lines=S.rep<0?['Слушаю. Только без фокусов.','Чего хотел?','Говори, я занят.']:
    ['Здорово.','Как сам?','Привет. С дороги?','Слушаю тебя.','Проходи, место найдётся.','Ну, как оно?','Доброго пути.'];
  return rotatingLine(e,'greeting',lines);
}
function nextCampNews(e){
  const lines=LORE.map((s,i)=>i===8 && atpSettled()?'На АТП теперь наши. Зайдёшь во двор — окликни дежурного.':s);
  if(lesserLore[e.sid])lines.unshift(lesserLore[e.sid]);
  return rotatingLine(e,'news',lines);
}
function restAtFire() {
  if (ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 520)) { msg('Рядом враги, не до посиделок.', 'bad'); return; }
  const te = fireTeller();
  S.flags.tale = ((S.flags.tale || 0) + 1);
  const ti=((S.flags.lastTale ?? -1)+1)%TALES.length;
  if(te)S.flags.lastTale=ti;
  const tale=TALES[ti];
  const card = te ? cardOf(te) : meCard();
  dialog(card, [te ? tale : 'У костра никого. Только треск поленьев и далёкий вой за насыпью.'], () => {
    const o = [...playerSongOptions(),...restOpts(te)];
    const ci = nearestFreeCache(P.x, P.y);
    if (te && !talkMemory(te).stash && has('vodka') && ci >= 0) o.push({ t: 'Налить ему водки и расспросить про ближайший схрон', k: 'key', fn: () => {
      if(talkMemory(te).stash || !has('vodka'))return;
      const i = nearestFreeCache(P.x, P.y); if (i < 0) { say('Да всё уж растащили, брат.'); return; }
      talkMemory(te).stash=true;take('vodka', 1); say(RUMOR_FLAVOR[S.flags.tale % RUMOR_FLAVOR.length]); revealCache(te.name, i);save(true);
    } });
    if(te){
      const memory=talkMemory(te),day=Math.floor(S.min/1440);
      if(memory.newsDay!==day || (memory.heard||0)<3)o.push({t:'Спросить, что слышно',fn:()=>{
        if(memory.newsDay!==day){memory.newsDay=day;memory.heard=0;}
        if(memory.heard>=3)return;
        memory.heard++;say(nextCampNews(te));
      }});
    }
    o.push({ t: 'Подняться', close: 1 });
    return o;
  }, 'dialog', te);
}

/* ---------- сигналы SOS: один жизненный цикл ----------
   active → finishEncounter(helped | self | dead | timeout | lost). Любой исход снимает метки, пишет журнал, убирает маркер. */
const SOS_FIRST = 150, SOS_GAP = [240, 360], SOS_TIME = 150, SOS_HOLD = 50;
/* Фазы нападающих (без заморозки, восприятие NPC не выключается):
   prep — идут к своей точке кольца (точки проверены путём точка→группа);
   siege — люди сидят в точке и редко стреляют на подавление, псы кружат у точки и не лезут;
          раненый нападающий сам переходит в штурм;
   storm — обычный бой (по времени SOS_HOLD, при приближении игрока или после его попадания);
   retreat — последний из 3–4 нападающих уходит, событие закрывается. Таймаут — только запасной исход. */
function finishEncounter(reason) {
  const a = S.sos.act; if (!a) return;
  const call = radioQueue.findIndex(note => note.k === 'radio');
  if (call >= 0) radioQueue.splice(call, 1);
  const allies = ents.filter(e => e.alive && e.sos === a.id), foes = ents.filter(e => e.alive && e.sosFoe === a.id);
  const lead = a.names && a.names[0] || (allies[0] && allies[0].name) || 'сталкеров';
  if (reason === 'helped' && !a.rewarded) {
    a.rewarded = 1;
    if (a.pk > 0 || S.flags.sosAssist === a.id) {
      for (const e of allies) if (e.uid) S.flags['sosFriend_' + e.uid] = 1;
    }
    const pay = a.pay, gift = a.gift;
    S.money += pay; give(gift, gift === 'a545' ? 30 : 1); S.rep += 8;
    if (allies[0]) msg(allies[0].name + ': — Спасибо, брат! Без тебя бы не выбрались.', 'say');
    rewardReceipt('Сигнал SOS · '+a.where,[pay+' RU',ITEMS[gift].n+(gift==='a545'?' ×30':'')]);
    bulletin('Отбили группу ' + lead + ' у ' + a.where + '. Одиночки это запомнят.');
    S.sos.saved = (S.sos.saved || []).concat([{ name: lead, t: S.min, where: a.where }]).slice(-10);
  } else if (reason === 'self') bulletin('Группа ' + lead + ' у ' + a.where + ' отбилась сама.');
  else if (reason === 'dead') bulletin('Сигнал SOS пропал. Группа ' + lead + ' у ' + a.where + ' погибла.');
  else if (reason === 'timeout') news('Связь с группой ' + lead + ' у ' + a.where + ' потеряна. Чем кончилось, неизвестно.');
  else if (reason === 'lost') news('Сигнал SOS из старой записи не восстановлен. Событие закрыто без последствий.');
  allies.forEach(e => { e.sos = 0; if (reason === 'helped' || reason === 'self') { e.resident = 1; e.rescuedAt = S.min; } else if (!e.angry) e.uid = null; e.stay = 0; e.home = { x: FIRE.x + rnd(-60, 60), y: FIRE.y + rnd(-40, 40) }; e.trip = { x: e.home.x, y: e.home.y, stage: 2 }; });
  foes.forEach(e => { e.sosFoe = 0; e.uid = null; e.stay = 0; e.sosPhase = null; if(e.kind==='dog')leaveHunt(e);else e.home={x:e.x,y:e.y}; });
  delete S.flags.sosAssist;
  S.sos.last = { reason: reason, where: a.where, t: S.min };
  S.sos.act = null; S.sos.next = S.min + rnd(SOS_GAP[0], SOS_GAP[1]);
}
function sosTick() {
  const s = S.sos;
  if (s.act) {
    const a = s.act;
    const allies = ents.filter(e => e.alive && e.sos === a.id);
    const foes = ents.filter(e => e.alive && e.sosFoe === a.id);
    if (dst(P.x, P.y, a.x * T, a.y * T) < 560) a.seen = 1;
    // осада: нападающие держат кольцо и постреливают, штурм через SOS_HOLD секунд или когда игрок рядом/их ранили
    if (!a.storm && (S.min > a.start + SOS_HOLD || a.pk > 0 || foes.some(e => e.hitByP || dE(e, P) < 420))) { a.storm = 1; foes.forEach(e => sosStorm(e, a)); }
    if (a.storm && !a.retreat && foes.length === 1 && (a.nFoes || 3) >= 3 && allies.length) { a.retreat = 1; const e = foes[0], ang = Math.atan2(e.y - a.y * T, e.x - a.x * T); e.sosPhase = 'retreat'; const f = freeTile(a.x + Math.cos(ang) * 22, a.y + Math.sin(ang) * 22); e.retreatTo = { x: f.x * T, y: f.y * T }; msg('Нападающий отходит.', 'say'); }
    // вне зоны обновления ИИ (далеко от игрока) бой не симулируется покадрово: исход решается расчётом
    const far = o => Math.abs(o.x - P.x) > 1400 && Math.abs(o.y - P.y) > 1400;
    if (allies.length && foes.length && S.min > a.start + SOS_HOLD + 25 && allies.concat(foes).every(far) && !a.offRes) {
      a.offRes = 1;
      const aHP = allies.reduce((s, e) => s + e.hp, 0), fHP = foes.reduce((s, e) => s + e.hp * (e.kind === 'dog' ? 0.8 : 1.2), 0);
      const roll = hash2(a.start | 0, (a.x * 7) | 0);    /* 0..1, воспроизводимо от события */
      const alliesWin = roll < aHP / (aHP + fHP);
      (alliesWin ? foes : allies).forEach(e => kill(e, null));
      if (alliesWin) allies.forEach(e => { e.hp = Math.max(10, e.hp * 0.6); });
      return;
    }
    if (!allies.length) finishEncounter('dead');
    else if (!foes.length) finishEncounter(a.pk > 0 || S.flags.sosAssist === a.id || dst(P.x, P.y, a.x * T, a.y * T) < 420 ? 'helped' : 'self');
    else if (S.min > a.until) finishEncounter('timeout');
    return;
  }
  if (!S.flags.intro || inBunker(P.x, P.y)) return;
  if (s.next == null) s.next = S.min + SOS_FIRST;
  if (S.min < s.next) return;
  // только точки, до которых игрок реально может дойти (север закрыт, пока не пройден мост)
  const spots = SOS_SPOTS.filter(p => { const d = dst(p[0] * T, p[1] * T, P.x, P.y); if (d < 600 || d > 2600) return false; const f = freeTile(p[0], p[1]); if (ents.some(e => e.alive && (e.fac === 'bandit' || e.fac === 'mutant') && !e.sosFoe && dst(e.x, e.y, f.x * T, f.y * T) < 700)) return false; return !!findPath(P.x, P.y, f.x * T, f.y * T); });   /* не рядом с уже живущими врагами */
  if (!spots.length) { s.next = S.min + 30; return; }
  const sp = spots[ri(0, spots.length - 1)], id = 's' + (++S.jobs.seq);
  const dog = chance(0.5), where = dirName(sp[0], sp[1]);
  const c = freeTile(sp[0], sp[1]);
  const names = [], allies0 = [];
  for (let i = 0; i < 2; i++) { const p = freeTile(c.x + i * 1.2, c.y + 0.6); const e = mkHuman({ fac: 'loner', x: p.x, y: p.y, wpn: chance(0.6) ? 'w_pm' : 'w_obrez' }); e.sos = id; e.uid = dynId(); e.stay = 1; e.home = { x: p.x * T, y: p.y * T }; allies0.push(e); ents.push(e); names.push(e.name); }
  // точки кольца: ~13,5 клетки от группы, путь точка→группа обязателен и не длиннее 32 клеток
  const ring = [], a0 = rnd(0, 6.28);
  for (let k = 0; k < 12 && ring.length < 4; k++) {
    const ang = a0 + k * 0.9, f = freeTile(c.x + Math.cos(ang) * 13.5, c.y + Math.sin(ang) * 13.5);   // за дальностью дневного зрения NPC (400 px)
    const pth = findPath(f.x * T, f.y * T, c.x * T, c.y * T);
    if (pth && pth.length <= 32 && !ring.some(r => Math.hypot(r.x - f.x, r.y - f.y) < 3)) ring.push(f);
  }
  if (!ring.length) { allies0.forEach(e => { const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); }); s.next = S.min + 30; return; }
  const nF = dog ? 4 : 3;
  for (let i = 0; i < nF; i++) {
    const rp = ring[i % ring.length], st = freeTile(rp.x + Math.cos(a0) * 5, rp.y + Math.sin(a0) * 5);
    const e = dog ? mkDog({ pack: 'sos', x: st.x, y: st.y }) : mkHuman({ fac: 'bandit', x: st.x, y: st.y, wpn: chance(0.6) ? 'w_pm' : 'w_obrez' });
    e.sosFoe = id; e.uid = dynId(); e.ringPt = { x: rp.x * T + rnd(-12, 12), y: rp.y * T + rnd(-12, 12) }; if(!dog)e.home={...e.ringPt}; e.sosPhase = 'prep'; e.stay = 1; e.supT = rnd(2, 4); ents.push(e);
  }
  s.act = { id: id, loc: sp[2] || locNear(sp[0], sp[1]).id, x: c.x, y: c.y, where: where, until: S.min + SOS_TIME, start: S.min, dog: dog ? 1 : 0, names: names, pk: 0, seen: 0, nFoes: dog ? 4 : 3, pay: earnings(ri(25, 55) * 10), gift: ['medkit', 'a545', 'antirad', 'grenade', 'cans'][ri(0, 4)] };
  radioNews('SOS! Сталкеры у ' + where + ': «' + (dog ? 'Псы окружили, патроны кончаются!' : 'Бандиты прижали, нужна помощь!') + '»');
  play('siren', undefined, undefined, 0.25);
}
function dirName(x, y) { return locNear(x, y).gen; }
function sosStorm(e,a){
  e.sosPhase=null;e.stay=0;e.crouch=0;
  const centre={x:a.x*T,y:a.y*T};
  if(e.kind!=='dog'){e.home=centre;return;}
  const prey=ents.find(o=>o.sos===a.id && mutantPrey(o));
  if(prey){e.tgt=prey;e.trail=centre;e.scentTime=6;}
}
/* поведение нападающего SOS до штурма; true — кадр обработан здесь */
function sosFoeAI(e, dt) {
  const a = S.sos.act;
  if (!a || e.sosFoe !== a.id) { e.sosPhase = null; return false; }
  if ((e.hitByP || e.hp < e.maxhp * 0.5) && e.sosPhase !== 'retreat') { sosStorm(e, a); return false; }   // ранил игрок или тяжело ранен — отвечает сам
  const c = { x: a.x * T, y: a.y * T };
  if (e.sosPhase === 'retreat') {
    const dest=e.retreatTo||e.home;
    goTo(e,dest.x,dest.y,130,dt);
    if (dst(e.x, e.y, c.x, c.y) > 560 || dE(e,dest)<20) { e.sosFoe = 0; e.uid = null; e.sosPhase = null; e.stay = 0; if(e.kind==='dog')leaveHunt(e);else e.home={x:e.x,y:e.y}; }
    return true;
  }
  if (e.sosPhase === 'prep') {
    if (goTo(e, e.ringPt.x, e.ringPt.y, e.kind === 'dog' ? 120 : 95, dt) < 22) e.sosPhase = 'siege';
    return true;
  }
  if (e.sosPhase === 'siege') {
    const ang = Math.atan2(c.y - e.y, c.x - e.x);
    if (e.kind === 'dog') {
      e.orb = (e.orb || rnd(0, 6.28)) + dt * 0.5;
      goTo(e,e.ringPt.x+Math.cos(e.orb)*20,e.ringPt.y+Math.sin(e.orb)*20,55,dt);
      e.ang += angD(e.ang, ang) * Math.min(1, dt * 3);
      if (chance(dt * 0.15)) play('dog', e.x, e.y, 0.4);
    } else {
      if (dst(e.x, e.y, e.ringPt.x, e.ringPt.y) > 14) goTo(e, e.ringPt.x, e.ringPt.y, 70, dt);
      e.crouch = 1; e.supT -= dt;
      const tg = ents.find(o => o.alive && o.sos === a.id && dE(o, e) < 520 && los(e.x, e.y, o.x, o.y));
      if (tg) { const ta = Math.atan2(tg.y - e.y, tg.x - e.x); e.ang += angD(e.ang, ta) * Math.min(1, dt * 4);
        if (e.supT <= 0 && Math.abs(angD(e.ang, ta)) < 0.2) { e.supT = rnd(2.8, 4.5); const W0 = WP[e.wpn] || WP.w_pm, W = Object.assign({}, W0, { dmg: W0.dmg * 0.3 }); fire(e, e.ang, W, 0.3, tg); /* подавление до штурма */ } }
      else e.ang += angD(e.ang, ang) * Math.min(1, dt * 2);
    }
    return true;
  }
  return false;
}

/* ---------- смена версии карты ----------
   если сохранение сделано на другой mapVersion, координаты событий пересчитываются по id локаций,
   а игрок и динамические NPC ставятся на ближайшую проходимую клетку у безопасного якоря. */
function remapToMap() {
  const from = S.mapVersion || 'kordon-0.6';
  if (from === MAP_VERSION) return;
  // копия исходного сохранения до миграции (MIGRATION.md)
  try { localStorage.setItem(KEY + '-backup-' + from, JSON.stringify(S)); } catch (e) {}
  S.migratedFrom = from;
  const j = S.jobs && S.jobs.act;
  if (j && j.k === 'clear') { const c = CLEAR_SPOTS.find(c => c[3] === j.loc) || CLEAR_SPOTS.find(c => c[2] === j.where); if (c) { j.loc = c[3]; j.x = c[0]; j.y = c[1]; j.where = c[2]; } }
  const a = S.sos && S.sos.act;
  if (a) { const sp = SOS_SPOTS.find(p => p[2] === a.loc) || SOS_SPOTS.find(p => 'у ' + LOC[p[2]].gen === 'у ' + a.where); if (sp) { const f = freeTile(sp[0], sp[1]); a.x = f.x; a.y = f.y; a.loc = sp[2]; } }
  if (BIG) { fog.fill(0); fogDirty = true; fogRegion = null; S.fog = ''; }   // старая маска разведки не совпадает с новой картой
  const big = BIG && from === 'kordon-rc1';
  (S.dyn && S.dyn.npcs || []).forEach(r => { if (big) { const q = RMp(r.x, r.y); r.x = q[0]; r.y = q[1]; } const f = freeTile(r.x / T, r.y / T); r.x = f.x * T; r.y = f.y * T; });
  if (!inBunker(S.x, S.y)) {
    const safe = LOC.village && LOC.village.anchors.safe ? locPt('village', 'safe') : null;
    const f = freeTile(S.x / T, S.y / T);
    // при смене карты игрок переносится в безопасную точку деревни (не в новую стену и не в аномалию)
    if (big) { const q = RMp(S.x, S.y), g = freeTile(q[0] / T, q[1] / T); S.x = g.x * T; S.y = g.y * T; }
    else if (MAP_ID === 'rc1' && safe) { S.x = safe.x; S.y = safe.y; } else { S.x = f.x * T; S.y = f.y * T; }
  }
  if (P) { P.x = S.x; P.y = S.y; if (typeof cam !== 'undefined') { cam.x = P.x; cam.y = P.y; } }   // игрок уже создан spawnWorld до миграции
  news('Карта обновлена (' + from + ' → ' + MAP_VERSION + '). Деньги, вещи и задания сохранены; места заданий пересчитаны' + (big ? '. Кордон стал больше: ты на том же месте, карту КПК придётся открыть заново. Копия старого сохранения оставлена.' : MAP_ID === 'rc1' ? ', тебя перенесли к костру деревни. Копия старого сохранения оставлена.' : '.'));
  S.mapVersion = MAP_VERSION;
}

/* ---------- живой мир в сохранении ----------
   S.dyn.npcs — снимок динамических людей/зверей (напарник, участники SOS, группа заказа).
   Ссылки (tgt) не пишем; базовые NPC с sid переопределяются, без sid создаются заново. */
const DYN_VER = 2;
function dynId() { S.dyn = S.dyn || { v: 0, seq: 0, npcs: [] }; return 'u' + (++S.dyn.seq); }
function dynSnapshot() {
  plusDefaults(); S.mapVersion = MAP_VERSION;
  S.dyn.v = DYN_VER;
  S.flags.fieldBodies=objs.filter(o=>o.k==='body'||o.k==='bones').map(o=>({...o}));
  delete S.flags.mutantBodies;
  S.dyn.npcs = ents.filter(e => e.alive && e !== P && !e.wildId && (BEREZKI || e.follow || e.sos || e.sosFoe || e.jobTag || e.traded || e.assisted || e.resident || e.evacuating || (e.inBattle && e.trip) || e.trip?.returnTo || (e.angry && !e.sid))).map(e => ({
    uid: e.uid || (e.uid = dynId()), sid: e.sid || null, kind: e.kind, fac: e.fac, name: e.name, wpn: e.wpn,
    x: e.x, y: e.y, hp: e.hp, maxhp: e.maxhp, mag: e.mag,
    ...(e.evacuating ? { evacuation: { sit: e.sit || 0, seat: e.seat || 0, trip: e.trip, shelterOrigin:e.shelterOrigin, shelterSpot:e.shelterSpot } } : {}),
    ...((e.inBattle && e.trip) || e.trip?.returnTo ? {returnTrip:e.trip, seat:e.seat} : {}),
    robberyAlarm:e.robberyAlarm || undefined,defendUntil:e.defendUntil>S.min?e.defendUntil:undefined,
    follow: e.follow ? 1 : 0, wait: e.wait ? 1 : 0, waitAt: e.waitAt || null, hireEnd: e.hireEnd || 0, hirePaid: e.hirePaid || 0,
    sos: e.sos || 0, sosFoe: e.sosFoe || 0, jobTag: e.jobTag || 0, stay: e.stay ? 1 : 0, home: e.home,
    sosPhase: e.sosPhase || null, retreatTo: e.sosPhase==='retreat'?e.retreatTo:undefined, ringPt: e.ringPt || null, traded: e.traded ? 1 : 0, resident: e.resident ? 1 : 0, assisted: e.assisted || undefined, inv: e.traded || e.assisted ? e.inv : undefined, money: e.traded ? e.money : undefined, wcond: e.traded ? e.wcond : undefined, guns:e.traded?e.guns:undefined, rescuedAt: e.rescuedAt
  }));
}
function dynRestore() {
  plusDefaults();
  const v = S.dyn.v || 0;
  remapToMap();
  for (const body of S.flags.fieldBodies || S.flags.mutantBodies || []) objs.push({...body,loot:{...body.loot}});
  ageRemains();
  // миграция старых сохранений (0.6): заказ без id, SOS без участников
  if (v < DYN_VER) {
    const j = S.jobs.act;
    if (j && !j.id) { j.id = 'c' + (++S.jobs.seq); j.status = 'active'; }
    if (S.sos.act && !S.dyn.npcs.length) { finishEncounter('lost'); }
    if (S.sos.t != null && S.sos.next == null) { S.sos.next = S.min + SOS_FIRST; delete S.sos.t; }
    S.dyn.v = DYN_VER;
  }
  const seen = new Set();
  (S.dyn.npcs || []).forEach(r => {
    if (seen.has(r.uid)) return; seen.add(r.uid);
    let e = r.sid ? ents.find(x => x.sid === r.sid && x.alive) : null;
    if (r.sid && !e) return;                                   // базовый NPC мёртв — не воскрешаем
    if (!e) {
      if (r.kind === 'dog') e = mkDog({ pack: 'sos', x: r.x / T, y: r.y / T });
      else e = mkHuman({ fac: r.fac, x: r.x / T, y: r.y / T, wpn: r.wpn, name: r.name });
      ents.push(e);
    }
    Object.assign(e, { uid: r.uid, x: r.x, y: r.y, hp: r.hp, maxhp: r.maxhp || e.maxhp, follow: r.follow, wait: r.wait, waitAt: r.waitAt, hireEnd: r.hireEnd, hirePaid: r.hirePaid,
      sos: r.sos, sosFoe: r.sosFoe, jobTag: r.jobTag, stay: r.stay, home: r.home || { x: r.x, y: r.y }, traded: r.traded, resident: r.resident, rescuedAt: r.rescuedAt, sosPhase: r.sosPhase, retreatTo:r.retreatTo, ringPt: r.ringPt });
    if(r.robberyAlarm)e.robberyAlarm=true;
    if(r.defendUntil>S.min)e.defendUntil=r.defendUntil;
    if (S.flags.angry && S.flags.angry[r.sid || r.uid]) e.angry = 1;
    if (r.assisted) e.assisted = true;
    if (r.inv && (r.traded || r.assisted)) {
      e.inv = r.inv;
      if(e.sid==='lz_barman' && !S.flags.barGuitarStock && !('guitar' in e.inv))e.inv.guitar=1;
    }
    if(e.sid==='lz_barman')S.flags.barGuitarStock=true;
    if (r.traded) { if (r.money != null) e.money = r.money; if (r.wcond) e.wcond = r.wcond; if(r.guns) e.guns=r.guns; }
    if (e.sid === 'sid') {
      const seat = NPCDEF.find(d => d.sid === 'sid');
      Object.assign(e, {x: seat.x*T, y: seat.y*T, hp: seat.hp, maxhp: seat.hp,
        home: {x: seat.x*T, y: seat.y*T}, stay: 1, follow: 0});
    }
    if (r.name) e.name = r.name;
    if (r.mag != null) e.mag = r.mag;
    if (e.follow) { e.sit = 0; e.trip = null; }
    if(r.returnTrip)Object.assign(e,{trip:r.returnTrip,seat:r.seat,sit:0});
    if (r.evacuation) Object.assign(e, r.evacuation, { evacuating: true, shelterOrigin:r.evacuation.shelterOrigin || e.home });
  });
  // заказ без живой группы (старое сохранение) — досоздать остаток, без повтора уже убитых
  const j = S.jobs.act;
  if (j && j.k === 'clear' && j.status === 'active' && j.got < j.n) spawnClear(j);
  // SOS без участников после загрузки — закрыть честно, без штрафа
  const a = S.sos.act;
  if (a && !ents.some(e => e.alive && (e.sos === a.id || e.sosFoe === a.id))) finishEncounter('lost');
}

/* ---------- кровосос ---------- */
function mkSucker() {
  return { id: nextId++, kind: 'sucker', sid: 'sucker', fac: 'mutant', name: 'Кровосос', x: SUCKER_HOME.x, y: SUCKER_HOME.y, r: 12, hp: 560, maxhp: 560,
    ang: 0, alive: 1, cool: 0, think: 0, home: { x: SUCKER_HOME.x, y: SUCKER_HOME.y }, kx: 0, ky: 0, flash: 0, step: 0, cloak: 1, state: 'lurk', st: 0, hp0: 560, breathT: 2 };
}
function aiSucker(e, dt) {
  e.cool -= dt; e.st -= dt; e.think -= dt; e.breathT -= dt;
  if (e.hp < e.hp0 - 1) { const lost = e.hp0 - e.hp; e.hp0 = e.hp; e.dmgAcc = (e.dmgAcc || 0) + lost; e.cloak = Math.min(e.cloak, 0.35); if (e.dmgAcc > 110 && e.state !== 'flee') { e.state = 'flee'; e.st = 1.8; e.dmgAcc = 0; play('sucker', e.x, e.y, 0.8); } }
  const want = e.state === 'strike' ? 0 : 1;
  e.cloak += (want - e.cloak) * Math.min(1, dt * (want ? (e.state === 'flee' ? 2.2 : 0.9) : 6));
  // признаки невидимки: следы в пыли, брызги на воде, короткое искажение (рисуется в drawSucker)
  e.printT = (e.printT || 0) - dt;
  if (e.cloak > 0.5 && e.printT <= 0 && (e.state === 'stalk' || e.state === 'flee' || e.wander)) {
    e.printT = 0.35; const side = (e.pr = !e.pr) ? 1 : -1, px = e.x + Math.cos(e.ang + 1.57) * 4 * side, py = e.y + Math.sin(e.ang + 1.57) * 4 * side;
    if (tAt(Math.floor(e.x / T), Math.floor(e.y / T)) === SW) for (let i = 0; i < 4; i++) parts.push({ x: e.x, y: e.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: 0.5, c: '#9fb4b8', s: 2 });
    else decals.push({ x: px, y: py, r: 2.2, a: 0.55, burn: 1 });
    if (decals.length > 400) decals.splice(0, decals.length - 400);
  }
  if (e.breathT <= 0) { e.breathT = rnd(3, 6); if (e.state !== 'lurk' || dE(e, P) < 300) play('breath', e.x, e.y, 0.9); }
  const t=mutantTarget(e,dt,night()?420:260,650);
  if(!t){e.state='lurk';roamDen(e,dt,40);return;}
  if(e.state==='lurk'){
    e.state='stalk';play('sucker',e.x,e.y,.6);
  }
  const a=Math.atan2(e.trail.y-e.y,e.trail.x-e.x),d=dE(e,e.trail);
  if (e.state === 'flee') {
    goTo(e,e.home.x,e.home.y,150,dt);
    if (e.st <= 0) { e.state = 'stalk'; e.cool = 1; }
    return;
  }
  if (e.state === 'stalk') {
    e.ang += angD(e.ang, a) * Math.min(1, dt * 5);
    const side = Math.sin(S.min * 0.9 + e.id) * 0.9;
    const flank={x:e.trail.x+Math.cos(a+1.57)*side*70,y:e.trail.y+Math.sin(a+1.57)*side*70};
    const skirt=d>120 && clearWalk(e.trail.x,e.trail.y,flank.x,flank.y,e.r);
    mutantApproach(e,skirt?flank:e.trail,d>120?135:175,dt);
    if (e.cool <= 0 && canStrike(e,t,46)) { e.state = 'strike'; e.st = 0.35; play('sucker', e.x, e.y, 1); }
    return;
  }
  if (e.state === 'strike') {
    e.ang=a;mutantApproach(e,e.trail,60,dt);
    if (e.st <= 0) {
      if (canStrike(e,t,50)) {
        hurt(t, rnd(18, 26), e, a);
        if (t === P) { S.bleed = Math.min(3, (S.bleed || 0) + 1); msg('Тебя схватили! Кровотечение.', 'bad'); }
        e.hp = Math.min(e.maxhp, e.hp + 15); e.hp0 = e.hp;
      }
      e.cool = rnd(1.2, 2); e.state = chance(0.45) ? 'flee' : 'stalk'; e.st = 1.2;
    }
  }
}
function drawSucker(e) {
  const vis = 0.07 + (1 - e.cloak) * 0.93;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.cloak > 0.5) {
    // мерцание: воздух дрожит
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(S.min * 40 + e.id);
    ctx.strokeStyle = 'rgba(220,230,240,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(Math.sin(S.min * 9 + i) * 2, Math.cos(S.min * 7 + i) * 2, 9 + i * 3, 0.3 * i, 0.3 * i + 2.4); ctx.stroke(); }
  }
  ctx.globalAlpha = vis;
  if (G3_READY()) {   // кадры G3: та же видимость/мерцание; в невидимой фазе тень не рисуется
    ctx.restore(); ctx.save();
    const ok = g3Draw(e, { opacity: vis, shadow: e.cloak < 0.5 });
    ctx.restore();
    if (ok) { ctx.globalAlpha = 1; return; }   // только после успешного кадра; иначе — прежняя отрисовка
    ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = vis;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 4, 14, 9, e.ang, 0, 6.28); ctx.fill();
  ctx.rotate(e.ang);
  const ph = e.step * 0.25;
  ctx.strokeStyle = '#5d4a44'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(2, s * 8); ctx.lineTo(12 + Math.sin(ph + s) * 3 + (e.state === 'strike' ? 8 : 0), s * 13); ctx.stroke(); });
  ctx.fillStyle = e.flash > 0 ? '#f0e0d8' : '#6e5852'; ctx.beginPath(); ctx.ellipse(-2, 0, 10, 11, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#5a4640'; ctx.beginPath(); ctx.ellipse(-5, 0, 5, 9, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? '#f0e0d8' : '#7d6660'; ctx.beginPath(); ctx.ellipse(9, 0, 6, 5.5, 0, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#8a5a55'; ctx.lineWidth = 1.6;
  for (let i = -1.5; i <= 1.5; i++) { ctx.beginPath(); ctx.moveTo(13, i * 1.6); ctx.quadraticCurveTo(17, i * 2.5 + Math.sin(S.min * 30 + i) * 2, 20 + (e.state === 'strike' ? 4 : 0), i * 3); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,60,40,' + (0.5 + (1 - e.cloak) * 0.5) + ')'; ctx.fillRect(10, -3, 2, 1.6); ctx.fillRect(10, 1.4, 2, 1.6);
  ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  ctx.restore(); ctx.globalAlpha = 1;
}
function suckerTick() {
  if (S.q3.sucker >= 1 && S.q3.sucker < 3 && !S.dead.sucker && !ents.some(e => e.kind === 'sucker')) ents.push(mkSucker());
}

/* ---------- общий тик и хуки ---------- */
function plusTick(dt) {
  plusDefaults(); plusSounds();
  for (const e of ents) if (e.follow && e.alive && e.tgt && !e.tgt.alive) e.tgt = null;
  S._plusT = (S._plusT || 0) - dt;
  if (S._plusT > 0) return;
  S._plusT = 1;
  sosTick(); campaignTick();
}
function plusKill(e, src) {
  plusDefaults();
  const byMe = src === P || (src && src.follow);
  const j = S.jobs.act;
  if (j && j.status === 'active') {
    if (j.k === 'hunt' && byMe && e.kind === j.kind) { j.got++; bulletin('Заказ: ' + Math.min(j.got, j.n) + ' из ' + j.n + (j.got >= j.n ? '. Возвращайся к Сидоровичу.' : '.')); }
    if (j.k === 'clear' && e.jobTag === j.id) { j.got++; if (j.got >= j.n) { bulletin('Заказ: бандиты ' + j.where + ' уничтожены. Возвращайся к Сидоровичу.'); } }
  }
  const a = S.sos.act;
  if (a && e.sosFoe === a.id && byMe) a.pk = (a.pk || 0) + 1;
  if (!BIG && e.kind === 'sucker') { S.q3.sucker = 2; bulletin('Кровосос в хлеву убит. Возвращайся к Волку.'); }
  if (e.follow) { bulletin('Погиб напарник ' + e.name + '.'); }
}
function plusInteract(cand) {
  const fire=WORLD_FIRES.find(f=>dE(P,f)<50);
  if(fire && !inBunker(P.x,P.y)){
    const lit=fireLit(fire);
    cand(dE(P,fire)-25,{k:lit?'rest':'relight',fire,label:lit?'Посидеть у костра':
      fireRain()?'Мокрое кострище':'Разжечь костёр'});
  }
  interactRC1(cand);
}
function plusTargets(out) {
  plusDefaults();
  targetsRC1(out);
  const a = S.sos.act; if (a) out.push({ qid: 'sos', x: a.x * T, y: a.y * T, n: 'SOS: помочь сталкерам у ' + a.where });
  const j = S.jobs.act;
  if (j && j.k === 'clear' && j.got < j.n) out.push({ qid: 'job', x: j.x * T, y: j.y * T, n: 'Зачистка ' + j.where });
  if (j && jobReady(j)) { const p = locPt('sid', inBunker(P.x, P.y) ? 'trader' : 'hatch'); out.push({ qid: 'job', x: p.x, y: p.y, n: 'Сдать заказ Сидоровичу' }); }
  if (S.q3.sucker === 1) out.push({ qid: 'sucker', x: SUCKER_HOME.x, y: SUCKER_HOME.y, n: 'Хлев за фермой' });
  if (S.q3.sucker === 2) { const w = byS('wolf'); if (w) out.push({ qid: 'sucker', x: w.x, y: w.y, n: 'Вернуться к Волку' }); }
}
function plusQList(L) {
  plusDefaults();
  const j = S.jobs.act;
  if (j) L.push({ id: 'job', loc: j.loc || 'sid', n: 'Заказ: ' + j.n_, d: j.d + ' ' + (jobReady(j) ? 'Готово, сдай Сидоровичу.' : jobProgress(j)), st: 'a' });
  if (S.q3.sucker) L.push({ id: 'sucker', loc: 'lair', n: 'Ночной гость', d: S.q3.sucker === 1 ? 'В хлеву за фермой на северо-востоке пропадают люди. Волк просит разобраться. Тварь невидима, пока не кинется: следи, где дрожит воздух.' : S.q3.sucker === 2 ? 'Тварь убита. Вернись к Волку за наградой.' : 'Выполнено. Деревня скинулась на награду.', st: S.q3.sucker === 3 ? 'd' : 'a' });
  qListRC1(L);
  if (S.sos.act) L.push({ id: 'sos', loc: S.sos.act.loc, n: 'Сигнал SOS', d: 'Сталкеры у ' + S.sos.act.where + ' просят помощи. Успей, пока их не добили.', st: 'a' });
}
function wolfPlusOpts() {
  plusDefaults();
  const o = wolfRC1Opts();
  if (S.q.flash >= 2 && S.q3.sucker === 0) o.push({ t: 'Говорят, люди пропадают?', fn: () => {
    say('Пропадают. Двое наших пошли к старому хлеву за фермой, на северо-востоке, и с концами. Хомяк клянётся, что видел там, как воздух сам по себе дышит. Сходи, только не ночью. Принесёшь доказательство, что тварь мертва, деревня скинется: две тысячи и аптечки.');
    S.q3.sucker = 1; bulletin('Задание: Ночной гость. Хлев за фермой на северо-востоке.');
  } });
  if (S.q3.sucker === 2) o.push({ t: 'С тварью в хлеву покончено', k: 'key', fn: () => {
    S.money += 2000; give('medkit', 3);rewardReceipt('Ночной гость',['2000 RU','Аптечка ×3']); S.q3.sucker = 3; S.stats.q++; S.rep += 15;
    say('Сам ходил смотреть: лежит. Ну и мерзость. Держи, как обещали, и спасибо от всей деревни.');
    sys('Получено: 2000 RU, Аптечка ×3. Задание выполнено.'); bulletin('Выполнено: Ночной гость.'); save(true);
  } });
  return o;
}
