/* ===================== Большой Кордон (mapVersion kordon-big) =====================
   Прежний генератор строит Кордон 132×110 в своих массивах (OLD). Здесь он переносится
   на карту 240×220 по частям ("штампам"): каждое место сдвигается целиком, без растяжения,
   так что дома, двери, якоря и задания внутри места остаются как были. Между местами
   новая местность: дороги, лес, ручей на востоке, три выхода (Свалка, Залесье, Затон)
   и новые места. Все старые координаты (клетки и пиксели) пересчитываются одной функцией RM. */

/* штампы: прямоугольник в старых клетках [x0,y0,x1,y1] и сдвиг [dx,dy] в клетках */
const STAMPS = {
  village: { r: [8, 68, 54, 102], d: [30, 84] },        // деревня, бункер-люк, автобус
  pump:    { r: [31, 56, 43, 67],  d: [37, 62] },
  swamp:   { r: [14, 43, 37, 57],  d: [25, 50] },
  dogs:    { r: [3, 35, 13, 51],   d: [10, 43] },
  tunnel:  { r: [26, 24, 43, 41],  d: [34, 28] },       // туннель и трансформаторная; dy=28 держит насыпь на одной линии
  bridge:  { r: [56, 24, 72, 38],  d: [64, 28] },
  camp:    { r: [44, 16, 53, 23],  d: [47, 22] },
  pigfarm: { r: [8, 5, 37, 23],    d: [30, 15] },
  field:   { r: [66, 46, 84, 60],  d: [75, 53] },
  rail:    { r: [70, 39, 86, 45],  d: [78, 44] },
  atp:     { r: [84, 57, 112, 85], d: [98, 71] },
  orchard: { r: [86, 86, 111, 101], d: [99, 92] },
  east:    { r: [97, 6, 114, 45],  d: [104, 28] },      // хлев, восточная канава, релейная будка
  farm:    { r: [79, 7, 96, 23],   d: [88, 15] },
  army:    { r: [55, 98, 73, 109], d: [64, 103] },
  exit:    { r: [55, 0, 73, 8],    d: [64, 0] },
  bunker:  { r: [120, 0, 131, 13], d: [120, 0] }
};
/* место → штамп (якоря места двигаются вместе с его штампом, даже если лежат чуть снаружи) */
const LOC_STAMP = { village: 'village', sid: 'village', bus: 'village', pump: 'pump', atp: 'atp', orchard: 'orchard', field: 'field',
  army: 'army', swamp: 'swamp', dogs_lair: 'dogs', trafo: 'tunnel', tunnel: 'tunnel', bridge: 'bridge', camp: 'camp', farm: 'farm',
  lair: 'east', east_ditch: 'east', relay: 'east', rail: 'rail', exit: 'exit', south_path: { d: [74, 97] } };
/* отдельные точки, которые в старой карте стояли между местами и требуют ручной постановки (новые клетки) */
const RM_FIX = { petr: [168, 138.5], petr2: [168, 148.5] };

function stampAt(x, y, pad) {
  pad = pad || 0;
  for (const k in STAMPS) { const r = STAMPS[k].r; if (x >= r[0] - pad && x <= r[2] + 1 + pad && y >= r[1] - pad && y <= r[3] + 1 + pad) return STAMPS[k]; }
  return null;
}
/* старые клетки → новые клетки. hint: id места (его штамп главнее) */
function RMt(x, y, hint) {
  if (!BIG) return [x, y];
  const bun = STAMPS.bunker.r;
  if (x >= bun[0]) return [x + STAMPS.bunker.d[0], y + STAMPS.bunker.d[1]];
  let st = null;
  if (hint && LOC_STAMP[hint]) st = typeof LOC_STAMP[hint] === 'string' ? STAMPS[LOC_STAMP[hint]] : LOC_STAMP[hint];
  if (!st) st = stampAt(x, y, 0) || stampAt(x, y, 2);
  if (st) return [x + st.d[0], y + st.d[1]];
  return [x * 2, y * 2];
}
/* старые пиксели → новые пиксели */
function RMp(px, py, hint) { const r = RMt(px / T, py / T, hint); return [r[0] * T, r[1] * T]; }
const RMo = (o, hint) => { const r = RMp(o.x, o.y, hint); o.x = r[0]; o.y = r[1]; return o; };

