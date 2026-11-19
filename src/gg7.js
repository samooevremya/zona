/* ===================== G7: модульные люди (риг G5), ключевые позы G6, единая геометрия оружия =====================
   Подключён по art/g7/ONE_TASK_FOR_CLAUDE.md. Механика не меняется: хитбоксы, скорость, урон, сейвы.
   Состояние рига хранится в WeakMap и в сейв не попадает. Обновление — в update (g7Tick), отрисовка — только чтение.
   Порядок: позы G6 (плен, падение, мутанты) → риг G5 → кадры G3 → B1 → процедурная отрисовка.
   Выключатели: #rig-off (только риг), #poses-off (только позы G6), #g3-off / #b1-off — как раньше. */
const G7 = {
  rigOn: G3.on && !/rig-off/.test(location.hash) && !!window.CordonRig && !!window.CORDON_RIG && (!window.CORDON_G8_ON || /rig-on/.test(location.hash)),   // G8: люди рисуются нарисованными кадрами шага
  poseOn: G3.on && !/poses-off/.test(location.hash) && !!window.CordonPoseKeys,
  img: null, skins: {}, vt: 0
};
(function loadG7() {
  if (!G7.rigOn) return;
  for (const k in CORDON_RIG.dead) { const f = CORDON_RIG.dead[k]; if (!CORDON_RIG.images[f] && G3.pack && G3.pack.images[f]) CORDON_RIG.images[f] = G3.pack.images[f]; }   // кадры трупов — общие с G3
  CordonRig.load(CORDON_RIG).then(im => {
    G7.img = im;
    const m = CORDON_RIG.manifest.skins;   // готовность — по фактически загруженному набору каждой кожи
    for (const k in m) G7.skins[k] = Object.values(m[k]).every(f => im[f]) && !!im[CORDON_RIG.dead[k]];
  });
})();
const RIGS = new WeakMap(), GAIT = new WeakMap(), BODYFX = new WeakMap();

/* кожа: броня игрока → костюм; NPC → группировка; Сидорович — отдельные кадры G4 */
function rigSkin(e) {
  if (e.kind !== 'human' || e.sid === 'sid') return null;
  if (e === P) return S.armor === 'ar_zarya' ? 'zarya' : S.armor === 'ar_bandit' ? 'bandit' : 'loner';
  return { bandit: 'bandit', army: 'army' }[e.fac] || 'loner';
}
function rigState(e, moving) {
  if (!e.alive) return 'dead';
  if (e.wounded) return 'wounded';
  if (e.captive) return 'captive';
  if (e.sit) return 'seated';
  if (e.crouch) return moving ? 'crouch_walk' : 'crouch';
  return moving ? 'walk' : 'idle';
}
function rigComplete(skin) { const m = CORDON_RIG.manifest.skins[skin]; for (const k in m) if (!G7.img[m[k]]) return false; return true; }
/* риг рисует человека: стоя/шагом/присев/сидя. Ранение — нарисованный кадр G3, плен — кадр G6 */
const RIG_SEATED = false;   // сидящих рисует нарисованный кадр G3 seated: у рига сидя — укороченная стойка без согнутых ног
function rigActive(e) {
  if (!G7.rigOn || !G7.img || e.wounded || e.captive || (e.sit && !RIG_SEATED)) return null;
  const skin = rigSkin(e); if (!skin || !G7.skins[skin] || !rigComplete(skin)) return null;
  let r = RIGS.get(e); if (!r) { r = { rig: CordonRig.create(rigState(e, false)), skin: skin }; RIGS.set(e, r); }
  r.skin = skin; return r;
}

