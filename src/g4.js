/* ===================== отрисовка ===================== */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let VW = 800, VH = 600, DPR = 1, Z = 1;
const ZNEAR = 1.25; let HUDZ = 1;   // камера как в референсе: дом ≈ четверть ширины экрана
const cam = { x: 0, y: 0 };
const groundC = document.createElement('canvas');
const lightC = document.createElement('canvas'), lctx = lightC.getContext('2d');
const grainC = document.createElement('canvas');
let vignetteC = null;
const CANOPY = [], LONE_K = +((location.hash.match(/lone-([0-9.]+)/) || [])[1] || 1.3);

// Локальный просвет вокруг героя. Используем один рабочий холст только для
// перекрывающих его крон; остальная часть каждой кроны остаётся плотной.
const canopyWindow = document.createElement('canvas');
canopyWindow.width = canopyWindow.height = 64;
{
  const g = canopyWindow.getContext('2d');
  const fade = g.createRadialGradient(32, 32, 8, 32, 32, 32);
  fade.addColorStop(0, 'rgba(0,0,0,.98)'); fade.addColorStop(.45, 'rgba(0,0,0,.87)');
  fade.addColorStop(1, 'transparent');
  g.fillStyle = fade; g.fillRect(0, 0, 64, 64);
}
const nearCrown = document.createElement('canvas'), nearCtx = nearCrown.getContext('2d');
function drawAutumnCrown(sprite, x, y, w, h) {
  if (w <= 0 || h <= 0) return;
  const left = x - w / 2, top = y - h / 2, radius = 30;
  if (!P || Math.abs(x - P.x) > w / 2 + radius || Math.abs(y - P.y) > h / 2 + radius) {
    ctx.drawImage(sprite, left, top, w, h); return;
  }
  if (nearCrown.width !== sprite.width) nearCrown.width = nearCrown.height = sprite.width;
  nearCtx.globalCompositeOperation = 'copy'; nearCtx.drawImage(sprite, 0, 0);
  nearCtx.globalCompositeOperation = 'destination-out';
  const kx = sprite.width / w, ky = sprite.height / h;
  nearCtx.drawImage(canopyWindow, (P.x - radius - left) * kx, (P.y - radius - top) * ky, radius * 2 * kx, radius * 2 * ky);
  ctx.drawImage(nearCrown, left, top, w, h);
}

/* цветовой фильтр, зерно и виньетка настраиваются; #grade-none отключает фильтр для сравнения */
const GRADE = /grade-none/.test(location.hash) ? { mul: null, grain: 9, vig: 0.45 } : /grade-old/.test(location.hash) ? { mul: 'rgb(236,228,196)', grain: 13, vig: 0.62 } : BIG ? { mul: 'rgb(255,240,214)', grain: 9, vig: 0.62 } : { mul: 'rgb(248,245,236)', grain: 9, vig: 0.45 };   // большой Кордон: теплее, края темнее (референс)
const fireFlick = () => { const t = performance.now() / 1000; return 0.82 + 0.1 * Math.sin(t * 11.3) + 0.08 * Math.sin(t * 23.7 + 1.3); };
// Проекция солнечной тени в координатах мира. Длина зависит от высоты предмета.
const SUN_DX = 0.8, SUN_DY = 1;
const shadowStamp = document.createElement('canvas');
shadowStamp.width = shadowStamp.height = 64;
{
  const g = shadowStamp.getContext('2d');
  const shade = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  shade.addColorStop(0, 'rgba(14,12,10,.57)');
  shade.addColorStop(.64, 'rgba(14,12,10,.40)');
  shade.addColorStop(1, 'rgba(14,12,10,0)');
  g.fillStyle = shade; g.fillRect(0, 0, 64, 64);
}
function groundShadow(g, x, y, rx, ry, angle, length) {
  if (!SHADOWS) return;
  g.save(); g.translate(x + SUN_DX * length, y + SUN_DY * length); g.rotate(angle);
  g.drawImage(shadowStamp, -rx, -ry, rx * 2, ry * 2); g.restore();
}
const FIRE_REACH = BIG ? 72 : 105;   // днём костёр светит пятном поменьше, как в референсе
const figureC = document.createElement('canvas');
figureC.width = figureC.height = 192;   // 96 мировых пикселей при двукратной детализации
const figureCtx = figureC.getContext('2d');
function drawLitHuman(e) {
  const height = e.campRise ?? (e.sit || e.crouch || e.wounded ? 0 : 1);
  groundShadow(ctx, e.x, e.y, 14 + 3 * height, 9, Math.atan2(SUN_DY, SUN_DX), 4 + 4 * height);
  let fire = FIRE;
  if (Math.abs(e.x - fire.x) >= FIRE_REACH || Math.abs(e.y - fire.y) >= FIRE_REACH) fire = FIRE2;
  const dx = fire.x - e.x, dy = fire.y - e.y, distance = Math.hypot(dx, dy);
  if (distance >= FIRE_REACH) { drawHuman(e, ctx); return; }

  // Маска — альфа текущей позы. Градиент ориентирован в мире, даже когда герой поворачивается.
  const g = figureCtx;
  g.setTransform(2, 0, 0, 2, 96, 96);
  g.clearRect(-48, -48, 96, 96);
  g.save(); g.translate(-e.x, -e.y); drawHuman(e, g); g.restore();
  const k = 12 / Math.max(1, distance);
  const tint = g.createLinearGradient(-dx * k, -dy * k, dx * k, dy * k);
  tint.addColorStop(0, 'rgba(255,150,65,0)');
  tint.addColorStop(.48, 'rgba(255,150,65,0)');
  tint.addColorStop(1, 'rgb(255,166,83)');
  g.save(); g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = .55 * (1 - distance / FIRE_REACH) * fireFlick();
  g.fillStyle = tint; g.fillRect(-48, -48, 96, 96); g.restore();
  ctx.drawImage(figureC, e.x - 48, e.y - 48, 96, 96);
}
function fireGroundLight(fire) {
  const r = FIRE_REACH;
  const glow = ctx.createRadialGradient(fire.x, fire.y, 5, fire.x, fire.y, r);
  glow.addColorStop(0, 'rgba(255,159,72,' + (BIG ? .24 : .34) + ')');
  glow.addColorStop(.42, 'rgba(236,133,48,' + (BIG ? .09 : .16) + ')');
  glow.addColorStop(1, 'rgba(224,115,40,0)');
  ctx.save(); ctx.globalAlpha = fireFlick(); ctx.fillStyle = glow;
  ctx.fillRect(fire.x - r, fire.y - r, r * 2, r * 2); ctx.restore();
}
/* костёр: вытянутые колеблющиеся языки с ярким центром поверх основания из камней */
function drawFlames(F) {
  const t = performance.now() / 1000;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(F.x, F.y - 2, 1, F.x, F.y - 2, 16);
  glow.addColorStop(0, 'rgba(255,170,70,0.45)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(F.x, F.y - 2, 16, 0, 6.28); ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.28, bx = F.x + Math.cos(a) * 3.2, by = F.y + Math.sin(a) * 2.2 + 1;
    const h = 7 + 3.5 * Math.sin(t * 9 + i * 1.7) + 2 * Math.sin(t * 15.3 + i * 2.9) + (i % 3 === 0 ? 3 : 0);
    const sw = 2.2 * Math.sin(t * 6.3 + i) + 1.2 * Math.sin(t * 11 + i * 3), wd = 2.4 + (i % 2) * 0.8;
    const gr = ctx.createLinearGradient(bx, by, bx + sw, by - h);
    gr.addColorStop(0, 'rgba(255,236,170,0.9)'); gr.addColorStop(0.45, 'rgba(255,150,45,0.75)'); gr.addColorStop(1, 'rgba(200,60,20,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(bx - wd, by);
    ctx.quadraticCurveTo(bx - wd + sw * 0.4, by - h * 0.55, bx + sw, by - h);
    ctx.quadraticCurveTo(bx + wd + sw * 0.4, by - h * 0.55, bx + wd, by); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,250,215,0.85)'; ctx.beginPath(); ctx.ellipse(F.x, F.y - 1, 2.6 + Math.sin(t * 13) * 0.4, 1.8, 0, 0, 6.28); ctx.fill();
  ctx.restore();
  if (chance(0.06)) parts.push({ x: F.x + rnd(-3, 3), y: F.y - 4, vx: rnd(-14, 14), vy: rnd(-40, -20), life: rnd(0.4, 0.9), c: '#ffc060', s: 1.2 });
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  Z = clamp(Math.min(VW, VH) / 430, BIG ? 0.5 : 0.85, 1.35) * (BIG ? ZNEAR : 1);   // большой Кордон: камера ближе, как в референсе; на низком окне — дальше
  // маленькое окно (сайт с панелями браузера): весь HUD пропорционально уменьшается, чтобы не наезжал друг на друга
  const hz = BIG ? clamp(VW >= VH ? Math.min(VW / 640, VH / 360, 1) : Math.min(VW / 360, VH / 640, 1), 0.5, 1) : 1; HUDZ = hz;
  for (const el of document.querySelectorAll('.hud.zh, .touch.zt')) {
    el.style.setProperty('--hz', hz);
    if (hz < 0.99) Object.assign(el.style, { zoom: hz, inset: '0 auto auto 0', width: VW / hz + 'px', height: VH / hz + 'px' });
    else Object.assign(el.style, { zoom: '', inset: '', width: '', height: '' });
  }
  { const zq = /[#&]z=([\d.]+)/.exec(location.hash); if (zq) Z = clamp(+zq[1], 0.6, 2.5); }   // проверка масштаба камеры: #z=1.6
  lightC.width = Math.ceil(VW / 2); lightC.height = Math.ceil(VH / 2);
  vignetteC = document.createElement('canvas'); vignetteC.width = 256; vignetteC.height = 256;
  const v = vignetteC.getContext('2d'), g = v.createRadialGradient(128, 128, BIG ? 70 : 60, 128, 128, 182);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,8,4,' + GRADE.vig + ')');
  v.fillStyle = g; v.fillRect(0, 0, 256, 256);
}

/* ---------- земля: рисуется один раз ---------- */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(v * k), 0, 255);
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}
/* Земля рисуется кусками (GCH×GCH пикселей) по мере надобности: карта большого Кордона
   8064×7040 px не помещается в один холст телефона. GW — окно в клетках, которое рисуется сейчас. */
