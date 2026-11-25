/* ===================== отрисовка ===================== */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d', { alpha: false });
// Keep the HUD at native CSS resolution. Only the world canvas and terrain cache use the mobile budget.
const touchRenderer = matchMedia('(pointer: coarse)').matches;
let touchDensity = 1.25;
function sizeWorldCanvas() {
  const limit = touchRenderer ? Math.min(touchDensity, Math.sqrt(600000 / (VW * VH))) : 2;
  DPR = Math.min(window.devicePixelRatio || 1, limit);
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
}
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
let canopyCompanion = null;
const nearCrown = document.createElement('canvas'), nearCtx = nearCrown.getContext('2d');
function drawAutumnCrown(sprite, x, y, w, h) {
  if (w <= 0 || h <= 0) return;
  const left = x - w / 2, top = y - h / 2, radius = 36;
  const nearPlayer = P && Math.abs(x-P.x)<=w/2+radius && Math.abs(y-P.y)<=h/2+radius;
  const e=canopyCompanion, nearNpc=e && Math.abs(x-e.x)<=w/2+radius && Math.abs(y-e.y)<=h/2+radius;
  if (!nearPlayer && !nearNpc) {
    ctx.drawImage(sprite, left, top, w, h); return;
  }
  if (nearCrown.width!==sprite.width || nearCrown.height!==sprite.height){
    nearCrown.width=sprite.width;nearCrown.height=sprite.height;
  }
  nearCtx.globalCompositeOperation = 'copy'; nearCtx.drawImage(sprite, 0, 0);
  nearCtx.globalCompositeOperation = 'destination-out';
  const kx = sprite.width / w, ky = sprite.height / h;
  if (nearNpc) nearCtx.drawImage(canopyWindow,(e.x-radius-left)*kx,(e.y-radius-top)*ky,radius*2*kx,radius*2*ky);
  if (nearPlayer) nearCtx.drawImage(canopyWindow, (P.x - radius - left) * kx, (P.y - radius - top) * ky, radius * 2 * kx, radius * 2 * ky);
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
  const fire=WORLD_FIRES.find(f=>fireLit(f) && Math.abs(e.x-f.x)<FIRE_REACH && Math.abs(e.y-f.y)<FIRE_REACH);
  const wet=e===P ? S.flags.coatWetness||0 : 0;
  if(!fire && wet<.03){drawHuman(e,ctx);return;}
  const dx = fire ? fire.x-e.x : 0, dy = fire ? fire.y-e.y : 0, distance = Math.hypot(dx, dy);
  if (distance >= FIRE_REACH && wet<.03) { drawHuman(e, ctx); return; }

  // Маска — альфа текущей позы. Градиент ориентирован в мире, даже когда герой поворачивается.
  const g = figureCtx;
  g.setTransform(2, 0, 0, 2, 96, 96);
  g.clearRect(-48, -48, 96, 96);
  g.save(); g.translate(-e.x, -e.y); drawHuman(e, g); g.restore();
  if(wet>=.03){
    g.save();g.rotate(e.ang);g.globalCompositeOperation='source-atop';
    const patch=g.createRadialGradient(-7,0,4,-5,0,20);
    patch.addColorStop(0,'rgba(26,27,22,.50)');patch.addColorStop(.60,'rgba(33,35,28,.39)');patch.addColorStop(1,'transparent');
    g.globalAlpha=wet;g.fillStyle=patch;g.fillRect(-26,-22,46,44);
    g.restore();
  }
  if(fire && distance<FIRE_REACH){
    const k = 12 / Math.max(1, distance);
    const tint = g.createLinearGradient(-dx * k, -dy * k, dx * k, dy * k);
    tint.addColorStop(0, 'rgba(255,150,65,0)');
    tint.addColorStop(.49, 'rgba(255,150,65,0)');
    tint.addColorStop(.73, 'rgba(255,171,93,.22)');
    tint.addColorStop(1, 'rgb(255,166,83)');
    g.save(); g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = .55 * (1 - distance / FIRE_REACH) * fireFlick();
    g.fillStyle = tint; g.fillRect(-48, -48, 96, 96);
    if(inhabited){
      const back=g.createLinearGradient(-dx*k,-dy*k,dx*k,dy*k);
      back.addColorStop(0,'#1a1c21');back.addColorStop(.54,'transparent');back.addColorStop(1,'transparent');
      g.globalAlpha=.35*(1-distance/FIRE_REACH)*darkness();g.fillStyle=back;g.fillRect(-48,-48,96,96);
    }
    g.restore();
  }
  ctx.drawImage(figureC, e.x - 48, e.y - 48, 96, 96);
}
let hearthSmokeImage;
function drawHearthSmoke(p, age) {
  if (!hearthSmokeImage) {
    const c=document.createElement('canvas'); c.width=c.height=40;
    const g=c.getContext('2d');
    for (const [x,y,r] of [[17,19,15],[25,16,12],[22,23,13]]) {
      const haze=g.createRadialGradient(x,y,0,x,y,r);
      haze.addColorStop(0,'rgba(170,167,157,.83)'); haze.addColorStop(1,'rgba(139,137,130,0)');
      g.fillStyle=haze;g.fillRect(x-r,y-r,r*2,r*2);
    }
    hearthSmokeImage=c;
  }
  const size=p.s*(2.5+age*6);
  ctx.drawImage(hearthSmokeImage,p.x-size,p.y-size,size*2,size*2);
}
function fireGroundLight(fire) {
  const r = FIRE_REACH;
  const glow = ctx.createRadialGradient(fire.x, fire.y, 5, fire.x, fire.y, r);
  glow.addColorStop(0, 'rgba(255,159,72,' + (BIG ? .24 : .34) + ')');
  glow.addColorStop(.42, 'rgba(236,133,48,' + (BIG ? .09 : .16) + ')');
  glow.addColorStop(1, 'rgba(224,115,40,0)');
  ctx.save();ctx.clip(lightFootprint(fire,0,Math.PI,r));ctx.globalAlpha = fireFlick(); ctx.fillStyle = glow;
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
  VW = window.innerWidth; VH = window.innerHeight;
  sizeWorldCanvas();
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
const GCH = 512, GCACHE = new Map(), GS = BIG && !touchRenderer && !/gs1/.test(location.hash) ? 2 : 1, GMAX = GS > 1 ? 24 : 30;   // GS: пикселей земли на единицу (камера ближе — земля чёткая)
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
    else { const H = GCH * GS, sh = touchRenderer ? 128 : GS > 1 ? 256 : H; p.gy = p.gy || 0; if (ART) c1Grade(p.c, 0, p.gy, H, Math.min(sh, H - p.gy)); p.gy += sh; done = !ART || p.gy >= H; }   // цвет отдельными шагами-полосами
  } while (all && !done);
  p.ms += performance.now() - t0;
  if (!all) gStat.stepMax = Math.max(gStat.stepMax || 0, Math.round(performance.now() - t0));
  if (done) {
    p.g.setTransform(1, 0, 0, 1, 0, 0);
    // A visible chunk can fill the last slot while a background chunk is pending.
    if (GCACHE.size >= GMAX && !GCACHE.has(p.key)) GCACHE.delete(GCACHE.keys().next().value);
    GCACHE.set(p.key, p.c);
    gStat.painted++; gStat.ms = Math.round(p.ms);
    gStat.step = Math.max(gStat.step || 0, Math.round(performance.now() - t0));
  }
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
  if (GPEND) { const t0 = performance.now(); do { gStat.steps = (gStat.steps || 0) + 1; if (chunkStep(GPEND, false)) { GPEND = null; break; } } while (performance.now() - t0 < (touchRenderer ? 2 : 5)); return; }   // короткие шаги — несколько за кадр, чтобы соседний кусок успевал до подхода
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
      case GR: case TR: case BU: case DI: case AS: case SW: grass(); break;
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
  if (ART) yield* artGround(g);
  else yield* paintSurfaceLayers(g,surfaceTiles(),BIG && C1);
  if (perspective && ART) {paintHills(g); paintRailSlopes(g);}
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
  drawWorldTracks(g,GWP);
  if(ART && C1)paintBuildingFeet(g);
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
  for(const h of HOUSES)if(h.interior && h.x<=GW.x1 && h.x+h.w>=GW.x0 && h.y<=GW.y1 && h.y+h.h>=GW.y0)drawRoomMarks(g,h);
  drawThresholds(g);
  yield;
  drawLesserDetails(g);
  drawDumpDetails(g,GWP);
  drawCordonDetails(g);
  drawTrailSigns(g);
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
  // Beyond the playable grid the woodland continues on the ground cache only.
  if(BIG && ART && C1){
    for(let y=GW.y0;y<=GW.y1;y++)for(let x=GW.x0;x<=GW.x1;x++){
      if(x>=PW || map[y*MW+x]!==VO)continue;
      artFill(g,'grass_dry',x*T,y*T,T,T);
    }
  }
  // Upper floors have a separate camera. Hide their working tiles beyond the outdoor boundary.
  if(BIG && GWP.x1>PW*T) for(const r of lofts){
    g.fillStyle='#080a07';g.fillRect(r.x*T-3,r.y*T-3,r.w*T+14,r.h*T+16);
  }
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
  if (lesserSprites.block) {
    spriteShadow(g,2,1);
    const sprite=lesserSprites.block, height=Math.max(h+3,w*sprite.height/sprite.width);
    g.drawImage(sprite,0,h-height,w,height);
    g.restore();return;
  }
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
// Ворота и насыпь запекаются в тот же слой, что и окружающая земля.
const gateWidth = 174, gateHeight = 131;
let gateTerrain = null;
async function prepareShopGate() {
  if (!SID_SHOP) return;
  const im=new Image(); im.src=window.SID_GATE_IMAGE;
  try { await im.decode(); } catch { return; }
  const c=document.createElement('canvas'); c.width=im.width; c.height=im.height;
  const g=c.getContext('2d'); g.drawImage(im,0,0);
  g.scale(c.width/2,c.height/2);
  if(villageAtmosphere){
    // The lamp is painted directly onto the hatch, so it follows the sloped stair texture.
    g.save();g.translate(1.06,.85);g.scale(.32,.55);
    const lamp=g.createRadialGradient(.18,-.26,0,0,0,1);
    lamp.addColorStop(0,'rgba(255,183,91,.58)');lamp.addColorStop(.48,'rgba(226,146,65,.28)');
    lamp.addColorStop(1,'rgba(198,125,54,0)');g.fillStyle=lamp;g.fillRect(-1,-1,2,2);g.restore();
    g.fillStyle='#544438';g.fillRect(1.17,.66,.055,.067);
    g.fillStyle='#ebbe81';g.fillRect(1.178,.68,.036,.025);
  }
  const fade=g.createRadialGradient(1,1,.74,1,1,1.04);
  fade.addColorStop(0,'#fff'); fade.addColorStop(.85,'rgba(255,255,255,.15)'); fade.addColorStop(1,'transparent');
  g.globalCompositeOperation='destination-in'; g.fillStyle=fade; g.fillRect(0,0,2,2);
  gateTerrain=c;
  const gate=objs.find(o=>o.k==='hatch');
  gate.x=HATCH.x-gateWidth/2; gate.y=HATCH.y-gateHeight*.79; gate.w=gateWidth; gate.h=gateHeight;
  for (const [left,top,w,h] of [[.13,.28,.19,.43],[.68,.28,.19,.43],[.32,.20,.36,.09]]) {
    addObj({k:'gateFrame',x:gate.x+gate.w*left,y:gate.y+gate.h*top,w:gate.w*w,h:gate.h*h,solid:1});
  }
}
function drawStaticObj(g, o) {
  if(o.k==='roomFitting'){drawRoomFitting(g,o);return;}
  if(o.k==='partition'){paintPartition(g,o);return;}
  if(o.k==='stairRun')return;
  if (perspective && ART && objectHeight[o.k]) {
    groundShadow(g,o.x+o.w*.5,o.y+o.h*.5,o.w*.49,o.h*.44,0,2);
    return;
  }
  paintStaticObject(g,o);
}
function paintStaticObject(g,o) {
  if (o.k==='freightWagon' && lesserSprites[o.sprite]) {
    g.save();spriteShadow(g,3,2);g.drawImage(lesserSprites[o.sprite],o.x,o.y,o.w,o.h);g.restore();return;
  }
  if(o.k==='scrapCrane' && lesserSprites['scrap-crane']){
    const im=lesserSprites['scrap-crane'],w=4.6*T,h=w*im.height/im.width;
    g.save();spriteShadow(g,3,2);g.drawImage(im,o.x-.12*T,o.y+o.h-h,w,h);g.restore();return;
  }
  if (o.k==='hatch' && gateTerrain) { g.drawImage(gateTerrain,o.x,o.y,o.w,o.h); return; }
  if (o.k==='trafo' && lesserSprites.transformer) {
    g.save(); spriteShadow(g,6,2);
    g.drawImage(lesserSprites.transformer,o.x-2,o.y-3,o.w+4,o.h+4);
    g.restore(); return;
  }
  if (BIG && o.k==='blocks' && !o.roadblock) {
    const count=Math.max(1,Math.round(o.w/54)), stride=o.w/count;
    for (let i=0;i<count;i++) drawRoadblock(g,{x:o.x+i*stride,y:o.y+3,w:stride-2,h:o.h-3});
    return;
  }
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
function drawPlayerAim() {
  const ray=P.aimRay, lock=P.lock;
  ctx.save();
  if (ray && sightInstalled(S.weapon)) {
    const muzzle=muzzlePoint(P,P.ang);
    const along=(muzzle.x-P.x)*ray.ca+(muzzle.y-P.y)*ray.sa;
    if (along<ray.t) {
      const dx=P.x+ray.ca*ray.t-muzzle.x, dy=P.y+ray.sa*ray.t-muzzle.y;
      const length=Math.hypot(dx,dy);
      if (length>0) {
        const visible=rayWall(muzzle.x,muzzle.y,dx/length,dy/length,length);
        ctx.strokeStyle=(sightInstalled(S.weapon)&2) || P.shotFlash>0 ? '#e66c52' : 'rgba(244,240,224,.84)';
        ctx.setLineDash([4/Z,4/Z]);ctx.lineWidth=1.35/Z;ctx.beginPath();ctx.moveTo(muzzle.x,muzzle.y);
        ctx.lineTo(muzzle.x+dx*visible/length,muzzle.y+dy*visible/length);ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);
  if (lock?.alive) {
    ctx.strokeStyle='rgba(245,181,104,.95)'; ctx.lineWidth=1.65/Z;
    const r=lock.r-(lock.captive ? 4 : 0);
    for (let i=0;i<4;i++) {
      const a=i*Math.PI/2+.4;
      ctx.beginPath();ctx.arc(lock.x,lock.y,r,a,a+.76);ctx.stroke();
    }
  }
  if (P.hitT>0 && P.impact) {
    const {x,y,kill}=P.impact;
    ctx.strokeStyle=kill?'#ff6754':'#fff6da';ctx.lineWidth=2/Z;
    ctx.beginPath();
    for (const dx of [-1,1]) for (const dy of [-1,1]) {
      ctx.moveTo(x+dx*3/Z,y+dy*3/Z);ctx.lineTo(x+dx*7/Z,y+dy*7/Z);
    }
    ctx.stroke();
  }
  ctx.restore();
}
// Keep the ground, actor and baked shadows directly beneath a projecting roof visible.
const eaveView=document.createElement('canvas');
eaveView.width=eaveView.height=120;
const eaveCtx=eaveView.getContext('2d');
function captureEave(h){
  const w=h.w*T,d=h.h*T;
  const gap=Math.max(h.x*T-P.x,P.x-(h.x*T+w),h.y*T-P.y,P.y-(h.y*T+d));
  const lift=h.residenceWalls && perspective?roofLift(h):0;
  const reach=lift && P.y<h.y*T?47+residenceTilt*lift/(1+lift):47;
  if(gap>reach || h.a<.03)return false;
  const m=ctx.getTransform(),left=P.x-36,top=P.y-36;
  eaveCtx.clearRect(0,0,120,120);
  eaveCtx.drawImage(ctx.canvas,m.a*left+m.e,m.d*top+m.f,72*m.a,72*m.d,0,0,120,120);
  eaveCtx.globalCompositeOperation='destination-in';
  eaveCtx.drawImage(canopyWindow,0,0,120,120);
  eaveCtx.globalCompositeOperation='source-over';
  return true;
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
    if (e === P && DETECTORS[S.weapon]) drawHeldDetector(g, S.weapon, 10, 4);
    else if (e===P && (S.weapon==='hands' || S.weapon==='guitar')) { /* bare hands below */ }
    else if (W.melee) { g.fillStyle = '#9a9a92'; g.fillRect(10, 4, 9, 2); }
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
  const t=S.min;
  for (const a of anoms) {
    if (Math.abs(a.x-cam.x)>VW/(2*Z)+2*a.r || Math.abs(a.y-cam.y)>VH/(2*Z)+2*a.r) continue;
    const phase=anomalyPhase(a), electric=a.k==='e';
    const vis=Math.max(a.reveal>0 ? .92 : 0, clamp(1-(dE(a,P)-a.r)/225,0,.85),a.fx);
    if (!vis) continue;
    ctx.save(); ctx.translate(a.x,a.y); ctx.globalAlpha*=vis;
    drawFieldDebris(a,phase,t);
    if (electric) {
      const live=phase==='active', warning=phase==='warning';
      const glow=ctx.createRadialGradient(0,0,2,0,0,a.r*1.22);
      const light=live ? .34 : warning ? .14 : .035;
      glow.addColorStop(0,'rgba(154,202,220,'+(light+a.fx*.18)+')');
      glow.addColorStop(.70,'rgba(129,179,205,'+light*.65+')');
      glow.addColorStop(1,'rgba(118,171,202,0)');
      ctx.fillStyle=glow; ctx.fillRect(-a.r*1.22,-a.r*1.22,a.r*2.44,a.r*2.44);
      if (live || warning || a.fx>.3) {
        const frame=Math.floor(t*(live?8:4))+a.offset;
        const radius=a.r*(live ? .96 : .52);
        ctx.strokeStyle=live?'#b7e7ff':'#8daeb5'; ctx.lineWidth=live?1.35:.9;
        for (let arm=0;arm<(live?3:1);arm++) {
          const angle=arm*2.29+frame*1.37, cos=Math.cos(angle),sin=Math.sin(angle);
          ctx.beginPath(); ctx.moveTo(-cos*radius*.18,-sin*radius*.18);
          for (let j=1;j<=6;j++){
            const along=radius*j/6, side=Math.sin(frame*4.1+j*2.63+arm)*radius*.18;
            const x=cos*along-sin*side,y=sin*along+cos*side;
            ctx.lineTo(x,y);
            if (j===3 && live) { ctx.lineTo(x+cos*7+sin*9,y+sin*7-cos*9); ctx.moveTo(x,y); }
          }
          ctx.stroke();
        }
      }
    } else {
      const pulse=gravityClock(a), quiet=phase==='quiet', warning=phase==='warning';
      // Grains have a ground shadow. During the calm they stay on the ground;
      // then lift and spiral inward before the grab.
      for (let i=0;i<18;i++) {
        const seed=i*2.399+a.offset;
        const motion=quiet ? 0 : warning ? (pulse-GRAVITY_CALM)*.65 : GRAVITY_WARNING*.65+(pulse-GRAVITY_CALM-GRAVITY_WARNING)*2.8;
        const angle=seed+motion, r=a.r*(.26+.70*((i*17%19)/19));
        const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
        const lift=quiet ? 0 : warning ? (pulse-GRAVITY_CALM)*3 : 4+Math.sin(t*5+seed)*2;
        ctx.fillStyle='rgba(32,26,18,.55)'; ctx.fillRect(x+1,y+1,3,1.4);
        ctx.fillStyle=i%3?'#997e58':'#c3aa7e'; ctx.fillRect(x,y-lift,i%3?2.6:3.8,1.5);
      }
      if (!quiet || a.fx>0) {
        ctx.lineWidth=1.2; ctx.strokeStyle=warning?'rgba(220,192,146,.55)':'rgba(211,190,149,.38)';
        for(let i=0;i<3;i++) {
          const radius=a.r*(.26+.69*(1-((t*1.2+i/3)%1)));
          ctx.beginPath();ctx.arc(0,0,radius,t+i*2,t+i*2+2.3);ctx.stroke();
        }
      }
    }
    if (a.reveal>0) {
      ctx.setLineDash([4,7]);ctx.lineWidth=1;
      ctx.strokeStyle=electric?'rgba(162,207,215,.48)':'rgba(208,180,133,.55)';
      ctx.beginPath();ctx.arc(0,0,a.r,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }

  const range = activeDetectorRange();
  if (range) for (const a of arts) {
    const d = dE(a, P); if (d > range) continue;
    const c = TINT[a.id], p = 0.6 + 0.4 * Math.sin(t * 3), al = 1 - 0.65 * d / range;
    const gr = ctx.createRadialGradient(a.x, a.y, 1, a.x, a.y, 16);
    gr.addColorStop(0, 'rgba(' + c + ',' + (0.8 * al * p) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(' + c + ',' + al + ')'; ctx.beginPath(); ctx.arc(a.x, a.y, 3.5, 0, 6.28); ctx.fill();
  }
}

/* ---------- кадр ---------- */
const shopImage = new Image(), deskPoses = new Image();
function shopCamera(center, start, span, view) {
  return view >= span ? start+span/2 : clamp(center, start+view/2, start+span-view/2);
}
if (SID_SHOP) {
  shopImage.src = window.SID_SHOP_IMAGE;
  deskPoses.src = window.SID_DESK_POSES;
}

// Маски кистей в координатах трёх кадров. Колени и табурет скрывает столешница.
const deskHands = [
  [[63,88,21,13]],
  [[42,73,13,12],[82,89,10,13]],
  [[54,99,13,22],[80,87,10,13]]
];
function drawDeskTrader(e) {
  const talking = panel && panel.kind === 'trader';
  const trading = panel && panel.kind === 'trade' && !panel.e;
  const pose = trading ? 2 : (talking || e.deskLook > .65 ? 1 : 0);
  const breath = Math.sin((e.deskTime || 0)*1.8)*.25 + (humanMotionOn && talking ? .7 : 0);
  // Общая опора у всех трёх поз. Локти и свёрток заходят на край прилавка.
  ctx.save();
  ctx.translate(e.x-16, e.y-10+breath);
  ctx.scale(.25,.25);
  ctx.beginPath();
  ctx.rect(0,0,128,(SHOP_ROOM.counterY*T-e.y+10-breath)*4);
  for(const [x,y,rx,ry] of deskHands[pose]) {
    ctx.moveTo(x+rx,y); ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);
  }
  ctx.clip();
  spriteShadow(ctx, 2, 1.4);
  ctx.drawImage(deskPoses, pose*128,0,128,128, 0,0,128,128);
  ctx.restore();
}
const reducedCameraMotion = matchMedia('(prefers-reduced-motion: reduce)');
function drawCordonCanopies(vx,vy,vw,vh,shopVisible,loft){
  // кроны
  const margin = Math.ceil(CAN_SZ * CAN_PAD * Math.max(1, LONE_K) * .63 / T) + 1;
  const tx0 = Math.max(0, Math.floor(vx / T) - margin), tx1 = Math.min(MW - 1, Math.ceil((vx + vw) / T) + margin);
  const ty0 = Math.max(0, Math.floor(vy / T) - margin), ty1 = Math.min(MH - 1, Math.ceil((vy + vh) / T) + margin);
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    const tile=map[y*MW+x];
    const backdrop=BIG && x<PW && tile===VO && !shopVisible && !loft && hash2(x+17,y)>.73;
    if (tile!==TR && !backdrop) continue;
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
      if (perspective) drawLayeredCrown(crown, cx + sw, cy, width, height,
        crown === yardTreeCrown ? 'yard' : edge ? edgeCrowns[ci-forestCrowns.length] : forestCrowns[ci]);
      else drawAutumnCrown(crown, cx + sw, cy, width, height);
    } else {
      const sp = (.85 + h * .4) * CAN_SZ / 2 * CAN_PAD;
      drawAutumnCrown(CANOPY[Math.floor(h*8)],cx+sw,cy,2*sp,2*sp);
    }
  }
}
function render() {
  let sx = (Math.random() - 0.5) * shakeA, sy = (Math.random() - 0.5) * shakeA;
  const dizzy=clamp(((S?.flags.dizzyUntil||0)-(S?.min||0))/10,0,1);
  if(dizzy && !reducedCameraMotion.matches){sx+=dizzy*2.6*Math.sin(S.min*1.4);sy+=dizzy*1.9*Math.sin(S.min*.89);}
  if (S && P && S.blow?.stage && !sheltered(P.x, P.y) && !reducedCameraMotion.matches) {
    const t = S.blow.t;
    const power=S.blow.stage===2?2.4:.35+.55*clamp(1-t/42,0,1);
    sx += power*(Math.sin(t*18)+.3*Math.sin(t*27));
    sy += power*.72*Math.sin(t*22);
  }
  if (P) {
    let tx = P.x, ty = P.y;
    if (!IN.touch && P.alive) { const w = screenToWorld(IN.mx, IN.my); tx += clamp(w.x - P.x, -260, 260) * 0.22; ty += clamp(w.y - P.y, -260, 260) * 0.22; }
    cam.x = lerp(cam.x, tx, 0.12); cam.y = lerp(cam.y, ty, 0.12);
    cam.x = clamp(cam.x, VW / 2 / Z, WW - VW / 2 / Z); cam.y = clamp(cam.y, VH / 2 / Z, WH - VH / 2 / Z);
  }
  if (SID_SHOP && P && inBunker(P.x, P.y)) {
    cam.x = shopCamera(cam.x, STAIRS.x-SHOP_ROOM.width*T/2, SHOP_ROOM.width*T, VW/Z);
    cam.y = shopCamera(cam.y, SHOP_ROOM.top*T, SHOP_ROOM.height*T, VH/Z);
  }
  const loft=P && loftAt(P);
  if(loft){cam.x=shopCamera(cam.x,loft.x*T,loft.w*T,VW/Z);cam.y=shopCamera(cam.y,loft.y*T,loft.h*T,VH/Z);}
  const vw = VW / Z, vh = VH / Z, vx = cam.x - vw / 2, vy = cam.y - vh / 2;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#121410'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (-vx * Z + sx), DPR * (-vy * Z + sy));
  const gx = clamp(Math.floor(vx), 0, WW), gy = clamp(Math.floor(vy), 0, WH);
  const gw = Math.min(WW - gx, Math.ceil(vw) + 2), gh = Math.min(WH - gy, Math.ceil(vh) + 2);
  const shopVisible = SID_SHOP && P && inBunker(P.x, P.y) && shopImage.complete && shopImage.naturalWidth;
  if (shopVisible) {
    ctx.save();
    const width=SHOP_ROOM.width*T, height=SHOP_ROOM.height*T, x=STAIRS.x-width/2, y=SHOP_ROOM.top*T;
    ctx.beginPath(); ctx.rect(x,y,width,height); ctx.clip();
    ctx.drawImage(shopImage,x,y,width,height);
    drawDeskRadio();
  }
  else if(loft){ctx.save();ctx.beginPath();ctx.rect(loft.x*T,loft.y*T,loft.w*T,loft.h*T);ctx.clip();drawLoft(loft);}
  else drawGround(vx, vy, vw, vh);
  const inView = (x, y, m) => x > vx - m && x < vx + vw + m && y > vy - m && y < vy + vh + m;
  if (!BEREZKI && perspective && ART && !shopVisible && !loft) drawWorldRelief(inView);
  if(!BEREZKI && villageAtmosphere && ART && (livingZone?ditchWater:WX.rain)>.02 && !shopVisible && !loft && inView(HATCH.x,HATCH.y,190))
    paintHatchRuts(ctx,true);
  if(livingZone){
    if(ART && C1 && !loft && !shopVisible){drawRoadWetness(vx,vy,vw,vh);drawRunoff(inView);}
    drawBootMarks(loft,inView);
  }
  if(!loft && !shopVisible){drawLampShadows(inView);if(ART && C1)drawAtpOccupation(inView);}
  for(const o of objs){
    if(o.k!=='body' || o.kind==='sack')continue;
    const at=o.deathSpot||o;
    if(inView(at.x,at.y,23)){
      const fx=BODYFX.get(o);
      bloodPool(o,fx?clamp((G7.vt-fx.t0)/.38,0,1):1);
    }
  }
  const patient=byS('tolik'), blood=patient?.wounded?patient:S.flags.tolikBlood;
  if(blood && inView(blood.x,blood.y,30)){
    const alpha=patient?.wounded?1:clamp(1-(S.min-blood.t)/6,0,1);
    if(alpha){ctx.save();ctx.globalAlpha=alpha*.64;ctx.fillStyle='#552c22';
      for(const [x,y,rx,ry] of [[-5,1,9,6],[-11,6,8,4],[-16,10,4,2],[-20,12,2,1],[7,-6,2,1]]){
        ctx.beginPath();ctx.ellipse(blood.x+x,blood.y+y,rx,ry,-.3,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();}
  }
  for(const r of lofts){const p=loft===r?r.landing:r.stair;if((!loft || loft===r) && inView(p.x,p.y,145)) drawBuiltStair(ctx,r,loft===r);}
  for (const d of decals) if (inView(d.x, d.y, 30)) {
    ctx.fillStyle = d.burn ? 'rgba(20,16,10,' + d.a + ')' : 'rgba(70,10,6,' + d.a + ')';
    if (d.burn) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.28); ctx.fill(); continue; }
    const h = Math.sin(d.x * 12.9898 + d.y * 78.233) * 43758.5453, q = h - Math.floor(h);   // стабильная неровная форма из той же записи decal
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * (0.75 + q * 0.5), d.r * (0.55 + (1 - q) * 0.35), q * 6.28, 0, 6.28); ctx.fill();
    if (d.r > 5) { ctx.beginPath(); ctx.ellipse(d.x + Math.cos(q * 9) * d.r * 0.9, d.y + Math.sin(q * 9) * d.r * 0.9, d.r * 0.35, d.r * 0.25, q * 3, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(d.x - Math.cos(q * 5) * d.r * 1.2, d.y - Math.sin(q * 5) * d.r * 1.1, d.r * 0.14, 0, 6.28); ctx.fill(); }
  }
  drawCordonTrail(inView);
  // костёр
  for (const F of WORLD_FIRES) if (inView(F.x, F.y, FIRE_REACH)) {
    if(fireLit(F)){fireGroundLight(F);drawFlames(F);}
    else{
      // Cover the glowing coals in the painted base while its stone ring stays visible.
      ctx.fillStyle='#34302b';ctx.beginPath();ctx.ellipse(F.x,F.y,11,9,.2,0,Math.PI*2);ctx.fill();
      for(let i=0;i<6;i++){
        const x=F.x+(hash2(i,3)-.5)*14,y=F.y+(hash2(i,7)-.5)*9;
        beam(ctx,x-3,y+3,x+3,y-2,2.5,i%2?'#272521':'#666055');
      }
    }
  }
  for (const o of objs) {
    if (BIG && o.x>=PW*T && loftAt(o)!==loft) continue;
    if ((o.k==='locker'||o.k==='safe'||o.k==='hiding'||o.broken) && inView(o.x,o.y,40)) {
      containerContact(o);
      if(perspective && !o.broken && (o.k==='locker'||o.k==='safe')) liftContainer(o,containerDraw);
      else containerDraw(o);
    }
    else if (o.k === 'crate' && !(shopVisible && o.shopStack) && inView(o.x, o.y, 40)) {
      containerContact(o);
      if(perspective) liftContainer(o,crateDraw); else crateDraw(o);
    }
    if (o.pick && inView(o.x, o.y, 30)) drawPick(o);
    if (o.k === 'genset' && G3.on && G3.pack && G3.pack.manifest.props && inView(o.x, o.y, 40) && !g7Prop(o)) gensetProc(ctx, o);
    if(o.k==='bones' && inView(o.x,o.y,28))drawBones(o);
    if (o.k === 'body' && inView(o.x,o.y,48)) {
      if(o.kind==='sack') drawGroundItems(o); else drawBody(o);
    }
    if (o.k === 'barrier' && inView(o.x, o.y, o.w) && !drawBridgeGate(ctx, o)) {
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
  const vis = ents.filter(e => e.alive && inView(e.x, e.y, 30) && (!BIG || loftAt(e)===loft)).sort((a, b) => a.y - b.y);
  const plants=!BEREZKI && livingZone && ART && C1 && !shopVisible && !loft ? visiblePlants(vx,vy,vw,vh,vis) : [];
  let plantIndex=0;
  const drawBridge=()=>ctx.drawImage(district.bridgeArt,footbridge.x-footbridge.width/2-5,footbridge.north-8);
  const bridgeVisible=BEREZKI && inView(footbridge.x,(footbridge.south+footbridge.north)/2,200);
  if(bridgeVisible && S.flags.stationDeck)drawBridge();
  for (const e of vis) {
    while(plantIndex<plants.length && plants[plantIndex].y<e.y)drawPlant(plants[plantIndex++]);
    drawRestingPack(e);
    if (shopVisible && e.sid === 'sid' && deskPoses.complete && deskPoses.naturalWidth) drawDeskTrader(e);
    else if (e.kind === 'dog') drawDog(e); else if (e.kind === 'boar') drawBoar(e); else if (e.kind === 'sucker') drawSucker(e); else if((e.sid==='shust' && e.captive && loft) || (e.sid==='tolik' && e.wounded)) drawRestingCaptive(e);
    else drawLitHuman(e);
    if(!holdsGuitar(e) && livingZone && !loft && !shopVisible)drawHearthGesture(e);
    if(e.sid?.startsWith('lz_guest')) drawDrinkingCup(e);
    if (e !== P && e.hp < e.maxhp && hostile(e, P) && dE(e, P) < 450 && !HOUSES.some(h => h.a > 0.5 && e.x > h.x * T && e.x < (h.x + h.w) * T && e.y > h.y * T && e.y < (h.y + h.h) * T)) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 12, e.y - 20, 24, 3);
      ctx.fillStyle = '#d64541'; ctx.fillRect(e.x - 12, e.y - 20, 24 * e.hp / e.maxhp, 3);
    }
  }
  if(bridgeVisible && !S.flags.stationDeck)drawBridge();
  while(plantIndex<plants.length)drawPlant(plants[plantIndex++]);
  if(BIG && !BEREZKI && P) drawNearPoppies(ctx,P);
  for (const t of tracers) { ctx.strokeStyle = 'rgba(255,230,160,' + (t.life / 0.07) * 0.8 + ')'; ctx.lineWidth = t.w; ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); }
  ctx.lineWidth = 1;
  for (const f of flashes) {
    if (f.big) continue;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
    ctx.fillStyle = 'rgba(255,220,120,0.95)'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(12, 0); ctx.lineTo(0, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,0.9)'; ctx.beginPath(); ctx.arc(1, 0, 3, 0, 6.28); ctx.fill(); ctx.restore();
  }
  for (const p of parts) { if (!inView(p.x, p.y, 20)) continue; const k = p.ml ? p.life / p.ml : 0; ctx.globalAlpha = p.ml ? clamp(Math.min(k * 1.4, (1 - k) * 6), 0, 1) * 0.26 : clamp(p.life * (p.smoke ? 0.5 : 3), 0, 1); ctx.fillStyle = p.c; if (p.fragment) {drawFragment(p);} else if (p.hearth) { drawHearthSmoke(p, 1-k); } else if (p.smoke) { ctx.beginPath(); ctx.arc(p.x, p.y, p.ml ? p.s * (1 + (1 - k) * 2.2) : p.s * (2 - p.life * 0.3), 0, 6.28); ctx.fill(); } else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
  // Open the leaves over the person within speaking or helping distance.
  const near=G.near;
  canopyCompanion=near?.e?.alive && ['talk','heal','free'].includes(near.k) && dE(near.e,P)<=60 &&
    los(P.x,P.y,near.e.x,near.e.y) ? near.e : null;
  if (BEREZKI) drawWinterTrees(inView);
  // крыши: скрывают дом, пока ты не внутри
  const roofOrder=BEREZKI?winterRoofOrder():HOUSES;
  roofOrder.forEach((h, index) => {
    const i=BEREZKI?h.roofIndex:index;
    const hide = P && roofHidden(h);
    h.a = lerp(h.a, hide ? 0 : 1, 0.2);
    if (h.a < 0.03 || !inView(h.x * T + h.w * T / 2, h.y * T + h.h * T / 2, h.w * T)) return;
    if (C1 && SHADOWS) {
      // Кэшируем мягкую тень один раз на дом в мировом разрешении.
      if (!h.shadow) {
        const w = h.w*T, height = h.h*T;
        const c = document.createElement('canvas'); c.width = w + 44; c.height = height + 44;
        const g = c.getContext('2d');
        g.shadowColor = 'rgba(14,14,10,.34)'; g.shadowBlur = 12;
        g.shadowOffsetX = c.width; g.fillRect(15 - c.width, 15, w, height);
        h.shadow = c;
      }
      ctx.globalAlpha = h.a; ctx.drawImage(h.shadow, h.x*T-8, h.y*T-4);
    }
    ctx.globalAlpha = h.a;
    const underEave=captureEave(h);
    if (perspective && ART) drawRaisedHouse(h, i);
    else drawHouseRoof(ctx, h, i, 1);
    if(underEave){
      ctx.globalAlpha=1;ctx.drawImage(eaveView,P.x-36,P.y-36,72,72);
    }
    ctx.globalAlpha = 1;
  });
  // провода ЛЭП
  const py0 = objs.filter(o => o.k === 'pylon');
  ctx.strokeStyle = 'rgba(20,20,18,0.55)'; ctx.lineWidth = 1;
  ctx.save();
  if (perspective) {
    const k=objectHeight.pylon;
    ctx.transform(1+k,0,0,1+k,-cam.x*k,-cam.y*k);
  }
  for (let i = 0; i + 1 < py0.length; i++) { const a = py0[i], b = py0[i + 1]; if (!inView(a.x, a.y, 600) && !inView(b.x, b.y, 600)) continue; [-6, 0, 6].forEach(o => { ctx.beginPath(); ctx.moveTo(a.x + 10 + o, a.y + 10 - o); ctx.quadraticCurveTo((a.x + b.x) / 2 + 10 + o, (a.y + b.y) / 2 + 30, b.x + 10 + o, b.y + 10 - o); ctx.stroke(); }); }
  ctx.restore();
  if (perspective && ART && !shopVisible && !loft) drawCheckpointSpan(inView);
  drawCloudShadows();
  if (!BEREZKI) drawCordonCanopies(vx,vy,vw,vh,shopVisible,loft);
  ctx.globalAlpha = 1;
  if((!BEREZKI || !winterFloor(P.x,P.y)) && !inBunker(P.x,P.y) && !loftAt(P))for (const c of crows) {
    drawFlyingCrow(c);
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
  if(BIG && ART && !shopVisible && !loft && vx+vw>PW*T){
    // Screen space reserved for detached interiors is concealed from the outdoor camera.
    const edge=PW*T;
    artFill(ctx,'grass_dry',edge,vy,vx+vw-edge+1,vh);
    for(let y=Math.floor(vy/64)-1;y<=Math.ceil((vy+vh)/64)+1;y++)
      for(let x=Math.floor(edge/64);x<=Math.ceil((vx+vw)/64);x++){
        const h=hash2(x,y),c=CANOPY[Math.floor(h*forestCrowns.length)];
        if(c && Math.abs(y*64/T-BIG_EXITS.east.y)>2)ctx.drawImage(c,x*64-25+h*20,y*64-28,90,96);
      }
  }
  drawBubbles(inView);
  if (P?.alive) drawPlayerAim();
  // свет, цвет, ночь
  if (shopVisible || loft) ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  if (GRADE.mul) { ctx.fillStyle = GRADE.mul; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalCompositeOperation = 'source-over';
  const bunk = P && (loftAt(P) || inBunker(P.x, P.y));
  const dk = BEREZKI && winterFloor(P.x,P.y) ? .20+.44*darkness() : loft ? .18+.15*darkness() : bunk ? (shopVisible ? 0.41 : 0.62) : darkness();
  const toS = (x, y) => [(x - vx) * Z / 2 + sx / 2, (y - vy) * Z / 2 + sy / 2];
  const LW = lightC.width, LH = lightC.height;
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, LW, LH);
  if (dk > 0.02) {
    const windows=paneSpill(inView);
    lctx.fillStyle = 'rgba(4,7,12,' + dk + ')'; lctx.fillRect(0, 0, LW, LH);
    lctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const s = toS(x, y), rr = r * Z / 2; if (s[0] < -rr || s[1] < -rr || s[0] > LW + rr || s[1] > LH + rr) return; const g = lctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], rr); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.beginPath(); lctx.arc(s[0], s[1], rr, 0, 6.28); lctx.fill(); };
    lctx.save();
    const unit=Z/2,origin=toS(0,0);
    lctx.setTransform(unit,0,0,unit,origin[0],origin[1]);
    if(!shopVisible && !loft)clipRoofsFromLight(lctx,vx,vy,vw,vh,inView);
    if(P.alive){
      if(S.torch===false)castLight(lctx,P,0,Math.PI,60,.45);
      else {castLight(lctx,P,0,Math.PI,95,.75);castLight(lctx,P,P.ang,.42,330,.95);}
    }
    for(const e of vis)if(e!==P && e.kind==='human' && !e.sit && !e.captive && e.fac!=='bandit' && e.sid!=='sid')
      castLight(lctx,e,e.ang,.35,180,.70);
    if(!loft && !shopVisible){
      for(const l of siteLights())if(inView(l.x,l.y,l.r))castLight(lctx,l,l.angle,l.half,l.r,.91);
      drawRoomLights(lctx,inView,false);
      for(const pane of windows)windowGlow(lctx,pane,false);
      for(const f of WORLD_FIRES)if(fireLit(f) && inView(f.x,f.y,200))
        castLight(lctx,f,0,Math.PI,f===FIRE?205:170,.83+.10*Math.sin(S.min*7));
      if(villageLit())for(const lamp of villageBulbs())if(inView(lamp.x,lamp.y,120))
        castLight(lctx,lamp,0,Math.PI,120,.85);
    }
    lctx.restore();

    for(const pane of windows){
      const [x,y]=roofPoint(pane.wallX,pane.wallY,.035);
      hole(x,y,11,.24);
    }
    if (shopVisible) {
      hole(STAIRS.x+2.15*T, 6.13*T, 74, .9);
    } else if (bunk) { hole(RMp(126.5 * T, 7 * T)[0], RMp(126.5 * T, 7 * T)[1], 260 + Math.sin(S.min * 30) * 3, 0.9); hole(RMp(124.5 * T, 3.5 * T)[0], RMp(124.5 * T, 3.5 * T)[1], 120, 0.7); }
    for (const f of flashes) hole(f.x, f.y, f.big ? 260 : 130, 0.9);
    for (const a of anoms) if (a.k === 'e' && (anomalyPhase(a)==='active' || a.fx>.3)) hole(a.x, a.y, 70 + a.fx * 120, 0.5);
    const range = activeDetectorRange();
    if (range) for (const a of arts) if (dE(a, P) <= range) hole(a.x, a.y, 40, 0.6);

    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightC, 0, 0, VW, VH);
    if(!loft && !shopVisible){
      ctx.save();ctx.translate(origin[0]*2,origin[1]*2);ctx.scale(Z,Z);
      clipRoofsFromLight(ctx,vx,vy,vw,vh,inView);
      for(const l of siteLights())if(inView(l.x,l.y,l.r)){
        castLight(ctx,l,l.angle,l.half,l.r,dk*.32,'255,188,103');
        ctx.fillStyle='#3c3932';ctx.fillRect(l.x-4,l.y-2,8,5);
        ctx.fillStyle='#e8c588';ctx.fillRect(l.x-2.5,l.y+1,5,1.6);
      }
      for(const f of WORLD_FIRES)if(fireLit(f) && inView(f.x,f.y,205))
        castLight(ctx,f,0,Math.PI,f===FIRE?205:170,dk*.22,'255,150,60');
      drawRoomLights(ctx,inView,true);
      for(const pane of windows)windowGlow(ctx,pane,true);
      if(villageLit())for(const lamp of villageBulbs())if(inView(lamp.x,lamp.y,120)){
        castLight(ctx,lamp,0,Math.PI,120,dk*.32,'255,203,132');
        ctx.fillStyle='#d8ba86';ctx.beginPath();ctx.arc(lamp.x,lamp.y,2,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
  }
  for (const f of flashes) if (f.big) { const s = toS(f.x, f.y); const g = ctx.createRadialGradient(s[0] * 2, s[1] * 2, 0, s[0] * 2, s[1] * 2, 140 * Z); g.addColorStop(0, f.blue ? 'rgba(180,220,255,0.6)' : 'rgba(255,200,120,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  if (!BEREZKI && villageAtmosphere && !bunk) {
    const dawn=clamp(1-Math.abs((S.min%1440)-420)/110,0,1);
    const local=clamp((1080-Math.hypot(cam.x-(FIRE.x+HATCH.x)/2,cam.y-(FIRE.y+HATCH.y)/2))/400,0,1);
    if (dawn*local>.001) {
      ctx.save();ctx.globalAlpha=.16*dawn*local;ctx.fillStyle='#526471';
      ctx.fillRect(0,0,VW,VH);ctx.restore();
    }
  }
  if (!BEREZKI) drawWeatherScreen();
  // откуда стреляют: красные дуги по краю экрана
  if (P && P.alive) HURTDIR.forEach(h => {
    const cx = VW / 2, cy = VH / 2, R = Math.min(VW, VH) * 0.42, a = h.a;
    ctx.strokeStyle = 'rgba(220,40,30,' + Math.min(0.85, h.life) + ')'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a - 0.22, a + 0.22); ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
  });
  ctx.drawImage(vignetteC, 0, 0, VW, VH);
  if (fadeT > 0) { ctx.fillStyle = 'rgba(0,0,0,' + clamp(1 - Math.abs(fadeT - 0.25) / 0.25, 0, 1) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if(dizzy){ctx.fillStyle='rgba(255,223,162,'+.12*dizzy+')';ctx.fillRect(0,0,VW,VH);}
  if (radRate > 0.3 || S.rad > 40) { ctx.fillStyle = 'rgba(120,140,40,' + clamp(radRate * 0.03 + (S.rad - 40) * 0.002, 0, 0.18) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (hurtFlash > 0) { ctx.fillStyle = 'rgba(150,20,10,' + hurtFlash * 0.45 + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (P && P.alive && P.hp < 30) { ctx.fillStyle = 'rgba(120,10,5,' + (0.12 + 0.08 * Math.sin(S.min * 6)) + ')'; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = ctx.createPattern(grainC, 'repeat');
  ctx.save(); ctx.translate(Math.random() * 128, Math.random() * 128); ctx.fillRect(-128, -128, VW + 256, VH + 256); ctx.restore();
}
