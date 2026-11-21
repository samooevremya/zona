/* ===================== Большой Кордон (mapVersion kordon-big) =====================
   Прежний генератор строит Кордон 132×110 в своих массивах (OLD). Здесь он переносится
   на карту 240×220 по частям ("штампам"): каждое место сдвигается целиком, без растяжения,
   так что дома, двери, якоря и задания внутри места остаются как были. Между местами
   новая местность: дороги, лес, ручей на востоке, три дороги (Свалка, Малая Зона, Затон)
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
const TOLIK_AT_JUNCTION = BIG && !/(?:^#|&)tolik-junction-off(?:&|$)/.test(location.hash);
const TOLIK_SCENE_SHIFT = [34, -11];
const RM_FIX = { petr: [168, 138.5], petr2: [168, 148.5] };

function stampAt(x, y, pad) {
  pad = pad || 0;
  for (const k in STAMPS) { const r = STAMPS[k].r; if (x >= r[0] - pad && x <= r[2] + 1 + pad && y >= r[1] - pad && y <= r[3] + 1 + pad) return STAMPS[k]; }
  return null;
}
/* старые клетки → новые клетки. hint: id места (его штамп главнее) */
function cordonTile(x, y, hint) {
  if (!BIG) return [x, y];
  const bun = STAMPS.bunker.r;
  if (x >= bun[0]) return [x + STAMPS.bunker.d[0], y + STAMPS.bunker.d[1]];
  let st = null;
  if (hint && LOC_STAMP[hint]) st = typeof LOC_STAMP[hint] === 'string' ? STAMPS[LOC_STAMP[hint]] : LOC_STAMP[hint];
  if (!st) st = stampAt(x, y, 0) || stampAt(x, y, 2);
  if (st) return [x + st.d[0], y + st.d[1]];
  return [x * 2, y * 2];
}
function RMt(x,y,hint) {
  const pt=cordonTile(x,y,hint);
  if (cordonOrigin() && pt[0]<BIGW.PW) pt[1]+=NORTH_ROWS;
  pt[0]+=cordonOrigin();
  return pt;
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
function streamCenter(y) {
  const origin=cordonOrigin(), row=y-(origin?NORTH_ROWS:0);
  return origin+230+2*Math.sin(row/17)+1.5*Math.sin(row/7+1);
}
const STREAM_X = y => Math.round(streamCenter(y));
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
  P2([[69, 123], [52, 125.5], [36, 127.5], [18, 121.5], [0, 118]], 0.8); // исходная колея, продолжается в makeLesserZone
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
  // У западного выхода из малого сарая оставляем свободный подход к порогу.
  if (tAt(199, 42) === TR) setT(199, 42, GR);
  if (TOLIK_AT_JUNCTION) bigTolikScene();
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

// Переносим стоянку целиком на поляну западнее шоссе у поворота на АТП.
function bigTolikScene() {
  LORE[2] = 'К северу от развилки на АТП поле с гравитационными аномалиями. Там «Медузу» видели, но и фонит там прилично.';
  const [dx, dy] = TOLIK_SCENE_SHIFT;
  const bus = objs.find(o => o.k === 'bus');
  bus.x += dx * T;
  bus.y += dy * T;
  const site = LOC.bus;
  const [x0, y0, x1, y1] = site.bounds;
  site.bounds = [x0 + dx, y0 + dy, x1 + dx, y1 + dy];
  site.entrances = [[82 + dx, 159 + dy], [82 + dx, 163 + dy]];
  for (const a of Object.values(site.anchors)) {
    a[0] += dx;
    a[1] += dy;
  }
  const tolik = NPCDEF.find(d => d.sid === 'tolik');
  [tolik.x, tolik.y] = site.anchors.tolik;
  rcClear(74 + dx, 157 + dy, 81 + dx, 162 + dy);
}

/* ---------- новые места и предметы ---------- */
function bigLoc(id, l) { l.id = id; LOCATIONS.push(l); LOC[id] = l; }
// Индексы посаженных в деревне сухих деревьев для кроны в мире и на карте.
const yardTreeCells = new Set();
// Координаты осей троп в большой деревне. Развилка огибает посадочные места.
const VILLAGE_LANES = [
  [[42,181],[46,180],[50,179],[53,177],[54,173],[54,169],[55.4,166.2],[56.0,164.2],[57.2,162.2],[59,161]],
  [[56.0,164.2],[54.5,163.7],[52,163.3],[51,162]],
  [[54,173],[52,174]],
  [[55.4,166.2],[58,168],[62,168.6],[65.5,167],[68,164.2],[69,163]],
  [[62,168.6],[64.3,170.7],[66.5,173.4],[69,174]],
  [[62,168.6],[60,172],[59,175],[59,177]],
  [[65.5,167],[74,166],[84,166]],
  [[49.5,177],[49.9,178.5],[50,179]]
];
function bigVillageYards() {
  // Машина у западной кромки двора оставляет проход между костром и домом.
  for (const lane of VILLAGE_LANES) bigPath(lane, .6);
  addObj({ k: 'car', x: 53 * T - 37, y: 165.4 * T - 17, w: 74, h: 34, solid: 1, seed: 0, sprite: 'c1_yard_car' });
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
    anchors: { clear: [122, 25], sos: [[133, 22]], wreck: [131.5,22.5] } });
  bigLoc('tower', { name: 'Охотничья вышка', gen: 'охотничьей вышки', type: 'story', bounds: [11, 24, 22, 35], entrances: [[19, 31]],
    anchors: { top: [16.5, 29.5], clear: [18, 33] } });
  bigLoc('exit_w', { name: 'Дорога в Малую Зону', gen: 'дороги в Малую Зону', type: 'story', bounds: [0, 115, 15, 122], entrances: [[4, 118]], anchors: { gate: [1, 118] } });
  bigLoc('exit_e', { name: 'Дорога на Затон', gen: 'дороги на Затон', type: 'story', bounds: [232, 86, 239, 98], entrances: [[233, 92]], anchors: { gate: [237, 92] } });
  SOS_SPOTS.push([38, 137, 'hutor'], [224, 99, 'ford'], [133, 22, 'column']);
  CLEAR_SPOTS.push([33, 131, 'у хутора', 'hutor'], [226, 97, 'у брода', 'ford'], [122, 25, 'у разбитой колонны', 'column']);
  // Небольшая поляна соединяет схрон с обочиной.
  rcClear(123,24,128,28);
  // колонна техники у дороги на Свалку
  [[120, 19, 0], [123, 23, 1], [121.5, 27.5, 0], [131, 21, 1]].forEach((c, i) => addObj({ k: 'car', x: c[0] * T, y: c[1] * T + 4, w: 2 * T, h: T - 8, solid: 1, opaque: 0, seed: 10 + i }));
  addObj({ k: 'crate', x: 125 * T + 3, y: 23 * T + 3, w: 26, h: 26, solid: 1, stash: 'st8', loot: { a545: 30, medkit: 1, money: 240 } });
  ANOM0.push({ id:'column-vortex', x:125.5*T, y:26.5*T, r:54, k:'g' }, { x: 119.5 * T, y: 23.5 * T, r: 22, k: 'e' });
  addObj({k:'hiding',stash:'column_wayman',anomalyId:'column-vortex',x:125.5*T-11,y:26.5*T-9,
    w:22,h:18,solid:false,loot:{medkit:1,antirad:2,money:240}});
  rads.push({ x: 123 * T, y: 24 * T, r: 110, p: 2.2 });
  DECOR.push(['ford', STREAM_X(92) + .5, 92.5, 0]);

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

