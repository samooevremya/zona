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

/* Разговор: карточки участников, история и ответы. */
function drawDialog2() {
  const box = el('div', 'dlg');
  function identity(c){
    const side = el('aside', 'dlg-who');
    if (!c.record) side.appendChild(portraitFor(c));
    side.appendChild(el('div', 'pn', c.n));
    side.appendChild(el('div', 'pm', c.grp));
    if (c.att) side.appendChild(el('div', 'pa' + (/враг/.test(c.att) ? ' foe' : /друг|свой/.test(c.att) ? ' pal' : ''), c.att));
    if (c.money !== undefined) side.appendChild(el('div', 'price', c.money + ' RU'));
    return side;
  }
  box.appendChild(identity(meCard()));
  const main = el('div', 'dlg-main');
  const L = el('div', 'dlg-lines');
  L.setAttribute('role','log');L.setAttribute('aria-label','История разговора');L.tabIndex=0;
  for(const line of panel.lines){
    const entry=el('p',line.s);
    if(line.s!=='sys')entry.append(el('strong','',line.name || (line.s==='me'?'Меченый':panel.card.n)));
    entry.append(document.createTextNode(line.t));L.append(entry);
  }
  main.appendChild(L);
  const O = el('div', 'dlg-opts');
  panel.opts().forEach((o, i) => O.appendChild(btn((o.k || '') + ' opt', (i + 1) + '. ' + o.t, () => {
    if (o.close) { closePanel(); if (o.fn) o.fn(); return; }
    const session=panel, start=panel.lines.length;
    panel.lines.push({ s: 'me', t: o.t });
    o.fn();
    if(panel===session){
      refresh();
      const log=pbody.querySelector('.dlg-lines'), first=log?.children[start+1] || log?.children[start];
      if(first)log.scrollTop=first.getBoundingClientRect().top-log.getBoundingClientRect().top+log.scrollTop;
    }
  }, o.d)));
  main.appendChild(O);
  box.append(main,identity(panel.card));
  pbody.appendChild(box);
  L.scrollTop=0;
}

/* ---------- КПК: карта ~65% + выбранное задание ~35%, вкладки снизу ---------- */
const PDA_TABS2 = [['map', 'Карта и задания'], ['log', 'Журнал'], ['rewards','Награды'], ['stat', 'Данные']];
// The viewport stores its centre in map tiles. Resizing the panel or opening a
// quest card therefore keeps the same place under the player's finger.
function mountPdaMap(w,cv,state,targets,pick,scaleLabel) {
  const view=state.mapView, touches=new Map();
  let fit,k,width,height,left,top,paintFrame=0,press=null;
  function layout(){
    const W=w.clientWidth,H=w.clientHeight;
    fit=Math.min(W/PW,H/MH); k=fit*view.zoom;
    width=PW*k;height=MH*k;
    const place=(size,screen,center)=>size<=screen?(screen-size)/2:clamp(screen/2-center*k,screen-size,0);
    left=place(width,W,view.x);top=place(height,H,view.y);
    view.x=(W/2-left)/k;view.y=(H/2-top)/k;
    Object.assign(cv.style,{width:width+'px',height:height+'px',transform:'translate('+left+'px,'+top+'px)'});
    scaleLabel.textContent='×'+Number(view.zoom.toFixed(1));
  }
  function paint(){
    paintFrame=0;if(!cv.isConnected || !w.clientWidth || !w.clientHeight)return;
    layout();
    const px=Math.min(devicePixelRatio||1,2,3000/Math.max(width,height));
    cv.width=Math.round(width*px);cv.height=Math.round(height*px);
    const out={};drawMapTo(cv.getContext('2d'),cv.width/PW,state.f.loc,{...state.f,sel:targets,u:px,out});
    state.mapLabels=out.labels;
  }
  function schedule(){if(!paintFrame)paintFrame=requestAnimationFrame(paint);}
  function point(e){const b=w.getBoundingClientRect();return {x:e.clientX-b.left-w.clientLeft,y:e.clientY-b.top-w.clientTop};}
  function change(from,to,zoom){
    const x=(from.x-left)/k,y=(from.y-top)/k;
    view.zoom=clamp(zoom,1,12);
    view.x=x+(w.clientWidth/2-to.x)/(fit*view.zoom);
    view.y=y+(w.clientHeight/2-to.y)/(fit*view.zoom);
    layout();
  }
  function gesture(){
    const [a,b]=touches.values();
    return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}:{...a,d:1};
  }
  w.addEventListener('pointerdown',e=>{
    if(e.button!==0||!k)return;
    const p=point(e);touches.set(e.pointerId,p);w.setPointerCapture(e.pointerId);
    press=touches.size===1?p:null;
  });
  w.addEventListener('pointermove',e=>{
    if(!touches.has(e.pointerId))return;
    const a=gesture(),p=point(e);touches.set(e.pointerId,p);const b=gesture();
    if(press && Math.hypot(p.x-press.x,p.y-press.y)>5)press=null;
    change(a,b,view.zoom*b.d/a.d);
  });
  function end(e){
    if(!touches.delete(e.pointerId))return;
    const p=point(e);
    if(e.type==='pointerup' && press && Math.hypot(p.x-press.x,p.y-press.y)<=5){
      const near=qTargets().map(t=>{const m=worldMapPoint(t);return {id:t.qid,d:Math.hypot(m.x/T*k+left-p.x,m.y/T*k+top-p.y)};})
        .filter(m=>m.d<=18).sort((a,b)=>a.d-b.d);
      if(near.length)pick([...new Set(near.map(m=>m.id))]);
    }
    press=null;if(!touches.size)schedule();
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])w.addEventListener(type,end);
  w.addEventListener('wheel',e=>{e.preventDefault();if(k){const p=point(e);change(p,p,view.zoom*Math.exp(-clamp(e.deltaY,-200,200)*.003));schedule();}},{passive:false});
  const observer=new ResizeObserver(()=>{if(w.isConnected)schedule();});
  requestAnimationFrame(()=>{if(w.isConnected){observer.observe(w);schedule();}});
  state.unmountMap=()=>{observer.disconnect();cancelAnimationFrame(paintFrame);};
}

