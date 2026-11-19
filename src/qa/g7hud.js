(() => {
/* U1: касание края HUD-кнопки не запускает соседнюю; расширенные зоны (::after) соседей не перекрывают видимую кнопку */
const bs = [...document.querySelectorAll('.hud .zh-top button, .hud .topbtns button')].filter(b => b.offsetParent && b.getBoundingClientRect().width > 0);
const res = []; let bad = 0, checked = 0;
bs.forEach(b => {
  const r = b.getBoundingClientRect(), pts = [[r.left + 2, r.top + r.height / 2], [r.right - 2, r.top + r.height / 2], [r.left + r.width / 2, r.top + 2], [r.left + r.width / 2, r.bottom - 2], [r.left + r.width / 2, r.top + r.height / 2]];
  pts.forEach(p => { const el = document.elementFromPoint(p[0], p[1]); const hit = el && el.closest('button'); checked++; if (hit !== b) { bad++; res.push({ btn: b.textContent.trim(), at: p.map(Math.round), got: hit ? hit.textContent.trim() : el && el.tagName }); } });
});
// размер зоны нажатия по факту: ищем крайние точки, где elementFromPoint ещё возвращает кнопку
const sizes = bs.map(b => { const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; const ext = (dx, dy) => { let k = 0; while (k < 60) { const e = document.elementFromPoint(cx + dx * k, cy + dy * k); if (!e || e.closest('button') !== b) break; k++; } return k; };
  return { b: b.textContent.trim(), w: ext(-1, 0) + ext(1, 0), h: ext(0, -1) + ext(0, 1) }; });
return JSON.stringify({ U1_hud_edges: { ok: bad === 0 && sizes.every(s => s.w >= 44 && s.h >= 44), buttons: bs.length, pointsChecked: checked, wrong: res.slice(0, 5), hitSizes: sizes } });
})()