const GCH = 512, GCACHE = new Map(), GS = BIG && !/gs1/.test(location.hash) ? 2 : 1, GMAX = GS > 1 ? 24 : 30;   // GS: пикселей земли на единицу (камера ближе — земля чёткая)
let GW = { x0: 0, y0: 0, x1: 0, y1: 0 }, GWP = { x0: 0, y0: 0, x1: 0, y1: 0 }, GNOISE = null, gStat = { painted: 0, ms: 0 };
const inGW = (x, y) => x >= GW.x0 && x <= GW.x1 && y >= GW.y0 && y <= GW.y1;
function paintGround() { GCACHE.clear(); GPEND = null; if (BIG) { groundChunk(0, 0); GCACHE.clear(); gStat.painted = 0; } if (!BIG) { groundC.width = WW; groundC.height = WH; GW = { x0: 0, y0: 0, x1: MW - 1, y1: MH - 1 }; GWP = { x0: 0, y0: 0, x1: WW, y1: WH }; const it = paintGroundWin(groundC.getContext('2d'), mulberry32(77)); while (!it.next().done); if (ART) c1Grade(groundC, 0, 0, groundC.width, groundC.height); } }
/* кусок земли: генератор рисования идёт шагами; для видимого куска до конца сразу, для соседнего по шагу за кадр */
let GPEND = null;
function chunkStart(cx, cy) {
  const key = cx + ',' + cy;
  const c = GCACHE.size >= GMAX ? (() => { const k0 = GCACHE.keys().next().value, c0 = GCACHE.get(k0); GCACHE.delete(k0); return c0; })() : document.createElement('canvas');
  c.width = GCH * GS; c.height = GCH * GS;
  const g = c.getContext('2d'), x0 = cx * GCH, y0 = cy * GCH;
  const win = { x0: Math.max(0, Math.floor(x0 / T) - 2), y0: Math.max(0, Math.floor(y0 / T) - 2), x1: Math.min(MW - 1, Math.ceil((x0 + GCH) / T) + 2), y1: Math.min(MH - 1, Math.ceil((y0 + GCH) / T) + 2) };
  g.setTransform(GS, 0, 0, GS, -x0 * GS, -y0 * GS);
  GW = win;
  return { key, c, g, win, x0, y0, it: paintGroundWin(g, mulberry32(77 + cx * 131 + cy * 7919)), ms: 0 };
}
function chunkStep(p, all) {
  const t0 = performance.now();
  GW = p.win; GWP = { x0: p.x0, y0: p.y0, x1: p.x0 + GCH, y1: p.y0 + GCH }; p.g.setTransform(GS, 0, 0, GS, -p.x0 * GS, -p.y0 * GS);
  let done = false;
  do {
    if (!p.gen) { if (p.it.next().done) p.gen = 1; }
    else { const H = GCH * GS, sh = GS > 1 ? 256 : H; p.gy = p.gy || 0; if (ART) c1Grade(p.c, 0, p.gy, H, Math.min(sh, H - p.gy)); p.gy += sh; done = !ART || p.gy >= H; }   // цвет отдельными шагами-полосами
  } while (all && !done);
  p.ms += performance.now() - t0;
  if (!all) gStat.stepMax = Math.max(gStat.stepMax || 0, Math.round(performance.now() - t0));
  if (done) { p.g.setTransform(1, 0, 0, 1, 0, 0); GCACHE.set(p.key, p.c); gStat.painted++; gStat.ms = Math.round(p.ms); gStat.step = Math.max(gStat.step || 0, Math.round(performance.now() - t0)); }
  return done;
}
function groundChunk(cx, cy) {
  const key = cx + ',' + cy; let c = GCACHE.get(key);
  if (c) { GCACHE.delete(key); GCACHE.set(key, c); return c; }   // LRU: последний использованный в конец
  if (GPEND && GPEND.key === key) { chunkStep(GPEND, true); GPEND = null; return GCACHE.get(key); }
  const p = chunkStart(cx, cy); chunkStep(p, true); gStat.sync = (gStat.sync || 0) + 1;
  return p.c;
}
/* нарисовать землю видимой области; кусок рядом с видимым дорисовывается заранее, по одному за кадр */
function drawGround(vx, vy, vw, vh) {
  if (!BIG) { const gx = clamp(Math.floor(vx), 0, WW), gy = clamp(Math.floor(vy), 0, WH), gw = Math.min(WW - gx, Math.ceil(vw) + 2), gh = Math.min(WH - gy, Math.ceil(vh) + 2); if (gw > 0 && gh > 0) ctx.drawImage(groundC, gx, gy, gw, gh, gx, gy, gw, gh); return; }
  const nx = Math.ceil(WW / GCH), ny = Math.ceil(WH / GCH);
  const c0 = clamp(Math.floor(vx / GCH), 0, nx - 1), c1 = clamp(Math.floor((vx + vw) / GCH), 0, nx - 1);
  const r0 = clamp(Math.floor(vy / GCH), 0, ny - 1), r1 = clamp(Math.floor((vy + vh) / GCH), 0, ny - 1);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) ctx.drawImage(groundChunk(cx, cy), cx * GCH, cy * GCH, GCH, GCH);
  if (GPEND) { const t0 = performance.now(); do { gStat.steps = (gStat.steps || 0) + 1; if (chunkStep(GPEND, false)) { GPEND = null; break; } } while (performance.now() - t0 < 5); return; }   // короткие шаги — несколько за кадр, чтобы соседний кусок успевал до подхода
  for (let cy = Math.max(0, r0 - 1); cy <= Math.min(ny - 1, r1 + 1); cy++) for (let cx = Math.max(0, c0 - 1); cx <= Math.min(nx - 1, c1 + 1); cx++)
    if (!GCACHE.has(cx + ',' + cy)) { GPEND = chunkStart(cx, cy); chunkStep(GPEND, false); return; }
}
function* paintGroundWin(g, R) {
  for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = map[y * MW + x], px = x * T, py = y * T;
    const n = vnoise(x, y, 7), n2 = vnoise(x + 40, y + 40, 3), k = 0.86 + n * 0.28;
    const grass = () => {
      g.fillStyle = shade('#434a2a', 0.94 + n * 0.1); g.fillRect(px, py, T, T);
      for (let i = 0; i < 9; i++) { g.fillStyle = R() < 0.5 ? 'rgba(20,26,10,0.35)' : 'rgba(150,140,90,0.18)'; g.fillRect(px + R() * T, py + R() * T, 2, 2); }
      if (R() < 0.35) { g.strokeStyle = 'rgba(160,150,95,0.25)'; g.lineWidth = 1; g.beginPath(); const sx = px + R() * T, sy = py + R() * T; g.moveTo(sx, sy); g.lineTo(sx + R() * 4 - 2, sy - 5); g.stroke(); }
    };
    switch (t) {
      case GR: case TR: case BU: grass(); break;
      case DI:
        g.fillStyle = shade('#5a4b34', k); g.fillRect(px, py, T, T);
        for (let i = 0; i < 7; i++) { g.fillStyle = R() < 0.5 ? 'rgba(30,22,12,0.4)' : 'rgba(170,150,110,0.25)'; g.fillRect(px + R() * T, py + R() * T, 2, 2); }
        break;
      case AS:
        g.fillStyle = shade('#3c3c37', 0.92 + n * 0.16); g.fillRect(px, py, T, T);
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(90,90,80,0.35)'; g.fillRect(px + R() * T, py + R() * T, 1.5, 1.5); }
        if (R() < 0.25) { g.strokeStyle = 'rgba(15,15,12,0.6)'; g.lineWidth = 1; g.beginPath(); let cx = px + R() * T, cy = py + R() * T; g.moveTo(cx, cy); for (let s = 0; s < 3; s++) { cx += R() * 14 - 7; cy += R() * 14 - 7; g.lineTo(cx, cy); } g.stroke(); }
        if (x === roadX[y] && y % 3 === 0 && y > 8) { g.fillStyle = 'rgba(200,190,150,0.22)'; g.fillRect(px + 14, py + 4, 4, 18); }
        break;
      case SW:
        g.fillStyle = shade('#26332c', 0.9 + n * 0.2); g.fillRect(px, py, T, T);
        g.strokeStyle = 'rgba(140,160,140,0.12)'; g.beginPath(); g.ellipse(px + R() * T, py + R() * T, 6, 2, 0, 0, 6.28); g.stroke();
        for (let i = 0; i < 3; i++) { if (R() < 0.6) { g.strokeStyle = 'rgba(120,120,70,0.5)'; g.beginPath(); const rx = px + R() * T, ry = py + R() * T; g.moveTo(rx, ry); g.lineTo(rx + R() * 4 - 2, ry - 8); g.stroke(); } }
        break;
      case CF:
        g.fillStyle = shade('#55554d', 0.9 + n * 0.18); g.fillRect(px, py, T, T);
        g.strokeStyle = 'rgba(25,25,20,0.35)'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
        if (R() < 0.2) { g.fillStyle = 'rgba(70,50,30,0.35)'; g.beginPath(); g.arc(px + R() * T, py + R() * T, 4 + R() * 6, 0, 6.28); g.fill(); }
        break;
      case FL:
        g.fillStyle = shade('#4a3a29', 0.9 + n * 0.2); g.fillRect(px, py, T, T);
        g.strokeStyle = 'rgba(20,14,8,0.45)'; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(px, py + i * 8); g.lineTo(px + T, py + i * 8); g.stroke(); }
        if (R() < 0.15) { g.fillStyle = 'rgba(10,8,5,0.6)'; g.fillRect(px + R() * 20, py + R() * 20, 10, 6); }
        break;
      case RA:
        g.fillStyle = shade(y === 6 ? '#58534a' : '#4a463d', 0.95 + n * 0.1); g.fillRect(px, py, T, T);
        for (let i = 0; i < 10; i++) { g.fillStyle = R() < 0.5 ? 'rgba(20,18,14,0.5)' : 'rgba(150,140,120,0.35)'; g.fillRect(px + R() * T, py + R() * T, 2, 2); }
        if (y === 6) {
          g.fillStyle = '#3a2c20'; for (let i = 0; i < 4; i++) g.fillRect(px + i * 8 + 1, py + 6, 5, 20);
          g.fillStyle = '#7d7a72'; g.fillRect(px, py + 10, T, 2); g.fillRect(px, py + 21, T, 2);
        } else { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px, py + 18, T, 14); }
        break;
      case VO: g.fillStyle = '#060705'; g.fillRect(px, py, T, T); break;
      case CO: case BR: break;
    }
  }
  if (ART) yield* artGround(g, R);
  yield;
  // мягкие пятна цвета поверх клеток, чтобы не было шахматки
  if (!ART) {
  if (!GNOISE) {
    const nc = document.createElement('canvas'); nc.width = MW * 2; nc.height = MH * 2;
    const ng = nc.getContext('2d');
    for (let y = 0; y < MH * 2; y++) for (let x = 0; x < MW * 2; x++) {
      const v = vnoise(x, y, 5), w = vnoise(x + 99, y + 7, 11);
      ng.fillStyle = v > 0.5 ? 'rgba(120,110,60,' + ((v - 0.5) * 0.35) + ')' : 'rgba(10,20,8,' + ((0.5 - v) * 0.4) + ')';
      ng.fillRect(x, y, 1, 1);
      if (w > 0.62) { ng.fillStyle = 'rgba(90,70,40,' + ((w - 0.62) * 0.5) + ')'; ng.fillRect(x, y, 1, 1); }
    }
    GNOISE = nc;
  }
  g.imageSmoothingEnabled = true;
  { const k = 2 / T, sx = GW.x0 * T, sy = GW.y0 * T, sw = (GW.x1 - GW.x0 + 1) * T, sh = (GW.y1 - GW.y0 + 1) * T; g.drawImage(GNOISE, sx * k, sy * k, sw * k, sh * k, sx, sy, sw, sh); }
  }
  yield;
  // рваные края грунта и асфальта
  if (!ART) for (let y = Math.max(1, GW.y0); y <= Math.min(MH - 2, GW.y1); y++) for (let x = Math.max(1, GW.x0); x <= Math.min(MW - 2, GW.x1); x++) {
    const t = map[y * MW + x]; if (t !== GR) continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
      const o = map[(y + d[1]) * MW + x + d[0]];
      if (o !== DI && o !== AS) return;
      for (let i = 0; i < 6; i++) {
        const ex = x * T + 16 + d[0] * 16 + (R() - 0.5) * (d[0] ? 10 : 30), ey = y * T + 16 + d[1] * 16 + (R() - 0.5) * (d[1] ? 10 : 30);
        g.fillStyle = o === DI ? 'rgba(90,75,52,0.8)' : 'rgba(64,62,55,0.8)'; g.beginPath(); g.arc(ex, ey, 2 + R() * 4, 0, 6.28); g.fill();
      }
    });
  }
  // выжженная земля на поле аномалий и у будки
  [[55.5, 58, 230, 'rgba(60,40,20,0.35)'], [34, 30, 120, 'rgba(40,40,60,0.25)'], [50, 53, 110, 'rgba(70,60,20,0.25)']].map(c => RMt(c[0], c[1]).concat(c.slice(2))).forEach(c => {
    const gr = g.createRadialGradient(c[0] * T, c[1] * T, 10, c[0] * T, c[1] * T, c[2]);
    gr.addColorStop(0, c[3]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(c[0] * T - c[2], c[1] * T - c[2], c[2] * 2, c[2] * 2);
  });
  ANOM0.forEach(a => { if (a.k === 'g') { g.strokeStyle = 'rgba(150,130,80,0.06)'; g.lineWidth = 2; g.beginPath(); g.arc(a.x, a.y, a.r * 0.7, 0, 6.28); g.stroke(); g.lineWidth = 1; } });
  yield;
  // стены: верх, южная грань, тень
  if (ART) { for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) { const t = map[y * MW + x]; if (t === CO || t === BR) artWall(g, x, y); } }
  if (!ART) for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = map[y * MW + x]; if (t !== CO && t !== BR) continue;
    const px = x * T, py = y * T, below = tAt(x, y + 1), right = tAt(x + 1, y);
    if (below !== CO && below !== BR) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px + 4, py + T, T, 9); }
    if (right !== CO && right !== BR) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px + T, py + 4, 6, T); }
  }
  if (!ART) for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = map[y * MW + x]; if (t !== CO && t !== BR) continue;
    const px = x * T, py = y * T, n = vnoise(x, y, 4), below = tAt(x, y + 1);
    const top = t === CO ? '#7a7a6d' : '#6f4a39', face = t === CO ? '#4b4b42' : '#462b22';
    if (ART) { artWallTop(g, t, px, py); g.fillStyle = 'rgba(255,255,240,0.05)'; g.fillRect(px, py, T, 2); }
    else { g.fillStyle = shade(top, 0.88 + n * 0.22); g.fillRect(px, py, T, T); }
    if (ART) {} else if (t === BR) { g.strokeStyle = 'rgba(30,15,10,0.45)'; for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(px, py + r * 8); g.lineTo(px + T, py + r * 8); g.stroke(); for (let c = 0; c < 3; c++) { const bx = px + c * 12 + (r % 2) * 6; g.beginPath(); g.moveTo(bx, py + r * 8); g.lineTo(bx, py + r * 8 + 8); g.stroke(); } } }
    else { g.fillStyle = 'rgba(255,255,240,0.06)'; g.fillRect(px, py, T, 3); if (R() < 0.3) { g.fillStyle = 'rgba(60,45,30,0.4)'; g.fillRect(px + R() * 20, py + R() * 20, 8, 10); } }
    if (below !== CO && below !== BR) { g.fillStyle = face; g.fillRect(px, py + T - 7, T, 7); }
  }
  drawThresholds(g);
  yield;
  drawCordonDetails(g);
  // кусты и пни деревьев
  for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = map[y * MW + x], px = x * T + 16, py = y * T + 16;
    if (t === TR) {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 7, py + 8, 20, 14, 0, 0, 6.28); g.fill();
      g.fillStyle = '#3a2c1f'; g.beginPath(); g.arc(px, py, 5, 0, 6.28); g.fill();
    } else if (t === BU && ART) { artBush(g, x, y);
    } else if (t === BU) {
      const h = hash2(x, y);
      for (let i = 0; i < 3; i++) { g.fillStyle = i === 2 ? '#3d4a26' : '#2c3820'; g.beginPath(); g.arc(px + (hash2(x + i, y) - 0.5) * 14, py + (hash2(x, y + i) - 0.5) * 14, 7 + h * 5 - i, 0, 6.28); g.fill(); }
    }
  }
  yield;
  objs.forEach(o => { if (o.x + o.w >= (GW.x0 - 2) * T && o.x <= (GW.x1 + 3) * T && o.y + o.h >= (GW.y0 - 2) * T && o.y <= (GW.y1 + 3) * T) drawStaticObj(g, o); });
  if (ART) artDecor(g);
}
function gensetProc(g, o) {   // прежняя процедурная отрисовка — запасной путь при ошибке растра
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(o.x + 4, o.y + 5, o.w, o.h);
  g.fillStyle = '#56603e'; g.fillRect(o.x, o.y, o.w, o.h); g.fillStyle = '#3a4029'; g.fillRect(o.x + 3, o.y + 3, o.w - 6, 6);
  g.fillStyle = '#2a2a26'; g.fillRect(o.x + o.w - 8, o.y + o.h - 9, 6, 6); g.fillStyle = '#8a8a7a'; g.fillRect(o.x + 4, o.y + o.h - 6, 10, 3);
}
// Дорожный отбойник. Контактная тень и подошва привязаны к прямоугольнику столкновения.
function drawRoadblock(g, o) {
  const w = o.w, h = o.h;
  g.save(); g.translate(o.x, o.y);
  if (SHADOWS) {
    g.fillStyle = 'rgba(27,24,19,.35)';
    g.beginPath(); g.ellipse(w / 2 + SUN_DX * 5, h / 2 + SUN_DY * 5, w * .54, h * .68, 0, 0, 2 * Math.PI); g.fill();
  }
  // Один рисунок заполнителя на всех гранях, разный срез текстуры для каждого блока.
  function face(points, tone) {
    g.save(); g.beginPath(); g.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
    g.closePath(); g.fillStyle = tone; g.fill();
    if (ART) {
      g.clip(); g.globalAlpha = .45; g.translate(-w, 0);
      artFill(g, 'wall_concrete', w - 2, -12, w + 5, h + 15);
    }
    g.restore();
  }
  face([0, 3, w - 3, 2, w, 5, w, h - 2, w - 3, h, 2, h, 0, h - 3], '#5c5950');
  face([1, h - 4, 4, h - 9, w - 5, h - 9, w - 2, h - 4, w - 4, h - 2, 2, h - 2], '#989487');
  face([4, h - 9, 3, -4, w - 7, -4, w - 5, h - 9], '#827f72');
  face([w - 7, -9, w - 3, -7, w - 2, 1, w, 5, w, h - 3, w - 5, h - 9], '#656157');
  face([1, -7, 3, -10, w - 7, -10, w - 3, -7, w - 7, -4, 3, -4], '#b2aea0');
  // Петли утоплены в гребень плиты. Сколы нарушают ровную светлую кромку.
  for (const x of [w * .23, w * .74]) {
    g.beginPath(); g.ellipse(x, -7.5, 2.5, 1.6, -.2, Math.PI, 2 * Math.PI);
    g.strokeStyle = '#595148'; g.lineWidth = 1.2; g.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = 4 + hash2(w, i) * (w - 12);
    g.fillStyle = i % 2 ? '#615e55' : '#aaa593'; g.fillRect(x, i % 2 ? -4.8 : h - 5, 1 + hash2(i, w) * 3, 1.1);
  }
  g.restore();
}
function drawStaticObj(g, o) {
  if (o.roadblock) { drawRoadblock(g, o); return; }
  if (ART && artStatic(g, o)) return;
  if (o.k === 'genset') { if (!(G3.on && G3.pack && G3.pack.manifest.props && G3.pack.manifest.props.generator)) gensetProc(g, o); return; }   // растр G4 рисуется в динамическом слое
  if (o.k === 'tracks') {
    g.fillStyle = 'rgba(40,30,22,0.55)';
    for (let i = 0; i < 6; i++) { const x = o.x + i * 5, y = o.y + (i % 2) * 7 + i * 2; g.beginPath(); g.ellipse(x, y, 2.6, 4, 0.5, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(x + 1, y - 5, 1, 1.6, 0, 0, 6.28); g.fill(); }
    return;
  }
  if (o.k === 'bus') {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(o.x + 8, o.y + 10, o.w, o.h);
    g.fillStyle = '#8a6a2a'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#6d4f1f'; g.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
    g.fillStyle = '#2a2a24'; for (let i = 0; i < 6; i++) g.fillRect(o.x + 10 + i * 19, o.y + 2, 12, 5);
    g.fillStyle = 'rgba(120,60,30,0.6)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(o.x + hash2(i, 3) * o.w, o.y + hash2(3, i) * o.h, 4 + hash2(i, i) * 7, 0, 6.28); g.fill(); }
    g.fillStyle = '#4a3a1a'; g.fillRect(o.x + o.w - 22, o.y + 8, 16, o.h - 16);
  } else if (o.k === 'trafo') {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(o.x + 6, o.y + 8, o.w, o.h);
    g.fillStyle = '#5d6158'; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#3f433b'; for (let i = 0; i < 5; i++) g.fillRect(o.x + 6 + i * 11, o.y + 6, 5, o.h - 12);
    g.fillStyle = '#c7a43a'; g.beginPath(); g.moveTo(o.x + 32, o.y + 18); g.lineTo(o.x + 44, o.y + 40); g.lineTo(o.x + 20, o.y + 40); g.closePath(); g.fill();
    g.fillStyle = '#1b1b18'; g.fillRect(o.x + 31, o.y + 25, 2, 8);
  } else if (o.k === 'barrier_old') {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(o.x + 4, o.y + o.h - 10, o.w, 16);
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#6b6a5e' : '#76756a'; g.fillRect(o.x + i * T + 2, o.y + 30, T - 4, 30); g.fillStyle = '#4b4a42'; g.fillRect(o.x + i * T + 2, o.y + 52, T - 4, 8); }
    for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#c8b440' : '#1f1f1b'; g.fillRect(o.x + i * 16, o.y + 26, 16, 4); }
  } else if (o.k === 'blocks') {
    for (let i = 0; i < 7; i++) { g.fillStyle = '#76756a'; g.fillRect(o.x + i * T + 2, o.y + 2, T - 4, T - 6); g.fillStyle = '#4b4a42'; g.fillRect(o.x + i * T + 2, o.y + T - 9, T - 4, 5); }
  } else if (o.k === 'hatch') {
    g.fillStyle = '#2b2c27'; g.fillRect(o.x - 4, o.y - 4, T + 8, T + 8);
    g.fillStyle = '#4d5047'; g.fillRect(o.x, o.y, T, T);
    g.strokeStyle = '#2a2b25'; g.lineWidth = 2; g.strokeRect(o.x + 4, o.y + 4, T - 8, T - 8); g.lineWidth = 1;
    g.fillStyle = '#7a7d70'; g.beginPath(); g.arc(o.x + 16, o.y + 16, 5, 0, 6.28); g.fill();
  } else if (o.k === 'fire') {
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.fillStyle = '#4d4a42'; g.beginPath(); g.arc(o.x + 10 + Math.cos(a) * 12, o.y + 10 + Math.sin(a) * 12, 4, 0, 6.28); g.fill(); }
    g.fillStyle = '#1d1810'; g.beginPath(); g.arc(o.x + 10, o.y + 10, 9, 0, 6.28); g.fill();
  } else if (o.k === 'car') {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(o.x + 5, o.y + 6, o.w, o.h);
    g.fillStyle = ['#3d3a33', '#4a3b2c', '#3a4036'][o.seed % 3]; g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = '#1c1a16'; g.fillRect(o.x + 16, o.y + 3, 22, o.h - 6);
    g.fillStyle = 'rgba(120,60,25,0.7)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(o.x + hash2(i, o.seed) * o.w, o.y + hash2(o.seed, i) * o.h, 2 + hash2(i, i + o.seed) * 4, 0, 6.28); g.fill(); }
    g.fillStyle = '#121210'; [[4, -3], [o.w - 12, -3], [4, o.h - 2], [o.w - 12, o.h - 2]].forEach(w => g.fillRect(o.x + w[0], o.y + w[1], 8, 5));
  } else if (o.k === 'pylon') {
    g.strokeStyle = '#5c5e55'; g.lineWidth = 2; g.strokeRect(o.x, o.y, o.w, o.h);
    g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x + o.w, o.y + o.h); g.moveTo(o.x + o.w, o.y); g.lineTo(o.x, o.y + o.h); g.stroke(); g.lineWidth = 1;
  } else if (o.k === 'counter') {
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(o.x + 3, o.y + 5, o.w, o.h);
    g.fillStyle = '#5a4630'; g.fillRect(o.x, o.y, o.w, o.h); g.fillStyle = '#6c5538'; g.fillRect(o.x, o.y, o.w, 6);
    g.strokeStyle = '#8a8a80'; g.lineWidth = 2; for (let i = 0; i < o.w; i += 10) { g.beginPath(); g.moveTo(o.x + i, o.y - 2); g.lineTo(o.x + i, o.y - 14); g.stroke(); } g.beginPath(); g.moveTo(o.x, o.y - 14); g.lineTo(o.x + o.w, o.y - 14); g.stroke(); g.lineWidth = 1;
  } else if (o.k === 'shelf') {
    g.fillStyle = '#3b3226'; g.fillRect(o.x, o.y, o.w, o.h);
    for (let i = 0; i < 9; i++) { g.fillStyle = ['#6a7a4a', '#8a6a3a', '#4a5a6a', '#9a3a2a'][i % 4]; g.fillRect(o.x + 4 + i * 9, o.y + 4, 6, 10); }
  } else if (o.k === 'stairs') {
    for (let i = 0; i < 5; i++) { g.fillStyle = shade('#5a5a50', 1 - i * 0.12); g.fillRect(o.x, o.y + i * 10, o.w, 9); }
    g.fillStyle = 'rgba(255,255,230,0.06)'; g.fillRect(o.x, o.y + 40, o.w, 10);
  } else if (o.k === 'bed') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(o.x + 3, o.y + 3, o.w, o.h);
    g.fillStyle = '#4e4636'; g.fillRect(o.x, o.y, o.w, o.h); g.fillStyle = '#6e6650'; g.fillRect(o.x + 2, o.y + 2, 8, o.h - 4);
  } else if (o.k === 'table') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(o.x + 3, o.y + 3, o.w, o.h);
    g.fillStyle = '#5a4630'; g.fillRect(o.x, o.y, o.w, o.h); g.fillStyle = '#9a9a8a'; g.fillRect(o.x + 6, o.y + 6, 5, 5);
  } else if (o.k === 'sand') {
    for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#6e6448' : '#7a7050'; g.beginPath(); g.ellipse(o.x + 6 + i * 10, o.y + 8, 7, 6, 0, 0, 6.28); g.fill(); }
  }
}
const ROOFS = [];
function buildRoofs() {
  HOUSES.forEach((h, idx) => {
    const art = ART && artRoof(h, idx); if (art) { ROOFS.push(art); return; }
    const c = document.createElement('canvas'), W = h.w * T + 10, Hh = h.h * T + 10;
    c.width = W; c.height = Hh;
    const g = c.getContext('2d'), R = mulberry32(500 + idx);
    const base = h.mat === 'conc' ? '#5d5e56' : h.mat === 'ruin' ? '#5a5048' : ['#5b5e57', '#6a4f3c', '#4f5649'][idx % 3];
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(8, 8, W - 8, Hh - 8);
    if (h.mat === 'conc') {
      g.fillStyle = base; g.fillRect(0, 0, W - 6, Hh - 6);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh - 6); g.stroke(); }
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(60,45,30,0.35)'; g.beginPath(); g.arc(R() * W, R() * Hh, 6 + R() * 12, 0, 6.28); g.fill(); }
      g.fillStyle = '#3e3f39'; g.fillRect(W * 0.3, Hh * 0.35, 18, 18);
    } else {
      const along = h.w >= h.h, mid = along ? (Hh - 6) / 2 : (W - 6) / 2;
      g.fillStyle = shade(base, 1.08); along ? g.fillRect(0, 0, W - 6, mid) : g.fillRect(0, 0, mid, Hh - 6);
      g.fillStyle = shade(base, 0.82); along ? g.fillRect(0, mid, W - 6, Hh - 6 - mid) : g.fillRect(mid, 0, W - 6 - mid, Hh - 6);
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      if (along) for (let x = 0; x < W; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh - 6); g.stroke(); }
      else for (let y = 0; y < Hh; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(W - 6, y); g.stroke(); }
      g.strokeStyle = 'rgba(20,18,14,0.7)'; g.lineWidth = 3; g.beginPath(); along ? (g.moveTo(0, mid), g.lineTo(W - 6, mid)) : (g.moveTo(mid, 0), g.lineTo(mid, Hh - 6)); g.stroke(); g.lineWidth = 1;
      for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(130,70,30,0.35)'; g.beginPath(); g.arc(R() * W, R() * Hh, 4 + R() * 10, 0, 6.28); g.fill(); }
      g.fillStyle = '#3a2c22'; g.fillRect(W * 0.7, along ? mid - 14 : Hh * 0.3, 10, 10);
    }
    if (h.ruin) { g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(R() * W, R() * Hh, 14 + R() * 18, 0, 6.28); g.fill(); } g.globalCompositeOperation = 'source-over'; }
    ROOFS.push(c);
  });
}
// Единый размер для мира, мини-карты и запекаемой аэрофотокарты.
function drawHouseRoof(g, h, i, scale) {
  g.drawImage(ROOFS[i], (h.x*T-3)*scale, (h.y*T-3)*scale,
    (h.w*T+10)*scale, (h.h*T+10+(h.porchDepth || 0))*scale);
}
function roofHidden(h) {
  const px = P.x / T, py = P.y / T;
  return px > h.x + 0.6 && px < h.x + h.w - 0.6 && py > h.y + 0.6 && py < h.y + h.h - 0.6;
}
function crateDraw(o) {
  if (ART) return artCrate(o);
  ctx.save(); spriteShadow(ctx, 5, 2);
  ctx.fillStyle = o.stash ? '#5d4a2a' : '#4f4430'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.restore();
  ctx.strokeStyle = '#2a2316'; ctx.lineWidth = 2; ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
  ctx.beginPath(); ctx.moveTo(o.x + 2, o.y + 2); ctx.lineTo(o.x + o.w - 2, o.y + o.h - 2); ctx.stroke(); ctx.lineWidth = 1;
  if (o.stash && !o.looted) { const p = 0.5 + 0.5 * Math.sin(S.min * 4); ctx.fillStyle = 'rgba(220,170,80,' + (0.25 + p * 0.35) + ')'; ctx.fillRect(o.x + o.w / 2 - 2, o.y - 6, 4, 4); }
}
function buildCanopy() {
  if (ART) artCanopy(); else for (let v = 0; v < 8; v++) {
    const c = document.createElement('canvas'); c.width = c.height = 72;
    const g = c.getContext('2d'), R = mulberry32(100 + v);
    const base = ['#1d2816', '#223019', '#1f2a15', '#25301a'][v % 4];
    for (let i = 0; i < 7; i++) {
      const a = R() * 6.28, r = R() * 14;
      g.fillStyle = base; g.beginPath(); g.arc(36 + Math.cos(a) * r, 36 + Math.sin(a) * r, 15 + R() * 9, 0, 6.28); g.fill();
    }
    for (let i = 0; i < 9; i++) {
      const a = R() * 6.28, r = R() * 18;
      g.fillStyle = i % 3 ? 'rgba(70,90,45,0.55)' : 'rgba(110,120,60,0.35)';
      g.beginPath(); g.arc(30 + Math.cos(a) * r, 30 + Math.sin(a) * r, 5 + R() * 7, 0, 6.28); g.fill();
    }
    CANOPY.push(c);
  }
  const gc = grainC.getContext('2d'); grainC.width = grainC.height = 128;
  const id = gc.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = GRADE.grain; }
  gc.putImageData(id, 0, 0);
}

