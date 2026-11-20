/* ===================== окна этапа B: диалог, КПК, рюкзак, торговля =====================
   Отдельная разметка для каждого окна внутри общего оверлея. Графика панелей пока CSS;
   какие растровые части нужны — см. qa/ASSETS_MISSING.md. */

/* ---------- общие ---------- */
const condOf = id => (WP[id] && !WP[id].melee ? Math.round(S.cond[id] == null ? 80 : S.cond[id]) : null);
function itemCell(id, opt) {
  opt = opt || {};
  const c = el('button', 'icell' + (opt.sel ? ' sel' : '') + (opt.on ? ' on' : '') + (opt.dim ? ' dim' : ''));
  c.type = 'button';
  c.appendChild(itemIcon(id));
  if (opt.q > 1) c.appendChild(el('span', 'bd', String(opt.q)));
  if (opt.price != null) c.appendChild(el('span', 'pr', opt.price + ''));
  const cd = opt.cond != null ? opt.cond : null;
  if (cd != null) { const b = el('i', 'cnd' + (cd < 35 ? ' bad' : cd < 65 ? ' mid' : '')); b.style.width = cd + '%'; c.appendChild(b); }
  c.setAttribute('aria-label', (id === 'knife' ? 'Нож' : ITEMS[id].n) + (opt.q > 1 ? ', ' + opt.q + ' шт.' : '') + (opt.price != null ? ', ' + opt.price + ' RU' : ''));
  if (opt.why) { c.appendChild(el('span', 'why', opt.why)); c.title = opt.why; c.setAttribute('aria-label', c.getAttribute('aria-label') + ', ' + opt.why); }
  if (opt.fn) c.addEventListener('click', e => { e.stopPropagation(); opt.fn(); });
  if (opt.disabled) c.disabled = true;
  return c;
}
const itemName = id => id === 'knife' ? 'Нож' : ITEMS[id].n;
const itemW = id => id === 'knife' ? 0.3 : (ITEMS[id].w || 0);

/* ---------- диалог: компактный портрет + реплики + варианты ---------- */
function drawDialog2() {
  const box = el('div', 'dlg');
  const side = el('div', 'dlg-who');
  const c = panel.card;
  side.appendChild(portraitFor(c));
  side.appendChild(el('div', 'pn', c.n));
  side.appendChild(el('div', 'pm', [c.rank, c.grp].filter(Boolean).join(' · ')));
  if (c.att) side.appendChild(el('div', 'pa' + (/враг/.test(c.att) ? ' foe' : /друг|свой/.test(c.att) ? ' pal' : ''), c.att));
  if (c.money !== undefined) side.appendChild(el('div', 'price', c.money + ' RU'));
  box.appendChild(side);
  const main = el('div', 'dlg-main');
  const L = el('div', 'dlg-lines');
  panel.lines.slice(-5).forEach(l => L.appendChild(el('p', l.s, (l.s === 'npc' ? '— ' : l.s === 'me' ? '› ' : '') + l.t)));
  main.appendChild(L);
  const O = el('div', 'dlg-opts');
  panel.opts().forEach((o, i) => O.appendChild(btn((o.k || '') + ' opt', (i + 1) + '. ' + o.t, () => {
    if (o.close) { closePanel(); if (o.fn) o.fn(); return; }
    panel.lines.push({ s: 'me', t: o.t });
    o.fn();
    if (panel && (panel.kind === 'dialog' || panel.kind === 'trader')) { refresh(); const ln = pbody.querySelector('.dlg-lines'); if (ln) ln.scrollTop = ln.scrollHeight; }
  }, o.d)));
  main.appendChild(O);
  box.appendChild(main);
  pbody.appendChild(box);
}

