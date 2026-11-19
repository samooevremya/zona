(async () => {
/* F: отказ ровно одного файла — портрет, иконка, кадр кровососа. Механика и видимость NPC/мутанта не страдают. */
const z = __z, G = z.rc.g7, R = {}, wait = ms => new Promise(r => setTimeout(r, ms));
const pack = CORDON_G31, bad = 'data:image/png;base64,AAAA';
// портрет
{ const f = pack.manifest.portraits.sid.file, keep = pack.images[f]; pack.images[f] = bad;
  const el = G.portraitFor({ n: 'Сидорович', fac: 'trader' }); document.body.appendChild(el); await wait(300);
  const now = document.body.lastElementChild; R.F1_portrait_onerror = { ok: !(now.tagName === 'IMG' && now.classList.contains('g3-portrait')) && now !== el, replacedWith: now.tagName + '.' + now.className };
  now.remove(); pack.images[f] = keep; }
// иконка
{ const f = pack.manifest.items.a545.file, keep = pack.images[f]; pack.images[f] = bad;
  const box = document.createElement('div'); box.appendChild(G.itemIcon('a545')); document.body.appendChild(box); await wait(300);
  const c = box.firstElementChild; R.F2_icon_onerror = { ok: !c.classList.contains('g3ic'), replacedWith: c.tagName + '.' + (c.getAttribute('class') || '') };
  box.remove(); pack.images[f] = keep; }
// кадр кровососа: удалить idle и шаги — должен рисоваться прежний процедурный кровосос
{ const S = z.S, P = z.P; const e = G.mkSucker ? null : null; const m = z.rc.mk.mkSucker(); m.x = P.x + 60; m.y = P.y; m.cloak = 0; m.state = 'stalk'; m.qaHold = 1; z.ents.push(m);
  const A = pack.manifest.actors.sucker, keep = {}; ['idle', 'walk_left', 'walk_right', 'attack'].forEach(k => { keep[k] = G.G3.images[A[k].file]; delete G.G3.images[A[k].file]; });
  z.cam.x = P.x + 60; z.cam.y = P.y; let err = null;
  const cv = document.querySelector('canvas'), sample = () => { window.__zRender(); const c2 = cv.getContext('2d'); const d = c2.getImageData(cv.width / 2 - 20, cv.height / 2 - 20, 40, 40).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] * 3 + d[i + 2]; return s; };
  let withS, without; try { withS = sample(); m.alive = 0; without = sample(); m.alive = 1; } catch (x) { err = String(x); }
  Object.keys(keep).forEach(k => { G.G3.images[A[k].file] = keep[k]; }); z.ents.splice(z.ents.indexOf(m), 1);
  R.F3_sucker_frame_missing = { ok: !err && withS !== without, drawnSomething: withS !== without, err }; }
return JSON.stringify(R);
})()
