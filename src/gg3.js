/* ===================== графический пакет G3.1: тела, мутанты, портреты, иконки, UI =====================
   Подключён по art/g3/START_HERE.md. Механика не меняется: хитбоксы (e.r), скорость, прицел и коллизии
   не зависят от размеров PNG. Порядок: G3 → B1 → прежняя отрисовка (только при ошибке загрузки/неизвестном виде).
   #g3-off — выключить только G3; #b1-off — выключить всю новую графику. */
const G3 = { on: !/g3-off|b1-off/.test(location.hash), pack: window.CORDON_G31 || null, images: null, ready: false };
(function loadG3() {
  if (!G3.on || !G3.pack || !window.CordonG3) return;
  CordonG3.load(G3.pack.manifest, '', G3.pack.images).then(im => { G3.images = im; G3.ready = Object.keys(im).length > 0; });
})();
const G3_READY = () => G3.on && G3.ready;

/* кожа тела: игрок в «Заре» — zarya, иначе базовое тело своей группировки; Сидорович — временно loner */
function g3Skin(e) {
  if (e.kind === 'dog' || e.kind === 'boar' || e.kind === 'sucker') return e.kind;
  if (e === P) return S.armor === 'ar_zarya' ? 'zarya' : S.armor === 'ar_bandit' ? 'bandit' : 'loner';
  return { loner: 'loner', bandit: 'bandit', army: 'army', trader: 'loner' }[e.fac] || 'loner';
}
/* фаза шага — от пройденного пути; путь и таймер обновляются в update (g7Tick), отрисовка только читает */
function g3Gait(e) { return gaitOf(e); }
/* временный слой оружия (до атласа стволов): рисуется в южной системе координат тела, +y — вперёд */
const G3W = { w_pm: { len: 11, w: 3.2 }, w_obrez: { len: 17, w: 3.6 }, w_aksu: { len: 21, w: 3.6, mag: 1 }, knife: { len: 9, w: 2, blade: 1 } };
const G3_GRIP = [1.5, 8];   // точка хвата в кадре (уточнена по рукам idle/walk/crouch; см. отчёт)
/* дуло для выстрела/вспышки — та же геометрия, что и у слоя оружия (gg7.js: weaponLocal → localToWorld) */
function g3Muzzle(e, ang) { return g7Muzzle(e, ang); }
function g3Draw(e, extra, target = ctx) {
  if (!G3_READY()) return false;
  if (e.kind === 'human' && g7Human(e, extra, target)) return true;
  const skin = g3Skin(e), g = g3Gait(e);
  const attack = e.kind === 'dog' ? !!(e.tgt && e.tgt.alive && dE(e, e.tgt) < e.r + e.tgt.r + 10)
    : e.kind === 'boar' ? (e.state === 'wind' || e.state === 'charge') : e.kind === 'sucker' ? e.state === 'strike' : false;
  const a = Object.assign({ skin: skin, x: e.x, y: e.y, angle: e.ang, wounded: !!e.wounded, captive: !!e.captive, seated: !!e.sit, crouch: !!e.crouch,
    attack: attack, moving: g.moving && !e.sit, time: (g.phase + 0.5) / 7, weapon: e.kind === 'human' ? (e === P ? S.weapon : e.wpn) : null }, extra || {});
  if (e.kind !== 'human' && a.moving) { const ph = g.phase, A = G3.pack.manifest.actors[skin] || {}; a.moving = false; a.poseOverride = ph === 0 ? 'walk_left' : ph === 2 ? 'walk_right' : ph === 1 && A.walk_pass_left ? 'walk_pass_left' : ph === 3 && A.walk_pass_right ? 'walk_pass_right' : 'idle'; }   // G8: 4 фазы бега, если есть
  const man = G3.pack.manifest, g3Base = window.__g7tap ? target.getTransform() : null;
  if (e.kind !== 'human' && g7Mutant(e, a)) return true;
  if (a.poseOverride && !a.attack) { const f = man.actors[skin][a.poseOverride]; if (f && G3.images[f.file]) return g3DrawFrame(e, a, f); }
  const sw = e.kind === 'human' && a.moving ? gaitSway(e) : null;
  if (sw) { target.save(); target.translate(e.x + sw.dx, e.y + sw.dy); target.scale(sw.k, sw.k); target.translate(-e.x, -e.y); }
  const ok = CordonG3.draw(target, man, G3.images, a, e.kind === 'human' ? (c2 => { const w = weaponLocal(e); if (window.__g7tap) window.__g7tap(e, g3Base, c2.getTransform(), w); drawWeaponLocal(c2, w); }) : null);
  if (ok && e.flash > 0) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); CordonG3.draw(target, man, G3.images, Object.assign({}, a, { shadow: false }), null); target.restore(); }
  if (sw) target.restore();
  return ok;
}
/* шаг: корпус качается из стороны в сторону (период — два шага) и чуть «подпрыгивает» к камере на каждом шаге */
function gaitSway(e) {
  const g = GAIT.get(e); if (!g) return null;
  const ph = g.dist / 44 * Math.PI * 2, side = Math.sin(ph) * 0.9, run = e === P && IN.sprint ? 1.4 : 1;
  return { dx: -Math.sin(e.ang) * side * run, dy: Math.cos(e.ang) * side * run, k: 1 + 0.03 * run * Math.abs(Math.cos(ph)) };
}
function g3DrawFrame(e, a, f) {   // мутанты: шаг — левая фаза, нейтраль, правая фаза, нейтраль
  const im = G3.images[f.file];
  ctx.save(); ctx.translate(e.x, e.y);
  if (a.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 3, e.kind === 'boar' ? 13 : 10, 7, 0, 0, 6.28); ctx.fill(); }
  ctx.rotate(e.ang - Math.PI / 2); ctx.globalAlpha *= a.opacity == null ? 1 : a.opacity;
  ctx.drawImage(im, -f.width * f.pivot[0], -f.height * f.pivot[1], f.width, f.height);
  if (e.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.5, e.flash * 4); ctx.drawImage(im, -f.width * f.pivot[0], -f.height * f.pivot[1], f.width, f.height); }
  ctx.restore(); return true;
}
/* трупы: готовая поза dead того же тела; вариант позы стабилен для трупа (от seed и места) */
function deadVariant(o) { const h = Math.sin((o.seed || 1) * 12.9898 + Math.floor(o.x) * 78.233 + Math.floor(o.y) * 37.719) * 43758.5453; return Math.floor((h - Math.floor(h)) * 4); }
function g3Body(o) {
  if (!G3_READY() || o.kind === 'sack') return false;
  if (g7Body(o)) return true;
  const skin = o.kind === 'dog' || o.kind === 'boar' || o.kind === 'sucker' ? o.kind : ({ bandit: 'bandit', army: 'army' }[o.fac] || 'loner');
  const A = G3.pack.manifest.actors[skin], v = deadVariant(o), f2 = A && v & 1 && A.dead2 && G3.images[A.dead2.file] ? A.dead2 : null;
  const f = f2 || (A && A.dead); if (!f || !G3.images[f.file]) return false;
  bloodPool(o, 1); ctx.save(); ctx.translate(o.x, o.y);
  ctx.rotate((o.ang || 0) - Math.PI / 2); if (v & 2 && o.kind === 'human') ctx.scale(-1, 1);   // G8: 2 позы × зеркало — трупы не повторяются
  ctx.drawImage(G3.images[f.file], -f.width / 2, -f.height / 2, f.width, f.height); ctx.restore();
  return true;
}