/* ---------- КПК: карта ~65% + выбранное задание ~35%, вкладки снизу ---------- */
const PDA_TABS2 = [['map', 'Карта и задания'], ['log', 'Журнал'], ['stat', 'Данные']];
function drawPda2() {
  if (panel.tab !== 'map') { drawPda(); return; }
  if (!panel.f) panel.f = { ppl: 1, cache: 1, loc: 1 };
  const all = qList(), act = all.filter(q => q.st === 'a'), done = all.filter(q => q.st !== 'a');
  if (!panel.qsel || !all.some(q => q.id === panel.qsel)) panel.qsel = S.trackedQuestId || (act[0] && act[0].id) || null;
  const box = el('div', 'kpk');
  // карта: масштаб ×1…×4 от «вся карта влезает», по умолчанию ×2 вокруг игрока
  const mapc = el('div', 'kpk-map');
  if (panel.zl == null) { panel.zl = 2; panel.focus = 'me'; }
  const selT = qTargets().filter(t => t.qid === panel.qsel);
  const bar = el('div', 'kpk-bar');
  bar.appendChild(btn('chip zb', '−', () => { panel.zl = Math.max(1, panel.zl - 1); refresh(); }, panel.zl <= 1));
  bar.appendChild(el('span', 'zl', '×' + panel.zl));
  bar.appendChild(btn('chip zb', '+', () => { panel.zl = Math.min(4, panel.zl + 1); refresh(); }, panel.zl >= 4));
  bar.appendChild(btn('chip', 'К игроку', () => { panel.focus = 'me'; if (panel.zl < 2) panel.zl = 2; refresh(); }));
  bar.appendChild(btn('chip', 'К цели', () => { panel.focus = 'target'; if (panel.zl < 2) panel.zl = 2; refresh(); }, !selT.length));
  [['ppl', 'Люди'], ['cache', 'Тайники'], ['loc', 'Подписи']].forEach(f => bar.appendChild(btn('chip' + (panel.f[f[0]] ? ' on' : ''), f[1], () => { panel.f[f[0]] = !panel.f[f[0]]; refresh(); })));
  mapc.appendChild(bar); markScrollX(bar);
  const w = el('div', 'mapwrap kpk-wrap'), cv2 = el('canvas'); cv2.id = 'bigmap';
  w.appendChild(cv2); mapc.appendChild(w);
  const focusPt = () => {
    const p = panel.focus === 'target' && selT[0] ? selT[0] : P;
    return inBunker(p.x, p.y) ? HATCH : p;
  };
  requestAnimationFrame(() => {
    if (!cv2.isConnected) return;
    const fit = Math.min(w.clientWidth / PW, w.clientHeight / MH);      // ×1: вся карта влезает
    const cover = Math.max(w.clientWidth / PW, w.clientHeight / MH);    // заполняет панель целиком
    const k = panel.zl === 1 ? fit : Math.max(fit * panel.zl, cover * (1 + 0.45 * (panel.zl - 2)));
    const cssW = Math.round(PW * k), cssH = Math.round(MH * k);
    const dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.min(2600 / cssW, dpr);
    cv2.width = Math.round(cssW * px); cv2.height = Math.round(cssH * px);
    cv2.style.width = cssW + 'px'; cv2.style.height = cssH + 'px';
    const out = {};
    drawMapTo(cv2.getContext('2d'), cv2.width / PW, panel.f.loc, { ppl: panel.f.ppl, cache: panel.f.cache, sel: selT, u: px, out: out });
    panel.mapLabels = out.labels;
    const f = focusPt();
    w.scrollLeft = f.x / (PW * T) * cssW - w.clientWidth / 2; w.scrollTop = f.y / (MH * T) * cssH - w.clientHeight / 2;
  });
  mapc.appendChild(mapLegend());
  box.appendChild(mapc);
  // задания
  const qc = el('div', 'kpk-q');
  if (!all.length) qc.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
  const list = el('div', 'kpk-list');
  act.forEach(q => {
    const b = btn('qrow' + (q.id === panel.qsel ? ' sel' : '') + (q.id === S.trackedQuestId ? ' trk' : '') + (q.id === 'sos' ? ' sos' : ''), '', () => { panel.qsel = q.id; refresh(); });
    b.appendChild(el('span', 'qm', q.id === S.trackedQuestId ? '◆' : q.id === 'sos' ? '!' : '◇'));
    b.appendChild(el('span', 'qt', q.n));
    list.appendChild(b);
  });
  if (done.length) {
    const d = el('details', 'kpk-done'); d.appendChild(el('summary', '', 'Завершённые (' + done.length + ')'));
    done.forEach(q => d.appendChild(el('div', 'qdone' + (q.st === 'f' ? ' fail' : ''), q.n + (q.st === 'f' ? ' · провалено' : ' · выполнено'))));
    list.appendChild(d);
  }
  const q = all.find(x => x.id === panel.qsel);
  if (q) {
    const dt = el('div', 'kpk-detail');
    dt.appendChild(el('div', 'nm', q.n));
    const where = q.loc && LOC[q.loc] ? LOC[q.loc].name : '';
    const t = selT[0];
    if (where || t) dt.appendChild(el('div', 'ds lite', [where, t ? t.n + ' · ' + Math.round(dst(P.x, P.y, t.x, t.y) / T * 1.5) + ' м' : ''].filter(Boolean).join(' — ')));
    dt.appendChild(el('div', 'ds', q.d));
    if (q.st === 'a') dt.appendChild(btn(q.id === S.trackedQuestId ? 'go on' : 'go', q.id === S.trackedQuestId ? 'Отслеживается' : 'Отслеживать', () => { S.trackedQuestId = q.id; refresh(); }, q.id === S.trackedQuestId));
    qc.appendChild(dt);
  }
  qc.appendChild(list);
  box.appendChild(qc);
  pbody.appendChild(box);
}

