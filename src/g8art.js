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

// Клетки брода проходимы как грунт. Для материалов и прибрежных растений
// русло продолжается через них, как на соседних участках ручья.
function surfaceTiles() {
  if (!BIG || !C1) return map;
  if (!ARTM.surface) {
    const tiles = map.slice();
    for (let y = FORD[0]; y <= FORD[1]; y++) {
      const center = STREAM_X(y);
      tiles.fill(SW, y * MW + center - 1, y * MW + center + 2);
    }
    ARTM.surface = tiles;
  }
  return ARTM.surface;
}

// Расстояние в клетках до берега или твёрдого покрытия. Два прохода
// по карте вместо поиска соседей для каждого пикселя маски и кадра.
function terrainDistance(matches) {
  const tiles = surfaceTiles(), dist = new Uint8Array(MW * MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x;
    dist[i] = matches(tiles[i]) ? 0 : Math.min(10,
      x ? dist[i - 1] + 1 : 10, y ? dist[i - MW] + 1 : 10);
  }
  for (let y = MH - 1; y >= 0; y--) for (let x = MW - 1; x >= 0; x--) {
    const i = y * MW + x;
    dist[i] = Math.min(dist[i], x + 1 < MW ? dist[i + 1] + 1 : 10,
      y + 1 < MH ? dist[i + MW] + 1 : 10);
  }
  return dist;
}

function autumnTerrain() {
  if (!ARTM.autumn) {
    ARTM.autumn = {
      water: terrainDistance(t => t === SW),
      verge: terrainDistance(t => t === DI || t === AS || t === RA || t === CF)
    };
  }
  return ARTM.autumn;
}

// Светлые стебли выделены сильнее тёмной почвы. Исходный рисунок
// бесшовной текстуры остаётся в масштабе мира; материал создаётся один раз.
function autumnGrassPattern(g) {
  if (!PATS.straw) {
    const sp = ART.m.sprites.grass_dry;
    const tile = document.createElement('canvas');
    tile.width = sp.rect[2]; tile.height = sp.rect[3];
    const tg = tile.getContext('2d');
    tg.drawImage(ART.images[sp.atlas], ...sp.rect, 0, 0, tile.width, tile.height);
    const pixels = tg.getImageData(0, 0, tile.width, tile.height), d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const straw = clamp((d[i] + d[i + 1] - 60) / 220, 0, 1);
      d[i] += 12 + 27 * straw;
      d[i + 1] += 6 + 16 * straw;
      d[i + 2] += 2 + 4 * straw;
    }
    tg.putImageData(pixels, 0, 0);
    PATS.straw = g.createPattern(tile, 'repeat');
    PATS.straw.setTransform(new DOMMatrix().scale(sp.logicalSize[0] / tile.width, sp.logicalSize[1] / tile.height));
  }
  return PATS.straw;
}

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

// У брода изгиб ручья пересекает границу клеток. Сглаживаем оба берега
// в мировых координатах и сводим их к обычной воде на концах участка.
function drawFordWater(g) {
  const top = FORD[0] - 4, bottom = FORD[1] + 5;
  const left = (STREAM_X(FORD[0]) - 5) * T, width = 10 * T;
  if (GWP.y1 <= top * T || GWP.y0 >= bottom * T || GWP.x1 <= left || GWP.x0 >= left + width) return;
  if (!ARTM.fordWater) {
    const c = document.createElement('canvas');
    c.width = width; c.height = (bottom - top) * T;
    const ctx = c.getContext('2d');
    ctx.translate(-left, -top * T);
    artFill(ctx, 'water', left, top * T, c.width, c.height);
    const pixels = ctx.getImageData(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      const row = top + (y + .5) / T;
      const blend = clamp(Math.min(row - top, bottom - row), 0, 1);
      const axis = streamCenter(row - .5);
      const center = (lerp(STREAM_X(Math.floor(row)), axis, blend) + .5) * T - left;
      const west = center - 1.5 * T + blend * (vnoise(7, y, 19) - .5) * 12;
      const east = center + 1.5 * T + blend * (vnoise(83, y, 23) - .5) * 14;
      for (let x = 0; x < c.width; x++) {
        const edge = Math.min(x + .5 - west, east - x - .5);
        const silt = blend * (hash2(x + left, y + top * T) - .5) * 3;
        pixels.data[(y * c.width + x) * 4 + 3] = 255 * clamp(.5 + (edge + silt) / (1 + 10 * blend), 0, 1);
      }
    }
    ctx.putImageData(pixels, 0, 0); ARTM.fordWater = c;
  }
  g.drawImage(ARTM.fordWater, left, top * T);
}

// Небольшие пятна вынесены в кэш. Поворот и размер меняются вдоль тропы,
// но для обоих соседних кусков земли последовательность одинакова.
const trailPrints = new Map();
function trailPrint(wet, variant) {
  const key = variant + (wet ? 4 : 0);
  if (trailPrints.has(key)) return trailPrints.get(key);
  const c = document.createElement('canvas'); c.width = 92; c.height = 64;
  const g = c.getContext('2d');
  g.translate(-variant * 31, -variant * 17);
  artFill(g, 'bare_soil', variant * 31, variant * 17, c.width, c.height);
  const image = g.getImageData(0, 0, c.width, c.height), d = image.data;
  const tint = wet ? [49,45,37] : [166,143,111];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const grit = hash2(x + variant * 57, y) - .5, grain = vnoise(x, y + 25 * variant, 6) - .5;
    const falloff = 1 - Math.hypot((x - 46) / 44, (y - 32) / 29) + grain * .22;
    const i = (y * c.width + x) * 4;
    for (let channel = 0; channel < 3; channel++) {
      d[i + channel] = d[i + channel] * .54 + tint[channel] * .46 + 19 * grain + 12 * grit;
    }
    d[i + 3] = 255 * clamp(falloff * (wet ? 1.3 : 1.05), 0, 1);
  }
  g.putImageData(image, 0, 0); trailPrints.set(key, c); return c;
}