/* ---------- персонажи ---------- */
const LOOKS = {
  player: { coat: '#6e6240', hood: '#4f4a33', pack: '#4a3f2a' },
  loner: [{ coat: '#665a3d', hood: '#4a4430', pack: '#3e3424' }, { coat: '#58603f', hood: '#434b31', pack: '#3a3a26' }, { coat: '#6f5a3a', hood: '#54422c', pack: '#433626' }, { coat: '#5c5747', hood: '#3f3c33', pack: '#3a3326' }],
  bandit: [{ coat: '#242427', hood: null, cap: '#1a1a1c', pack: null }, { coat: '#2c2830', hood: null, cap: null, pack: null }],
  army: [{ coat: '#3e5235', hood: null, helmet: '#34452e', pack: '#33402b' }],
  trader: [{ coat: '#4f4a40', hood: null, cap: null, pack: null }]
};
function lookOf(e) {
  if (e === P) return LOOKS.player;
  const L = LOOKS[e.fac] || LOOKS.loner;
  return L[(e.seed || e.id) % L.length];
}
function drawHuman(e, g) {
  if (g3Draw(e, { shadow: false }, g)) return;
  if (b1Human(e, g)) return;
  const lk = lookOf(e);
  g.save(); g.translate(e.x, e.y);
  g.rotate(e.ang);
  const W = WP[e === P ? S.weapon : e.wpn] || WP.knife;
  if (e.crouch) g.scale(0.86, 0.86);
  const bob = Math.sin(e.step * 0.25) * 1.5;
  if (e.wounded) {
    g.rotate(1.3);
    g.fillStyle = 'rgba(90,12,8,0.5)'; g.beginPath(); g.ellipse(2, 3, 13, 9, 0, 0, 6.28); g.fill();
    g.fillStyle = lk.coat; g.beginPath(); g.ellipse(0, 0, 7, 12, 0, 0, 6.28); g.fill();
    g.fillStyle = '#e8e2d0'; g.fillRect(-7, 4, 14, 3);
    g.fillStyle = lk.hood || '#b48d68'; g.beginPath(); g.arc(0, -12, 5.2, 0, 6.28); g.fill();
    g.restore(); return;
  }
  if (e.captive) {
    g.fillStyle = lk.coat; g.beginPath(); g.ellipse(0, 0, 8, 10, 0, 0, 6.28); g.fill();
    g.fillStyle = '#b8946f'; g.beginPath(); g.arc(2, 0, 5, 0, 6.28); g.fill();
    g.strokeStyle = '#8a7a50'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -6); g.lineTo(-8, 6); g.stroke(); g.lineWidth = 1;
    g.restore(); return;
  }
  if (!e.sit && (e.mv || 0) > 15) { const st = Math.sin(e.step * 0.22) * 6; g.fillStyle = '#1f1d18'; g.beginPath(); g.ellipse(st, -5, 4, 2.6, 0, 0, 6.28); g.fill(); g.beginPath(); g.ellipse(-st, 5, 4, 2.6, 0, 0, 6.28); g.fill(); }
  if (lk.pack) { g.fillStyle = lk.pack; g.fillRect(-12, -6, 6, 12); }
  // оружие и руки
  if (!e.sit) {
    if (W.melee) { g.fillStyle = '#9a9a92'; g.fillRect(10, 4, 9, 2); }
    else { const len = W.auto ? 20 : W.pellets ? 17 : 11; g.fillStyle = '#1e1e1c'; g.fillRect(6, -1.5, len, 3.5); if (W.auto) g.fillRect(10, 1, 3, 5); }
    g.fillStyle = shade(lk.coat, 0.85);
    g.beginPath(); g.arc(8 + bob * 0.3, 4, 3.2, 0, 6.28); g.fill();
    g.beginPath(); g.arc(6 - bob * 0.3, -4, 3.2, 0, 6.28); g.fill();
  } else { g.fillStyle = '#1e1e1c'; g.fillRect(-2, 8, 14, 3); }
  // корпус
  g.fillStyle = e.flash > 0 ? '#e9e2c8' : lk.coat;
  g.beginPath(); g.ellipse(0, 0, 8, 11.5, 0, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.stroke();
  // голова
  if (lk.hood) { g.fillStyle = lk.hood; g.beginPath(); g.arc(0, 0, 6.6, 0, 6.28); g.fill(); g.fillStyle = '#1b1a14'; g.beginPath(); g.arc(3.2, 0, 3, -1.2, 1.2); g.fill(); }
  else if (lk.helmet) { g.fillStyle = lk.helmet; g.beginPath(); g.arc(0, 0, 6.4, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.stroke(); }
  else { g.fillStyle = '#b48d68'; g.beginPath(); g.arc(0, 0, 5.6, 0, 6.28); g.fill(); if (lk.cap) { g.fillStyle = lk.cap; g.beginPath(); g.arc(-1, 0, 5.4, 1.57, 4.71); g.fill(); } }
  g.restore();
}
function drawDog(e) {
  if (g3Draw(e)) return;
  if (b1Dog(e)) return;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(3, 4, 14, 8, e.ang, 0, 6.28); ctx.fill();
  ctx.rotate(e.ang);
  const ph = e.step * 0.35;
  ctx.strokeStyle = '#3d3128'; ctx.lineWidth = 2.5;
  [[6, 1], [-6, -1]].forEach((l, i) => {
    const s = Math.sin(ph + i * 3.14) * 5;
    ctx.beginPath(); ctx.moveTo(l[0], -4); ctx.lineTo(l[0] + s, -9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l[0], 4); ctx.lineTo(l[0] - s, 9); ctx.stroke();
  });
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-17, Math.sin(S.min * 20 + e.id) * 4, -20, Math.sin(S.min * 20 + e.id) * 5); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = e.flash > 0 ? '#e9d9c8' : '#5c4b3d'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6.5, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#463830'; ctx.beginPath(); ctx.ellipse(-1, 0, 9, 2.5, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? '#e9d9c8' : '#6a5646'; ctx.beginPath(); ctx.ellipse(13, 0, 6, 4.6, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#8a5a50'; ctx.beginPath(); ctx.ellipse(18, 0, 2.4, 2, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#4a3a30'; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(8, -8); ctx.lineTo(13, -4); ctx.fill(); ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(8, 8); ctx.lineTo(13, 4); ctx.fill();
  ctx.restore();
}
function drawBoar(e) {
  if (g3Draw(e)) return;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(4, 5, 19, 11, e.ang, 0, 6.28); ctx.fill();
  ctx.rotate(e.ang);
  const ph = e.step * 0.3;
  ctx.strokeStyle = '#2f241b'; ctx.lineWidth = 3.5;
  [[8, 1], [-8, -1]].forEach((l, i) => { const s = Math.sin(ph + i * 3.14) * 4; ctx.beginPath(); ctx.moveTo(l[0], -7); ctx.lineTo(l[0] + s, -12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(l[0], 7); ctx.lineTo(l[0] - s, 12); ctx.stroke(); });
  ctx.lineWidth = 1;
  ctx.fillStyle = e.flash > 0 ? '#e9d9c8' : e.state === 'wind' ? '#6a4632' : '#4e3a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 17, 10.5, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#3b2b1f'; ctx.beginPath(); ctx.ellipse(-2, 0, 13, 4, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? '#e9d9c8' : '#5a4432'; ctx.beginPath(); ctx.ellipse(17, 0, 8, 7, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#7a5a4a'; ctx.beginPath(); ctx.ellipse(24, 0, 3, 3.6, 0, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(21, -4); ctx.lineTo(26, -7); ctx.moveTo(21, 4); ctx.lineTo(26, 7); ctx.stroke(); ctx.lineWidth = 1;
  if (e.state === 'stun') { ctx.fillStyle = 'rgba(255,240,180,0.8)'; for (let i = 0; i < 3; i++) { const a = S.min * 6 + i * 2.1; ctx.fillRect(Math.cos(a) * 9 - 1, Math.sin(a) * 9 - 1, 2, 2); } }
  ctx.restore();
}
function drawBody(o) {
  if (g3Body(o)) return;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.ang + 1.2);
  ctx.fillStyle = 'rgba(80,10,6,0.55)'; ctx.beginPath(); ctx.ellipse(2, 2, 15, 11, 0, 0, 6.28); ctx.fill();
  if (o.kind === 'dog') { ctx.fillStyle = '#4a3c31'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, 6.28); ctx.fill(); ctx.beginPath(); ctx.ellipse(13, 2, 5, 4, 0.4, 0, 6.28); ctx.fill(); }
  else {
    const lk = (LOOKS[o.fac] || LOOKS.loner); const c = Array.isArray(lk) ? lk[o.seed % lk.length] : lk;
    ctx.fillStyle = shade(c.coat, 0.8); ctx.beginPath(); ctx.ellipse(0, 0, 7, 13, 0, 0, 6.28); ctx.fill();
    ctx.fillRect(-3, 10, 3, 8); ctx.fillRect(2, 10, 3, 9);
    ctx.fillStyle = c.hood || c.helmet || '#9c7a5a'; ctx.beginPath(); ctx.arc(0, -13, 5, 0, 6.28); ctx.fill();
  }
  ctx.restore();
  if (Object.keys(o.loot).length && dst(o.x, o.y, P.x, P.y) < 220) { const p = 0.5 + 0.5 * Math.sin(S.min * 5); ctx.fillStyle = 'rgba(230,210,150,' + (0.3 + p * 0.4) + ')'; ctx.fillRect(o.x - 2, o.y - 18, 4, 4); }
}
const TINT = { art_medusa: [220, 147, 48], art_bengal: [140, 200, 255], art_blood: [214, 69, 65] };
function drawAnoms() {
  const t = S.min;
  for (const a of anoms) {
    const pd = dst(a.x, a.y, P.x, P.y);
    if (a.k === 'g') {
      const vis = Math.max(a.reveal > 0 ? 0.9 : 0, clamp(1 - pd / 150, 0, 0.6), a.fx);
      if (vis > 0.02) {
        ctx.strokeStyle = 'rgba(230,210,170,' + (0.12 * vis) + ')'; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (0.4 + i * 0.3) + Math.sin(t * 3 + i) * 2, 0, 6.28); ctx.stroke(); }
        for (let i = 0; i < 9; i++) {
          const ang = t * (1.5 + i * 0.1) + i * 0.7, r = (a.r - 2) * ((i * 37 % 10) / 10);
          ctx.fillStyle = 'rgba(' + (i % 2 ? '90,75,50' : '140,120,70') + ',' + (0.8 * vis) + ')';
          ctx.fillRect(a.x + Math.cos(ang) * r, a.y + Math.sin(ang) * r, 2.5, 1.5);
        }
      }
      if (a.fx > 0) { ctx.strokeStyle = 'rgba(255,220,160,' + a.fx * 0.6 + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * (1.6 - a.fx), 0, 6.28); ctx.stroke(); ctx.lineWidth = 1; }
    } else {
      const glow = 0.18 + a.fx * 0.6 + (a.reveal > 0 ? 0.15 : 0);
      const gr = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, a.r * 1.4);
      gr.addColorStop(0, 'rgba(150,210,255,' + glow + ')'); gr.addColorStop(1, 'rgba(150,210,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 1.4, 0, 6.28); ctx.fill();
      if (a.arc <= 0) { a.arc = rnd(0.05, 0.7); a.arcPts = []; let x = a.x, y = a.y; for (let i = 0; i < 6; i++) { x = a.x + rnd(-a.r, a.r); y = a.y + rnd(-a.r, a.r); a.arcPts.push([x, y]); } a.arcLife = 0.08; if (pd < 300 && chance(0.3)) play('zap', a.x, a.y); }
      a.arcLife = (a.arcLife || 0) - 1 / 60;
      if (a.arcLife > 0 || a.fx > 0.3) { ctx.strokeStyle = 'rgba(210,240,255,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); a.arcPts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.stroke(); ctx.lineWidth = 1; }
    }
  }
  for (const a of arts) {
    const d = dst(a.x, a.y, P.x, P.y); if (d > 90) continue;
    const c = TINT[a.id], p = 0.6 + 0.4 * Math.sin(t * 3), al = clamp(1 - d / 90, 0, 1);
    const gr = ctx.createRadialGradient(a.x, a.y, 1, a.x, a.y, 16);
    gr.addColorStop(0, 'rgba(' + c + ',' + (0.8 * al * p) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(' + c + ',' + al + ')'; ctx.beginPath(); ctx.arc(a.x, a.y, 3.5, 0, 6.28); ctx.fill();
  }
}