/* ---------- шаг и состояние: от фактического пути за тик, в update ---------- */
function g7Tick(dt) {
  G7.vt += dt;
  for (const e of ents) {
    if (!e.alive || e.qaRig) continue;   // qaRig — только для приёмочных кадров: состояние задано вручную
    let g = GAIT.get(e); if (!g) { g = { x: e.x, y: e.y, dist: 0, moveT: 0 }; GAIT.set(e, g); }
    let d = Math.hypot(e.x - g.x, e.y - g.y); g.x = e.x; g.y = e.y;
    const tele = d > 40;   // загрузка, перестановка, телепорт, переход: не считать ходьбой
    if (tele) d = 0;
    g.dist += d;
    g.moveT = d > 0.05 && d / Math.max(dt, 1e-3) > 6 ? 0.12 : Math.max(0, g.moveT - dt);
    if (e.kind === 'human') {
      const r = rigActive(e);
      if (r) CordonRig.update(r.rig, { state: rigState(e, g.moveT > 0), distance: d, teleported: tele }, dt);
    }
  }
  for (const o of objs) if (o.k === 'body') { const b = BODYFX.get(o); if (b && b.rig) CordonRig.update(b.rig, { state: 'dead', distance: 0 }, dt); }
}
function gaitOf(e) {
  const g = GAIT.get(e) || { dist: 0, moveT: 0 }, stride = e.kind === 'human' ? 11 : e.kind === 'boar' ? 16 : 13;
  return { moving: g.moveT > 0, phase: Math.floor(g.dist / stride) % 4 };
}
/* новый труп (событие смерти в этой сессии): короткий рисованный переход. Загруженные трупы сразу лежат */
function g7Fresh(o) {
  const b = { t0: G7.vt, rig: null };
  const skin = o.kind === 'human' ? ({ bandit: 'bandit', army: 'army' }[o.fac] || 'loner') : null;
  if (skin && G7.rigOn && G7.skins[skin] && !g7PoseFrame(skin, 'fall_start')) { b.rig = CordonRig.create('idle'); b.skin = skin; }   // запасной путь G5 только без кадров G6
  BODYFX.set(o, b);
}
function g7PoseFrame(skin, pose) {
  const a = G3.pack && G3.pack.manifest.actors[skin] && G3.pack.manifest.actors[skin][pose];
  return a && G3.images && G3.images[a.file] ? a : null;
}

/* ---------- единая геометрия оружия: хват, цевьё и дуло в южных локальных координатах тела ---------- */
function weaponLocal(e) {
  const id = e === P ? S.weapon : e.wpn, W = G3W[id]; if (!W) return null;
  const grip = id === 'w_pm' || id === 'knife' ? 'one' : 'two';
  const r = rigActive(e);
  if (r) {
    const s = CordonRig.sockets(r.rig.pose, grip);
    if (!s.hasEquipment || ['seated', 'captive', 'wounded', 'dead'].includes(r.rig.state)) return null;
    return { mode: 'rig', id: id, W: W, grip: grip, main: s.main, support: s.support, muzzle: [s.main[0], s.main[1] + W.len] };
  }
  if (!G3_READY() || e.sit || e.wounded || e.captive) return null;
  const main = [G3_GRIP[0], G3_GRIP[1] + (e.crouch ? -1 : 0)];
  return { mode: 'g3', id: id, W: W, grip: grip, main: main, support: [main[0], main[1] + 8], muzzle: [main[0], main[1] + W.len] };
}
/* единственное преобразование локальной точки в мир (рендер поворачивает на ang − π/2) */
function localToWorld(e, ang, lat, fwd) {
  return { x: e.x + Math.sin(ang) * lat + Math.cos(ang) * fwd, y: e.y - Math.cos(ang) * lat + Math.sin(ang) * fwd };
}
function g7Muzzle(e, ang) {
  const w = weaponLocal(e); if (!w || w.W.blade) return null;
  return localToWorld(e, ang, w.muzzle[0], w.muzzle[1]);
}
/* слой оружия: рукоять в main, ствол вдоль +y до muzzle. Тот же объект w, что и для дула */
function drawWeaponLocal(c2, w) {
  if (!w) return;
  const W = w.W, x = w.main[0], y = w.main[1];
  const H8 = window.CORDON_G8_ON && CORDON_G8.hand[w.id], him = H8 && packImage(H8.file);
  if (him) {   // G8: нарисованный вид сверху; хват в той же точке, конец ствола = muzzle (геометрия выстрела не меняется)
    const gf = W.blade ? 0.3 : 0.22, L = W.len / (1 - gf) + (W.blade ? 2 : 0), wd = L * H8.aspect;
    c2.drawImage(him, x - wd / 2, y - L * gf, wd, L); return;
  }
  if (W.blade) { c2.fillStyle = '#a9aca8'; c2.fillRect(x - 1, y, W.w, W.len); c2.fillStyle = '#3a2e24'; c2.fillRect(x - 1.5, y - 3, 3, 3); return; }
  c2.fillStyle = '#1c1c1a'; c2.fillRect(x - W.w / 2, y - 2, W.w, W.len + 2);        // рукоять чуть позади кисти, конец ствола = muzzle
  if (W.mag) { c2.fillStyle = '#5a3a22'; c2.fillRect(x + W.w / 2 - 0.5, y + 4, 3, 4); }
  c2.fillStyle = 'rgba(255,255,255,0.12)'; c2.fillRect(x - W.w / 2, y - 2, 1, W.len + 2);
  if (w.grip === 'two') { c2.fillStyle = '#3b2c20'; c2.fillRect(x - W.w / 2 - 0.4, w.support[1] - 1.5, W.w + 0.8, 3.5); }   // цевьё под второй кистью
}