function drawVillageLanes(g) {
  if (GWP.x1 < 40*T || GWP.x0 > 86*T || GWP.y1 < 159*T || GWP.y0 > 184*T) return;
  g.save();
  VILLAGE_LANES.forEach((lane, l) => {
    for (let i = 1; i < lane.length; i++) {
      const [ax, ay] = lane[i - 1], [bx, by] = lane[i];
      const dx = (bx - ax) * T, dy = (by - ay) * T, len = Math.hypot(dx, dy);
      for (let dist = 0, j = 0; dist < len; dist += 19, j++) {
        const x = ax*T + dx*dist/len, y = ay*T + dy*dist/len;
        if (x < GWP.x0-55 || x > GWP.x1+55 || y < GWP.y0-55 || y > GWP.y1+55) continue;
        const n = hash2(l * 13 + i, j);
        g.save(); g.translate(x, y); g.rotate(Math.atan2(dy, dx) + (n - .5) * .23);
        const w = 56 + n * 16, h = (l === 0 || l === 3 || l === 6 ? 42 : 29) + n * 7;
        g.globalAlpha = .65; g.drawImage(trailPrint(false, j % 4), -w/2, -h/2, w, h); g.restore();
      }
    }
  });
  g.restore();
}

function drawSurfaceEdges(g, tiles) {
  for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = tiles[y * MW + x];
    if (t !== CF && t !== AS && t !== DI) continue;
    for (const [nx, ny] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const other = inb(x + nx, y + ny) ? tiles[(y + ny) * MW + x + nx] : VO;
      if (!GROUNDISH(other) && !(t !== DI && other === DI)) continue;
      const r = mulberry32(1423 + (y * MW + x) * 13 + nx * 3 + ny);
      g.save();
      g.translate((x + .5 + nx*.5)*T, (y + .5 + ny*.5)*T);
      g.rotate(Math.atan2(-nx, ny));  // +Y указывает на внешнюю сторону кромки
      if (t === CF) {
        // Заход грунта на плиту, скол и короткий шов среди гравия.
        g.save(); g.beginPath(); g.moveTo(-16, 0);
        for (let u = -16; u <= 16; u += 4) {
          const worldX = (x + .5 + nx*.5)*T + ny*u, worldY = (y + .5 + ny*.5)*T - nx*u;
          const depth = 1 + 13 * vnoise(worldX+9, worldY, 17) + 3 * hash2(worldX, worldY);
          g.lineTo(u, -depth);
        }
        g.lineTo(16, 2); g.lineTo(-16, 2); g.closePath(); g.clip();
        artFill(g, 'bare_soil', -16, -14, 32, 18); g.restore();
        if (r() < .32) {
          const u = r()*18-9;
          g.strokeStyle = 'rgba(50,44,35,.53)'; g.lineWidth = .9; g.beginPath();
          g.moveTo(u,-5); g.lineTo(u+3,-11); g.lineTo(u+2,-15-r()*8); g.stroke();
        }
      }
      const stones = Math.floor((t === CF ? 24 : 11) * r());
      for (let j = 0; j < stones; j++) {
        const u = (r()-.5)*T, v = (r()-.47)*(t === DI ? 19 : 14), size = .65+r()*1.7;
        g.fillStyle = j % 3 ? 'rgba(78,69,52,.54)' : 'rgba(168,152,125,.58)';
        g.beginPath(); g.ellipse(u,v,size,size*.57,r()*3,0,2*Math.PI); g.fill();
      }
      if (other !== DI && r() < .17) {
        const size = 8 + r()*9;
        ART.draw(g, 'c1_tuft'+Math.floor(r()*6), r()*18-9, 4+r()*4, size, size*.86, r()*6, .84);
      }
      g.restore();
    }
  }
}