// Ось каждого пролёта в клетках уже перенесённой карты. Разрывы — настоящие проходы.
const CORDON_FENCES = [
  // Деревня новичков. Небольшие палисадники у южного ряда изб.
  ['picket', 51.2, 165.1, 51.2, 167.2],
  ['picket', 45.5, 178.5, 49, 178.5], ['picket', 51.5, 178.5, 53.5, 178.5],
  ['picket', 53.5, 175, 53.5, 178.5],
  ['picket', 67.5, 174.5, 67.5, 177.5], ['picket', 67.5, 177.5, 70, 177.5],
  // Западный хутор. Изгородь вокруг огорода с выходом к избам.
  ['rail', 34.5, 135.5, 34.5, 139.5], ['rail', 34.5, 139.5, 41.5, 139.5],
  ['rail', 41.5, 135.5, 41.5, 139.5], ['rail', 39.5, 135.5, 41.5, 135.5],
  // Северная ферма. Загон у хлева открыт со стороны двора и южной тропы.
  ['rail', 169.5, 33.5, 169.5, 36.5], ['rail', 169.5, 36.5, 174.5, 36.5],
  ['rail', 178.5, 36.5, 183.5, 36.5], ['rail', 183.5, 33.5, 183.5, 36.5],
  // Восточный сад. Изгородь идёт вдоль плодовых рядов, калитка выходит к сараю.
  ['picket', 193.5, 190.5, 197.5, 190.5], ['picket', 200.5, 190.5, 207.5, 190.5],
  ['picket', 207.5, 185.5, 207.5, 190.5],
  // Водокачка. Сетка ограничивает служебный двор у торца здания.
  ['mesh', 68.5, 120.5, 68.5, 127.5], ['mesh', 68.5, 127.5, 71.5, 127.5],
  ['mesh', 75.5, 127.5, 77.5, 127.5],
  // Южный блокпост. Бетонные панели с колючей проволокой. Северный и южный створы следуют изгибу шоссе.
  ['concreteWire', 120.5, 201.5, 125.5, 201.5], ['concreteWire', 132.5, 201.5, 136.5, 201.5],
  ['concreteWire', 136.5, 201.5, 136.5, 211.5], ['concreteWire', 130.5, 211.5, 136.5, 211.5],
  ['concreteWire', 120.5, 211.5, 123.5, 211.5], ['concreteWire', 120.5, 201.5, 120.5, 211.5]
];

