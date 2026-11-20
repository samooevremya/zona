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
  if (opt.price != null || opt.dim != null) c.appendChild(el('span','trade-label',itemName(id)));
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
  if (!c.record) side.appendChild(portraitFor(c));
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
  eq.appendChild(el('h3','pack-heading','Снаряжение'));
  const rack = el('div','gear-rack');
  const slot = (label,id) => {
    const field = el('div','gear-slot');
    field.appendChild(el('span','sl',label));
    if (id) {
      const cell = itemCell(id,{cond:condOf(id),on:id===S.weapon,sel:panel.sel===id && !panel.copy,
        fn:()=>{panel.sel=id;panel.copy=0;refresh();}});
      cell.title=itemName(id); field.appendChild(cell);
    } else field.appendChild(el('span','gear-empty','—'));
    return field;
  };
  rack.appendChild(slot('Костюм',S.armor)); rack.appendChild(slot('Нож','knife'));
  for (const [key,label] of Object.entries(KIT_LABELS)) rack.appendChild(slot(label,kitItem(key)));
  eq.appendChild(rack);
  const belt = el('div', 'slot beltslot'); belt.appendChild(el('span', 'sl', 'Пояс'));
  const br = el('div', 'beltrow');
  for (let i = 0; i < 3; i++) { const id = S.belt[i]; br.appendChild(id ? itemCell(id, { on: 1, sel: panel.sel === id, fn: () => { panel.sel = id; panel.copy=0; refresh(); } }) : el('div', 'icell empty')); }
  belt.appendChild(br); eq.appendChild(belt);
  const wt = weight(), st = el('div', 'inv-stats');
  const wb = el('div', 'wbar'); const wi = el('i'); wi.style.width = Math.min(100, wt / carryLimit() * 100) + '%'; if (wt > carryLimit()) wb.classList.add('over'); wb.appendChild(wi);
  st.appendChild(el('div', 'ds', 'Вес ' + showKg(wt) + ' / ' + carryLimit() + ' кг')); st.appendChild(wb);
  st.appendChild(el('div','ds','Пустой рюкзак · '+showKg(PACK_KG)+' кг'));
  st.appendChild(el('div', 'ds', 'Защита ' + Math.round(def() * 100) + '% · Радиация ' + Math.round(S.rad)));
  st.appendChild(el('div', 'ds', 'Сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '') + ' · ' + S.money + ' RU'));
  eq.appendChild(st);
  box.appendChild(eq);
  // сетка
  const gw = el('div', 'inv-grid');
  const ids = Object.keys(S.inv).filter(id => ITEMS[id] && cnt(id) > wornCount(id));
  const used=packCells(S.inv);
  gw.appendChild(el('h3','pack-heading','Рюкзак · '+used+' / '+PACK_CELLS+' ячеек · '+showKg(wt)+' / '+carryLimit()+' кг'));
  const g = el('div', 'igrid pack-grid');
  for (const id of ids) {
    const count=cnt(id), stack=stackLimit(id);
    for(let start=wornCount(id);start<count;start+=stack) {
      const selected=panel.sel===id && (panel.copy || 0)===start;
      const cd=isGun(id)?Math.round(gunCopy(id,start).cond):null;
      const cell=itemCell(id,{q:Math.min(count-start,stack),cond:cd,sel:selected,
        fn:()=>{panel.sel=id; panel.copy=start; panel.hint=''; refresh();}});
      cell.dataset.item=id;
      const [w,h]=footprint(id);
      cell.style.gridColumn='span '+w; cell.style.gridRow='span '+h;
      cell.title=itemName(id)+(cd==null?'':' · '+cd+'%');
      g.appendChild(cell);
    }
  }
  for (let i=used;i<PACK_CELLS;i++) g.appendChild(el('div','icell empty'));
  gw.appendChild(g); box.appendChild(gw);
  // описание
  const dv = el('div', 'inv-detail');
  const id = panel.sel, copy=Math.min(panel.copy || 0,Math.max(0,cnt(id)-1));
  if (!id || (id !== 'knife' && !has(id))) dv.appendChild(el('p', 'note', 'Выбери вещь в рюкзаке и нажми «В слот». В игре касание панели оружия перебирает снаряжение.'));
  else {
    const it = id === 'knife' ? { n: 'Нож', w: 0.3 } : ITEMS[id];
    dv.appendChild(el('div', 'nm', it.n + (isGun(id) && cnt(id)>1?' · '+(copy+1)+' из '+cnt(id):'')));
    const rows = el('div', 'cmp');
    const line = (k, v, d) => { const r = el('div', 'cr'); r.appendChild(el('span', 'ck', k)); r.appendChild(el('span', 'cv', v)); if (d) r.appendChild(el('span', 'cd ' + (d > 0 ? 'up' : 'dn'), (d > 0 ? '+' : '') + d)); rows.appendChild(r); };
    if (DETECTORS[id]) line('Радиус поиска', it.metres + ' м');
    else if (WP[id]) {
      const W = WP[id], C = WP[S.weapon], same = S.weapon === id && !copy;
      line('Урон', W.dmg + (W.pellets ? '×' + W.pellets : ''), same || !C ? 0 : Math.round(W.dmg * (W.pellets || 1) - C.dmg * (C.pellets || 1)));
      if (isGun(id)) { line('Магазин', gunCopy(id,copy).mag+' / '+W.mag, same || !C || C.melee ? 0 : W.mag - C.mag); line('Дальность', W.range, same || !C || C.melee ? 0 : W.range - C.range); line('Состояние', Math.round(gunCopy(id,copy).cond)+'%'); }
      if (!same && C) rows.appendChild(el('div', 'ds lite', 'Сравнение с тем, что в руках: ' + itemName(S.weapon)));
    } else if (it.armor) {
      line('Предел веса',carryLimit(id)+' кг');
      const cur = ITEMS[S.armor] ? ITEMS[S.armor].armor : 0;
      line('Защита', Math.round(it.armor * 100) + '%', S.armor === id ? 0 : Math.round((it.armor - cur) * 100));
    }
    if (FOOD[id]) line('Сытость', '+' + FOOD[id]);
    if (it.heal) line('Лечение', '+' + it.heal);
    if (ARTFX[id]) rows.appendChild(el('div', 'ds', ARTFX[id]));
    line('Вес предмета', showKg(itemW(id)+(isGun(id)?loadedMass(id,gunCopy(id,copy)):0))+' кг');
    line('Размер',footprint(id).join(' × '));
    dv.appendChild(rows);
    if (it.d) dv.appendChild(el('div', 'ds lite', it.d));
    const row = el('div', 'btnrow');
    const slotKey=kitSlot(id), mounted=slotKey && kitItem(slotKey)===id && !copy;
    if (slotKey && !mounted) row.appendChild(btn('go','В слот',()=>{
      mountGear(id,copy,false); panel.copy=0; refresh();
    }));
    if ((WP[id] || DETECTORS[id]) && (S.weapon !== id || copy)) row.appendChild(btn('go','Взять в руки',()=>{
      if (slotKey) mountGear(id,copy,true); else setWeapon(id);
      panel.copy=0; refresh();
    }));
    if (mounted) row.appendChild(btn('wide','В рюкзак',()=>{
      if (packCells(S.inv,id)>PACK_CELLS) panel.hint='Освободи место в рюкзаке.';
      else stowGear(id);
      refresh();
    }));
    if (it.armor && S.armor !== id) row.appendChild(btn('go', 'Надеть', () => { if(weight()>carryLimit(id)) panel.hint='Сначала снизь вес до '+carryLimit(id)+' кг.'; else S.armor=id; refresh(); }));
    if (id==='energy' || it.heal !== undefined || it.rad !== undefined || FOOD[id]) row.appendChild(btn('go', id==='energy' ? 'Выпить' : FOOD[id] ? 'Съесть' : 'Применить', () => { useItem(id); refresh(); }));
    if (ARTFX[id]) row.appendChild(btn('go', beltCount(id) ? 'Снять с пояса' : 'На пояс', () => {
      if (beltCount(id)) {
        if (packCells(S.inv,id)>PACK_CELLS) panel.hint='Освободи место в рюкзаке.';
        else S.belt.splice(S.belt.indexOf(id),1);
      }
      else if (S.belt.length >= 3) panel.hint = 'Пояс занят: сначала сними другой артефакт.';
      else S.belt.push(id);
      refresh();
    }));
    if (id !== 'knife' && !it.quest && copy>=wornCount(id) && cnt(id)>wornCount(id)) row.appendChild(btn('wide','Выбросить',()=>{
      const q=isGun(id)||it.armor?1:Math.min(stackLimit(id),cnt(id)-wornCount(id));
      const gun=removePacked(id,q,copy);
      const sack={k:'body',kind:'sack',x:P.x,y:P.y,ang:0,fac:'loner',name:'Рюкзак',seed:1,loot:{},t:S.min,scatterStart:performance.now()};
      putStock(sack,id,q,gun); objs.push(sack); groundItems(sack);
      panel.sel=null; panel.copy=0; refresh();
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
  if (e) return Object.keys(e.inv).filter(id => ITEMS[id] && e.inv[id]>0).map(id => ({
    id,q:1,p:Math.ceil((ITEMS[id].price ?? ITEMS[id].sell ?? 1)*(S.rep>=20?1.1:1.3)),c:e.inv[id],cond:isGun(id)?vendorGun(e,id,0).cond:null
  }));
  return STOCK.map(s=>({...s,c:99,cond:isGun(s.id)?TRADER_WCOND:null}));

}
function sellUnit(id) { return ITEMS[id].ammo ? Math.min(10, cnt(id)) : 1; }
function vendorGun(e,id,offset) {
  return e?.guns?.[id]?.at(-1-offset) || {cond:stockCond(e,id),mag:0};
}
function tradePrice(id,e,offset=0) {
  const c=isGun(id)?gunCopy(id,Math.max(0,cnt(id)-1-offset)).cond:null;
  return Math.max(1,Math.floor(sellPrice(id,!!e)*(c==null?1:Math.max(.3,c/100))));
}
function saleTotal(id,q,e) {
  if (!isGun(id)) return tradePrice(id,e)*q;
  let sum=0; for(let i=0;i<q;i++) sum+=tradePrice(id,e,i);
  return sum;
}
/* почему вещь нельзя продать сейчас — короткий знак на ячейке вместо затемнения до черноты */
function sellWhy(id, e, o) {
  const it = ITEMS[id]; if (!it) return null;
  if (it.quest) return 'квест';
  if (o && o.sell[id]) return 'в корз.';
  if (kitSlot(id) && kitItem(kitSlot(id))===id) return id===S.weapon?'в руках':'в слоте';
  if (id === S.armor) return 'надето';
  if (beltCount(id)) return 'пояс';
  if (e && it.armor) return 'не берёт';
  return null;
}
function sellable(id, e) {
  const it = ITEMS[id]; if (!it || it.quest || !(S.inv[id] > 0)) return 0;
  if (e && it.armor) return 0;
  return Math.max(0,cnt(id)-wornCount(id));
}
function offerSum(e) {
  const o = panel.offer, st = tradeStock(e);
  let buy=0,sell=0,kg=weight();
  const inv={...S.inv};
  for(const [id,n] of Object.entries(o.sell)) {
    const q=Math.min(n*(ITEMS[id].ammo?10:1),cnt(id));
    sell+=saleTotal(id,q,e); inv[id]=cnt(id)-q; kg-=itemW(id)*q;
    if(isGun(id)) for(let i=0;i<q;i++) kg-=loadedMass(id,gunCopy(id,cnt(id)-1-i));
  }
  for(const [id,n] of Object.entries(o.buy)) {
    const s=st.find(x=>x.id===id); if(!s) continue;
    const q=s.q*n; buy+=s.p*n; inv[id]=(inv[id] || 0)+q; kg+=itemW(id)*q;
    if(isGun(id)) for(let i=0;i<n;i++) kg+=loadedMass(id,vendorGun(e,id,i));
  }
  return {buy,sell,net:sell-buy,wAfter:Math.round(kg*1000)/1000,cells:packCells(inv,null,incomingKit(Object.keys(o.buy)))};

}
function tradeCheck(e) {
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  if (!Object.keys(o.buy).length && !Object.keys(o.sell).length) return 'Предложение пустое.';
  for (const [id, n] of Object.entries(o.buy)) { const s = st.find(x => x.id === id); if (!s || s.c < n) return 'У торговца нет столько: ' + itemName(id) + '.'; }
  for (const [id, n] of Object.entries(o.sell)) {
    const u = ITEMS[id].ammo ? 10 : 1; if (n <= Math.ceil(sellable(id,e)/u)) continue;
    if (cnt(id) <= 0) return 'У тебя больше нет: ' + itemName(id) + '.';
    if (id === S.weapon) return itemName(id) + ' в руках: сначала возьми другое оружие.';
    if (kitSlot(id) && kitItem(kitSlot(id))===id) return 'Сначала убери '+itemName(id)+' в рюкзак.';
    if (id === S.armor) return itemName(id) + ' надет: сначала сними.';
    if (beltCount(id)) return itemName(id) + ' на поясе: сначала сними.';
    return 'Это нельзя продать: ' + itemName(id) + '.';
  }
  if (sm.net < 0 && S.money < -sm.net) return 'Не хватает ' + (-sm.net - S.money) + ' RU.';
  if (sm.net > 0 && e && e.money < sm.net) return 'У него не хватает денег: есть ' + e.money + ' RU.';
  if (Object.keys(o.buy).length) return capacityError(sm.wAfter,sm.cells);
  return '';
}
function tradeDo(e) {
  const err = tradeCheck(e); if (err) { panel.hint = err; refresh(); return; }
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  // Забираем оплаченный товар из прежнего запаса до пополнения товарами игрока.
  const incoming={loot:{},guns:{}};
  for(const [id,n] of Object.entries(o.buy)) {
    const q=st.find(s=>s.id===id).q*n;
    if(isGun(id)) for(let i=0;i<q;i++) {
      putStock(incoming,id,1,vendorGun(e,id,0)); e?.guns?.[id]?.pop();
    } else putStock(incoming,id,q);
    if(e) { e.inv[id]-=q; if(!e.inv[id]) delete e.inv[id]; }
  }
  for(const [id,n] of Object.entries(o.sell)) {
    const q=Math.min(n*(ITEMS[id].ammo?10:1),cnt(id));
    if (isGun(id)) for(let i=0;i<q;i++) {
      const gun=removePacked(id);
      if(e) ((e.guns ||= {})[id] ||= []).push(gun);
    } else take(id,q);
    if(e) e.inv[id]=(e.inv[id] || 0)+q;
  }
  for(const [id,q] of Object.entries(incoming.loot)) {
    if (isGun(id)) for(const gun of incoming.guns[id]) addPacked(id,1,gun);
    else addPacked(id,q);
  }
  S.money += sm.net; if (e) e.money -= sm.net; if (e) e.traded = 1;   // инвентарь и деньги этого NPC теперь сохраняются
  panel.offer = { buy: {}, sell: {} }; play('pick');
  panel.hint = 'Сделка закрыта: ' + (sm.net >= 0 ? 'получено ' + sm.net : 'доплачено ' + (-sm.net)) + ' RU.';
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
  const me = el('div', 'tr-who'); me.appendChild(portraitFor(meCard())); const mt = el('div'); mt.appendChild(el('div', 'pn', 'Меченый')); mt.appendChild(el('div', 'price', S.money + ' RU')); me.appendChild(mt);
  const sw = el('div', 'tr-switch');
  sw.appendChild(btn('chip' + (panel.side === 'mine' ? ' on' : ''), 'Мои вещи', () => { panel.side = 'mine'; refresh(); }));
  sw.appendChild(btn('chip' + (panel.side === 'their' ? ' on' : ''), 'Торговец', () => { panel.side = 'their'; refresh(); }));
  head.appendChild(sw);
  const th = el('div', 'tr-who r'); const c = e ? cardOf(e) : SIDCARD(); const tt = el('div'); tt.appendChild(el('div', 'pn', c.n)); tt.appendChild(el('div', 'price', e ? e.money + ' RU' : 'Торговец')); th.appendChild(tt); th.appendChild(portraitFor(c));
  box.appendChild(head);
  // мои вещи
  const mine = el('div', 'tr-col mine'); mine.appendChild(me); mine.appendChild(el('h3', 'h3', 'Мой рюкзак · продажа'));
  const gm = el('div', 'igrid');
  Object.keys(S.inv).filter(id => ITEMS[id] && S.inv[id] > 0).forEach(id => {
    const left = sellable(id, e) - (o.sell[id] || 0) * (ITEMS[id].ammo ? 10 : 1);
    gm.appendChild(itemCell(id, { q: cnt(id), cond: isGun(id)?Math.round(gunCopy(id,Math.max(0,cnt(id)-1-(o.sell[id] || 0))).cond):null, price: sellable(id, e) ? tradePrice(id, e,o.sell[id] || 0) * sellUnit(id) : null, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : sellWhy(id, e, o),
      fn: () => { o.sell[id] = (o.sell[id] || 0) + 1; panel.hint = ''; refresh(); } }));
  });
  mine.appendChild(gm);
  // товар торговца
  const their = el('div', 'tr-col their'); their.appendChild(th); their.appendChild(el('h3', 'h3', 'Товары · покупка'));
  const gt = el('div', 'igrid');
  if (!st.length) their.appendChild(el('p', 'note', 'Ему нечего продать.'));
  st.forEach(s => { const left = s.c - (o.buy[s.id] || 0); gt.appendChild(itemCell(s.id, { q: s.q > 1 ? s.q : (e ? s.c : 0), price: s.p, cond: s.cond, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : (o.buy[s.id] ? 'в корз.' : has(s.id) ? 'есть' : 'нет'), fn: () => { o.buy[s.id] = (o.buy[s.id] || 0) + 1; panel.hint = ''; refresh(); } })); });
  their.appendChild(gt);
  // корзина
  const cart = el('div', 'tr-cart');
  const lineFor = (side, id, n) => {
    const s = side === 'buy' ? st.find(x => x.id === id) : null;
    const q = side === 'buy' ? (s?.q || 1) * n : Math.min(n * (ITEMS[id].ammo ? 10 : 1), cnt(id));
    const p = side === 'buy' ? (s?.p || 0) * n : saleTotal(id,q,e);
    const b = btn('cline ' + side, '', () => { o[side][id]--; if (o[side][id] <= 0) delete o[side][id]; refresh(); });
    const cd = side === 'buy' ? s?.cond : (isGun(id)&&n===1?Math.round(gunCopy(id,cnt(id)-1).cond):null);
    b.appendChild(itemIcon(id)); b.appendChild(el('span', 'cn', itemName(id) + (q > 1 ? ' ×' + q : '') + (cd != null ? ' · ' + cd + '%' : ''))); b.appendChild(el('span', 'cp', (side === 'buy' ? '−' : '+') + p)); b.setAttribute('aria-label', 'Убрать из сделки: ' + itemName(id));
    return b;
  };
  const cs = el('div', 'cside'); cs.appendChild(el('div', 'ch', 'Отдаю')); Object.entries(o.sell).forEach(([id, n]) => cs.appendChild(lineFor('sell', id, n))); if (!Object.keys(o.sell).length) cs.appendChild(el('div', 'ce', '—'));
  const cb = el('div', 'cside'); cb.appendChild(el('div', 'ch', 'Беру')); Object.entries(o.buy).forEach(([id, n]) => cb.appendChild(lineFor('buy', id, n))); if (!Object.keys(o.buy).length) cb.appendChild(el('div', 'ce', '—'));
  const cl = el('div', 'clines'); cl.appendChild(cs); cl.appendChild(cb); cart.appendChild(cl);
  const tot = el('div', 'tr-total');
  const err = tradeCheck(e);
  tot.appendChild(el('div', 'tsum', 'Отдаю ' + sm.sell + ' · беру ' + sm.buy));
  tot.appendChild(el('div', 'tnet ' + (sm.net >= 0 ? 'plus' : 'minus'), sm.net===0?(sm.buy||sm.sell?'Равный обмен':'Сделка не выбрана'):sm.net>0?'К получению: '+sm.net+' RU':'Доплата: '+(-sm.net)+' RU'));
  tot.appendChild(el('div', 'twt' + (sm.wAfter > carryLimit() ? ' over' : ''), 'Вес после: ' + showKg(sm.wAfter) + ' / ' + carryLimit() + ' кг'));
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
function drawLocker() {
  const stock=personalStock(), shell=el('div','locker-panel');
  shell.appendChild(el('p','locker-status','Вес рюкзака · '+showKg(weight())+' / '+carryLimit()+' кг · '+packCells(S.inv)+' / '+PACK_CELLS+' ячеек. Один ящик для обеих баз.'));
  const sides=el('div','locker-sides');
  function side(deposit) {
    const col=el('section','locker-side '+(deposit?'mine':'their'));
    col.appendChild(el('h3','pack-heading',deposit?'Мой рюкзак':'Личный ящик'));
    const contents=deposit?S.inv:stock.loot;
    let rows=0;
    for(const [id,count] of Object.entries(contents)) {
      if (!ITEMS[id] || count<=0) continue;
      const total=isGun(id)?count:1;
      for(let i=0;i<total;i++) {
        const gun=isGun(id)?(deposit?gunCopy(id,i):stock.guns[id]?.[i] || {cond:80,mag:0}):null;
        const available=deposit?sellable(id,null):count;
        const fixed=deposit && (available<=0 || (isGun(id) && wornCount(id)>0 && i===0));
        const row=el('div','locker-row');
        row.appendChild(itemIcon(id));
        const label=el('div','locker-item',itemName(id));
        label.appendChild(el('small','',gun?Math.round(gun.cond)+'% · '+gun.mag+' патр.':count+' шт. · '+showKg(itemW(id))+' кг/шт.'));
        row.appendChild(label);
        const action=deposit?'Положить':'Забрать';
        const move=n=>{
          let moved=0;
          if(deposit) {
            if(fixed || n>sellable(id,null)) return;
            const copy=removePacked(id,n,i); putStock(stock,id,n,copy); moved=n;
          } else if(gun) {
            if(receiveError(id,1,gun)) return;
            stock.guns[id]?.splice(i,1); if(--stock.loot[id]===0) {delete stock.loot[id];delete stock.guns[id];}
            addPacked(id,1,gun); moved=1;
          } else moved=collectStock(stock,id,n);
          panel.hint=(deposit?'В ящик: ':'В рюкзак: ')+itemName(id)+' ×'+moved+'.';
          if(!save(true)) panel.hint+=' Не удалось записать сохранение.';
          refresh();
        };
        const err=deposit?'':receiveError(id,1,gun);
        const one=btn('chip',fixed?'При себе':err?'Не влезает':action,()=>move(1),fixed||!!err);
        if(err) one.title=err; row.appendChild(one);
        if(!gun && available>1) row.appendChild(btn('chip','×'+available,()=>move(available),fixed||!!err));
        col.appendChild(row); rows++;
      }
    }
    if(!rows) col.appendChild(el('p','note',deposit?'Рюкзак пуст.':'Ящик пуст.'));
    return col;
  }
  sides.append(side(true),side(false)); shell.appendChild(sides); pbody.appendChild(shell);
}