/* ---------- отрисовка людей ---------- */
function shadowAt(e, rx) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 3, rx || 10, 7, 0, 0, 6.28); ctx.fill(); }
function g7Human(e, extra, target) {
  if (!G3_READY()) return false;
  const opacity = extra && extra.opacity != null ? extra.opacity : 1;
  if (e.sid === 'sid') {   // Сидорович G4: idle/seated/relaxed, табурет уже в кадре, оружие не рисуется
    const give = typeof panel !== 'undefined' && panel && panel.kind === 'trade' && g7PoseFrame('sid', 'give');   // G8: торговля — протягивает свёрток
    const f = give || g7PoseFrame('sid', window.CORDON_G8_ON && e.talkT > 0 ? 'idle' : e.sit ? 'seated' : e.talkT > 0 ? 'idle' : 'relaxed') || g7PoseFrame('sid', 'idle'); if (!f) return false;
    drawFrameAt(e.x, e.y, e.ang, f, opacity, 1, target); if (e.flash > 0) flashFrame(e, f, 1, target); return true;
  }
  if (e.captive && !e.wounded && G7.poseOn) {   // связанный пленник: цельный кадр, без модульных рук/ствола
    const skin = rigSkin(e), f = skin && g7PoseFrame(skin, 'captive');
    if (f) { drawFrameAt(e.x, e.y, e.ang, f, opacity, CAPTIVE_K, target); if (e.flash > 0) flashFrame(e, f, CAPTIVE_K, target); return true; }
  }
  if (window.CORDON_G8_ON && (e.sit || e.campRise != null) && !e.wounded && !e.captive && rigSkin(e) === 'loner') {
    const sheet = packImage('assets/g8/camp_rise.webp');
    if (sheet) {
      // 17 кадров с готовым смешиванием в premultiplied alpha: силуэт сохраняет плотность.
      const rise = e.campRise || 0, frame = Math.round(rise * 16);
      const sw = sheet.naturalWidth / 17, sh = sheet.naturalHeight;
      target.save(); target.translate(e.x, e.y); target.rotate(e.ang - Math.PI / 2);
      const alpha = target.globalAlpha * opacity;
      target.globalAlpha = alpha;
      target.drawImage(sheet, frame * sw, 0, sw, sh, -24, -28, 48, 56);
      if (e.flash > 0) {
        target.save();
        target.globalCompositeOperation = 'lighter';
        target.globalAlpha = alpha * Math.min(0.5, e.flash * 4);
        target.drawImage(sheet, frame * sw, 0, sw, sh, -24, -28, 48, 56);
        target.restore();
      }
      if (rise > 0.75 && !e.sit) {
        target.globalAlpha = alpha * (rise * 4 - 3);
        drawWeaponLocal(target, weaponLocal(e));
      }
      target.restore(); return true;
    }
  }
  const r = rigActive(e); if (!r) return false;
  const w = weaponLocal(e), base = window.__g7tap ? target.getTransform() : null, o = { skin: r.skin, x: e.x, y: e.y, angle: e.ang, grip: w ? w.grip : 'none', opacity: opacity,
    deadImage: G7.img[CORDON_RIG.dead[r.skin]], drawEquipment: c2 => { if (base) window.__g7tap(e, base, c2.getTransform(), w); drawWeaponLocal(c2, w); } };
  const ok = CordonRig.draw(target, G7.img, CORDON_RIG.manifest, r.rig, o);
  if (ok && e.flash > 0) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); CordonRig.draw(target, G7.img, CORDON_RIG.manifest, r.rig, Object.assign({}, o, { drawEquipment: null })); target.restore(); }
  return ok;
}
const CAPTIVE_K = 0.86;   // кадр 64×72: голова/плечи сверены с соседним idle (48×56) — без этого пленник крупнее стоящих
function drawFrameAt(x, y, ang, f, opacity, k, target = ctx) {
  target.save(); target.translate(x, y); target.rotate((ang || 0) - Math.PI / 2); target.globalAlpha *= opacity == null ? 1 : opacity; if (k) target.scale(k, k);
  target.drawImage(G3.images[f.file], -f.width * f.pivot[0], -f.height * f.pivot[1], f.width, f.height); target.restore();
}
function flashFrame(e, f, k, target) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); drawFrameAt(e.x, e.y, e.ang, f, 1, k, target); target.restore(); }