/* заборы из декора — настоящие препятствия (перепрыгиваются). Вызывается после переноса координат, когда декор на своих местах */
function bigFences() {
  if (!BIG || !C1 || objs.some(o => o.k === 'fence')) return;
  DECOR.forEach(d => { if (d[0] !== 'fence') return; const len = 64, th = 9, hor = Math.abs(Math.cos(d[3])) > 0.7, w = hor ? len : th, h = hor ? th : len;
    objs.push({ k: 'fence', x: d[1] * T - w / 2, y: d[2] * T - h / 2, w: w, h: h, solid: 1, static: 1 }); });
  if (!ART) return;
  for (const [material, x1, y1, x2, y2] of CORDON_FENCES) {
    const vertical = x1 === x2, thickness = 8;
    const w = vertical ? thickness : (x2 - x1) * T;
    const h = vertical ? (y2 - y1) * T : thickness;
    addObj({ k: 'fence', material, x: (x1 + x2) * T / 2 - w / 2,
      y: (y1 + y2) * T / 2 - h / 2, w, h, solid: 1 });
  }
}

// Декор большого Кордона после переноса локаций. Центр в клетках, ширина в пикселях, угол в радианах.
const CORDON_DETAILS = [
  // Башня охотника
  ['c1_trace_kettle', 19, 29.5, 29, 0.2],
  ['c1_trace_stump', 15.5, 32.5, 43, -0.35],
  // Северный переход
  ['c1_sandbags', 130, 6.5, 45, -0.2],
  ['c1_trace_wheel', 131.5, 6.5, 22, 0.14],
  // Колонна
  ['c1_trace_wheel', 121.5, 23.5, 24, 0.18],
  ['c1_junk', 119, 26, 27, -0.4],
  ['c1_trace_reel', 123.5, 22, 30, 0.2],
  // Свиноферма
  ['c1_trace_churn', 50, 34, 27, -0.25],
  ['c1_bricks', 51, 34, 27, 0.4],
  // Лагерь путейцев
  ['c1_trace_kettle', 94.9, 44.6, 32, 0.02],
  ['c1_trace_sleepers', 96, 46, 57, -0.16],
  // Ферма и хлев
  ['c1_trace_churn', 175.5, 33, 29, 0.2],
  ['c1_trace_apples', 178.5, 33, 31, -0.23],
  ['c1_log2', 210, 45, 45, 0.28],
  // Туннель и трансформаторная
  ['c1_trace_sleepers', 70, 61, 61, 0.06],
  ['c1_trace_reel', 65, 65, 31, 0.09],
  ['c1_bricks', 66.3, 65.4, 24, -0.36],
  // Мост
  ['c1_trace_pipes', 123, 60, 59, -0.2],
  ['c1_sandbags', 122, 62, 44, 0.12],
  // Восточная канава и релейная будка
  ['c1_trace_pipes', 206.5, 53, 48, 0.67],
  ['c1_trace_reel', 210, 67, 30, -0.11],
  ['c1_junk', 211.5, 67.7, 24, 0.34],
  // Логово псов
  ['c1_trace_stump', 23, 86, 50, 0.2],
  // Железная дорога
  ['c1_trace_sleepers', 155, 87, 68, 0.04],
  ['c1_trace_reel', 158, 87, 31, 0.18],
  // Болото
  ['c1_trace_boat', 50.5, 103.3, 80, -0.52],
  ['c1_log1', 52.5, 106, 37, -0.8],
  // Брод и восточный выход
  ['c1_trace_boat', 230.9, 98.1, 95, 1],
  ['c1_rock1', 233, 95, 27, 0.24],
  ['c1_trace_stump', 236, 89, 43, -0.3],
  // Поле аномалий
  ['c1_trace_reel', 145, 110, 29, -0.31],
  ['c1_trace_kettle', 146, 111, 24, 0.18],
  // Дорога в Малую Зону
  ['c1_trace_stump', 7, 117, 51, -0.12],
  ['c1_log0', 16, 122, 41, 0.55],
  // Хутор
  ['c1_trace_churn', 34, 134, 25, -0.41],
  ['c1_stump1', 35.1, 134.5, 29, 0.3],
  // Водокачка
  ['c1_trace_pipes', 78.5, 126, 62, -0.12],
  ['c1_trace_reel', 79, 127.5, 31, 0.16],
  // Обочины шоссе
  ['c1_trace_wheel', 122, 88, 23, 0.47],
  ['c1_junk', 118.5, 149, 34, -0.2],
  ['c1_trace_wheel', 127.5, 178, 23, -0.25],
  // АТП
  ['c1_trace_wheel', 193, 141, 25, -0.12],
  ['c1_tires', 194.4, 141.4, 36, 0.1],
  ['c1_trace_pipes', 200, 148, 49, 0.2],
  // Автобус
  ...(TOLIK_AT_JUNCTION ? [
    ['c1_trace_wheel', 81, 160, 22, 0.18],
    ['c1_junk', 75, 160.6, 34, -0.27],
    ['c1_trace_kettle', 78, 161, 22, 0.22],
  ].map(([id, x, y, width, angle]) =>
    [id, x + TOLIK_SCENE_SHIFT[0], y + TOLIK_SCENE_SHIFT[1], width, angle]
  ) : [['c1_trace_wheel', 81, 160, 22, 0.18]]),
  // Восточные сады
  ['c1_trace_apples', 195, 187, 37, -0.13],
  ['c1_trace_apples', 197.4, 187.9, 25, 0.56],
  ['c1_log0', 200, 191, 39, 0.22],
  // Южная тропа
  ['c1_trace_kettle', 149, 192, 31, 0.1],
  ['c1_log1', 147.5, 192.6, 44, -0.38],
  // Южный блокпост
  ['c1_sandbags', 131, 205, 51, 0.23],
  ['c1_trace_reel', 133, 204.5, 30, -0.32],
];
