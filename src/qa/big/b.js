(() => {
const z = __z, X = z.plus, R = {};
const __RM = window.__zRM;
const RPx = (x, y) => __RM.p(x, y)[0], RPy = (x, y) => __RM.p(x, y)[1];
const __setOld = (x, y) => { const r = __RM.p(x, y); z.P.x = r[0]; z.P.y = r[1]; };
const S = () => z.S, P = () => z.P;
const T = (name, fn) => { try { R[name] = fn(); } catch (e) { R[name] = { ERROR: String(e).slice(0, 200) }; } };
const reset = () => { z.closePanel(); z.applyState(z.freshS()); const s = S(); s.flags.intro = 1; s.money = 1000; Object.assign(s.inv, { tail: 3, w_pm: 1, a9: 40, medkit: 1 }); s.weapon = 'knife'; for (let i = 0; i < 5; i++) z.update(1 / 30); };
const btnT = re => [...document.querySelectorAll('#pbody button')].find(b => re.test(b.getAttribute('aria-label') || b.textContent));
T('B1_offer_not_applied_until_confirm', () => {
  reset(); z.openTrade(null);
  btnT(/Аптечка, 300 RU/).click(); btnT(/Хвост слепого пса/).click();
  const midMoney = S().money, midTail = S().inv.tail, midMed = S().inv.medkit;
  z.closePanel(); const afterClose = { money: S().money, tail: S().inv.tail, med: S().inv.medkit };
  z.openTrade(null); const reopenedEmpty = !Object.keys(z.panel.offer.buy).length && !Object.keys(z.panel.offer.sell).length;
  btnT(/Аптечка, 300 RU/).click(); btnT(/Хвост слепого пса/).click(); btnT(/^Подтвердить$/).click();
  return { ok: midMoney === 1000 && midTail === 3 && afterClose.money === 1000 && reopenedEmpty && S().inv.medkit === 2 && S().inv.tail === 2 && S().money === 1000 - 300 + 80,
    duringOffer: { money: midMoney, tail: midTail, med: midMed }, afterClose, reopenedEmpty, afterDeal: { money: S().money, tail: S().inv.tail, med: S().inv.medkit } };
});
T('B2_revalidate_on_confirm', () => {
  reset(); z.openTrade(null);
  btnT(/Аптечка, 300 RU/).click(); btnT(/Аптечка, 300 RU/).click(); btnT(/Аптечка, 300 RU/).click();
  S().money = 500; z.refresh();
  const conf = btnT(/^Подтвердить$/), disabled = conf.disabled, err = (document.querySelector('.terr') || {}).textContent;
  conf.disabled = false; conf.click();
  const r1 = { money: S().money, med: S().inv.medkit, hint: z.panel.hint };
  z.closePanel(); z.openTrade(null); btnT(/Хвост слепого пса/).click(); S().inv.tail = 0; z.refresh();
  const c2 = btnT(/^Подтвердить$/); const d2 = c2.disabled; c2.disabled = false; c2.click();
  return { ok: disabled && r1.money === 500 && r1.med === 1 && d2 && S().money === 500, confirmDisabled: disabled, error: err, afterForcedClick: r1, itemVanishedBlocked: d2 };
});
T('B3_condition_affects_price', () => {
  reset(); S().cond.w_pm = 100; z.openTrade(null); const p100 = +btnT(/^ПМ,/).getAttribute('aria-label').match(/(\d+) RU/)[1];
  S().cond.w_pm = 40; z.refresh(); const p40 = +btnT(/^ПМ,/).getAttribute('aria-label').match(/(\d+) RU/)[1];
  return { ok: p40 < p100, price100: p100, price40: p40 };
});
T('B4_tracked_quest', () => {
  reset();S().campaign.stage='rescue';S().trackedQuestId='chapter1';z.update(1/30);
  const hud1=X.trackedTarget().n;S().sos.act=null;S().sos.next=S().min-1;__setOld(60*32,75*32);X.sosTick();z.update(1/30);
  const hud2=X.trackedTarget().n;z.openPanel('pda','КПК',z.PDA_TABS2);z.refresh();btnT(/Сигнал SOS/).click();btnT(/^Отслеживать$/).click();
  z.closePanel();return {ok:/Петрух/.test(hud1) && hud1===hud2 && X.trackedTarget()?.qid==='sos',hud1,hud2};
});
T('B5_weapon_cycle_kept', () => {
  reset(); S().inv.w_aksu = 1; S().weapon = 'knife';
  Object.assign(S().flags.kit,{sidearm:'w_pm',primary:'w_aksu'});
  const seen = [S().weapon]; for (let i = 0; i < 3; i++) { document.getElementById('wpnbox').click(); seen.push(S().weapon); }
  return { ok: new Set(seen).size === 3 && seen[3] === seen[0], sequence: seen };
});
T('B6_touch_targets_44', () => {
  /* для каждой кнопки: зона 44×44 вокруг центра (или сама кнопка, если она больше) прощупывается сеткой точек 5×5.
     Каждая точка должна попадать в эту же кнопку (её ::after тоже считается), и ни одна — в соседнюю кнопку. */
  const bad = [], seen = { n: 0 };
  const probe = (sel, label) => document.querySelectorAll(sel).forEach(b => {
    if (b.disabled) return;
    const r = b.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(b).visibility === 'hidden') return;
    seen.n++;
    const br = getComputedStyle(b).borderTopLeftRadius, round = /%/.test(br) ? parseFloat(br) >= 50 : parseFloat(br) >= Math.min(r.width, r.height) / 2 - 1;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, w = Math.max(44, r.width), h = Math.max(44, r.height);
    let miss = 0, steal = 0;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = cx - w / 2 + 2 + (w - 4) * i / 4, y = cy - h / 2 + 2 + (h - 4) * j / 4;   // 2 px от края: граница дробная
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      if (round && Math.hypot(x - cx, y - cy) > Math.max(22, r.width / 2) - 2) continue;   // круглая кнопка: углы квадрата вне круга не считаются
      const hit = document.elementFromPoint(x, y), hb = hit && hit.closest('button, #wpnbox');
      if (hit && b.contains(hit)) continue;
      if (hb && hb !== b) steal++; else miss++;
    }
    if (miss || steal) bad.push(label + ' «' + (b.getAttribute('aria-label') || b.textContent || b.id).trim().slice(0, 18) + '» ' + Math.round(r.width) + '×' + Math.round(r.height) + (miss ? ' мимо:' + miss : '') + (steal ? ' в соседнюю:' + steal : ''));
  });
  reset(); z.closePanel();
  probe('#t-pda,#t-inv,#t-menu', 'HUD'); probe('.touch .rb:not([hidden]),#b-fire', 'кнопки'); probe('#wpnbox', 'оружие'); probe('#prompt', 'подсказка');
  // диалог: открыть разговор с Волком
  const w = z.ents.find(e => e.name === 'Волк'); P().x = w.x; P().y = w.y + 36; for (let i = 0; i < 3; i++) z.update(1 / 30); z.interact();
  const dlgOpen = !!document.querySelector('.dlg-opts .opt');
  probe('.dlg-opts .opt', 'диалог'); probe('#pclose', 'закрыть'); z.closePanel();
  z.openPanel('pda', 'КПК', z.PDA_TABS2); z.refresh(); probe('.kpk-bar .chip', 'КПК'); probe('.qrow', 'КПК-задания'); probe('.tabs button', 'вкладки'); z.closePanel();
  z.openTrade(null); [...document.querySelectorAll('.tr-col.their .icell')][0].click(); [...document.querySelectorAll('.tr-col.mine .icell')].find(b => !b.disabled).click();
  probe('.tr-switch .chip', 'торг-переключ'); probe('.tr-acts button', 'торг'); probe('.cline', 'корзина'); z.closePanel();
  z.openPanel('inv', 'Рюкзак'); z.refresh(); probe('.inv-detail .btnrow button', 'рюкзак'); z.closePanel();
  return { ok: dlgOpen && bad.length === 0 && seen.n > 20, dialogOpened: dlgOpen, buttonsChecked: seen.n, problems: bad.slice(0, 30) };
});
T('B7_kpk_focus_and_labels', () => {
  reset(); S().q.flash = 2; S().trackedQuestId = 'flash'; [[30,84],[44,70],[60,66],[74,56],[92,70],[64,40]].forEach(p => { __setOld(p[0] * 32, p[1] * 32); z.reveal(); }); __setOld(30 * 32, 86 * 32);
  z.openPanel('pda', 'КПК', z.PDA_TABS2); z.refresh(); return 'async';
});
return JSON.stringify(R);
})()