/* ---------- новая местность ---------- */
const VEHICLE_ROUTES = [
  [[84, 166.5], [125, 166.5]],
  [[127, 142.5], [160, 142.5], [183, 142.5]]
];
function bigPath(pts, rad, tile) {
  tile = tile === undefined ? DI : tile;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1;
    for (let k = 0; k <= n; k++) {
      const cx = x0 + (x1 - x0) * k / n, cy = y0 + (y1 - y0) * k / n, R = Math.ceil(rad);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > rad * rad + 0.01) continue;
        const x = Math.round(cx + dx), y = Math.round(cy + dy), t = tAt(x, y);
        if (t === AS || t === RA || t === CO || t === BR || t === FL || t === CF || t === VO) continue;
        if (t === SW && tile !== SW) continue;
        setT(x, y, tile);
      }
      reserve(Math.round(cx) - R - 1, Math.round(cy) - R - 1, Math.round(cx) + R + 1, Math.round(cy) + R + 1);
    }
  }
}
const STREAM_X = y => 230 + Math.round(2 * Math.sin(y / 17) + 1.5 * Math.sin(y / 7 + 1));
const FORD = [89, 95];
const BIG_EXITS = { north: { x: 128, y: 0 }, west: { x: 0, y: 118 }, east: { x: 239, y: 92 } };

