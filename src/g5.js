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
  ar_jacket: 'i-jacket', ar_bandit: 'i-jacket', ar_zarya: 'i-suit', art_medusa: 'i-art', art_bengal: 'i-art', art_blood: 'i-art', tail: 'i-tail', tentacle: 'i-tail', flash: 'i-flash' };
const ICOL = { art_medusa: '#dc9330', art_bengal: '#7fb0c4', art_blood: '#d64541', medkit: '#9db264', bandage: '#9db264', antirad: '#9db264', flash: '#7fb0c4' };
function itemIcon(id) { const g = g3Icon(id); if (g) return g; const b = b1Icon(id); if (b) return b; const i = icon(ICON[id] || 'i-pack'); if (ICOL[id]) i.style.color = ICOL[id]; return i; }
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
  ptitle.textContent = title;
  ov.classList.add('open');
  IN.fire = false; IN.touchFire = false; IN.fireStick = null; IN.btnFire = false; IN.left = null; IN.aimStick = null; IN.moveX = IN.moveY = 0;
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
function closePanel() { if (!panel) return; const k = panel.kind; panel = null; ov.classList.remove('open'); if (k === 'trader' || k === 'trade') save(true); }
$('pclose').addEventListener('click', closePanel);
ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });
function refresh() {
  if (!panel) return;
  const top = pbody.scrollTop;
  pbody.textContent = '';
  if (panel.hint) pbody.appendChild(el('p', 'hint', panel.hint));
  ({ dialog: drawDialog2, trade: drawTrade2, inv: drawInv2, loot: drawLoot, pda: drawPda2, menu: drawMenu })[panel.kind === 'trader' ? 'dialog' : panel.kind]();
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
function talk(e) {
  if (e.sid === 'wolf') return talkWolf(e);
  if (e.fac === 'army') {
    const south = e.guard === 'south';
    return dialog(cardOf(e), [south ? 'Назад. Здесь граница Зоны, проход закрыт.' : S.flags.bridgePaid ? 'А, это ты. Проходи.' : 'Стоять. Проход под мостом платный: пятьсот, и мы тебя не видели.'], () => [
      south ? { t: 'А если договоримся?', fn: () => say('Не договоримся. Свободен.') }
        : S.flags.bridgePaid ? { t: 'Я уже платил', fn: () => say('Помню. Проходи, не задерживай.') }
        : { t: 'Пропусти за 500 RU', k: 'key', d: S.money < 500, fn: () => { S.money -= 500; S.flags.bridgePaid = 1; openBarrier(); say('Другой разговор. Проходи, шлагбаум поднят. Туда и обратно, сколько хочешь.'); sys('Мост открыт.'); news('Заплатил военным 500 RU за проход под мостом.'); } },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  if (e.sid === 'fox') return dialog(cardOf(e), [S.q2.fox === 3 ? 'Отбились. Ты меня второй раз за день спасаешь, Меченый.' : 'Чего тебе?'], () => {
    const o = [];
    if (S.q2.fox === 3) o.push({ t: 'Что знаешь про Стрелка?', k: 'key', fn: () => {
      say('Стрелок? Слышал. Ходил на север дальше всех и возвращался. Лично не знал. А вот брат мой, Серый, с его группой пересекался. Он на Свалке, в ангаре. Скажешь, что от Лиса.');
      S.q2.fox = 4; S.stats.q++; S.rep += 10; give('a12', 6); S.money += 300; sys('Получено: 300 RU, Дробь ×6. Задание выполнено.'); news('Выполнено: Найти Лиса. Серый ждёт на Свалке.'); save(true);
    } });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
  if (e.sid === 'tolik') return dialog(cardOf(e), ['Меченый! Если б не ты, лежать бы мне у той дороги.'], () => [{ t: 'Бывай', close: 1 }], 'dialog', e);
  if (e.sid === 'shust') return dialog(cardOf(e), ['Меченый! Век не забуду, что ты меня вытащил. Буду в деревне, отлежусь.'], () => [{ t: 'Береги себя', close: 1 }], 'dialog', e);
  if (e.sid === 'petr' || e.sid === 'petr2') {
    return dialog(cardOf(e), [S.flags.atpClear ? 'Ну ты дал! АТП теперь наше. Тут пока и осядем.' : 'Тише. Бандиты на АТП, за бетонным забором. Мы тут вторые сутки лежим, ждём подмогу. Пойдёшь первым, мы следом.'], () => [
      { t: 'Что там внутри?', fn: () => say('Двор, два гаража. Человек семь, главарь с автоматом сидит в большом гараже. Там же и Шустрого держат.') },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  // обычный одиночка
  const lines = [S.rep >= 20 ? 'О, Меченый! Наслышан, наслышан.' : S.rep < 0 ? 'Чего надо? Про тебя тут нехорошее говорят.' : 'Здоров, брат. Чего хотел?'];
  dialog(cardOf(e), lines, () => {
    const o = [{ t: 'Что нового?', fn: () => { e.talked = (e.talked || 0) + 1; say(e.robbed ? 'Нам говорить не о чем.' : LORE[(e.seed + e.talked * 5) % LORE.length]); } }];
    if (!e.robbed) o.push({ t: 'Давай поторгуем', fn: () => openTrade(e) });
    hireOpts(e).forEach(x => o.push(x));
    if (!e.robbed && !e.follow) o.push({ t: 'Ствол на него: «Выворачивай карманы»', k: 'bad', fn: () => robNpc(e) });
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
    Object.keys(e.inv).forEach(k => { give(k, e.inv[k]); got.push(ITEMS[k].n); }); e.inv = {};
    e.robbed = 1;
    say('Ладно, ладно! Подавись. Зона всё видит, Меченый.');
    sys(got.length ? 'Отобрано: ' + got.join(', ') + '. Одиночки об этом узнают.' : 'У него ничего не было. Одиночки об этом узнают.');
  } else {
    say(crowd ? 'Мужики, гляньте! Этот на своих ствол наставил!' : 'Ах ты гнида! Ну давай!');
    anger(e); closePanel();
  }
}
function talkWolf(e) {
  dialog(cardOf(e), [S.q.flash === 1 ? 'Меченый? Сидорович по рации предупредил. Про Шустрого знаешь?' : 'Здорово, Меченый.'], () => {
    const o = [];
    if (S.q.flash === 1) o.push({ t: 'Я насчёт Шустрого', k: 'key', fn: () => {
      say('Его взяли бандиты, держат на АТП, это к востоку от большой дороги. Мои, Петруха с Хомяком, залегли у забора и ждут. С ножом туда идти нельзя: держи ПМ и три обоймы.');
      give('w_pm', 1); give('a9', 16); S.mag.w_pm = 8; setWeapon('w_pm'); S.q.flash = 2;
      sys('Получено: ПМ, Патроны 9×18 ×24. Задание обновлено.');
      news('Волк выдал ПМ. Цель: АТП на востоке.');
    } });
    if (S.q.flash >= 2 && S.q.pack === 0) o.push({ t: 'Есть ещё работа?', fn: () => {
      say('Есть. В лесу на северо-западе завелась стая слепых псов, уже двоих наших порвали. Перебьёшь, отдам обрез и патроны к нему.');
      S.q.pack = 1; news('Задание: перебить стаю слепых псов в северо-западном лесу.');
    } });
    if (S.q.pack === 2) o.push({ t: 'Стаи больше нет', k: 'key', fn: () => {
      if (!has('w_obrez')) { give('w_obrez', 1); give('a12', 12); sys('Получено: Обрез, Дробь ×12.'); } else { give('a12', 12); S.money += 500; sys('Получено: Дробь ×12, 500 RU.'); }
      say('Уважаю. Слово держу. И людям расскажу, что ты наш.');
      S.q.pack = 3; S.stats.q++; S.rep += 10; news('Выполнено: Стая у леса.'); save(true);
    } });
    wolfPlusOpts().forEach(x => o.push(x));
    o.push({ t: 'Что посоветуешь?', fn: () => say('Не стой на открытом, двигайся. Кидай болты, где воздух дрожит. Ночью включай голову: псы в темноте видят лучше тебя. И считай патроны, магазин кончается всегда не вовремя.') });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
}
function talkTrader() {
  if (!S.flags.intro) {
    S.flags.intro = 1;
    return dialog(SIDCARD(), ['Очухался, Меченый? Тебя сняли с грузовика смерти, с таких живыми не возвращаются. Ты первый на моей памяти.', 'В КПК у тебя одна запись: «Убить Стрелка». Имени не помнишь, так и будешь Меченым, по наколке. Я тебе жизнь спас, за тобой должок.'], () => [
      { t: 'Что за работа?', k: 'key', fn: () => {
        say('Мой курьер, Шустрый, пропал вместе с флешкой. Говорят, его взяли бандиты. Иди к Волку в деревню новичков, он поможет. Флешку принесёшь мне, остальное потом.');
        S.q.flash = 1; news('Задание: Флешка Шустрого. Найди Волка в деревне новичков.');
        sys('Задание: Флешка Шустрого. Метка на миникарте.');
        panel.opts = traderOpts;
      } }
    ], 'trader');
  }
  dialog(SIDCARD(), ['Ну, чего тебе?'], traderOpts, 'trader');
}
function traderOpts() {
  const o = [{ t: 'Торговать', k: 'key', fn: () => openTrade(null) }];
  if (S.q.flash === 3 && has('flash')) o.push({ t: 'Отдать флешку Шустрого', k: 'key', fn: () => {
    take('flash', 1); S.money += 1500; S.q.flash = 4; S.flags.flashDone = 1; S.stats.q++; S.rep += 15;
    say('Вот это дело. Держи полторы тысячи, заработал.');
    sys('Получено: 1500 RU. Задание выполнено.'); news('Выполнено: Флешка Шустрого.'); save(true);
  } });
  if (S.q.flash === 4 && S.flags.flashDone && S.q2.fox === 0) o.push({ t: 'Что со Стрелком?', k: 'key', fn: () => {
    say('Есть сталкер по кличке Лис, он ходил с людьми, что Стрелка знали. Ушёл за насыпь, к разрушенной ферме на северо-востоке, и пропал со связи. Найди его. Вояки под мостом берут пятьсот за проход. Жадные, но слово держат. Кому жалко денег, лезет через туннель левее, а там электры.');
    S.q2.fox = 1; news('Задание: Найти Лиса за насыпью.');
  } });
  if (S.q.medusa === 1 && has('art_medusa')) o.push({ t: 'Отдать «Медузу» за 1000 RU', k: 'key', fn: () => {
    take('art_medusa', 1); S.money += 1000; S.q.medusa = 2; S.stats.q++;
    say('Она самая. Тысяча, как договаривались.'); sys('Получено: 1000 RU.'); news('Выполнено: «Медуза» для Сидоровича.');
  } });
  if (S.q.medusa === 0) o.push({ t: 'Есть ещё работа?', fn: () => {
    say('Нужна «Медуза». Ищи на поле аномалий за ржавым автобусом у дороги. Обычно беру за семьсот, под заказ дам тысячу. Болты кидай, а то соберёшь тебя потом по частям.');
    S.q.medusa = 1; news('Задание: «Медуза» для Сидоровича.');
  } });
  jobOpts().forEach(x => o.push(x));
  if (S.rep <= -30) o.push({ t: 'Уладить с одиночками · 2000 RU', k: 'key', d: S.money < 2000, fn: () => {
    S.money -= 2000; S.rep = 0; S.flags.angry = {}; ents.forEach(e => { if (e.fac === 'loner') e.angry = 0; });
    say('Ладно, замолвлю слово. Второй раз не возьмусь.');
  } });
  const worn = WORDER.filter(w => w !== 'knife' && has(w) && cond(w) < 95);
  if (worn.length) { const cost = worn.reduce((a, w) => a + Math.ceil((100 - cond(w)) * ITEMS[w].price / 400 / 10) * 10, 0);
    o.push({ t: 'Починить оружие · ' + cost + ' RU', d: S.money < cost, fn: () => { S.money -= cost; worn.forEach(w => S.cond[w] = 100); P.jam = 0; say('Почистил, смазал, пружины поменял. Стреляет как новый.'); sys('Оружие починено.'); } }); }
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
function drawTrade() {
  const e = panel.e;
  const top = el('div', 'cols');
  top.appendChild(person(meCard()));
  top.appendChild(person(e ? Object.assign(cardOf(e), { money: e.money }) : SIDCARD()));
  pbody.appendChild(top);
  const cols = el('div', 'cols');
  const a = el('div'), b = el('div');
  a.appendChild(el('h3', 'h3', 'Купить'));
  const stock = e ? Object.keys(e.inv).map(id => ({ id: id, q: 1, p: Math.ceil(ITEMS[id].price * (S.rep >= 20 ? 1.1 : 1.3)), c: e.inv[id] })) : STOCK.map(s => Object.assign({ c: (ITEMS[s.id].weapon || ITEMS[s.id].armor) && has(s.id) ? 0 : 99 }, s));
  if (!stock.length) a.appendChild(el('p', 'note', 'Ему нечего продать.'));
  stock.forEach(s => {
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(itemIcon(s.id)); r.appendChild(t);
    const g = el('div', 'grow'); g.appendChild(el('div', 'nm', ITEMS[s.id].n + (s.q > 1 ? ' ×' + s.q : ''))); g.appendChild(el('div', 'price', s.p + ' RU')); r.appendChild(g);
    r.appendChild(btn('', s.c <= 0 ? 'Есть' : 'Купить', () => {
      if (S.money < s.p) { panel.hint = 'Не хватает ' + (s.p - S.money) + ' RU.'; refresh(); return; }
      S.money -= s.p; give(s.id, s.q); if (e) { e.money += s.p; e.inv[s.id]--; if (!e.inv[s.id]) delete e.inv[s.id]; }
      play('pick'); panel.hint = 'Куплено: ' + ITEMS[s.id].n + '.'; refresh();
    }, s.c <= 0 || S.money < s.p));
    a.appendChild(r);
  });
  b.appendChild(el('h3', 'h3', 'Продать'));
  const mine = Object.keys(S.inv).filter(id => ITEMS[id] && !ITEMS[id].quest && (!e || !(ITEMS[id].weapon || ITEMS[id].armor)) && !(id === S.armor && cnt(id) === 1));
  if (!mine.length) b.appendChild(el('p', 'note', 'Продавать нечего.'));
  mine.forEach(id => {
    const isAmmo = ITEMS[id].ammo, q = isAmmo ? Math.min(cnt(id), 10) : 1, p = sellPrice(id, !!e) * q;
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(itemIcon(id)); r.appendChild(t);
    const g = el('div', 'grow'); g.appendChild(el('div', 'nm', ITEMS[id].n + (cnt(id) > 1 ? ' (' + cnt(id) + ')' : ''))); g.appendChild(el('div', 'price', '+' + p + ' RU' + (q > 1 ? ' за ' + q : ''))); r.appendChild(g);
    r.appendChild(btn('', 'Продать', () => {
      if (e && e.money < p) { panel.hint = 'У него не хватает денег.'; refresh(); return; }
      take(id, q); S.money += p; if (e) { e.money -= p; e.inv[id] = (e.inv[id] || 0) + q; }
      play('pick'); panel.hint = 'Продано: ' + ITEMS[id].n + '.'; refresh();
    }));
    b.appendChild(r);
  });
  cols.appendChild(a); cols.appendChild(b); pbody.appendChild(cols);
}

/* ---------- рюкзак ---------- */
function drawInv() {
  pbody.appendChild(person(meCard()));
  pbody.appendChild(el('p', 'note', 'Вес ' + weight() + ' из ' + MAXW + ' кг · защита ' + Math.round(def() * 100) + '% · радиация ' + Math.round(S.rad) + ' · сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '')));
  const ids = ['knife'].concat(Object.keys(S.inv));
  const g = el('div', 'grid');
  ids.forEach(id => {
    const c = el('button', 'cell' + (panel.sel === id ? ' sel' : '') + ((S.weapon === id || S.armor === id || beltCount(id)) ? ' on' : ''));
    c.type = 'button'; c.appendChild(itemIcon(id));
    if (cnt(id) > 1) c.appendChild(el('span', 'bd', String(cnt(id))));
    c.setAttribute('aria-label', id === 'knife' ? 'Нож' : ITEMS[id].n);
    c.addEventListener('click', () => { panel.sel = id; panel.hint = ''; refresh(); });
    g.appendChild(c);
  });
  pbody.appendChild(g);
  const id = panel.sel;
  if (!id || (id !== 'knife' && !has(id))) { pbody.appendChild(el('p', 'note', 'Нажми на вещь, чтобы посмотреть её и применить. Артефакты вешаются на пояс, до трёх штук.')); return; }
  const it = id === 'knife' ? { n: 'Нож', w: 0.3 } : ITEMS[id];
  const d = el('div', 'detail');
  d.appendChild(el('div', 'nm', it.n + (cnt(id) > 1 ? ' ×' + cnt(id) : '')));
  let desc = it.d || '';
  if (WP[id]) { const W = WP[id]; desc = W.melee ? 'Урон ' + W.dmg + ', только вплотную' : 'Урон ' + W.dmg + (W.pellets ? '×' + W.pellets : '') + ', магазин ' + W.mag + ', дальность ' + W.range + '. Состояние ' + Math.round(cond(id)) + '%' + (cond(id) < 65 ? ', может заклинить. Почини у Сидоровича' : ''); }
  if (FOOD[id]) desc += ', сытость +' + FOOD[id];
  if (it.armor) desc = 'Защита ' + Math.round(it.armor * 100) + '%';
  if (ARTFX[id]) desc += '. ' + ARTFX[id];
  d.appendChild(el('div', 'ds', desc));
  d.appendChild(el('div', 'ds', 'Вес ' + (Math.round((it.w || 0) * Math.max(1, cnt(id)) * 100) / 100) + ' кг'));
  const row = el('div', 'btnrow');
  if (WP[id] && S.weapon !== id) row.appendChild(btn('go', 'Взять в руки', () => { setWeapon(id); refresh(); }));
  if (it.armor && S.armor !== id) row.appendChild(btn('go', 'Надеть', () => { S.armor = id; refresh(); }));
  if (it.heal !== undefined || it.rad !== undefined) row.appendChild(btn('go', 'Применить', () => { useItem(id); refresh(); }));
  if (ARTFX[id]) row.appendChild(btn('go', beltCount(id) ? 'Снять с пояса' : 'На пояс', () => {
    if (beltCount(id)) S.belt.splice(S.belt.indexOf(id), 1);
    else if (S.belt.length >= 3) panel.hint = 'Пояс занят: сначала сними другой артефакт.';
    else S.belt.push(id);
    refresh();
  }));
  if (id !== 'knife' && !it.quest && S.armor !== id) row.appendChild(btn('wide', 'Выбросить', () => {
    const q = cnt(id); take(id, q);
    objs.push({ k: 'body', kind: 'sack', x: P.x + rnd(-6, 6), y: P.y + 12, ang: 0, fac: 'loner', name: 'Рюкзак', seed: 1, loot: { [id]: q }, t: S.min });
    panel.sel = null; refresh();
  }));
  d.appendChild(row);
  pbody.appendChild(d);
}

/* ---------- обыск ---------- */
function openLoot(o) {
  if (o.loot.__tip) { delete o.loot.__tip; revealCache(o.name); }
  if (o.k === 'cache') { S.caches[o.cacheId] = 2; }
  openPanel('loot', o.k === 'cache' ? 'Тайник' : o.stash ? 'Ящик' : 'Обыск: ' + o.name); panel.o = o; refresh(); pbody.scrollTop = 0;
}
function drawLoot() {
  const o = panel.o, keys = Object.keys(o.loot).filter(k => k !== '__tip');
  if (!keys.length) { pbody.appendChild(el('p', 'note', 'Пусто.')); return; }
  keys.forEach(k => {
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(k === 'money' ? icon('i-pack') : itemIcon(k)); r.appendChild(t);
    r.appendChild(el('div', 'grow nm', k === 'money' ? o.loot[k] + ' RU' : ITEMS[k].n + (o.loot[k] > 1 ? ' ×' + o.loot[k] : '')));
    const dupW = k !== 'money' && WP[k] && !WP[k].melee && has(k);
    if (dupW) r.appendChild(el('span', 'note', 'Такой ствол уже есть'));
    r.appendChild(btn('', 'Взять', () => {
      // правило одного ствола каждого типа: дубликат не берётся, состояние брошенного ствола возвращается при подборе
      if (k === 'money') S.money += o.loot[k]; else { give(k, o.loot[k]); if (WP[k] && !WP[k].melee) S.cond[k] = o.wcond && o.wcond[k] != null ? o.wcond[k] : (S.cond[k] == null ? 80 : S.cond[k]); }
      delete o.loot[k]; play('pick');
      if (!Object.keys(o.loot).length && o.stash) { o.looted = true; S.flags['st_' + o.stash] = 1; }
      refresh();
    }, dupW));
    pbody.appendChild(r);
  });
  pbody.appendChild(btn('go', 'Взять всё', () => { lootAll(o); closePanel(); }));
}

/* ---------- ПДА ---------- */
const PDA_TABS = [['map', 'Карта'], ['tasks', 'Задания'], ['log', 'Журнал'], ['stat', 'Данные']];
function drawPda() {
  if (panel.tab === 'map') {
    const bar = el('div', 'mapbar'); bar.appendChild(el('span', 'note', panel.zoom ? 'Листай карту пальцем.' : 'Вся карта Кордона.'));
    bar.appendChild(btn('chip', panel.zoom ? 'Отдалить' : 'Приблизить', () => { panel.zoom = !panel.zoom; refresh(); }));
    pbody.appendChild(bar);
    const w = el('div', 'mapwrap' + (panel.zoom ? ' zoom' : '')), c = el('canvas'); c.id = 'bigmap'; c.width = PW * 6; c.height = MH * 6;
    w.appendChild(c); pbody.appendChild(w);
    drawMapTo(c.getContext('2d'), 6, true);
    if (panel.zoom) requestAnimationFrame(() => { const pp = inBunker(P.x, P.y) ? HATCH : P; w.scrollLeft = pp.x / (PW * T) * w.scrollWidth - w.clientWidth / 2; w.scrollTop = pp.y / (MH * T) * w.scrollHeight - w.clientHeight / 2; });
    const lg = el('div', 'legend');
    [['#e6dcb4', 'Ты'], ['#dc9330', 'Цель задания'], ['#d9c25a', 'Одиночки'], ['#d64541', 'Враги рядом'], ['#6fa35c', 'Военные'], ['#7fb0c4', 'Сидорович']].forEach(x => { const s = el('span'); const p = el('i', 'pip'); p.style.background = x[0]; s.appendChild(p); s.appendChild(document.createTextNode(x[1])); lg.appendChild(s); });
    pbody.appendChild(lg);
    pbody.appendChild(el('p', 'note', 'Карта открывается там, где ты прошёл. КПК показывает людей и зверьё только в радиусе нескольких сотен метров.'));
  } else if (panel.tab === 'tasks') {
    const L = qList();
    if (!L.length) pbody.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
    L.sort((a, b) => (a.st === 'a' ? 0 : 1) - (b.st === 'a' ? 0 : 1)).forEach(q => {
      const r = el('div', 'row'), g = el('div', 'grow');
      g.appendChild(el('div', 'nm', q.n + (q.st === 'd' ? ' · выполнено' : q.st === 'f' ? ' · провалено' : ''))); g.appendChild(el('div', 'ds', q.d));
      r.appendChild(g); pbody.appendChild(r);
    });
  } else if (panel.tab === 'log') {
    if (!S.news.length) pbody.appendChild(el('p', 'note', 'Записей пока нет.'));
    S.news.slice().reverse().forEach(n => { const r = el('div', 'row'), g = el('div', 'grow'); g.appendChild(el('div', 'tm', clockStr(n.t))); g.appendChild(el('div', 'ds lite', n.x)); r.appendChild(g); pbody.appendChild(r); });
  } else {
    pbody.appendChild(person(meCard()));
    const st = el('div', 'stat');
    [['Убито людей', S.stats.kS], ['Убито мутантов', S.stats.kM], ['Выполнено заданий', S.stats.q], ['Найдено артефактов', S.stats.art], ['Очки рейтинга', score()], ['Отношение одиночек', S.rep]].forEach(x => { st.appendChild(el('span', '', x[0])); st.appendChild(el('b', '', String(x[1]))); });
    pbody.appendChild(st);
  }
}
/* ---------- меню ---------- */
function drawMenu() {
  pbody.appendChild(el('p', 'note', 'Зона: Кордон, 2D-прототип RC1 (тестовая карта). Игра сохраняется сама у костра и у Сидоровича. Здесь можно сохраниться вручную, если рядом нет врагов.'));
  pbody.appendChild(btn('wide', 'Сохранить игру', () => {
    if (ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 450)) panel.hint = 'Рядом враги, сохраниться нельзя.';
    else { save(true); panel.hint = 'Игра сохранена.'; }
    refresh();
  }));
  pbody.appendChild(btn('wide', 'Загрузить последнее сохранение', () => { const d = loadSave(); if (d) { applyState(d); closePanel(); msg('Загружено.'); } else { panel.hint = 'Сохранений нет.'; refresh(); } }));
  pbody.appendChild(btn('wide', (AC && master && master.gain.value === 0 ? 'Включить' : 'Выключить') + ' звук', () => { audioInit(); if (master) master.gain.value = master.gain.value ? 0 : 0.55; refresh(); }));
  pbody.appendChild(btn('wide warn', 'Начать заново', () => { if (panel.sure) { applyState(freshS()); closePanel(); intro(); } else { panel.sure = 1; panel.hint = 'Прогресс сотрётся. Нажми ещё раз, чтобы начать заново.'; refresh(); } }));
  const k = el('div', 'note'); k.style.lineHeight = '1.8';
  k.textContent = 'Клавиатура: WASD ходить, Shift бег, C присесть, мышь целиться, ЛКМ стрелять, R перезарядка или передёрнуть затвор, E действие, F болт, G граната, Q или H аптечка, 1–4 оружие, I рюкзак, M КПК, Esc меню. На телефоне: левый палец ходит, правый целится и стреляет.';
  pbody.appendChild(k);
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
  const palette = [0x666345, 0x666345, 0x666345, 0x465855, 0x908b79, 0x4b5038,
    0x695941, 0x806352, 0x54573c, 0x716957, 0x817d70, 0x10130e];
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    const t = map[y * MW + x], c = palette[t], i = (y * PW + x) * 4;
    const k = 0.88 + vnoise(x, y, 5) * 0.24;
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
    const n = hash2(x, y), r = 0.8 + n * 0.45;
    g.fillStyle = '#363e30'; g.beginPath(); g.arc(x + 0.55, y + 0.55, r, 0, 2 * Math.PI); g.fill();
    g.fillStyle = n < 0.65 ? '#484f37' : '#57583b';
    g.beginPath(); g.arc(x + 0.4, y + 0.36, r * 0.8, 0, 2 * Math.PI); g.fill();
  }
  g.restore();
  // Порог убирает размытие внутри полотна, мягкая кромка соединяет диагональные клетки.
  for (let i = 0; i < mask.data.length; i += 4) {
    const coverage = mask.data[i], asphalt = clamp((mask.data[i + 1] - 80) / 80, 0, 1);
    mask.data[i] = 177 - asphalt * 76;
    mask.data[i + 1] = 146 - asphalt * 38;
    mask.data[i + 2] = 102 + asphalt * 8;
    mask.data[i + 3] = clamp((coverage - 49) * 3, 0, 255);
  }
  // putImageData не смешивает прозрачность. Переиспользуем временный холст для наложения.
  base.width = miniC.width; base.height = miniC.height;
  bg.putImageData(mask, 0, 0); g.drawImage(base, 0, 0);
  g.scale(K, K);
  HOUSES.forEach((h, i) => {
    if (h.x >= PW) return;
    g.fillStyle = '#36372e'; g.fillRect(h.x - 0.2, h.y - 0.2, h.w + 0.5, h.h + 0.6);
    g.fillStyle = '#887d6a'; g.fillRect(h.x, h.y, h.w, h.h);
    if (ROOFS[i]) g.drawImage(ROOFS[i], h.x - 3 / T, h.y - 3 / T, h.w + 10 / T, h.h + 10 / T);
  });
  objs.forEach(o => {
    if (o.static && o.solid && o.x < PW * T && (o.k === 'bus' || o.k === 'car')) {
      g.fillStyle = o.k === 'bus' ? '#8a6a2a' : '#6b6a5e';
      g.fillRect(o.x / T, o.y / T, Math.max(1, o.w / T), Math.max(1, o.h / T));
    }
  });
}
function buildMini() {
  fogC.width = PW; fogC.height = MH;
  if (BIG) { buildBigMini(); return; }
  if (ART) {
    const K = 4; miniC.width = PW * K; miniC.height = MH * K;
    const g = miniC.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(groundC, 0, 0, PW * T, WH, 0, 0, PW * K, MH * K);
    HOUSES.forEach((h, i) => { if (h.x < PW && ROOFS[i]) g.drawImage(ROOFS[i], (h.x * T - 3) * K / T, (h.y * T - 3) * K / T, (h.w * T + 10) * K / T, (h.h * T + 10) * K / T); });
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
  const g = fogC.getContext('2d'), id = g.createImageData(PW, MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; id.data[i * 4] = 10; id.data[i * 4 + 1] = 12; id.data[i * 4 + 2] = 9; id.data[i * 4 + 3] = fog[y * MW + x] ? 0 : 235; }
  g.putImageData(id, 0, 0);
}
function entColor(e) { if (e.fac === 'mutant' || hostile(e, P)) return '#d64541'; if (e.fac === 'army') return '#6fa35c'; return '#d9c25a'; }
/* карта КПК: o.u — сколько пикселей холста в одном CSS-пикселе (маркеры и подписи одного экранного размера при любом масштабе);
   подписи раскладываются без наложения: сначала выбранная цель, потом места; не влезла ни в одну позицию — не рисуется */
function drawMapTo(g, s, full, o) {
  o = o || { ppl: 1, cache: 1 };
  const u = o.u || 1;
  updateFog();
  g.imageSmoothingEnabled = !!ART;
  g.drawImage(miniC, 0, 0, PW * s, MH * s);
  g.drawImage(fogC, 0, 0, PW * s, MH * s);
  const busy = [];   // занятые прямоугольники: маркеры и подписи
  const mark = (x, y, r) => busy.push([x - r, y - r, x + r, y + r]);
  g.fillStyle = '#7fb0c4'; g.fillRect(HATCH.x / T * s - 4 * u, HATCH.y / T * s - 4 * u, 8 * u, 8 * u); mark(HATCH.x / T * s, HATCH.y / T * s, 5 * u);
  if (o.ppl) ents.forEach(e => { if (!e.alive || e === P || dE(e, P) > 520 || inBunker(e.x, e.y) || e.cloak > 0.7) return; g.fillStyle = entColor(e); g.beginPath(); g.arc(e.x / T * s, e.y / T * s, 3.2 * u, 0, 6.28); g.fill(); });
  if (o.cache) objs.forEach(c => { if (c.k === 'cache' && S.caches[c.cacheId] === 1) { const x = c.x / T * s, y = c.y / T * s; g.fillStyle = '#e8c070'; g.fillRect(x - 4 * u, y - 4 * u, 8 * u, 8 * u); g.strokeStyle = '#000'; g.lineWidth = u; g.strokeRect(x - 4 * u, y - 4 * u, 8 * u, 8 * u); mark(x, y, 5 * u); } });
  const selQ = o.sel || [], trq = trackedTarget(), labs = [];
  qTargets().forEach(q => {
    const x = q.x / T * s, y = q.y / T * s, isSel = selQ.includes(q) || selQ.some(t => t.qid === q.qid && t.x === q.x), r = (isSel ? 9 : 6) * u;
    g.fillStyle = q.qid === 'sos' ? '#e0573a' : isSel ? '#ffb347' : '#dc9330'; g.globalAlpha = isSel || q.qid === 'sos' || (trq && q.qid === trq.qid) ? 1 : 0.6;
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5 * u; g.stroke(); g.globalAlpha = 1;
    mark(x, y, r);
    if (isSel) { g.strokeStyle = '#ffb347'; g.lineWidth = 2 * u; g.beginPath(); g.arc(x, y, 15 * u, 0, 6.28); g.stroke(); labs.push({ t: q.n, x: x, y: y, gap: 17 * u, pri: 0, font: '700 ' + Math.round(13 * u) + 'px Arial', c: '#ffe2b0' }); }
  });
  const pp = inBunker(P.x, P.y) ? HATCH : P;
  const px = pp.x / T * s, py = pp.y / T * s;
  mark(px, py, 8 * u);
  if (full) LOCATIONS.forEach(l => {
    if (l.id === 'sid') return;
    const cx = (l.bounds[0] + l.bounds[2]) / 2, cy = (l.bounds[1] + l.bounds[3]) / 2;
    if (!fog[Math.min(MH - 1, Math.max(0, Math.round(cy))) * MW + Math.min(MW - 1, Math.round(cx))]) return;
    labs.push({ t: l.name, x: cx * s, y: cy * s, gap: 0, pri: 1, font: '600 ' + Math.round(11.5 * u) + 'px Arial', c: 'rgba(232,222,186,0.95)' });
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
  g.save(); g.translate(px, py); g.rotate(P.ang); g.scale(u * 1.3, u * 1.3); g.fillStyle = '#f2ead0'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(7, 0); g.lineTo(-4, -4.5); g.lineTo(-2, 0); g.lineTo(-4, 4.5); g.closePath(); g.fill(); g.stroke(); g.restore();
}
const mini = $('mini'), mctx = mini.getContext('2d');
function drawMini() {
  const W = mini.clientWidth || 128;
  if (mini.width !== W * 2) { mini.width = W * 2; mini.height = W * 2; }
  const s = 7, size = mini.width;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#0d120c'; mctx.fillRect(0, 0, size, size);
  if (inBunker(P.x, P.y)) { mctx.fillStyle = '#7fb0c4'; mctx.font = '600 22px "Russo One", sans-serif'; mctx.textAlign = 'center'; mctx.fillText('БУНКЕР', size / 2, size / 2 - 6); mctx.font = '500 16px "IBM Plex Mono", monospace'; mctx.fillStyle = '#8f8c74'; mctx.fillText('под землёй', size / 2, size / 2 + 20); mctx.textAlign = 'start'; return; }
  mctx.setTransform(1, 0, 0, 1, size / 2 - P.x / T * s, size / 2 - P.y / T * s);
  updateFog();
  mctx.imageSmoothingEnabled = !!ART;
  mctx.drawImage(miniC, 0, 0, PW * s, MH * s); mctx.drawImage(fogC, 0, 0, PW * s, MH * s);
  if (darkness() > 0.3) {
    mctx.fillStyle = 'rgba(4,7,12,0.35)';
    mctx.fillRect(P.x / T * s - size / 2, P.y / T * s - size / 2, size, size);
  }
  mctx.strokeStyle = '#29291f'; mctx.lineWidth = 2;
  mctx.fillStyle = '#7fb0c4'; mctx.fillRect(HATCH.x / T * s - 5, HATCH.y / T * s - 5, 10, 10);
  objs.forEach(o => { if (o.k === 'cache' && S.caches[o.cacheId] === 1) { mctx.fillStyle = '#e8c070'; mctx.fillRect(o.x / T * s - 5, o.y / T * s - 5, 10, 10); } });
  ents.forEach(e => { if (!e.alive || e === P || dE(e, P) > 520 || inBunker(e.x, e.y)) return; mctx.fillStyle = entColor(e); mctx.beginPath(); mctx.arc(e.x / T * s, e.y / T * s, 4.5, 0, 6.28); mctx.fill(); mctx.stroke(); });
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const tq = trackedTarget();
  qTargets().forEach(q => {
    if (q !== tq && !(tq && q.qid === tq.qid && q.x === tq.x) && q.qid !== 'sos') mctx.globalAlpha = 0.45; else mctx.globalAlpha = 1;
    let x = size / 2 + (q.x - P.x) / T * s, y = size / 2 + (q.y - P.y) / T * s;
    const edge = x < 10 || y < 10 || x > size - 10 || y > size - 10;
    if (edge) { const a = Math.atan2(y - size / 2, x - size / 2); x = size / 2 + Math.cos(a) * (size / 2 - 12); y = size / 2 + Math.sin(a) * (size / 2 - 12); }
    mctx.fillStyle = q.qid === 'sos' ? '#e0573a' : '#dc9330'; mctx.beginPath(); mctx.moveTo(x, y - 9); mctx.lineTo(x + 9, y); mctx.lineTo(x, y + 9); mctx.lineTo(x - 9, y); mctx.closePath(); mctx.fill(); mctx.stroke();
  });
  mctx.globalAlpha = 1;
  mctx.save(); mctx.translate(size / 2, size / 2); mctx.rotate(P.ang); mctx.fillStyle = '#f2ead0'; mctx.strokeStyle = '#000'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.moveTo(12, 0); mctx.lineTo(-7, -8); mctx.lineTo(-3, 0); mctx.lineTo(-7, 8); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
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
const H = { hp: $('hpb'), hpv: $('hpv'), fd: $('fdb'), fdv: $('fdv'), radv: $('radv'), sBleed: $('s-bleed'), sBleedN: $('s-bleedn'), sRad: $('s-rad'), wcn: $('wcn'), wcb: $('wcb'), sig: $('sig'), det: $('det'), st: $('stb'), stv: $('stv'), belt: $('belt'), clock: $('clock'), money: $('money'),
  status: $('status'), quest: $('quest'), msgs: $('msgs'), prompt: $('prompt'), wico: $('wico'), wn: $('wn'), am: $('am') };
let hudT = 0, lastW = '';
function hud(dt) {
  if (!P) return;
  H.hp.style.width = clamp(P.hp, 0, 100) + '%'; H.hp.parentNode.classList.toggle('low', P.hp < 30); H.hpv.textContent = Math.max(0, Math.round(P.hp));
  H.fd.style.width = clamp(S.food, 0, 100) + '%'; H.fdv.textContent = Math.round(S.food); H.fd.parentNode.classList.toggle('low', S.food < 20);
  H.sRad.classList.toggle('on', S.rad > 1); H.sRad.classList.toggle('hi', S.rad > 40); H.radv.textContent = S.rad > 1 ? Math.round(S.rad) : '';
  H.sBleed.classList.toggle('on', !!S.bleed); H.sBleedN.textContent = S.bleed > 1 ? S.bleed : '';
  const sg = P.detD < 280 ? Math.ceil((1 - P.detD / 280) * 5) : 0;
  if (H.sig.dataset.v != sg) { H.sig.dataset.v = sg; [...H.sig.children].forEach((b, i) => b.classList.toggle('on', i < sg)); H.det.classList.toggle('on', sg > 0); }
  H.st.style.width = P.st + '%'; H.stv.textContent = weight() > MAXW ? '!' : Math.round(P.st);
  const fol = ents.find(x => x.alive && x.follow);
  const stt = [fol ? 'напарник ' + fol.name.split(' ')[0] + (fol.wait ? ' ждёт' : '') + ' до ' + clockStr(fol.hireEnd).replace(/ · день \d+/, '') : '', S.food < 20 ? 'голод' : '', P.crouch ? 'присел' : '', P.jam ? 'заклинило' : '', weight() > MAXW ? 'перегруз' : '', P.detD < 280 ? 'аномалия ' + Math.round(P.detD / T * 1.5) + ' м' : ''].filter(Boolean).join(' · ');
  $('b-crouch').classList.toggle('on', !!P.crouch);
  if (H.status.textContent !== stt) H.status.textContent = stt;
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.15;
  H.clock.textContent = clockStr(); H.money.textContent = S.money + ' RU';
  const bs = S.belt.join(',');
  if (H.belt.dataset.v !== bs) { H.belt.dataset.v = bs; H.belt.textContent = ''; S.belt.forEach(a => { const sp = el('span'); sp.appendChild(itemIcon(a)); H.belt.appendChild(sp); }); }
  const W = WP[S.weapon];
  if (lastW !== S.weapon) { lastW = S.weapon; H.wico.textContent = ''; const bi = (window.CORDON_G8_ON && g3Icon(S.weapon)) || b1Icon(S.weapon); if (bi) H.wico.appendChild(bi); else if (WSIL[S.weapon]) H.wico.innerHTML = WSIL[S.weapon]; else H.wico.appendChild(icon(ICON[S.weapon])); H.wn.textContent = W.n; }
  $('wpnbox').classList.toggle('rel', P.reload > 0);
  H.am.textContent = '';
  const cd = W.melee ? 100 : Math.round(S.cond[S.weapon] == null ? 100 : S.cond[S.weapon]);
  H.wcn.textContent = W.melee ? 'Холодное оружие' : 'Состояние: ' + cd + '%'; H.wcb.style.width = cd + '%'; H.wcb.parentNode.className = 'cb' + (cd < 35 ? ' bad' : cd < 65 ? ' mid' : '');
  if (W.melee) H.am.textContent = '∞';
  else { H.am.appendChild(document.createTextNode(String(S.mag[S.weapon] || 0))); H.am.appendChild(el('small', '', ' / ' + cnt(W.ammo))); if (P.reload > 0) H.am.appendChild(el('div', 'rl', 'перезарядка')); }
  const q = trackedTarget();
  H.quest.textContent = '';
  if (q) {
    const d = Math.round(dst(P.x, P.y, q.x, q.y) / T * 1.5), a = Math.atan2(q.y - P.y, q.x - P.x);
    H.quest.appendChild(el('span', 'ex', '!')); H.quest.appendChild(el('span', 'qn', q.n));
    const ar = el('span', 'arr', '➤'); ar.style.transform = 'rotate(' + a + 'rad)'; H.quest.appendChild(ar); H.quest.appendChild(el('span', 'qd', d + ' м'));
  }
  H.msgs.textContent = '';
  MSGS.forEach(m => { const p = el('p', m.k, m.t); p.style.opacity = clamp(m.life / 1.5, 0, 1); H.msgs.appendChild(p); });
  const n = G.near;
  H.prompt.textContent = '';
  if (n && P.alive && !panel) { const ic = el('span', 'pi ' + n.k); H.prompt.appendChild(ic); if (!IN.touch) H.prompt.appendChild(el('kbd', '', 'E')); H.prompt.appendChild(document.createTextNode(n.label.replace(/^Поговорить: /, 'Говорить: ') + '.')); }
  drawMini();
}

/* ===================== ввод ===================== */
function interact() {
  const n = G.near; if (!n || !P.alive) return;
  if (n.k === 'talk') talk(n.e);
  else if (n.k === 'trader') { save(true); talkTrader(); }
  else if (n.k === 'down') goThrough(true);
  else if (n.k === 'up') goThrough(false);
  else if (n.k === 'heal') {
    const e = n.e;
    if (healWounded(e)) dialog(cardOf(e), e.sid === 'fox' ? ['Спасибо, брат... Тихо! Слышишь вой? Стая вернулась, бери ствол!'] : ['Живой... Спасибо, братишка. Держи, что есть: деньги и антирад. Я твой должник.'], () => [{ t: e.sid === 'fox' ? 'К бою' : 'Береги себя', close: 1 }], 'dialog', e);
  }
  else if (n.k === 'loot') openLoot(n.o);
  else if (n.k === 'rest') restAtFire();
  else if (n.k === 'pick') pickUp(n.o);
  else if (n.k === 'genset') gensetUse();
  else if (n.k === 'exit') exitUse();
  else if (n.k === 'art') takeArt(n.a);
  else if (n.k === 'free') {
    if (ents.some(e => e.alive && e.fac === 'bandit' && dE(e, n.e) < 260)) { msg('Сначала разберись с бандитами рядом.', 'bad'); return; }
    freeShust(n.e);
    dialog(cardOf(n.e), ['Думал, всё, спишут меня. Флешка при мне, в подкладку зашита, эти олухи не нашли. Отнеси Сидоровичу, я пока в деревню, отлежусь.'], () => [{ t: 'Иди, я прикрою', close: 1 }], 'dialog', n.e);
  }
}
const KEYS = {};
addEventListener('keydown', e => {
  audioInit();
  const k = e.code;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].indexOf(k) >= 0 && !panel) e.preventDefault();
  if (title.open) return;
  if (k === 'Escape') { if (panel) closePanel(); else { openPanel('menu', 'Меню'); refresh(); } return; }
  if (panel) { if ((k === 'KeyI' && panel.kind === 'inv') || (k === 'KeyM' && panel.kind === 'pda') || k === 'Tab') { e.preventDefault(); closePanel(); } return; }
  KEYS[k] = true;
  if (!P.alive) return;
  if (k === 'KeyE' || k === 'Space') interact();
  if (k === 'KeyR') startReload();
  if (k === 'KeyF') throwBolt();
  if (k === 'KeyG') throwNade();
  if (k === 'KeyQ' || k === 'KeyH') quickHeal();
  if (k === 'KeyC' || k === 'ControlLeft') { P.crouch = !P.crouch; msg(P.crouch ? 'Присел: тише и незаметнее.' : 'Встал.'); }
  if (k === 'Digit1') setWeapon('knife'); if (k === 'Digit2') setWeapon('w_pm'); if (k === 'Digit3') setWeapon('w_obrez'); if (k === 'Digit4') setWeapon('w_aksu');
  if (k === 'KeyI' || k === 'Tab') { e.preventDefault(); openPanel('inv', 'Рюкзак'); refresh(); }
  if (k === 'KeyM' || k === 'KeyP') { openPanel('pda', 'КПК', PDA_TABS2); refresh(); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
/* сворачивание окна/потеря фокуса: никакой ввод не остаётся «зажатым» */
function resetInput() {
  for (const k in KEYS) KEYS[k] = false;
  IN.fire = false; IN.touchFire = false; IN.btnFire = false; IN.fireStick = null; IN.left = null; IN.aimStick = null; IN.moveX = IN.moveY = 0;
  const fb = document.getElementById('b-fire'); if (fb) { fb.classList.remove('on'); fb.style.setProperty('--fx', '0px'); fb.style.setProperty('--fy', '0px'); }
  if (typeof joyReset === 'function') joyReset();
}
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
function keyMove() {
  if (IN.touch) return;
  IN.moveX = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0);
  IN.moveY = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
  IN.sprint = !!(KEYS.ShiftLeft || KEYS.ShiftRight);
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
  cv.setPointerCapture(e.pointerId);
  const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, a: P.ang };
  if (e.clientX < VW * 0.5) { IN.left = s; joyAt(e.clientX, e.clientY, s); } else IN.aimStick = s;
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { IN.mx = e.clientX; IN.my = e.clientY; if (IN.touch) setTouch(false); return; }
  const s = IN.left && IN.left.id === e.pointerId ? IN.left : IN.aimStick && IN.aimStick.id === e.pointerId ? IN.aimStick : null;
  if (!s) return;
  let dx = (e.clientX - s.ox) / 56, dy = (e.clientY - s.oy) / 56;
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  s.dx = dx; s.dy = dy;
  if (s === IN.left) { IN.moveX = dx; IN.moveY = dy; JOYK.style.transform = 'translate(' + (dx * 34) + 'px,' + (dy * 34) + 'px)'; }
  else { if (m > 0.2) s.a = Math.atan2(dy, dx); IN.touchFire = m > 0.92; }
});
function endPtr(e) {
  if (e.pointerType === 'mouse') { IN.fire = false; return; }
  if (IN.left && IN.left.id === e.pointerId) { IN.left = null; IN.moveX = IN.moveY = 0; joyReset(); }
  if (IN.aimStick && IN.aimStick.id === e.pointerId) { IN.aimStick = null; IN.touchFire = false; }
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (!panel) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
const TB = { 'b-crouch': () => { P.crouch = !P.crouch; $('b-crouch').classList.toggle('on', !!P.crouch); msg(P.crouch ? 'Присел: тише и незаметнее.' : 'Встал.'); }, 'b-rel': startReload, 'b-bolt': throwBolt, 'b-med': quickHeal, 'b-nade': throwNade, 'b-wpn': () => cycleWeapon(1) };
const fireB = $('b-fire');
fireB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); try { fireB.setPointerCapture(e.pointerId); } catch (x) {} const r = fireB.getBoundingClientRect(); IN.fireStick = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, a: 0, m: 0 }; IN.btnFire = true; fireB.classList.add('on'); });
fireB.addEventListener('pointermove', e => { const f = IN.fireStick; if (!f) return; const dx = e.clientX - f.cx, dy = e.clientY - f.cy, m = Math.min(1, Math.hypot(dx, dy) / 60); f.m = m; if (m > 0.25) f.a = Math.atan2(dy, dx); fireB.style.setProperty('--fx', (Math.cos(f.a) * m * 14) + 'px'); fireB.style.setProperty('--fy', (Math.sin(f.a) * m * 14) + 'px'); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => fireB.addEventListener(t, () => { IN.btnFire = false; IN.fireStick = null; fireB.classList.remove('on'); fireB.style.setProperty('--fx', '0px'); fireB.style.setProperty('--fy', '0px'); }));
$('prompt').addEventListener('click', e => { e.stopPropagation(); audioInit(); if (!panel) interact(); });
$('rot-skip').addEventListener('click', () => document.body.classList.add('portrait-ok'));
Object.keys(TB).forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if (P.alive && !panel) TB[id](); }));
$('wpnbox').addEventListener('click', () => { if (P.alive && !panel) cycleWeapon(1); });
$('t-inv').addEventListener('click', () => { if (!panel && P.alive) { openPanel('inv', 'Рюкзак'); refresh(); } });
$('t-pda').addEventListener('click', () => { if (!panel && P.alive) { openPanel('pda', 'КПК', PDA_TABS2); refresh(); } });
$('t-menu').addEventListener('click', () => { if (!panel) { openPanel('menu', 'Меню'); refresh(); } });
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) setTouch(true);

/* ===================== заставка и смерть ===================== */
const title = { open: true, el: $('title') };
function showTitle(kind) {
  title.open = true; title.el.classList.add('open'); document.body.classList.add('title-open');
  const c = $('tcard'); c.textContent = ''; c.classList.toggle('death', kind === 'death');
  if (kind === 'death') {
    const h = el('h1', '', 'Зона забрала'); h.appendChild(el('span', '', 'ещё одного')); c.appendChild(h);
    c.appendChild(el('div', 'tape'));
    c.appendChild(el('p', '', 'Последнее сохранение делается само у костра в деревне и у Сидоровича.'));
    const b = el('div', 'tbtns');
    b.appendChild(btn('go', 'Загрузить сохранение', () => { const d = loadSave(); applyState(d || freshS()); hideTitle(); if (!d) intro(); }));
    b.appendChild(btn('alt', 'Начать заново', () => { applyState(freshS()); hideTitle(); intro(); }));
    c.appendChild(b);
    return;
  }
  const h = el('h1', '', 'Зона: Кордон'); h.appendChild(el('span', '', '2D-прототип')); c.appendChild(h);
  c.appendChild(el('div', 'tape'));
  c.appendChild(el('p', '', 'Фанатская игра по мотивам «Теней Чернобыля» с видом сверху. Живые сталкеры, бандиты, слепые псы, аномалии, день и ночь.'));
  const k = el('div', 'keysel');
  k.innerHTML = IN.touch ? 'Играй в горизонтальном положении. <b>Левый палец</b> ходит, <b>правый</b> целится. Красная кнопка «Огонь» стреляет и сама наводит на ближайшего врага. Когда рядом есть что взять или с кем поговорить, внизу появляется оранжевая кнопка: жми на неё.'
    : '<b>WASD</b> ходить · <b>Shift</b> бег · <b>мышь</b> прицел и огонь · <b>R</b> перезарядка · <b>E</b> действие · <b>F</b> болт · <b>G</b> граната · <b>Q</b> аптечка · <b>I</b> рюкзак · <b>M</b> КПК';
  c.appendChild(k);
  const b = el('div', 'tbtns'), sv0 = loadSave();
  if (sv0) b.appendChild(btn('go', 'Продолжить', () => { audioInit(); applyState(sv0); hideTitle(); }));
  b.appendChild(btn(sv0 ? 'alt' : 'go', 'Новая игра', () => { audioInit(); applyState(freshS()); hideTitle(); intro(); }));
  c.appendChild(b);
}
function goFull() {   // на весь экран там, где браузер это умеет (Android, iPad, компьютер); на iPhone — через «На экран Домой»
  try { const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; if (IN.touch && f && !document.fullscreenElement && !document.webkitFullscreenElement) { const r = f.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } } catch (e) {}
}
function hideTitle() { goFull(); title.open = false; title.el.classList.remove('open'); document.body.classList.remove('title-open'); }
function onDeath() { showTitle('death'); }
function intro() { setTimeout(() => { if (!panel && P.alive) { msg('Ты очнулся в бункере у торговца. Подойди к прилавку и поговори с Сидоровичем.', 'say'); } }, 400); }

/* ===================== цикл ===================== */
let last = performance.now();
/* автоподстройка: если в игре кадр в среднем дольше 22 мс, кроны деревьев рисуются мельче (меньше заливки для слабого телефона) */
const AQ = { buf: [], done: /aq-off/.test(location.hash) };
function autoQuality(ms) {
  if (AQ.done || panel || title.open || document.hidden) return;
  if (ms > 0 && ms < 200) AQ.buf.push(ms);
  if (AQ.buf.length < 180) return;
  const a = AQ.buf.slice().sort((x, y) => x - y), med = a[a.length >> 1]; AQ.buf.length = 0;
  if (med > 22 && CAN_SZ > 72) { CAN_SZ = Math.max(72, CAN_SZ - 12); CANOPY.length = 0; buildCanopy(); AQ.lowered = (AQ.lowered || 0) + 1; }
  else AQ.done = true;
}
function frame(now) {
  requestAnimationFrame(frame);
  autoQuality(now - last);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  keyMove();
  if (!panel && !title.open) update(dt);
  render();
  hud(dt);
}
async function boot() {
  gen(); bigWorld(); buildGrids(); resize();
  await loadArt();
  buildCanopy(); paintGround(); buildRoofs(); buildMini();
  applyState(loadSave() || freshS());
  addEventListener('resize', resize);
  showTitle();
  requestAnimationFrame(frame);
}
window.__zRender = render;
window.__bigTiles = () => map;
window.__zRM = { t: RMt, p: RMp, BIG: BIG };
window.__zBig = { aq: () => ({ can: CAN_SZ, lowered: AQ.lowered || 0, done: AQ.done }), gStat: gStat, cache: () => GCACHE.size, GMAX: GMAX, mini: () => [miniC.width, miniC.height], fogLen: () => fog.length, PW: () => PW, MH: () => MH, msgs: () => MSGS.map(m => m.t || m.text || m[0] || '') };
window.__z = { resetInput: resetInput, rc: { mk: { mkHuman, mkDog, mkBoar, mkSucker }, g3: () => ({ ready: G3_READY(), skin: P ? g3Skin(P) : null }), q5, q3c, gensetUse, pickUp, wolfRC1Opts, exitUse, benchOpts, sosFoeAI, muzzlePoint, actorPose, GFX, g7: { G3, portraitFor, itemIcon, G7, GAIT, RIGS, BODYFX, weaponLocal, localToWorld, g7Muzzle, rayWall, rayCircle, shotTrace, fire, rigActive, g7Fresh, g7Tick, qaRig, ballOff, WP, get tracers() { return tracers; }, get flashes() { return flashes; }, opq, T } }, seed: n => { Math.random = mulberry32(n); }, gfxSnap: () => ({ ANOM0, NPCDEF, DOGDEF, CACHES, HOUSES }), map: { LOC, LOCATIONS, ANOM0, objs, nav, MW, openBarrier, buildGrids, MAP_ID, MAP_VERSION, drawMapTo }, openLoot: openLoot, clearMsgs: () => { MSGS.length = 0; }, reveal: reveal, get WX() { return WX; }, cam: cam, openTrade: openTrade, openPanel: openPanel, refresh: refresh, PDA_TABS2: PDA_TABS2, dialog: dialog, cardOf: cardOf, save: save, loadSave: loadSave, loc: { LOCATIONS, locAnchors, locPt, MAP_VERSION }, plus: { simRest, restLabel, trackedTarget, restBlock, REST, freeTile, get SOS_SPOTS() { return SOS_SPOTS; }, jobCancel, finishEncounter, advanceWorldTime, restPreview, jobOpts, dynSnapshot, jobOffers, jobTake, jobTurnIn, jobReady, hireOpts, restAtFire, sosTick, mkSucker, traderOpts, wolfPlusOpts, qTargets, qList }, get art() { return !!ART; }, goThrough: goThrough, get S() { return S; }, get P() { return P; }, get ents() { return ents; }, IN: IN, update: update, interact: interact, talkTrader: talkTrader, applyState: applyState, freshS: freshS, hideTitle: hideTitle, get panel() { return panel; }, closePanel: closePanel, findPath: findPath, get near() { return G.near; } };
boot();