function* artGround(g, R) {
  const shoulders = BIG && C1, tiles = surfaceTiles();
  // 1. Основа: трава, грунт, асфальт, полы. Болото, насыпь и пустота остаются из прежней отрисовки.
  for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = tiles[y * MW + x], px = x * T, py = y * T;
    let id = GROUNDISH(t) || t === DI ? 'grass' : t === AS ? (shoulders ? 'grass' : 'asphalt') : t === FL ? 'floor_wood' : t === CF ? 'floor_concrete' : null;
    if (C1 && t === SW) {
      id = BIG && x >= 224 ? 'water' : 'swamp';
      if (id === 'water' && y >= FORD[0] - 4 && y < FORD[1] + 5 && Math.abs(x - STREAM_X(y)) <= 1) id = 'grass';
    }
    if (id) artFill(g, id, px, py, T, T);
    if (C1 && t === RA) c1Rail(g, x, y);
    if (!shoulders && t === AS && x === roadX[y] && y % 3 === 0 && y > 8) { g.fillStyle = 'rgba(200,190,150,0.16)'; g.fillRect(px + 14, py + 4, 4, 18); }
    if (t === CF) { g.strokeStyle = 'rgba(25,25,20,0.18)'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); }
  }
  yield;
  // 2. Сухая трава крупными мягкими пятнами: маска низкого разрешения, накладывается кусками 512 px
  if (!ARTM.dry) {
    const mask = document.createElement('canvas'); mask.width = MW * 2; mask.height = MH * 2;
    const terrain = shoulders && autumnTerrain();
    const mg = mask.getContext('2d'), md = mg.createImageData(mask.width, mask.height);
    for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
      const tx = x >> 1, ty = y >> 1, t = tiles[ty * MW + tx];
      const v = vnoise(x, y, 11) * 0.7 + vnoise(x + 31, y + 17, 4) * 0.3;
      let a = GROUNDISH(t) ? clamp((v - 0.5) * 4, 0, 1) : 0;
      if (terrain && GROUNDISH(t) && tx < PW) {
        const i = ty * MW + tx;
        const exposure = clamp((terrain.water[i] - 1) / 5, 0, 1);
        const shoulder = Math.max(0, 1 - terrain.verge[i] / 4);
        a = exposure * clamp((v - .20) * 1.9 + shoulder * .25, 0, 1);
      }
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
    cg.setTransform(GS, 0, 0, GS, -cx * GS, -cy * GS);
    if (shoulders) { cg.fillStyle = autumnGrassPattern(cg); cg.fillRect(cx, cy, w, h); }
    else artFill(cg, 'grass_dry', cx, cy, w, h);
    cg.setTransform(1, 0, 0, 1, 0, 0);
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
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) a[y * mw + x] = coverage(tiles[(y / K | 0) * MW + (x / K | 0)]) ? 1 : 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, n = 0; for (let d = -2; d <= 2; d++) { const xx = x + d; if (xx >= 0 && xx < mw) { s += a[y * mw + xx]; n++; } } b2[y * mw + x] = s / n; }
      for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { let s = 0, n = 0; for (let d = -2; d <= 2; d++) { const yy = y + d; if (yy >= 0 && yy < mh) { s += b2[yy * mw + x]; n++; } } a[y * mw + x] = s / n; }
    }
    const mk = document.createElement('canvas'); mk.width = mw; mk.height = mh;
    const mg2 = mk.getContext('2d'), id2 = mg2.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const t = tiles[(y / K | 0) * MW + (x / K | 0)];
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
      if (coverage(tiles[y * MW + x])) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    if (bx1 >= 0 && (bx1 + 4) * T > GWP.x0 && (bx0 - 3) * T < GWP.x1 && (by1 + 4) * T > GWP.y0 && (by0 - 3) * T < GWP.y1) {
      const rx0 = Math.max(GWP.x0, (bx0 - 3) * T), ry0 = Math.max(GWP.y0, (by0 - 3) * T), rx1 = Math.min(GWP.x1, (bx1 + 4) * T), ry1 = Math.min(GWP.y1, (by1 + 4) * T);
      for (let cy = ry0; cy < ry1; cy += CH) for (let cx = rx0; cx < rx1; cx += CH) {
        const w = Math.min(CH, rx1 - cx), h = Math.min(CH, ry1 - cy);
        cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, w * GS, h * GS);
        cg.setTransform(GS, 0, 0, GS, -cx * GS, -cy * GS); artFill(cg, id, cx, cy, w, h);
        if (shoulders && tt === DI) {
          cg.fillStyle = 'rgba(178,145,101,.16)';
          cg.fillRect(cx, cy, w, h);
          drawWheelTracks(cg, cx, cy, w, h);
        }
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
  if (C1) {
    c1ForestFloor(g);
    if (BIG) {
      drawSurfaceEdges(g, tiles);
      drawFordWater(g);
    }
    yield;
    c1Scatter(g); yield;
    const [w, h] = ART.m.sprites.camp_yard.logicalSize;
    if (Math.abs(FIRE.x - (GWP.x0 + GWP.x1) / 2) < (w + GWP.x1 - GWP.x0) / 2 &&
        Math.abs(FIRE.y - (GWP.y0 + GWP.y1) / 2) < (h + GWP.y1 - GWP.y0) / 2) {
      g.save(); g.beginPath(); g.rect(FIRE.x-w/2, FIRE.y-h/2, w, h);
      for (const house of HOUSES) {
        if (house.x*T >= FIRE.x+w/2 || house.y*T >= FIRE.y+h/2 ||
            (house.x+house.w)*T <= FIRE.x-w/2 || (house.y+house.h)*T <= FIRE.y-h/2) continue;
        g.rect(house.x*T, house.y*T, house.w*T, house.h*T);
      }
      g.clip('evenodd'); ART.draw(g, 'camp_yard', FIRE.x, FIRE.y, w, h); g.restore();
    }
    if (BIG) drawVillageLanes(g);
  }
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
// Пучки группируются по мировым координатам. Берег узнаётся по камышу,
// обочина — по низкой траве, открытое поле — по более редким куртинам.
function scatterAutumnPlants(g, x, y, terrain) {
  const i = y * MW + x, bank = terrain.water[i] <= 2, verge = terrain.verge[i];
  const patch = vnoise(x + 31, y - 19, 5);
  const density = bank ? .23 : verge <= 2 ? .22 : .12;
  if (hash2(x + 191, y + 67) > density * (.25 + patch * 1.4)) return;
  const r = mulberry32((y * MW + x) * 31 + 57);
  const cx = (x + .35 + r() * .3) * T, cy = (y + .35 + r() * .3) * T;
  if (bank || (verge >= 2 && patch > .57 && r() < .19)) {
    const size = bank ? 21 + r() * 13 : 23 + r() * 17;
    groundShadow(g, cx, cy, size * .37, size * .23, .3, 3);
    ART.draw(g, bank ? 'c1_bush3' : 'c1_bush' + Math.floor(r() * 3), cx, cy, size, size, r() * 6.28);
  } else {
    const count = 2 + Math.floor(r() * 3);
    for (let n = 0; n < count; n++) {
      const size = 8 + r() * 12, dx = (r() - .5) * 21, dy = (r() - .5) * 13;
      ART.draw(g, 'c1_tuft' + Math.floor(r() * 6), cx + dx, cy + dy, size, size * .8, r() * 6.28);
    }
  }
}

/* разброс C1: брёвна, пни, камни, пятна. Место выбирается по хешу клетки, так что соседние куски рисуют одно и то же */
function scatterObject(x,y) {
    const h = hash2(x * 3 + 11, y * 7 + 5); if (h > 0.03) return null;
    let road = false; for (let dy = -2; dy <= 2 && !road; dy++) for (let dx = -2; dx <= 2; dx++) { const t = tAt(x + dx, y + dy); if (t === DI || t === AS || t === BR || t === CO || t === FL || t === CF || t === RA) { road = true; break; } }
    if (road) return null;
    const h2 = hash2(y + 31, x + 17), cx = x * T + 16, cy = y * T + 16, a = h2 * 6.28;
    let id, w, hh, al = 1;
    if (h < 0.007) { id = 'c1_log' + Math.floor(h2 * 3); w = 110; hh = 36; }
    else if (h < 0.013) { id = 'c1_stump' + Math.floor(h2 * 3); w = hh = 26; }
    else if (h < 0.018) { id = 'c1_rock' + Math.floor(h2 * 3); w = hh = 28 + h2 * 10; }
    else { id = 'c1_decal' + [0, 1, 3, 4][Math.floor(h2 * 4)]; w = hh = 90 + h2 * 50; al = 0.7; }
    return {id,w,hh,al,cx,cy,a};
}
function c1Scatter(g) {
  const terrain = BIG && autumnTerrain();
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
    if (terrain) scatterAutumnPlants(g, x, y, terrain);
    const prop = scatterObject(x,y); if (!prop) continue;
    const {id,w,hh,al,cx,cy,a} = prop;
    if (id.startsWith('c1_log')) {
      groundShadow(g, cx, cy, w * .48, hh * .26, a, 3);
      ART.draw(g, id, cx, cy, w, hh, a);
    } else if (id.startsWith('c1_decal')) ART.draw(g, id, cx, cy, w, hh, a, al);
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
// Плотная сухая земля у стены постепенно переходит в траву. Рисунок
// зависит от координат двери и сохраняется при перестроении соседних кусков.
function wornEntrance(width, seed) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(width + 24); c.height = 63;
  const g = c.getContext('2d');
  g.fillStyle = '#a18461'; g.fillRect(0, 0, c.width, c.height);
  if (ART) {
    g.globalAlpha = .46;
    artFill(g, C1 ? 'bare_soil' : 'dirt', 0, 0, c.width, c.height);
  }
  const image = g.getImageData(0, 0, c.width, c.height), data = image.data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const depth = y / c.height;
    const center = c.width / 2 + Math.sin(depth * 3 + seed) * 3;
    const lateral = (x - center) / (width * (.53 - .16 * depth));
    const rim = Math.hypot(lateral, (y - 9) / 53);
    const tuft = vnoise(x + seed, y, 5) - .5;
    const grit = hash2(x + seed, y) - .5, i = (y * c.width + x) * 4;
    data[i + 3] = 235 * clamp((1 - rim + tuft * .32 + grit * .10) * 3.8, 0, 1);
    for (let k = 0; k < 3; k++) data[i + k] += tuft * 16 + grit * 22;
  }
  g.putImageData(image, 0, 0);
  return c;
}