/* ---------- портреты: один источник для диалога, торговли (обе стороны), рюкзака и КПК ---------- */
function portraitFor(card) {
  const ent = card && card.ent, isP = !!(card && (card.isPlayer || ent === P));
  if (G3.on && window.CordonPortraits && G3.pack) {
    const e = isP ? P : ent || (card && card.n === 'Сидорович' ? { sid: 'sid', name: 'Сидорович', fac: 'trader' } : { name: card && card.n, fac: card && card.fac });
    const im = CordonPortraits.portraitElement(e, isP, G3.pack);
    if (im) { im.classList.add('ava'); im.onerror = function () { this.onerror = null; this.replaceWith(avatar(card ? card.n : 'Сталкер', card ? card.fac : 'loner')); }; return im; }
  }
  return avatar(card ? card.n : 'Сталкер', card ? card.fac : 'loner');
}

/* ---------- иконки: G3 → B2 → B1 → SVG ---------- */
function g3Icon(id) {
  if (!G3.on || !G3.pack) return null;
  const it = G3.pack.manifest.items[id]; if (!it) return null;
  const src = G3.pack.images[it.file]; if (!src) return null;
  const im = document.createElement('img'); im.src = src; im.alt = ''; im.draggable = false;
  im.className = 'b1ic g3ic' + (it.height > it.width ? ' tall' : '') + (/\.svg$/.test(it.file) ? ' tmp' : '');
  im.onerror = function () { this.onerror = null; const f = b1Icon(id) || icon(ICON[id] || 'i-pack'); if (!f.classList.contains('b1ic') && ICOL[id]) f.style.color = ICOL[id]; this.replaceWith(f); };   // реальная ошибка загрузки → B1/SVG
  return im;
}

