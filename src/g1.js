/* ===================== основа ===================== */
const T = 32, BIG = typeof window !== 'undefined' && window.ZONA_BIG === 1;
/* BIG: большой Кордон 240×220 (+12 клеток под бункер). Старая карта генерируется в свои массивы 132×110, затем gbig.js переносит её по частям. */
let MW = BIG ? 252 : 132, MH = BIG ? 220 : 110, PW = BIG ? 240 : 120, WW = MW * T, WH = MH * T;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const chance = p => Math.random() < p;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dst = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dE = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function angD(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const srnd = mulberry32(19860426);
/* воспроизводимые QA-прогоны: #seed=N в адресе подменяет Math.random детерминированным генератором */
(function () { const m = typeof location !== 'undefined' && /seed=(\d+)/.exec(location.hash); if (m) Math.random = mulberry32(+m[1]); })();
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sm = t => t * t * (3 - 2 * t), u = sm(fx), v = sm(fy);
  const a = hash2(x0, y0), b = hash2(x0 + 1, y0), c = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* ===================== предметы и оружие ===================== */
const DETECTORS = {
  det_spark: { n: 'Детектор «Искра»', price: 500, w: 0.25, metres: 6 },
  det_contour: { n: 'Детектор «Контур»', price: 1800, w: 0.45, metres: 15 },
  det_spectrum: { n: 'Детектор «Спектр»', price: 4500, w: 0.75, metres: 30 }
};
const detectorImages = {};
for (const [id, model] of Object.entries(DETECTORS)) {
  model.d = 'Радиус поиска ' + model.metres + ' м. Возьми в руки через выбор оружия. Чем ближе артефакт, тем чаще сигнал.';
  const image = new Image();
  image.src = window.DETECTOR_IMAGES[id]; image.alt = ''; image.className = 'b1ic g3ic';
  detectorImages[id] = image;
}
const ITEMS = {
  ...DETECTORS,
  medkit: { n: 'Аптечка', price: 300, heal: 50, w: 0.3, d: '+50 здоровья' },
  bandage: { n: 'Бинт', price: 80, heal: 15, w: 0.1, d: '+15 здоровья' },
  antirad: { n: 'Антирад', price: 250, rad: 60, w: 0.1, d: '−60 радиации' },
  energy: { n: 'Энергетик', price: 150, w: 0.35, d: 'На 60 секунд игры расход сил снижается на 35%, восстановление ускоряется на 50%. Вторая банка обновляет время.' },
  vodka: { n: 'Водка', price: 100, rad: 20, heal: -3, w: 0.6, d: '−20 радиации, −3 здоровья' },
  bread: { n: 'Хлеб', price: 40, heal: 5, w: 0.3, d: '+5 здоровья' },
  sausage: { n: 'Колбаса', price: 60, heal: 8, w: 0.4, d: '+8 здоровья' },
  cans: { n: 'Консервы', price: 90, heal: 12, w: 0.5, d: '+12 здоровья' },
  grenade: { n: 'Граната Ф-1', price: 350, w: 0.6, d: 'Кнопка G или «Граната». Взрыв через полторы секунды' },
  a9: { n: 'Патроны 9×18', price: 8, ammo: 1, w: 0.01, d: 'Для ПМ' },
  a12: { n: 'Дробь 12 калибра', price: 20, ammo: 1, w: 0.04, d: 'Для обреза' },
  a545: { n: 'Патроны 5,45×39', price: 15, ammo: 1, w: 0.012, d: 'Для АКС-74У' },
  w_pm: { n: 'ПМ', price: 600, weapon: 1, w: 0.8 },
  w_obrez: { n: 'Обрез', price: 1200, weapon: 1, w: 1.9 },
  w_aksu: { n: 'АКС-74У', price: 4500, weapon: 1, w: 2.7 },
  ar_jacket: { n: 'Кожаная куртка', price: 300, armor: 0.1, w: 3 },
  ar_bandit: { n: 'Бандитская куртка', price: 900, armor: 0.2, w: 4 },
  ar_zarya: { n: 'Комбинезон «Заря»', price: 6000, armor: 0.4, w: 5 },
  art_medusa: { n: 'Артефакт «Медуза»', sell: 700, w: 0.5, d: 'Рождается в гравитационных аномалиях' },
  art_bengal: { n: 'Артефакт «Бенгальский огонь»', sell: 900, w: 0.5, d: 'Рождается в электрических аномалиях' },
  art_blood: { n: 'Артефакт «Кровь камня»', sell: 800, w: 0.5, d: 'Спёкшийся красноватый ком' },
  tail: { n: 'Хвост слепого пса', sell: 80, w: 0.2, d: 'Трофей, торговец берёт' },
  tentacle: { n: 'Щупальца кровососа', sell: 450, w: 0.5, d: 'Трофей, учёные за такое хорошо платят' },
  fuse: { n: 'Предохранитель', sell: 0, w: 0.2, quest: 1, d: 'Для деревенского генератора. Квестовый предмет.' },
  fuel: { n: 'Канистра с бензином', sell: 0, w: 5, quest: 1, d: 'Топливо для деревенского генератора. Квестовый предмет.' },
  hoof: { n: 'Копыто кабана', sell: 150, w: 0.7, d: 'Трофей, торговец берёт' },
  flash: { n: 'Флешка Шустрого', quest: 1, w: 0, d: 'Отдать Сидоровичу' }
};
const ARTFX = { art_medusa: 'На поясе: радиация копится вдвое медленнее и уходит сама', art_bengal: 'На поясе: защита +5%, электра бьёт вдвое слабее', art_blood: 'На поясе: понемногу лечит, но слегка фонит' };
const WP = {
  knife: { n: 'Нож', melee: 1, dmg: 34, rate: 0.5, range: 26, pref: 0 },
  w_pm: { n: 'ПМ', ammo: 'a9', mag: 8, dmg: 22, rate: 0.24, spread: 0.04, range: 520, reload: 1.4, snd: 'p', pref: 200 },
  w_obrez: { n: 'Обрез', ammo: 'a12', mag: 2, dmg: 13, pellets: 7, rate: 0.55, spread: 0.2, range: 300, reload: 1.9, snd: 's', pref: 110 },
  w_aksu: { n: 'АКС-74У', ammo: 'a545', mag: 30, dmg: 17, rate: 0.095, spread: 0.06, range: 620, reload: 2.3, snd: 'r', pref: 280, auto: 1 },
  grenade: { n: 'Граната', melee: 1, toss: 1, dmg: 110, rate: 1, range: 0, pref: 0 }   // выбирается в ячейке оружия, «Огонь» бросает
};
const WORDER = ['knife', 'w_pm', 'w_obrez', 'w_aksu', 'grenade', ...Object.keys(DETECTORS)];
const STOCK = [
  ...Object.entries(DETECTORS).map(([id, model]) => ({ id, q: 1, p: model.price })),
  { id: 'medkit', q: 1, p: 300 }, { id: 'bandage', q: 1, p: 80 }, { id: 'antirad', q: 1, p: 250 }, { id: 'vodka', q: 1, p: 100 }, { id: 'energy', q: 1, p: 150 },
  { id: 'bread', q: 1, p: 40 }, { id: 'sausage', q: 1, p: 60 }, { id: 'cans', q: 1, p: 90 }, { id: 'grenade', q: 1, p: 350 },
  { id: 'a9', q: 20, p: 160 }, { id: 'a12', q: 10, p: 200 }, { id: 'a545', q: 30, p: 450 },
  { id: 'w_pm', q: 1, p: 600 }, { id: 'w_obrez', q: 1, p: 1200 }, { id: 'w_aksu', q: 1, p: 4500 }, { id: 'ar_zarya', q: 1, p: 6000 }
];
const RANKS = ['новичок', 'опытный', 'ветеран', 'мастер'];
const LONER_NAMES = ['Костя Шнурок', 'Лёха Компас', 'Витя Ржавый', 'Саня Глухарь', 'Миха Полтора', 'Дима Чайник', 'Гена Сова', 'Тоха Барсук',
  'Жора Кирпич', 'Паша Тихий', 'Вадик Гвоздь', 'Стас Маяк', 'Юра Седло', 'Боря Шуруп', 'Рома Леший', 'Ваня Копчёный'];
const BANDIT_NAMES = ['Кастет', 'Фикса', 'Хриплый', 'Зуб', 'Мокрый', 'Косой', 'Штырь', 'Барыга', 'Клещ', 'Бубен', 'Жало', 'Гвоздила'];
const LORE = [
  'Зона живая. Идёшь тихо, с уважением, и она пропустит. Попрёшь напролом, сожрёт.',
  'Болт кидай перед собой всегда. Где болт закрутило, туда не лезь. Железка стоит копейки, а ноги у тебя одни.',
  'За ржавым автобусом у дороги поле с гравитационными аномалиями. Там «Медузу» видели, но и фонит там прилично.',
  'У старой трансформаторной будки в лесу трещат электры. Ночью их издалека видно, светятся.',
  'На южный блокпост не ходи. Там не разговаривают, там сразу стреляют.',
  'Водка радиацию выводит, но слабо. Антирад надёжнее, зато дороже.',
  'Слепые псы поодиночке трусы, а стаей рвут любого. Бей первым.',
  'Ночью лучше сидеть у костра. Если идёшь, фонарь не гаси: в темноте псов не увидишь.',
  'Бандиты держат АТП на востоке. Сидят за бетонным забором, суются оттуда на дорогу.',
  'Говорят, на севере есть место, где исполняются желания. Кто ходил проверять, не вернулся.',
  'Под мостом вояки. За деньги пропускают, но сейчас и за деньги не пускают, что-то у них там не так.',
  'Одиночку у костра не тронь. Тут все всё видят, и память у людей длинная.'
];

/* ===================== карта ===================== */
const GR = 0, DI = 1, AS = 2, SW = 3, CO = 4, TR = 5, FL = 6, BR = 7, BU = 8, RA = 9, CF = 10, VO = 11;
const SOLID = [0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1];
const OPAQ = [0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1];
let map = new Uint8Array(MW * MH), keep = new Uint8Array(MW * MH);
let roadX = new Int16Array(MH);
for (let y = 0; y < MH; y++) roadX[y] = 62 + Math.round(3 * Math.sin(y / 12));
const OLD = BIG ? { MW: 132, MH: 110, PW: 120, map: new Uint8Array(132 * 110), keep: new Uint8Array(132 * 110), roadX: new Int16Array(110) } : null;
if (BIG) for (let y = 0; y < 110; y++) OLD.roadX[y] = 62 + Math.round(3 * Math.sin(y / 12));
/* переключение глобальной сетки: старая (для прежнего генератора) или большая */
const BIGW = BIG ? { MW: MW, MH: MH, PW: PW, map: map, keep: keep, roadX: roadX } : null;
function useGrid(g) { MW = g.MW; MH = g.MH; PW = g.PW; WW = MW * T; WH = MH * T; map = g.map; keep = g.keep; roadX = g.roadX; }
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
  if (roof !== 'none') HOUSES.push({ x: x, y: y, w: w, h: h, doors, mat: roof || (wall === CO ? 'conc' : 'slate'), ruin: broken > 0.2, a: 1 });
}