function bigWorld() {
  if (!BIG) return;
  const O = OLD;
  useGrid(BIGW);
  map.fill(GR); keep.fill(0);
  for (let y = 0; y < MH; y++) for (let x = PW; x < MW; x++) setT(x, y, VO);
  const R = mulberry32(2611);
  // края: лес, кроме трёх выходов
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    if (!(x <= 2 || x >= PW - 3 || y <= 1 || y >= MH - 3)) continue;
    if (y <= 1 && Math.abs(x - 128) <= 4) continue;
    if (x <= 2 && Math.abs(y - 118) <= 3) continue;
    if (x >= PW - 3 && Math.abs(y - 92) <= 3) continue;
    setT(x, y, R() < 0.9 ? TR : BU);
  }
  // насыпь через всю карту (как в старой: три ряда)
  for (let x = 0; x < PW; x++) for (let y = 56; y <= 58; y++) setT(x, y, RA);
  // главная дорога: старый изгиб по участкам, между ними плавно
  const yo = y => y <= 8 ? y : y <= 52 ? 8 + (y - 8) * (24 - 8) / (52 - 8) : y <= 66 ? y - 28 : y <= 201 ? 38 + (y - 66) * (98 - 38) / (201 - 66) : y - 103;
  for (let y = 0; y < MH; y++) { const o = yo(y); roadX[y] = 64 + 62 + Math.round(3 * Math.sin(o / 12)); }
  for (let y = 0; y < MH; y++) {
    const c = roadX[y];
    for (let d = -1; d <= 1; d++) setT(c + d, y, AS);
    if (y > 2 && y < MH - 3 && (y < 55 || y > 59)) { if (srnd() < 0.6) setT(c - 2, y, DI); if (srnd() < 0.6) setT(c + 2, y, DI); }
    reserve(c - 3, y, c + 3, y);
  }
  // ручей вдоль востока и брод
  for (let y = 0; y < MH; y++) { const c = STREAM_X(y); for (let d = -1; d <= 1; d++) setT(c + d, y, (y >= FORD[0] && y <= FORD[1]) ? DI : SW); reserve(c - 2, y, c + 2, y); }
  // перенос мест
  for (const k in STAMPS) {
    const s = STAMPS[k], r = s.r;
    for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) {
      if (x < 0 || y < 0 || x >= O.MW || y >= O.MH) continue;
      const nx = x + s.d[0], ny = y + s.d[1]; if (!inb(nx, ny)) continue;
      const t = O.map[y * O.MW + x];
      if (k !== 'bunker' && (x <= 2 || x >= O.PW - 3 || y <= 1 || y >= O.MH - 3) && (t === TR || t === BU)) continue;  // старая кромка леса
      if (k !== 'bunker' && t === VO) continue;
      map[ny * MW + nx] = t; keep[ny * MW + nx] = O.keep[y * O.MW + x] || (t !== GR && t !== TR && t !== BU) ? 1 : 0;
      if (t === GR) keep[ny * MW + nx] = 1;
    }
  }
  bigRemap();
  // грунтовки между местами (новые клетки)
  const P2 = (a, b) => bigPath(a, b);
  P2(VEHICLE_ROUTES[0], 0.8);                                // деревня → шоссе
  P2([[73, 129], [68, 141], [63, 153]], 0.7);                          // водокачка → деревня
  P2([[80, 123.5], [100, 122], [125, 121]], 0.7);                      // водокачка → шоссе
  P2([[69, 123], [52, 125.5], [36, 127.5], [18, 121.5], [0, 118]], 0.8); // на Залесье
  P2(VEHICLE_ROUTES[1], 0.8);                 // шоссе → АТП
  P2([[197.5, 128], [200, 110], [206, 92], [206.5, 74]], 0.7);         // АТП → релейная будка
  P2([[206, 90], [220, 92], [239, 92]], 0.8);                          // на Затон через брод
  P2([[201.5, 157], [197, 167], [194, 178]], 0.6);                     // пролом АТП → сады
  P2([[189, 190], [168, 194.5], [140, 195], [112, 195], [92, 191], [84, 184]], 0.5); // южная тропа
  P2([[144, 113], [135, 112.5], [127, 112]], 0.7);                     // поле → шоссе
  P2([[158, 105], [157, 92], [156, 90]], 0.6);                         // поле → ж/д будка
  P2([[148, 87], [127, 86.5]], 0.6);                                   // ж/д будка → шоссе
  P2([[72, 69], [72, 80], [125, 80]], 0.7);                            // туннель → шоссе
  P2([[50, 107], [58, 116], [68, 122]], 0.6);                          // болото → водокачка
  P2([[26, 87], [32, 92], [39, 98]], 0.5);                             // логово → болото
  P2([[72, 52], [84, 48.5], [93, 45.5]], 0.6);                         // туннель → лагерь путейцев
  P2([[100, 42], [112, 42], [125, 42]], 0.7);                          // лагерь → шоссе
  P2([[67, 35], [80, 39], [91, 41]], 0.6);                             // свиноферма → лагерь
  P2([[127, 32], [150, 32], [167, 32]], 0.7);                          // шоссе → ферма
  P2([[184, 32], [195, 36], [204, 41]], 0.6);                          // ферма → хлев
  P2([[38, 26], [26, 28], [17, 31]], 0.5);                             // свиноферма → охотничья вышка
  // новые места
  const RH = mulberry32(919);
  house(28, 128, 7, 5, [[3, 0], [3, 4]], BR, 0.12);                   // хутор
  house(37, 130, 5, 4, [[0, 2]], BR, 0.3, 'ruin');
  house(29, 135, 4, 4, [[2, 0]], BR, 0.2);
  reserve(25, 125, 44, 141);
  house(15, 28, 3, 3, [[1, 2]], BR, 0, 'ruin');                       // охотничья вышка (сруб)
  reserve(12, 25, 21, 34);
  for (let y = FORD[0] - 2; y <= FORD[1] + 2; y++) for (let x = 224; x <= 236; x++) keep[y * MW + x] = 1;
  // лес: густые массивы по шуму, редкие деревья на открытом месте
  for (let y = 2; y < MH - 3; y++) for (let x = 3; x < PW - 3; x++) {
    const i = y * MW + x; if (keep[i] || map[i] !== GR) continue;
    const n = vnoise(x, y, 16) * 0.8 + vnoise(x + 300, y, 4) * 0.2;
    let p = n > 0.6 ? 0.5 : n > 0.53 ? 0.16 : 0.015;
    if (x < 14 || x > PW - 18 || y < 8) p = Math.max(p, 0.26);
    if (y > 196 && y < 214 && x > 112 && x < 142) p = 0.01;           // у блокпоста открыто
    const r = srnd(); if (r < p) map[i] = TR; else if (r < p + 0.05) map[i] = BU;
  }
  bigNewObjects(RH);
}