// В локальных координатах ось Y направлена из дома наружу.
// Ступени выступают за свес даже у дальней стены. Вся площадка запекается в землю.
function drawThresholds(g) {
  for (const h of HOUSES) {
    if (h.x > GW.x1 + 3 || h.y > GW.y1 + 3 || h.x + h.w < GW.x0 - 3 || h.y + h.h < GW.y0 - 3) continue;
    const concrete = h.mat === 'conc';
    for (const door of h.entrances) {
      const w = door.width, left = -w / 2;
      g.save(); g.translate(h.x * T + door.x, h.y * T + door.y);
      g.rotate(Math.atan2(-door.nx, door.ny));
      const style = hash2((h.x + door.x / T) * 2, (h.y + door.y / T) * 2);
      if (!door.soil) door.soil = wornEntrance(w, Math.floor(style * 4096));
      g.drawImage(door.soil, -door.soil.width / 2, -3);
      const broken = h.ruin && door.breach, depth = broken ? 12 : 26;
      g.fillStyle = 'rgba(39,30,21,.36)';
      g.fillRect(left + 2, -2, w, depth + 4);
      g.fillStyle = concrete ? '#59574d' : '#4b3b2c';
      g.fillRect(left, -T / 2 - 4, w, T / 2 + depth);
      for (let row = 0; row < (broken ? 2 : 4); row++) {
        const y = row * 7, inset = row * 1.15, x = left + inset, width = w - 2*inset;
        g.fillStyle = concrete ? '#918d7e' : '#947958'; g.fillRect(x, y, width, 6);
        if (ART) {
          g.globalAlpha = .54; artFill(g, concrete ? 'floor_concrete' : 'floor_wood', x, y, width, 6); g.globalAlpha = 1;
        }
        g.fillStyle = concrete ? '#b3ae9e' : '#b9a17c'; g.fillRect(x + 1, y + 4.7, width - 2, 1.3);
        if (!concrete) {
          g.fillStyle = '#504637'; g.fillRect(x + 3, y + 2, 1.4, 1.4); g.fillRect(x+width-4,y+2,1.4,1.4);
        }
      }
      // Косяки остаются видны изнутри при прозрачной крыше.
      g.fillStyle = concrete ? '#69695f' : '#68503a';
      g.fillRect(left - 2, -T / 2 - 5, 3, 10); g.fillRect(-left - 1, -T / 2 - 5, 3, 10);
      g.restore();
    }
  }
}
function artBush(g, x, y) { const h = hash2(x, y); ART.draw(g, C1 ? (tAt(x, y + 1) === SW || tAt(x, y - 1) === SW ? 'c1_bush3' : 'c1_bush' + Math.floor(hash2(y, x + 7) * 3)) : 'bush', x * T + 16 + (h - 0.5) * 6, y * T + 16 + (hash2(y, x) - 0.5) * 6, 36 * (0.85 + h * 0.3), 36 * (0.85 + h * 0.3), h * 6.28); }
// Бетонная панель опирается на коллайдер. Верх всех секций смещён на (-5, -12)
// в мировых координатах, поэтому крышки и проволока сходятся на углах периметра.
function drawCheckpointWall(g, length, bays, upright) {
  const bay = length / bays, topX = upright ? -12 : -5, topY = upright ? 5 : -12;
  const edge = upright ? -4 : 4;
  // Видимая грань от основания до крышки; рисунок бетона проходит через весь пролёт.
  g.save();
  g.transform(1, 0, topX / 12, topY / 12, 0, edge);
  artFill(g, 'wall_concrete', 0, 0, length, 12);
  g.fillStyle = 'rgba(47,43,35,.27)'; g.fillRect(0, 0, length, 12);
  g.fillStyle = 'rgba(37,34,28,.48)'; g.fillRect(0, 0, length, 2);
  for (let i = 0; i <= bays; i++) {
    const x = i * bay;
    g.fillStyle = '#534f46'; g.fillRect(x - 2, 0, 4, 12);
    g.fillStyle = '#878477'; g.fillRect(x - 2, 0, 2, 12);
  }
  g.restore();
  // Торец у проезда виден и при взгляде вдоль плиты.
  g.fillStyle = '#676358'; g.beginPath();
  g.moveTo(length, -4); g.lineTo(length, 4); g.lineTo(length + topX, topY + 4);
  g.lineTo(length + topX, topY - 4); g.closePath(); g.fill();
  g.translate(topX, topY);
  artFill(g, 'floor_concrete', 0, -4, length, 8);
  g.fillStyle = 'rgba(186,183,163,.47)'; g.fillRect(0, -4, length, 8);
  g.fillStyle = '#b3af9c'; g.fillRect(0, -edge, length, 1);
  for (let i = 0; i <= bays; i++) {
    const x = i * bay;
    g.fillStyle = '#514c44'; g.fillRect(x - 2.5, -5, 5, 10);
    g.fillStyle = '#9a9788'; g.fillRect(x - 2.5, -5, 4, 8.5);
  }
  // Опоры и натяжной трос расположены на крышке; витки слегка выступают над ней.
  g.translate(topX / 4, topY / 4);
  g.fillStyle = '#5b4e42'; g.fillRect(0, -.75, length, 1.5);
  const turns = Math.ceil(length / 7), pitch = length / turns;
  g.strokeStyle = '#443b35'; g.lineWidth = 1.8; g.beginPath();
  for (let i = 0; i < turns; i++) {
    const x = (i + .5) * pitch;
    g.moveTo(x + 4.4, 0); g.ellipse(x, 0, 4.4, 5, 0, 0, 2 * Math.PI);
  }
  g.stroke(); g.beginPath(); g.lineWidth = 1; g.strokeStyle = '#b4aaa0';
  for (let i = 0; i < turns; i++) {
    const x = (i + .5) * pitch;
    g.moveTo(x - 4.4, 0); g.ellipse(x, 0, 4.4, 5, 0, Math.PI, Math.PI * 1.8);
    if (i % 2 === 0) { g.moveTo(x - 1, 2); g.lineTo(x + 2, 6); }
  }
  g.stroke();
}
// Секции рисуются один раз на кусок земли, по оси того же препятствия, что и коллизия.
function drawFenceRun(g, o) {
  const upright = o.h > o.w, length = Math.max(o.w, o.h);
  const wood = o.material === 'picket' || o.material === 'rail';
  const bays = Math.ceil(length / 55), bay = length / bays;
  g.save();
  g.translate(o.x + o.w / 2, o.y + o.h / 2);
  // Смещение тени в мировых координатах сохраняется и на поперечных секциях.
  if (SHADOWS) {
    g.save(); g.translate(SUN_DX * 4, SUN_DY * 4);
    if (upright) g.rotate(Math.PI / 2);
    g.fillStyle = 'rgba(26,21,15,.35)'; g.fillRect(-length / 2, -2, length, 5);
    g.restore();
  }
  if (upright) g.rotate(Math.PI / 2);
  g.translate(-length / 2, 0);
  if (o.material === 'concreteWire') {
    drawCheckpointWall(g, length, bays, upright); g.restore(); return;
  }
  if (o.material === 'picket') {
    for (let x = 2; x < length - 2; x += 5) {
      const wear = hash2(o.x + x, o.y), h = 5 + 3 * wear;
      g.fillStyle = wear < .3 ? '#6d6250' : '#897860';
      g.fillRect(x, 3 - h, 3.8, h);
      g.fillStyle = '#ae9c80'; g.fillRect(x, 3 - h, 3, 1);
    }
  } else if (!wood) {
    g.beginPath();
    for (let x = 0; x < length - 5; x += 5) {
      g.moveTo(x, -3); g.lineTo(x + 5, 3); g.moveTo(x, 3); g.lineTo(x + 5, -3);
    }
    g.strokeStyle = '#847e6e'; g.lineWidth = 1; g.stroke();
  }
  for (let i = 0; i < bays; i++) {
    const center = (i + .5) * bay;
    ART.draw(g, wood ? 'c1_fence_picket' : 'c1_fence_mesh', center, 1, bay, wood ? 5 : 3);
    if (o.material === 'rail') ART.draw(g, 'c1_fence_picket', center, -3, bay, 3);
  }
  for (let i = 0; i <= bays; i++) {
    const x = i * bay;
    g.fillStyle = wood ? '#504537' : '#494743'; g.fillRect(x - 2, -4, 4, 9);
    g.fillStyle = wood ? '#aea08a' : '#aaa497'; g.fillRect(x - 2, -4, 3.5, 3);
  }
  g.restore();
}
/* объекты на земле: центр = левый верх + половина размера */
function artStatic(g, o) { C1SH = o.k !== 'fire'; try { return artStatic0(g, o); } finally { C1SH = 0; } }
// Стойки остаются на обочинах, стрела поворачивается вокруг левого шарнира.
function drawBridgeGate(g, o) {
  const sp = c1('c1_checkpoint');
  if (!sp) return false;
  const [sx, sy] = sp.rect, sheet = ART.images[sp.atlas];
  g.save();
  g.translate(o.x, o.y + o.h / 2);
  g.drawImage(sheet, sx, sy, 106, 129, -12, -11, 18, 22);
  g.drawImage(sheet, sx + 382, sy, 103, 129, o.w - 6, -11, 18, 22);
  g.translate(3, 0);
  if (!o.solid) g.rotate(-1.35);
  g.drawImage(sheet, sx + 106, sy + 53, 276, 16, 0, -2.5, o.w - 7, 5);
  g.restore();
  return true;
}
function artStatic0(g, o) {
  if (o.k === 'fence' && o.material) { drawFenceRun(g, o); return true; }
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (C1 && o.k === 'sand') {
    ART.draw(g, 'c1_sandbags', cx, cy, o.w + 2, o.h + 2);
    return true;
  }
  if (C1 && (o.k === 'bed' || o.k === 'table')) {
    const bed = o.k === 'bed';
    g.save();
    spriteShadow(g, 2, 1.5);
    g.drawImage(ART.images.furniture, bed ? 0 : 64, 0, 64, bed ? 43 : 38,
      o.x, o.y, o.w, o.h);
    g.restore();
    return true;
  }
  if (C1 && o.k === 'bus') { const w = o.w * 1.25, s = ART.m.sprites.c1_bus, h = w * s.rect[3] / s.rect[2]; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - w / 2 + 6, cy - h / 2 + 7, w, h); c1Draw(g, 'c1_bus', cx, cy, w); return true; }
  if (C1 && o.k === 'car' && o.sprite) {
    c1Draw(g, o.sprite, cx, cy, o.w + 4, 0, 1, 5); return true;
  }
  if (C1 && o.k === 'car') {
    const id = o.seed >= 10 ? 'c1_army' + (o.seed % 3) : ['c1_car0', 'c1_car1', 'c1_car2', 'c1_tractor'][o.seed % 4], w = o.seed >= 10 ? 84 : 70, a = o.seed % 2 ? Math.PI : 0;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(cx + 4, cy + 5, w * 0.48, w * 0.22, 0, 0, 6.28); g.fill(); c1Draw(g, id, cx, cy, w, a); return true;
  }
  if (C1 && o.k === 'hatch') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(cx + 2, cy + 3, 22, 0, 6.28); g.fill(); c1Draw(g, 'c1_hatch', cx, cy, 46); return true; }
  if (C1 && o.k === 'fire') {
    // У деревенского костра брёвна расставлены у посадочных мест.
    g.save(); spriteShadow(g, 2.6, 1.8);
    if (cx === FIRE.x && cy === FIRE.y) c1Draw(g, 'camp_ring', cx, cy, 40);
    else c1Draw(g, 'c1_campfire', cx, cy, 30 * 192 / 72);
    g.restore(); return true;
  }
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
// Низкие предметы запекаются в землю до кустов и крупных объектов.
function drawCordonDetails(g) {
  if (!BIG || !C1 || !ART) return;
  g.save();
  spriteShadow(g, 2.5, 1.5);
  for (const [id, tx, ty, width, angle] of CORDON_DETAILS) {
    const x = tx * T, y = ty * T;
    // Захватываем и соседний кусок, если повёрнутый рисунок пересекает границу.
    if (x + width < GWP.x0 || x - width > GWP.x1 || y + width < GWP.y0 || y - width > GWP.y1) continue;
    c1Draw(g, id, x, y, width, angle);
  }
  g.restore();
}
/* декор деревни: координаты для рисунка и коллизии */
const DECOR = [
  ...YARD_SEATS.filter(s => s.log).map(s => {
    const [kind, dx, dy, angle] = s.log;
    return [kind, s.x + dx, s.y + dy, angle];
  }),
  ['logs', 46.6, 23.4, -0.3],
  ['bench', 16.7, 76.3, 0], ['barrel', 21.6, 75.2, 0], ['barrel', 31.3, 72.4, 0.5], ['bench', 30.8, 74.8, 0], ['barrel', 43.3, 77.1, 0], ['rubble', 40.5, 76.6, 0.8],
  ['bench', 17.2, 91.3, 0], ['barrel', 19.6, 88.3, 0], ['barrel', 44.1, 91.2, 0], ['bench', 42.6, 88.4, 0], ['barrel', 26.3, 96.3, 0], ['rubble', 31.1, 96.2, 1.4],
  ['barrel', 23.7, 77.6, 0], ['barrel', 24.2, 78.1, 1.2], ['barrel', 36.4, 79.5, 0.4], ['barrel', 46.4, 86.3, 0],
  ['rubble', 34.3, 92.4, 0.5], ['rubble', 11.6, 90.4, 2.1], ['rubble', 25.6, 18.6, 1], ['rubble', 95.5, 18.2, 0.3],
  ['fence', 16.5, 70.7, 0], ['fence', 18.5, 70.7, 0], ['fence', 20.5, 70.7, 0.04],
  ['fence', 44.45, 71.7, 0], ['fence', 40.5, 71.7, -0.03], ['fence', 42.5, 71.7, 0],
  ['fence', 12.6, 75.5, Math.PI / 2], ['fence', 12.6, 77.5, Math.PI / 2], ['fence', 12.6, 89.5, Math.PI / 2]
];
// Контуры трёх плит в исходном атласе брода, в пикселях спрайта.
const FORD_SLABS = [
  [[42,213],[92,207],[148,210],[150,237],[145,290],[88,293],[42,292]],
  [[162,211],[218,208],[262,207],[310,207],[313,245],[312,288],[293,292],[277,283],[258,294],[197,297],[192,289],[160,288]],
  [[329,218],[372,209],[399,211],[451,215],[450,288],[405,294],[327,299],[324,269]]
];
function drawFord(g, x, y) {
  const slabScale = .37, sp = ART.m.sprites.c1_ford;
  if (Math.abs(x - (GWP.x0 + GWP.x1)/2) > (GWP.x1 - GWP.x0)/2 + 155 ||
      Math.abs(y - (GWP.y0 + GWP.y1)/2) > (GWP.y1 - GWP.y0)/2 + 65) return;
  for (const side of [-1, 1]) {
    for (let j = 0; j < 4; j++) {
      g.save(); g.translate(x + side*(55 + j*17), y + Math.sin(j+side)*4);
      g.rotate(side*.16); g.globalAlpha = .8 - j*.13;
      g.drawImage(trailPrint(true, j), -32,-18,64,36);
      g.restore();
    }
    for (let j = 0; j < 8; j++) {
      const n = hash2(side*31+j, 194), m = hash2(j, side*19);
      const size = 3 + 5*n;
      ART.draw(g, 'c1_rock'+(j%3), x+side*(68 + m*47), y+(n-.5)*40, size, size*.75, m*6, .9);
    }
  }
  g.save(); g.translate(x, y); g.scale(slabScale, slabScale); g.translate(-249, -252);
  for (const points of FORD_SLABS) {
    const outline = new Path2D();
    outline.moveTo(...points[0]);
    for (const pt of points.slice(1)) outline.lineTo(...pt);
    outline.closePath();
    if (SHADOWS) {
      g.save(); g.translate(SUN_DX * 4, SUN_DY * 4);
      g.fillStyle = 'rgba(24,25,19,.42)'; g.fill(outline); g.restore();
    }
    g.save(); g.clip(outline);
    g.drawImage(ART.images[sp.atlas], ...sp.rect, 0, 0, sp.rect[2], sp.rect[3]);
    g.restore();
  }
  g.restore();
  for (const [dx, dy, size, variant] of [[-42,-26,9,1],[-32,-31,6,0],[19,32,12,2],[27,35,7,1],[43,51,10,0]]) {
    groundShadow(g, x + dx, y + dy, size * .4, size * .25, variant, 1);
    ART.draw(g, 'c1_rock' + variant, x + dx, y + dy, size, size * .74, variant);
  }
}
const C1DECOR = { yardDrum: ['c1_yard_drum', 19], logs: ['c1_log1', 46], bench: ['c1_log0', 44], barrel: ['c1_barrel', 22], rubble: ['c1_bricks', 32], fence: ['c1_fence_picket', 66] };
function artDecor(g) { C1SH = 1; try { artDecor0(g); } finally { C1SH = 0; } }
function artDecor0(g) {
  DECOR.forEach(d => {
    const x = d[1] * T, y = d[2] * T;
    if (!C1 && !ART.m.sprites[d[0]]) return;
    if (C1 && d[0] === 'ford') { drawFord(g, x, y); return; }
    if (C1 && C1DECOR[d[0]]) {
      const [id, width] = C1DECOR[d[0]], log = d[0] === 'logs' || d[0] === 'bench';
      if (log) groundShadow(g, x, y, width * .48, width * .11, d[3], 1);
      else if (d[0] !== 'fence') {
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 4, 14, 8, d[3], 0, 6.28); g.fill();
      }
      c1Draw(g, id, x, y, width, d[3], 1, log ? 3 : 9); return;
    }
    if (d[0] !== 'fence') { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 3, y + 4, 14, 8, d[3], 0, 6.28); g.fill(); }
    ART.draw(g, d[0], x, y, undefined, undefined, d[3]);
  });
}
/* Кроны готовятся вместе с тенями при загрузке и смене качества. */
const SHADOWS = !/shadow-off/.test(location.hash);
let CAN_PAD = 1;
const forestCrowns = ['c1_pine0', 'c1_birch0', 'c1_pine1', 'c1_birch3', 'c1_birch1', 'c1_pine3', 'c1_birch2', 'c1_pine2'];
const edgeCrowns = ['c1_dead0', 'c1_birch2', 'c1_dead1', 'c1_birch1', 'c1_birch3', 'c1_dead2', 'c1_birch0', 'c1_dead3'];

