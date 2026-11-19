/* ===================== графика деревни B: текстуры и спрайты из пакета ===================== */
let ART = null, CAN_SZ = 72;   // CAN_SZ: размер кроны дерева в игровых px
const PATS = {}, ARTM = {};   // ARTM: маски всей карты, считаются один раз, рисуются кусками
/* узор материала, привязанный к мировым координатам (фаза одинакова на всей карте) */
/* масштаб материала: сколько игровых px занимает один фрагмент текстуры */
const MATSETS = {
  a: { grass: 256, grass_dry: 256, dirt: 256, asphalt: 256, floor_wood: 256, floor_concrete: 256, wall_brick: 256, wall_concrete: 256 },
  b: { grass: 192, grass_dry: 224, dirt: 144, asphalt: 176, floor_wood: 112, floor_concrete: 144, wall_brick: 72, wall_concrete: 128 },
  c: { grass: 144, grass_dry: 160, dirt: 104, asphalt: 128, floor_wood: 80, floor_concrete: 104, wall_brick: 52, wall_concrete: 96 }
};
const MATSCALE = MATSETS[(location.hash.match(/ms-([abc])/) || [])[1] || 'b'];
/* оттенок материала: трава оливковее, дорожки светлее и серее; меняется сам холст узора один раз */
const MATTINT = {
  grass: [['multiply', 'rgb(196,212,160)', 1]], grass_dry: [['multiply', 'rgb(236,226,196)', 1]],
  dirt: [['saturation', 'rgb(128,128,128)', 0.12], ['multiply', 'rgb(214,204,186)', 1]], asphalt: [['saturation', 'rgb(128,128,128)', 0.25]]
};
function artFill(g, id, x, y, w, h) {
  if (!PATS[id]) {
    const sp = ART.m.sprites[id];
    if (sp && sp.seamless) { PATS[id] = ART.pattern(g, id); g.fillStyle = PATS[id]; g.fillRect(x, y, w, h); return; }
    const size = MATSCALE[id] || 256;
    ART.pattern(g, id, size);
    const cv0 = ART.patterns.get(id + ':' + size);
    if (MATTINT[id] && cv0 && !cv0.tinted) {
      const tg = cv0.getContext('2d');
      MATTINT[id].forEach(o => { tg.globalCompositeOperation = o[0]; tg.globalAlpha = o[2]; tg.fillStyle = o[1]; tg.fillRect(0, 0, cv0.width, cv0.height); });
      tg.globalCompositeOperation = 'source-over'; tg.globalAlpha = 1; cv0.tinted = 1;
    }
    PATS[id] = ART.pattern(g, id, size);
  }
  g.fillStyle = PATS[id]; g.fillRect(x, y, w, h);
}
/* насыпь C1: полоса щебня с рельсами по всей высоте ряда клеток RA, фаза по миру */
function c1Rail(g, x, y) {
  let y0 = y; while (tAt(x, y0 - 1) === RA) y0--;
  let y1 = y; while (tAt(x, y1 + 1) === RA) y1++;
  const s = ART.m.sprites.rail, h = (y1 - y0 + 1) * T + 18, k = h / s.rect[3], pw = s.rect[2] * k;
  const key = 'rail:' + h;
  if (!PATS[key]) { const c = document.createElement('canvas'); c.width = Math.round(pw); c.height = Math.round(h); c.getContext('2d').drawImage(ART.images[s.atlas], ...s.rect, 0, 0, c.width, c.height); PATS[key] = c; }
  const c = PATS[key], ox = ((x * T) % c.width + c.width) % c.width;
  g.save(); g.beginPath(); g.rect(x * T, y * T - (y === y0 ? 9 : 0), T, T + (y === y0 ? 9 : 0) + (y === y1 ? 9 : 0)); g.clip();
  g.drawImage(c, x * T - ox, y0 * T - 9); g.drawImage(c, x * T - ox + c.width, y0 * T - 9);
  g.restore();
}
/* дёшево сравнить, относится ли клетка к земле, на которой лежит текстура */
const GROUNDISH = t => t === GR || t === TR || t === BU;

// Короткий отпечаток из исходной фотографии грунта. Мягкая граница
// оставляет видимой фактуру обочины между проездами.
function wheelPrint() {
  if (ARTM.tread) return ARTM.tread;
  const c = document.createElement('canvas');
  c.width = 112; c.height = 20;
  const g = c.getContext('2d'), dirt = ART.m.sprites.dirt;
  g.translate(56, 10); g.rotate(0.44);
  g.drawImage(ART.images[dirt.atlas], ...dirt.rect, -255, -357, 512, 512);
  g.setTransform(56, 0, 0, 10, 56, 10);
  const edge = g.createRadialGradient(0, 0, 0.35, 0, 0, 1);
  edge.addColorStop(0, '#000'); edge.addColorStop(1, 'transparent');
  g.globalCompositeOperation = 'destination-in'; g.fillStyle = edge;
  g.fillRect(-1, -1, 2, 2);
  return ARTM.tread = c;
}