/* ---------- пересчёт всех координат старой карты ---------- */
function bigRemap() {
  // объекты, дома, аномалии, артефакты, радиация, декор
  objs.forEach(o => { const c = RMp(o.x + o.w / 2, o.y + o.h / 2); o.x = c[0] - o.w / 2; o.y = c[1] - o.h / 2; });
  HOUSES.forEach(h => { if (h.ok) return; h.ok = h.x + ',' + h.y; const r = RMt(h.x + 0.5, h.y + 0.5); h.x = Math.round(r[0] - 0.5); h.y = Math.round(r[1] - 0.5); });
  ANOM0.forEach(a => RMo(a)); ARTS0.forEach(a => RMo(a)); rads.forEach(a => RMo(a));
  DECOR.forEach(d => { const r = RMt(d[1], d[2]); d[1] = r[0]; d[2] = r[1]; });
  [HATCH, STAIRS, FIRE, FIRE2].forEach(p => RMo(p));
  BUNK.x0 += STAMPS.bunker.d[0] * T; BUNK.x1 += STAMPS.bunker.d[0] * T;
  Object.values(POI).forEach(p => RMo(p));
  // справочник мест
  LOCATIONS.forEach(l => {
    const mp = p => { const r = RMt(p[0], p[1], l.id); p[0] = r[0]; p[1] = r[1]; };
    const b = l.bounds, a = RMt(b[0], b[1], l.id), c = RMt(b[2], b[3], l.id); l.bounds = [a[0], a[1], c[0], c[1]];
    (l.entrances || []).forEach(mp);
    Object.values(l.anchors || {}).forEach(v => { if (Array.isArray(v[0])) v.forEach(mp); else mp(v); });
  });
  // NPC, звери, тайники, события
  NPCDEF.forEach(d => { if (RM_FIX[d.sid]) { d.x = RM_FIX[d.sid][0]; d.y = RM_FIX[d.sid][1]; return; } const r = RMt(d.x, d.y); d.x = r[0]; d.y = r[1]; });
  DOGDEF.forEach(d => { const r = RMt(d.x, d.y); d.x = r[0]; d.y = r[1]; });
  CACHES.forEach(c => { const r = RMt(c.x, c.y); c.x = r[0]; c.y = r[1]; });
  if (typeof RC1 !== 'undefined') RC1.boars.forEach(b => { b.at = RMt(b.at[0], b.at[1]); });
  SOS_SPOTS.length = 0; locAnchors('sos').forEach(a => SOS_SPOTS.push([a.x, a.y, a.loc]));
  CLEAR_SPOTS.length = 0; locAnchors('clear').forEach(a => CLEAR_SPOTS.push([a.x, a.y, 'у ' + LOC[a.loc].gen, a.loc]));
  const sh = locPt('lair', 'sucker'); SUCKER_HOME.x = sh.x; SUCKER_HOME.y = sh.y;
}