/* ---------- мутанты: подготовка только в существующем wind кабана, отдача — на событие попадания ---------- */
function g7Mutant(e, a) {
  if (!G7.poseOn) return false;
  let pose = null;
  if (e.kind === 'boar' && e.state === 'wind') pose = 'anticipation';
  else if (e.flash > 0 && !(e.kind === 'sucker' && e.cloak > 0.3)) pose = 'recoil';   // скрытого кровососа новая поза не выдаёт
  if (!pose) return false;
  const f = g7PoseFrame(e.kind, pose); if (!f) return false;
  if (a.shadow !== false) shadowAt(e, e.kind === 'boar' ? 13 : 10);
  drawFrameAt(e.x, e.y, e.ang, f, a.opacity);
  return true;
}

/* ---------- трупы: падение людей fall_start → fall_mid → dead, мутанты collapse → dead ---------- */
function g7Body(o) {
  const b = BODYFX.get(o); if (!b || !G3_READY()) return false;
  const age = G7.vt - b.t0;
  if (age > 0.4) { b.rig = null; return false; }   // переход окончен — обычный труп, тот же центр и угол
  const skin = o.kind === 'human' ? ({ bandit: 'bandit', army: 'army' }[o.fac] || 'loner') : o.kind;
  if (G7.poseOn && window.CordonPoseKeys) {
    const pose = CordonPoseKeys.sample(skin, 'death_transition', age);
    if (pose && pose !== 'dead') { const f = g7PoseFrame(skin, pose); if (f) { bloodPool(o, Math.min(1, age / 0.34)); drawFrameAt(o.x, o.y, o.ang, f, 1); return true; } }
    if (pose === 'dead') return false;
  }
  if (b.rig && G7.img && G7.skins[b.skin]) {   // запасной путь G5: наклон и смешивание к кадру трупа
    bloodPool(o, Math.min(1, age / 0.4));
    return CordonRig.draw(ctx, G7.img, CORDON_RIG.manifest, b.rig, { skin: b.skin, x: o.x, y: o.y, angle: o.ang, grip: 'none', deadImage: G7.img[CORDON_RIG.dead[b.skin]] });
  }
  return false;
}
function bloodPool(o, k) {   // неровное пятно из нескольких эллипсов, форма стабильна для трупа
  const s = (o.seed || 1) * 9301 + Math.floor(o.x) * 49297 + Math.floor(o.y) * 233;
  ctx.save(); ctx.translate(o.x, o.y); ctx.fillStyle = 'rgba(70,10,6,' + (0.5 * k) + ')'; ctx.beginPath();   // один контур: без наложения прозрачности
  for (let i = 0; i < 4; i++) { const h = Math.sin(s + i * 12.9898) * 43758.5453, r = h - Math.floor(h), cx = 2 + (r - 0.5) * 12, cy = 2 + Math.cos(s + i) * 6;
    ctx.moveTo(cx + (8 + r * 8) * (i ? 0.7 : 1), cy); ctx.ellipse(cx, cy, (8 + r * 8) * (i ? 0.7 : 1), (5 + r * 6) * (i ? 0.7 : 1), r * 3, 0, 6.28); }
  ctx.fill(); ctx.restore();
}

