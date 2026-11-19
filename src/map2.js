/* ===================== карта ===================== */
const GR = 0, DI = 1, AS = 2, SW = 3, CO = 4, TR = 5, FL = 6, BR = 7, BU = 8, RA = 9, CF = 10, VO = 11;
const SOLID = [0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1];
const OPAQ = [0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1];
const map = new Uint8Array(MW * MH), keep = new Uint8Array(MW * MH);
const roadX = new Int16Array(MH);
for (let y = 0; y < MH; y++) roadX[y] = 62 + Math.round(3 * Math.sin(y / 12));
const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const tAt = (x, y) => inb(x, y) ? map[y * MW + x] : VO;
const setT = (x, y, v) => { if (inb(x, y)) map[y * MW + x] = v; };
function reserve(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) keep[y * MW + x] = 1; }
function reserveC(cx, cy, r) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) keep[y * MW + x] = 1; }
const HOUSES = [];
function house(x, y, w, h, doors, wall, broken, roof) {
  wall = wall === undefined ? BR : wall; broken = broken === undefined ? 0.04 : broken;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const edge = xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1;
    const corner = (xx === x || xx === x + w - 1) && (yy === y || yy === y + h - 1);
    setT(xx, yy, edge && (corner || srnd() > broken) ? wall : (wall === CO ? CF : FL));
  }
  doors.forEach(d => setT(x + d[0], y + d[1], wall === CO ? CF : FL));
  reserve(x - 1, y - 1, x + w, y + h);
  if (roof !== 'none') HOUSES.push({ x: x, y: y, w: w, h: h, mat: roof || (wall === CO ? 'conc' : 'slate'), ruin: broken > 0.2, a: 1 });
}

const objs = [];
const addObj = o => { o.static = 1; objs.push(o); return o; };
const ANOM0 = [], ARTS0 = [], rads = [];
const HATCH = { x: 12.5 * T, y: 98.5 * T };
const STAIRS = { x: 124.5 * T, y: 11.4 * T };
const FIRE = { x: 30.5 * T, y: 84.5 * T };
const FIRE2 = { x: 46.5 * T, y: 21.5 * T };
const BUNK = { x0: 121 * T, y0: 1 * T, x1: 132 * T, y1: 13 * T };
const inBunker = (x, y) => x > BUNK.x0;
const POI = {
  field: { x: 80 * T, y: 61 * T }, cross: { x: 64.5 * T, y: 60 * T }, atp: { x: 79 * T, y: 71 * T },
  bridge: { x: 57 * T, y: 36 * T }, swamp: { x: 26 * T, y: 50 * T }, trafo: { x: 34 * T, y: 37 * T }, cars: { x: 58 * T, y: 89 * T }
};
const LABELS = [['Деревня новичков', 18, 69], ['Бункер Сидоровича', 5, 103], ['АТП', 94, 58], ['Поле аномалий', 70, 63], ['Свиноферма', 12, 6],
  ['Ферма', 83, 8], ['Мост', 66, 27], ['Туннель', 33, 27], ['Южный блокпост', 52, 107], ['Болото', 19, 47], ['Будка', 28, 36], ['Выход на Свалку', 66, 4], ['Логово псов', 4, 39]];