function drawWheelTracks(g, x, y, w, h) {
  const stamp = wheelPrint();
  for (const route of VEHICLE_ROUTES) for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i];
    const x0 = (ax + 0.5) * T, y0 = (Math.round(ay) + 0.5) * T;
    const dx = (bx - ax) * T, dy = (Math.round(by) - Math.round(ay)) * T;
    const length = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
    if (Math.max(x0, x0 + dx) < x - 32 || Math.min(x0, x0 + dx) > x + w + 32 ||
        Math.max(y0, y0 + dy) < y - 32 || Math.min(y0, y0 + dy) > y + h + 32) continue;
    g.save(); g.translate(x0, y0); g.rotate(angle);
    for (let d = 0; d < length; d += 21) {
      const drift = 4 * Math.sin((d + x0) / 103);
      for (const side of [-1, 1]) {
        g.globalAlpha = 0.38 + 0.50 * vnoise(x0 + d, y0 + side * 71, 29);
        g.drawImage(stamp, d - 15, drift + side * 9 - 4, 36, 8);
      }
    }
    g.restore();
  }
}

function* artGround(g, R) {
  const shoulders = BIG && C1;
  // 1. Основа: трава, грунт, асфальт, полы. Болото, насыпь и пустота остаются из прежней отрисовки.
  for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = map[y * MW + x], px = x * T, py = y * T;
    let id = GROUNDISH(t) || t === DI ? 'grass' : t === AS ? (shoulders ? 'grass' : 'asphalt') : t === FL ? 'floor_wood' : t === CF ? 'floor_concrete' : null;
    if (C1 && t === SW) id = BIG && x >= 224 ? 'water' : 'swamp';
    if (id) artFill(g, id, px, py, T, T);
    if (C1 && t === RA) c1Rail(g, x, y);
    if (!shoulders && t === AS && x === roadX[y] && y % 3 === 0 && y > 8) { g.fillStyle = 'rgba(200,190,150,0.16)'; g.fillRect(px + 14, py + 4, 4, 18); }
    if (t === CF) { g.strokeStyle = 'rgba(25,25,20,0.18)'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); }
  }
  yield;
  // 2. Сухая трава крупными мягкими пятнами: маска низкого разрешения, накладывается кусками 512 px
  if (!ARTM.dry) {
    const mask = document.createElement('canvas'); mask.width = MW * 2; mask.height = MH * 2;
    const mg = mask.getContext('2d'), md = mg.createImageData(mask.width, mask.height);
    for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
      const tx = x >> 1, ty = y >> 1, t = tAt(tx, ty);
      const v = vnoise(x, y, 11) * 0.7 + vnoise(x + 31, y + 17, 4) * 0.3;
      const a = GROUNDISH(t) ? clamp((v - 0.5) * 4, 0, 1) : 0;
      md.data[(y * mask.width + x) * 4 + 3] = Math.round(a * 235);
    }
    mg.putImageData(md, 0, 0); ARTM.dry = mask;
  }
  const mask = ARTM.dry;
  const CH = 512, cc = ARTM.cc || (ARTM.cc = document.createElement('canvas')); cc.width = cc.height = CH * GS;
  const cg = cc.getContext('2d');
  // кусок земли (GWP, пиксели) обрабатывается полосами по 256 px, между полосами шаг отдаётся кадру
  const wx0 = GWP.x0, wy0 = GWP.y0, wx1 = Math.min(PW * T, GWP.x1), wy1 = Math.min(WH, GWP.y1), SH = BIG ? 256 / GS : CH;
  for (let cy = wy0; cy < wy1; cy += SH) { for (let cx = wx0; cx < wx1; cx += CH) {
    const w = Math.min(CH, wx1 - cx), h = Math.min(SH, wy1 - cy);
    cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, w * GS, h * GS);
    cg.setTransform(GS, 0, 0, GS, -cx * GS, -cy * GS); artFill(cg, 'grass_dry', cx, cy, w, h); cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.globalCompositeOperation = 'destination-in'; cg.imageSmoothingEnabled = true;
    const s = mask.width / WW;
    cg.drawImage(mask, cx * s, cy * s, w * s, h * s, 0, 0, w * GS, h * GS);
    g.drawImage(cc, 0, 0, w * GS, h * GS, cx, cy, w, h);
  } if (BIG) yield; }
  yield;
  // 3. Мягкие края грунта и асфальта: маска 4 точки на клетку, размытая и с шумом, только поверх травы
  const surfaces = [[DI, shoulders ? 'bare_soil' : 'dirt'], [AS, 'asphalt']];
  for (const [tt, id] of surfaces) {
    // Гравий заходит под полотно и выступает за его края.
    const coverage = t => t === tt || (shoulders && tt === DI && t === AS);
    const K = 4, mw = PW * K, mh = MH * K;
    if (!ARTM[id]) {
    const a = new Float32Array(mw * mh), b2 = new Float32Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) a[y * mw + x] = coverage(map[(y / K | 0) * MW + (x / K | 0)]) ? 1 : 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, n = 0; for (let d = -2; d <= 2; d++) { const xx = x + d; if (xx >= 0 && xx < mw) { s += a[y * mw + xx]; n++; } } b2[y * mw + x] = s / n; }
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, n = 0; for (let d = -2; d <= 2; d++) { const yy = y + d; if (yy >= 0 && yy < mh) { s += b2[yy * mw + x]; n++; } } a[y * mw + x] = s / n; }
    }
    const mk = document.createElement('canvas'); mk.width = mw; mk.height = mh;
    const mg2 = mk.getContext('2d'), id2 = mg2.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const t = map[(y / K | 0) * MW + (x / K | 0)];
      if (!GROUNDISH(t) && !(tt === DI && t === DI) && !(shoulders && (t === AS || t === DI))) continue;
      const base = a[y * mw + x], v = base + (vnoise(x, y, 3) - 0.5) * 0.35 * Math.min(1, base * 4);
      const alpha = shoulders && tt === AS ? clamp((v - 0.40) * 4, 0, 1) * 255 : clamp((v - 0.12) * 2.6, 0, 1) * 235;
      id2.data[(y * mw + x) * 4 + 3] = Math.round(alpha);
    }
    mg2.putImageData(id2, 0, 0); ARTM[id] = mk;
    }
    const mk = ARTM[id];
    const sc = mw / (PW * T);
    // только прямоугольник вокруг клеток этого покрытия (края расплываются на 3 клетки): кусок без дороги пропускается
    let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
    for (let y = Math.max(0, GW.y0 - 3); y <= Math.min(MH - 1, GW.y1 + 3); y++) for (let x = Math.max(0, GW.x0 - 3); x <= Math.min(PW - 1, GW.x1 + 3); x++)
      if (coverage(map[y * MW + x])) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    if (bx1 >= 0 && (bx1 + 4) * T > GWP.x0 && (bx0 - 3) * T < GWP.x1 && (by1 + 4) * T > GWP.y0 && (by0 - 3) * T < GWP.y1) {
      const rx0 = Math.max(GWP.x0, (bx0 - 3) * T), ry0 = Math.max(GWP.y0, (by0 - 3) * T), rx1 = Math.min(GWP.x1, (bx1 + 4) * T), ry1 = Math.min(GWP.y1, (by1 + 4) * T);
      for (let cy = ry0; cy < ry1; cy += CH) for (let cx = rx0; cx < rx1; cx += CH) {
        const w = Math.min(CH, rx1 - cx), h = Math.min(CH, ry1 - cy);
        cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, w * GS, h * GS);
        cg.setTransform(GS, 0, 0, GS, -cx * GS, -cy * GS); artFill(cg, id, cx, cy, w, h);
        if (shoulders && tt === DI) drawWheelTracks(cg, cx, cy, w, h);
        if (shoulders && tt === AS) {
          cg.fillStyle = 'rgba(200,190,150,0.16)';
          for (let row = Math.max(9, Math.floor(cy / (3 * T)) * 3); row * T < cy + h; row += 3)
            cg.fillRect(roadX[row] * T + 14, row * T + 4, 4, 18);
        }
        cg.setTransform(1, 0, 0, 1, 0, 0);
        cg.globalCompositeOperation = 'destination-in'; cg.imageSmoothingEnabled = true;
        cg.drawImage(mk, cx * sc, cy * sc, w * sc, h * sc, 0, 0, w * GS, h * GS);
        g.drawImage(cc, 0, 0, w * GS, h * GS, cx, cy, w, h);
      }
    }
    yield;
  }
  yield;
  if (C1) { c1ForestFloor(g); yield; c1Scatter(g); yield; }
  // 4. Растительность группами: у стен, заборов, деревьев и насыпи; середина проходов свободна
  const RT = mulberry32(4242 + GW.x0 * 97 + GW.y0 * 13);
  const solidish = t => t === BR || t === CO || t === TR || t === RA;
  const nearPath = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tAt(x + dx, y + dy); if (t === DI || t === AS || t === FL || t === CF) return true; } return false; };
  const fenceNear = (x, y) => DECOR.some(d => d[0] === 'fence' && Math.abs(d[1] - x - 0.5) < 1.6 && Math.abs(d[2] - y - 0.5) < 1.2);
  for (let y = Math.max(2, GW.y0); y <= Math.min(MH - 3, GW.y1); y++) for (let x = Math.max(2, GW.x0); x <= Math.min(PW - 3, GW.x1); x++) {
    if (map[y * MW + x] !== GR) continue;
    let near = fenceNear(x, y);
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (solidish(tAt(x + dx, y + dy))) { near = true; break; }
    const path = nearPath(x, y);
    const cluster = near ? 0.26 : 0.008;
    if (RT() < cluster) {
      const n = near ? 2 + Math.floor(RT() * 3) : 1;
      for (let i = 0; i < n; i++) {
        const sz = 24 * (0.7 + RT() * 0.5);
        ART.draw(g, C1 ? 'c1_tuft' + Math.floor(RT() * 6) : 'tuft', x * T + 6 + RT() * 20, y * T + 6 + RT() * 20, sz * (C1 ? 1.15 : 1), sz * (C1 ? 1.15 : 1), RT() * 6.28, C1 ? 0.85 : 0.6 + RT() * 0.2);
      }
      if (near && !path && RT() < 0.22) { const h = RT(); ART.draw(g, C1 ? 'c1_bush' + Math.floor(h * 3) : 'bush', x * T + 16 + (h - 0.5) * 10, y * T + 16, (30 + h * 10) * (C1 ? 1.1 : 1), (30 + h * 10) * (C1 ? 1.1 : 1), h * 6.28); }
    }
  }
}
/* лесная подстилка C1: мягкая маска плотности деревьев на всю карту, рисуется кусками */
function c1ForestFloor(g) {
  if (!ARTM.forest) {
    const K = 2, w = PW * K, h = MH * K, a = new Float32Array(PW * MH);
    for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) { let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tAt(x + dx, y + dy) === TR) n++; a[y * PW + x] = n; }
    const m = document.createElement('canvas'); m.width = PW; m.height = MH; const mg = m.getContext('2d'), id = mg.createImageData(PW, MH);
    for (let i = 0; i < PW * MH; i++) { const t = map[(i / PW | 0) * MW + i % PW]; id.data[i * 4 + 3] = (t === GR || t === TR || t === BU) ? Math.round(clamp((a[i] - 4) / 9, 0, 1) * 235) : 0; }
    mg.putImageData(id, 0, 0);
    const big = document.createElement('canvas'); big.width = w; big.height = h; const bg = big.getContext('2d'); bg.imageSmoothingEnabled = true; bg.filter = 'blur(1.5px)'; bg.drawImage(m, 0, 0, w, h);
    ARTM.forest = big;
  }
  const mk = ARTM.forest, sc = mk.width / (PW * T), cc = ARTM.cc, cg = cc.getContext('2d');
  const x0 = GWP.x0, y0 = GWP.y0, x1 = Math.min(PW * T, GWP.x1), y1 = Math.min(WH, GWP.y1);
  for (let cy = y0; cy < y1; cy += 512) for (let cx = x0; cx < x1; cx += 512) {
    const w = Math.min(512, x1 - cx), h = Math.min(512, y1 - cy); if (w <= 0 || h <= 0) continue;
    cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, w * GS, h * GS);
    cg.setTransform(GS, 0, 0, GS, -cx * GS, -cy * GS); artFill(cg, 'forest', cx, cy, w, h); cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.globalCompositeOperation = 'destination-in'; cg.imageSmoothingEnabled = true;
    cg.drawImage(mk, cx * sc, cy * sc, w * sc, h * sc, 0, 0, w * GS, h * GS);
    g.drawImage(cc, 0, 0, w * GS, h * GS, cx, cy, w, h);
  }
}
/* разброс C1: брёвна, пни, камни, пятна. Место выбирается по хешу клетки, так что соседние куски рисуют одно и то же */
function c1Scatter(g) {
  const M = 5;
  for (let y = Math.max(3, GW.y0 - M); y <= Math.min(MH - 4, GW.y1 + M); y++) for (let x = Math.max(3, GW.x0 - M); x <= Math.min(PW - 4, GW.x1 + M); x++) {
    const t0 = map[y * MW + x];
    if (t0 === SW && !(BIG && x >= 224)) {   // болото: лужи воды и камыш
      const q = hash2(x * 5 + 3, y * 3 + 1);
      if (q < 0.3) { const q2 = hash2(y + 9, x + 4); ART.draw(g, 'c1_pool' + Math.floor(q2 * 3), x * T + 16, y * T + 16, 70 + q2 * 50, 60 + q * 120, q2 * 6.28); }
      else if (q < 0.4) ART.draw(g, 'c1_bush3', x * T + 16, y * T + 16, 34, 34, q * 60);
      continue;
    }
    if (t0 !== GR) continue;
    const h = hash2(x * 3 + 11, y * 7 + 5); if (h > 0.03) continue;
    let road = false; for (let dy = -2; dy <= 2 && !road; dy++) for (let dx = -2; dx <= 2; dx++) { const t = tAt(x + dx, y + dy); if (t === DI || t === AS || t === BR || t === CO || t === FL || t === CF || t === RA) { road = true; break; } }
    if (road) continue;
    const h2 = hash2(y + 31, x + 17), cx = x * T + 16, cy = y * T + 16, a = h2 * 6.28;
    let id, w, hh, al = 1;
    if (h < 0.007) { id = 'c1_log' + Math.floor(h2 * 3); w = 110; hh = 36; }
    else if (h < 0.013) { id = 'c1_stump' + Math.floor(h2 * 3); w = hh = 26; }
    else if (h < 0.018) { id = 'c1_rock' + Math.floor(h2 * 3); w = hh = 28 + h2 * 10; }
    else { id = 'c1_decal' + [0, 1, 3, 4][Math.floor(h2 * 4)]; w = hh = 90 + h2 * 50; al = 0.7; }
    if (id.startsWith('c1_decal')) ART.draw(g, id, cx, cy, w, hh, a, al);
    else { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(cx + 3, cy + 4, w * 0.45, hh * 0.35, a, 0, 6.28); g.fill(); ART.draw(g, id, cx, cy, w, hh, a); }
  }
}
/* стена: видимая часть уже клетки (коллизия прежняя), подложка трава или пол, южная грань и тень */
const isWall = t => t === BR || t === CO;
const isFloor = t => t === FL || t === CF;
function artWall(g, x, y) {
  const t = map[y * MW + x], px = x * T, py = y * T, B0 = 10, B1 = 22;
  const n = { l: isWall(tAt(x - 1, y)), r: isWall(tAt(x + 1, y)), u: isWall(tAt(x, y - 1)), d: isWall(tAt(x, y + 1)) };
  artFill(g, 'grass', px, py, T, T);
  [[-1, 0, px, py, 16, T], [1, 0, px + 16, py, 16, T], [0, -1, px, py, T, 16], [0, 1, px, py + 16, T, 16]].forEach(o => {
    const nt = tAt(x + o[0], y + o[1]); if (isFloor(nt)) artFill(g, nt === FL ? 'floor_wood' : 'floor_concrete', o[2], o[3], o[4], o[5]);
  });
  const rects = [[px + B0, py + B0, B1 - B0, B1 - B0]];
  if (n.l) rects.push([px, py + B0, B0, B1 - B0]); if (n.r) rects.push([px + B1, py + B0, T - B1, B1 - B0]);
  if (n.u) rects.push([px + B0, py, B1 - B0, B0]); if (n.d) rects.push([px + B0, py + B1, B1 - B0, T - B1]);
  // южная грань и контактная тень там, где ниже нет стены
  if (!n.d) {
    const x0 = n.l ? px : px + B0, x1 = n.r ? px + T : px + B1;
    const sg = g.createLinearGradient(0, py + B1 + 6, 0, py + B1 + 14); sg.addColorStop(0, 'rgba(0,0,0,0.38)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg; g.fillRect(x0 + 2, py + B1 + 6, x1 - x0, 8);
    g.fillStyle = t === CO ? '#4a4a42' : '#4a2e24'; g.fillRect(x0, py + B1, x1 - x0, 6);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, py + B1 + 4, x1 - x0, 2);
  }
  if (!n.r) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(px + B1, py + B0 + 3, 4, B1 - B0); }
  rects.forEach(r => artFill(g, t === CO ? 'wall_concrete' : 'wall_brick', r[0], r[1], r[2], r[3]));
  g.fillStyle = 'rgba(255,250,235,0.09)';
  rects.forEach(r => g.fillRect(r[0], r[1], r[2], 1.5));
  g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1;
  rects.forEach(r => g.strokeRect(r[0] + 0.5, r[1] + 0.5, r[2] - 1, r[3] - 1));
}
/* пороги и косяки у проёмов жилых домов */
function artThresholds(g) {
  HOUSES.forEach(h => {
    if (h.ruin || h.x > GW.x1 || h.x + h.w < GW.x0 || h.y > GW.y1 || h.y + h.h < GW.y0) return;
    for (let yy = h.y; yy < h.y + h.h; yy++) for (let xx = h.x; xx < h.x + h.w; xx++) {
      const edge = xx === h.x || yy === h.y || xx === h.x + h.w - 1 || yy === h.y + h.h - 1;
      if (!edge || isWall(tAt(xx, yy))) continue;
      const px = xx * T, py = yy * T, horiz = yy === h.y || yy === h.y + h.h - 1;
      g.fillStyle = 'rgba(0,0,0,0.25)'; horiz ? g.fillRect(px, py + 9, T, 15) : g.fillRect(px + 9, py, 15, T);
      g.fillStyle = '#5b4128'; horiz ? g.fillRect(px, py + 11, T, 10) : g.fillRect(px + 11, py, 10, T);
      g.fillStyle = 'rgba(255,230,190,0.18)'; horiz ? g.fillRect(px, py + 11, T, 1.5) : g.fillRect(px + 11, py, 1.5, T);
      g.strokeStyle = 'rgba(20,12,6,0.6)'; horiz ? (g.beginPath(), g.moveTo(px + 11, py + 11), g.lineTo(px + 11, py + 21), g.moveTo(px + 22, py + 11), g.lineTo(px + 22, py + 21), g.stroke()) : 0;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
        if (!isWall(tAt(xx + d[0], yy + d[1]))) return;
        g.fillStyle = '#2e2218';
        if (d[0] === -1) g.fillRect(px, py + 8, 4, 16); if (d[0] === 1) g.fillRect(px + T - 4, py + 8, 4, 16);
        if (d[1] === -1) g.fillRect(px + 8, py, 16, 4); if (d[1] === 1) g.fillRect(px + 8, py + T - 4, 16, 4);
      });
    }
  });
}
function artBush(g, x, y) { const h = hash2(x, y); ART.draw(g, C1 ? (tAt(x, y + 1) === SW || tAt(x, y - 1) === SW ? 'c1_bush3' : 'c1_bush' + Math.floor(hash2(y, x + 7) * 3)) : 'bush', x * T + 16 + (h - 0.5) * 6, y * T + 16 + (hash2(y, x) - 0.5) * 6, 36 * (0.85 + h * 0.3), 36 * (0.85 + h * 0.3), h * 6.28); }
/* объекты на земле: центр = левый верх + половина размера */
function artStatic(g, o) { C1SH = o.k !== 'fire'; try { return artStatic0(g, o); } finally { C1SH = 0; } }
function artStatic0(g, o) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (C1 && o.k === 'bus') { const w = o.w * 1.25, s = ART.m.sprites.c1_bus, h = w * s.rect[3] / s.rect[2]; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - w / 2 + 6, cy - h / 2 + 7, w, h); c1Draw(g, 'c1_bus', cx, cy, w); return true; }
  if (C1 && o.k === 'car') {
    const id = o.seed >= 10 ? 'c1_army' + (o.seed % 3) : ['c1_car0', 'c1_car1', 'c1_car2', 'c1_tractor'][o.seed % 4], w = o.seed >= 10 ? 84 : 70, a = o.seed % 2 ? Math.PI : 0;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + 4, cy + 5, w * 0.48, w * 0.22, 0, 0, 6.28); g.fill(); c1Draw(g, id, cx, cy, w, a); return true;
  }
  if (C1 && o.k === 'hatch') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(cx + 2, cy + 3, 22, 0, 6.28); g.fill(); c1Draw(g, 'c1_hatch', cx, cy, 46); return true; }
  if (C1 && o.k === 'fire') { c1Draw(g, 'c1_campfire', cx, cy, 30 * 192 / 72); return true; }
  if (C1 && o.k === 'pylon') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(cx + 3, cy + 4, 9, 0, 6.28); g.fill(); c1Draw(g, 'c1_pole_conc', cx, cy, 44, (o.x * 7 % 3) * 0.2); return true; }
  if (o.k === 'bus') {
    const s = Math.min(o.w / 292, o.h / 133), bw = 292 * s, bh = 133 * s;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - bw / 2 + 6, cy - bh / 2 + 7, bw, bh);
    ART.draw(g, 'bus', cx, cy, bw, bh); return true;
  }
  if (o.k === 'car') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + 4, cy + 5, 30, 14, 0, 0, 6.28); g.fill();
    ART.draw(g, 'car', cx, cy, 56, 30, o.seed % 2 ? Math.PI : 0); return true;
  }
  if (o.k === 'hatch') {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(cx + 2, cy + 3, 17, 0, 6.28); g.fill();
    ART.draw(g, 'hatch', cx, cy, 32, 32); return true;
  }
  if (o.k === 'fire') { ART.draw(g, 'fire_base', cx, cy, 28, 28); return true; }
  return false;
}
/* декор деревни: без коллизии, вне дорожек и дверей */
const DECOR = [
  ['logs', 27.3, 84.9, 1.45], ['bench', 30.5, 87.5, 0], ['logs', 33.8, 84.3, 1.7], ['bench', 30.4, 81.5, 3.14], ['logs', 46.6, 23.4, -0.3],
  ['bench', 16.7, 76.3, 0], ['barrel', 21.6, 75.2, 0], ['barrel', 31.3, 72.4, 0.5], ['bench', 30.8, 74.8, 0], ['barrel', 43.3, 77.1, 0], ['rubble', 40.5, 76.6, 0.8],
  ['bench', 17.2, 91.3, 0], ['barrel', 19.6, 88.3, 0], ['barrel', 44.1, 91.2, 0], ['bench', 42.6, 88.4, 0], ['barrel', 26.3, 96.3, 0], ['rubble', 31.1, 96.2, 1.4],
  ['barrel', 23.7, 77.6, 0], ['barrel', 24.2, 78.1, 1.2], ['barrel', 36.4, 79.5, 0.4], ['barrel', 46.4, 86.3, 0],
  ['rubble', 34.3, 92.4, 0.5], ['rubble', 11.6, 90.4, 2.1], ['rubble', 25.6, 18.6, 1], ['rubble', 95.5, 18.2, 0.3],
  ['fence', 16.5, 70.7, 0], ['fence', 18.5, 70.7, 0], ['fence', 20.5, 70.7, 0.04],
  ['fence', 38.5, 71.7, 0], ['fence', 40.5, 71.7, -0.03], ['fence', 42.5, 71.7, 0],
  ['fence', 12.6, 75.5, Math.PI / 2], ['fence', 12.6, 77.5, Math.PI / 2], ['fence', 12.6, 89.5, Math.PI / 2]
];
const C1DECOR = { ford: ['c1_ford', 230], logs: ['c1_log1', 46], bench: ['c1_log0', 44], barrel: ['c1_barrel', 22], rubble: ['c1_bricks', 32], fence: ['c1_fence_picket', 66] };
function artDecor(g) { C1SH = 1; try { artDecor0(g); } finally { C1SH = 0; } }
function artDecor0(g) {
  DECOR.forEach(d => {
    const x = d[1] * T, y = d[2] * T;
    if (!C1 && !ART.m.sprites[d[0]]) return;
    if (C1 && C1DECOR[d[0]]) { if (d[0] !== 'fence') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 4, 14, 8, d[3], 0, 6.28); g.fill(); } const c = C1DECOR[d[0]]; c1Draw(g, d[0] === 'fence' ? c[0] : c[0], x, y, c[1], d[3] + (d[0] === 'barrel' ? 0 : 0)); return; }
    if (d[0] !== 'fence') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 4, 14, 8, d[3], 0, 6.28); g.fill(); }
    ART.draw(g, d[0], x, y, undefined, undefined, d[3]);
  });
}
/* кроны: 8 вариантов из трёх спрайтов поворотом, зеркалом и масштабом; холст 144×144, в мире 72×72 */
const SHADOWS = !/shadow-off/.test(location.hash);
let CAN_PAD = 1;   // поле холста кроны под запечённую тень
function artCanopy() {
  CAN_PAD = C1 && SHADOWS ? 1.35 : 1;
  // C1: 0–5 деревья леса, 6–11 одиночные (сухие и берёзы в жёлтой листве), как на референсе
  const pick = C1 ? ['c1_pine0', 'c1_birch0', 'c1_pine1', 'c1_pine2', 'c1_birch1', 'c1_pine3', 'c1_dead0', 'c1_dead1', 'c1_birch3', 'c1_dead2', 'c1_dead3', 'c1_birch2']
    : ['tree_olive', 'tree_dry', 'tree_olive', 'tree_bare', 'tree_olive', 'tree_dry', 'tree_olive', 'tree_dry'];
  if (C1 && !CANOPY.built) { CAN_SZ = +((location.hash.match(/can-(\d+)/) || [])[1] || 96); CANOPY.built = 1; }
  const S2 = CAN_SZ / 2;
  for (let v = 0; v < pick.length; v++) {
    const c = document.createElement('canvas'); c.width = c.height = Math.round(CAN_SZ * 2 * CAN_PAD);
    const g = c.getContext('2d'); g.scale(2, 2);
    g.translate(S2 * CAN_PAD, S2 * CAN_PAD); if (v % 2) g.scale(-1, 1); g.rotate(v * 0.9);
    const s = 0.9 + (v % 3) * 0.06;
    if (CAN_PAD > 1) { g.shadowColor = 'rgba(8,10,4,0.5)'; g.shadowBlur = CAN_SZ * 0.1; g.shadowOffsetX = CAN_SZ * 0.16; g.shadowOffsetY = CAN_SZ * 0.2; }   // тень кроны вправо-вниз, как у домов и машин
    ART.draw(g, pick[v], 0, 0, CAN_SZ * s, CAN_SZ * s);
    c1Grade(c, 0, 0, c.width, c.height);
    CANOPY.push(c);
  }
}
/* цвет C1 под референс: меньше насыщенности (особенно жёлто-зелёной), больше контраста, чуть холоднее синий.
   Запекается один раз в куски земли, кроны и крыши, на кадр не тратится. #grade-c1-off отключает. */