/* ---------- UI-текстуры: border-image поверх раскладки B/2, тёмный центр задаёт CSS ---------- */
(function g3Styles() {
  if (!G3.on || !G3.pack) return;
  const I = G3.pack.images, U = G3.pack.manifest.ui, url = k => 'url("' + I[U[k].file] + '")';
  if (!I[U.panel.file]) return;
  const css = `
.ov .pda{border:12px solid transparent;border-image:${url('panel')} 32 stretch;background-clip:padding-box;background-color:#121616}
#ov[data-kind=pda] .pda{border:22px solid transparent;border-image:${url('pda')} 64 stretch;background:#0f1416;border-radius:0;box-shadow:0 8px 30px #0009}
.icell:not(.empty){border:4px solid transparent;border-image:${url('slot')} 10 fill stretch;background:#121618}
.x,.go,.chip,.tr-acts button,.inv-detail .btnrow button,.qrow,.tabs button,.hud.zh .zh-top button{border:7px solid transparent;border-image:${url('button')} 20 fill stretch;background:#232622;color:#ded9c2;border-radius:0}
.chip.on,.qrow.sel,.tabs button[aria-selected=true]{border-image-source:${url('selected')};color:#18170f}
.dlg-opts .opt{border:6px solid transparent;border-image:${url('button')} 20 stretch;background:#1b1f22 padding-box;color:#e6dfcd;border-radius:0}
.dlg-opts .opt.key{border-image-source:${url('selected')};background:#2a2418 padding-box;color:#f4cf7a}
.qrow.sel .qm,.qrow.sel .qt{color:#18170f}
body.is-touch .touch.zt .rb{background:transparent ${url('round')} center/contain no-repeat;box-shadow:0 2px 6px rgba(0,0,0,.6)}
.hud.zh .rust{border:6px solid transparent;border-image:${url('panel')} 32 stretch;background:rgba(18,16,13,.9);box-shadow:0 2px 6px rgba(0,0,0,.55)}
.hud.zh .zh-map.rust{padding:2px}
img.ava.g3-portrait{width:64px;height:64px;object-fit:cover;border:1px solid #746747}
.tr-who img.g3-portrait{width:40px;height:40px}
@media (max-width:700px),(max-height:430px){.ov .pda{border-width:8px}#ov[data-kind=pda] .pda{border-width:14px}.hud.zh .rust{border-width:4px}.tr-who img.g3-portrait{width:32px;height:32px}}
button:disabled{filter:grayscale(.8);opacity:.55}
#ov[data-kind=pda] .pda-h h2{color:#e8b04a;text-shadow:0 1px 2px #000}
.hud.zh .zh-top button::after{inset:-12px -7px}   /* рамка-текстура 7px: зона нажатия считается от внутреннего края — расширяем до 44 px */
@media (orientation:landscape){.kpk-bar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}}.kpk-bar .chip{padding:0 6px;border-width:5px;font-size:12px;flex:none}.kpk-bar .zb{min-width:44px}
@media (max-height:430px){#ov[data-kind=pda] .pda-h{padding-bottom:0}#ov[data-kind=pda] .pda-h h2{font-size:12px}}
.tr-col .icell:not(.empty){border-width:3px}
button:active:not(:disabled){filter:brightness(1.15)}`
  + (U.map && I[U.map.file] ? `
.hud.zh .zh-map.rust{border:10px solid transparent;border-image:${url('map')} 36 stretch;padding:0;background:rgba(10,10,8,.85)}.hud.zh .zh-map .rv{display:none}
@media (max-width:700px),(max-height:430px){.hud.zh .zh-map.rust{border-width:8px}}` : '')
  + (U.joy && I[U.joy.file] ? `
body.is-touch .joy{background:${url('joy')} center/contain no-repeat;border:0;box-shadow:none;opacity:.8}.joy .ar{display:none}
.joy b{background:${url('knob')} center/contain no-repeat;box-shadow:0 3px 6px rgba(0,0,0,.6)}` : '')
  + (window.CORDON_G8_ON ? `
.zh-w #wico img{width:100px;height:56px;object-fit:cover;filter:drop-shadow(0 2px 2px #000)}
/* G8: компактный HUD как в референсе (ландшафт); зоны нажатия не меньше 44 px */
@media (orientation:portrait){
.hud.zh .rust{border-width:4px}
.hud.zh .zh-map,.hud.zh .zh-map.rust{width:98px;height:98px;border-width:7px}
.zh-bar{height:19px;margin-bottom:3px}.zh-bar .bar{height:6px}.zh-bar b{font-size:11px}
.hud.zh .zh-top button,body.is-touch .hud.zh .zh-top button{min-width:66px;min-height:26px;height:26px;padding:0 9px;font-size:12px;border-width:4px}
.hud.zh .zh-top button::after{inset:-16px -4px}
.hud.zh .zh-q,body.is-touch .hud.zh .zh-q{font-size:12px}
.hud.zh .zh-w,body.is-touch .hud.zh .zh-w{width:180px;height:58px;padding:3px 8px 3px 4px}.zh-w #wico,.zh-w #wico img{width:64px;height:38px}.hud.zh .zh-w .am,body.is-touch .hud.zh .zh-w .am{font-size:16px}
body.is-touch .touch.zt .rb{width:46px;height:46px}body.is-touch .touch.zt .fire{width:100px;height:100px}body.is-touch .joy{width:112px;height:112px}.joy b{width:46px;height:46px;margin:-23px}
.hud.zh .zh-p,body.is-touch .hud.zh .zh-p{min-height:34px;font-size:13px}
}
@media (orientation:landscape){
.hud.zh .rust{border-width:4px}
.hud.zh .zh-map,.hud.zh .zh-map.rust{width:98px;height:98px;border-width:7px}
.hud.zh .zh-clock{top:calc(110px + var(--sat));font-size:13px;padding:1px 10px}
.hud.zh .zh-bars{top:calc(136px + var(--sat));width:150px}
.zh-bar{width:116px;height:19px;margin-bottom:3px;padding:0 5px;gap:4px}.zh-bar .zi{width:12px;height:12px}.zh-bar .bar{height:6px}.zh-bar b{font-size:11px}
.zh-st{left:122px;width:22px;height:22px}.zh-st svg{width:12px;height:12px}.zh-st.rd{top:44px}
.hud.zh .zh-top,body.is-touch .hud.zh .zh-top{gap:8px}
.hud.zh .zh-top button,body.is-touch .hud.zh .zh-top button{min-width:72px;min-height:26px;height:26px;padding:0 10px;font-size:12px;border-width:4px}
.hud.zh .zh-top button::after{inset:-16px -6px}
.hud.zh .zh-q,body.is-touch .hud.zh .zh-q{top:calc(40px + var(--sat));font-size:12px;padding:2px 10px 2px 4px}
.hud.zh .zh-w,body.is-touch .hud.zh .zh-w{width:172px;height:58px;padding:3px 8px 3px 4px}
.hud.zh .zh-w,body.is-touch .hud.zh .zh-w{width:190px}.zh-w #wico,.zh-w #wico img{width:64px;height:38px}.zh-wi{overflow:hidden}.zh-w .cnd span{overflow:hidden;text-overflow:ellipsis}.hud.zh .zh-w .wn{font-size:11px}
.hud.zh .zh-w .am,body.is-touch .hud.zh .zh-w .am,.hud.zh .zh-w .am small{font-size:16px}.zh-w .cnd span{font-size:10px}
.hud.zh .zh-det{top:calc(68px + var(--sat));height:26px;width:66px}
body.is-touch .touch.zt .rb{width:46px;height:46px}body.is-touch .touch.zt .rb svg{width:21px;height:21px}
body.is-touch .touch.zt{--st:min(50px,calc((100vh / var(--hz, 1) - 112px - var(--sat) - var(--sab)) / 5))}
body.is-touch .touch.zt .c1{top:calc(104px + var(--sat))}body.is-touch .touch.zt .c2{top:calc(104px + var(--sat) + var(--st))}body.is-touch .touch.zt .c3{top:calc(104px + var(--sat) + var(--st) * 2)}body.is-touch .touch.zt .c4{top:calc(104px + var(--sat) + var(--st) * 3)}body.is-touch .touch.zt .c5{top:calc(104px + var(--sat) + var(--st) * 4)}
body.is-touch .touch.zt .fire{width:96px;height:96px;right:calc(62px + var(--sar))}body.is-touch .touch.zt .fire svg{width:50px;height:50px}
body.is-touch .joy{width:110px;height:110px}.joy b{width:46px;height:46px;margin:-23px}
.hud.zh .zh-p,body.is-touch .hud.zh .zh-p{min-height:34px;font-size:13px}
}` : '')
  + (U.bar_hp && I[U.bar_hp.file] ? `
.zh-bar.hp .bar i{background:${url('bar_hp')} left/auto 100% repeat-x,#b8261a}.zh-bar.fd .bar i{background:${url('bar_fd')} left/auto 100% repeat-x,#c99620}` : '');
  const st = document.createElement('style'); st.id = 'g3-ui'; st.textContent = css; document.head.appendChild(st);
})();