/* ---------- генератор и предметы на земле: новые растры в прежних размерах/области ---------- */
function g7Prop(o) {
  if (!G3_READY()) return false;
  const pr = G3.pack.manifest.props && G3.pack.manifest.props.generator, im = pr && packImage(pr.file);
  if (!im) return false;
  const k = Math.min(o.w / pr.width, o.h / pr.height) * 1.17;   // содержимое PNG ≈86% кадра: вписываем рисунок, а не поля, в bbox
  const w = pr.width * k, h = pr.height * k;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2 + 2, o.y + o.h - 2, o.w / 2, 4, 0, 0, 6.28); ctx.fill();
  ctx.drawImage(im, o.x + (o.w - w) / 2, o.y + (o.h - h) / 2, w, h);
  return true;
}
const PICK_SIZE = { fuel: [18, 22], fuse: [12, 12] };
function g7Pick(o) {
  if (!G3_READY() || !G3.pack) return false;
  const it = G3.pack.manifest.items[o.pick], im = it && packImage(it.file); if (!im) return false;
  const sz = PICK_SIZE[o.pick] || [14, 14], cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(cx + 1, cy + sz[1] / 2 - 1, sz[0] / 2 + 1, 3, 0, 0, 6.28); ctx.fill();
  ctx.drawImage(im, cx - sz[0] / 2, cy - sz[1] / 2, sz[0], sz[1]);
  const t = (S.min * 2) % 1; ctx.strokeStyle = 'rgba(255,220,140,' + (0.5 - t * 0.5) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 10 + t * 10, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1;
  return true;
}
/* встроенные изображения пакета, которых нет среди кадров актёров (props, предметы на земле): загружаются один раз */
const PACKIMG = {};
function packImage(file) {
  let im = PACKIMG[file];
  if (!im) { const src = G3.pack && G3.pack.images[file]; if (!src) return null; im = PACKIMG[file] = new Image(); im.onerror = () => { im.bad = 1; }; im.src = src; }
  return !im.bad && im.complete && im.naturalWidth ? im : null;
}

/* приёмочные кадры: провести риг по заданному пути с шагом 1/fps, затем заморозить (e.qaRig) */
function qaRig(e, dist, fps, state) {
  const r = rigActive(e); if (!r) return null;
  const n = Math.max(1, Math.round((dist || 0) / 2)), dt = 1 / (fps || 60);
  let g = GAIT.get(e); if (!g) { g = { x: e.x, y: e.y, dist: 0, moveT: 0 }; GAIT.set(e, g); }
  for (let i = 0; i < n; i++) CordonRig.update(r.rig, { state: state || rigState(e, dist > 0), distance: dist ? dist / n : 0 }, dt);
  if (dist) { g.dist += dist; g.moveT = 1; }
  e.qaRig = 1; return { phase: r.rig.phase, step: r.rig.step, state: r.rig.state };
}