// Разрежаем отдельные скопления листьев, сохраняя серые ветви и пустоты исходного спрайта.
function autumnBirch(id, variant, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), half = size / 2;
  ART.draw(g, id, half, half, size, size);
  const pixels = g.getImageData(0, 0, size, size), rgba = pixels.data;
  const tone = [-.16, .06, .42, .82][variant % 4], thin = .12 + .38 * hash2(variant, 79);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, r = rgba[i], green = rgba[i + 1], blue = rgba[i + 2];
    if (!rgba[i + 3] || Math.min(r, green) - blue < 10) continue;
    // Нормированные координаты сохраняют те же просветы при автоснижении качества.
    const patch = vnoise(x / size * 12 + variant * 17, y / size * 12, 1);
    rgba[i + 3] *= clamp((patch - thin) * 5, 0, 1);
    const light = .68 + patch * .28;
    rgba[i] = (r * (.98 + tone * .39) + green * .07) * light;
    rgba[i + 1] = green * (1.01 - tone * .30) * light;
    rgba[i + 2] = blue * light + r * .08;
  }
  g.putImageData(pixels, 0, 0);
  return c;
}
let yardTreeCrown;
function artCanopy() {
  CAN_PAD = C1 && SHADOWS ? 1.35 : 1;
  const pick = C1 ? forestCrowns.concat(edgeCrowns, BIG ? ['c1_yard_tree'] : [])
    : ['tree_olive', 'tree_dry', 'tree_olive', 'tree_bare', 'tree_olive', 'tree_dry', 'tree_olive', 'tree_dry'];
  if (C1 && !CANOPY.built) { CAN_SZ = +((location.hash.match(/can-(\d+)/) || [])[1] || 96); CANOPY.built = 1; }
  const S2 = CAN_SZ / 2;
  for (let v = 0; v < pick.length; v++) {
    const c = document.createElement('canvas'); c.width = c.height = Math.round(CAN_SZ * 2 * CAN_PAD);
    const g = c.getContext('2d'); g.scale(2, 2);
    g.translate(S2 * CAN_PAD, S2 * CAN_PAD); if (v % 2) g.scale(-1, 1); g.rotate(v * 0.9);
    const s = 0.9 + (v % 3) * 0.06;
    if (CAN_PAD > 1) { g.shadowColor = 'rgba(8,10,4,0.5)'; g.shadowBlur = CAN_SZ * 0.1; g.shadowOffsetX = CAN_SZ * 0.2 * SUN_DX; g.shadowOffsetY = CAN_SZ * 0.2 * SUN_DY; }   // тень кроны вправо-вниз, как у домов и машин
    const w = CAN_SZ * s;
    if (pick[v].startsWith('c1_birch')) {
      g.drawImage(autumnBirch(pick[v], v, CAN_SZ * 2), -w / 2, -w / 2, w, w);
    } else ART.draw(g, pick[v], 0, 0, w, w);
    c1Grade(c, 0, 0, c.width, c.height);
    if (pick[v] === 'c1_yard_tree') yardTreeCrown = c;
    else CANOPY.push(c);
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
function spriteShadow(g, length, blur) {
  if (!SHADOWS) return;
  const k = g.getTransform().a;
  g.shadowColor = 'rgba(15,13,10,.52)'; g.shadowBlur = blur * k;
  g.shadowOffsetX = SUN_DX * length * k; g.shadowOffsetY = SUN_DY * length * k;
}
function c1Draw(g, id, x, y, w, a, al, shadowLength = 9) {
  const s = ART.m.sprites[id];
  if (C1SH && C1) spriteShadow(g, shadowLength, shadowLength * .45);
  ART.draw(g, id, x, y, w, w * s.rect[3] / s.rect[2], a || 0, al === undefined ? 1 : al);
  if (C1SH) { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = g.shadowOffsetX = g.shadowOffsetY = 0; }
}
/* крыши: шесть домов деревни по координатам, руины разрушенной крышей, бетон АТП прежним способом */
const ROOF_AT = { '15,72': 'roof_slate', '26,71': 'roof_patch', '37,73': 'roof_rust', '15,87': 'roof_patch', '39,87': 'roof_slate', '25,93': 'roof_rust' };
/* крыша C1 по размеру и материалу дома */
function c1RoofId(h, idx, old) {
  const big = h.w * h.h, long = Math.max(h.w, h.h) / Math.min(h.w, h.h);
  if (BIG && !h.ok && h.x === 15 && h.y === 28) return 'c1_tower';
  if (h.ruin) return big <= (BIG ? 32 : 16) ? 'c1_roof_shed' + (idx % 2) : 'c1_roof_barn';
  if (h.mat === 'conc') return big >= 110 || (BIG && big >= 75 && long >= 1.8) ? 'c1_roof_hangar' : big <= 16 ? 'c1_booth' + (idx % 3) : 'c1_roof_office';
  if (long > 2.1 && big > 40) return 'c1_roof_barn';
  if (big <= 16) return 'c1_roof_shed' + (idx % 2);
  return old === 'roof_patch' ? 'c1_roof_plank' : 'c1_roof_slate';
}
// У шифера и досок освещение уже запечено в текстуру, конёк проходит
// посередине исходного листа. Корректируем его до кадрирования и поворота.
const gableMaterials = new Map();
function balancedGable(id) {
  if (gableMaterials.has(id)) return gableMaterials.get(id);
  const sp = ART.m.sprites[id], tile = document.createElement('canvas');
  tile.width = sp.rect[2]; tile.height = sp.rect[3];
  const g = tile.getContext('2d');
  g.drawImage(ART.images[sp.atlas], ...sp.rect, 0, 0, tile.width, tile.height);
  const pixels = g.getImageData(0, 0, tile.width, tile.height), d = pixels.data;
  for (let y = 0; y < tile.height; y++) {
    const t = clamp(((y + .5) / tile.height - .485) / .05, 0, 1);
    const gain = lerp(.89, 1.07, t * t * (3 - 2 * t));
    const end = (y + 1) * tile.width * 4;
    for (let i = y * tile.width * 4; i < end; i += 4) {
      d[i] *= gain; d[i + 1] *= gain; d[i + 2] *= gain;
    }
  }
  g.putImageData(pixels, 0, 0);
  gableMaterials.set(id, tile);
  return tile;
}
// Вальма замыкает короткий торец другим направлением волн того же шифера.
function hipEnd(g, image, sx, sy, sw, sh, width, height) {
  const left = -width/2, depth = Math.min(width*.26, height*.53);
  g.save(); g.beginPath(); g.moveTo(left,-height/2); g.lineTo(left+depth,0);
  g.lineTo(left,height/2); g.closePath(); g.clip();
  g.translate(left + depth/2, 0); g.rotate(-Math.PI/2);
  g.drawImage(image, sx, sy, sw, sh*.46, -height/2, -depth/2, height, depth);
  g.fillStyle = 'rgba(55,47,36,.14)'; g.fillRect(-height/2,-depth/2,height,depth);
  g.restore();
  g.strokeStyle = '#756e61'; g.lineWidth = 1.6; g.beginPath();
  g.moveTo(left,-height/2); g.lineTo(left+depth,0); g.lineTo(left,height/2); g.stroke();
}
function drawPorch(g, h, id, y, depth) {
  const door = h.entrances.find(d => d.ny === 1 && !d.breach);
  if (!door) return;
  const width = door.width + 18, left = door.x + 3 - width/2;
  const plank = balancedGable(id);
  g.save();
  // Односкатный козырёк, выцветший лоб и два торца стоек. Передняя ступень открыта.
  g.shadowColor = 'transparent';
  g.fillStyle = '#514432'; g.fillRect(left+2,y+depth-2,3,8); g.fillRect(left+width-5,y+depth-2,3,8);
  if (SHADOWS) { g.fillStyle = 'rgba(29,24,19,.35)'; g.fillRect(left+3,y+7,width,depth); }
  g.drawImage(plank, plank.width*.28, plank.height*.67, plank.width*.38, plank.height*.22,
    left,y-4,width,depth+6);
  g.fillStyle = '#605342'; g.fillRect(left,y+depth,width,3);
  g.fillStyle = '#b3a18a'; g.fillRect(left,y+depth,width,1);
  g.restore();
}
function artRoof(h, idx) {
  let id = ROOF_AT[h.ok || (h.x + ',' + h.y)] || (h.ruin ? 'roof_broken' : h.mat === 'conc' ? null : ['roof_slate', 'roof_rust', 'roof_patch'][idx % 3]);
  if (C1) id = c1RoofId(h, idx, id);
  if (!id) return null;
  const W = h.w * T + 10, Hh = h.h * T + 10, c = document.createElement('canvas');
  const home = h.ok || (h.x + ',' + h.y);
  const gable = id === 'c1_roof_slate' || id === 'c1_roof_plank';
  h.porchDepth = BIG && gable && (home === '26,71' || home === '37,73') ? 13 : 0;
  c.width = W * 2; c.height = (Hh + h.porchDepth) * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 9; g.shadowOffsetX = 4; g.shadowOffsetY = 6;
  const crossRidge = BIG && gable && (home === '15,87' || home === '26,71');
  const along = crossRidge ? false : h.w >= h.h, sp = ART.m.sprites[id];
  if (C1 && id.startsWith('c1_')) {   // крыша C1: вырезать середину под пропорции дома, не растягивать
    // объём: снизу видна полоса передней стены, крыша над ней чуть короче и бросает тень на стену
    const flat = id === 'c1_tower' || id.startsWith('c1_booth');
    const wallH = flat ? 6 : Math.min(20, 10 + h.h * 1.4), RW = W - 6, RH = Hh - 6 - wallH;
    if (wallH) {
      g.shadowColor = 'transparent';
      const wy = RH - 2, wood = h.mat !== 'conc';
      g.fillStyle = wood ? '#3b3026' : '#5a5853'; g.fillRect(2, wy, RW - 4, wallH + 2);
      g.globalAlpha = 0.5; artFill(g, wood ? 'floor_wood' : 'wall_concrete', 2, wy, RW - 4, wallH + 2); g.globalAlpha = 1;
      if (wood) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 6; x < RW - 4; x += 7) { g.beginPath(); g.moveTo(x, wy); g.lineTo(x, wy + wallH + 2); g.stroke(); } }
      // У южной стены с улицы видна ниша под карнизом. Смещение +3
      // компенсирует начало холста крыши в трёх пикселях левее дома.
      for (const door of h.entrances) {
        if (door.ny !== 1) continue;
        const left = door.x + 3 - door.width / 2;
        g.fillStyle = wood ? '#4b392b' : '#66655c'; g.fillRect(left, wy, door.width, wallH + 2);
        g.fillStyle = '#292720'; g.fillRect(left + 3, wy, door.width - 6, wallH + 1);
        g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(left + 3, wy, door.width - 6, 5);
      }
      // Контактная тень лежит на верхней части фасада, включая дверную нишу.
      if (SHADOWS && !flat) {
        const depth = Math.min(8, wallH * .55);
        const shade = g.createLinearGradient(0, RH, 0, RH + depth);
        shade.addColorStop(0, 'rgba(22,18,15,.74)');
        shade.addColorStop(.32, 'rgba(22,18,15,.46)');
        shade.addColorStop(1, 'rgba(22,18,15,0)');
        g.fillStyle = shade; g.fillRect(2, RH, RW - 4, depth);
      }
      if (SHADOWS) {
        g.shadowColor = 'rgba(0,0,0,.32)'; g.shadowBlur = 4; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
      }
    }
    const tw = along ? RW : RH, th = along ? RH : RW, r = sp.rect, ka = tw / th;
    let sw = r[2], sh = r[3]; if (sw / sh > ka) sw = sh * ka; else sh = sw / ka;
    const image = gable ? balancedGable(id) : ART.images[sp.atlas];
    const sx = (gable ? 0 : r[0]) + (r[2] - sw) * (sp.cropFocusX ?? 0.5);
    const sy = (gable ? 0 : r[1]) + (r[3] - sh) / 2;
    g.save(); g.translate(RW / 2, RH / 2);
    if (!along) g.rotate(gable ? -Math.PI / 2 : Math.PI / 2);
    g.drawImage(image, sx, sy, sw, sh, -tw / 2, -th / 2, tw, th);
    if (BIG && gable && (home === '15,72' || home === '39,87' || home === '28,128')) {
      g.shadowColor = 'transparent'; hipEnd(g, image, sx, sy, sw, sh, tw, th);
    }
    g.restore();
    if (h.porchDepth) drawPorch(g, h, id, Hh - 10, h.porchDepth);
    g.setTransform(1, 0, 0, 1, 0, 0); c1Grade(c, 0, 0, c.width, c.height);
    return c;
  }
  if (along) ART.draw(g, id, (W - 6) / 2, (Hh - 6) / 2, W - 6, Hh - 6);
  else ART.draw(g, id, (W - 6) / 2, (Hh - 6) / 2, Hh - 6, W - 6, Math.PI / 2);
  return c;
}
function artCrate(o) {
  ctx.save(); spriteShadow(ctx, 5, 2);
  const id = C1 ? (o.sprite || (o.stash ? 'c1_crate_army' : 'c1_crate')) : 'crate';
  ART.draw(ctx, id, o.x + o.w / 2, o.y + o.h / 2, o.w, o.h, o.sprite ? 0 : ((o.x + o.y) % 4) * Math.PI / 2);
  ctx.restore();
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