/* ---------- рюкзак: снаряжение | сетка | описание со сравнением ---------- */
function drawInv2() {
  const box = el('div', 'inv3');
  // снаряжение
  const eq = el('div', 'inv-eq');
  { const who = el('div', 'tr-who'); who.appendChild(portraitFor(meCard())); const t = el('div'); t.appendChild(el('div', 'pn', 'Меченый')); t.appendChild(el('div', 'price', RANKS[rankOf(score())])); who.appendChild(t); eq.appendChild(who); }
  const slot = (label, id, onTap) => { const s = el('div', 'slot'); s.appendChild(el('span', 'sl', label)); s.appendChild(id ? itemCell(id, { on: 1, cond: condOf(id), sel: panel.sel === id, fn: () => { panel.sel = id; refresh(); } }) : el('div', 'icell empty')); return s; };
  eq.appendChild(slot('В руках', S.weapon));
  eq.appendChild(slot('Костюм', S.armor));
  const belt = el('div', 'slot beltslot'); belt.appendChild(el('span', 'sl', 'Пояс'));
  const br = el('div', 'beltrow');
  for (let i = 0; i < 3; i++) { const id = S.belt[i]; br.appendChild(id ? itemCell(id, { on: 1, sel: panel.sel === id, fn: () => { panel.sel = id; refresh(); } }) : el('div', 'icell empty')); }
  belt.appendChild(br); eq.appendChild(belt);
  const wt = weight(), st = el('div', 'inv-stats');
  const wb = el('div', 'wbar'); const wi = el('i'); wi.style.width = Math.min(100, wt / MAXW * 100) + '%'; if (wt > MAXW) wb.classList.add('over'); wb.appendChild(wi);
  st.appendChild(el('div', 'ds', 'Вес ' + wt + ' / ' + MAXW + ' кг')); st.appendChild(wb);
  st.appendChild(el('div', 'ds', 'Защита ' + Math.round(def() * 100) + '% · Радиация ' + Math.round(S.rad)));
  st.appendChild(el('div', 'ds', 'Сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '') + ' · ' + S.money + ' RU'));
  eq.appendChild(st);
  box.appendChild(eq);
  // сетка
  const gw = el('div', 'inv-grid');
  const ids = ['knife'].concat(Object.keys(S.inv).filter(id => ITEMS[id] && S.inv[id] > 0));
  const g = el('div', 'igrid');
  ids.forEach(id => g.appendChild(itemCell(id, { q: id === 'knife' ? 1 : cnt(id), cond: condOf(id), sel: panel.sel === id, on: S.weapon === id || S.armor === id || beltCount(id) > 0, fn: () => { panel.sel = id; panel.hint = ''; refresh(); } })));
  const pad = Math.max(0, 24 - ids.length); for (let i = 0; i < pad; i++) g.appendChild(el('div', 'icell empty'));
  gw.appendChild(g); box.appendChild(gw);
  // описание
  const dv = el('div', 'inv-detail');
  const id = panel.sel;
  if (!id || (id !== 'knife' && !has(id))) dv.appendChild(el('p', 'note', 'Выбери вещь. Артефакты вешаются на пояс, до трёх штук. Оружие в руках меняется по кругу кнопкой на HUD.'));
  else {
    const it = id === 'knife' ? { n: 'Нож', w: 0.3 } : ITEMS[id];
    dv.appendChild(el('div', 'nm', it.n + (cnt(id) > 1 ? ' ×' + cnt(id) : '')));
    const rows = el('div', 'cmp');
    const line = (k, v, d) => { const r = el('div', 'cr'); r.appendChild(el('span', 'ck', k)); r.appendChild(el('span', 'cv', v)); if (d) r.appendChild(el('span', 'cd ' + (d > 0 ? 'up' : 'dn'), (d > 0 ? '+' : '') + d)); rows.appendChild(r); };
    if (WP[id]) {
      const W = WP[id], C = WP[S.weapon], same = S.weapon === id;
      line('Урон', W.dmg + (W.pellets ? '×' + W.pellets : ''), same ? 0 : Math.round(W.dmg * (W.pellets || 1) - C.dmg * (C.pellets || 1)));
      if (!W.melee) { line('Магазин', W.mag, same || C.melee ? 0 : W.mag - C.mag); line('Дальность', W.range, same || C.melee ? 0 : W.range - C.range); line('Состояние', condOf(id) + '%'); }
      if (!same) rows.appendChild(el('div', 'ds lite', 'Сравнение с тем, что в руках: ' + itemName(S.weapon)));
    } else if (it.armor) {
      const cur = ITEMS[S.armor] ? ITEMS[S.armor].armor : 0;
      line('Защита', Math.round(it.armor * 100) + '%', S.armor === id ? 0 : Math.round((it.armor - cur) * 100));
    }
    if (FOOD[id]) line('Сытость', '+' + FOOD[id]);
    if (it.heal) line('Лечение', '+' + it.heal);
    if (ARTFX[id]) rows.appendChild(el('div', 'ds', ARTFX[id]));
    line('Вес', (Math.round(itemW(id) * Math.max(1, cnt(id)) * 100) / 100) + ' кг');
    dv.appendChild(rows);
    if (it.d) dv.appendChild(el('div', 'ds lite', it.d));
    const row = el('div', 'btnrow');
    if (WP[id] && S.weapon !== id) row.appendChild(btn('go', 'Взять в руки', () => { setWeapon(id); refresh(); }));
    if (it.armor && S.armor !== id) row.appendChild(btn('go', 'Надеть', () => { S.armor = id; refresh(); }));
    if (it.heal !== undefined || it.rad !== undefined || FOOD[id]) row.appendChild(btn('go', FOOD[id] ? 'Съесть' : 'Применить', () => { useItem(id); refresh(); }));
    if (ARTFX[id]) row.appendChild(btn('go', beltCount(id) ? 'Снять с пояса' : 'На пояс', () => {
      if (beltCount(id)) S.belt.splice(S.belt.indexOf(id), 1);
      else if (S.belt.length >= 3) panel.hint = 'Пояс занят: сначала сними другой артефакт.';
      else S.belt.push(id);
      refresh();
    }));
    if (id !== 'knife' && !it.quest && S.armor !== id && S.weapon !== id) row.appendChild(btn('wide', 'Выбросить', () => {
      const q = cnt(id); take(id, q); S.belt = S.belt.filter(b => b !== id);
      const wc = condOf(id); objs.push({ k: 'body', kind: 'sack', x: P.x + rnd(-6, 6), y: P.y + 12, ang: 0, fac: 'loner', name: 'Рюкзак', seed: 1, loot: { [id]: q }, wcond: wc != null ? { [id]: wc } : null, t: S.min });
      if (WP[id]) { delete S.cond[id]; delete S.mag[id]; }
      panel.sel = null; refresh();
    }));
    dv.appendChild(row);
  }
  box.appendChild(dv);
  pbody.appendChild(box);
  markScroll([gw, dv, eq]);
}

/* ---------- торговля: две сетки + корзина обмена + итог + подтверждение ----------
   выбор кладёт вещь в предложение, ничего не списывается до «Подтвердить». Закрытие окна отменяет предложение. */
/* состояние оружия у продавца задано заранее и видно до сделки: у Сидоровича новое (100%), у сталкера — своё, 55–85% */
const TRADER_WCOND = 100;
function stockCond(e, id) {
  if (!WP[id] || WP[id].melee) return null;
  if (!e) return TRADER_WCOND;
  e.wcond = e.wcond || {}; if (e.wcond[id] == null) e.wcond[id] = ri(55, 85); return e.wcond[id];
}
function tradeStock(e) {
  const one = id => (ITEMS[id].weapon || ITEMS[id].armor) && has(id);   // один ствол/костюм каждого типа: экземпляры не объединяются
  if (e) return Object.keys(e.inv).filter(id => e.inv[id] > 0).map(id => ({ id: id, q: 1, p: Math.ceil(ITEMS[id].price * (S.rep >= 20 ? 1.1 : 1.3)), c: one(id) ? 0 : e.inv[id], cond: stockCond(e, id) }));
  return STOCK.map(s => Object.assign({ c: (ITEMS[s.id].weapon || ITEMS[s.id].armor) ? (has(s.id) ? 0 : 1) : 99, cond: stockCond(null, s.id) }, s));
}
function sellUnit(id) { return ITEMS[id].ammo ? Math.min(10, cnt(id)) : 1; }
function tradePrice(id, e) { const c = condOf(id); return Math.max(1, Math.floor(sellPrice(id, !!e) * (c != null ? Math.max(0.3, c / 100) : 1))); }
/* почему вещь нельзя продать сейчас — короткий знак на ячейке вместо затемнения до черноты */
function sellWhy(id, e, o) {
  const it = ITEMS[id]; if (!it) return null;
  if (it.quest) return 'квест';
  if (o && o.sell[id]) return 'в корз.';
  if (id === S.weapon && WP[id] && !WP[id].melee) return 'в руках';
  if (id === S.armor) return 'надето';
  if (beltCount(id)) return 'пояс';
  if (e && (it.weapon || it.armor)) return 'не берёт';
  return null;
}
function sellable(id, e) {
  const it = ITEMS[id]; if (!it || it.quest || !(S.inv[id] > 0)) return 0;
  if (e && (it.weapon || it.armor)) return 0;
  let n = cnt(id) - beltCount(id);
  if (id === S.armor) n -= 1;
  if (id === S.weapon && WP[id] && !WP[id].melee && cnt(id) <= 1) n -= 1;
  return Math.max(0, n);
}
function offerSum(e) {
  const o = panel.offer, st = tradeStock(e);
  let buy = 0, sell = 0, w = 0;
  Object.entries(o.buy).forEach(([id, n]) => { const s = st.find(x => x.id === id); if (s) { buy += s.p * n; w += itemW(id) * s.q * n; } });
  Object.entries(o.sell).forEach(([id, n]) => { const u = ITEMS[id].ammo ? 10 : 1; sell += tradePrice(id, e) * Math.min(n * u, cnt(id)); w -= itemW(id) * Math.min(n * u, cnt(id)); });
  return { buy: buy, sell: sell, net: sell - buy, wAfter: Math.round((weight() + w) * 10) / 10 };
}
function tradeCheck(e) {
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  if (!Object.keys(o.buy).length && !Object.keys(o.sell).length) return 'Предложение пустое.';
  for (const [id, n] of Object.entries(o.buy)) { const s = st.find(x => x.id === id); if (!s || s.c < n) return 'У торговца нет столько: ' + itemName(id) + '.'; }
  for (const [id, n] of Object.entries(o.sell)) {
    const u = ITEMS[id].ammo ? 10 : 1; if (sellable(id, e) >= Math.min(n * u, cnt(id)) && cnt(id) > 0) continue;
    if (cnt(id) <= 0) return 'У тебя больше нет: ' + itemName(id) + '.';
    if (id === S.weapon) return itemName(id) + ' в руках: сначала возьми другое оружие.';
    if (id === S.armor) return itemName(id) + ' надет: сначала сними.';
    if (beltCount(id)) return itemName(id) + ' на поясе: сначала сними.';
    return 'Это нельзя продать: ' + itemName(id) + '.';
  }
  if (sm.net < 0 && S.money < -sm.net) return 'Не хватает ' + (-sm.net - S.money) + ' RU.';
  if (sm.net > 0 && e && e.money < sm.net) return 'У него не хватает денег: есть ' + e.money + ' RU.';
  if (sm.wAfter > MAXW * 1.6) return 'Столько не унести: будет ' + sm.wAfter + ' кг.';
  return '';
}
function tradeDo(e) {
  const err = tradeCheck(e); if (err) { panel.hint = err; refresh(); return; }
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  Object.entries(o.sell).forEach(([id, n]) => {
    const u = ITEMS[id].ammo ? 10 : 1, q = Math.min(n * u, cnt(id)), c = condOf(id);
    take(id, q); if (e) { e.inv[id] = (e.inv[id] || 0) + q; if (c != null) { e.wcond = e.wcond || {}; e.wcond[id] = c; } }
    if (WP[id] && !cnt(id)) { delete S.cond[id]; delete S.mag[id]; }      // проданный ствол уносит своё состояние и патроны в магазине
  });
  Object.entries(o.buy).forEach(([id, n]) => {
    const s = st.find(x => x.id === id); give(id, s.q * n);
    if (WP[id] && !WP[id].melee) { S.cond[id] = s.cond; S.mag[id] = 0; }  // купленный ствол: состояние продавца, магазин пустой
    if (e) { e.inv[id] -= n; if (e.inv[id] <= 0) { delete e.inv[id]; if (e.wcond) delete e.wcond[id]; } }
  });
  S.money += sm.net; if (e) e.money -= sm.net; if (e) e.traded = 1;   // инвентарь и деньги этого NPC теперь сохраняются
  panel.offer = { buy: {}, sell: {} }; play('pick');
  panel.hint = 'Сделка закрыта: ' + (sm.net >= 0 ? 'получено ' + sm.net : 'доплачено ' + (-sm.net)) + ' RU.' + (sm.wAfter > MAXW ? ' Перегруз: ' + sm.wAfter + ' кг.' : '');
  refresh();
}
function drawTrade2() {
  const e = panel.e;
  if (!panel.offer) panel.offer = { buy: {}, sell: {} };
  if (!panel.side) panel.side = 'their';
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  const box = el('div', 'trade2' + (panel.side === 'mine' ? ' show-mine' : ' show-their'));
  // шапка: портреты и переключатель для узкого экрана
  const head = el('div', 'tr-head');
  const me = el('div', 'tr-who'); me.appendChild(portraitFor(meCard())); const mt = el('div'); mt.appendChild(el('div', 'pn', 'Меченый')); mt.appendChild(el('div', 'price', S.money + ' RU')); me.appendChild(mt); head.appendChild(me);
  const sw = el('div', 'tr-switch');
  sw.appendChild(btn('chip' + (panel.side === 'mine' ? ' on' : ''), 'Мои вещи', () => { panel.side = 'mine'; refresh(); }));
  sw.appendChild(btn('chip' + (panel.side === 'their' ? ' on' : ''), 'Торговец', () => { panel.side = 'their'; refresh(); }));
  head.appendChild(sw);
  const th = el('div', 'tr-who r'); const c = e ? cardOf(e) : SIDCARD(); const tt = el('div'); tt.appendChild(el('div', 'pn', c.n)); tt.appendChild(el('div', 'price', e ? e.money + ' RU' : 'касса без дна')); th.appendChild(tt); th.appendChild(portraitFor(c)); head.appendChild(th);
  box.appendChild(head);
  // мои вещи
  const mine = el('div', 'tr-col mine'); mine.appendChild(el('h3', 'h3', 'Мои вещи · продать'));
  const gm = el('div', 'igrid');
  Object.keys(S.inv).filter(id => ITEMS[id] && S.inv[id] > 0).forEach(id => {
    const left = sellable(id, e) - (o.sell[id] || 0) * (ITEMS[id].ammo ? 10 : 1);
    gm.appendChild(itemCell(id, { q: cnt(id), cond: condOf(id), price: sellable(id, e) ? tradePrice(id, e) * sellUnit(id) : null, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : sellWhy(id, e, o),
      fn: () => { o.sell[id] = (o.sell[id] || 0) + 1; panel.hint = ''; refresh(); } }));
  });
  mine.appendChild(gm);
  // товар торговца
  const their = el('div', 'tr-col their'); their.appendChild(el('h3', 'h3', 'Товар · купить'));
  const gt = el('div', 'igrid');
  if (!st.length) their.appendChild(el('p', 'note', 'Ему нечего продать.'));
  st.forEach(s => { const left = s.c - (o.buy[s.id] || 0); gt.appendChild(itemCell(s.id, { q: s.q > 1 ? s.q : (e ? s.c : 0), price: s.p, cond: s.cond, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : (o.buy[s.id] ? 'в корз.' : has(s.id) ? 'есть' : 'нет'), fn: () => { o.buy[s.id] = (o.buy[s.id] || 0) + 1; panel.hint = ''; refresh(); } })); });
  their.appendChild(gt);
  // корзина
  const cart = el('div', 'tr-cart');
  const lineFor = (side, id, n) => {
    const s = side === 'buy' ? st.find(x => x.id === id) : null;
    const q = side === 'buy' ? s.q * n : Math.min(n * (ITEMS[id].ammo ? 10 : 1), cnt(id));
    const p = side === 'buy' ? s.p * n : tradePrice(id, e) * q;
    const b = btn('cline ' + side, '', () => { o[side][id]--; if (o[side][id] <= 0) delete o[side][id]; refresh(); });
    const cd = side === 'buy' ? s.cond : condOf(id);
    b.appendChild(itemIcon(id)); b.appendChild(el('span', 'cn', itemName(id) + (q > 1 ? ' ×' + q : '') + (cd != null ? ' · ' + cd + '%' : ''))); b.appendChild(el('span', 'cp', (side === 'buy' ? '−' : '+') + p)); b.setAttribute('aria-label', 'Убрать из сделки: ' + itemName(id));
    return b;
  };
  const cs = el('div', 'cside'); cs.appendChild(el('div', 'ch', 'Отдаю')); Object.entries(o.sell).forEach(([id, n]) => cs.appendChild(lineFor('sell', id, n))); if (!Object.keys(o.sell).length) cs.appendChild(el('div', 'ce', '—'));
  const cb = el('div', 'cside'); cb.appendChild(el('div', 'ch', 'Беру')); Object.entries(o.buy).forEach(([id, n]) => cb.appendChild(lineFor('buy', id, n))); if (!Object.keys(o.buy).length) cb.appendChild(el('div', 'ce', '—'));
  const cl = el('div', 'clines'); cl.appendChild(cs); cl.appendChild(cb); cart.appendChild(cl);
  const tot = el('div', 'tr-total');
  const err = tradeCheck(e);
  tot.appendChild(el('div', 'tsum', 'Отдаю ' + sm.sell + ' · беру ' + sm.buy));
  tot.appendChild(el('div', 'tnet ' + (sm.net >= 0 ? 'plus' : 'minus'), sm.net >= 0 ? 'Тебе доплатят: ' + sm.net + ' RU' : 'Доплата: ' + (-sm.net) + ' RU'));
  tot.appendChild(el('div', 'twt' + (sm.wAfter > MAXW ? ' over' : ''), 'Вес после: ' + sm.wAfter + ' / ' + MAXW + ' кг'));
  const acts = el('div', 'tr-acts');
  acts.appendChild(btn('chip', 'Сбросить', () => { panel.offer = { buy: {}, sell: {} }; panel.hint = ''; refresh(); }, !Object.keys(o.buy).length && !Object.keys(o.sell).length));
  acts.appendChild(btn('go deal', 'Подтвердить', () => tradeDo(e), !!err));
  tot.appendChild(acts);
  if (err && (Object.keys(o.buy).length || Object.keys(o.sell).length)) tot.appendChild(el('div', 'terr', err));
  cart.appendChild(tot);
  box.appendChild(mine); box.appendChild(cart); box.appendChild(their);
  pbody.appendChild(box);
  markScroll([mine, their, box.querySelector('.clines')]);
}

/* горизонтальная строка фильтров: «▶» у правого края, пока есть что прокрутить */
function markScrollX(n) {
  requestAnimationFrame(() => { if (!n.isConnected) return; n.classList.add('scrollcue-x');
    const upd = () => n.classList.toggle('more-x', n.scrollWidth - n.clientWidth - n.scrollLeft > 6);
    upd(); n.addEventListener('scroll', upd, { passive: true }); });
}
/* подсказка «▼ ещё», если содержимое прокручивается; снимается, когда долистали до конца */
function markScroll(list) {
  requestAnimationFrame(() => list.forEach(n => {
    if (!n) return; n.classList.add('scrollcue');
    const upd = () => n.classList.toggle('more', n.scrollHeight - n.clientHeight - n.scrollTop > 6);
    upd(); n.addEventListener('scroll', upd, { passive: true });
  }));
}
