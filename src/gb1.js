/* ===================== набор спрайтов B1 (пробный, статичный) =====================
   Подключён по art/b1/README_RU.md. Ничего из механики не меняется: коллизии, скорость, урон прежние.
   Человек рисуется спрайтом только когда оружие в руках совпадает с нарисованным (bakedWeapon)
   и поза обычная; сидение, приседание, ранение, плен, смерть и другой ствол — прежний рендер.
   Игрок: «одиночка» только как временный вид — коричневая куртка (или без костюма) с ПМ.
   Отключить для сравнения: #b1-off в адресе. */
const B1 = { on: !/b1-off/.test(location.hash), gfx: null, img: null, png: window.CORDON_B1_PNG || {}, man: window.CordonSpritesB1 || null };
(function loadB1() {
  if (!window.createCordonSpritesB1 || !window.CORDON_B1_ATLAS || !B1.man) return;
  const im = new Image(); im.src = window.CORDON_B1_ATLAS; B1.img = im; B1.gfx = createCordonSpritesB1(im, B1.man);
})();
const B1_READY = () => B1.on && B1.gfx && B1.img.complete && B1.img.naturalWidth > 0;
/* ---------- единый реестр графики актёров ----------
   Хитбокс (e.r) задаётся отдельно от картинки и здесь не меняется. Для каждого вида: набор, спрайт, логический
   холст, pivot, направление, оружие (запечённое или отдельный слой), сокеты оружия и дула в долях холста.
   Позы: idle/walk — есть (статичный кадр B1, поворот целиком); crouch/seated/wounded/dead — ожидаются (G1),
   до их появления — прежний процедурный рендер. Новый набор G1 подключается добавлением записей body/weapon/poses. */
const GFX = {
  actors: {
    loner: { set: 'B1', sprite: 'loner', logical: [48, 48], pivot: [0.5, 0.43], facing: Math.PI / 2, weapon: { baked: 'w_pm' }, weaponSocket: [0.5, 0.78], muzzleSocket: [0.5, 0.94], poses: { idle: 1, walk: 1 } },
    bandit: { set: 'B1', sprite: 'bandit', logical: [48, 48], pivot: [0.5, 0.43], facing: Math.PI / 2, weapon: { baked: 'w_obrez' }, weaponSocket: [0.5, 0.8], muzzleSocket: [0.5, 0.98], poses: { idle: 1, walk: 1 } },
    army: { set: 'B1', sprite: 'army', logical: [48, 48], pivot: [0.5, 0.43], facing: Math.PI / 2, weapon: { baked: 'w_aksu' }, weaponSocket: [0.53, 0.8], muzzleSocket: [0.54, 0.98], poses: { idle: 1, walk: 1 } },
    dog: { set: 'B1', sprite: 'dog', logical: [48, 48], pivot: [0.5, 0.5], facing: Math.PI / 2, poses: { idle: 1, walk: 1 } }
  }
};
function actorPose(e) { return !e.alive ? 'dead' : e.wounded ? 'wounded' : e.sit ? 'seated' : e.crouch ? 'crouch' : (e.mv || 0) > 15 ? 'walk' : 'idle'; }
/* точка дула в мире: из muzzleSocket спрайта, если актёр рисуется спрайтом; иначе прежнее смещение от центра */
function muzzlePoint(e, ang) {
  if (G3_READY() && e.kind === 'human') { const m = g3Muzzle(e, ang); if (m) return m; }
  const id = e.kind === 'human' ? b1HumanId(e) : null, g = id && GFX.actors[id];
  if (g && B1_READY() && b1Drawn(e, id)) {
    const fx = (g.muzzleSocket[0] - g.pivot[0]) * g.logical[0], fy = (g.muzzleSocket[1] - g.pivot[1]) * g.logical[1], r = ang - g.facing;
    return { x: e.x + fx * Math.cos(r) - fy * Math.sin(r), y: e.y + fx * Math.sin(r) + fy * Math.cos(r) };
  }
  return { x: e.x + Math.cos(ang) * (e.r + 8), y: e.y + Math.sin(ang) * (e.r + 8) };
}
function b1Drawn(e, id) {
  const g = GFX.actors[id]; if (!g || !g.poses[actorPose(e)]) return false;
  const w = e === P ? S.weapon : e.wpn; return !(g.weapon && g.weapon.baked && g.weapon.baked !== w);
}
function b1HumanId(e) {
  if (e === P) return (!S.armor || S.armor === 'ar_jacket') ? 'loner' : null;
  return { loner: 'loner', bandit: 'bandit', army: 'army' }[e.fac] || null;
}
/* тень: одно направление света для всех (свет сверху-слева, тень вправо-вниз), отдельно от спрайта */
function b1Shadow(x, y, rx, ry) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, rx, ry, 0, 0, 6.28); ctx.fill(); }
function b1Flash(e, id, w, target = ctx) {   // попадание: подсветка по форме спрайта, без прямоугольника
  if (!(e.flash > 0)) return;
  target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.55, e.flash * 4);
  B1.gfx.drawWorld(target, id, e.x, e.y, e.ang, w); target.restore();
}
function b1Human(e, target) {
  if (e === P && DETECTORS[S.weapon]) return false;
  if (!B1_READY() || e.captive) return false;
  const id = b1HumanId(e); if (!id || !b1Drawn(e, id)) return false;
  const w = e === P ? S.weapon : e.wpn;
  if (!B1.gfx.drawWorld(target, id, e.x, e.y, e.ang, w)) return false;
  b1Flash(e, id, w, target);
  return true;
}
function b1Dog(e) {
  if (!B1_READY() || !e.alive) return false;
  b1Shadow(e.x, e.y, 13, 7);
  if (!B1.gfx.drawWorld(ctx, 'dog', e.x, e.y, e.ang, null)) return false;
  b1Flash(e, 'dog', null);
  return true;
}
/* иконки предметов: сначала набор B2 (19 ID), затем B1, затем прежняя SVG-пиктограмма.
   Пропорции берутся из logicalSize манифеста: одежда 64×96 вписывается целиком, без растяжения в квадрат.
   Нож, обрез, АКС и патроны в B2 не готовы — для них действующий рендер. */
const B2 = { png: window.CORDON_ITEMS_B2 || {}, size: window.CORDON_ITEMS_B2_SIZE || {} };
function b1Icon(id) {
  if (!B1.on) return null;
  const src = B2.png[id] || B1.png[id]; if (!src) return null;
  const sz = B2.size[id] || (id === 'ar_zarya' ? [64, 96] : [64, 64]);
  const im = document.createElement('img'); im.src = src; im.alt = ''; im.draggable = false;
  im.className = 'b1ic' + (sz[1] > sz[0] ? ' tall' : '');
  return im;
}