/* ---------- новые места и предметы ---------- */
function bigLoc(id, l) { l.id = id; LOCATIONS.push(l); LOC[id] = l; }
// Индексы посаженных в деревне сухих деревьев для кроны в мире и на карте.
const yardTreeCells = new Set();
function bigVillageYards() {
  // Северо-западный двор: машина стоит за обочиной, сбоку от южной двери избы.
  addObj({ k: 'car', x: 48 * T - 37, y: 164.5 * T - 17, w: 74, h: 34, solid: 1, seed: 0, sprite: 'c1_yard_car' });
  // Ящики без добычи пользуются обычной коллизией и правилами прыжка.
  for (const [x, y] of [[46.5, 163.6], [73.5, 163.7], [74.5, 163.8]]) {
    addObj({ k: 'crate', x: x * T - 14, y: y * T - 12, w: 28, h: 24, solid: 1, sprite: 'c1_yard_crate' });
  }
  const drum = C1 ? 'yardDrum' : 'barrel';
  DECOR.push([drum, 45.8, 164.1, -.15], [drum, 74.9, 164.6, .12]);
  for (const [x, y] of [[44, 163], [72, 165]]) {
    setT(x, y, TR);
    yardTreeCells.add(y * MW + x);
  }
}
function bigNewObjects(R) {
  bigLoc('hutor', { name: 'Хутор', gen: 'хутора', type: 'story', bounds: [24, 125, 44, 141], entrances: [[31, 127], [42, 132]],
    anchors: { clear: [33, 131], sos: [[38, 137]], safe: [32, 127] } });
  bigLoc('ford', { name: 'Брод через ручей', gen: 'брода', type: 'anomaly', bounds: [222, 84, 238, 100], entrances: [[222, 92], [238, 92]],
    anchors: { clear: [226, 97], sos: [[224, 99]] } });
  bigLoc('column', { name: 'Разбитая колонна', gen: 'разбитой колонны', type: 'danger', bounds: [116, 16, 136, 34], entrances: [[128, 34], [128, 16]],
    anchors: { clear: [122, 25], sos: [[133, 22]] } });
  bigLoc('tower', { name: 'Охотничья вышка', gen: 'охотничьей вышки', type: 'story', bounds: [11, 24, 22, 35], entrances: [[19, 31]],
    anchors: { top: [16.5, 29.5], clear: [18, 33] } });
  bigLoc('exit_w', { name: 'Дорога на Залесье', gen: 'дороги на Залесье', type: 'story', bounds: [0, 112, 8, 124], entrances: [[6, 118]], anchors: { gate: [3, 118] } });
  bigLoc('exit_e', { name: 'Дорога на Затон', gen: 'дороги на Затон', type: 'story', bounds: [232, 86, 239, 98], entrances: [[233, 92]], anchors: { gate: [237, 92] } });
  SOS_SPOTS.push([38, 137, 'hutor'], [224, 99, 'ford'], [133, 22, 'column']);
  CLEAR_SPOTS.push([33, 131, 'у хутора', 'hutor'], [226, 97, 'у брода', 'ford'], [122, 25, 'у разбитой колонны', 'column']);
  // колонна техники у дороги на Свалку
  [[120, 19, 0], [123, 23, 1], [121.5, 27.5, 0], [131, 21, 1]].forEach((c, i) => addObj({ k: 'car', x: c[0] * T, y: c[1] * T + 4, w: 2 * T, h: T - 8, solid: 1, opaque: 0, seed: 10 + i }));
  addObj({ k: 'crate', x: 122 * T + 3, y: 21 * T + 3, w: 26, h: 26, solid: 1, stash: 'st8', loot: { a545: 30, medkit: 1, money: 240 } });
  ANOM0.push({ x: 125.5 * T, y: 26.5 * T, r: 26, k: 'g' }, { x: 119.5 * T, y: 23.5 * T, r: 22, k: 'e' });
  rads.push({ x: 123 * T, y: 24 * T, r: 110, p: 2.2 });
  DECOR.push(['ford', 230.5, 92, 0]);

  // брод: аномалия на середине, тайник у берега
  ANOM0.push({ x: 231.5 * T, y: 95.5 * T, r: 22, k: 'e' });
  CACHES.push({ x: 225.5, y: 99.5, loot: { antirad: 2, a12: 12, money: 160 } });
  // хутор и вышка: тайники
  addObj({ k: 'crate', x: 30 * T + 3, y: 130 * T + 3, w: 26, h: 26, solid: 1, stash: 'st9', loot: { cans: 2, bandage: 2, money: 150 } });
  CACHES.push({ x: 16.5, y: 29.5, loot: { a9: 24, vodka: 1, money: 220 } });
  // старые свободные объекты могли встать на стену или дорогу при переносе ×2 — сдвинуть на траву рядом
  objs.forEach(o => {
    if (!o.solid || !(o.k === 'pylon' || o.k === 'car')) return;
    const bad = () => { for (let y = Math.floor(o.y / T); y <= Math.floor((o.y + o.h - 1) / T); y++) for (let x = Math.floor(o.x / T); x <= Math.floor((o.x + o.w - 1) / T); x++) { const t = tAt(x, y); if (t !== GR && t !== BU && !(o.k === 'car' && t === DI)) return true; } return false; };
    for (let i = 0; i < 40 && bad(); i++) { o.x += (i % 2 ? 1 : -1) * T * Math.ceil(i / 4); o.y += (i % 3 === 0 ? T : 0); }
  });
  bigVillageYards();
}

/* заборы из декора — настоящие препятствия (перепрыгиваются). Вызывается после переноса координат, когда декор на своих местах */
function bigFences() {
  if (!BIG || !C1 || objs.some(o => o.k === 'fence')) return;
  DECOR.forEach(d => { if (d[0] !== 'fence') return; const len = 64, th = 9, hor = Math.abs(Math.cos(d[3])) > 0.7, w = hor ? len : th, h = hor ? th : len;
    objs.push({ k: 'fence', x: d[1] * T - w / 2, y: d[2] * T - h / 2, w: w, h: h, solid: 1, static: 1 }); });
}
