/* ===================== звук ===================== */
let AC = null, master = null, noiseBuf = null;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340;
    const g = AC.createGain(); g.gain.value = 0.05;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(g); g.connect(master); src.start();
  } catch (e) { AC = null; }
}
function nz(dur, freq, q, vol, type, when) {
  const t = AC.currentTime + (when || 0), s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(Math.max(0.0001, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function tn(f0, f1, dur, vol, type, when) {
  const t = AC.currentTime + (when || 0), o = AC.createOscillator(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(Math.max(0.0001, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
const SND = {
  p: v => gunshot('p', v), s: v => gunshot('s', v), r: v => gunshot('r', v),
  shell: v => { const f = 4200 + Math.random() * 1500; tn(f, f * 0.98, 0.05, 0.05 * v, 'sine', 0.35); tn(f * 1.3, f * 1.28, 0.04, 0.03 * v, 'sine', 0.47); },
  knife: v => nz(0.09, 3000, 2, 0.35 * v, 'bandpass'),
  click: () => { nz(0.02, 3500, 4, 0.25, 'bandpass'); tn(900, 700, 0.025, 0.08, 'square'); },
  jam: () => { nz(0.04, 2200, 5, 0.35, 'bandpass'); nz(0.05, 1200, 5, 0.25, 'bandpass', 0.08); },
  beep: v => tn(1900, 1900, 0.05, 0.08 * v, 'square'),
  eat: () => { nz(0.08, 900, 2, 0.15, 'bandpass'); nz(0.08, 700, 2, 0.12, 'bandpass', 0.18); },
  reload: () => { nz(0.05, 2500, 3, 0.3, 'bandpass'); nz(0.06, 1700, 3, 0.3, 'bandpass', 0.35); },
  geiger: () => nz(0.01, 3200, 1, 0.4, 'highpass'),
  hurt: () => tn(150, 60, 0.18, 0.35, 'triangle'),
  dog: v => { tn(560, 280, 0.11, 0.22 * v, 'sawtooth'); tn(520, 260, 0.1, 0.18 * v, 'sawtooth', 0.15); },
  boom: v => { nz(1.3, 380, 0.5, 1.3 * v); tn(80, 28, 0.9, 0.7 * v); },
  anomG: v => { tn(95, 30, 0.9, 0.6 * v); nz(0.6, 300, 1, 0.4 * v); },
  anomE: v => { nz(0.35, 5000, 2, 0.6 * v, 'highpass'); tn(60, 58, 0.3, 0.25 * v, 'sawtooth'); },
  zap: v => nz(0.06, 6000, 3, 0.15 * v, 'highpass'),
  pda: () => { tn(1320, 1320, 0.06, 0.1, 'square'); tn(1760, 1760, 0.08, 0.1, 'square', 0.08); },
  bolt: () => tn(2600, 2200, 0.05, 0.08, 'triangle'),
  pick: () => tn(700, 1100, 0.1, 0.15, 'triangle'),
  stepGrass: v => nz(0.07, 700 + Math.random() * 300, 0.8, 0.13 * v),
  stepDirt: v => nz(0.06, 500 + Math.random() * 200, 1, 0.16 * v),
  stepHard: v => { nz(0.03, 2200 + Math.random() * 600, 1.5, 0.14 * v, 'bandpass'); nz(0.05, 300, 1, 0.08 * v); },
  stepWood: v => { nz(0.05, 450 + Math.random() * 150, 3, 0.2 * v, 'bandpass'); tn(140, 90, 0.05, 0.05 * v, 'triangle'); },
  stepWet: v => { nz(0.09, 1400 + Math.random() * 600, 1.2, 0.12 * v, 'bandpass'); nz(0.05, 400, 1, 0.06 * v); },
  stepGravel: v => { nz(0.08, 3000, 0.8, 0.12 * v, 'highpass'); nz(0.05, 600, 1, 0.07 * v); },
  stepDog: v => nz(0.03, 900, 2, 0.06 * v, 'bandpass'),
  voice: v => { const n = 3 + Math.floor(Math.random() * 4), f = 95 + Math.random() * 70; for (let i = 0; i < n; i++) { const ff = f * (0.85 + Math.random() * 0.35); tn(ff, ff * 0.92, 0.09, 0.07 * v, 'triangle', i * 0.1); nz(0.03, 2500, 2, 0.03 * v, 'bandpass', i * 0.1 + 0.05); } },
  radio: v => { nz(0.25, 2500, 1, 0.1 * v, 'bandpass'); SND.voice(v * 0.7); nz(0.08, 3000, 2, 0.12 * v, 'bandpass', 0.6); },
  thunder: () => { nz(2.6, 140, 0.4, 0.9); nz(0.5, 500, 0.6, 0.5); },
  siren: () => { tn(380, 760, 1.8, 0.1, 'sawtooth'); tn(760, 380, 1.8, 0.1, 'sawtooth', 1.8); },
  blow: () => { nz(3.5, 90, 0.4, 1.2); tn(55, 30, 3, 0.8); }
};
function play(name, x, y, mul) {
  if (!AC || !SND[name]) return;
  let v = mul || 1;
  if (x !== undefined && P) { const d = dst(P.x, P.y, x, y); v *= clamp(1 - d / 950, 0, 1); if (v < 0.03) return; if (inBunker(P.x, P.y) !== inBunker(x, y)) return; }
  try { SND[name](v); } catch (e) {}
}

/* ---------- выстрелы: щелчок, хлопок, низ, хвост с эхом ---------- */
let verb = null, verbIn = null;
function makeVerb() {
  const sr = AC.sampleRate, len = Math.floor(sr * 1.8), b = AC.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (t < 0.012 ? 0 : 1) * (t > 0.09 && t < 0.11 ? 1.8 : 1); } }
  verb = AC.createConvolver(); verb.buffer = b;
  verbIn = AC.createGain(); verbIn.gain.value = 0.55;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  verbIn.connect(lp); lp.connect(verb); verb.connect(master);
}
const GUN = {
  p: { crack: 2600, cv: 0.9, cd: 0.035, body: 520, bv: 1.1, bd: 0.11, thump: [150, 45], tv: 0.7, tail: 0.6 },
  s: { crack: 1900, cv: 1.0, cd: 0.05, body: 340, bv: 1.6, bd: 0.22, thump: [110, 32], tv: 1.1, tail: 1.0 },
  r: { crack: 3100, cv: 1.0, cd: 0.03, body: 620, bv: 1.0, bd: 0.09, thump: [170, 50], tv: 0.6, tail: 0.75 }
};
function gunshot(k, v) {
  if (!verb) makeVerb();
  const G = GUN[k], far = 1 - v, t = AC.currentTime;
  const out = AC.createGain(); out.gain.value = 1;
  const tone = AC.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 12000 - far * 10500;
  out.connect(tone); tone.connect(master);
  const send = AC.createGain(); send.gain.value = 0.35 + far * 0.9; out.connect(send); send.connect(verbIn);
  const burst = (dur, f, q, vol, type, when) => {
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = AC.createGain(); const st = t + (when || 0);
    g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(vol, st + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(st, Math.random() * 0.4); s.stop(st + dur + 0.05);
  };
  const vv = v * (1 - far * 0.35);
  burst(0.006, 6000, 0.7, 1.2 * vv * (1 - far), 'highpass');
  burst(G.cd, G.crack, 0.9, G.cv * vv, 'bandpass');
  burst(G.bd, G.body, 0.6, G.bv * vv, 'lowpass');
  const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(G.thump[0], t); o.frequency.exponentialRampToValueAtTime(G.thump[1], t + 0.12);
  og.gain.setValueAtTime(G.tv * vv, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.2);
  burst(0.5 * G.tail + far * 0.6, 900 - far * 400, 0.5, 0.18 * v, 'lowpass', 0.015);
}

/* ===================== DOM-помощники ===================== */
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function sv(tag, attrs, text) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; }
function icon(id) { const s = sv('svg', { 'class': 'ic', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); s.appendChild(sv('use', { href: '#' + id })); return s; }
function btn(cls, text, fn, dis) { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', e => { e.stopPropagation(); fn(); }); if (dis) b.disabled = true; return b; }
const ICON = { knife: 'i-knife', w_pm: 'i-pm', w_obrez: 'i-obrez', w_aksu: 'i-aksu', medkit: 'i-medkit', bandage: 'i-bandage', antirad: 'i-antirad',
  vodka: 'i-vodka', bread: 'i-bread', sausage: 'i-sausage', cans: 'i-cans', grenade: 'i-grenade', a9: 'i-ammo', a12: 'i-ammo', a545: 'i-ammo',
  ar_jacket: 'i-jacket', ar_bandit: 'i-jacket', ar_zarya: 'i-suit', art_medusa: 'i-art', art_bengal: 'i-art', art_blood: 'i-art', tail: 'i-tail', tentacle: 'i-tail', flash: 'i-flash', damaged_pda: 'i-map', restored_pda: 'i-map', post_case: 'i-pack' };
const ICOL = { art_medusa: '#dc9330', art_bengal: '#7fb0c4', art_blood: '#d64541', medkit: '#9db264', bandage: '#9db264', antirad: '#9db264', flash: '#7fb0c4' };
function itemIcon(id) { if(id==='engraved_pm')id='w_pm'; if (id === 'energy') return icon('i-energy'); if (detectorImages[id]) return detectorImages[id].cloneNode(false); const g = g3Icon(id); if (g) return g; const b = b1Icon(id); if (b) return b; const i = icon(ICON[id] || 'i-pack'); if (ICOL[id]) i.style.color = ICOL[id]; return i; }
const FCOL = { loner: '#d9c25a', bandit: '#a79cc4', army: '#6fa35c', mutant: '#d64541', trader: '#7fb0c4' };
/*AVATAR*/
function person(c) {
  const p = el('div', 'person');
  p.appendChild(portraitFor(c));
  const d = el('div', 'grow');
  d.appendChild(el('div', 'pn', c.n));
  if (c.rank || c.grp) d.appendChild(el('div', 'pm', [c.rank, c.grp].filter(Boolean).join(' · ')));
  if (c.att) d.appendChild(el('div', 'pa' + (/враг/.test(c.att) ? ' foe' : /друг/.test(c.att) ? ' pal' : ''), c.att));
  if (c.money !== undefined) d.appendChild(el('div', 'price', c.money + ' RU'));
  p.appendChild(d);
  return p;
}
const cardOf = e => ({ ent: e, n: e.name, rank: RANKS[e.rank || 0], grp: FAC_N[e.fac], fac: e.fac, att: attWord(e) });
const SIDCARD = () => ({ ent: byS('sid') || { sid: 'sid', name: 'Сидорович', fac: 'trader' }, n: 'Сидорович', rank: 'ветеран', grp: 'Торговцы', fac: 'trader', att: 'нейтрал' });
const meCard = () => ({ isPlayer: 1, n: 'Меченый', rank: RANKS[rankOf(score())], grp: 'Одиночки', fac: 'loner', att: S.rep >= 20 ? 'свой среди одиночек' : S.rep <= -30 ? 'враг одиночек' : 'нейтрал', money: S.money });

/* ===================== панели ===================== */
let panel = null;
const ov = $('ov'), pbody = $('pbody'), ptitle = $('ptitle'), ptabs = $('ptabs');
function openPanel(kind, title, tabs) {
  panel = { kind: kind, tab: tabs ? tabs[0][0] : null, tabs: tabs, sel: null, hint: '' };
  pbody.replaceChildren(); pbody.scrollTop=0;
  ptitle.textContent = title;
  ov.classList.toggle('pause-open', kind==='menu');
  ov.setAttribute('aria-labelledby', kind==='menu'?'pause-heading':'ptitle');
  ov.classList.add('open');
  resetInput();
  drawTabs();
}
function drawTabs() {
  ptabs.textContent = '';
  ptabs.style.display = panel.tabs ? '' : 'none';
  (panel.tabs || []).forEach(t => {
    const b = btn('', t[1], () => { panel.tab = t[0]; panel.hint = ''; drawTabs(); refresh(); pbody.scrollTop = 0; });
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', panel.tab === t[0] ? 'true' : 'false');
    ptabs.appendChild(b);
  });
}
function closePanel() { if (!panel) return; const k = panel.kind; panel = null; ov.classList.remove('open','pause-open'); if (k === 'trader' || k === 'trade') save(true); }
$('pclose').addEventListener('click', closePanel);
ov.addEventListener('click', e => { if (e.target === ov && panel?.kind!=='menu') closePanel(); });
function refresh() {
  if (!panel) return;
  const top = pbody.scrollTop;
  const selectors = panel.kind === 'trade' ? ['.tr-col.mine','.tr-col.their','.clines','.cside:first-child','.cside:last-child'] : [];
  const positions = panel.scrollPositions ||= {};
  for (const sel of selectors) {
    const node = pbody.querySelector(sel);
    if (node && node.clientHeight) positions[sel] = node.scrollTop;
  }
  pbody.textContent = '';
  if (panel.hint) pbody.appendChild(el('p', 'hint', panel.hint));
  ({ dialog: drawDialog2, trade: drawTrade2, inv: drawInv2, loot: drawLoot, locker: drawLocker, pda: drawPda2, menu: drawMenu })[panel.kind === 'trader' ? 'dialog' : panel.kind]();
  for (const sel of selectors) {
    const node = pbody.querySelector(sel);
    if (node && positions[sel]) node.scrollTop = positions[sel];
  }
  pbody.scrollTop = top;
}

/* ---------- диалоги ---------- */
function dialog(card, lines, optsFn, kind, e) {
  openPanel(kind || 'dialog', 'Разговор');
  panel.card = card; panel.lines = lines.map(t => ({ s: 'npc', t: t })); panel.opts = optsFn; panel.e = e;
  refresh(); pbody.scrollTop = 0;
}
function say(t) { if (!panel || !panel.lines) { msg(t, 'say'); return; } panel.lines.push({ s: 'npc', t: t }); }
function sys(t) { if (!panel || !panel.lines) { msg(t, 'good'); return; } panel.lines.push({ s: 'sys', t: t }); }
function drawDialog() {
  pbody.appendChild(person(panel.card));
  const L = el('div', 'lines');
  panel.lines.slice(-8).forEach(l => L.appendChild(el('p', l.s, (l.s === 'npc' ? '— ' : l.s === 'me' ? '› ' : '') + l.t)));
  pbody.appendChild(L);
  const O = el('div', 'opts');
  panel.opts().forEach(o => O.appendChild(btn(o.k || '', o.t, () => {
    if (o.close) { closePanel(); if (o.fn) o.fn(); return; }
    panel.lines.push({ s: 'me', t: o.t });
    o.fn();
    if (panel && (panel.kind === 'dialog' || panel.kind === 'trader')) { refresh(); pbody.scrollTop = pbody.scrollHeight; }
  }, o.d)));
  pbody.appendChild(O);
}
function repairOffer() {
  const worn=gunsBelow(95);
  if(!worn.length) return null;
  const cost=worn.reduce((sum,w)=>sum+Math.ceil((100-w.cond)*ITEMS[w.id].price/4000)*10,0);
  return {t:'Починить оружие · '+cost+' RU',d:S.money<cost,fn:()=>{
    if(S.money<cost || !gunsBelow(95).length) return;
    S.money-=cost; repairCopies(worn,100); P.jam=0; say('Готово. Можешь забирать.'); sys('Оружие починено.');
  }};
}
function talk(e) {
  if(e.sid==='lz_tech') return dialog(cardOf(e),['Клемма, местный техник. Давай посмотрим, с чем пришёл.'],()=>[
    repairOffer() || {t:'Оружие в порядке',d:true},{t:'До встречи',close:1}
  ],'dialog',e);
  if (e.sid==='lz_barman') return dialog(cardOf(e),['Бар «Под стрехой». С дороги? Горячее кончилось, банка бодрящего найдётся.'],()=>[
    {t:'Покажи припасы',k:'key',fn:()=>openTrade(e)},
    {t:'Что слышно про маки?',fn:()=>say('Начнут слипаться глаза — выпей энергетик или выбирайся на дорогу. Кто лёг среди цветов, уже не встаёт.')},
    {t:'До встречи',close:1}
  ],'dialog',e);
  if (STORY_KEYS.includes(e.sid) || e.squadMate)return storyTalk(e);
  if (e.fac === 'army') {
    if (hostile(e,P)) return;
    if(e.guard!=='bridge' && e.guard!=='south'){
      const line=e.guard==='sphere'?SPHERE_WARNING:'Военный патруль. Проходи мимо.';
      return dialog(cardOf(e),[line],()=>[{t:'Уйти',close:1}],'dialog',e);
    }
    const south = e.guard === 'south';
    return dialog(cardOf(e), [south ? 'Назад. Здесь граница Зоны, проход закрыт.' : S.flags.bridgePaid ? 'А, это ты. Проходи.' : 'Стоять. Пятьсот за проход в обе стороны. Пересечёшь шлагбаум без оплаты — откроем огонь.'], () => [
      south ? { t: 'А если договоримся?', fn: () => say('Не договоримся. Свободен.') }
        : S.flags.bridgePaid ? { t: 'Я уже платил', fn: () => say('Помню. Проходи, не задерживай.') }
        : { t: 'Пропусти за 500 RU', k: 'key', d: S.money < 500, fn: () => { S.money -= 500; S.flags.bridgePaid = 1; openBarrier(); say('Другой разговор. Проходи, шлагбаум поднят. Туда и обратно, сколько хочешь.'); sys('Мост открыт.'); news('Заплатил военным 500 RU за проход под мостом.'); } },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  if (e.sid === 'petr' || e.sid === 'petr2') {
    return dialog(cardOf(e), [S.flags.atpClear ? 'Ну ты дал! АТП теперь наше. Тут пока и осядем.' : 'Тише. Бандиты на АТП, за бетонным забором. Мы тут вторые сутки лежим, ждём подмогу. Пойдёшь первым, мы следом.'], () => [
      { t: 'Что там внутри?', fn: () => say('Двор, два гаража. Человек семь, главарь с автоматом сидит в большом гараже. Там же и Шустрого держат.') },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  // обычный одиночка
  const lines = [S.rep >= 20 ? 'О, Меченый! Наслышан, наслышан.' : S.rep < 0 ? 'Чего надо? Про тебя тут нехорошее говорят.' : 'Здоров, брат. Чего хотел?'];
  dialog(cardOf(e), lines, () => {
    const o = [{ t: 'Что нового?', fn: () => { e.talked = (e.talked || 0) + 1; say(e.robbed ? 'Нам говорить не о чем.' : (lesserLore[e.sid] && e.talked%2===1 ? lesserLore[e.sid] : LORE[(e.seed + e.talked * 5) % LORE.length])); } }];
    if (!e.robbed) o.push({ t: 'Давай поторгуем', fn: () => openTrade(e) });
    hireOpts(e).forEach(x => o.push(x));
    if (!e.robbed && !e.follow && !DETECTORS[S.weapon]) o.push({ t: 'Ствол на него: «Выворачивай карманы»', k: 'bad', fn: () => robNpc(e) });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
}
function robNpc(e) {
  const tier = { knife: 0, w_pm: 1, w_obrez: 2, w_aksu: 3 };
  const p = clamp(0.45 + (tier[S.weapon] - tier[e.wpn]) * 0.18 + (P.hp > 60 ? 0.1 : -0.1) - (e.rank || 0) * 0.08, 0.1, 0.9);
  const crowd = ents.filter(o => o.alive && o.fac === 'loner' && o !== e && dE(o, e) < 300).length;
  S.rep -= crowd ? 25 : 15;
  if (chance(p) && !crowd) {
    const got = [];
    if (e.money) { S.money += e.money; got.push(e.money + ' RU'); e.money = 0; }
    const pockets={loot:e.inv,guns:e.guns,wcond:e.wcond};
    for(const id of Object.keys(e.inv)) {
      const n=collectStock(pockets,id);
      if(n) got.push(ITEMS[id].n+' ×'+n);
    }
    e.traded=1;
    e.robbed = 1;
    say('Ладно, ладно! Подавись. Зона всё видит, Меченый.');
    sys(got.length ? 'Отобрано: ' + got.join(', ') + '. Одиночки об этом узнают.' : 'У него ничего не было. Одиночки об этом узнают.');
  } else {
    say(crowd ? 'Мужики, гляньте! Этот на своих ствол наставил!' : 'Ах ты гнида! Ну давай!');
    anger(e); closePanel();
  }
}
function talkTrader() {
  dialog(SIDCARD(),[chapter()==='wake'?'Очнулся? У тебя на руке метка. Меченым и будем звать.':'Слушаю тебя, Меченый.'],traderOpts,'trader');
}
function traderOpts(){
  const o=storyTraderOptions().concat([{t:'Торговать',fn:()=>openTrade(null)}]);
  if (S.rep <= -30) o.push({ t: 'Уладить с одиночками · 2000 RU', k: 'key', d: S.money < 2000, fn: () => {
    S.money -= 2000; S.rep = 0; S.flags.angry = {}; ents.forEach(e => { if (e.fac === 'loner') e.angry = 0; });
    say('Ладно, замолвлю слово. Второй раз не возьмусь.');
  } });
  const repair=repairOffer(); if(repair) o.push(repair);
  { const till = Math.ceil((S.min - 360 + 1) / 1440) * 1440 + 360 - S.min, blk = !!restBlock();
    o.push({ t: restLabel('Отоспаться до утра:', till, 'sleep'), d: blk, fn: () => {
      const b = restBlock(); if (b) { sys(b); return; }
      const r = advanceWorldTime(till, 'sleep'); save(true);
      if (r.stop) { say('Не спится на пустой желудок, а?'); sys(r.stop + ' Сейчас ' + clockStr(S.min) + '.'); }
      else { say('Ложись вон на ящики. Утро вечера мудренее.'); sys('Наступило утро, ' + clockStr(S.min) + '. Игра сохранена.'); } } }); }
  o.push({ t: 'Закончить разговор', close: 1 });
  return o;
}

/* ---------- торговля ---------- */
function openTrade(e) {
  openPanel('trade', e ? 'Торг: ' + e.name : 'Торг: Сидорович');
  panel.e = e; refresh(); pbody.scrollTop = 0;
}
function sellPrice(id, toNpc) { const it = ITEMS[id]; return it.sell !== undefined ? Math.floor(it.sell * (toNpc ? 0.8 : 1)) : Math.max(1, Math.floor((it.price || 0) * (toNpc ? 0.5 : 0.35))); }
function openLoot(o) {
  if (!cacheFieldQuiet(o)) {
    msg('Крышку тянет вверх. Дождись, когда пыль осядет.', 'say');
    return;
  }
  if (o.loot.__tip) { delete o.loot.__tip; revealCache(o.name); }
  if (o.k === 'crate') return;
  openPanel('loot', o.anomalyId ? 'Схрон путейца' : o.k === 'cache' || o.k === 'hiding' ? 'Тайник' : o.k === 'safe' ? 'Сейф' : 'Обыск: ' + o.name); panel.o = o; refresh(); pbody.scrollTop = 0;
}
function drawLoot() {
  const o = panel.o, keys = Object.keys(o.loot).filter(k => k !== '__tip');
  if (!keys.length) { pbody.appendChild(el('p', 'note', 'Пусто.')); return; }
  keys.forEach(k => {
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(k === 'money' ? icon('i-pack') : itemIcon(k)); r.appendChild(t);
    r.appendChild(el('div', 'grow nm', k === 'money' ? o.loot[k] + ' RU' : ITEMS[k].n + (o.loot[k] > 1 ? ' ×' + o.loot[k] : '')));
    const error=k==='money'?'':receiveError(k,1,lootGun(o,k));
    if (error) r.appendChild(el('span','note',error));
    r.appendChild(btn('', 'Взять', () => {
      const got=collectStock(o,k);
      if (got) play('pick');
      panel.hint=o.loot[k]?'Остаток в контейнере: '+o.loot[k]+' шт.':'';
      recordContents(o); refresh();
    }, !!error));
    pbody.appendChild(r);
  });
  pbody.appendChild(btn('go', 'Взять всё', () => { lootAll(o); if(Object.keys(o.loot).length) refresh(); else closePanel(); }));
}

/* ---------- ПДА ---------- */
const PDA_TABS = [['map', 'Карта'], ['tasks', 'Задания'], ['log', 'Журнал'], ['stat', 'Данные']];
function drawPda() {
  if (panel.tab === 'map') {
    const bar = el('div', 'mapbar'); bar.appendChild(el('span', 'note', panel.zoom ? 'Листай карту пальцем.' : 'Кордон, Малая Зона и Свалка.'));
    bar.appendChild(btn('chip', panel.zoom ? 'Отдалить' : 'Приблизить', () => { panel.zoom = !panel.zoom; refresh(); }));
    pbody.appendChild(bar);
    const w = el('div', 'mapwrap' + (panel.zoom ? ' zoom' : '')), c = el('canvas'); c.id = 'bigmap'; c.width = PW * 6; c.height = MH * 6;
    w.appendChild(c); pbody.appendChild(w);
    drawMapTo(c.getContext('2d'), 6, true);
    if (panel.zoom) requestAnimationFrame(() => { const pp = worldMapPoint(P); w.scrollLeft = pp.x / (PW * T) * w.scrollWidth - w.clientWidth / 2; w.scrollTop = pp.y / (MH * T) * w.scrollHeight - w.clientHeight / 2; });
    pbody.appendChild(mapLegend());
  } else if (panel.tab === 'tasks') {
    const L = qList();
    if (!L.length) pbody.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
    L.sort((a, b) => (a.st === 'a' ? 0 : 1) - (b.st === 'a' ? 0 : 1)).forEach(q => {
      const r = el('div', 'row'), g = el('div', 'grow');
      g.appendChild(el('div', 'nm', q.n + (q.st === 'd' ? ' · выполнено' : q.st === 'f' ? ' · провалено' : ''))); g.appendChild(el('div', 'ds', q.d));
      r.appendChild(g); pbody.appendChild(r);
    });
  } else if (panel.tab === 'log') {
    for(const q of qList().filter(q=>q.st==='a')){
      const row=el('div','row'),entry=el('div','grow');
      entry.append(el('div','nm',q.n),el('div','ds',q.d));
      row.appendChild(entry);pbody.appendChild(row);
    }
    if (!pbody.childElementCount && !S.news.length) pbody.appendChild(el('p', 'note', 'Записей пока нет.'));
    S.news.slice().reverse().forEach(n => { const r = el('div', 'row'), g = el('div', 'grow'); g.appendChild(el('div', 'tm', clockStr(n.t))); g.appendChild(el('div', 'ds lite', n.x)); r.appendChild(g); pbody.appendChild(r); });
  } else {
    pbody.appendChild(person(meCard()));
    pbody.appendChild(el('h3','','Полевые заметки'));
    pbody.appendChild(el('p','note','Электра гаснет ненадолго от болта. Первые искры предупреждают о возврате заряда.' + (MAP_ID==='rc1'?' Так можно пройти Восточную канаву справа от военного моста.':'')));
    pbody.appendChild(el('p','note','Воронку выдаёт пыль: кружащийся мусор тянет к центру, осевший оставляет время пройти. Болт показывает границу.' + (BIG?' У разбитой колонны путеец спрятал вещи прямо под воронкой.':'')));
    const st = el('div', 'stat');
    [['Убито людей', S.stats.kS], ['Убито мутантов', S.stats.kM], ['Выполнено заданий', S.stats.q], ['Найдено артефактов', S.stats.art], ['Очки рейтинга', score()], ['Отношение одиночек', S.rep]].forEach(x => { st.appendChild(el('span', '', x[0])); st.appendChild(el('b', '', String(x[1]))); });
    pbody.appendChild(st);
  }
}
/* ---------- меню ---------- */
function leavePauseSettings() {
  delete panel.pausePage;
  drawMenu();
  document.querySelector('#pause-card .pause-settings').focus();
}
function drawMenu() {
  const card=$('pause-card'), nav=el('nav','start-nav');
  // The title mark is shared with the start screen, which retains its own node.
  const heading=el('h2','pause-caption','Пауза');
  heading.id='pause-heading';
  nav.setAttribute('aria-labelledby',heading.id);
  card.replaceChildren(title.name.cloneNode(true),heading,nav);
  if (panel.pausePage==='settings') {
    heading.textContent='Настройки';
    nav.appendChild(btn('','Настроить управление',openControlEditor));
    const soundLabel=()=>AC && master && master.gain.value===0?'Включить звук':'Выключить звук';
    const sound=btn('',soundLabel(),()=>{
      audioInit(); if (master) master.gain.value=master.gain.value?0:0.55;
      sound.textContent=soundLabel();
    });
    nav.appendChild(sound);
    nav.appendChild(btn('','Назад',leavePauseSettings));
    return;
  }
  if (panel.pausePage==='help') {
    heading.textContent='Управление и сохранения';
    nav.appendChild(el('p','pause-note',IN.touch
      ? 'Левый джойстик — ходьба. Удерживай кнопку с прицелом для огня и тяни её в сторону цели. Для бега удерживай кнопку бега, для смены оружия коснись его панели.'
      : 'WASD — движение, Shift — бег, C — присесть, V — прыжок. Мышь — прицел и огонь, R — перезарядка, E — взаимодействие.'));
    if (!IN.touch) nav.appendChild(el('p','pause-note','F — болт, G — граната, Q — аптечка, I — рюкзак, M — КПК, Esc — пауза.'));
    nav.appendChild(el('p','pause-note','Игра сохраняется автоматически у костра и у Сидоровича. Вручную можно сохраниться, когда рядом нет врагов.'));
    nav.appendChild(btn('start-primary','Назад',()=>{delete panel.pausePage;drawMenu();card.querySelector('.pause-help').focus();}));
    return;
  }
  if (panel.pausePage==='restart') {
    heading.textContent='Начать заново?';
    nav.appendChild(el('p','pause-note','Текущая игра начнётся с начала Кордона.'));
    nav.appendChild(btn('start-primary','Отмена',()=>{delete panel.pausePage;drawMenu();card.querySelector('.restart').focus();}));
    nav.appendChild(btn('','Начать новую игру',()=>{applyState(freshS());closePanel();intro();}));
    return;
  }
  const message=el('p','pause-note');
  message.setAttribute('role','status');
  nav.appendChild(btn('start-primary','Продолжить игру',closePanel));
  nav.appendChild(btn('','Сохранить игру',()=>slotPicker(nav,true,drawMenu)));
  nav.appendChild(btn('','Загрузить сохранение',()=>slotPicker(nav,false,drawMenu)));
  nav.appendChild(btn('pause-settings','Настройки',()=>{
    panel.pausePage='settings'; drawMenu();
    card.querySelector('button').focus();
  }));
  nav.appendChild(btn('restart','Начать заново',()=>{panel.pausePage='restart';drawMenu();card.querySelector('button').focus();}));
  card.appendChild(message);
  card.appendChild(btn('pause-help','Подсказки',()=>{panel.pausePage='help';drawMenu();card.querySelector('button').focus();}));
}

/* ===================== карта ===================== */
const TCOL = ['#3f4628', '#5a4b34', '#3c3c37', '#26332c', '#7a7a6d', '#1f2a17', '#4a3a29', '#6f4a39', '#2f3a22', '#58534a', '#55554d'];
const miniC = document.createElement('canvas'), fogC = document.createElement('canvas');
// Четыре пикселя на клетку. Каналы маски хранят покрытие всех дорог и асфальта
// отдельно: после интерполяции узкая тропа, широкий двор и развилка сохраняют форму.
function buildBigMini() {
  const K = 4;
  miniC.width = PW * K; miniC.height = MH * K;
  const g = miniC.getContext('2d');
  const base = document.createElement('canvas');
  base.width = PW; base.height = MH;
  const bg = base.getContext('2d'), terrain = bg.createImageData(PW, MH), roads = bg.createImageData(PW, MH);
  const palette = [0x655a46, 0x655a46, 0x655a46, 0x405653, 0x817e71, 0x484735,
       0x6b5d4b, 0x726152, 0x58573e, 0x655e51, 0x797465, 0x24251e];
  const tiles = surfaceTiles();
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    const t = tiles[y * MW + x], c = palette[t], i = (y * PW + x) * 4;
    const k = 0.69 + vnoise(x, y, 6) * 0.37 + hash2(x, y) * 0.24;
    terrain.data[i] = (c >> 16) * k;
    terrain.data[i + 1] = ((c >> 8) & 255) * k;
    terrain.data[i + 2] = (c & 255) * k;
    terrain.data[i + 3] = roads.data[i + 3] = 255;
    roads.data[i] = t === DI || t === AS ? 255 : 0;
    roads.data[i + 1] = t === AS ? 255 : 0;
  }
  bg.putImageData(roads, 0, 0);
  g.drawImage(base, 0, 0, miniC.width, miniC.height);
  const mask = g.getImageData(0, 0, miniC.width, miniC.height);
  bg.putImageData(terrain, 0, 0);
  g.drawImage(base, 0, 0, miniC.width, miniC.height);
  g.save(); g.scale(K, K);
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    if (map[y * MW + x] !== TR) continue;
    const n = hash2(x, y), crown = yardTreeCrown && yardTreeCells.has(y * MW + x) ? yardTreeCrown : CANOPY[Math.floor(n * CANOPY.length)];
    const width = (2.8 + n * 0.9) * CAN_PAD;
    g.drawImage(crown, x + 0.5 - width / 2, y + 0.4 - width / 2, width, width);
  }
  g.restore();
  // Порог убирает размытие внутри полотна, мягкая кромка соединяет диагональные клетки.
  for (let i = 0; i < mask.data.length; i += 4) {
    const coverage = mask.data[i];
    if (!coverage) { mask.data[i + 3] = 0; continue; }
    const asphalt = clamp((mask.data[i + 1] - 80) / 80, 0, 1);
    const pixel = i / 4, x = pixel % miniC.width, y = Math.floor(pixel / miniC.width);
    const grain = (hash2(x, y) - 0.5) * 13 + (vnoise(x, y, 7) - 0.5) * 22;
    mask.data[i] = 148 - asphalt * 32 + grain;
    mask.data[i + 1] = 128 - asphalt * 15 + grain;
    mask.data[i + 2] = 103 + asphalt * 5 + grain;
    mask.data[i + 3] = clamp((coverage - 35 + grain) * 1.45, 0, 238);
  }
  // putImageData не смешивает прозрачность. Переиспользуем временный холст для наложения.
  base.width = miniC.width; base.height = miniC.height;
  bg.putImageData(mask, 0, 0); g.drawImage(base, 0, 0);
  if (ART) {
    // Фактура сухой травы смягчает переход между грунтом и обочиной в масштабе HUD.
    g.save(); g.scale(0.4, 0.4); g.globalCompositeOperation = 'soft-light';
    artFill(g, 'grass_dry', 0, 0, miniC.width / 0.4, miniC.height / 0.4);
    g.restore();
  }
  g.scale(K, K); g.imageSmoothingQuality = 'high';
  if (BIG && C1 && ART) {
    g.strokeStyle = '#473e31'; g.lineWidth = 0.32;
    g.beginPath();
    for (const [, x1, y1, x2, y2] of CORDON_FENCES) {
      g.moveTo(x1, y1); g.lineTo(x2, y2);
    }
    g.stroke();
  }
  if(BIG && ART){g.save();g.scale(1/T,1/T);drawWorldTracks(g);g.restore();}
  HOUSES.forEach((h, i) => {
    if (h.x >= PW) return;
    g.fillStyle = '#36372e'; g.fillRect(h.x - 0.2, h.y - 0.2, h.w + 0.5, h.h + 0.6);
    g.fillStyle = '#887d6a'; g.fillRect(h.x, h.y, h.w, h.h);
    if (ROOFS[i]) drawHouseRoof(g, h, i, 1/T);
  });
  if (BIG) {
    g.save(); g.scale(1/T,1/T); drawLesserInstallations(g); drawDumpDetails(g); g.restore();
    g.fillStyle='rgba(134,61,44,.65)';
    for(let y=-22;y<35;y+=.5) for(let x=18;x<71;x+=.5)
      if (poppyBed(x,y)<.9 && tAt(Math.floor(x),LESSER_TOP+Math.floor(y))===GR)
        g.fillRect(x, LESSER_TOP+y,.32,.32);
  }
  objs.forEach(o => {
    if (o.k==='freightWagon' && lesserSprites[o.sprite])
      g.drawImage(lesserSprites[o.sprite],o.x/T,o.y/T,o.w/T,o.h/T);
    if (o.static && o.solid && o.x < PW * T && (o.k === 'bus' || o.k === 'car')) {
      g.fillStyle = o.k === 'bus' ? '#8a6a2a' : '#6b6a5e';
      g.fillRect(o.x / T, o.y / T, Math.max(1, o.w / T), Math.max(1, o.h / T));
    }
  });
}
async function buildMini() {
  fogC.width = PW; fogC.height = MH;
  if (TOLIK_AT_JUNCTION && ART && C1 && window.CORDON_AERIAL) {
    const photo = new Image();
    photo.src = window.CORDON_AERIAL;
    try {
      await photo.decode();
      if (photo.width === PW * 4 && photo.height === MH * 4) {
        miniC.width=photo.width; miniC.height=photo.height;
        miniC.getContext('2d').drawImage(photo,0,0);
        return;
      }
    } catch (e) { /* Старый браузер использует карту из клеток мира. */ }
  }
  if (BIG) { buildBigMini(); return; }
  if (ART) {
    const K = 4; miniC.width = PW * K; miniC.height = MH * K;
    const g = miniC.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(groundC, 0, 0, PW * T, WH, 0, 0, PW * K, MH * K);
    HOUSES.forEach((h, i) => { if (h.x < PW && ROOFS[i]) drawHouseRoof(g, h, i, K/T); });
    for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) if (map[y * MW + x] === TR) { g.fillStyle = 'rgba(30,42,22,0.75)'; g.beginPath(); g.arc(x * K + K / 2, y * K + K / 2, K * 0.9, 0, 6.28); g.fill(); }
    return;
  }
  miniC.width = PW; miniC.height = MH;
  const g = miniC.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) { g.fillStyle = TCOL[map[y * MW + x]]; g.fillRect(x, y, 1, 1); }
  HOUSES.forEach(h => { if (h.x < PW) { g.fillStyle = h.mat === 'conc' ? '#5d5e56' : '#6a4f3c'; g.fillRect(h.x, h.y, h.w, h.h); } });
  objs.forEach(o => { if (o.static && o.solid && o.x < PW * T) { g.fillStyle = o.k === 'bus' ? '#8a6a2a' : '#6b6a5e'; g.fillRect(o.x / T, o.y / T, Math.max(1, o.w / T), Math.max(1, o.h / T)); } });
}
function updateFog() {
  if (!fogDirty) return; fogDirty = false;
  const [left,top,right,bottom] = fogRegion || [0,0,PW,MH];
  fogRegion = null;
  const x0=Math.max(0,left), y0=Math.max(0,top), w=Math.min(right,PW)-x0, h=Math.min(bottom,MH)-y0;
  if (w<=0 || h<=0) return;
  const g=fogC.getContext('2d'), id=g.createImageData(w,h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const i=4*(y*w+x); id.data[i]=10; id.data[i+1]=12; id.data[i+2]=9;
    id.data[i+3]=fog[(y0+y)*MW+x0+x] ? 0 : 60;
  }
  g.putImageData(id,x0,y0);
}
const MAP_INK = {
  shelter: '#ffe1a1', player: '#68d1da', target: '#6ad2dc', sos: '#f07560', hatch: '#9bbdc8',
  cache: '#e7bd79', neutral: '#efd168', enemy: '#f16e59', friend: '#95d677'
};
function mapSymbol(g, kind, x, y, u, angle = 0, ringOnly = false) {
  const color = kind==='locker' ? '#8ccac4' : MAP_INK[kind];
  g.save(); g.translate(x, y); g.scale(u, u);
  g.lineJoin = 'round'; g.fillStyle = color; g.strokeStyle = '#252823'; g.lineWidth = 1.3;
  g.beginPath();
  if (kind === 'player') {
    g.rotate(angle); g.moveTo(7, 0); g.lineTo(-4.7, -4.9); g.lineTo(-2.7, 0); g.lineTo(-4.7, 4.9); g.closePath();
  } else if (kind === 'shelter') {
    g.moveTo(0,-6); g.lineTo(6,0); g.lineTo(4.5,0); g.lineTo(4.5,5);
    g.lineTo(1.4,5); g.lineTo(1.4,1); g.lineTo(-1.4,1); g.lineTo(-1.4,5);
    g.lineTo(-4.5,5); g.lineTo(-4.5,0); g.lineTo(-6,0); g.closePath();
  } else if (kind === 'locker') {
    g.rect(-5,-3.8,10,7.6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-4,-1); g.lineTo(4,-1); g.stroke();
    g.fillStyle='#242a28'; g.fillRect(-1,-1,2,3); g.restore(); return;
  } else if (kind === 'hatch' || kind === 'cache') {
    g.rect(-2.8, -2.8, 5.6, 5.6);
  } else {
    const target = kind === 'target' || kind === 'sos';
    const r = target ? 4.8 : 2.9;
    g.arc(0, 0, r, 0, 2 * Math.PI);
    g.fillStyle = '#252823'; if (!ringOnly) g.fill(); g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = color; g.lineWidth = 1.25; g.stroke();
    if (!ringOnly && (target || kind === 'friend')) {
      g.beginPath(); g.arc(0, 0, target ? 2.35 : 1.05, 0, 2 * Math.PI); g.fillStyle = color; g.fill();
    }
    g.restore(); return;
  }
  g.fill(); g.stroke(); g.restore();
}
function mapLegend() {
  const legend = el('div', 'legend map-key');
  for (const [kind, name] of [['player','Вы'], ['neutral','Нейтрал'], ['enemy','Враг'], ['friend','Друг'],
      ['target','Цель'], ['sos','SOS'], ['locker','Личный ящик'], ['cache','Тайник'], ['hatch','Бункер'], ...(S.blow?.stage ? [['shelter','Укрытие']] : [])]) {
    const item = el('span'), icon = el('canvas'); icon.width = icon.height = 32;
    mapSymbol(icon.getContext('2d'), kind, 16, 16, 2);
    item.append(icon, document.createTextNode(name)); legend.appendChild(item);
  }
  return legend;
}
function visibleContact(e) {
  return e !== P && e.alive && !inBunker(e.x, e.y) && !(e.cloak > 0.7) && dE(e, P) <= 520;
}
/* карта КПК: o.u — сколько пикселей холста в одном CSS-пикселе (маркеры и подписи одного экранного размера при любом масштабе);
   подписи раскладываются без наложения: сначала выбранная цель, потом места; не влезла ни в одну позицию — не рисуется */
function drawDetectorContacts(g, s, u) {
  const range = activeDetectorRange();
  if (!range) return;
  g.save();
  for (const a of arts) {
    if (dE(P, a) > range) continue;
    const x = a.x / T * s, y = a.y / T * s, r = 3.8 * u;
    g.beginPath(); g.moveTo(x, y-r); g.lineTo(x+r, y); g.lineTo(x, y+r); g.lineTo(x-r, y); g.closePath();
    g.lineWidth = 3*u; g.strokeStyle = '#22251d'; g.stroke();
    g.lineWidth = 1.3*u; g.strokeStyle = '#ffe298'; g.stroke();
  }
  g.restore();
}
function drawMapTo(g, s, full, o) {
  o = o || { ppl: 1, cache: 1 };
  const u = o.u || 1;
  updateFog();
  g.imageSmoothingEnabled = !!ART;
  g.drawImage(miniC, 0, 0, PW * s, MH * s);
  g.drawImage(fogC, 0, 0, PW * s, MH * s);
  drawDetectorContacts(g, s, u);
  const busy = [];   // занятые прямоугольники: маркеры и подписи
  const mark = (x, y, r) => busy.push([x - r, y - r, x + r, y + r]);
  const hx = HATCH.x / T * s, hy = HATCH.y / T * s;
  mapSymbol(g, 'hatch', hx, hy, u); mark(hx, hy, 5 * u);
  for (const c of objs) if(c.k==='locker') {
    const x=(c.x+c.w/2)/T*s, y=(c.y+c.h/2)/T*s;
    mapSymbol(g,'locker',x,y,u); mark(x,y,6*u);
  }
  if (o.ppl) ents.forEach(e => {
    if (visibleContact(e)) mapSymbol(g, playerRelation(e), e.x / T * s, e.y / T * s, u);
  });
  if (o.cache) objs.forEach(c => {
    if (c.k !== 'cache' || S.caches[c.cacheId] !== 1) return;
    const x = c.x / T * s, y = c.y / T * s;
    mapSymbol(g, 'cache', x, y, u); mark(x, y, 5 * u);
  });
  const selQ = o.sel || [], tracked = trackedTarget(), labs = [];
  qTargets().forEach(q => {
    const point = worldMapPoint(q);
    const x = point.x / T * s, y = point.y / T * s;
    const selected = selQ.some(t => t.qid === q.qid && t.x === q.x && t.y === q.y);
    g.globalAlpha = selected || q.qid === 'sos' || (tracked && q.qid === tracked.qid) ? 1 : 0.68;
    const onContact = o.ppl && ents.some(e => e.x === q.x && e.y === q.y && visibleContact(e));
    mapSymbol(g, q.qid === 'sos' ? 'sos' : 'target', x, y, (selected ? 1.45 : 1) * u, 0, onContact);
    g.globalAlpha = 1; mark(x, y, (selected ? 9 : 6) * u);
    if (selected) labs.push({ t: q.n, x, y, gap: 11 * u, pri: 0, font: '700 ' + Math.round(13 * u) + 'px Arial', c: '#c2f4f3' });
  });
  const shelter = blowShelterTarget();
  if (shelter) {
    const x = shelter.x / T * s, y = shelter.y / T * s;
    mapSymbol(g, 'shelter', x, y, 1.25*u); mark(x, y, 7*u);
    labs.push({t:'Укрытие', x, y, gap:9*u, pri:-1, font:'700 '+Math.round(13*u)+'px Arial', c:MAP_INK.shelter});
  }
  const pp = worldMapPoint(P);
  const px = pp.x / T * s, py = pp.y / T * s;
  mark(px, py, 8 * u);
  if (full) LOCATIONS.forEach(l => {
    if (l.id === 'sid') return;
    const cx = (l.bounds[0] + l.bounds[2]) / 2, cy = (l.bounds[1] + l.bounds[3]) / 2;
    const villageHub = l.id === 'zalissya';
    if (!villageHub && !fog[Math.min(MH - 1, Math.max(0, Math.round(cy))) * MW + Math.min(MW - 1, Math.round(cx))]) return;
    labs.push({ t: l.name, x: cx * s, y: cy * s, gap: villageHub ? 12*u : 0, pri: villageHub ? .5 : 1, font: '600 ' + Math.round(11.5 * u) + 'px Arial', c: 'rgba(232,222,186,0.95)' });
  });
  // раскладка подписей
  const hit = (a) => busy.some(b => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]);
  labs.sort((a, b) => a.pri - b.pri).forEach(L => {
    g.font = L.font; const w = g.measureText(L.t).width, h = parseFloat(L.font.split(' ')[1]) * 1.15, pad = 2 * u;
    const tries = L.gap ? [[L.gap, -h / 2], [-L.gap - w, -h / 2], [-w / 2, -L.gap - h], [-w / 2, L.gap]] : [[-w / 2, -h / 2], [-w / 2, -h * 1.6], [-w / 2, h * 0.6], [6 * u, -h / 2], [-w - 6 * u, -h / 2]];
    for (const [dx, dy] of tries) {
      const r = [L.x + dx - pad, L.y + dy - pad, L.x + dx + w + pad, L.y + dy + h + pad];
      if (r[0] < 0 || r[1] < 0 || r[2] > PW * s || r[3] > MH * s || hit(r)) continue;
      busy.push(r);
      g.textBaseline = 'top'; g.lineWidth = 3 * u; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(L.t, L.x + dx, L.y + dy); g.fillStyle = L.c; g.fillText(L.t, L.x + dx, L.y + dy);
      L.placed = 1; break;
    }
  });
  g.textBaseline = 'alphabetic'; g.lineWidth = 1;
  if (o.out) o.out.labels = labs.map(L => ({ t: L.t, placed: !!L.placed }));
  mapSymbol(g, 'player', px, py, u, P.ang);
}
const mini = $('mini'), mctx = mini.getContext('2d');
function miniNavigation() {
  const target=trackedTarget();
  const underground=inBunker(P.x,P.y);
  const floor=loftAt(P);
  const point=target && (floor && loftAt(target)!==floor?floor.landing:underground && !inBunker(target.x,target.y)?STAIRS:
    !underground && inBunker(target.x,target.y)?HATCH:target);
  const people=ents.filter(e=>e!==P && e.alive && e.kind==='human' &&
    loftAt(e)===floor && inBunker(e.x,e.y)===underground && dE(e,P)<=520).length;
  $('mini-people').textContent=people;
  $('mini-distance').textContent=point?Math.round(dE(P,point)/T*1.5)+' м':'';
  return point;
}
function miniArrow(point,size,s) {
  if(!point) return;
  const dx=(point.x-P.x)*s/T,dy=(point.y-P.y)*s/T;
  if(Math.hypot(dx,dy)<4) return;
  const edge=(size/2-16)/Math.max(1,Math.abs(dx),Math.abs(dy));
  const k=Math.min(1,edge);
  mctx.save();mctx.translate(size/2+dx*k,size/2+dy*k);mctx.rotate(Math.atan2(dy,dx));
  mctx.beginPath();mctx.moveTo(10,0);mctx.lineTo(-7,-7);mctx.lineTo(-3,0);mctx.lineTo(-7,7);mctx.closePath();
  mctx.fillStyle='#eed7a0';mctx.fill();mctx.lineWidth=2;mctx.strokeStyle='#30291a';mctx.stroke();mctx.restore();
}
function drawMini() {
  const destination=miniNavigation();
  const W = mini.clientWidth || 128;
  if (mini.width !== W * 2) { mini.width = W * 2; mini.height = W * 2; }
  const size = mini.width, s = size / 32;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#0d120c'; mctx.fillRect(0, 0, size, size);
  if(loftAt(P)){drawLoftMap(mctx,loftAt(P),size);return;}
  if (inBunker(P.x, P.y)) { mctx.fillStyle = '#7fb0c4'; mctx.font = '600 22px "Russo One", sans-serif'; mctx.textAlign = 'center'; mctx.fillText('БУНКЕР', size / 2, size / 2 - 6); mctx.font = '500 16px "IBM Plex Mono", monospace'; mctx.fillStyle = '#8f8c74'; mctx.fillText('под землёй', size / 2, size / 2 + 20); mctx.textAlign = 'start'; miniArrow(destination,size,s); return; }
  mctx.setTransform(1, 0, 0, 1, size / 2 - P.x / T * s, size / 2 - P.y / T * s);
  mctx.imageSmoothingEnabled = !!ART;
  mctx.drawImage(miniC, 0, 0, PW * s, MH * s); mctx.drawImage(fogC, 0, 0, PW * s, MH * s);
  if (darkness() > 0.3) {
    mctx.fillStyle = 'rgba(4,7,12,0.35)';
    mctx.fillRect(P.x / T * s - size / 2, P.y / T * s - size / 2, size, size);
  }
  drawDetectorContacts(mctx, s, 1.65);
  mapSymbol(mctx, 'hatch', HATCH.x / T * s, HATCH.y / T * s, 1.65);
  objs.forEach(o => {
    if(o.k==='locker') mapSymbol(mctx,'locker',(o.x+o.w/2)/T*s,(o.y+o.h/2)/T*s,1.65);
    if (o.k === 'cache' && S.caches[o.cacheId] === 1) mapSymbol(mctx, 'cache', o.x / T * s, o.y / T * s, 1.65);
  });
  ents.forEach(e => {
    if (visibleContact(e)) mapSymbol(mctx, playerRelation(e), e.x / T * s, e.y / T * s, 1.65);
  });
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const tq = trackedTarget();
  qTargets().forEach(q => {
    if(tq && q.qid===tq.qid && q.x===tq.x && q.y===tq.y) return;
    if (q !== tq && !(tq && q.qid === tq.qid && q.x === tq.x && q.y === tq.y) && q.qid !== 'sos') mctx.globalAlpha = 0.45; else mctx.globalAlpha = 1;
    let x = size / 2 + (q.x - P.x) / T * s, y = size / 2 + (q.y - P.y) / T * s;
    const edge = x < 10 || y < 10 || x > size - 10 || y > size - 10;
    if (edge) { const a = Math.atan2(y - size / 2, x - size / 2); x = size / 2 + Math.cos(a) * (size / 2 - 12); y = size / 2 + Math.sin(a) * (size / 2 - 12); }
    const onContact = !edge && ents.some(e => e.x === q.x && e.y === q.y && visibleContact(e));
    mapSymbol(mctx, q.qid === 'sos' ? 'sos' : 'target', x, y, 1.8, 0, onContact);
  });
  mctx.globalAlpha = 1;
  const shelter = blowShelterTarget();
  if (shelter) {
    const dx = (shelter.x - P.x) / T * s, dy = (shelter.y - P.y) / T * s;
    const scale = Math.min(1, (size / 2 - 15) / Math.max(1, Math.abs(dx), Math.abs(dy)));
    mapSymbol(mctx, 'shelter', size/2 + dx*scale, size/2 + dy*scale, 2);
  }
  miniArrow(destination,size,s);
  mapSymbol(mctx, 'player', size / 2, size / 2, 2, P.ang);
}

/* ===================== HUD ===================== */
/* крупные силуэты оружия для панели (свои, упрощённые) */
const WSG = '<defs><linearGradient id="wm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5a58"/><stop offset=".5" stop-color="#2a2a29"/><stop offset="1" stop-color="#141414"/></linearGradient><linearGradient id="ww" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8632e"/><stop offset="1" stop-color="#6a3012"/></linearGradient></defs>';
const WSIL = {
  w_aksu: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M3 13l26-2v3.5L9 20v4H3z" fill="none" stroke="url(#wm)" stroke-width="2.6" stroke-linejoin="round"/><path d="M28 9h46v11H28z" fill="url(#wm)"/><path d="M33 7h30v2H33z" fill="#3a3a39"/><path d="M74 10.5h19v7.5H74z" fill="url(#ww)"/><path d="M93 12.5h15v3H93z" fill="url(#wm)"/><path d="M107 11h8v6h-8z" fill="url(#wm)"/><path d="M57 20h9c1 7 4 12 9 17l-8 4c-6-6-9-13-10-21z" fill="url(#ww)"/><path d="M41 20h8l-2.5 14h-7.5z" fill="#2a1a12"/><path d="M49 20c1 4 3 5 7 4" fill="none" stroke="#2a2a29" stroke-width="1.6"/></svg>',
  w_pm: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M34 10h54v10H34z" fill="url(#wm)"/><path d="M36 20h34l-4 4H52l-3 15H37l1-13z" fill="url(#wm)"/><path d="M38 23h10l-2 14h-8z" fill="#3a2418"/><path d="M52 24c1 4 4 6 9 5" fill="none" stroke="#2a2a29" stroke-width="1.6"/><path d="M40 12h44v1.5H40z" fill="#6a6a68"/></svg>',
  w_obrez: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M40 11h72v4.5H40zM40 15.5h72V20H40z" fill="url(#wm)"/><path d="M26 10h16v12H26z" fill="url(#wm)"/><path d="M6 19c8-3 14-6 21-8v11c-5 3-10 7-15 11l-6-3z" fill="url(#ww)"/><path d="M42 20h20v4H42z" fill="url(#ww)"/><path d="M30 22c1 4 3 5 7 4" fill="none" stroke="#2a2a29" stroke-width="1.6"/></svg>',
  knife: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M44 17l58-4c6 0 10 3 12 7-4 2-8 3-14 3H44z" fill="#b9bcbd"/><path d="M44 17l58-4c6 0 10 3 12 7H44z" fill="#dfe2e2"/><path d="M38 11h6v20h-6z" fill="url(#wm)"/><path d="M12 15h26v11H12c-3 0-5-2-5-5.5S9 15 12 15z" fill="#2a2420"/><path d="M16 15v11M22 15v11M28 15v11" stroke="#3e352e" stroke-width="1.4"/></svg>'
};
const H = { hp: $('hpb'), hpv: $('hpv'), fd: $('fdb'), fdv: $('fdv'), radv: $('radv'), sBleed: $('s-bleed'), sBleedN: $('s-bleedn'), sRad: $('s-rad'), wcn: $('wcn'), wcb: $('wcb'), det: $('det'), st: $('stb'), stv: $('stv'), belt: $('belt'), clock: $('clock'), money: $('money'),
  status: $('status'), quest: $('quest'), msgs: $('msgs'), feedback: $('field-feedback'), prompt: $('prompt'), wico: $('wico'), wn: $('wn'), am: $('am') };
let hudT = 0, lastW = '', lastNotice;
let taskState=null, previousTasks=new Set(), previousGoal='', taskUntil=0;
function briefTask() {
  const active=qList().filter(q=>q.st==='a'), target=trackedTarget();
  const ids=new Set(active.map(q=>q.id)), goal=target?target.qid+'|'+target.n:'';
  if(taskState!==S) {taskState=S;previousTasks=new Set();previousGoal='';taskUntil=0;H.quest.replaceChildren();}
  const accepted=active.find(q=>!previousTasks.has(q.id));
  if(accepted || (goal && goal!==previousGoal)){
    H.quest.textContent=(accepted && accepted.id!==target?.qid)?accepted.n:target?.n||accepted.n;
    taskUntil=S.min+5;
  }
  previousTasks=ids;previousGoal=goal;
  if(S.min>=taskUntil && H.quest.textContent) H.quest.replaceChildren();
}
let quickHudT = 0;
function hud(dt) {
  if (!P) return;
  hudT -= dt;
  quickHudT -= dt;
  if (touchRenderer && quickHudT > 0 && hudT > 0) return;
  quickHudT = 1/12;
  H.hp.style.width = clamp(P.hp, 0, 100) + '%'; H.hp.parentNode.classList.toggle('low', P.hp < 30); H.hpv.textContent = Math.max(0, Math.round(P.hp));
  H.fd.style.width = clamp(S.food, 0, 100) + '%'; H.fdv.textContent = Math.round(S.food); H.fd.parentNode.classList.toggle('low', S.food < 20);
  H.sRad.classList.toggle('on', S.rad > 1); H.sRad.classList.toggle('hi', S.rad > 40); H.radv.textContent = S.rad > 1 ? Math.round(S.rad) : '';
  H.sBleed.classList.toggle('on', !!S.bleed); H.sBleedN.textContent = S.bleed > 1 ? S.bleed : '';
  H.st.style.width = P.st + '%'; H.stv.textContent = weight() > carryLimit() ? '!' : Math.round(P.st);
  const fol = ents.find(x => x.alive && x.follow);
  const shelter = blowShelterTarget();
  const shelterStatus = S.blow?.stage ? (sheltered(P.x,P.y) ? 'В укрытии' : shelter ? 'Укрытие · '+Math.ceil(dE(P,shelter)/T*1.5)+' м' : 'Найдите укрытие') : '';
  const stt = [shelterStatus, S.flags.poppySleep>8 ? (S.flags.poppySleep>26?"Засыпаешь":"Слипаются глаза") : "", energyActive() ? 'энергетик · ' + Math.ceil(S.flags.energyUntil-S.min) + ' с' : '', fol ? 'напарник ' + fol.name.split(' ')[0] + (fol.wait ? ' ждёт' : '') + ' до ' + clockStr(fol.hireEnd).replace(/ · день \d+/, '') : '', S.food < 20 ? 'голод' : '', P.jam ? 'заклинило' : '', weight() > carryLimit() ? 'перегруз' : '', anomalyHint()].filter(Boolean).join(' · ');
  { const m = cnt('medkit'), b = cnt('bandage'); $('mb-m').textContent = m || ''; $('mb-b').textContent = b || ''; $('mp-mn').textContent = m; $('mp-bn').textContent = b; $('b-med').classList.toggle('empty', !m && !b); }
  $('b-crouch').classList.toggle('on', !!P.crouch); H.det.setAttribute('aria-pressed', String(S.torch !== false)); $('b-jump').classList.toggle('on', P.jumpT > 0);
  if (H.status.textContent !== stt) H.status.textContent = stt;
  drawMini();
  if (hudT > 0) return;
  hudT = 0.15;
  H.clock.textContent = clockStr(); H.money.textContent = S.money + ' RU';
  const bs = S.belt.join(',');
  if (H.belt.dataset.v !== bs) { H.belt.dataset.v = bs; H.belt.textContent = ''; S.belt.forEach(a => { const sp = el('span'); sp.appendChild(itemIcon(a)); H.belt.appendChild(sp); }); }
  const detector = DETECTORS[S.weapon], W = detector || WP[S.weapon];
  if (lastW !== S.weapon) { lastW = S.weapon; H.wico.textContent = ''; const bi = detector ? itemIcon(S.weapon) : (window.CORDON_G8_ON && g3Icon(S.weapon)) || b1Icon(S.weapon); if (bi) H.wico.appendChild(bi); else if (WSIL[S.weapon]) H.wico.innerHTML = WSIL[S.weapon]; else H.wico.appendChild(icon(ICON[S.weapon])); H.wn.textContent = detector ? W.n.replace('Детектор ', '') : W.n; }
  $('wpnbox').classList.toggle('rel', P.reload > 0);
  H.am.textContent = '';
  const cd = W.melee ? 100 : Math.round(S.cond[S.weapon] == null ? 100 : S.cond[S.weapon]);
  $('wpnbox').classList.toggle('mel', !!W.melee || !!detector);   // нож и граната: без полосы состояния, одна подпись
  H.wcn.textContent = W.melee || detector ? '' : 'Состояние: ' + cd + '%'; H.wcb.style.width = cd + '%'; H.wcb.parentNode.className = 'cb' + (cd < 35 ? ' bad' : cd < 65 ? ' mid' : '');
  if (detector) H.am.textContent = Number.isFinite(P.detD) ? Math.round(P.detD / T * 1.5) + ' м' : 'Поиск';
  else if (W.toss) H.am.textContent = '× ' + cnt('grenade');
  else if (W.melee) H.am.textContent = '∞';
  else { H.am.appendChild(document.createTextNode(String(S.mag[S.weapon] || 0))); H.am.appendChild(el('small', '', ' / ' + cnt(W.ammo))); if (P.reload > 0) H.am.appendChild(el('div', 'rl', 'перезарядка')); }
  briefTask();
  const sleep=S.flags.poppySleep||0;
  const veil=$('poppy-veil'), fatigue=clamp(sleep/42,0,1);
  const blink=reducedCameraMotion.matches ? .24 : (.5+.5*Math.cos(sleep*(2.3-.014*sleep)))**(3.4-2*fatigue);
  veil.style.opacity=sleep>0?String(.36+.64*fatigue):'0';
  veil.style.setProperty('--lid',String((.07+.40*fatigue+blink*(.38+.15*fatigue))*100)+'%');
  const message = radioQueue[0];
  if (message !== lastNotice) {
    lastNotice = message;
    H.msgs.replaceChildren();
    if (message) {
      const line = el('p', message.k);
      line.append(el('span', 'sender', 'КПК'));
      line.append(document.createTextNode(message.t));
      H.msgs.append(line);
    }
  }
  if (message) H.msgs.style.opacity = clamp(message.life / 1.2, 0, 1);
  const local = !message && MSGS[MSGS.length - 1];
  const feedback = local ? local.t : '';
  if (H.feedback.textContent !== feedback) H.feedback.textContent = feedback;
  if (local) H.feedback.style.opacity = clamp(local.life / 1.2, 0, 1);
  const n = G.near;
  H.prompt.textContent = ''; H.prompt.classList.toggle('kill', !!(n && n.k === 'kill'));
  if (n && P.alive && !panel) { const ic = el('span', 'pi ' + n.k); H.prompt.appendChild(ic); if (!IN.touch) H.prompt.appendChild(el('kbd', '', 'E')); H.prompt.appendChild(document.createTextNode(n.label.replace(/^Поговорить: /, 'Говорить: ') + '.')); }
  updateFog();
}

/* ===================== ввод ===================== */
function interact() {
  const n = G.near; if (!n || !P.alive) return;
  if(n.k==='floor' && fadeT<=0){
    const p=n.upstairs?n.room.stair:n.room.landing;
    fadeT=.5;fadeTo={x:p.x,y:p.y,a:P.ang};
  } else if (n.k === 'talk') talk(n.e);
  else if (n.k === 'trader') { save(true); talkTrader(); }
  else if (n.k === 'down') goThrough(true);
  else if (n.k === 'up') goThrough(false);
  else if (n.k === 'heal') {
    const e = n.e;
    if(STORY_KEYS.includes(e.sid))return helpStory(e);
    if (healWounded(e)) dialog(cardOf(e), [e.sid === 'tolik' ? 'Живой… Спасибо, братишка. Держи деньги и антирад. Я твой должник.' : 'Спасибо, брат. Выручил.'], () => [{ t: 'Береги себя', close: 1 }], 'dialog', e);
  }
  else if (n.k === 'kill') takedown(n.e);
  else if (n.k === 'groundItem') pickGroundItem(n);
  else if (n.k === 'locker') { openPanel('locker','Личный ящик · '+n.o.baseName); refresh(); }
  else if (n.k === 'carve') carveMutant(n.o);
  else if (n.k === 'loot') openLoot(n.o);
  else if (n.k === 'rest') restAtFire();
  else if (n.k === 'pick') pickUp(n.o);
  else if (n.k === 'genset') gensetUse();
  else if (n.k === 'story') cordonUse(n.stage);
  else if (n.k === 'exit') exitUse();
  else if (n.k === 'art') takeArt(n.a);
  else if (n.k === 'free') {
    if(n.e.sid!=='shust' || chapter()!=='rescue'){msg('Пока рано.','say');return;}
    if(ATP_BANDITS.some(id=>byS(id))){msg('Сначала обезопась АТП.','say');return;}
    occupyATP();S.inv.flash=1;S.q.flash=3;nextChapter('flash');
    storyRead('Шустрый',['Флешка у меня в подкладке. Отнеси Сидоровичу. А я здесь останусь — обживём гараж.']);
  }
}
const KEYS = {};
addEventListener('keydown', e => {
  if (controlEditor.open) return;
  audioInit();
  const k = e.code;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].indexOf(k) >= 0 && !panel) e.preventDefault();
  if (title.open) return;
  if (k === 'Escape') { if (panel?.pausePage==='settings') leavePauseSettings(); else if (panel) closePanel(); else { openPanel('menu', 'Меню'); refresh(); } return; }
  if (panel) { if ((k === 'KeyI' && panel.kind === 'inv') || (k === 'KeyM' && panel.kind === 'pda') || k === 'Tab') { e.preventDefault(); closePanel(); } return; }
  KEYS[k] = true;
  if (!P.alive) return;
  if (k === 'KeyE' || k === 'Space') interact();
  if (k === 'KeyR') startReload();
  if (k === 'KeyF') throwBolt();
  if (k === 'KeyG') throwNade();
  if (k === 'KeyQ') healWith('medkit');
  if (k === 'KeyB') healWith('bandage');
  if (k === 'KeyH') quickHeal();
  if (k === 'KeyV') startJump();
  if (k === 'KeyL') toggleTorch();
  if (/^Digit[1-8]$/.test(k)) {
    const id=WORDER[Number(k.slice(-1))-1];
    if (id==='knife' || kitItem(kitSlot(id))===id) setWeapon(id);
  }
  if (k === 'KeyC' || k === 'ControlLeft') { P.crouch = !P.crouch; }
  if (k === 'KeyI' || k === 'Tab') { e.preventDefault(); openPanel('inv', 'Рюкзак'); refresh(); }
  if (k === 'KeyM' || k === 'KeyP') { openPanel('pda', 'КПК', PDA_TABS2); refresh(); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
/* сворачивание окна/потеря фокуса: никакой ввод не остаётся «зажатым» */
function resetInput() {
  IN.sprint = false; IN.runPointer = null; $('b-run').classList.remove('on');
  for (const k in KEYS) KEYS[k] = false;
  IN.fire = false; releaseFireStick(); IN.left = null; IN.moveX = IN.moveY = 0;
  if (typeof joyReset === 'function') joyReset();
}
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
function keyMove() {
  IN.sprint = !!(KEYS.ShiftLeft || KEYS.ShiftRight);
  if (IN.touch) return;
  IN.moveX = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0);
  IN.moveY = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
}
function setTouch(on) { if (IN.touch === on) return; IN.touch = on; document.body.classList.toggle('is-touch', on); }
const JOY = $('joy'), JOYK = $('joyk');
function joyAt(x, y, s) {
  const r = JOY.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (Math.hypot(x - cx, y - cy) < r.width * 0.55) { s.ox = cx; s.oy = cy; }
  else { JOY.style.left = (x - r.width / 2) + 'px'; JOY.style.top = (y - r.height / 2) + 'px'; JOY.style.bottom = 'auto'; }
  JOY.classList.add('on');
}
function joyReset() { JOY.style.left = JOY.style.top = JOY.style.bottom = ''; JOYK.style.transform = ''; JOY.classList.remove('on'); }
cv.addEventListener('pointerdown', e => {
  audioInit();
  if (panel || title.open) return;
  if (e.pointerType === 'mouse') { setTouch(false); IN.mx = e.clientX; IN.my = e.clientY; if (e.button === 0) IN.fire = true; return; }
  setTouch(true);
  const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, a: P.ang };
  const jr = JOY.getBoundingClientRect();
  const custom = !!JOY.dataset.layout;
  const onStick = custom ? Math.hypot(e.clientX-jr.x-jr.width/2,e.clientY-jr.y-jr.height/2) <= jr.width/2+6 : e.clientX<VW*.5;
  if (onStick && !IN.left) {
    cv.setPointerCapture(e.pointerId);
    IN.left = s;
    if (custom) { s.ox=jr.x+jr.width/2; s.oy=jr.y+jr.height/2; JOY.classList.add('on'); }
    else joyAt(e.clientX,e.clientY,s);
    s.radius = custom ? jr.width/2 : 56;
  }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { IN.mx = e.clientX; IN.my = e.clientY; if (IN.touch) setTouch(false); return; }
  const s=IN.left;
  if (!s || s.id!==e.pointerId) return;
  let dx = (e.clientX - s.ox) / (s.radius || 56), dy = (e.clientY - s.oy) / (s.radius || 56);
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  s.dx = dx; s.dy = dy;
  IN.moveX = dx; IN.moveY = dy; JOYK.style.transform = 'translate(' + (dx * Math.min(34,(s.radius || 56)*.6)) + 'px,' + (dy * Math.min(34,(s.radius || 56)*.6)) + 'px)';
});
function endPtr(e) {
  if (e.pointerType === 'mouse') { IN.fire = false; return; }
  if (IN.left && IN.left.id === e.pointerId) { IN.left = null; IN.moveX = IN.moveY = 0; joyReset(); }
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (!panel) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
const TB = { 'b-crouch': () => { P.crouch = !P.crouch; $('b-crouch').classList.toggle('on', !!P.crouch); }, 'b-rel': startReload, 'b-bolt': throwBolt, 'b-med': medButton, 'b-jump': startJump, 'b-wpn': () => cycleWeapon(1) };
$('det').addEventListener('click', () => {
  if (P.alive && !panel && !title.open) { audioInit(); toggleTorch(); }
});
const runB = $('b-run');
runB.addEventListener('pointerdown', e => {
  if (!P.alive || panel || title.open || IN.runPointer !== null) return;
  e.preventDefault();
  runB.setPointerCapture(e.pointerId);
  IN.runPointer = e.pointerId;
  runB.classList.add('on');
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  runB.addEventListener(type, e => {
    if (e.pointerId !== IN.runPointer) return;
    IN.runPointer = null;
    runB.classList.remove('on');
  });
}
const fireB = $('b-fire');
function releaseFireStick() {
  IN.aimStick=null; IN.btnFire=false;
  fireB.classList.remove('on');
  fireB.style.removeProperty('--aim-x'); fireB.style.removeProperty('--aim-y');
}
function steerFireStick(e) {
  const s=IN.aimStick;
  if (!s || e.pointerId!==s.id) return;
  const dx=e.clientX-s.cx, dy=e.clientY-s.cy, length=Math.hypot(dx,dy);
  if (length>s.radius*.16) { s.a=Math.atan2(dy,dx); P.lockT=0; }
  const k=Math.min(.34,.34*s.radius/Math.max(length,1));
  fireB.style.setProperty('--aim-x',dx*k+'px'); fireB.style.setProperty('--aim-y',dy*k+'px');
}
fireB.addEventListener('pointerdown', e => {
  if (IN.aimStick || panel || title.open || !P?.alive) return;
  e.preventDefault(); e.stopPropagation(); audioInit(); setTouch(true);
  const r=fireB.getBoundingClientRect();
  IN.aimStick={id:e.pointerId,cx:r.left+r.width/2,cy:r.top+r.height/2,radius:r.width/2,a:P.ang};
  fireB.setPointerCapture(e.pointerId);
  steerFireStick(e); IN.btnFire=true; fireB.classList.add('on');
});
fireB.addEventListener('pointermove',steerFireStick);
for (const event of ['pointerup','pointercancel','lostpointercapture']) {
  fireB.addEventListener(event,e=>{
    const stick=IN.aimStick;
    if (stick?.id!==e.pointerId) return;
    if (event==='pointerup' && !stick.sampled && P?.alive && !panel && !title.open) {
      P.ang=stick.a; playerFire();
    }
    releaseFireStick();
  });
}
$('prompt').addEventListener('click', e => { e.stopPropagation(); audioInit(); if (!panel) interact(); });
$('rot-skip').addEventListener('click', () => document.body.classList.add('portrait-ok'));
Object.keys(TB).forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if (P.alive && !panel) TB[id](); }));
['mp-bandage', 'mp-medkit'].forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (P.alive && !panel) healWith(id === 'mp-medkit' ? 'medkit' : 'bandage'); }));
const weaponButton = $('wpnbox');
function cycleFromHud() {
  if (P.alive && !panel && !title.open) cycleWeapon(1);
}
weaponButton.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation(); cycleFromHud();
});
// Keyboard, assistive activation and programmatic clicks have no pointer press.
weaponButton.addEventListener('click', e => { if (e.detail === 0) cycleFromHud(); });
$('t-inv').addEventListener('click', () => { if (!panel && P.alive) { openPanel('inv', 'Рюкзак'); refresh(); } });
$('t-pda').addEventListener('click', () => { if (!panel && P.alive) { openPanel('pda', 'КПК', PDA_TABS2); refresh(); } });
$('t-menu').addEventListener('click', () => { if (!panel) { openPanel('menu', 'Меню'); refresh(); } });
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) setTouch(true);

/* ===================== заставка и смерть ===================== */
const title = { open: true, el: $('title'), name: document.querySelector('#tcard .start-name') };
function showTitle(kind) {
  resetInput();
  title.open = true; title.el.classList.add('open'); document.body.classList.add('title-open');
  const c = $('tcard'); c.textContent = ''; c.classList.toggle('death', kind === 'death'); title.el.classList.toggle('start', kind !== 'death');
  if (kind === 'death') {
    const h = el('h1', '', 'Зона забрала'); h.appendChild(el('span', '', 'ещё одного')); c.appendChild(h);
    c.appendChild(el('div', 'tape'));
    c.appendChild(el('p', '', 'Последнее сохранение делается само у костра в деревне и у Сидоровича.'));
    const b = el('div', 'tbtns');
    b.appendChild(btn('go','Загрузить сохранение',()=>slotPicker(b,false,()=>showTitle('death'))));
    b.appendChild(btn('alt', 'Начать заново', () => { applyState(freshS()); hideTitle(); intro(); }));
    c.appendChild(b);
    return;
  }
  const nav = el('nav','start-nav');
  nav.setAttribute('aria-label','Главное меню');
  const saved = loadSave();
  if (saved) nav.appendChild(btn('start-primary','Продолжить',()=>{
    audioInit(); applyState(saved); hideTitle();
  }));
  nav.appendChild(btn(saved?'':'start-primary','Новая игра',()=>{
    audioInit(); applyState(freshS()); hideTitle(); intro();
  }));
  if(saved || MANUAL_SLOTS.some(i=>loadSave(i)))nav.appendChild(btn('','Загрузить сохранение',()=>slotPicker(nav,false,()=>showTitle())));
  nav.appendChild(btn('','Управление',openControlEditor));
  c.append(title.name,nav);
}
function goFull() {   // на весь экран там, где браузер это умеет (Android, iPad, компьютер); на iPhone — через «На экран Домой»
  try { const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; if (IN.touch && f && !document.fullscreenElement && !document.webkitFullscreenElement) { const r = f.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } } catch (e) {}
}
function hideTitle() { goFull(); title.open = false; title.el.classList.remove('open'); document.body.classList.remove('title-open'); }
function onDeath() { showTitle('death'); }
/* ===================== цикл ===================== */
let last = performance.now();
/* автоподстройка: если в игре кадр в среднем дольше 22 мс, кроны деревьев рисуются мельче (меньше заливки для слабого телефона) */
const AQ = { buf: [], done: /aq-off/.test(location.hash) };
function autoQuality(ms) {
  if (AQ.done || panel || title.open || document.hidden) return;
  if (ms > 0 && ms < 200) AQ.buf.push(ms);
  if (AQ.buf.length < (touchRenderer ? 90 : 180)) return;
  const a = AQ.buf.slice().sort((x, y) => x - y), med = a[a.length >> 1]; AQ.buf.length = 0;
  if (touchRenderer) {
    if (med > 24 && touchDensity > 0.85) {
      touchDensity = touchDensity > 1 ? 1 : 0.85;
      sizeWorldCanvas();
    }
    if (touchDensity <= .85) AQ.done = true;
    return;
  }
  if (med > 22 && CAN_SZ > 72) { CAN_SZ = Math.max(72, CAN_SZ - 12); CANOPY.length = 0; buildCanopy(); AQ.lowered = (AQ.lowered || 0) + 1; }
  else AQ.done = true;
}
function frame(now) {
  requestAnimationFrame(frame);
  autoQuality(now - last);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden || (!controlEditor.open && ((title.open && title.el.classList.contains('start')) || panel?.kind==='menu'))) return;
  keyMove();
  if (!panel && !title.open) update(dt);
  render();
  hud(dt);
}
/* загрузка по шагам: если на телефоне что-то падает, на экране видно где и почему (а не тёмный экран) */
function bootStep(t) { window.__bootStep = t; const b = document.getElementById('bootlog'); if (b) b.firstChild.textContent = 'Загрузка: ' + t + '…'; }
async function boot() {
  bootStep('мир'); gen(); bigWorld(); makeLesserZone(); makeGarbage(); buildLandmarks(); buildGrids();
  HOUSES.forEach(buildEntrances);
  resize();
  bootStep('графика'); await loadArt(); await Promise.all([prepareShopGate(), loadLesserSprites()]); bigFences(); buildFieldProps(); buildGrids(); placeSearchContainers(); buildGrids(); furnishHouses(); buildGrids(); buildFieldCrateSites();
  bootStep('деревья'); buildCanopy(); bootStep('земля'); paintGround(); bootStep('крыши'); buildRoofs(); bootStep('карта'); await buildMini();
  bootStep('сохранение');
  let sv = null; try { sv = loadSave(); if (sv) applyState(sv); } catch (e) {
    console.error(e); try { localStorage.setItem('zona-broken-save', localStorage.getItem(KEY) || ''); } catch (e2) {}
    sv = null; window.__bootWarn = 'Сохранение не загрузилось (' + (e && e.message) + '). Копия отложена, начата новая игра.';
  }
  if (!sv) applyState(freshS());
  const bl = document.getElementById('bootlog'); if (bl) bl.remove(); bootStep('игра');
  if (window.__bootWarn) setTimeout(() => msg(window.__bootWarn, 'bad'), 500);
  addEventListener('resize', resize);
  setupControlEditor(); showTitle();
  requestAnimationFrame(frame);
}
window.__zRender = render;
window.__bigTiles = () => map;
window.__zRM = { t: RMt, p: RMp, BIG: BIG };
window.__zBig = { railLayout: () => ({sidings, lesserMainTrack, freightDecks}), aq: () => ({ can: CAN_SZ, lowered: AQ.lowered || 0, done: AQ.done }), gStat: gStat, cache: () => GCACHE.size, GMAX: GMAX, mini: () => [miniC.width, miniC.height], fogLen: () => fog.length, PW: () => PW, MH: () => MH, msgs: () => [...radioQueue, ...MSGS].map(m => m.t) };
window.__z = { resetInput: resetInput, rc: { mk: { mkHuman, mkDog, mkBoar, mkSucker }, g3: () => ({ ready: G3_READY(), skin: P ? g3Skin(P) : null }), q5, q3c, gensetUse, pickUp, wolfRC1Opts, exitUse, benchOpts, sosFoeAI, muzzlePoint, actorPose, hurt, sheltered, GFX, g7: { G3, portraitFor, itemIcon, G7, GAIT, RIGS, BODYFX, weaponLocal, localToWorld, g7Muzzle, rayWall, rayCircle, shotTrace, fire, rigActive, g7Fresh, g7Tick, qaRig, ballOff, WP, get tracers() { return tracers; }, get flashes() { return flashes; }, opq, T } }, seed: n => { Math.random = mulberry32(n); }, gfxSnap: () => ({ ANOM0, NPCDEF, DOGDEF, CACHES, HOUSES }), map: { fieldProps, collide, moveE, goTo, los, LOC, LOCATIONS, ANOM0, objs, nav, MW, openBarrier, buildGrids, MAP_ID, MAP_VERSION, drawMapTo }, openLoot: openLoot, clearMsgs: () => { MSGS.length = 0; radioQueue.length = 0; }, reveal: reveal, get WX() { return WX; }, cam: cam, openTrade: openTrade, openPanel: openPanel, refresh: refresh, PDA_TABS2: PDA_TABS2, dialog: dialog, cardOf: cardOf, save: save, loadSave: loadSave, loc: { LOCATIONS, locAnchors, locPt, MAP_VERSION }, plus: { simRest, restLabel, trackedTarget, restBlock, REST, freeTile, get SOS_SPOTS() { return SOS_SPOTS; }, jobCancel, finishEncounter, advanceWorldTime, restPreview, jobOpts, dynSnapshot, jobOffers, jobTake, jobTurnIn, jobReady, hireOpts, restAtFire, sosTick, mkSucker, traderOpts, wolfPlusOpts, qTargets, qList }, get art() { return !!ART; }, goThrough: goThrough, get S() { return S; }, get P() { return P; }, get ents() { return ents; }, IN: IN, update: update, interact: interact, talkTrader: talkTrader, applyState: applyState, freshS: freshS, hideTitle: hideTitle, get panel() { return panel; }, closePanel: closePanel, findPath: findPath, get near() { return G.near; } };
boot();