function drawPda2() {
  if (panel.tab !== 'map') { drawPda(); return; }
  if (!panel.f) panel.f = { ppl: 1, cache: 1, loc: 1 };
  const all = qList(), act = all.filter(q => q.st === 'a'), done = all.filter(q => q.st !== 'a');
  if (!panel.qsel || !all.some(q => q.id === panel.qsel)) panel.qsel = S.trackedQuestId || (act[0] && act[0].id) || null;
  const box = el('div', 'kpk');
  // Начинаем с общего вида, центр хранится в координатах мира.
  const mapc = el('div', 'kpk-map');
  const view=panel.mapView ||= {zoom:1,x:PW/2,y:MH/2};
  const selT=qTargets().filter(t=>t.qid===panel.qsel);
  const bar=el('div','kpk-bar'), scaleLabel=el('span','zl','×'+view.zoom);
  const zoom=n=>{view.zoom=clamp(n,1,12);refresh();};
  const focus=p=>{if(!p)return;const m=worldMapPoint(p);view.x=m.x/T;view.y=m.y/T;zoom(Math.max(3,view.zoom));};
  bar.appendChild(btn('chip zb','−',()=>zoom(view.zoom/1.6)));
  bar.appendChild(scaleLabel);bar.appendChild(btn('chip zb','+',()=>zoom(view.zoom*1.6)));

  bar.appendChild(btn('chip','К игроку',()=>focus(P)));
  bar.appendChild(btn('chip','К цели',()=>focus(selT[0]),!selT.length));
  [['ppl', 'Люди'], ['cache', 'Тайники'], ['loc', 'Подписи']].forEach(f => bar.appendChild(btn('chip' + (panel.f[f[0]] ? ' on' : ''), f[1], () => { panel.f[f[0]] = !panel.f[f[0]]; refresh(); })));
  if (BIG) bar.prepend(el('span','zl', inGarbage(P.x/T,P.y/T) ? 'Свалка' : P.x < WEST*T ? 'Малая Зона' : 'Кордон'));
  mapc.appendChild(bar); markScrollX(bar);
  const w = el('div', 'mapwrap kpk-wrap'), cv2 = el('canvas'); cv2.id = 'bigmap';
  w.appendChild(cv2); mapc.appendChild(w);
  mountPdaMap(w,cv2,panel,selT,ids=>{
    panel.qsel=ids[0];panel.markerChoices=ids.length>1?ids:null;refresh();
  },scaleLabel);
  mapc.appendChild(mapLegend());
  box.appendChild(mapc);
  // задания
  const qc = el('div', 'kpk-q');
  if (!all.length) qc.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
  if(panel.markerChoices) {
    const choices=el('div','kpk-list');
    for(const id of panel.markerChoices){const q=act.find(q=>q.id===id);if(q)choices.appendChild(btn('qrow',q.n,()=>{panel.qsel=id;panel.markerChoices=null;refresh();}));}
    qc.appendChild(choices);
  }
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
  eq.appendChild(btn('wide',S.weapon==='hands'?'Руки свободны':'Освободить руки',()=>{setWeapon('hands');refresh();},S.weapon==='hands'));
  const belt = el('div', 'slot beltslot'); belt.appendChild(el('span', 'sl', 'Пояс'));
  const br = el('div', 'beltrow');
  for (let i = 0; i < 3; i++) { const id = S.belt[i]; br.appendChild(id ? itemCell(id, { on: 1, sel: panel.sel === id, fn: () => { panel.sel = id; panel.copy=0; refresh(); } }) : el('div', 'icell empty')); }
  belt.appendChild(br); eq.appendChild(belt);
  const wt = weight(), st = el('div', 'inv-stats');
  const wb = el('div', 'wbar'); const wi = el('i'); wi.style.width = Math.min(100, wt / carryLimit() * 100) + '%'; if (wt > carryLimit()) wb.classList.add('over'); wb.appendChild(wi);
  st.appendChild(el('div', 'ds', 'Вес ' + showKg(wt) + ' / ' + carryLimit() + ' кг')); st.appendChild(wb);
  st.appendChild(el('div','ds','Пустой рюкзак · '+showKg(PACK_KG)+' кг'));
  st.appendChild(el('div', 'ds', 'Защита ' + Math.round(def() * 100) + '% · Радиация ' + Math.round(S.rad)));
  st.appendChild(el('div', 'ds', 'Сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '') + ((S.flags.coatWetness||0)>.55 ? ' · одежда промокла' : '') + ' · ' + S.money + ' RU'));
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
    moduleControls(id,copy,row);
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
function merchantRisk(){
  if(S.rep<=-30)return 1.35;
  if(S.rep<=-15)return 1.18;
  const recent=(S.flags.unsolvedDeaths||[]).filter(t=>S.min-t<1440);
  return recent.length>=2?1.10:1;
}
function tradeStock(e) {
  if (e) return Object.keys(e.inv).filter(id => ITEMS[id] && e.inv[id]>0).map(id => ({
    id,q:1,p:Math.max(purchaseCost((ITEMS[id].price ?? ITEMS[id].sell ?? 1)*gearRetail(id)*(S.rep>=20?1.1:1.3)),sellPrice(id,false)+1),c:e.inv[id],cond:isGun(id)?vendorGun(e,id,0).cond:null
  }));
  return STOCK.map(s=>({...s,p:purchaseCost(s.p*gearRetail(s.id)*merchantRisk()),c:99,cond:isGun(s.id)?TRADER_WCOND:null}));

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
  if (refusesTrophy(e,id)) return 'только торговцам';
  if (e && it.armor) return 'не берёт';
  return null;
}
function refusesTrophy(e,id){
  return e && e.fac!=='trader' && e.sid!=='lz_barman' && Object.values(MUTANT_TROPHIES).includes(id);
}
function gearRetail(id){
  if(!isGun(id) && !ITEMS[id]?.armor)return 1;
  return {rookie:1.25,normal:1.65,hard:1.85,master:2.1}[difficultyKey(S.difficulty)];
}
function sellable(id, e) {
  const it = ITEMS[id]; if (!it || it.quest || !(S.inv[id] > 0)) return 0;
  if ((e && it.armor) || refusesTrophy(e,id)) return 0;
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
    if(left<=0)return;
    gm.appendChild(itemCell(id, { q: left, cond: isGun(id)?Math.round(gunCopy(id,Math.max(0,cnt(id)-1-(o.sell[id] || 0))).cond):null, price: sellable(id, e) ? tradePrice(id, e,o.sell[id] || 0) * Math.min(left,sellUnit(id)) : null, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : sellWhy(id, e, o),
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
        const pack=!deposit && ITEMS[id].ammo?Math.min(available,id==='a12'?10:30):1;
        const one=btn('chip',fixed?'При себе':err?'Не влезает':action+(pack>1?' ×'+pack:''),()=>move(pack),fixed||!!err);
        if(err) one.title=err; row.appendChild(one);
        if(!gun && available>pack) row.appendChild(btn('chip','×'+available,()=>move(available),fixed||!!err));
        col.appendChild(row); rows++;
      }
    }
    if(!rows) col.appendChild(el('p','note',deposit?'Рюкзак пуст.':'Ящик пуст.'));
    return col;
  }
  sides.append(side(true),side(false)); shell.appendChild(sides); pbody.appendChild(shell);
}