function gen() {
  map.fill(GR);
  for (let y = 0; y < MH; y++) for (let x = PW; x < MW; x++) setT(x, y, VO);
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++)
    if (x <= 2 || x >= PW - 3 || y <= 1 || y >= MH - 3) setT(x, y, srnd() < 0.9 ? TR : BU);
  // насыпь
  for (let x = 0; x < PW; x++) for (let y = 28; y <= 30; y++) setT(x, y, RA);
  // главная дорога с юга на север, под мостом и к выходу на Свалку
  for (let y = 0; y < MH; y++) {
    const c = roadX[y];
    for (let d = -1; d <= 1; d++) setT(c + d, y, AS);
    if (y > 2 && y < MH - 3 && (y < 27 || y > 31)) { if (srnd() < 0.6) setT(c - 2, y, DI); if (srnd() < 0.6) setT(c + 2, y, DI); }
    reserve(c - 3, y, c + 3, y);
  }
  // туннель под насыпью
  for (let y = 28; y <= 30; y++) for (let x = 37; x <= 39; x++) setT(x, y, CF);
  reserve(34, 25, 42, 34);
  // грунтовки
  for (let x = 20; x <= roadX[82]; x++) { setT(x, 82, DI); setT(x, 83, DI); reserve(x, 81, x, 84); }
  for (let x = roadX[71]; x <= 86; x++) { setT(x, 71, DI); setT(x, 72, DI); reserve(x, 70, x, 73); }
  for (let y = 86; y <= 97; y++) { setT(13, y, DI); setT(14, y, DI); reserve(12, y, 15, y); }
  for (let x = 13; x <= 20; x++) { setT(x, 85, DI); reserve(x, 84, x, 86); }
  for (let x = 30; x <= roadX[20]; x++) { setT(x, 20, DI); reserve(x, 19, x, 21); }
  for (let x = roadX[17]; x <= 86; x++) { setT(x, 17, DI); reserve(x, 16, x, 18); }
  for (let y = 31; y <= 40; y++) { setT(38, y, DI); reserve(37, y, 39, y); }
  for (let x = 39; x <= roadX[40]; x++) { setT(x, 40, DI); reserve(x, 39, x, 41); }
  for (let y = 21; y <= 27; y++) { setT(38, y, DI); reserve(37, y, 39, y); }
  // деревня новичков вокруг костра
  for (let y = 76; y <= 93; y++) for (let x = 20; x <= 42; x++) {
    const d = dst(x, y, 30.5, 84.5); if (d < 4.5 || (d < 7 && srnd() < 0.35)) setT(x, y, DI);
  }
  reserveC(30, 84, 8);
  house(15, 72, 8, 6, [[6, 5], [5, 5]]);
  house(26, 71, 7, 6, [[3, 5]]);
  house(37, 73, 8, 6, [[1, 5], [2, 5]]);
  house(15, 87, 7, 6, [[6, 2], [6, 3]]);
  house(39, 87, 7, 6, [[0, 2], [0, 3]]);
  house(25, 93, 8, 5, [[3, 0], [4, 0]]);
  // бункер: люк снаружи
  for (let y = 96; y <= 100; y++) for (let x = 10; x <= 15; x++) setT(x, y, CF);
  reserve(9, 95, 16, 101);
  // бункер внутри
  for (let y = 1; y <= 12; y++) for (let x = 121; x <= 131; x++) setT(x, y, (x === 121 || x === 131 || y === 1 || y === 12) ? CO : CF);
  // АТП
  for (let y = 60; y <= 82; y++) for (let x = 86; x <= 110; x++) {
    const edge = x === 86 || x === 110 || y === 60 || y === 82;
    setT(x, y, edge ? CO : (vnoise(x, y, 3) > 0.62 ? DI : CF));
  }
  for (let y = 70; y <= 73; y++) setT(86, y, DI);
  house(91, 62, 15, 6, [[3, 5], [4, 5], [10, 5], [11, 5]], CO, 0);
  house(89, 75, 10, 6, [[4, 0], [5, 0]], CO, 0);
  house(104, 74, 5, 6, [[0, 3]], CO, 0);
  reserve(84, 58, 112, 84);
  // за насыпью: свиноферма и ферма
  house(10, 8, 15, 8, [[7, 7], [8, 7], [0, 3]], BR, 0.25, 'ruin');
  house(27, 10, 8, 6, [[0, 2]], BR, 0.3, 'ruin');
  house(13, 18, 6, 5, [[2, 0]], BR, 0.3, 'ruin');
  reserve(8, 6, 37, 24);
  house(84, 10, 10, 7, [[4, 6], [5, 6]], BR, 0.3, 'ruin');
  house(97, 12, 6, 5, [[0, 2]], BR, 0.35, 'ruin');
  reserveC(92, 19, 5);
  reserveC(46, 21, 4);
  // болото
  for (let y = 44; y <= 56; y++) for (let x = 14; x <= 36; x++)
    if (((x - 25) / 8.5) ** 2 + ((y - 50) / 4.4) ** 2 < 1 + (vnoise(x, y, 2) - 0.5) * 0.5) { setT(x, y, SW); keep[y * MW + x] = 1; }
  // поля, логово, позиции
  reserveC(75, 53, 10); reserveC(33, 34, 5); reserveC(10, 42, 5); reserveC(60, 18, 5);
  reserveC(79, 66, 2); reserveC(79, 76, 2); reserveC(63, 33, 5); reserveC(58, 66, 2);
  reserve(57, 99, 70, 106);
  // овраг у АТП
  for (let x = 80; x <= 104; x++) for (let y = 86; y <= 89; y++) if (vnoise(x, y, 3) > 0.35) { setT(x, y, DI); keep[y * MW + x] = 1; }
  // леса
  for (let y = 2; y < MH - 3; y++) for (let x = 3; x < PW - 3; x++) {
    const i = y * MW + x; if (keep[i] || map[i] !== GR) continue;
    let p = 0.022;
    if (x <= 33 && y >= 31 && y <= 66) p = 0.3;
    if (x >= 106 && y >= 84) p = 0.3;
    if (x >= 98 && y <= 26) p = 0.25;
    if (y >= 3 && y <= 27 && x >= 38 && x <= 54) p = 0.2;
    if (x >= 44 && x <= 54 && y >= 90) p = 0.18;
    if (y <= 5) p = 0.25;
    const r = srnd();
    if (r < p) map[i] = TR; else if (r < p + 0.05) map[i] = BU;
  }
  // объекты
  addObj({ k: 'bus', x: 67 * T, y: 47 * T, w: 4 * T, h: 2 * T, solid: 1, opaque: 1 });
  addObj({ k: 'trafo', x: 32 * T, y: 33 * T, w: 2 * T, h: 2 * T, solid: 1, opaque: 1 });
  addObj({ k: 'barrier', key: 'bar', x: (roadX[31] - 1) * T, y: 30 * T + 8, w: 3 * T, h: 16, solid: 1 });
  addObj({ k: 'blocks', x: (roadX[104] - 4) * T, y: 104 * T, w: 9 * T, h: T, solid: 1 });
  addObj({ k: 'blocks', x: (roadX[3] - 4) * T, y: 3 * T, w: 9 * T, h: T, solid: 1 });
  addObj({ k: 'hatch', x: 12 * T, y: 98 * T, w: T, h: T });
  addObj({ k: 'fire', x: FIRE.x - 10, y: FIRE.y - 10, w: 20, h: 20, solid: 1 });
  addObj({ k: 'fire', x: FIRE2.x - 10, y: FIRE2.y - 10, w: 20, h: 20, solid: 1 });
  [[59, 40], [65, 63], [58, 90], [83, 67], [66, 24], [59, 12]].forEach((c, i) => addObj({ k: 'car', x: c[0] * T, y: c[1] * T + 4, w: 2 * T, h: T - 8, solid: 1, opaque: 0, seed: i }));
  for (let i = 0; i < 9; i++) { const x = 6 + i * 13, y = 36 + i * 7; if (x < PW - 4) addObj({ k: 'pylon', x: x * T + 6, y: y * T + 6, w: 20, h: 20, solid: 1 }); }
  [[92, 64], [93, 64], [108, 66], [108, 67], [87, 79], [100, 70], [101, 70], [96, 78]].forEach(c => addObj({ k: 'crate', x: c[0] * T + 3, y: c[1] * T + 3, w: 26, h: 26, solid: 1 }));
  // мебель и тайники в домах
  [[16, 73], [21, 73], [27, 72], [38, 74], [43, 74], [16, 88], [40, 88], [26, 94], [31, 94]].forEach((c, i) => addObj({ k: i % 3 ? 'bed' : 'table', x: c[0] * T + 2, y: c[1] * T + 4, w: i % 3 ? 28 : 26, h: i % 3 ? 20 : 22, solid: 1 }));
  addObj({ k: 'crate', x: 104 * T + 3, y: 63 * T + 3, w: 26, h: 26, solid: 1, stash: 'st1', loot: { money: 250, a9: 16, medkit: 1 } });
  addObj({ k: 'crate', x: 85 * T + 3, y: 11 * T + 3, w: 26, h: 26, solid: 1, stash: 'st2', loot: { money: 400, antirad: 2, a12: 10 } });
  addObj({ k: 'crate', x: 21 * T + 3, y: 76 * T + 3, w: 26, h: 26, solid: 1, stash: 'st3', loot: { a9: 10, bandage: 1 } });
  addObj({ k: 'crate', x: 44 * T + 3, y: 91 * T + 3, w: 26, h: 26, solid: 1, stash: 'st4', loot: { vodka: 1, cans: 1, money: 120 } });
  addObj({ k: 'crate', x: 11 * T + 3, y: 9 * T + 3, w: 26, h: 26, solid: 1, stash: 'st5', loot: { a545: 30, grenade: 1, money: 300 } });
  addObj({ k: 'crate', x: 107 * T + 3, y: 78 * T + 3, w: 26, h: 26, solid: 1, stash: 'st6', loot: { a12: 8, sausage: 2 } });
  [[60, 32], [66, 32]].forEach(c => addObj({ k: 'sand', x: c[0] * T, y: c[1] * T + 8, w: T, h: 16, solid: 1 }));
  [[59, 102], [69, 102]].forEach(c => addObj({ k: 'sand', x: c[0] * T, y: c[1] * T + 8, w: T, h: 16, solid: 1 }));
  // бункер: прилавок, полки, лестница
  addObj({ k: 'counter', x: 122 * T, y: 6 * T + 4, w: 9 * T, h: 22, solid: 1, opaque: 0 });
  [[122, 2], [125, 2], [128, 2]].forEach(c => addObj({ k: 'shelf', x: c[0] * T + 2, y: c[1] * T + 2, w: 2 * T + 28, h: 20, solid: 1 }));
  [[129.5, 8.5], [129.5, 10]].forEach(c => addObj({ k: 'crate', x: c[0] * T, y: c[1] * T, w: 26, h: 26, solid: 1 }));
  addObj({ k: 'stairs', x: 123.5 * T, y: 10.4 * T, w: 2 * T, h: T + 18 });
  // аномалии и артефакты
  [[72, 52], [75, 50], [77, 54], [73, 56], [76, 57], [79, 52], [70, 55], [58, 16], [67, 21], [24, 26]].forEach(c => ANOM0.push({ x: c[0] * T + 16, y: c[1] * T + 16, r: 26, k: 'g' }));
  [[37.4, 28.5, 20], [39.6, 29.7, 20], [37.6, 31.9, 20], [30.5, 33.5, 24], [35.5, 32.5, 24]].forEach(c => ANOM0.push({ x: c[0] * T, y: c[1] * T, r: c[2], k: 'e' }));
  ARTS0.push({ id: 'art_medusa', key: 'a1', x: 74.6 * T, y: 53.8 * T }, { id: 'art_blood', key: 'a2', x: 78.4 * T, y: 56.8 * T },
    { id: 'art_bengal', key: 'a3', x: 38.6 * T, y: 26.2 * T }, { id: 'art_medusa', key: 'a4', x: 60.2 * T, y: 18.6 * T });
  rads.push({ x: 69 * T, y: 48 * T, r: 120, p: 5 }, { x: 75 * T, y: 54 * T, r: 190, p: 1.6 }, { x: 33 * T, y: 34 * T, r: 90, p: 2 }, { x: 66 * T, y: 63.5 * T, r: 70, p: 3 });
}
function openBarrier() { const b = objs.find(o => o.key === 'bar'); if (b && b.solid) { b.solid = 0; buildGrids(); } }