// Штамп дома может оставить пролом помимо заданных дверей. Обход конечной
// сетки покрывает оба случая и объединяет смежные клетки в один проход.
function buildEntrances(h) {
  h.entrances = [];
  const home = h.ok || (h.x + ',' + h.y);
  const hasPorch = BIG && C1 && (home === '26,71' || home === '37,73');
  for (const [nx, ny] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const length = nx ? h.h : h.w;
    let start = 0, declared = false;
    for (let i = 1; i < length; i++) {
      const col = nx ? (nx > 0 ? h.w - 1 : 0) : i;
      const row = ny ? (ny > 0 ? h.h - 1 : 0) : i;
      const x = h.x + col, y = h.y + row;
      if (i < length - 1 && isFloor(tAt(x, y)) && !SOLID[tAt(x - nx, y - ny)] && !SOLID[tAt(x + nx, y + ny)]) {
        if (!start) start = i;
        declared ||= h.doors.some(([dx, dy]) => dx === col && dy === row);
        continue;
      }
      if (!start) continue;
      const end = i - 1;
      const mid = (start + end + 1) * T / 2;
      let approach = 'earth';
      if (!declared || h.ruin) approach = 'rubble';
      else if (h.mat === 'conc') approach = 'slab';
      else if (hasPorch && ny === 1) approach = 'porch';
      h.entrances.push({
        x: nx ? (nx > 0 ? h.w * T : 0) : mid,
        y: ny ? (ny > 0 ? h.h * T : 0) : mid,
        nx, ny, approach, breach: !declared, width: (end - start + 1) * T - 4
      });
      start = 0; declared = false;
    }
  }
}