/* ---------- кадр ---------- */
const shopImage = new Image();
if (SID_SHOP) shopImage.src = window.SID_SHOP_IMAGE;

// Coordinates below use the illustration's 345 × 410 layout.
function drawSidShop() {
  ctx.save();
  ctx.translate(BUNK.x0 + .75 * T, 1.25 * T);
  ctx.scale(9.5 * T / 345, 10.25 * T / 410);
  ctx.drawImage(shopImage, 0, 0, 345, 410);
  const sid = byS('sid');
  if (sid) {
    const t = sid.deskTime || 0, look = sid.deskLook || 0;
    const sx = shopImage.naturalWidth / 345, sy = shopImage.naturalHeight / 410;
    // The chair and shoulders stay fixed as he lifts his head from the ledger.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(171, 129, 10, 13, 0, 0, Math.PI * 2); ctx.clip();
    const lift = look * 2 + Math.sin(t * 1.7) * .25;
    ctx.drawImage(shopImage, 159 * sx, 113 * sy, 24 * sx, 32 * sy, 159, 113 - lift, 24, 32 + lift);
    ctx.restore();
    const turn = (t % 11 - 7) / 1.3;
    if (turn > 0 && turn < 1) {
      const angle = turn * Math.PI, fold = Math.sin(angle);
      // One hand slides from the desk edge to the corner of the sheet.
      ctx.drawImage(shopImage, 165 * sx, 156 * sy, 15 * sx, 17 * sy,
        165, 156, 15, 17 + 7 * fold);
      ctx.save(); ctx.translate(173, 178);
      ctx.transform(Math.cos(angle), -.22 * fold, 0, 1, 0, 0);
      ctx.drawImage(shopImage, 174 * sx, 178 * sy, 20 * sx, 20 * sy, 0, 0, 20, 20);
      ctx.restore();
    }
  }
  ctx.restore();
}
function render() {
  const sx = (Math.random() - 0.5) * shakeA, sy = (Math.random() - 0.5) * shakeA;
  if (P) {
    let tx = P.x, ty = P.y;
    if (!IN.touch && P.alive) { const w = screenToWorld(IN.mx, IN.my); tx += clamp(w.x - P.x, -260, 260) * 0.22; ty += clamp(w.y - P.y, -260, 260) * 0.22; }
    cam.x = lerp(cam.x, tx, 0.12); cam.y = lerp(cam.y, ty, 0.12);
    cam.x = clamp(cam.x, VW / 2 / Z, WW - VW / 2 / Z); cam.y = clamp(cam.y, VH / 2 / Z, WH - VH / 2 / Z);
  }
  if (SID_SHOP && P && inBunker(P.x, P.y)) {
    if (VW / Z >= 9.5 * T) cam.x = BUNK.x0 + 5.5 * T;
    if (VH / Z >= 10.25 * T) cam.y = 6.375 * T;
  }
  const vw = VW / Z, vh = VH / Z, vx = cam.x - vw / 2, vy = cam.y - vh / 2;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#121410'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (-vx * Z + sx), DPR * (-vy * Z + sy));
  const gx = clamp(Math.floor(vx), 0, WW), gy = clamp(Math.floor(vy), 0, WH);
  const gw = Math.min(WW - gx, Math.ceil(vw) + 2), gh = Math.min(WH - gy, Math.ceil(vh) + 2);
  const shopVisible = SID_SHOP && P && inBunker(P.x, P.y) && shopImage.complete && shopImage.naturalWidth;
  if (shopVisible) {
    ctx.save();
    ctx.beginPath(); ctx.rect(BUNK.x0 + .75 * T, 1.25 * T, 9.5 * T, 10.25 * T); ctx.clip();
    drawSidShop();
  }
  else drawGround(vx, vy, vw, vh);
  const inView = (x, y, m) => x > vx - m && x < vx + vw + m && y > vy - m && y < vy + vh + m;
  for (const d of decals) if (inView(d.x, d.y, 30)) {
    ctx.fillStyle = d.burn ? 'rgba(20,16,10,' + d.a + ')' : 'rgba(70,10,6,' + d.a + ')';
    if (d.burn) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.28); ctx.fill(); continue; }
    const h = Math.sin(d.x * 12.9898 + d.y * 78.233) * 43758.5453, q = h - Math.floor(h);   // стабильная неровная форма из той же записи decal
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * (0.75 + q * 0.5), d.r * (0.55 + (1 - q) * 0.35), q * 6.28, 0, 6.28); ctx.fill();
    if (d.r > 5) { ctx.beginPath(); ctx.ellipse(d.x + Math.cos(q * 9) * d.r * 0.9, d.y + Math.sin(q * 9) * d.r * 0.9, d.r * 0.35, d.r * 0.25, q * 3, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(d.x - Math.cos(q * 5) * d.r * 1.2, d.y - Math.sin(q * 5) * d.r * 1.1, d.r * 0.14, 0, 6.28); ctx.fill(); }
  }
  // костёр
  for (const F of [FIRE, FIRE2]) if (inView(F.x, F.y, FIRE_REACH)) { fireGroundLight(F); drawFlames(F); }
  for (const o of objs) {
    if (o.k === 'crate' && !(shopVisible && inBunker(o.x, o.y) && o.static) && inView(o.x, o.y, 40)) crateDraw(o);
    if (o.pick && inView(o.x, o.y, 30)) drawPick(o);
    if (o.k === 'genset' && G3.on && G3.pack && G3.pack.manifest.props && inView(o.x, o.y, 40) && !g7Prop(o)) gensetProc(ctx, o);
    if (o.k === 'body' && inView(o.x, o.y, 40)) drawBody(o);
    if (o.k === 'barrier' && inView(o.x, o.y, 60)) {
      ctx.fillStyle = '#4b4a42'; ctx.fillRect(o.x - 6, o.y, 8, o.h); ctx.fillRect(o.x + o.w - 2, o.y, 8, o.h);
      ctx.save(); ctx.translate(o.x, o.y + o.h / 2); if (!o.solid) ctx.rotate(-1.35);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#c8b440' : '#d9d4c4'; ctx.fillRect(i * o.w / 8, -3, o.w / 8, 6); }
      ctx.restore();
    }
  }
  drawCaches();
  drawAnoms();
  for (const b of bolts) {
    const k = Math.min(1, b.t / b.dur), x = lerp(b.x0, b.x1, k), y = lerp(b.y0, b.y1, k), h = Math.sin(k * Math.PI) * 18;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#c9c7bd'; ctx.fillRect(x - 2, y - h - 1.5, 4, 3);
  }
  for (const n of nades) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, 6.28); ctx.fill(); ctx.fillStyle = '#3d4a30'; ctx.beginPath(); ctx.arc(n.x, n.y - n.z * 0.15, 4, 0, 6.28); ctx.fill(); }
  const vis = ents.filter(e => e.alive && inView(e.x, e.y, 30)).sort((a, b) => a.y - b.y);
  for (const e of vis) {
    if (shopVisible && e.sid === 'sid') continue;
    if (e.kind === 'dog') drawDog(e); else if (e.kind === 'boar') drawBoar(e); else if (e.kind === 'sucker') drawSucker(e); else drawLitHuman(e);
    if (e !== P && e.hp < e.maxhp && hostile(e, P) && dE(e, P) < 450 && !HOUSES.some(h => h.a > 0.5 && e.x > h.x * T && e.x < (h.x + h.w) * T && e.y > h.y * T && e.y < (h.y + h.h) * T)) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 12, e.y - 20, 24, 3);
      ctx.fillStyle = '#d64541'; ctx.fillRect(e.x - 12, e.y - 20, 24 * e.hp / e.maxhp, 3);
    }
  }
  for (const t of tracers) { ctx.strokeStyle = 'rgba(255,230,160,' + (t.life / 0.07) * 0.8 + ')'; ctx.lineWidth = t.w; ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); }
  ctx.lineWidth = 1;
  for (const f of flashes) {
    if (f.big) continue;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
    ctx.fillStyle = 'rgba(255,220,120,0.95)'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(12, 0); ctx.lineTo(0, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,0.9)'; ctx.beginPath(); ctx.arc(1, 0, 3, 0, 6.28); ctx.fill(); ctx.restore();
  }
  for (const p of parts) { if (!inView(p.x, p.y, 20)) continue; const k = p.ml ? p.life / p.ml : 0; ctx.globalAlpha = p.ml ? clamp(Math.min(k * 1.4, (1 - k) * 6), 0, 1) * 0.26 : clamp(p.life * (p.smoke ? 0.5 : 3), 0, 1); ctx.fillStyle = p.c; if (p.smoke) { ctx.beginPath(); ctx.arc(p.x, p.y, p.ml ? p.s * (1 + (1 - k) * 2.2) : p.s * (2 - p.life * 0.3), 0, 6.28); ctx.fill(); } else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
  // крыши: скрывают дом, пока ты не внутри
  HOUSES.forEach((h, i) => {
    const hide = P && roofHidden(h);
    h.a = lerp(h.a, hide ? 0 : 1, 0.2);
    if (h.a < 0.03 || !inView(h.x * T + h.w * T / 2, h.y * T + h.h * T / 2, h.w * T)) return;
    if (C1 && SHADOWS) {   // тень дома вправо-вниз: две полосы, мягкий край; под крышей не видна
      const x0 = h.x * T, y0 = h.y * T, w = h.w * T, hh = h.h * T;
      ctx.fillStyle = 'rgba(6,8,4,' + 0.2 * h.a + ')'; ctx.fillRect(x0 + 6, y0 + 8, w + 16, hh + 18);
      ctx.fillStyle = 'rgba(6,8,4,' + 0.22 * h.a + ')'; ctx.fillRect(x0 + 4, y0 + 6, w + 10, hh + 11);
    }
    ctx.globalAlpha = h.a; drawHouseRoof(ctx, h, i, 1); ctx.globalAlpha = 1;
  });
  // провода ЛЭП
  const py0 = objs.filter(o => o.k === 'pylon');
  ctx.strokeStyle = 'rgba(20,20,18,0.55)'; ctx.lineWidth = 1;
  for (let i = 0; i + 1 < py0.length; i++) { const a = py0[i], b = py0[i + 1]; if (!inView(a.x, a.y, 600) && !inView(b.x, b.y, 600)) continue; [-6, 0, 6].forEach(o => { ctx.beginPath(); ctx.moveTo(a.x + 10 + o, a.y + 10 - o); ctx.quadraticCurveTo((a.x + b.x) / 2 + 10 + o, (a.y + b.y) / 2 + 30, b.x + 10 + o, b.y + 10 - o); ctx.stroke(); }); }
  drawCloudShadows();
  // кроны
  const margin = Math.ceil(CAN_SZ * CAN_PAD * Math.max(1, LONE_K) * .63 / T) + 1;
  const tx0 = Math.max(0, Math.floor(vx / T) - margin), tx1 = Math.min(MW - 1, Math.ceil((vx + vw) / T) + margin);
  const ty0 = Math.max(0, Math.floor(vy / T) - margin), ty1 = Math.min(MH - 1, Math.ceil((vy + vh) / T) + margin);
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    if (map[y * MW + x] !== TR) continue;
    // в глубине леса каждая вторая крона всё равно закрыта соседями: не рисуем её (меньше перерисовки на телефоне)
    if (CAN_SZ > 72 && (x + y) & 1 && map[y * MW + x - 1] === TR && map[y * MW + x + 1] === TR && map[(y - 1) * MW + x] === TR && map[(y + 1) * MW + x] === TR) continue;
    const h = hash2(x, y), cx = x * T + 16 + (h - 0.5) * 8, cy = y * T + 12 + (hash2(y, x) - 0.5) * 8;
    const sw = Math.sin(S.min * 0.8 + x * 0.7 + y) * 1.2;
    if (C1 && ART) {
      const nb = (map[y * MW + x - 1] === TR) + (map[y * MW + x + 1] === TR) + (map[(y - 1) * MW + x] === TR) + (map[(y + 1) * MW + x] === TR);
      // На сухой кромке у дороги даже тесная пара деревьев даёт
      // силуэты берёз и сухостоя. Используем уже существующие клетки деревьев.
      const verge = BIG && ARTM.autumn && ARTM.autumn.verge[y * MW + x] <= 3;
      const edge = nb <= 1 || (verge && nb === 2 && ARTM.autumn.water[y * MW + x] > 2);
      const ci = edge ? forestCrowns.length + Math.floor(h * edgeCrowns.length) : Math.floor(h * forestCrowns.length);
      const scale = .65 + hash2(x + 73, y + 13) * .52;
      const height = CAN_SZ * CAN_PAD * scale * (edge ? LONE_K : 1);
      const width = height * (.77 + .30 * hash2(y + 31, x));
      const crown = yardTreeCells.has(y * MW + x) ? yardTreeCrown : CANOPY[ci];
      drawAutumnCrown(crown, cx + sw, cy, width, height);
    } else {
      const sp = (.85 + h * .4) * CAN_SZ / 2 * CAN_PAD;
      ctx.globalAlpha = P && dst(cx, cy, P.x, P.y) < 30 ? .45 : 1;
      ctx.drawImage(CANOPY[Math.floor(h * 8)], cx - sp + sw, cy - sp, 2 * sp, 2 * sp);
    }
  }
  ctx.globalAlpha = 1;
  for (const c of crows) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.arc(c.x + 40, c.y + 60, 3, 0, 6.28); ctx.fill();
    const w = Math.sin(c.ph) * 5; ctx.strokeStyle = '#141412'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x - 7, c.y - w); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x + 7, c.y - w); ctx.stroke(); ctx.lineWidth = 1;
  }
  // имена дружественных рядом
  ctx.textAlign = 'center';
  for (const e of vis) {
    // стелс: «?» — враг насторожился, «!» — заметил
    if (e === P || !e.alive || !hostile(e, P) || e.kind !== 'human' && e.kind !== 'dog') continue;
    const aw = e.tgt === P ? (e.alertT = (e.alertT == null ? 1.5 : e.alertT)) && 1 : (e.alertT = null, e.aw || 0);
    if (e.tgt === P) { e.alertT -= 1 / 60; if (e.alertT <= 0) continue; }
    else if (aw < 0.25) continue;
    const red = e.tgt === P, y = e.y - 24;
    ctx.font = '800 11px Arial'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.fillStyle = red ? '#ff4a32' : 'rgba(246,196,70,' + clamp(0.35 + aw, 0, 1) + ')';
    ctx.strokeText(red ? '!' : '?', e.x, y); ctx.fillText(red ? '!' : '?', e.x, y);
    if (!red) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(e.x - 7, y + 3, 14, 2.5); ctx.fillStyle = '#f6c446'; ctx.fillRect(e.x - 7, y + 3, 14 * aw, 2.5); }
  }
  ctx.font = '600 ' + (BIG ? 7 : 9) + 'px "IBM Plex Mono", monospace';
  for (const e of vis) {
    if (BIG && !/names/.test(location.hash)) break;   // как в референсе: имя только в кнопке «Говорить»
    if (e === P || e.kind !== 'human' || hostile(e, P)) continue;
    const d = dE(e, P); if (d > 130) continue;
    if (HOUSES.some(h => h.a > 0.5 && e.x > h.x * T && e.x < (h.x + h.w) * T && e.y > h.y * T && e.y < (h.y + h.h) * T)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(e.name, e.x + 1, e.y - 18);
    ctx.fillStyle = e.fac === 'army' ? '#a9c79a' : '#e6dcb4'; ctx.fillText(e.name, e.x, e.y - 19);
  }
  drawBubbles(inView);
  // захват цели: уголки вокруг врага
  if (P && P.alive && P.lock && P.lock.alive) {
    const L = P.lock, r = L.r + 7, k = 6, on = Math.abs(angD(P.ang, Math.atan2(L.y - P.y, L.x - P.x))) < 0.12;
    ctx.strokeStyle = on ? 'rgba(235,80,60,0.95)' : 'rgba(235,190,90,0.8)'; ctx.lineWidth = 1.6;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => { ctx.beginPath(); ctx.moveTo(L.x + c[0] * r, L.y + c[1] * (r - k)); ctx.lineTo(L.x + c[0] * r, L.y + c[1] * r); ctx.lineTo(L.x + c[0] * (r - k), L.y + c[1] * r); ctx.stroke(); });
    if (P.hitT > 0) { const m = 5 + (P.killT > 0 ? 3 : 0); ctx.strokeStyle = P.killT > 0 ? 'rgba(255,70,50,0.95)' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x - m, L.y - m); ctx.lineTo(L.x - 2, L.y - 2); ctx.moveTo(L.x + m, L.y - m); ctx.lineTo(L.x + 2, L.y - 2); ctx.moveTo(L.x - m, L.y + m); ctx.lineTo(L.x - 2, L.y + 2); ctx.moveTo(L.x + m, L.y + m); ctx.lineTo(L.x + 2, L.y + 2); ctx.stroke(); }
    ctx.lineWidth = 1;
  }
  // свет, цвет, ночь
  if (shopVisible) ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  if (GRADE.mul) { ctx.fillStyle = GRADE.mul; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalCompositeOperation = 'source-over';
  const bunk = P && inBunker(P.x, P.y);
  const dk = bunk ? (SID_SHOP ? 0.32 : 0.62) : darkness();
  const toS = (x, y) => [(x - vx) * Z / 2 + sx / 2, (y - vy) * Z / 2 + sy / 2];
  const LW = lightC.width, LH = lightC.height;
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, LW, LH);
  if (dk > 0.02) {
    lctx.fillStyle = 'rgba(4,7,12,' + dk + ')'; lctx.fillRect(0, 0, LW, LH);
    lctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const s = toS(x, y), rr = r * Z / 2; if (s[0] < -rr || s[1] < -rr || s[0] > LW + rr || s[1] > LH + rr) return; const g = lctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], rr); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.beginPath(); lctx.arc(s[0], s[1], rr, 0, 6.28); lctx.fill(); };
    if (P.alive && S.torch === false) hole(P.x, P.y, 60, 0.45);   // без фонаря: только тусклый круг
    else if (P.alive) {
      hole(P.x, P.y, 95, 0.75);
      const s = toS(P.x, P.y), L = 330 * Z / 2;
      const g = lctx.createRadialGradient(s[0], s[1], 4, s[0], s[1], L);
      g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.7, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.moveTo(s[0], s[1]); lctx.arc(s[0], s[1], L, P.ang - 0.42, P.ang + 0.42); lctx.closePath(); lctx.fill();
    }
    hole(FIRE.x, FIRE.y, 200 * fireFlick() + 30, 0.95);
    if (villageLit()) LOC.village.anchors.lamps.forEach((l, i) => hole(l[0] * T, l[1] * T, 120 + Math.sin(S.min * 3 + i) * 3, 0.85));
    hole(FIRE2.x, FIRE2.y, 170 + Math.sin(S.min * 8) * 8, 0.9);
    if (bunk) { hole(RMp(126.5 * T, 7 * T)[0], RMp(126.5 * T, 7 * T)[1], 260 + Math.sin(S.min * 30) * 3, 0.9); hole(RMp(124.5 * T, 3.5 * T)[0], RMp(124.5 * T, 3.5 * T)[1], 120, 0.7); }
    for (const f of flashes) hole(f.x, f.y, f.big ? 260 : 130, 0.9);
    for (const a of anoms) if (a.k === 'e') hole(a.x, a.y, 70 + a.fx * 120, 0.5);
    for (const a of arts) hole(a.x, a.y, 40, 0.6);
    ents.forEach(e => { if (e !== P && e.alive && e.kind === 'human' && !(SID_SHOP && e.sid === 'sid') && !e.sit && !e.captive && e.fac !== 'bandit' && dE(e, P) < 700) { const s = toS(e.x, e.y), L = 180 * Z / 2; const g2 = lctx.createRadialGradient(s[0], s[1], 2, s[0], s[1], L); g2.addColorStop(0, 'rgba(0,0,0,0.7)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g2; lctx.beginPath(); lctx.moveTo(s[0], s[1]); lctx.arc(s[0], s[1], L, e.ang - 0.35, e.ang + 0.35); lctx.closePath(); lctx.fill(); } });
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightC, 0, 0, VW, VH);
    // тёплый свет костра поверх
    const fs = toS(FIRE.x, FIRE.y);
    const fg = ctx.createRadialGradient(fs[0] * 2, fs[1] * 2, 0, fs[0] * 2, fs[1] * 2, 160 * Z);
    fg.addColorStop(0, 'rgba(255,150,60,' + (0.22 * dk * fireFlick()) + ')'); fg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, VW, VH);
    // лампы деревни после ремонта генератора: тёплые пятна света (процедурно; растр ламп ожидается)
    if (villageLit()) LOC.village.anchors.lamps.forEach((l, i) => { const s2 = toS(l[0] * T, l[1] * T), lg = ctx.createRadialGradient(s2[0] * 2, s2[1] * 2, 0, s2[0] * 2, s2[1] * 2, 110 * Z);
      lg.addColorStop(0, 'rgba(255,214,140,' + (0.32 * dk) + ')'); lg.addColorStop(0.15, 'rgba(255,200,120,' + (0.16 * dk) + ')'); lg.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(255,240,200,' + (0.9 * dk) + ')'; ctx.beginPath(); ctx.arc(s2[0] * 2, s2[1] * 2, 3 * Z, 0, 6.28); ctx.fill(); });
  }
  for (const f of flashes) if (f.big) { const s = toS(f.x, f.y); const g = ctx.createRadialGradient(s[0] * 2, s[1] * 2, 0, s[0] * 2, s[1] * 2, 140 * Z); g.addColorStop(0, f.blue ? 'rgba(180,220,255,0.6)' : 'rgba(255,200,120,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  drawWeatherScreen();
  // откуда стреляют: красные дуги по краю экрана
  if (P && P.alive) HURTDIR.forEach(h => {
    const cx = VW / 2, cy = VH / 2, R = Math.min(VW, VH) * 0.42, a = h.a;
    ctx.strokeStyle = 'rgba(220,40,30,' + Math.min(0.85, h.life) + ')'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a - 0.22, a + 0.22); ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
  });
  ctx.drawImage(vignetteC, 0, 0, VW, VH);
  if (fadeT > 0) { ctx.fillStyle = 'rgba(0,0,0,' + clamp(1 - Math.abs(fadeT - 0.25) / 0.25, 0, 1) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (radRate > 0.3 || S.rad > 40) { ctx.fillStyle = 'rgba(120,140,40,' + clamp(radRate * 0.03 + (S.rad - 40) * 0.002, 0, 0.18) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (hurtFlash > 0) { ctx.fillStyle = 'rgba(150,20,10,' + hurtFlash * 0.45 + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (P && P.alive && P.hp < 30) { ctx.fillStyle = 'rgba(120,10,5,' + (0.12 + 0.08 * Math.sin(S.min * 6)) + ')'; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = ctx.createPattern(grainC, 'repeat');
  ctx.save(); ctx.translate(Math.random() * 128, Math.random() * 128); ctx.fillRect(-128, -128, VW + 256, VH + 256); ctx.restore();
  drawSticks();
}
function drawSticks() {
  if (!IN.touch) return;
  [IN.left, IN.aimStick].forEach((s, i) => {
    if (!s) return;
    ctx.strokeStyle = 'rgba(216,210,188,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.ox, s.oy, 56, 0, 6.28); ctx.stroke();
    ctx.fillStyle = i ? (IN.touchFire ? 'rgba(214,69,65,0.55)' : 'rgba(220,147,48,0.45)') : 'rgba(216,210,188,0.35)';
    ctx.beginPath(); ctx.arc(s.ox + s.dx * 56, s.oy + s.dy * 56, 22, 0, 6.28); ctx.fill();
  });
  ctx.lineWidth = 1;
}