const C1G = { sat: 0.74, gsat: 0.8, con: 1.38, mid: 62, gr: 1.0, gg: 0.975, gb: 1.1 };
function c1Grade(c, x, y, w, h) {
  if (!C1 || /grade-c1-off/.test(location.hash)) return;
  // пиксели читаются из рабочего холста, не из самого c: иначе браузер переводит c в медленный режим и рисует его дольше каждый кадр
  const W0 = ARTM.gt || (ARTM.gt = document.createElement('canvas'));
  if (W0.width < w) W0.width = w; if (W0.height < h) W0.height = h;
  const wg = W0.getContext('2d', { willReadFrequently: true });
  wg.clearRect(0, 0, w, h); wg.drawImage(c, x, y, w, h, 0, 0, w, h);
  const d = wg.getImageData(0, 0, w, h), a = d.data, k = C1G;
  for (let i = 0; i < a.length; i += 4) {
    let r = a[i], gg = a[i + 1], b = a[i + 2];
    const L = (r + gg + b) / 3, s = gg > r && gg > b ? k.sat * k.gsat : k.sat;
    r = L + (r - L) * s; gg = L + (gg - L) * s; b = L + (b - L) * s;
    a[i] = ((r - k.mid) * k.con + k.mid) * k.gr; a[i + 1] = ((gg - k.mid) * k.con + k.mid) * k.gg; a[i + 2] = ((b - k.mid) * k.con + k.mid) * k.gb;
  }
  wg.putImageData(d, 0, 0);
  const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(x, y, w, h); g.drawImage(W0, 0, 0, w, h, x, y, w, h); g.restore();   // полоса заменяется, остальной холст не трогается
}
/* спрайт C1 по ширине с сохранением пропорций */
let C1SH = 0;   // тень силуэта для объектов, запекаемых в землю (машины, автобус, люк, столбы, декор)
function c1Draw(g, id, x, y, w, a, al) {
  const s = ART.m.sprites[id];
  if (C1SH && C1 && SHADOWS) { const k = g.getTransform().a; g.shadowColor = 'rgba(6,8,4,0.55)'; g.shadowBlur = 4 * k; g.shadowOffsetX = 7 * k; g.shadowOffsetY = 9 * k; }
  ART.draw(g, id, x, y, w, w * s.rect[3] / s.rect[2], a || 0, al === undefined ? 1 : al);
  if (C1SH) { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = g.shadowOffsetX = g.shadowOffsetY = 0; }
}
/* крыши: шесть домов деревни по координатам, руины разрушенной крышей, бетон АТП прежним способом */
const ROOF_AT = { '15,72': 'roof_slate', '26,71': 'roof_patch', '37,73': 'roof_rust', '15,87': 'roof_patch', '39,87': 'roof_slate', '25,93': 'roof_rust' };
/* крыша C1 по размеру и материалу дома */
function c1RoofId(h, idx, old) {
  const big = h.w * h.h, long = Math.max(h.w, h.h) / Math.min(h.w, h.h);
  if (BIG && !h.ok && h.x === 15 && h.y === 28) return 'c1_tower';
  if (h.ruin) return big <= 16 ? 'c1_roof_shed' + (idx % 2) : 'c1_roof_barn';
  if (h.mat === 'conc') return big >= 110 ? 'c1_roof_hangar' : big <= 16 ? 'c1_booth' + (idx % 3) : 'c1_roof_office';
  if (long > 2.1 && big > 40) return 'c1_roof_barn';
  if (big <= 16) return 'c1_roof_shed' + (idx % 2);
  return old === 'roof_slate' ? 'c1_roof_house0' : old === 'roof_patch' ? 'c1_roof_house1' : old === 'roof_rust' ? 'c1_roof_house2' : 'c1_roof_house' + (idx % 3);
}
function artRoof(h, idx) {
  let id = ROOF_AT[h.ok || (h.x + ',' + h.y)] || (h.ruin ? 'roof_broken' : h.mat === 'conc' ? null : ['roof_slate', 'roof_rust', 'roof_patch'][idx % 3]);
  if (C1) id = c1RoofId(h, idx, id);
  if (!id) return null;
  const W = h.w * T + 10, Hh = h.h * T + 10, c = document.createElement('canvas');
  c.width = W * 2; c.height = Hh * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 9; g.shadowOffsetX = 4; g.shadowOffsetY = 6;
  const along = h.w >= h.h, sp = ART.m.sprites[id];
  if (C1 && id.startsWith('c1_')) {   // крыша C1: вырезать середину под пропорции дома, не растягивать
    // объём: снизу видна полоса передней стены, крыша над ней чуть короче и бросает тень на стену
    const flat = id === 'c1_tower' || id.startsWith('c1_booth');
    const wallH = flat ? 0 : Math.min(12, 6 + h.h * 0.8), RW = W - 6, RH = Hh - 6 - wallH;
    if (wallH) {
      g.shadowColor = 'transparent';
      const wy = RH - 2, wood = h.mat !== 'conc';
      g.fillStyle = wood ? '#3b3026' : '#5a5853'; g.fillRect(2, wy, RW - 4, wallH + 2);
      g.globalAlpha = 0.5; artFill(g, wood ? 'floor_wood' : 'wall_concrete', 2, wy, RW - 4, wallH + 2); g.globalAlpha = 1;
      if (wood) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 6; x < RW - 4; x += 7) { g.beginPath(); g.moveTo(x, wy); g.lineTo(x, wy + wallH + 2); g.stroke(); } }
      const gr = g.createLinearGradient(0, wy, 0, wy + wallH + 2); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = gr; g.fillRect(2, wy, RW - 4, wallH + 2);
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 4;
    }
    const tw = along ? RW : RH, th = along ? RH : RW, r = sp.rect, ka = tw / th;
    let sw = r[2], sh = r[3]; if (sw / sh > ka) sw = sh * ka; else sh = sw / ka;
    const sx = r[0] + (r[2] - sw) / 2, sy = r[1] + (r[3] - sh) / 2;
    g.save(); g.translate(RW / 2, RH / 2); if (!along) g.rotate(Math.PI / 2);
    g.drawImage(ART.images[sp.atlas], sx, sy, sw, sh, -tw / 2, -th / 2, tw, th); g.restore();
    if (!flat) {   // скаты: свет с северо-запада, верхний скат светлее, нижний темнее, кромка свеса
      g.shadowColor = 'transparent';
      const sl = along ? g.createLinearGradient(0, 0, 0, RH) : g.createLinearGradient(0, 0, RW, 0);
      sl.addColorStop(0, 'rgba(255,240,215,0.10)'); sl.addColorStop(0.49, 'rgba(255,240,215,0.04)'); sl.addColorStop(0.51, 'rgba(0,0,0,0.12)'); sl.addColorStop(1, 'rgba(0,0,0,0.22)');
      g.fillStyle = sl; g.fillRect(0, 0, RW, RH);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, RH - 2, RW, 2);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); c1Grade(c, 0, 0, c.width, c.height);
    return c;
  }
  if (along) ART.draw(g, id, (W - 6) / 2, (Hh - 6) / 2, W - 6, Hh - 6);
  else ART.draw(g, id, (W - 6) / 2, (Hh - 6) / 2, Hh - 6, W - 6, Math.PI / 2);
  return c;
}
function artCrate(o) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(o.x + 4, o.y + 5, o.w, o.h);
  ART.draw(ctx, C1 ? (o.stash ? 'c1_crate_army' : 'c1_crate') : 'crate', o.x + o.w / 2, o.y + o.h / 2, o.w, o.h, ((o.x + o.y) % 4) * Math.PI / 2);
  if (o.stash && !o.looted) { const p = 0.5 + 0.5 * Math.sin(S.min * 4); ctx.fillStyle = 'rgba(220,170,80,' + (0.25 + p * 0.35) + ')'; ctx.fillRect(o.x + o.w / 2 - 2, o.y - 6, 4, 4); }
}
function artCache(o) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 4, 9, 5, 0, 0, 6.28); ctx.fill();
  ART.draw(ctx, 'stash', o.x, o.y, 16, 14);
  const p = 0.5 + 0.5 * Math.sin(S.min * 5); ctx.fillStyle = 'rgba(220,170,80,' + (0.3 + p * 0.4) + ')'; ctx.fillRect(o.x - 2, o.y - 16, 4, 4);
}
/* пакет C1 (графика Кордона от GPT): дополняет и заменяет материалы и спрайты деревни; #c1-off — прежняя графика */
const C1 = !!(window.C1_MANIFEST && !/c1-off/.test(location.hash));
function c1Merge() {
  if (!C1) return;
  const M = window.VILLAGE_MANIFEST, C = window.C1_MANIFEST;
  M.sprites.bare_soil = M.sprites.dirt; // мелкий гравий без отпечатка шин
  Object.assign(M.images, C.images); Object.assign(M.sprites, C.sprites);
}
const c1 = id => C1 && ART && ART.m.sprites[id];
async function loadArt() {
  if (!window.VillageArt || !window.VILLAGE_MANIFEST) { console.warn('Графика деревни: пакет не найден, остаётся прежняя графика.'); return; }
  c1Merge();
  try {
    ART = await new window.VillageArt(window.VILLAGE_MANIFEST).load('');
    const base = ART.pattern.bind(ART);
    ART.pattern = (ctx, id, size) => {   // бесшовный материал C1: один период без зеркал
      const s = ART.m.sprites[id];
      if (!s || !s.seamless) return base(ctx, id, size);
      const key = id + ':s';
      if (!ART.patterns.has(key)) { const c = document.createElement('canvas'); c.width = s.rect[2]; c.height = s.rect[3]; c.getContext('2d').drawImage(ART.images[s.atlas], ...s.rect, 0, 0, c.width, c.height); ART.patterns.set(key, c); }
      const p = ctx.createPattern(ART.patterns.get(key), 'repeat'); p.setTransform(new DOMMatrix().scale(s.logicalSize[0] / s.rect[2], s.logicalSize[1] / s.rect[3])); return p;
    };
  }
  catch (e) { ART = null; console.warn('Графика деревни не загрузилась, остаётся прежняя графика:', e && e.message); }
}