const objs = [];
const addObj = o => { o.static = 1; objs.push(o); return o; };
const ANOM0 = [], ARTS0 = [], rads = [];
const HATCH = { x: 12.5 * T, y: 98.5 * T };
const SID_SHOP = !!window.SID_SHOP_IMAGE && !/sid-shop-off/.test(location.hash);
// План в клетках исходной карты. Большой Кордон переносит всю комнату вместе с лестницей.
const SHOP_ROOM = {top:2.8, width:6.4, height:7.4, counterY:6.02, counterFront:6.93};
const SID_DESK_Y = SID_SHOP ? SHOP_ROOM.counterY-.37 : 4.6;
const SID_DESK_X = SID_SHOP ? 125.9 : 126.5;
const SID_STAIR_X = SID_SHOP ? 126 : 124.5;
const SID_STAIR_Y = SID_SHOP ? 9.55 : 11.4;
const SID_SPAWN_Y = SID_SHOP ? 7.94 : 8.6;
const STAIRS = { x: SID_STAIR_X * T, y: SID_STAIR_Y * T };
const CAMP_TILE = BIG ? [28.5, 81.5] : [30.5, 84.5];
const FIRE = { x: CAMP_TILE[0] * T, y: CAMP_TILE[1] * T };
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
  if (BIG) useGrid(OLD);
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
  if (SID_SHOP) {
    for (let y=95; y<=100; y++) for (let x=9; x<=15; x++) setT(x,y,GR);
    setT(12,99,DI); setT(13,100,DI);
  } else for (let y = 96; y <= 100; y++) for (let x = 10; x <= 15; x++) setT(x, y, CF);
  reserve(9, 95, 16, 101);
  // бункер внутри
  for (let y = 1; y <= 12; y++) for (let x = 121; x <= 131; x++) setT(x, y, (SID_SHOP ? x<123 || x>128 || y<3 || y>9 : x===121 || x===131 || y===1 || y===12) ? CO : CF);
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
  reserveC(74, 63, 2); reserveC(74, 79, 2); reserveC(63, 33, 5); reserveC(58, 66, 2);
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
  if (BIG && C1) {
    // Южный КПП. Два отдельных отбойника на краях дороги с проходом между ними.
    const road = roadX[104] * T;
    addObj({ k: 'blocks', roadblock: true, x: road - 3 * T, y: 104 * T + 4, w: 64, h: 16, solid: 1 });
    addObj({ k: 'blocks', roadblock: true, x: road + 1.7 * T, y: 105 * T + 6, w: 54, h: 16, solid: 1 });
  } else {
    addObj({ k: 'blocks', x: (roadX[104] - 4) * T, y: 104 * T, w: 9 * T, h: T, solid: 1 });
  }
  addObj({ k: 'blocks', x: (roadX[3] - 4) * T, y: 3 * T, w: 9 * T, h: T, solid: 1 });
  addObj({ k: 'hatch', x: 12 * T, y: 98 * T, w: T, h: T });
  addObj({ k: 'fire', x: FIRE.x - 10, y: FIRE.y - 10, w: 20, h: 20, solid: 1 });
  addObj({ k: 'fire', x: FIRE2.x - 10, y: FIRE2.y - 10, w: 20, h: 20, solid: 1 });
  [[59, 40], [65, 63], [58, 90], [83, 67], [66, 24], [59, 12]].forEach((c, i) => addObj({ k: 'car', x: c[0] * T, y: c[1] * T + 4, w: 2 * T, h: T - 8, solid: 1, opaque: 0, seed: i }));
  for (let i = 0; i < 9; i++) { const x = 6 + i * 13, y = 36 + i * 7; if (x < PW - 4) addObj({ k: 'pylon', x: x * T + 6, y: y * T + 6, w: 20, h: 20, solid: 1 }); }
  [[92, 64], [93, 64], [108, 66], [108, 67], [87, 79], [100, 70], [101, 70], [96, 78]].forEach(c => addObj({ k: 'crate', x: c[0] * T + 3, y: c[1] * T + 3, w: 26, h: 26, solid: 1 }));
  // мебель и тайники в домах
  [[16, 73], [21, 73], [27, 72], [40, 74], [43, 74], [16, 88], [40, 88], [26, 94], [31, 94]].forEach((c, i) => addObj({ k: i % 3 ? 'bed' : 'table', x: c[0] * T + 2, y: c[1] * T + 4, w: i % 3 ? 28 : 26, h: i % 3 ? 20 : 22, solid: 1 }));
  addObj({ k: 'crate', x: 104 * T + 3, y: 63 * T + 3, w: 26, h: 26, solid: 1, stash: 'st1', loot: { money: 250, a9: 16, medkit: 1 } });
  addObj({ k: 'crate', x: 87 * T + 3, y: 12 * T + 3, w: 26, h: 26, solid: 1, stash: 'st2', loot: { money: 400, antirad: 2, a12: 10 } });
  addObj({ k: 'crate', x: 19 * T + 3, y: 75 * T + 3, w: 26, h: 26, solid: 1, stash: 'st3', loot: { a9: 10, bandage: 1 } });
  addObj({ k: 'crate', x: 44 * T + 3, y: 91 * T + 3, w: 26, h: 26, solid: 1, stash: 'st4', loot: { vodka: 1, cans: 1, money: 120 } });
  addObj({ k: 'crate', x: 11 * T + 3, y: 9 * T + 3, w: 26, h: 26, solid: 1, stash: 'st5', loot: { a545: 30, grenade: 1, money: 300 } });
  addObj({ k: 'crate', x: 107 * T + 3, y: 78 * T + 3, w: 26, h: 26, solid: 1, stash: 'st6', loot: { a12: 8, sausage: 2 } });
  [[60, 32], [66, 32]].forEach(c => addObj({ k: 'sand', x: c[0] * T, y: c[1] * T + 8, w: T, h: 16, solid: 1 }));
  [[59, 102], [69, 102]].forEach(c => addObj({ k: 'sand', x: c[0] * T, y: c[1] * T + 8, w: T, h: 16, solid: 1 }));
  // бункер: прилавок, полки, лестница
  if (SID_SHOP) {
    addObj({k:'counter', x:123*T, y:SHOP_ROOM.counterY*T, w:6*T, h:(SHOP_ROOM.counterFront-SHOP_ROOM.counterY)*T, solid:1});
    addObj({k:'shelf', x:123*T, y:3*T, w:6*T, h:.72*T, solid:1});
    addObj({k:'crate', shopStack:true, x:128.23*T, y:7.17*T, w:.65*T, h:1.65*T, solid:1});
  } else {
    addObj({k:'counter', x:122*T, y:6*T+4, w:9*T, h:22, solid:1});
    [[122,2],[125,2],[128,2]].forEach(c=>addObj({k:'shelf', x:c[0]*T+2, y:c[1]*T+2, w:2*T+28, h:20, solid:1}));
    [[129.5,8.5],[129.5,10]].forEach(c=>addObj({k:'crate', x:c[0]*T, y:c[1]*T, w:26, h:26, solid:1}));
  }
  addObj({k:'stairs', x:(SID_STAIR_X-1)*T, y:(SID_STAIR_Y-1)*T, w:2*T, h:T+18});
  // аномалии и артефакты
  [[72, 52], [75, 50], [77, 54], [73, 56], [76, 57], [79, 52], [70, 55], [58, 16], [67, 21], [24, 26]].forEach(c => ANOM0.push({ x: c[0] * T + 16, y: c[1] * T + 16, r: 26, k: 'g' }));
  [[37.4, 28.5, 20], [39.6, 29.7, 20], [37.6, 31.9, 20], [30.5, 33.5, 24], [35.5, 32.5, 24]].forEach(c => ANOM0.push({ x: c[0] * T, y: c[1] * T, r: c[2], k: 'e' }));
  ARTS0.push({ id: 'art_medusa', key: 'a1', x: 74.6 * T, y: 53.8 * T }, { id: 'art_blood', key: 'a2', x: 78.4 * T, y: 56.8 * T },
    { id: 'art_bengal', key: 'a3', x: 38.6 * T, y: 26.2 * T }, { id: 'art_medusa', key: 'a4', x: 60.2 * T, y: 18.6 * T });
  rads.push({ x: 69 * T, y: 48 * T, r: 120, p: 5 }, { x: 75 * T, y: 54 * T, r: 190, p: 1.6 }, { x: 33 * T, y: 34 * T, r: 90, p: 2 }, { x: 66 * T, y: 63.5 * T, r: 70, p: 3 });
  if (MAP_ID === 'rc1') rc1Gen();
}
function openBarrier() { const b = objs.find(o => o.key === 'bar'); if (b && b.solid) { b.solid = 0; buildGrids(); } }

/* сетки проходимости и видимости */
const nav = new Uint8Array(MW * MH), opq = new Uint8Array(MW * MH);
const fences = [];
let navRevision = 0;
function buildGrids() {
  navRevision++;
  fences.length = 0;
  for (let i = 0; i < MW * MH; i++) { nav[i] = SOLID[map[i]] ? 0 : 1; opq[i] = OPAQ[map[i]]; }
  objs.forEach(o => {
    if (!o.solid) return;
    if (o.k === 'fence') fences.push(o);
    for (let y = Math.floor(o.y / T); y <= Math.floor((o.y + o.h - 1) / T); y++)
      for (let x = Math.floor(o.x / T); x <= Math.floor((o.x + o.w - 1) / T); x++) if (inb(x, y)) {
        nav[y * MW + x] = 0; if (o.opaque) opq[y * MW + x] = 1;
      }
  });
  for (const [key,props] of propCells) {
    const center={x:(key%MW+.5)*T, y:(Math.floor(key/MW)+.5)*T, r:10};
    if(props.some(p=>touchesProp(p,center))) nav[key]=0;
  }
  ANOM0.forEach(a => {
    for (let y = Math.floor((a.y - a.r - 14) / T); y <= Math.floor((a.y + a.r + 14) / T); y++)
      for (let x = Math.floor((a.x - a.r - 14) / T); x <= Math.floor((a.x + a.r + 14) / T); x++)
        if (inb(x, y) && dst(x * T + 16, y * T + 16, a.x, a.y) < a.r + 18) nav[y * MW + x] = 0;
  });
}
const opqAt = (px, py) => { const x = Math.floor(px / T), y = Math.floor(py / T); return inb(x, y) ? opq[y * MW + x] : 1; };
function los(ax, ay, bx, by) {
  const d = dst(ax, ay, bx, by), n = Math.ceil(d / 10);
  for (let i = 1; i < n; i++) if (opqAt(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
const bfsPrev = new Int32Array(MW * MH), bfsQ = new Int32Array(MW * MH);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function navNeighbor(x, y, k) {
  const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
  if (!inb(nx, ny) || !nav[ny * MW + nx]) return -1;
  if (k >= 4 && (!nav[y * MW + nx] || !nav[ny * MW + x])) return -1;
  return ny * MW + nx;
}
function nearestNav(tx, ty) {
  for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tx + dx, y = ty + dy; if (inb(x, y) && nav[y * MW + x]) return y * MW + x;
  }
  return -1;
}
function findPath(sx, sy, tx, ty) {
  const s = nearestNav(Math.floor(sx / T), Math.floor(sy / T)), g = nearestNav(Math.floor(tx / T), Math.floor(ty / T));
  if (s < 0 || g < 0) return null;
  bfsPrev.fill(-1); bfsPrev[s] = s;
  let h = 0, t = 0; bfsQ[t++] = s;
  while (h < t) {
    const c = bfsQ[h++]; if (c === g) break;
    const cx = c % MW, cy = (c / MW) | 0;
    for (let k = 0; k < 8; k++) {
      const ni = navNeighbor(cx, cy, k);
      if (ni < 0 || bfsPrev[ni] >= 0) continue;
      bfsPrev[ni] = c; bfsQ[t++] = ni;
    }
  }
  if (bfsPrev[g] < 0) return null;
  const pts = []; let c = g;
  while (c !== s) { pts.push({ x: (c % MW) * T + 16, y: ((c / MW) | 0) * T + 16 }); c = bfsPrev[c]; }
  pts.reverse();
  return pts;
}
