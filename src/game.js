(function () {
'use strict';
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
const ITEMS = {
  medkit: { n: 'Аптечка', price: 300, heal: 50, w: 0.3, d: '+50 здоровья' },
  bandage: { n: 'Бинт', price: 80, heal: 15, w: 0.1, d: '+15 здоровья' },
  antirad: { n: 'Антирад', price: 250, rad: 60, w: 0.1, d: '−60 радиации' },
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
const WORDER = ['knife', 'w_pm', 'w_obrez', 'w_aksu', 'grenade'];
const STOCK = [
  { id: 'medkit', q: 1, p: 300 }, { id: 'bandage', q: 1, p: 80 }, { id: 'antirad', q: 1, p: 250 }, { id: 'vodka', q: 1, p: 100 },
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
      h.entrances.push({
        x: nx ? (nx > 0 ? h.w * T : 0) : mid,
        y: ny ? (ny > 0 ? h.h * T : 0) : mid,
        nx, ny, breach: !declared, width: (end - start + 1) * T - 4
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
function buildGrids() {
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
      const nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
      if (!inb(nx, ny)) continue;
      const ni = ny * MW + nx;
      if (bfsPrev[ni] >= 0 || !nav[ni]) continue;
      if (k >= 4 && (!nav[cy * MW + nx] || !nav[ny * MW + cx])) continue;
      bfsPrev[ni] = c; bfsQ[t++] = ni;
    }
  }
  if (bfsPrev[g] < 0) return null;
  const pts = []; let c = g;
  while (c !== s) { pts.push({ x: (c % MW) * T + 16, y: ((c / MW) | 0) * T + 16 }); c = bfsPrev[c]; }
  pts.reverse();
  return pts;
}

/* ===================== справочник локаций =====================
   Все места, на которые ссылаются задания, события, NPC, подписи и цели, задаются здесь.
   Координаты в клетках (T=32). Перенос карты = правка этого справочника и тайлов;
   код заданий и сохранения ссылаются на id и имена якорей, а не на числа.
   bounds: [x0, y0, x1, y1]; entrances: точки входа; anchors: именованные точки или списки точек. */
const MAP_ID = (typeof window !== 'undefined' && window.ZONA_MAP) || 'k07';
const MAP_VERSION = (typeof window !== 'undefined' && window.ZONA_BIG === 1) ? 'kordon-big' : MAP_ID === 'rc1' ? 'kordon-rc1' : 'kordon-0.7';
const LOCATIONS = [
  { id: 'village', name: 'Деревня новичков', gen: 'деревни новичков', type: 'safe', bounds: [18, 74, 42, 92], entrances: [[33, 74], [42, 84], [24, 92]],
    anchors: { fire: CAMP_TILE.slice(), shust: [34.5, 80.5], tolik: [35, 81], seats: [[28.2, 83.3], [31.8, 82.7], [32.6, 85.6], [28.6, 86.4]], wolf: [27.5, 79], safe: [30, 88] } },
  { id: 'sid', name: 'Бункер Сидоровича', gen: 'бункера', type: 'safe', bounds: [8, 94, 17, 102], entrances: [[12.5, 98.5]],
    anchors: { hatch: [12.5, 98.5], trader: [SID_DESK_X, SID_DESK_Y], stairs: [SID_STAIR_X, SID_STAIR_Y], spawn: [SID_SHOP ? SID_STAIR_X : 126.5, SID_SPAWN_Y] } },
  { id: 'atp', name: 'АТП', gen: 'АТП', type: 'danger', bounds: [84, 58, 112, 84], entrances: [[86, 70], [104, 84]],
    anchors: { garage: [94.5, 64.6], petr: [93, 71.5], petr2: [97, 71.5], approach: [66, 37], sos: [[96, 96]] } },
  { id: 'field', name: 'Поле аномалий', gen: 'поля аномалий', type: 'anomaly', bounds: [66, 46, 84, 60], entrances: [[70, 60]],
    anchors: { medusa: [74.5, 53.5], sos: [[80, 46]] } },
  { id: 'dogs_lair', name: 'Логово псов', gen: 'леса на западе', type: 'danger', bounds: [4, 36, 18, 50], entrances: [[16, 44]],
    anchors: { lair: [10.5, 42.5] } },
  { id: 'swamp', name: 'Болото', gen: 'болота', type: 'anomaly', bounds: [14, 44, 36, 56], entrances: [[25, 56]],
    anchors: { sos: [[16, 68]] } },
  { id: 'pump', name: 'Старая водокачка', gen: 'старой водокачки', type: 'story', bounds: [40, 54, 50, 64], entrances: [[45, 64]],
    anchors: { clear: [46, 58], sos: [[44, 60]] } },
  { id: 'gardens', name: 'Южные сады', gen: 'южных садов', type: 'story', bounds: [34, 90, 48, 102], entrances: [[40, 90]],
    anchors: { clear: [40, 94], sos: [[40, 96]] } },
  { id: 'rail', name: 'Железная дорога', gen: 'железной дороги', type: 'story', bounds: [70, 40, 86, 48], entrances: [[78, 48]],
    anchors: { clear: [78, 44] } },
  { id: 'east_edge', name: 'Восточная опушка', gen: 'восточной опушки', type: 'story', bounds: [102, 26, 118, 38], entrances: [[106, 38]],
    anchors: { clear: [110, 30], sos: [[108, 32]] } },
  { id: 'bridge', name: 'Мост, военные', gen: 'моста', type: 'danger', bounds: [58, 28, 70, 38], entrances: [[64, 38], [64, 28]],
    anchors: { post: [63.5, 34.2] } },
  { id: 'camp', name: 'Лагерь за насыпью', gen: 'насыпи', type: 'safe', bounds: [42, 17, 52, 26], entrances: [[47, 26]],
    anchors: { fire: [46.5, 21.5], sos: [[50, 22]] } },
  { id: 'farm', name: 'Ферма', gen: 'фермы', type: 'story', bounds: [82, 8, 96, 20], entrances: [[88, 20]],
    anchors: { fox: [88.5, 14.5] } },
  { id: 'lair', name: 'Хлев за фермой', gen: 'хлева за фермой', type: 'danger', bounds: [96, 11, 104, 18], entrances: [[97, 14]],
    anchors: { sucker: [100, 14.5] } },
  { id: 'south_post', name: 'Южный блокпост', gen: 'южного блокпоста', type: 'danger', bounds: [56, 98, 72, 108], entrances: [[64, 98]],
    anchors: { post: [64, 102.6] } }
];
const LOC = {}; LOCATIONS.forEach(l => { LOC[l.id] = l; });
/* точка якоря в пикселях: locPt('village', 'fire') */
function locPt(id, anchor) {
  const l = LOC[id]; if (!l) throw new Error('Нет локации ' + id);
  const a = anchor ? l.anchors[anchor] : [(l.bounds[0] + l.bounds[2]) / 2, (l.bounds[1] + l.bounds[3]) / 2];
  if (!a) throw new Error('Нет якоря ' + id + '.' + anchor);
  return { x: a[0] * T, y: a[1] * T, loc: id };
}
/* все якоря данного вида по всем локациям: [{ loc, x, y }] в клетках */
function locAnchors(kind) {
  const out = [];
  LOCATIONS.forEach(l => { const a = l.anchors[kind]; if (!a) return; (Array.isArray(a[0]) ? a : [a]).forEach(p => out.push({ loc: l.id, x: p[0], y: p[1] })); });
  return out;
}
/* ближайшая локация к точке (клетки) — для подписей в журнале */
function locNear(x, y) {
  let b = LOCATIONS[0], bd = 1e9;
  LOCATIONS.forEach(l => { if (l.id === 'sid') return; const cx = (l.bounds[0] + l.bounds[2]) / 2, cy = (l.bounds[1] + l.bounds[3]) / 2, d = (cx - x) ** 2 + (cy - y) ** 2; if (d < bd) { bd = d; b = l; } });
  return b;
}
function locAt(x, y) { return LOCATIONS.find(l => x >= l.bounds[0] && x <= l.bounds[2] && y >= l.bounds[1] && y <= l.bounds[3]) || null; }

/* ===================== состояние ===================== */
let S = null, P = null, ents = [], decals = [], parts = [], tracers = [], flashes = [], bolts = [], nades = [], crows = [], anoms = [], arts = [];
let armyAngry = false, nextId = 1, spawnT = 0, fogT = 0, saveT = 0, warnT = 0;
const cnt = id => S.inv[id] || 0;
const has = id => cnt(id) > 0;
const beltCount = id => S.belt.filter(x => x === id).length;
function give(id, n) { S.inv[id] = cnt(id) + (n || 1); }
function take(id, n) {
  S.inv[id] = Math.max(0, cnt(id) - (n || 1)); if (!S.inv[id]) delete S.inv[id];
  while (beltCount(id) > cnt(id)) S.belt.splice(S.belt.indexOf(id), 1);
  if (WP[id] && S.weapon === id && !has(id)) S.weapon = 'knife';
}
const weight = () => Math.round(Object.keys(S.inv).reduce((a, id) => a + (ITEMS[id] ? ITEMS[id].w : 0) * S.inv[id], 0) * 10) / 10;
const MAXW = 50;
const hour = () => (S.min / 60) % 24;
const night = () => { const h = hour(); return h >= 21 || h < 5; };
function darkness() {
  const h = hour();
  if (h >= 21 || h < 4.5) return 0.8;
  if (h < 6.5) return 0.8 * (1 - (h - 4.5) / 2);
  if (h >= 19) return 0.8 * (h - 19) / 2;
  return 0;
}
function clockStr(m) { m = Math.floor(m === undefined ? S.min : m); const p = x => (x < 10 ? '0' : '') + x; return p(Math.floor(m / 60) % 24) + ':' + p(m % 60) + ' · день ' + (Math.floor(m / 1440) + 1); }
const def = () => (ITEMS[S.armor] ? ITEMS[S.armor].armor : 0) + (beltCount('art_bengal') ? 0.05 : 0);
const score = () => S.stats.kM + S.stats.kS * 2 + S.stats.q * 10 + S.stats.art * 5;
const rankOf = sc => sc < 15 ? 0 : sc < 45 ? 1 : sc < 90 ? 2 : 3;

let MSGS = [];
function msg(t, k) { MSGS.push({ t: t, k: k || '', life: 6 }); if (MSGS.length > 5) MSGS.shift(); }
const radioQueue = [];
function radioNotice(t, urgent = false) {
  const k = urgent ? 'radio urgent' : 'radio';
  const i = radioQueue.findIndex(note => note.k === k);
  if (i >= 0) {
    if (radioQueue[i].t === t) return false;
    radioQueue.splice(i, 1);
  }
  const note = { t, k, life: urgent ? 10 : 6 };
  const position = !urgent && radioQueue[0]?.k === 'radio urgent' ? 1 : 0;
  radioQueue.splice(position, 0, note);
  return true;
}
function news(t) {
  S.news.push({ t: S.min, x: t });
  if (S.news.length > 60) S.news.shift();
}
function bulletin(t) {
  news(t);
  const pending = radioQueue.filter(note => note.k === 'radio bulletin');
  if (pending.some(note => note.t === t)) return;
  // Короткая серия идёт по одной строке. Большая пачка оставляет одну подсказку о журнале.
  if (pending.length >= 2) {
    if (pending.some(note => note.digest)) return;
    radioQueue.push({ t: 'Другие сводки — в журнале КПК.', k: 'radio bulletin', life: 4, digest: true });
  } else {
    radioQueue.push({ t, k: 'radio bulletin', life: 5 });
  }
}
function radioNews(t, urgent = false) {
  if (radioNotice(t, urgent)) { news(t); play('pda'); }
}

function freshS() {
  return { v: 1, money: 0, inv: { ar_jacket: 1, medkit: 1, bandage: 2, bread: 1 }, weapon: 'knife', armor: 'ar_jacket', belt: [], mag: {},
    q: { flash: 0, medusa: 0, pack: 0 }, rep: 0, stats: { kS: 0, kM: 0, q: 0, art: 0 }, news: [], flags: {}, dead: {}, min: 420,
    fog: '', mapVersion: MAP_VERSION, trackedQuestId: null, x: locPt('sid', 'spawn').x, y: locPt('sid', 'spawn').y, hp: 100, rad: 0, q2: { fox: 0, tolik: 0 } };
}

/* ===================== жители Кордона ===================== */
// Места заданы в координатах исходной деревни. Жители и декор вместе переносятся в большой Кордон.
const YARD_SEATS = [
  { sid: 'l1', x: 29.00, y: 83.38, wpn: 'w_pm', log: ['logs', -0.28, -0.32, -0.73] },
  { sid: 'l2', x: 31.05, y: 82.60, wpn: 'w_obrez', log: ['bench', 0.16, -0.36, 0.24] },
  { sid: 'l3', x: 32.15, y: 84.45, wpn: 'w_pm' },
  { sid: 'l4', x: 29.82, y: 86.33, wpn: 'w_pm', log: ['logs', -0.15, 0.35, 0.43] }
].map(s => ({ ...s, x: s.x + CAMP_TILE[0] - 30.5, y: s.y + CAMP_TILE[1] - 84.5 }));
const NPCDEF = [
  { sid: 'sid', fac: 'trader', name: 'Сидорович', x: SID_DESK_X, y: SID_DESK_Y, wpn: 'knife', hp: 99999, rank: 2, stay: 1, named: 1, ang: Math.PI / 2 },
  { sid: 'wolf', fac: 'loner', name: 'Волк', x: 27.5, y: 79, wpn: 'w_obrez', hp: 130, rank: 2, stay: 1, named: 1 },
  { sid: 'petr', fac: 'loner', name: 'Петруха', x: 74, y: 63.5, wpn: 'w_pm', hp: 150, rank: 1, stay: 1, named: 1 },
  { sid: 'petr2', fac: 'loner', name: 'Хомяк', x: 74, y: 79, wpn: 'w_obrez', hp: 130, rank: 0, stay: 1, named: 1 },
  { sid: 'shust', fac: 'loner', name: 'Шустрый', x: 94.5, y: 64.6, wpn: 'knife', hp: 60, rank: 0, captive: 1, named: 1 },
  { sid: 'tolik', fac: 'loner', name: 'Толик', x: 58.6, y: 66.4, wpn: 'w_pm', hp: 70, rank: 0, captive: 1, wounded: 1, named: 1 },
  { sid: 'fox', fac: 'loner', name: 'Лис', x: 88.5, y: 14.5, wpn: 'w_obrez', hp: 110, rank: 1, captive: 1, wounded: 1, named: 1, stay: 1 },
  { sid: 'b1', fac: 'bandit', x: 90, y: 71, wpn: 'w_pm', stay: 1 }, { sid: 'b2', fac: 'bandit', x: 93, y: 72.5, wpn: 'w_obrez' },
  { sid: 'b3', fac: 'bandit', x: 101, y: 72, wpn: 'w_pm' }, { sid: 'b4', fac: 'bandit', x: 104, y: 79, wpn: 'w_pm' },
  { sid: 'b5', fac: 'bandit', x: 99, y: 64.5, wpn: 'w_obrez' }, { sid: 'b6', fac: 'bandit', x: 93, y: 78.5, wpn: 'w_pm' },
  { sid: 'boss', fac: 'bandit', name: 'Сиплый', x: 103, y: 64.6, wpn: 'w_aksu', hp: 140, rank: 2, named: 1 },
  { sid: 'b7', fac: 'bandit', x: 16, y: 11, wpn: 'w_pm' }, { sid: 'b8', fac: 'bandit', x: 20, y: 12.5, wpn: 'w_obrez' }, { sid: 'b9', fac: 'bandit', x: 30, y: 12.5, wpn: 'w_pm' },
  { sid: 'a1', fac: 'army', name: 'Рядовой Ткач', x: 60.5, y: 33.4, wpn: 'w_aksu', guard: 'bridge' },
  { sid: 'a2', fac: 'army', name: 'Рядовой Мазур', x: 66.5, y: 33.4, wpn: 'w_aksu', guard: 'bridge' },
  { sid: 'a3', fac: 'army', name: 'Прапорщик', x: 63.5, y: 34.2, wpn: 'w_aksu', guard: 'bridge', rank: 1 },
  { sid: 'a4', fac: 'army', name: 'Часовой', x: 60.5, y: 102.6, wpn: 'w_aksu', guard: 'south' },
  { sid: 'a5', fac: 'army', name: 'Часовой', x: 68.5, y: 102.6, wpn: 'w_aksu', guard: 'south' },
  ...YARD_SEATS.map(({ sid, x, y, wpn }) => ({ sid, x, y, wpn, fac: 'loner', sit: 1 })),
  { sid: 'l5', fac: 'loner', x: 46, y: 90, wpn: 'w_pm' }, { sid: 'l6', fac: 'loner', x: 52, y: 74, wpn: 'w_obrez' },
  { sid: 'l7', fac: 'loner', x: 45, y: 20.6, wpn: 'w_obrez', sit: 1, fire: 2 }, { sid: 'l8', fac: 'loner', x: 48, y: 22.4, wpn: 'w_pm', sit: 1, fire: 2 }
];
const DOGDEF = [
  { sid: 'd1', pack: 'lair', x: 9, y: 41 }, { sid: 'd2', pack: 'lair', x: 11, y: 42 }, { sid: 'd3', pack: 'lair', x: 10, y: 44 }, { sid: 'd4', pack: 'lair', x: 12.5, y: 43 },
  { sid: 'f1', pack: 'north', x: 70, y: 20 }, { sid: 'f2', pack: 'north', x: 72, y: 21 }, { sid: 'f3', pack: 'north', x: 73.5, y: 19.5 }
];
function mkBoar(d) {
  return { id: nextId++, kind: 'boar', sid: d.sid, fac: 'mutant', name: 'Кабан', pack: d.pack, x: d.x * T, y: d.y * T, r: 14, hp: 130, maxhp: 130,
    ang: rnd(-3, 3), alive: 1, cool: 0, think: Math.random() * 0.3, home: { x: d.x * T, y: d.y * T }, kx: 0, ky: 0, flash: 0, step: 0, idleT: rnd(1, 4), state: 'idle', st: 0 };
}
/* кабан: замечает, роет землю, бросается рывком по прямой; после рывка оглушён — уходи в сторону */
function aiBoar(e, dt) {
  e.cool -= dt; e.think -= dt; e.st -= dt;
  if (e.think <= 0) {
    e.think = 0.3;
    if (!e.tgt || !e.tgt.alive || dE(e, e.tgt) > 560) {
      e.tgt = null;
      for (const o of ents) if (o.alive && o.fac !== 'mutant' && !o.captive && dE(e, o) < 300 && los(e.x, e.y, o.x, o.y)) { e.tgt = o; break; }
    }
  }
  const t = e.tgt;
  if (!t) { e.state = 'idle'; e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rnd(2, 6); const a = rnd(0, 6.28); e.wander = { x: e.home.x + Math.cos(a) * rnd(20, 90), y: e.home.y + Math.sin(a) * rnd(20, 90) }; } if (e.wander) { steer(e, e.wander.x, e.wander.y, 45, dt); e.ang += angD(e.ang, Math.atan2(e.wander.y - e.y, e.wander.x - e.x)) * dt * 3; if (dst(e.x, e.y, e.wander.x, e.wander.y) < 10) e.wander = null; } return; }
  const want = Math.atan2(t.y - e.y, t.x - e.x);
  if (e.state === 'idle' || e.state === 'stalk') {
    e.state = 'stalk'; e.ang += angD(e.ang, want) * Math.min(1, dt * 4);
    if (dE(e, t) > 240) goTo(e, t.x, t.y, 90, dt);
    else if (e.cool <= 0 && los(e.x, e.y, t.x, t.y)) { e.state = 'wind'; e.st = 0.6; play('dog', e.x, e.y, 0.7); }
    else steer(e, e.x + Math.cos(want + 1.57) * 40, e.y + Math.sin(want + 1.57) * 40, 50, dt);
  } else if (e.state === 'wind') {
    e.ang += angD(e.ang, want) * Math.min(1, dt * 6);
    if (chance(dt * 12)) parts.push({ x: e.x - Math.cos(e.ang) * 10, y: e.y - Math.sin(e.ang) * 10, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.4, c: '#5a4a34', s: 2 });
    if (e.st <= 0) { e.state = 'charge'; e.st = 0.85; e.hit = 0; }
  } else if (e.state === 'charge') {
    const sp = 330 * dt, ox = e.x, oy = e.y;
    moveE(e, Math.cos(e.ang) * sp, Math.sin(e.ang) * sp); e.step += sp;
    if (!e.hit) for (const o of ents) { if (o.alive && o !== e && o.fac !== 'mutant' && dE(o, e) < e.r + o.r + 4) { e.hit = 1; hurt(o, rnd(24, 34), e, e.ang); o.kx += Math.cos(e.ang) * 320; o.ky += Math.sin(e.ang) * 320; } }
    if (e.st <= 0 || dst(ox, oy, e.x, e.y) < sp * 0.3) { e.state = 'stun'; e.st = 1.1; e.cool = 1.6; }
  } else if (e.state === 'stun') { if (e.st <= 0) e.state = 'stalk'; }
}
const FAC_N = { loner: 'Одиночки', bandit: 'Бандиты', army: 'Военные', mutant: 'Мутанты', trader: 'Торговцы', player: 'Одиночки' };
const nameI = { loner: 0, bandit: 3 };
function rollInv(fac) {
  const inv = {};
  ['bandage', 'sausage', 'bread', 'vodka', 'cans'].forEach(i => { if (chance(0.3)) inv[i] = 1; });
  if (chance(fac === 'army' ? 0.5 : 0.25)) inv.medkit = 1;
  if (chance(0.15)) inv.antirad = 1;
  return inv;
}
function mkHuman(d) {
  const W = WP[d.wpn || 'w_pm'];
  const base = d.fac === 'army' ? 150 : d.fac === 'bandit' ? 70 : 85;
  const rank = d.rank !== undefined ? d.rank : (Math.random() < 0.55 ? 0 : Math.random() < 0.75 ? 1 : 2);
  const names = d.fac === 'bandit' ? BANDIT_NAMES : LONER_NAMES;
  const e = { id: nextId++, kind: 'human', sid: d.sid, fac: d.fac, name: d.name || names[(nameI[d.fac === 'bandit' ? 'bandit' : 'loner']++) % names.length],
    x: d.x * T, y: d.y * T, r: 11, hp: d.hp || base + rank * 10, ang: d.ang !== undefined ? d.ang : rnd(-3, 3), alive: 1,
    wpn: d.wpn || 'w_pm', mag: W.mag || 0, cool: 0, reload: 0, think: Math.random() * 0.3, react: 0.5, mem: 0,
    home: { x: d.x * T, y: d.y * T }, sit: d.sit, stay: d.stay, guard: d.guard, captive: d.captive, named: d.named, rank: rank,
    money: (d.fac === 'army' ? ri(100, 300) : ri(50, 300)) + rank * 120, inv: rollInv(d.fac), kx: 0, ky: 0, flash: 0, step: 0,
    wounded: d.wounded, fireRef: d.fire === 2 ? FIRE2 : FIRE,
    seed: Math.floor(Math.random() * 1e6), path: null, pi: 0, idleT: rnd(1, 5), trip: null, score: [ri(2, 14), ri(15, 44), ri(45, 80)][Math.min(rank, 2)] };
  e.maxhp = e.hp;
  if (e.sit) e.ang = Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x);
  if (e.guard === 'bridge') e.ang = Math.PI / 2;
  if (e.guard === 'south') e.ang = -Math.PI / 2;
  return e;
}
function mkDog(d) {
  return { id: nextId++, kind: 'dog', sid: d.sid, fac: 'mutant', name: 'Слепой пёс', pack: d.pack, x: d.x * T, y: d.y * T, r: 10, hp: 38, maxhp: 38,
    ang: rnd(-3, 3), alive: 1, cool: 0, think: Math.random() * 0.3, home: { x: d.x * T, y: d.y * T }, kx: 0, ky: 0, flash: 0, step: 0, idleT: rnd(1, 4), barkT: rnd(3, 12) };
}
function mkPlayer() {
  return { id: 0, kind: 'human', fac: 'player', name: 'Меченый', x: S.x, y: S.y, r: 11, hp: S.hp, maxhp: 100, ang: -Math.PI / 2, alive: 1,
    cool: 0, reload: 0, bloom: 0, st: 100, kx: 0, ky: 0, flash: 0, step: 0, medT: 0, seed: 7, rank: 0 };
}
function spawnWorld() {
  ents = []; decals = []; parts = []; tracers = []; flashes = []; bolts = []; nades = []; crows = [];
  for (let i = objs.length - 1; i >= 0; i--) if (!objs[i].static) objs.splice(i, 1);
  objs.push(...retiredFixedCrates); retiredFixedCrates.length = 0;
  objs.forEach(o => { if (o.stash) restoreContainer(o); });
  armyAngry = !!S.flags.armyAngry;
  const bar = objs.find(o => o.key === 'bar'); if (bar) { bar.solid = S.flags.bridgePaid ? 0 : 1; buildGrids(); }
  S.q2 = S.q2 || { fox: 0, tolik: 0 };
  P = mkPlayer(); ents.push(P);
  NPCDEF.forEach(d => {
    if (S.dead[d.sid]) return;
    const e = mkHuman(d);
    if (d.sid === 'shust' && S.flags.shustFree) { const p = locPt('village', 'shust'); e.captive = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'tolik' && S.flags.tolikUp) { const p = locPt('village', 'tolik'); e.captive = e.wounded = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'fox' && S.flags.foxUp) { e.captive = e.wounded = 0; }
    if ((d.sid === 'petr' || d.sid === 'petr2') && S.flags.atpClear) { const p = locPt('atp', d.sid); e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (S.flags.angry && S.flags.angry[d.sid]) e.angry = 1;
    ents.push(e);
  });
  DOGDEF.forEach(d => { if (!S.dead[d.sid]) ents.push(mkDog(d)); });
  rcSpawnObjs();
  boarDefs().forEach(d => { if (!S.dead[d.sid]) ents.push(mkBoar(Object.assign({ pack: 'boar' }, d))); });
  for(const e of ents) if(e!==P && e.home) clearPropSpawn(e);
  anoms = ANOM0.map(a => Object.assign({}, a, { cd: 0, reveal: 0, fx: 0, arc: 0 }));
  arts = ARTS0.filter(a => !S.flags['art_' + a.key]).map(a => Object.assign({}, a));
}
const byS = sid => ents.find(e => e.sid === sid && e.alive);

/* ===================== отношения ===================== */
function hostile(a, b) {
  if (a === b || !a.alive || !b.alive || a.captive || b.captive) return false;
  const fa = a.fac, fb = b.fac;
  if (fa === 'trader' || fb === 'trader') return false;
  if (fa === 'mutant' || fb === 'mutant') return fa !== fb;
  if (fa === fb) return false;
  const pair = (x, y) => (fa === x && fb === y) || (fa === y && fb === x);
  if (pair('bandit', 'loner') || pair('bandit', 'player') || pair('bandit', 'army')) return true;
  if (pair('army', 'player')) { const s = fa === 'army' ? a : b; return armyAngry || !!s.angry; }
  if (pair('loner', 'player')) { const l = fa === 'loner' ? a : b; return S.rep <= -30 || !!l.angry; }
  return false;
}
function playerRelation(e) {
  if (hostile(e, P)) return 'enemy';
  if (e.fac !== 'loner') return 'neutral';
  if (e.follow || (e.uid && S.flags['sosFriend_' + e.uid])) return 'friend';
  if ((e.sid === 'tolik' && S.flags.tolikUp) || (e.sid === 'fox' && S.flags.foxUp) ||
      (e.sid === 'shust' && S.flags.shustFree) || (e.sid === 'wolf' && S.q.pack === 3)) return 'friend';
  return 'neutral';
}
function attWord(e) {
  const rel = playerRelation(e);
  if (rel === 'enemy') return 'враг';
  if (rel === 'friend') return 'друг';
  return e.fac === 'loner' && S.rep < 0 ? 'не доверяет' : 'нейтрал';
}
function anger(e) {
  if (e.fac === 'loner' && !e.angry) {
    ents.forEach(o => { if (o.fac === 'loner' && o.alive && !o.captive && dE(o, e) < 450 && los(o.x, o.y, e.x, e.y)) { o.angry = 1; markAngry(o); } });
    e.angry = 1; markAngry(e);
    S.rep -= 10;
    msg('Ты напал на своего. Одиночки этого не простят.', 'bad');
  }
  if (e.fac === 'army' && !armyAngry) { armyAngry = true; S.flags.armyAngry = 1; msg('Военные открывают огонь!', 'bad'); }
}
function markAngry(e) {
  const id = e.sid || e.uid;
  if (id) { S.flags.angry = S.flags.angry || {}; S.flags.angry[id] = 1; }
}

/* ===================== движение и столкновения ===================== */
function pushOut(e, rx, ry, rw, rh) {
  const nx = clamp(e.x, rx, rx + rw), ny = clamp(e.y, ry, ry + rh);
  let dx = e.x - nx, dy = e.y - ny; const d2 = dx * dx + dy * dy;
  if (d2 >= e.r * e.r) return;
  if (d2 > 0.0001) { const d = Math.sqrt(d2); e.x += dx / d * (e.r - d); e.y += dy / d * (e.r - d); }
  else {
    const l = e.x - rx, r = rx + rw - e.x, t = e.y - ry, b = ry + rh - e.y, m = Math.min(l, r, t, b);
    if (m === l) e.x = rx - e.r; else if (m === r) e.x = rx + rw + e.r; else if (m === t) e.y = ry - e.r; else e.y = ry + rh + e.r;
  }
}
function collide(e) {
  const x0 = Math.floor((e.x - e.r) / T), x1 = Math.floor((e.x + e.r) / T), y0 = Math.floor((e.y - e.r) / T), y1 = Math.floor((e.y + e.r) / T);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!inb(x, y) || SOLID[map[y * MW + x]]) pushOut(e, x * T, y * T, T, T);
  const hop = e.jumpT > 0;   // в прыжке низкие препятствия не держат
  for (let i = 0; i < objs.length; i++) { const o = objs[i]; if (o.solid && !(hop && LOW_K.has(o.k)) && e.x + e.r > o.x && e.x - e.r < o.x + o.w && e.y + e.r > o.y && e.y - e.r < o.y + o.h) pushOut(e, o.x, o.y, o.w, o.h); }
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const nearby=propCells.get(y*MW+x);
    if(nearby) for(const p of nearby) touchesProp(p,e,true);
  }
  e.x = clamp(e.x, e.r, WW - e.r); e.y = clamp(e.y, e.r, WH - e.r);
}
function moveE(e, dx, dy) { e.x += dx; e.y += dy; collide(e); collide(e); }
const swampAt = (x, y) => tAt(Math.floor(x / T), Math.floor(y / T)) === SW;
function anomNear(x, y, pad) { for (const a of anoms) if (dst(x, y, a.x, a.y) < a.r + pad) return a; return null; }
function steer(e, tx, ty, speed, dt) {
  let a = Math.atan2(ty - e.y, tx - e.x);
  const sp = speed * (swampAt(e.x, e.y) ? 0.55 : 1) * dt;
  for (const off of [0, 0.6, -0.6, 1.2, -1.2]) {
    const nx = e.x + Math.cos(a + off) * sp * 3, ny = e.y + Math.sin(a + off) * sp * 3;
    if (!anomNear(nx, ny, e.r + 4)) { a += off; break; }
  }
  const ox = e.x, oy = e.y;
  moveE(e, Math.cos(a) * sp, Math.sin(a) * sp);
  const moved = dst(ox, oy, e.x, e.y);
  e.step += moved;
  e.stuck = moved < sp * 0.3 ? (e.stuck || 0) + dt : 0;
  return moved;
}
function goTo(e, tx, ty, speed, dt) {
  if (e.path && e.goal && dst(e.goal.x, e.goal.y, tx, ty) > 48) e.path = null;
  if (!e.path) {
    if (los(e.x, e.y, tx, ty) && dst(e.x, e.y, tx, ty) < 260 && !(e.stuck > 0.6)) {
      steer(e, tx, ty, speed, dt); e.ang += angD(e.ang, Math.atan2(ty - e.y, tx - e.x)) * Math.min(1, dt * 6);
      if (e.stuck > 0.6) { e.path = findPath(e.x, e.y, tx, ty); e.pi = 0; e.goal = { x: tx, y: ty }; e.stuck = 0; }
      return dst(e.x, e.y, tx, ty);
    }
    e.path = findPath(e.x, e.y, tx, ty); e.pi = 0; e.goal = { x: tx, y: ty };
    if (!e.path) { steer(e, tx, ty, speed, dt); return dst(e.x, e.y, tx, ty); }
  }
  const p = e.path[e.pi];
  if (!p) { e.path = null; steer(e, tx, ty, speed, dt); return dst(e.x, e.y, tx, ty); }
  steer(e, p.x, p.y, speed, dt);
  e.ang += angD(e.ang, Math.atan2(p.y - e.y, p.x - e.x)) * Math.min(1, dt * 6);
  if (dst(e.x, e.y, p.x, p.y) < 12) { e.pi++; if (e.pi >= e.path.length) e.path = null; }
  if (e.stuck > 1.5) { e.path = null; e.stuck = 0; }
  return dst(e.x, e.y, tx, ty);
}

/* ===================== стрельба ===================== */
/* ===== баллистика (G7): расчёт не зависит от графики =====
   Луч всегда идёт из центра стрелка; препятствия проверяются непрерывно по клеткам (DDA) с нулевой точки,
   поэтому ствол, «высунутый» за стену, не переносит начало расчёта за неё. Дальность считается от
   условного дула BALL_OFF = r + 8 (прежняя процедурная точка), одинаково при любых выключателях графики.
   Визуальное дуло (muzzlePoint) используется только для трассера и вспышки. */
function rayWall(sx, sy, ca, sa, maxT) {
  let tx = Math.floor(sx / T), ty = Math.floor(sy / T);
  if (!inb(tx, ty) || opq[ty * MW + tx]) return 0;
  const stX = ca > 0 ? 1 : -1, stY = sa > 0 ? 1 : -1;
  let tMX = ca !== 0 ? ((tx + (ca > 0 ? 1 : 0)) * T - sx) / ca : Infinity, tMY = sa !== 0 ? ((ty + (sa > 0 ? 1 : 0)) * T - sy) / sa : Infinity;
  const dX = ca !== 0 ? T / Math.abs(ca) : Infinity, dY = sa !== 0 ? T / Math.abs(sa) : Infinity;
  for (;;) {
    let t;
    if (tMX < tMY) { tx += stX; t = tMX; tMX += dX; } else { ty += stY; t = tMY; tMY += dY; }   // равенство — угол клетки: проверяются обе соседние
    if (t > maxT) return maxT;
    if (!inb(tx, ty) || opq[ty * MW + tx]) return t;
  }
}
/* пересечение луча (из точки внутри/снаружи) с кругом: вход ≥0 либо 0, если начало внутри; null — мимо */
function rayCircle(sx, sy, ca, sa, cx, cy, rr) {
  const vx = cx - sx, vy = cy - sy, tc = vx * ca + vy * sa, d2 = vx * vx + vy * vy - tc * tc;
  if (d2 >= rr * rr) return null;
  const th = Math.sqrt(rr * rr - d2);
  if (tc + th < 0) return null;
  return Math.max(0, tc - th);
}
// Высота забора имеет значение в пределах полутора клеток от присевшей фигуры.
const FENCE_REACH = 1.5 * T;
function rayBox(f,x,y,dx,dy,near,far) {
    // Интервал луча внутри каждой из двух осевых полос прямоугольника.
    let enter = near, exit = far;
    if (Math.abs(dx) < 1e-9) {
      if (x < f.x || x > f.x + f.w) return Infinity;
    } else {
      const a = (f.x - x) / dx, b = (f.x + f.w - x) / dx;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < f.y || y > f.y + f.h) return Infinity;
    } else {
      const a = (f.y - y) / dy, b = (f.y + f.h - y) / dy;
      enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
    }
    return enter <= exit ? enter : Infinity;
}
function rayFence(x, y, dx, dy, near, far) {
  let hit = Infinity;
  for (const f of fences) {
    hit = Math.min(hit,rayBox(f,x,y,dx,dy,near,far));
  }
  return hit;
}
function seesActor(observer, target) {
  if (!los(observer.x, observer.y, target.x, target.y)) return false;
  if (!target.crouch) return true;
  const dx = observer.x - target.x, dy = observer.y - target.y, d = Math.hypot(dx, dy);
  return !d || rayFence(target.x, target.y, dx / d, dy / d, 0, Math.min(d, FENCE_REACH)) === Infinity;
}
function shotBarrier(sh, ca, sa, reach) {
  const wall = rayWall(sh.x, sh.y, ca, sa, reach);
  return sh.crouch ? Math.min(wall, rayFence(sh.x, sh.y, ca, sa, 0, Math.min(wall, FENCE_REACH))) : wall;
}
const ballOff = sh => (sh.r || 11) + 8;
function shotTrace(sh, a, W) {   // чистая функция исхода одного луча: {t, best, wall}
  const ca = Math.cos(a), sa = Math.sin(a), reach = W.range + ballOff(sh);
  const wallT = shotBarrier(sh, ca, sa, reach);
  let best = null, bt = wallT;
  const passFriends = sh === P && combatNear();
  for (const e of ents) {
    if (!e.alive || e === sh) continue;
    if (passFriends && !hostile(P, e)) continue;
    const t = rayCircle(sh.x, sh.y, ca, sa, e.x, e.y, e.r + (e.captive ? -4 : 0));
    if (t !== null && t <= bt) { best = e; bt = t; }
  }
  if (best && best.crouch) {
    const centerT = (best.x - sh.x) * ca + (best.y - sh.y) * sa;
    const fence = rayFence(sh.x, sh.y, ca, sa, Math.max(0, centerT - FENCE_REACH), bt);
    if (fence <= bt) { bt = fence; best = null; }
  }
  const box=containerOnRay(sh,ca,sa,bt);
  if(box.o) return {t:box.d,best:null,box:box.o,wall:true,ca,sa};
  return { t: bt, best: best, wall: !best && bt < reach, ca: ca, sa: sa };
}
function fire(sh, ang, W, spread) {
  const mz = muzzlePoint(sh, ang), n = W.pellets || 1;
  const ca0 = Math.cos(ang), sa0 = Math.sin(ang), mzT = Math.max(0, (mz.x - sh.x) * ca0 + (mz.y - sh.y) * sa0);
  const w0 = shotBarrier(sh, ca0, sa0, mzT + 1), blocked = w0 < mzT;   // ствол упёрся в стену: вспышка у стены, не за ней
  const fx = blocked ? sh.x + ca0 * Math.max(0, w0 - 1) : mz.x, fy = blocked ? sh.y + sa0 * Math.max(0, w0 - 1) : mz.y;
  for (let k = 0; k < n; k++) {
    const a = ang + (Math.random() - 0.5) * 2 * spread, r = shotTrace(sh, a, W), ca = r.ca, sa = r.sa, best = r.best, bt = r.t;
    const ex = sh.x + ca * bt, ey = sh.y + sa * bt;
    if (bt > mzT + 0.5 && !blocked) tracers.push({ x0: mz.x, y0: mz.y, x1: ex, y1: ey, life: 0.07, w: n > 1 ? 1 : 1.6 });
    if(r.box && sh===P && r.box.k==='crate'){ breakCrate(r.box); continue; }
    if (best && coverBlocks(best, sh.x, sh.y) && chance(best === P ? 0.6 : 0.5)) {
      const cx = best.x - ca * 22, cy = best.y - sa * 22;
      if (tracers.length && tracers[tracers.length - 1].x1 === ex) { tracers[tracers.length - 1].x1 = cx; tracers[tracers.length - 1].y1 = cy; }
      for (let i = 0; i < 4; i++) parts.push({ x: cx, y: cy, vx: rnd(-90, 90), vy: rnd(-90, 90), life: rnd(0.15, 0.3), c: '#d8c9a0', s: 1.6 });
    } else if (best) {
      const fall = n > 1 ? clamp(1.3 - Math.max(0, bt - ballOff(sh)) / W.range, 0.3, 1) : 1;
      if (sh === P) { P.hitT = 0.18; if (best.hp - W.dmg * fall <= 0) P.killT = 0.4; }
      hurt(best, W.dmg * fall * rnd(0.85, 1.15), sh, a);
    } else if (r.wall) for (let i = 0; i < 3; i++) parts.push({ x: ex - ca * 1.5, y: ey - sa * 1.5, vx: rnd(-80, 80) - ca * 60, vy: rnd(-80, 80) - sa * 60, life: rnd(0.15, 0.3), c: '#e8d9a0', s: 1.5 });
  }
  flashes.push({ x: fx, y: fy, a: ang, life: 0.06 });
  play(W.snd || 'p', sh.x, sh.y);
  if (sh === P && !W.pellets) play('shell', sh.x, sh.y);
  shake(sh === P ? (W.pellets ? 4 : 1.5) : 0);
  ents.forEach(e => {
    if (e === sh || !e.alive || e === P || e.captive) return;
    const d = dE(e, sh);
    if (d < 620 && hostile(e, sh)) { e.lastSeen = { x: sh.x, y: sh.y }; e.mem = Math.max(e.mem || 0, 5); if (sh === P) e.aw = Math.max(e.aw || 0, d < 320 ? 1 : 0.75); }
  });
}
/* бой рядом: есть враг игрока ближе 650 px, который его видит или видим им */
function combatNear() { for (const e of ents) if (e.alive && e !== P && hostile(P, e) && dE(e, P) < 650) { P.combatT = 3; return true; } return (P.combatT || 0) > 0; }
/* укрытие: присевший за препятствием (стена, дерево, ящик, машина) в стороне стрелка получает часть попаданий в укрытие */
function coverBlocks(t, sx, sy) {
  if (!(t.crouch || t.inCover)) return false;
  const a = Math.atan2(sy - t.y, sx - t.x);
  for (const d of [16, 26, 36]) if (solidPx(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, true)) return true;
  return false;
}
/* линия огня свободна от своих (для НПС) */
function lineClear(sh, t) {
  const a = Math.atan2(t.y - sh.y, t.x - sh.x), ca = Math.cos(a), sa = Math.sin(a), L = dE(sh, t);
  for (const e of ents) {
    if (!e.alive || e === sh || e === t || hostile(sh, e)) continue;
    const vx = e.x - sh.x, vy = e.y - sh.y, k = vx * ca + vy * sa;
    if (k < 0 || k > L) continue;
    const px = vx - ca * k, py = vy - sa * k;
    if (px * px + py * py < (e.r + 6) ** 2) return false;
  }
  return true;
}
function melee(sh, W) {
  let hit = null, bd = 1e9;
  ents.forEach(e => {
    if (!e.alive || e === sh) return;
    const d = dE(e, sh);
    if (d < W.range + e.r + sh.r && Math.abs(angD(sh.ang, Math.atan2(e.y - sh.y, e.x - sh.x))) < 0.9 && d < bd) { hit = e; bd = d; }
  });
  play('knife', sh.x, sh.y);
  if(sh===P){
    const ca=Math.cos(sh.ang),sa=Math.sin(sh.ang);
    const reach=Math.min(W.range+sh.r, hit?Math.max(0,bd-hit.r):Infinity);
    const box=containerOnRay(sh,ca,sa,shotBarrier(sh,ca,sa,reach));
    if(box.o){breakCrate(box.o);return;}
  }
  const sneak = hit && sh === P && hit.kind === 'human' && hit.tgt !== P && (hit.aw || 0) < 1;
  if (hit) hurt(hit, W.dmg * rnd(0.9, 1.1) * (sneak ? 3 : 1), sh, sh.ang);
}
function hurt(e, dmg, src, ang) {
  if (!e.alive) return;
  if (src && (src === P || src.follow)) {
    e.hitByP = 1;
    if (e.sosFoe && S.sos && S.sos.act && S.sos.act.id === e.sosFoe) S.flags.sosAssist = e.sosFoe;
  }
  if (e === P) {
    dmg *= 1 - def(); hurtFlash = Math.min(0.6, hurtFlash + 0.35); play('hurt'); shake(4);
    if (src && src.x !== undefined) { HURTDIR.push({ a: Math.atan2(src.y - P.y, src.x - P.x), life: 1.2 }); if (HURTDIR.length > 6) HURTDIR.shift(); }
    if (src && src.alive !== undefined && S.bleed < 3 && chance(src.kind === 'dog' ? 0.4 : 0.3 - def())) { S.bleed++; msg(S.bleed > 1 ? 'Сильное кровотечение! Перевяжись.' : 'Кровотечение. Бинт его остановит.', 'bad'); }
  }
  e.hp -= dmg; e.flash = 0.12;
  if (e !== P && e.kind === 'human' && e.hp > 0 && chance(0.35)) callout(e, 'hurt');
  if (ang !== undefined) { e.kx += Math.cos(ang) * 60; e.ky += Math.sin(ang) * 60; }
  const n = Math.min(6, 2 + Math.floor(dmg / 8));
  for (let i = 0; i < n; i++) parts.push({ x: e.x, y: e.y, vx: Math.cos((ang || 0) + rnd(-0.6, 0.6)) * rnd(40, 160), vy: Math.sin((ang || 0) + rnd(-0.6, 0.6)) * rnd(40, 160), life: rnd(0.2, 0.4), c: '#7a1d14', s: 2, blood: 1 });
  if (e !== P && src && src.alive !== undefined) {
    if (src === P && !hostile(e, P) && (e.fac === 'loner' || e.fac === 'army')) anger(e);
    if (hostile(e, src)) { e.tgt = src; e.lastSeen = { x: src.x, y: src.y }; e.mem = 6; e.react = Math.min(e.react, 0.15); }
  }
  if (e.hp <= 0) kill(e, src);
}
function kill(e, src) {
  e.alive = 0; e.hp = 0;
  if (e === P) { deathT = 1.6; play('hurt'); return; }
  if (e.sid) S.dead[e.sid] = 1;
  ents.forEach(o => { if (o.alive && o !== e && o.kind === 'human' && o.fac === e.fac && dE(o, e) < 420) o.morale = (o.morale === undefined ? 1 : o.morale) - 0.3; });
  decals.push({ x: e.x + rnd(-4, 4), y: e.y + rnd(-4, 4), r: rnd(10, 16), a: 0.75 });
  if (decals.length > 140) decals.shift();
  dropBody(e);
  const byPlayer = src === P;
  if (byPlayer) {
    if (e.kind !== 'human') S.stats.kM++; else S.stats.kS++;
    if (e.fac === 'loner') { S.rep -= 35; msg('Убит одиночка. Слух разойдётся по всему Кордону.', 'bad'); }
    if (e.fac === 'bandit') S.rep += 3;
  } else if (e.fac === 'loner' && (dE(e, P) > 380 || !los(P.x, P.y, e.x, e.y))) {
    const why = src === 'blow' ? 'выброс' : src === 'anom' ? 'аномалия' : src && src.fac === 'mutant' ? 'слепые псы' : src && src.fac === 'bandit' ? 'бандиты' : src && src.fac === 'army' ? 'военные' : 'неизвестно';
    bulletin('Погиб сталкер ' + e.name + '. Причина: ' + why + '.');
  } else if (e.fac === 'bandit' && src && src.fac === 'loner' && dE(e, P) > 380) {
    bulletin('Одиночки убили бандита по кличке ' + e.name + '.');
  }
  if (e.sid === 'tolik' && S.q2.tolik !== 2) S.q2.tolik = 3;
  if (e.sid === 'fox' && S.q2.fox > 0 && S.q2.fox < 4) { S.q2.fox = 4; S.flags.foxFail = 1; bulletin('Лис погиб. Задание провалено.'); }
  if (e.sid === 'shust' && S.q.flash > 0 && S.q.flash < 3) { S.q.flash = 4; S.flags.flashFail = 1; bulletin('Шустрый погиб. Задание «Флешка Шустрого» провалено.'); }
  checkQuests(); plusKill(e, src);
}
function dropBody(e) {
  const loot = {};
  if (e.kind === 'dog') { if (chance(0.55)) loot.tail = 1; }
  else if (e.kind === 'boar') { if (chance(0.7)) loot.hoof = 1; }
  else if (e.kind === 'sucker') { loot.tentacle = 1; }
  else {
    if (e.money) loot.money = e.money;
    Object.keys(e.inv || {}).forEach(k => loot[k] = e.inv[k]);
    const W = WP[e.wpn];
    if (W && W.ammo) { loot[W.ammo] = (loot[W.ammo] || 0) + (W.ammo === 'a545' ? ri(15, 35) : W.ammo === 'a12' ? ri(3, 8) : ri(6, 14)); loot[e.wpn] = 1; }
    if (e.fac === 'army' && chance(0.3)) loot.grenade = 1;
    if (e.sid === 'boss') { loot.ar_bandit = 1; loot.grenade = 2; }
  }
  if (e.kind === 'human' && (e.fac === 'loner' || e.fac === 'bandit') && chance(0.3)) loot.__tip = 1;
  const body = { k: 'body', x: e.x, y: e.y, ang: e.ang, fac: e.fac, kind: e.kind, name: e.name, seed: e.seed || 1, loot: loot, t: S.min };
  // Младший остаток визуального seed хранит расцветку и после загрузки тела.
  if (e.fac === 'loner' && e.kind === 'human') body.seed += jacketIndex(e) - body.seed % JACKET_COLORS.length;
  objs.push(body); g7Fresh(body);   // визуальный переход падения (только в памяти, не в сейве)
  const bodies = objs.filter(o => o.k === 'body');
  if (bodies.length > 30) objs.splice(objs.indexOf(bodies[0]), 1);
}

/* ===================== ИИ ===================== */
/* стелс: насколько игрока видно (1 — обычно) и на каком расстоянии слышно его шаги */
function pVis() {
  let v = 1;
  const moving = Math.hypot(IN.moveX, IN.moveY) > 0.1 || P.jumpT > 0;
  if (P.crouch) v *= 0.55;
  if (!moving) v *= 0.75; else if (P.sprinting) v *= 1.25;
  if (darkness() > 0.3) v *= S.torch === false ? 0.6 : 1.1;   // ночью фонарь выдаёт, без него замечают на 40% позже
  return v;
}
function pNoise() {
  if (P.jumpT > 0) return 150;
  const m = Math.hypot(IN.moveX, IN.moveY); if (m < 0.1) return 0;
  return P.crouch ? 34 : P.sprinting ? 175 : 95;
}
/* враг ещё не в бою с игроком: копит подозрение (0..1). Видит только перед собой (~115°), сзади — только на слух */
function stealthTick(e, dt) {
  if (!P.alive || !hostile(e, P) || e.tgt === P || P.cloak > 0.7) { if (e.tgt === P) e.aw = 1; return; }
  const d = dE(e, P), aP = Math.atan2(P.y - e.y, P.x - e.x), range = sight(e) * pVis();
  let gain = 0;
  if (d < range && Math.abs(angD(e.ang, aP)) < 1.0 && seesActor(e, P)) gain = 0.45 + 2.4 * (1 - d / range);
  const nz = pNoise(); if (nz && d < nz) gain = Math.max(gain, 0.5 + 1.5 * (1 - d / nz));
  const was = e.aw || 0;
  e.aw = gain ? Math.min(1, was + gain * dt) : Math.max(0, was - 0.25 * dt);
  if (e.aw > 0.4 && !e.sit) e.ang += angD(e.ang, aP) * Math.min(1, dt * 2.2);   // насторожился — поворачивается на звук
  if (e.aw > 0.4 && was <= 0.4 && chance(0.7)) sayLine(e, e.fac === 'army' ? 'Стой, кто там?' : e.fac === 'bandit' ? 'Э, кто там шуршит?' : 'Кто здесь?');
  if (e.aw >= 1 && was < 1) ents.forEach(o => { if (o !== e && o.alive && o.fac === e.fac && o.tgt !== P && dE(o, e) < 220) o.aw = Math.max(o.aw || 0, 0.7); });   // поднял своих
}
function sight(e) { return ((night() ? 240 : 400) + (e.fac === 'army' ? 40 : 0)) * (1 - WX.fog * 0.45 - WX.rain * 0.12); }
function findTarget(e) {
  let best = null, bd = 1e9;
  const sr = sight(e);
  for (const o of ents) {
    if (!o.alive || o === e || !hostile(e, o) || o.cloak > 0.7) continue;
    const d = dE(e, o);
    if (o === P && e.kind === 'human' && e.tgt !== P) { if ((e.aw || 0) < 1 || d > sr * 1.2 || d >= bd) continue; }   // игрока сначала надо заметить
    else if (d > sr || d >= bd) continue;
    if (!seesActor(e, o)) continue;
    best = o; bd = d;
  }
  return best;
}
function aiHuman(e, dt) {
  if (SID_SHOP && e.sid === 'sid') {
    e.ang = Math.PI / 2;
    e.deskTime = (e.deskTime || 0) + dt;
    const visiting = inBunker(P.x, P.y) && dE(e, P) < 120;
    e.deskLook = lerp(e.deskLook || 0, visiting ? 1 : 0, Math.min(1, dt * 3));
    return;
  }
  if (e.captive) return;
  e.cool -= dt; e.think -= dt; stealthTick(e, dt);
  const W = WP[e.wpn];
  if (e.reload > 0) { e.reload -= dt; if (e.reload <= 0) e.mag = W.mag; }
  if (e.think <= 0) {
    e.think = 0.25 + Math.random() * 0.15;
    const t = findTarget(e);
    if (t && t !== e.tgt) { e.tgt = t; e.react = rnd(0.35, 0.8) - (e.rank || 0) * 0.08; if (chance(0.6)) callout(e, 'combat'); }
    if (!t && e.tgt && (!e.tgt.alive || !hostile(e, e.tgt))) e.tgt = null;
    // охрана южного блокпоста
    if (e.guard === 'south' && P.alive && dE(e, P) < 300 && seesActor(e, P)) {
      const d = dE(e, P);
      if (d < 150 && !e.angry && !armyAngry) { e.angry = 1; msg('Часовой: — Огонь по нарушителю!', 'bad'); }
      else if (d < 300 && warnT <= 0 && !e.angry) { warnT = 8; msg('Часовой: — Стой! Назад, стреляю без предупреждения!', 'bad'); }
    }
  }
  const t = e.tgt;
  if (t && t.alive && hostile(e, t)) { combatHuman(e, t, W, dt); return; }
  e.inCover = 0; e.crouch = 0; e.role = null; e.cover = null;
  e.tgt = null;
  e.react = 0.5;
  if (e.campRise != null) {
    const target = e.sit ? 0 : 1;
    e.campRise = clamp(e.campRise + (e.sit ? -dt : dt) / 0.82, 0, 1);
    if (e.sit) {
      const towardFire = Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x);
      e.ang += angD(e.ang, towardFire) * Math.min(1, dt * 5);
    } else if (e.campRise > 0.72 && (e.trip || e.follow)) {
      // Перенёс вес на стопу: первые сантиметры шага идут по реальному пути.
      const stride = (e.campRise - 0.72) / 0.28;
      idleHuman(e, dt * stride);
    }
    if (e.campRise === target) e.campRise = null;
    return;
  }
  if (e.mem > 0 && e.lastSeen) {
    e.mem -= dt;
    e.crouch = 0; if (goTo(e, e.lastSeen.x, e.lastSeen.y, 68, dt) < 20) e.mem = 0;
    return;
  }
  idleHuman(e, dt);
}
/* ===== тактика в бою ===== */
/* роль в группе: один давит, один обходит, остальные держат позицию из укрытия */
function pickRole(e, t) {
  const mates = ents.filter(o => o.alive && o !== e && o.kind === 'human' && o.fac === e.fac && o.tgt === t);
  const has = r => mates.some(o => o.role === r);
  if (e.guard) return 'hold';
  if (WP[e.wpn].pellets && !has('push')) return 'push';
  if (mates.length >= 1 && !has('flank')) return 'flank';
  if (!has('push') && mates.length >= 2) return 'push';
  return 'hold';
}
/* укрытие: проходимая клетка рядом с препятствием, которое стоит между ней и целью */
function findCover(e, t, minD, maxD) {
  const ex = Math.floor(e.x / T), ey = Math.floor(e.y / T);
  let best = null, bs = 1e9;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const x = ex + dx, y = ey + dy;
    if (!inb(x, y) || !nav[y * MW + x]) continue;
    const cx = x * T + 16, cy = y * T + 16;
    const dt2 = dst(cx, cy, t.x, t.y); if (dt2 < minD || dt2 > maxD) continue;
    const a = Math.atan2(t.y - cy, t.x - cx);
    let shield = false;
    for (const d of [20, 30]) if (solidPx(cx + Math.cos(a) * d, cy + Math.sin(a) * d)) { shield = true; break; }
    if (!shield) continue;
    if (ents.some(o => o !== e && o.alive && o.cover && Math.abs(o.cover.x - cx) < 20 && Math.abs(o.cover.y - cy) < 20)) continue;
    const sc = dst(cx, cy, e.x, e.y) + Math.abs(dt2 - (minD + maxD) / 2) * 0.4;
    if (sc < bs) { bs = sc; best = { x: cx, y: cy }; }
  }
  return best;
}
function npcHeal(e) {
  const id = e.inv.medkit ? 'medkit' : e.inv.bandage ? 'bandage' : null;
  if (!id) return false;
  e.inv[id]--; if (!e.inv[id]) delete e.inv[id];
  e.hp = Math.min(e.maxhp, e.hp + (id === 'medkit' ? 45 : 18));
  return true;
}
function npcGrenade(e, x, y) {
  e.nade = 0;
  const a = Math.atan2(y - e.y, x - e.x), d = Math.min(260, dst(e.x, e.y, x, y));
  nades.push({ x: e.x, y: e.y, vx: Math.cos(a) * d * 1.25, vy: Math.sin(a) * d * 1.25, t: 1.6, z: 0, vz: 160, owner: e });
  callout(e, 'nade', true);
  if (dst(x, y, P.x, P.y) < 300) msg('Граната! Уходи с места!', 'bad');
}
function combatHuman(e, t, W, dt) {
  e.sit = 0; e.campRise = null; e.trip = null;
  const d = dE(e, t), see = seesActor(e, t);
  if (see) { e.lastSeen = { x: t.x, y: t.y }; e.mem = 8; e.react -= dt; e.unseen = 0; }
  else { e.mem -= dt; e.unseen = (e.unseen || 0) + dt; }
  const want = Math.atan2(t.y - e.y, t.x - e.x);
  if (!e.role) { e.role = pickRole(e, t); e.morale = e.morale === undefined ? 1 : e.morale; if (e.nade === undefined) e.nade = (e.fac === 'army' ? 0.6 : e.fac === 'bandit' ? 0.35 : 0.2) > Math.random() ? 1 : 0; }
  e.tacT = (e.tacT || 0) - dt;
  // бегство при потере духа
  if (e.morale < 0.35 && e.hp < e.maxhp * 0.5 && !e.guard) {
    if (!e.routT) { e.routT = rnd(5, 8); callout(e, 'hurt', true); }
    e.routT -= dt; e.crouch = 0;
    steer(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 128, dt);
    if (e.routT <= 0) { e.morale = 0.6; e.routT = 0; }
    return;
  }
  // ранен: отходит в укрытие и лечится
  if (e.hp < e.maxhp * 0.35 && (e.inv.medkit || e.inv.bandage) && !e.healing) { e.healing = 1; e.cover = findCover(e, t, 200, 420); }
  if (e.healing) {
    if (e.cover && goTo(e, e.cover.x, e.cover.y, 118, dt) > 10) { e.crouch = 0; }
    else { e.crouch = 1; e.inCover = 1; e.healT = (e.healT || 1.6) - dt; if (e.healT <= 0) { npcHeal(e); e.healing = 0; e.healT = 0; e.cover = null; } }
    return;
  }
  // цель не видна
  if (!see) {
    e.crouch = 0; e.inCover = 0;
    if (e.nade && e.unseen > 2.5 && e.lastSeen && dst(e.x, e.y, e.lastSeen.x, e.lastSeen.y) < 280 && dst(e.x, e.y, e.lastSeen.x, e.lastSeen.y) > 90 && chance(dt * 0.8)) { npcGrenade(e, e.lastSeen.x, e.lastSeen.y); return; }
    if (e.lastSeen) goTo(e, e.lastSeen.x, e.lastSeen.y, e.role === 'push' ? 100 : 72, dt);
    if (e.mem <= 0) { e.tgt = null; e.role = null; }
    return;
  }
  e.ang += angD(e.ang, want) * Math.min(1, dt * 7);
  const pref = W.pref || 20;
  // движение по роли
  if (W.melee) { e.crouch = 0; steer(e, t.x, t.y, 110, dt); }
  else if (e.guard) { e.crouch = d > 160 ? 1 : 0; }
  else if (e.role === 'hold') {
    if (!e.cover || e.tacT <= 0) { e.tacT = rnd(4, 8); e.cover = findCover(e, t, Math.max(120, pref - 60), pref + 160); }
    if (e.cover && dst(e.x, e.y, e.cover.x, e.cover.y) > 10) { e.crouch = 0; e.inCover = 0; goTo(e, e.cover.x, e.cover.y, 105, dt); }
    else { e.inCover = !!e.cover; e.crouch = e.cover ? (e.cool > W.rate * 1.2 ? 1 : 0) : 0; if (!e.cover && d < pref - 60) steer(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 70, dt); }
  } else if (e.role === 'flank') {
    if (!e.side) e.side = chance(0.5) ? 1 : -1;
    const fa = want + Math.PI + e.side * 1.25, fx = t.x + Math.cos(fa) * pref, fy = t.y + Math.sin(fa) * pref;
    e.crouch = 0; e.inCover = 0;
    if (goTo(e, fx, fy, 112, dt) < 30 || e.stuck > 1) { e.role = 'hold'; e.cover = null; }
  } else {
    e.crouch = 0; e.inCover = 0;
    if (d > pref) steer(e, t.x, t.y, 92, dt);
    else { e.strT = (e.strT || 0) - dt; if (e.strT <= 0) { e.strT = rnd(0.8, 1.8); e.side = chance(0.5) ? 1 : -1; } steer(e, e.x + Math.cos(want + e.side * 1.57) * 60, e.y + Math.sin(want + e.side * 1.57) * 60, 64, dt); }
  }
  // гранату в укрывшегося
  if (e.nade && t.crouch && d > 120 && d < 260 && chance(dt * 0.25)) { npcGrenade(e, t.x, t.y); return; }
  // огонь
  if (W.melee) { if (d < e.r + t.r + W.range && e.cool <= 0) { e.cool = W.rate * 1.6; melee(e, W); } return; }
  if (e.react <= 0 && e.cool <= 0 && e.reload <= 0 && d < W.range * 0.92 && Math.abs(angD(e.ang, want)) < 0.25) {
    if (!lineClear(e, t)) { e.side = -(e.side || 1); e.strT = 0; steer(e, e.x + Math.cos(want + 1.57 * e.side) * 60, e.y + Math.sin(want + 1.57 * e.side) * 60, 80, dt); return; }
    const moving = !e.inCover && e.role !== 'hold';
    const acc = { bandit: 0.12, loner: 0.1, army: 0.07 }[e.fac] - (e.rank || 0) * 0.015 + (night() && d > 200 ? 0.05 : 0) + (moving ? 0.04 : 0) + (t === P && P.crouch ? 0.03 : 0);
    e.crouch = 0;
    fire(e, e.ang, W, W.spread + acc);
    e.mag--;
    e.cool = W.auto ? (e.burst = (e.burst || 0) + 1) % 4 === 0 ? rnd(0.7, 1.3) : W.rate * 1.3 : W.rate * rnd(2.2, 3.4);
    if (e.mag <= 0) { e.reload = W.reload * 1.2; e.crouch = 1; if (chance(0.5)) callout(e, 'reload'); }
  }
}
// 0 — сидит у огня, 1 — полностью встал. При смене намерения продолжаем с текущей позы.
function setCampSeat(e, sitting) {
  if (!!e.sit === sitting) return;
  if (e.fac === 'loner' && e.fireRef && window.CORDON_G8_ON && G3_READY() && e.campRise == null)
    e.campRise = e.sit ? 0 : 1;
  e.sit = sitting ? 1 : 0;
}
function idleHuman(e, dt) {
  if (followTick(e, dt)) return;
  if (e.guard) {
    if (dE(e, e.home) > 8) goTo(e, e.home.x, e.home.y, 70, dt);
    else { e.ang += angD(e.ang, e.guard === 'south' ? -Math.PI / 2 : Math.PI / 2) * dt * 2; }
    return;
  }
  if (e.sit) {
    e.ang += angD(e.ang, Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x)) * dt * 2;
    if (e.fac === 'loner' && !e.named && e.fireRef === FIRE && chance(dt * 0.004)) { setCampSeat(e, false); startTrip(e); }
    return;
  }
  if (e.trip) {
    const tr = e.trip;
    if (tr.stage === 0) { if (goTo(e, tr.x, tr.y, 72, dt) < 30) { tr.stage = 1; tr.wait = rnd(10, 30); } }
    else if (tr.stage === 1) { tr.wait -= dt; e.idleT -= dt; if (e.idleT <= 0) { e.idleT = rnd(2, 5); e.ang += rnd(-1.5, 1.5); } if (tr.wait <= 0) tr.stage = 2; }
    else {
      const arrival = e.seat && e.fireRef === FIRE ? 7 : 24;
      if (goTo(e, e.home.x, e.home.y, 72, dt) < arrival) {
        e.trip = null;
        if (e.seat) setCampSeat(e, true);
      }
    }
    return;
  }
  const dh = dE(e, e.home);
  if (dh > 140) { goTo(e, e.home.x, e.home.y, 70, dt); return; }
  e.idleT -= dt;
  if (e.wander) {
    if (goTo(e, e.wander.x, e.wander.y, 50, dt) < 14 || e.stuck > 1) e.wander = null;
  } else if (e.idleT <= 0) {
    e.idleT = rnd(3, 8);
    if (!e.stay || chance(0.3)) {
      const a = rnd(0, 6.28), r = rnd(20, e.stay ? 50 : 110);
      const wx = e.home.x + Math.cos(a) * r, wy = e.home.y + Math.sin(a) * r;
      const ti = Math.floor(wy / T) * MW + Math.floor(wx / T);
      if (nav[ti] && los(e.x, e.y, wx, wy)) e.wander = { x: wx, y: wy };
    } else e.ang += rnd(-1.2, 1.2);
  }
  if (e.fac === 'loner' && !e.stay && !e.named && chance(dt * 0.003)) startTrip(e);
}
function startTrip(e) {
  const keys = Object.keys(POI).filter(k => k !== 'atp' || S.flags.atpClear);
  const p = POI[keys[ri(0, keys.length - 1)]];
  e.seat = e.seat || (dE(e, FIRE) < 110 ? 1 : 0);
  e.trip = { x: p.x + rnd(-30, 30), y: p.y + rnd(-30, 30), stage: 0 };
}
function aiDog(e, dt) {
  e.cool -= dt; e.think -= dt; e.barkT -= dt;
  if (e.think <= 0) {
    e.think = 0.3;
    let best = null, bd = 1e9;
    for (const o of ents) {
      if (!o.alive || o.fac === 'mutant' || o.captive) continue;
      const d = dE(e, o);
      const k = o === P ? clamp(pVis() * 1.1, 0.5, 1.2) : 1;
      if (d < (night() ? 320 : 280) * k && d < bd && (d < 150 * k || los(e.x, e.y, o.x, o.y))) { best = o; bd = d; }
    }
    if (best && !e.tgt) { ents.forEach(o => { if (o.kind === 'dog' && o.alive && o.pack === e.pack && !o.tgt && dE(o, e) < 220) o.tgt = best; }); }
    if (best) e.tgt = best;
    if (e.tgt && (!e.tgt.alive || dE(e, e.tgt) > 520)) e.tgt = null;
  }
  const t = e.tgt;
  if (t) {
    if (e.barkT <= 0) { e.barkT = rnd(2, 5); play('dog', e.x, e.y); }
    const want = Math.atan2(t.y - e.y, t.x - e.x), d = dE(e, t);
    e.ang += angD(e.ang, want) * Math.min(1, dt * 9);
    if (e.hp < e.maxhp * 0.35 && !e.fled) { e.fleeT = 2; e.fled = 1; }
    if (e.fleeT > 0) { e.fleeT -= dt; steer(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 170, dt); return; }
    if (d > e.r + t.r + 4) {
      if (los(e.x, e.y, t.x, t.y)) steer(e, t.x + Math.cos(e.id) * 6, t.y + Math.sin(e.id) * 6, 172, dt);
      else goTo(e, t.x, t.y, 160, dt);
    } else if (e.cool <= 0) {
      e.cool = rnd(0.7, 1.1);
      hurt(t, rnd(7, 13), e, want);
      e.kx -= Math.cos(want) * 140; e.ky -= Math.sin(want) * 140;
    }
    return;
  }
  e.idleT -= dt;
  if (dE(e, e.home) > 160) { goTo(e, e.home.x, e.home.y, 90, dt); return; }
  if (e.wander) { if (steer(e, e.wander.x, e.wander.y, 55, dt) < 0.2 || dst(e.x, e.y, e.wander.x, e.wander.y) < 10) e.wander = null; e.ang += angD(e.ang, Math.atan2((e.wander ? e.wander.y : e.y) - e.y, (e.wander ? e.wander.x : e.x) - e.x)) * dt * 5; }
  else if (e.idleT <= 0) { e.idleT = rnd(2, 6); const a = rnd(0, 6.28), r = rnd(20, 90); e.wander = { x: e.home.x + Math.cos(a) * r, y: e.home.y + Math.sin(a) * r }; }
}

/* ===================== задания ===================== */
function qTargets() {
  // у каждой цели qid — id задания из qList; HUD показывает цель отслеживаемого задания
  const out = [], q = S.q;
  const at = (qid, p, n) => out.push({ qid: qid, x: p.x, y: p.y, n: n });
  const w = byS('wolf');
  const sidT = (qid, n) => at(qid, inBunker(P.x, P.y) ? locPt('sid', 'trader') : locPt('sid', 'hatch'), n || (inBunker(P.x, P.y) ? 'Сидорович' : 'Бункер Сидоровича'));
  if (!q.flash) sidT('flash', 'Поговорить с Сидоровичем');
  if (q.flash === 1 && w) at('flash', w, 'Найти Волка в деревне');
  if (q.flash === 2) { const s = byS('shust'); at('flash', s || locPt('atp', 'garage'), 'Освободить Шустрого на АТП'); }
  if (q.flash === 3) sidT('flash', 'Отнести флешку Сидоровичу');
  if (q.medusa === 1) has('art_medusa') ? sidT('medusa', 'Отдать «Медузу» Сидоровичу') : at('medusa', locPt('field', 'medusa'), 'Поле аномалий');
  if (q.pack === 1) at('pack', locPt('dogs_lair', 'lair'), 'Логово псов');
  if (q.pack === 2 && w) at('pack', w, 'Вернуться к Волку');
  const fx = byS('fox');
  if (S.q2.fox >= 1 && S.q2.fox <= 3 && fx) at('fox', fx, 'Найти Лиса у фермы');
  const tl = byS('tolik');
  if (S.q2.tolik === 1 && tl) at('tolik', tl, 'Раненый Толик');
  plusTargets(out);
  return out;
}
/* отслеживаемая цель: выбранное задание, иначе первое активное (SOS не перехватывает выбор) */
function trackedTarget() {
  const T0 = qTargets();
  const act = qList().filter(q => q.st === 'a');
  if (!act.some(q => q.id === S.trackedQuestId)) S.trackedQuestId = (act.find(q => q.id !== 'sos') || act[0] || {}).id || null;
  return T0.find(t => t.qid === S.trackedQuestId) || null;
}
function qList() {
  const L = [], q = S.q;
  const F = ['', 'Найди Волка в деревне новичков: он знает, где держат Шустрого.', 'Освободи Шустрого: бандиты держат его в гараже на АТП, на востоке.', 'Отнеси флешку Сидоровичу в бункер.', ''];
  if (q.flash >= 1) L.push({ id: 'flash', loc: 'atp', n: 'Флешка Шустрого', d: q.flash === 4 ? (S.flags.flashFail ? 'Провалено.' : 'Выполнено.') : F[q.flash], st: q.flash === 4 ? (S.flags.flashFail ? 'f' : 'd') : 'a' });
  if (q.medusa >= 1) L.push({ id: 'medusa', loc: 'field', n: '«Медуза» для Сидоровича', d: q.medusa === 2 ? 'Выполнено.' : TOLIK_AT_JUNCTION ? 'Найди артефакт «Медуза» на поле аномалий к северу от развилки на АТП и принеси Сидоровичу.' : 'Найди артефакт «Медуза» на поле аномалий за ржавым автобусом и принеси Сидоровичу.', st: q.medusa === 2 ? 'd' : 'a' });
  if (q.pack >= 1) L.push({ id: 'pack', loc: 'dogs_lair', n: 'Стая у леса', d: q.pack === 3 ? 'Выполнено.' : q.pack === 1 ? 'Перебей стаю слепых псов в лесу на северо-западе.' : 'Стая перебита. Вернись к Волку.', st: q.pack === 3 ? 'd' : 'a' });
  if (S.q2.fox >= 1) L.push({ id: 'fox', loc: 'farm', n: 'Найти Лиса', d: S.q2.fox === 4 ? 'Выполнено. Брат Лиса, Серый, ждёт на Свалке. Продолжение в следующей версии.' : S.q2.fox === 1 ? 'Лис ушёл за насыпь, к разрушенной ферме на северо-востоке. Пройти можно под мостом за 500 RU или через туннель с электрами.' : S.q2.fox === 2 ? 'Отбейся от стаи вместе с Лисом.' : 'Поговори с Лисом.', st: S.q2.fox === 4 ? 'd' : 'a' });
  if (S.q2.tolik >= 1) L.push({ id: 'tolik', loc: TOLIK_AT_JUNCTION ? 'bus' : 'village', n: 'Раненый у дороги', d: S.q2.tolik === 2 ? 'Выполнено.' : S.q2.tolik === 3 ? 'Провалено: Толик погиб.' : TOLIK_AT_JUNCTION ? 'Сталкер лежит у автобуса на западной стороне шоссе возле развилки на АТП и просит аптечку.' : 'Сталкер лежит у дороги и просит аптечку.', st: S.q2.tolik === 2 ? 'd' : S.q2.tolik === 3 ? 'f' : 'a' });
  plusQList(L);
  return L;
}
function checkQuests() {
  if (S.q2.fox === 2 && !ents.some(e => e.alive && e.pack === 'foxdogs')) { S.q2.fox = 3; bulletin('Стая отбита. Поговори с Лисом.'); }
  if (S.q2.tolik === 0 && P && P.alive && byS('tolik') && byS('tolik').captive && dE(P, byS('tolik')) < 260) { S.q2.tolik = 1; msg('Толик: — Братишка... помоги... аптечку...', 'say'); bulletin('У дороги лежит раненый сталкер, просит аптечку.'); }
  if (S.q.pack === 1 && !ents.some(e => e.alive && e.pack === 'lair')) { S.q.pack = 2; bulletin('Стая у леса перебита. Вернись к Волку.'); }
  if (!S.flags.atpClear && ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'boss'].every(s => S.dead[s])) {
    S.flags.atpClear = 1; bulletin('Бандиты на АТП перебиты.');
    ['petr', 'petr2'].forEach(s => { const e = byS(s); if (e) { const p = locPt('atp', s); e.home = { x: p.x, y: p.y }; e.stay = 1; } });
  }
}

/* ===================== жизнь мира ===================== */
function spawnTick() {
  const far = (x, y) => dst(x, y, P.x, P.y) > 520;
  const villageLoners = ents.filter(e => e.alive && e.fac === 'loner' && !e.named && dst(e.home.x, e.home.y, FIRE.x, FIRE.y) < 260).length;
  if (villageLoners < 4 && far(...RMp(21 * T, 82.5 * T))) {
    const seat = RMt(...[[28.2, 83.3], [31.8, 82.7], [32.6, 85.6], [28.6, 86.4]][ri(0, 3)]);
    const e = mkHuman({ fac: 'loner', x: RMt(21, 82.5)[0], y: RMt(21, 82.5)[1], wpn: chance(0.7) ? 'w_pm' : 'w_obrez' });
    e.home = { x: seat[0] * T, y: seat[1] * T }; e.seat = 1;
    e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
    ents.push(e);
  }
  const patrol = ents.filter(e => e.alive && e.patrol).length;
  if (S.min - (S.flags.patrolT || 420) > 480 && patrol < 2 && far(...RMp(113 * T, 92 * T))) {
    S.flags.patrolT = S.min;
    const n = ri(2, 3);
    for (let i = 0; i < n; i++) {
      const e = mkHuman({ fac: 'bandit', x: 113 + i * 0.6, y: 92 + i * 0.5, wpn: chance(0.6) ? 'w_pm' : 'w_obrez' });
      e.patrol = 1; e.home = { x: (66 + i) * T, y: (91 + i) * T };
      ents.push(e);
    }
    news('Сводка: на дорогу с востока вышла группа бандитов.');
  }
  if (S.min - (S.flags.dogT || 0) > 360 && S.q.pack !== 1) {
    S.flags.dogT = S.min;
    ['lair', 'north'].forEach(pk => {
      const home = (h => ({ x: h[0], y: h[1] }))(pk === 'lair' ? RMt(10.5, 42.5) : RMt(71, 20.5));
      if (ents.filter(e => e.alive && e.pack === pk).length < 2 && far(home.x * T, home.y * T))
        for (let i = 0; i < 2; i++) ents.push(mkDog({ pack: pk, x: home.x + i, y: home.y }));
    });
  }
}

/* ===================== игрок и мир за кадр ===================== */
const HURTDIR = [];
let hurtFlash = 0, deathT = 0, shakeA = 0, geigerAcc = 0, radRate = 0, ambT = 0;
const IN = { mx: 0, my: 0, fire: false, moveX: 0, moveY: 0, sprint: false, aimStick: null, touchFire: false };
function shake(a) { shakeA = Math.max(shakeA, a); }
const fog = new Uint8Array(MW * MH);
function reveal() {
  if (inBunker(P.x, P.y)) return;
  const cx = Math.floor(P.x / T), cy = Math.floor(P.y / T), r = night() ? 7 : 11;
  let ch = false;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
    if (inb(x, y) && !fog[y * MW + x] && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) { fog[y * MW + x] = 1; ch = true; }
  if (ch) fogDirty = true;
}
let fogDirty = true;

function startReload() {
  const W = WP[S.weapon];
  if (P.jam && !W.melee) { P.jam = 0; P.reload = 0.8; play('jam'); return; }
  if (W.melee || P.reload > 0) return;
  const m = S.mag[S.weapon] || 0;
  if (m >= W.mag || !cnt(W.ammo)) return;
  P.reload = W.reload; play('reload');
}
function finishReload() {
  const W = WP[S.weapon]; if (W.melee) return;
  const m = S.mag[S.weapon] || 0, n = Math.min(W.mag - m, cnt(W.ammo));
  take(W.ammo, n); S.mag[S.weapon] = m + n;
}
let noAmmoT = 0;
function playerFire() {
  const W = WP[S.weapon];
  if (P.cool > 0 || P.reload > 0) return;
  if (W.toss) { P.cool = W.rate; throwNade(); if (!has('grenade')) setTimeout(() => { if (S.weapon === 'grenade') { S.weapon = 'knife'; } }, 300); return; }
  if (W.melee) { P.cool = W.rate; melee(P, W); return; }
  if (P.jam) { if (noAmmoT <= 0) { noAmmoT = 1; play('click'); } return; }
  const m = S.mag[S.weapon] || 0;
  if (m <= 0) {
    if (cnt(W.ammo)) startReload();
    else if (noAmmoT <= 0) { noAmmoT = 1.2; play('click'); msg('Нет патронов к ' + W.n + '. Переключись на другое оружие или купи патроны.'); }
    return;
  }
  if (wearAndJam(S.weapon)) { P.cool = 0.3; return; }
  S.mag[S.weapon] = m - 1; P.cool = W.rate;
  const moving = Math.abs(IN.moveX) + Math.abs(IN.moveY) > 0.1;
  const locked = P.lock && Math.abs(angD(P.ang, Math.atan2(P.lock.y - P.y, P.lock.x - P.x))) < 0.12;
  fire(P, P.ang, W, (W.spread + P.bloom + (moving ? 0.035 : 0) + (100 - cond(S.weapon)) * 0.0008 - (P.crouch ? 0.015 : 0)) * (locked && IN.touch ? 0.6 : 1));
  P.bloom = Math.min(0.14, P.bloom + (W.auto ? 0.016 : 0.03));
  if (m - 1 <= 0 && cnt(W.ammo)) setTimeout(startReload, 150);
}
function cycleWeapon(dir) {
  const own = WORDER.filter(w => w === 'knife' || has(w));
  let i = own.indexOf(S.weapon);
  S.weapon = own[(i + (dir || 1) + own.length) % own.length];
  P.reload = 0; P.cool = 0.25; P.jam = 0;
}
function setWeapon(w) { if (w === 'knife' || has(w)) { S.weapon = w; P.reload = 0; P.cool = 0.25; P.jam = 0; } }
function useItem(id) {
  const it = ITEMS[id];
  if (!has(id) || (it.heal === undefined && it.rad === undefined)) return false;
  take(id, 1);
  if (it.heal) P.hp = clamp(P.hp + it.heal, 1, 100);
  if (it.rad) S.rad = Math.max(0, S.rad - it.rad);
  if (FOOD[id]) { S.food = Math.min(100, S.food + FOOD[id]); play('eat'); } else play('pick');
  if (id === 'medkit') S.bleed = 0; if (id === 'bandage') S.bleed = Math.max(0, S.bleed - 2);
  return true;
}
function healWith(id) {
  if (P.medT > 0) return; hideMedPick();
  if (!has(id)) { msg(id === 'medkit' ? 'Аптечек нет.' : 'Бинтов нет.'); return; }
  P.medT = 1; useItem(id);
}
/* кнопка аптечки: есть и бинты, и аптечки — даёт выбрать; есть что-то одно — сразу лечит */
function medButton() {
  const m = cnt('medkit'), b = cnt('bandage');
  if (!m && !b) { msg('Нечем лечиться. Аптечки и бинты продаёт Сидорович.'); return; }
  if (!m || !b) { healWith(m ? 'medkit' : 'bandage'); return; }
  const mp = document.getElementById('medpick'); if (!mp.hidden) { hideMedPick(); return; }
  mp.hidden = false;   // висит, пока не выберешь или не нажмёшь кнопку ещё раз
}
function hideMedPick() { const mp = document.getElementById('medpick'); if (mp) mp.hidden = true; }
function quickHeal() {
  if (P.medT > 0) return;
  P.medT = 1;
  if (S.bleed > 0 && P.hp > 60 && useItem('bandage')) return;
  if (!useItem('medkit') && !useItem('bandage')) msg('Нечем лечиться. Аптечки и бинты продаёт Сидорович.');
}
function throwBolt() {
  if (P.boltT > 0) return; P.boltT = 0.6;
  const a = P.ang, L = 170;
  let ex = P.x, ey = P.y;
  for (let t = 10; t <= L; t += 6) { const x = P.x + Math.cos(a) * t, y = P.y + Math.sin(a) * t; if (solidPx(x, y)) break; ex = x; ey = y; }
  bolts.push({ x0: P.x, y0: P.y, x1: ex, y1: ey, t: 0, dur: 0.45, hit: null });
}
/* фонарик: ночью светит конусом; выключенный — почти темнота вокруг, зато тебя хуже видно издалека */
function toggleTorch() { S.torch = S.torch === false; play('click'); }
/* прыжок: короткий рывок по направлению движения; ящики, мешки, блоки и барьеры перепрыгиваются */
const LOW_K = new Set(['crate', 'sand', 'blocks', 'barrier', 'fence']);
function startJump() {
  if (P.jumpT > 0 || (P.jumpCD || 0) > 0 || P.sit) return;
  if (P.st < 15) { msg('Нет сил прыгать: отдышись.'); return; }
  if (swampAt(P.x, P.y)) { msg('В болоте не прыгнешь.'); return; }
  const ml = Math.hypot(IN.moveX, IN.moveY), a = ml > 0.2 ? Math.atan2(IN.moveY, IN.moveX) : P.ang;
  P.crouch = 0; P.jumpT = JUMP_T; P.jumpCD = 0.85; P.st -= 15; P.jumpA = a; play('step');
}
const JUMP_T = 0.42, JUMP_V = 250;
/* тихое убийство: сзади, пока враг не заметил. Лёгкая броня — сразу; армейская держит удар */
function takedown(e) {
  if (!e.alive || e.tgt === P || (e.aw || 0) >= 1) return;
  const a = Math.atan2(e.y - P.y, e.x - P.x); P.ang = a; P.cool = 0.7; play('knife', P.x, P.y);
  const heavy = e.fac === 'army' || e.sid === 'boss';
  if (!heavy) { e.quiet = 1; hurt(e, e.hp + 5, P, a); msg('Тихо снял: ' + e.name + '.', 'good'); }
  else { hurt(e, 85, P, a); msg('Броня приняла удар. Добивай!', 'bad'); }
  ents.forEach(o => { if (o !== e && o.alive && hostile(o, P) && o.tgt !== P && dE(o, e) < 150 && los(o.x, o.y, e.x, e.y)) o.aw = Math.max(o.aw || 0, 0.75); });   // кто рядом и видел — насторожился
}
function solidPx(x, y, skipFences = false) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (!inb(tx, ty) || SOLID[map[ty * MW + tx]]) return true;
  if(propCells.get(ty*MW+tx)?.some(p=>touchesProp(p,{x,y,r:0}))) return true;
  return objs.some(o => o.solid && !(skipFences && o.k === 'fence') && x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h);
}
function throwNade() {
  if (!has('grenade')) { msg('Гранат нет.'); return; }
  if (P.nadeT > 0) return; P.nadeT = 1;
  take('grenade', 1);
  const a = P.ang;
  nades.push({ x: P.x, y: P.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, t: 1.5, z: 0, vz: 160, owner: P });
  setTimeout(() => ents.forEach(e => { if (e.alive && e !== P && dE(e, P) < 420 && chance(0.5)) callout(e, 'nade', true); }), 500);
}
function explode(n) {
  play('boom', n.x, n.y); shake(dst(n.x, n.y, P.x, P.y) < 400 ? 9 : 2);
  flashes.push({ x: n.x, y: n.y, a: 0, life: 0.18, big: 1 });
  for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), v = rnd(60, 260); parts.push({ x: n.x, y: n.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.3, 0.8), c: i % 3 ? '#3a3730' : '#f0a040', s: rnd(2, 4), smoke: i % 3 ? 1 : 0 }); }
  decals.push({ x: n.x, y: n.y, r: 26, a: 0.5, burn: 1 });
  ents.forEach(e => {
    if (!e.alive) return;
    const d = dE(e, n);
    if (d < 130 && los(n.x, n.y, e.x, e.y)) hurt(e, 100 * (1 - d / 130) + 10, n.owner, Math.atan2(e.y - n.y, e.x - n.x));
  });
  ents.forEach(e => { if (e !== P && e.alive && dE(e, n) < 600 && hostile(e, P)) { e.lastSeen = { x: P.x, y: P.y }; e.mem = 6; } });
}

/* ===================== главный шаг ===================== */
function update(dt) {
  S.min += dt;
  cleanExpiredCrates();
  renewFieldCrates();
  noAmmoT -= dt; warnT -= dt;
  if (fadeT > 0) { fadeT -= dt; if (fadeT <= 0.25 && fadeTo) { P.x = fadeTo.x; P.y = fadeTo.y; P.ang = fadeTo.a; cam.x = P.x; cam.y = P.y; fadeTo = null; save(true); } }
  if (S.q2.fox === 0 && S.q.flash === 4 && S.flags.flashDone && !S.flags.foxTold) { /* задание выдаёт Сидорович */ }
  if (P.alive && P.y < 5 * T && !inBunker(P.x, P.y) && warnT <= 0) { warnT = 6; msg('Дальше Свалка. Эта часть Зоны появится в следующей версии.', 'say'); }
  if (BIG && P.alive && !inBunker(P.x, P.y) && warnT <= 0 && (P.x < 5 * T || P.x > (PW - 5) * T)) { warnT = 6; msg(P.x < 5 * T ? 'Дальше Залесье. Эта часть Зоны появится в следующей версии.' : 'Дальше Затон. Эта часть Зоны появится в следующей версии.', 'say'); }
  if (P.alive) updatePlayer(dt);
  else if (deathT > 0) { deathT -= dt; if (deathT <= 0) onDeath(); }
  worldFx(dt);
  for (const e of ents) {
    if (!e.alive || e === P) continue;
    if (Math.abs(e.x - P.x) > 1400 && Math.abs(e.y - P.y) > 1400 && !e.trip && !e.tgt) continue;
    if (e.qaHold) continue;   // только для приёмочных кадров
    if (e.sosPhase && sosFoeAI(e, dt)) continue;
    if (e.kind === 'dog') aiDog(e, dt); else if (e.kind === 'boar') aiBoar(e, dt); else if (e.kind === 'sucker') aiSucker(e, dt); else aiHuman(e, dt);
  }
  // толкотня и отдача
  for (let i = 0; i < ents.length; i++) {
    const a = ents[i]; if (!a.alive) continue;
    if (a.kx || a.ky) { moveE(a, a.kx * dt, a.ky * dt); a.kx *= Math.pow(0.02, dt); a.ky *= Math.pow(0.02, dt); if (Math.abs(a.kx) + Math.abs(a.ky) < 2) a.kx = a.ky = 0; }
    a.flash = Math.max(0, a.flash - dt);
    for (let j = i + 1; j < ents.length; j++) {
      const b = ents[j]; if (!b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const other = a === P ? b : b === P ? a : null;
      const atSeat = other && other.sit && other.fac === 'loner' && other.fireRef === FIRE && dE(other, FIRE) < 130;
      const rr = atSeat ? 40 : a.r + b.r;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy);
      if (atSeat && d < rr) {
        // Не сдвигать сидящего игроком. Запас учитывает ноги, вытянутые перед ним.
        const angle = d > 0.01 ? Math.atan2(P.y - other.y, P.x - other.x) : other.ang + Math.PI;
        moveE(P, (rr - d) * Math.cos(angle), (rr - d) * Math.sin(angle));
      } else if (d < rr && d > 0.01) {
        const push = (rr - d) / 2, ux = dx / d, uy = dy / d;
        if (!a.captive) { a.x -= ux * push; a.y -= uy * push; }
        if (!b.captive) { b.x += ux * push; b.y += uy * push; }
      }
    }
  }
  updateAnoms(dt);
  g7Tick(dt);   // шаг/риг: от фактического пути за тик
  // болты
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; b.t += dt;
    const k = Math.min(1, b.t / b.dur), x = lerp(b.x0, b.x1, k), y = lerp(b.y0, b.y1, k);
    if (!b.hit) for (const a of anoms) if (dst(x, y, a.x, a.y) < a.r) { b.hit = a; triggerAnom(a, null); a.reveal = 12; b.x1 = x + rnd(-60, 60); b.y1 = y + rnd(-60, 60); b.x0 = x; b.y0 = y; b.t = 0; b.dur = 0.3; break; }
    if (b.t >= b.dur) { if (!b.hit) play('bolt', x, y); bolts.splice(i, 1); }
  }
  // гранаты
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i];
    n.t -= dt; n.vz -= 520 * dt; n.z = Math.max(0, n.z + n.vz * dt);
    if (n.z <= 0 && n.vz < 0) { n.vz = -n.vz * 0.35; n.vx *= 0.6; n.vy *= 0.6; }
    const nx = n.x + n.vx * dt, ny = n.y + n.vy * dt;
    if (solidPx(nx, n.y)) n.vx = -n.vx * 0.4; else n.x = nx;
    if (solidPx(n.x, ny)) n.vy = -n.vy * 0.4; else n.y = ny;
    n.vx *= Math.pow(0.4, dt); n.vy *= Math.pow(0.4, dt);
    if (n.t <= 0) { nades.splice(i, 1); explode(n); }
  }
  // частицы
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.05, dt); p.vy *= Math.pow(0.05, dt);
    if (p.rise) p.y -= p.rise * dt;
    if (p.life <= 0) { if (p.blood && chance(0.4)) decals.push({ x: p.x, y: p.y, r: rnd(2, 4), a: 0.7 }); parts.splice(i, 1); }
  }
  if (decals.length > 160) decals.splice(0, decals.length - 160);
  for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1); }
  for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }
  // атмосфера: вороны, дым костра
  ambT -= dt;
  if (ambT <= 0) {
    ambT = rnd(25, 60);
    if (!night()) { const y0 = P.y + rnd(-300, 300), dir = chance(0.5) ? 1 : -1, n = ri(3, 6); for (let i = 0; i < n; i++) crows.push({ x: P.x - dir * 800 + rnd(-40, 40), y: y0 + rnd(-50, 50), vx: dir * rnd(110, 140), vy: rnd(-12, 12), ph: rnd(0, 6) }); }
  }
  for (let i = crows.length - 1; i >= 0; i--) { const c = crows[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.ph += dt * 9; if (Math.abs(c.x - P.x) > 1100) crows.splice(i, 1); }
  [FIRE, FIRE2].forEach(F => { if (chance(dt * 7)) { const l = rnd(2.2, 3.6); parts.push({ x: F.x + rnd(-3, 3), y: F.y - 6, vx: rnd(-5, 5) + WX.wind * 8, vy: 0, rise: rnd(14, 22), life: l, ml: l, c: '#8a8a84', s: rnd(1.6, 2.6), smoke: 1 }); } });
  // тела исчезают через двое суток
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (o.k === 'body' && S.min - o.t > 2880 && dst(o.x, o.y, P.x, P.y) > 600) objs.splice(i, 1); }
  // таймеры мира
  spawnT -= dt; if (spawnT <= 0) { spawnT = 20; spawnTick(); }
  fogT -= dt; if (fogT <= 0 && P.alive) { fogT = 0.4; reveal(); }
  saveT -= dt;
  if (saveT <= 0 && P.alive && (dE(P, FIRE) < 300 || inBunker(P.x, P.y)) && !ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 500)) { saveT = 60; save(true); }
  // штурм АТП с Петрухой
  if (S.q.flash >= 2 && !S.flags.assault && !S.flags.atpClear) {
    const p = byS('petr');
    if (p && dE(p, P) < 240) {
      S.flags.assault = 1;
      msg('Петруха: — Наконец-то! Их там человек семь. Заходим через ворота, мы прикроем.', 'say');
      ['petr', 'petr2'].forEach((s, i) => { const e = byS(s); if (e) { e.home = { x: (89 + i * 2) * T, y: (71 + i) * T }; e.stay = 0; e.path = null; } });
    }
  }
  checkQuests();
  if (radioQueue.length && (radioQueue[0].life -= dt) <= 0) radioQueue.shift();
  for (const m of MSGS) m.life -= dt;
  MSGS = MSGS.filter(m => m.life > 0);
  hurtFlash = Math.max(0, hurtFlash - dt * 1.2);
  shakeA = Math.max(0, shakeA - dt * 20);
}
function updatePlayer(dt) {
  P.cool -= dt; P.medT -= dt; P.boltT = (P.boltT || 0) - dt; P.nadeT = (P.nadeT || 0) - dt;
  P.bloom = Math.max(0, P.bloom - dt * 0.25);
  survival(dt); plusTick(dt);
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) finishReload(); }
  // движение
  let mx = IN.moveX, my = IN.moveY;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const over = weight() > MAXW;
  const sprint = (IN.sprint || ml > 0.95 && IN.touch && !P.crouch) && P.st > 5 && !over && ml > 0.1;
  if (sprint) P.crouch = 0; P.sprinting = sprint;
  let sp = (sprint ? 190 : P.crouch ? 62 : 118) * (over ? 0.55 : 1) * (swampAt(P.x, P.y) ? 0.55 : 1);
  if (sprint) P.st = Math.max(0, P.st - 22 * dt); else P.st = Math.min(100, P.st + 14 * dt);
  P.jumpCD = (P.jumpCD || 0) - dt;
  if (P.jumpT > 0) { P.jumpT -= dt; const ox = P.x, oy = P.y; moveE(P, Math.cos(P.jumpA) * JUMP_V * dt, Math.sin(P.jumpA) * JUMP_V * dt); P.step += dst(ox, oy, P.x, P.y); if (P.jumpT <= 0) { P.jumpT = 0; collide(P); play('step'); } }
  else if (ml > 0.08) { const ox = P.x, oy = P.y; moveE(P, mx * sp * dt, my * sp * dt); P.step += dst(ox, oy, P.x, P.y); }
  // прицел
  // захват цели: видимый враг ближе всего к направлению прицела, с удержанием
  P.lockT = (P.lockT || 0) - dt; P.combatT = Math.max(0, (P.combatT || 0) - dt);
  const aimDir = IN.touch ? (IN.aimStick ? IN.aimStick.a : IN.fireStick && IN.fireStick.m > 0.25 ? IN.fireStick.a : P.ang) : Math.atan2(screenToWorld(IN.mx, IN.my).y - P.y, screenToWorld(IN.mx, IN.my).x - P.x);
  if (P.lockT <= 0) {
    P.lockT = 0.12;
    const cone = IN.touch ? (IN.aimStick || (IN.fireStick && IN.fireStick.m > 0.25) ? 0.6 : 3.2) : 0.14;
    let best = null, bs = 1e9;
    for (const e of ents) {
      if (!e.alive || e === P || !hostile(P, e) || e.captive || e.cloak > 0.7) continue;
      const d = dE(P, e); if (d > 520) continue;
      const da = Math.abs(angD(aimDir, Math.atan2(e.y - P.y, e.x - P.x)));
      if (da > cone || !seesActor(P, e)) continue;
      const sc = da * 260 + d * 0.5 - (e === P.lock ? 120 : 0);
      if (sc < bs) { bs = sc; best = e; }
    }
    P.lock = best;
  }
  if (P.lock && (!P.lock.alive || !hostile(P, P.lock))) P.lock = null;
  if (IN.touch) {
    const firing = IN.btnFire || IN.touchFire;
    if (P.lock && (firing || IN.aimStick)) P.ang += angD(P.ang, Math.atan2(P.lock.y - P.y, P.lock.x - P.x)) * Math.min(1, dt * 22);
    else if (IN.aimStick) P.ang += angD(P.ang, IN.aimStick.a) * Math.min(1, dt * 18);
    else if (IN.fireStick && IN.fireStick.m > 0.25) P.ang += angD(P.ang, IN.fireStick.a) * Math.min(1, dt * 18);
    else if (ml > 0.1) P.ang += angD(P.ang, Math.atan2(my, mx)) * Math.min(1, dt * 10);
  } else {
    const w = screenToWorld(IN.mx, IN.my);
    P.ang = Math.atan2(w.y - P.y, w.x - P.x);
    if (P.lock && IN.fire) P.ang += angD(P.ang, Math.atan2(P.lock.y - P.y, P.lock.x - P.x)) * 0.5;
  }
  P.hitT = Math.max(0, (P.hitT || 0) - dt); P.killT = Math.max(0, (P.killT || 0) - dt);
  for (let i = HURTDIR.length - 1; i >= 0; i--) { HURTDIR[i].life -= dt; if (HURTDIR[i].life <= 0) HURTDIR.splice(i, 1); }
  if (IN.fire || IN.touchFire || IN.btnFire) playerFire();
  // радиация и артефакты
  radRate = 0;
  rads.forEach(z => { const d = dst(P.x, P.y, z.x, z.y); if (d < z.r) radRate += z.p * (1 - d / z.r); });
  if (beltCount('art_blood')) { radRate += 0.15 * beltCount('art_blood'); P.hp = Math.min(100, P.hp + 0.3 * beltCount('art_blood') * dt); }
  if (beltCount('art_medusa')) { radRate *= 0.5; S.rad = Math.max(0, S.rad - 0.35 * dt); }
  S.rad = clamp(S.rad + radRate * dt, 0, 100);
  if (S.rad > 15) P.hp -= (S.rad - 10) * 0.007 * dt;
  geigerAcc += (radRate * 2.2 + (S.rad > 40 ? 0.4 : 0)) * dt;
  while (geigerAcc > 1) { geigerAcc -= 1 + Math.random() * 0.6; play('geiger'); }
  if (P.hp <= 0 && P.alive) kill(P, 'rad');
  // подсветка тайника/артефакта
  const near = findInteract();
  G.near = near;
}
function screenToWorld(sx, sy) { return { x: cam.x + (sx - VW / 2) / Z, y: cam.y + (sy - VH / 2) / Z }; }

/* ===================== аномалии ===================== */
function triggerAnom(a, victim) {
  a.fx = 1; a.reveal = Math.max(a.reveal, 8); a.cd = 1.1;
  play(a.k === 'g' ? 'anomG' : 'anomE', a.x, a.y);
  if (a.k === 'e') flashes.push({ x: a.x, y: a.y, a: 0, life: 0.15, big: 1, blue: 1 });
  for (let i = 0; i < 14; i++) { const ang = rnd(0, 6.28); parts.push({ x: a.x + Math.cos(ang) * a.r, y: a.y + Math.sin(ang) * a.r, vx: -Math.cos(ang) * rnd(40, 120) * (a.k === 'g' ? 1 : -1), vy: -Math.sin(ang) * rnd(40, 120) * (a.k === 'g' ? 1 : -1), life: rnd(0.3, 0.7), c: a.k === 'g' ? '#7a6a4a' : '#bfe6ff', s: a.k === 'g' ? 2.5 : 1.5 }); }
}
function updateAnoms(dt) {
  for (const a of anoms) {
    a.cd -= dt; a.reveal = Math.max(0, a.reveal - dt); a.fx = Math.max(0, a.fx - dt * 1.6);
    a.arc -= dt;
    for (const e of ents) {
      if (!e.alive || e.captive) continue;
      const d = dE(e, a);
      if (d < a.r + e.r * 0.5) {
        if (a.k === 'g') { e.kx += (a.x - e.x) * 4 * dt * 60; e.ky += (a.y - e.y) * 4 * dt * 60; }
        if (a.cd <= 0) {
          triggerAnom(a, e);
          let dmg = a.k === 'g' ? 30 : 26;
          if (e === P && a.k === 'e' && beltCount('art_bengal')) dmg /= 2;
          const out = Math.atan2(e.y - a.y, e.x - a.x) + (d < 2 ? rnd(0, 6.28) : 0);
          e.kx = Math.cos(out) * (a.k === 'g' ? 420 : 260); e.ky = Math.sin(out) * (a.k === 'g' ? 420 : 260);
          if (e === P) msg(a.k === 'g' ? 'Гравитационная аномалия! Кидай болты перед собой.' : 'Электра! Обходи голубые вспышки.', 'bad');
          hurt(e, dmg, 'anom');
          if (!e.alive && e !== P) { /* смерть в аномалии уже учтена */ }
        }
      }
    }
  }
}

/* ===================== взаимодействие ===================== */
const G = { near: null };
function findInteract() {
  let best = null, bd = 1e9;
  const cand = (d, o) => { if (d < bd) { bd = d; best = o; } };
  for (const e of ents) {
    if (e.alive && e.kind === 'human' && hostile(e, P) && !e.captive && e.tgt !== P && (e.aw || 0) < 1 && dE(e, P) < 42 &&
      (Math.abs(angD(e.ang, Math.atan2(P.y - e.y, P.x - e.x))) > 1.9 || e.sit)) { cand(dE(e, P) - 200, { k: 'kill', e: e, label: 'Убить ножом: ' + e.name }); continue; }   // сзади и незаметно
    if (!e.alive || e === P) continue;
    const d = dE(e, P);
    if (d > 60) continue;
    if (e.wounded) cand(d, { k: 'heal', e: e, label: 'Помочь раненому: ' + e.name });
    else if (e.captive) cand(d, { k: 'free', e: e, label: 'Освободить: ' + e.name });
    else if (e.kind === 'human' && !hostile(e, P) && !e.tgt && e.fac !== 'trader') cand(d, { k: 'talk', e: e, label: 'Поговорить: ' + e.name });
  }
  const sd = byS('sid');
  if (sd && inBunker(P.x, P.y) && dE(sd, P) < 120) cand(dE(sd, P) - 30, { k: 'trader', label: 'Поговорить: Сидорович' });
  const dh = dst(P.x, P.y, HATCH.x, HATCH.y);
  const atEntrance = SID_SHOP ? Math.abs(P.x-HATCH.x)<25 && P.y>=HATCH.y-62 && P.y<HATCH.y+45 : dh<54;
  if (atEntrance) cand(dh, { k: 'down', label: 'Спуститься в бункер' });
  const ds = dst(P.x, P.y, STAIRS.x, STAIRS.y);
  if (ds < (SID_SHOP ? 32 : 56)) cand(ds, { k: 'up', label: 'Подняться наверх' });
  for (const o of objs) {
    if (o.k === 'body' && Object.keys(o.loot).length) { const d = dst(P.x, P.y, o.x, o.y); if (d < 42) cand(d, { k: 'loot', o: o, label: 'Обыскать: ' + o.name }); }
    if(o.stash && !o.looted && (o.k!=='crate'||o.broken)){
      const x=o.x+o.w/2,y=o.y+o.h/2,d=dst(P.x,P.y,x,y);
      if(d<46 && los(P.x,P.y,x,y)){
        if(o.k==='crate') cand(d,{k:'pickupLoot',o,label:'Подобрать добычу'});
        else cand(d,{k:'loot',o,label:o.k==='safe'?'Обыскать сейф':'Обыскать тайник'});
      }
    }
  }
  for (const a of arts) { const d = dst(P.x, P.y, a.x, a.y); if (d < 38) cand(d - 10, { k: 'art', a: a, label: 'Подобрать: ' + ITEMS[a.id].n }); }
  const cn = cacheNear(); if (cn) cand(dst(P.x, P.y, cn.x, cn.y), { k: 'loot', o: cn, label: 'Открыть тайник' });
  plusInteract(cand);
  return best;
}
function lootAll(o) {
  let pickedUp = false;
  const left = {};
  Object.keys(o.loot).forEach(k => {
    const q = o.loot[k];
    if (k === '__tip') return;
    if (k === 'money') { S.money += q; pickedUp = true; }
    else if (WP[k] && !WP[k].melee && has(k)) left[k] = q;          // такой ствол уже есть — остаётся лежать
    else { give(k, q); if (WP[k] && !WP[k].melee) S.cond[k] = o.wcond && o.wcond[k] != null ? o.wcond[k] : (S.cond[k] == null ? 80 : S.cond[k]); pickedUp = true; }
  });
  o.loot = left;
  if (Object.keys(left).length) msg('Оставлено: такой ствол уже есть (' + Object.keys(left).map(k => ITEMS[k].n).join(', ') + ').', 'bad');
  recordContents(o);
  if (pickedUp) play('pick');
}
function takeArt(a) {
  give(a.id, 1); S.stats.art++; S.flags['art_' + a.key] = 1;
  arts.splice(arts.indexOf(a), 1);
  play('pick');
  news('Найден ' + ITEMS[a.id].n + '.');
}
function freeShust(e) {
  e.captive = 0; S.flags.shustFree = 1;
  e.home = (h => ({ x: h[0], y: h[1] }))(RMp(34.5 * T, 80.5 * T)); e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
  if (S.q.flash === 2 || S.q.flash === 1) { give('flash', 1); S.q.flash = 3; bulletin('Шустрый освобождён. Флешка у тебя.'); }
}

let fadeT = 0, fadeTo = null;
function goThrough(down) {
  if (fadeT > 0) return;
  fadeT = 0.5; fadeTo = down ? { x:STAIRS.x, y:(SID_SHOP ? SID_STAIR_Y-.85 : 9.6)*T, a:-Math.PI/2 }
    : { x:HATCH.x+2, y:HATCH.y+(SID_SHOP ? 27 : -30), a:SID_SHOP ? Math.PI/2 : -Math.PI/2 };
  play('reload');
}
function healWounded(e) {
  if (!has('medkit')) { msg('Нужна аптечка. Купи у Сидоровича.', 'bad'); return false; }
  take('medkit', 1); e.captive = 0; e.wounded = 0; e.hp = e.maxhp * 0.7;
  if (e.sid === 'tolik') {
    S.flags.tolikUp = 1; S.q2.tolik = 2; S.stats.q++; S.rep += 10; S.money += 300; give('antirad', 1);
    e.home = (h => ({ x: h[0], y: h[1] }))(RMp(35 * T, 81 * T)); e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
    bulletin('Выполнено: раненый у дороги. Толик выжил.');
  }
  if (e.sid === 'fox') {
    S.flags.foxUp = 1; S.q2.fox = 2;
    for (let i = 0; i < 4; i++) { const d = mkDog({ pack: 'foxdogs', x: 95 + i * 0.7, y: 21 + (i % 2) }); d.tgt = P; ents.push(d); }
    msg('Лис: — Слышишь? Они вернулись! Держись рядом!', 'bad');
  }
  return true;
}

/* ===================== сохранение ===================== */
const KEY = /qa/.test(location.hash) ? 'zona2d-kordon-qa' : 'zona2d-kordon-v2';   // QA-прогоны не трогают сохранение игрока
const SAVE_VERSION = 3;
function save(quiet) {
  if (!P || !P.alive) return false;
  S.x = P.x; S.y = P.y; S.hp = P.hp;
  let f = ''; for (let i = 0; i < fog.length; i += 6) { let v = 0; for (let b = 0; b < 6; b++) v |= (fog[i + b] ? 1 : 0) << b; f += String.fromCharCode(48 + v); }
  S.fog = f;
  dynSnapshot();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (!quiet) msg('Сохранить не вышло: браузер не даёт места.'); return false; }
  return true;
}
function loadSave() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; const d = JSON.parse(raw); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
function applyState(d) {
  S = d;
  fog.fill(0);
  if (S.fog) for (let i = 0; i < S.fog.length; i++) { const v = S.fog.charCodeAt(i) - 48; for (let b = 0; b < 6; b++) if (i * 6 + b < fog.length) fog[i * 6 + b] = (v >> b) & 1; }
  fogDirty = true;
  spawnWorld();
  survDefaults(); ensureCaches(); dynRestore();
  loadFieldCrates(); restoreCrateCleanup(); renewFieldCrates();
  if (SID_SHOP && inBunker(P.x,P.y)) {
    // Сохранения из более просторного подвала могли оставить героя за новой стеной.
    const inside = Math.abs(P.x-STAIRS.x) <= 3*T-P.r && P.y >= SHOP_ROOM.counterFront*T+P.r && P.y <= 10*T-P.r;
    const probe = {x:P.x,y:P.y,r:P.r}; collide(probe);
    if (!inside || Math.hypot(P.x-probe.x,P.y-probe.y)>.1) {
      P.x=S.x=STAIRS.x; P.y=S.y=SID_SPAWN_Y*T;
    }
  }
  cam.x = P.x; cam.y = P.y;
  deathT = 0; hurtFlash = 0; MSGS = []; radioQueue.length = 0;
  if (S.blow?.stage === 1) radioNotice(BLOW_WARNING, true);
}

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
  if (o.k==='hatch' && gateTerrain) { g.drawImage(gateTerrain,o.x,o.y,o.w,o.h); return; }
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
  const breath = Math.sin((e.deskTime || 0)*1.8)*.25;
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
function render() {
  const sx = (Math.random() - 0.5) * shakeA, sy = (Math.random() - 0.5) * shakeA;
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
    if ((o.k==='safe'||o.k==='hiding'||o.broken) && inView(o.x,o.y,40)) containerDraw(o);
    else if (o.k === 'crate' && !(shopVisible && o.shopStack) && inView(o.x, o.y, 40)) crateDraw(o);
    if (o.pick && inView(o.x, o.y, 30)) drawPick(o);
    if (o.k === 'genset' && G3.on && G3.pack && G3.pack.manifest.props && inView(o.x, o.y, 40) && !g7Prop(o)) gensetProc(ctx, o);
    if (o.k === 'body' && inView(o.x, o.y, 40)) drawBody(o);
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
  const vis = ents.filter(e => e.alive && inView(e.x, e.y, 30)).sort((a, b) => a.y - b.y);
  for (const e of vis) {
    if (shopVisible && e.sid === 'sid' && deskPoses.complete && deskPoses.naturalWidth) drawDeskTrader(e);
    else if (e.kind === 'dog') drawDog(e); else if (e.kind === 'boar') drawBoar(e); else if (e.kind === 'sucker') drawSucker(e); else drawLitHuman(e);
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
  const dk = bunk ? (shopVisible ? 0.41 : 0.62) : darkness();
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
    if (shopVisible) {
      hole(STAIRS.x+2.15*T, 6.13*T, 74, .9);
    } else if (bunk) { hole(RMp(126.5 * T, 7 * T)[0], RMp(126.5 * T, 7 * T)[1], 260 + Math.sin(S.min * 30) * 3, 0.9); hole(RMp(124.5 * T, 3.5 * T)[0], RMp(124.5 * T, 3.5 * T)[1], 120, 0.7); }
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

/* ===================== погода, выброс, шаги, голоса, гитара ===================== */
const WX = { cloud: 0.15, rain: 0, fog: 0, wind: 0.35, flash: 0, red: 0, clouds: [], drops: [] };
const WXT = { clear: [0.1, 0, 0], cloudy: [0.65, 0, 0], rain: [0.85, 0.6, 0.06], storm: [1, 1, 0.06], fog: [0.45, 0, 0.8] };
for (let i = 0; i < 7; i++) WX.clouds.push({ x: rnd(0, WW), y: rnd(0, WH), r: rnd(350, 700) });
function pickWeather() {
  const r = Math.random(), h = hour();
  const k = r < 0.34 ? 'clear' : r < 0.58 ? 'cloudy' : r < 0.78 ? 'rain' : r < 0.87 ? 'storm' : (h < 9 || h > 18 ? 'fog' : 'cloudy');
  S.wx = { k: k, until: S.min + rnd(120, 300) };
}
const sheltered = (x, y) => inBunker(x, y) || HOUSES.some(h => !h.ruin && x > (h.x + 0.6) * T && x < (h.x + h.w - 0.6) * T && y > (h.y + 0.6) * T && y < (h.y + h.h - 0.6) * T);
const safeFromBlow = e => e.guard || ['wolf', 'sid', 'petr', 'petr2', 'fox', 'shust', 'tolik'].indexOf(e.sid) >= 0;

const CALL = {
  loner: { combat: ['Контакт!', 'Вижу врага!', 'Прикрой меня!', 'Обходи слева!', 'Получай!'], reload: ['Перезаряжаюсь!', 'Пустой, прикрой!'], hurt: ['Зацепило!', 'Ах ты ж...', 'Ранен!'],
    nade: ['Граната!', 'Ложись!'], greet: ['Здоров, Меченый.', 'Привет, брат.', 'Удачной охоты.', 'О, живой ещё?', 'Заходи к костру.'], bad: ['Ходят тут всякие...', 'Иди мимо.', 'Глаза б мои не видели.'],
    idle: ['Эх, сейчас бы домой...', 'Кто знает, где тут нормальный хабар?', 'Тихо сегодня. Не к добру.', 'Опять погода портится.', 'Говорят, на Свалке опять стреляли.',
      'Дай закурить, а?', 'Слышь, а артефакты правда лечат?', 'Вчера псов у насыпи видел, штук пять.', 'Консервы кончаются, надо к Сидоровичу.', 'Ты гитару-то не ломай, она одна на всю деревню.'] },
  bandit: { combat: ['Вали его!', 'Сюда, пацаны!', 'Ща пришьём!', 'Окружай!', 'Он тут!'], reload: ['Пустой!', 'Прикрой, заряжаю!'], hurt: ['Ай, зацепило!', 'Мать честная!'],
    nade: ['Шухер, граната!'], idle: ['Чё, скучно...', 'Сиплый сказал ждать.', 'Скоро лохи с дороги пойдут.', 'Карты есть у кого?'] },
  army: { combat: ['Огонь!', 'Нарушитель!', 'Держать позицию!', 'Подавить!'], reload: ['Перезарядка!'], hurt: ['Попали!'], nade: ['Граната!'],
    idle: ['Пост два, всё спокойно, приём.', 'Когда смена-то?', 'Курить охота.', 'Тишина в эфире.'] }
};
function callout(e, kind, force) {
  if (!e.alive || e === P || e.kind !== 'human' || e.wounded || e.captive) return;
  const bank = CALL[e.fac] && CALL[e.fac][kind]; if (!bank) return;
  if (!force && e.bub && e.bub.life > 1) return;
  if (dE(e, P) > 520) return;
  e.bub = { t: bank[(e.seed + Math.floor(S.min * 7)) % bank.length], life: 3.2 };
  if (e.fac === 'army' && kind === 'idle') play('radio', e.x, e.y); else play('voice', e.x, e.y);
}
function sayLine(e, t) { e.bub = { t: t, life: 3.6 }; play('voice', e.x, e.y); }

/* ---------- шаги ---------- */
function surf(x, y) {
  const t = tAt(Math.floor(x / T), Math.floor(y / T));
  if (t === AS || t === CF || t === CO) return 'stepHard';
  if (t === FL) return 'stepWood';
  if (t === SW) return 'stepWet';
  if (t === RA) return 'stepGravel';
  if (t === DI) return WX.rain > 0.3 ? 'stepWet' : 'stepDirt';
  return WX.rain > 0.4 ? 'stepWet' : 'stepGrass';
}

/* ---------- гитара у костра: свои простые переборы ---------- */
const GTR = { t: 0, i: 0, buf: {} };
const CHORDS = [[110, 164.8, 220, 261.6, 329.6], [146.8, 220, 293.7, 349.2, 440], [82.4, 164.8, 207.7, 246.9, 329.6], [110, 164.8, 220, 261.6, 329.6],
  [130.8, 196, 261.6, 329.6, 392], [98, 196, 246.9, 293.7, 392], [110, 164.8, 220, 261.6, 329.6], [82.4, 164.8, 207.7, 246.9, 329.6]];
const PICK = [0, 2, 3, 4, 3, 2, 1, 2];
function pluckBuf(f) {
  if (GTR.buf[f]) return GTR.buf[f];
  const sr = AC.sampleRate, len = Math.floor(sr * 1.6), b = AC.createBuffer(1, len, sr), d = b.getChannelData(0);
  const N = Math.max(2, Math.round(sr / f)), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  let p = 0;
  for (let i = 0; i < len; i++) { const n = (p + 1) % N; const v = 0.497 * (ring[p] + ring[n]); d[i] = ring[p]; ring[p] = v; p = n; }
  GTR.buf[f] = b; return b;
}
function pluck(f, vol) {
  if (!AC) return;
  const s = AC.createBufferSource(); s.buffer = pluckBuf(f);
  const g = AC.createGain(); g.gain.value = vol; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  s.connect(lp); lp.connect(g); g.connect(master); s.start();
}
function guitar(dt) {
  if (!AC || inBunker(P.x, P.y) || WX.rain > 0.5 || S.blow.stage) return;
  const d = dst(P.x, P.y, FIRE.x, FIRE.y);
  if (d > 520) return;
  const player = ents.find(e => e.alive && e.sit && e.fireRef === FIRE && e.fac === 'loner');
  if (!player) return;
  GTR.t -= dt;
  if (GTR.t > 0) return;
  GTR.t = 0.34 + (GTR.i % 8 === 7 ? 0.25 : 0);
  const ch = CHORDS[Math.floor(GTR.i / 8) % CHORDS.length], note = ch[PICK[GTR.i % 8]];
  const v = clamp(1 - d / 520, 0, 1) * 0.22;
  pluck(note, v);
  if (GTR.i % 8 === 0) pluck(ch[0] / 2 > 60 ? ch[0] : ch[0], v * 0.8);
  GTR.i++;
}

/* ---------- звук дождя ---------- */
let rainG = null;
function rainSound() {
  if (!AC) return;
  if (!rainG) {
    const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    rainG = AC.createGain(); rainG.gain.value = 0;
    src.connect(f); f.connect(rainG); rainG.connect(master); src.start();
  }
  const under = sheltered(P.x, P.y) ? 0.45 : 1;
  rainG.gain.value = inBunker(P.x, P.y) ? 0 : WX.rain * 0.16 * under;
}

/* ---------- главный шаг атмосферы ---------- */
let chatT = 2, sirenT = 0;
function worldFx(dt) {
  if (!S.wx) S.wx = { k: 'clear', until: S.min + 180 };
  if (!S.blow) S.blow = { stage: 0, next: S.min + rnd(900, 1500), t: 0 };
  if (S.min > S.wx.until) pickWeather();
  const tg = WXT[S.wx.k] || WXT.clear, k = Math.min(1, dt * 0.05);
  WX.cloud = lerp(WX.cloud, tg[0], k); WX.rain = lerp(WX.rain, tg[1], k); WX.fog = lerp(WX.fog, tg[2], k);
  WX.wind = 0.3 + WX.rain * 0.6;
  WX.clouds.forEach(c => { c.x += WX.wind * 40 * dt; c.y += WX.wind * 12 * dt; if (c.x > WW + 700) { c.x = -700; c.y = rnd(0, WH); } if (c.y > WH + 700) c.y = -700; });
  WX.flash = Math.max(0, WX.flash - dt * 3);
  if (S.wx.k === 'storm' && WX.rain > 0.7 && chance(dt * 0.07)) { WX.flash = 1; setTimeout(() => play('thunder'), rnd(400, 2200)); }
  rainSound();
  blowout(dt);
  // шаги и анимация ног
  for (const e of ents) {
    if (!e.alive) continue;
    const mv = (e.step - (e.ps || 0)) / Math.max(dt, 0.001); e.ps = e.step; e.mv = lerp(e.mv || 0, mv, 0.3);
    const stride = e.kind === 'dog' ? 26 : e === P && IN.sprint ? 44 : 36;
    if (e.step - (e.ls || 0) > stride) {
      e.ls = e.step;
      if (e === P) { if (!P.crouch) play(surf(e.x, e.y), undefined, undefined, IN.sprint ? 1.3 : 1); }
      else if (dE(e, P) < 380 && e.kind === 'human') play(surf(e.x, e.y), e.x, e.y, 0.6);
      else if (dE(e, P) < 320 && e.kind === 'dog') play('stepDog', e.x, e.y);
    }
    if (e.bub) { e.bub.life -= dt; if (e.bub.life <= 0) e.bub = null; }
  }
  // разговоры рядом
  chatT -= dt;
  if (chatT <= 0 && P.alive) {
    chatT = rnd(1, 2.5);
    const near = ents.filter(e => e.alive && e !== P && e.kind === 'human' && !e.tgt && !e.captive && dE(e, P) < 420 && e.fac !== 'trader');
    near.forEach(e => {
      const d = dE(e, P);
      if (e.fac === 'loner' && !hostile(e, P) && d < 90 && !e.greeted) { e.greeted = 1; callout(e, S.rep < 0 ? 'bad' : 'greet', true); return; }
      if (d > 140) e.greeted = 0;
      if (chance(0.08)) callout(e, 'idle');
    });
  }
  guitar(dt);
}
const BLOW_WARNING = 'Приближается выброс! Укройтесь в бункере или в доме с целой крышей.';
function blowout(dt) {
  const B = S.blow;
  if (B.stage === 0 && S.min >= B.next && P.alive) {
    B.stage = 1; B.t = 80;
    radioNews(BLOW_WARNING, true);
    ents.forEach(e => {
      if (!e.alive || e === P || e.kind !== 'human' || sheltered(e.x, e.y) || e.captive || e.guard) return;
      let best = null, bd = 1100;
      HOUSES.forEach(h => { if (h.ruin) return; const cx = (h.x + h.w / 2) * T, cy = (h.y + h.h / 2) * T, d = dst(e.x, e.y, cx, cy); if (d < bd) { bd = d; best = { x: cx, y: cy }; } });
      if (best) { e.sit = 0; e.campRise = null; e.tgt = null; e.trip = { x: best.x + rnd(-20, 20), y: best.y + rnd(-14, 14), stage: 0, shelter: 1 }; e.path = null; }
    });
  }
  if (B.stage === 1) {
    B.t -= dt; WX.red = lerp(WX.red, 0.5, dt * 0.05);
    sirenT -= dt; if (sirenT <= 0) { sirenT = 4; play('siren'); }
    if (B.t <= 0) {
      B.stage = 2; B.t = 26; play('blow');
      ents.forEach(e => {
        if (!e.alive || e === P || sheltered(e.x, e.y) || safeFromBlow(e)) return;
        if (chance(e.kind === 'dog' ? 0.5 : 0.6)) { e.hp = 0; kill(e, 'blow'); }
      });
    }
  } else if (B.stage === 2) {
    B.t -= dt; WX.red = lerp(WX.red, 1, dt * 2); shake(2);
    if (chance(dt * 1.5)) WX.flash = 0.8;
    if (P.alive && !sheltered(P.x, P.y)) { P.hp -= 9 * dt; S.rad = Math.min(100, S.rad + 1.5 * dt); hurtFlash = Math.max(hurtFlash, 0.25); if (P.hp <= 0) kill(P, 'blow'); }
    if (B.t <= 0) {
      B.stage = 0; B.next = S.min + rnd(1440, 2400);
      ents.forEach(e => { if (e.trip && e.trip.shelter) e.trip.stage = 2; });
      let born = 0;
      ARTS0.forEach(a => {
        if (!S.flags['art_' + a.key] || arts.some(x => x.key === a.key)) return;
        delete S.flags['art_' + a.key];
        arts.push(Object.assign({}, a, { x: a.x + rnd(-10, 10), y: a.y + rnd(-10, 10) })); born++;
      });
      radioNews('Выброс закончился.' + (born ? ' В аномалиях наверняка родились новые артефакты.' : ''), true);
    }
  } else WX.red = Math.max(0, WX.red - dt * 0.3);
}

/* ---------- отрисовка атмосферы ---------- */
function drawCloudShadows() {
  if (WX.cloud < 0.2 || (P && inBunker(P.x, P.y))) return;
  WX.clouds.forEach(c => {
    const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.2, c.x, c.y, c.r);
    g.addColorStop(0, 'rgba(0,0,0,' + (WX.cloud * 0.22) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
  });
}
function drawBubbles(inView) {
  ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
  for (const e of ents) {
    if (!e.alive || !e.bub || !inView(e.x, e.y, 120)) continue;
    if (HOUSES.some(h => h.a > 0.5 && e.x > h.x * T && e.x < (h.x + h.w) * T && e.y > h.y * T && e.y < (h.y + h.h) * T)) continue;
    const t = e.bub.t, w = ctx.measureText(t).width + 12, a = clamp(e.bub.life / 0.5, 0, 1), y = e.y - 34;
    const bk = 1 / ZNEAR ** (BIG ? 0.75 : 0); ctx.save(); ctx.translate(e.x, e.y - 14); ctx.scale(bk, bk); ctx.translate(-e.x, -e.y + 14);   // камера ближе — облачко той же экранной величины
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(14,18,12,0.86)'; ctx.strokeStyle = e.fac === 'bandit' ? '#a79cc4' : e.fac === 'army' ? '#6fa35c' : '#d9c25a';
    ctx.beginPath(); ctx.rect(e.x - w / 2, y - 12, w, 17); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.x - 4, y + 5); ctx.lineTo(e.x, y + 10); ctx.lineTo(e.x + 4, y + 5); ctx.fill();
    ctx.fillStyle = '#e8e0c4'; ctx.fillText(t, e.x, y); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawWeatherScreen() {
  const bunk = P && inBunker(P.x, P.y);
  if (!bunk) {
    if (WX.cloud > 0.3 || WX.rain > 0.1) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(' + Math.round(255 - WX.cloud * 45) + ',' + Math.round(255 - WX.cloud * 40) + ',' + Math.round(255 - WX.cloud * 25) + ')'; ctx.fillRect(0, 0, VW, VH); ctx.globalCompositeOperation = 'source-over'; }
    if (WX.fog > 0.05) {
      const s = [(P.x - cam.x) * Z + VW / 2, (P.y - cam.y) * Z + VH / 2];
      const g = ctx.createRadialGradient(s[0], s[1], 60 * Z, s[0], s[1], 460 * Z);
      g.addColorStop(0, 'rgba(170,176,166,' + WX.fog * 0.12 + ')'); g.addColorStop(1, 'rgba(170,176,166,' + WX.fog * 0.72 + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    const n = Math.floor(WX.rain * 240);
    while (WX.drops.length < n) WX.drops.push({ x: rnd(0, VW), y: rnd(-VH, VH), l: rnd(10, 22), v: rnd(700, 1000) });
    if (WX.drops.length > n) WX.drops.length = n;
    if (n) {
      ctx.strokeStyle = 'rgba(190,200,210,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
      const sx = WX.wind * 0.35;
      for (const d of WX.drops) {
        d.y += d.v / 60; d.x += d.v / 60 * sx;
        if (d.y > VH) { d.y = rnd(-60, 0); d.x = rnd(-100, VW); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * sx, d.y - d.l);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,210,220,0.25)';
      for (let i = 0; i < n / 8; i++) { ctx.beginPath(); ctx.ellipse(Math.random() * VW, Math.random() * VH, 3, 1.2, 0, 0, 6.28); ctx.fill(); }
    }
  }
  if (WX.red > 0.02) {
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(255,' + Math.round(255 - WX.red * 140) + ',' + Math.round(255 - WX.red * 160) + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    if (S.blow.stage === 2) { ctx.fillStyle = 'rgba(200,40,20,' + (0.12 + 0.1 * Math.sin(S.min * 14)) + ')'; ctx.fillRect(0, 0, VW, VH); }
  }
  if (WX.flash > 0 && !bunk) { ctx.fillStyle = 'rgba(235,240,255,' + WX.flash * 0.45 + ')'; ctx.fillRect(0, 0, VW, VH); }
}

/* ===================== выживание: кровь, голод, износ, присед, детектор, тайники, ранги ===================== */
const FOOD = { bread: 25, sausage: 35, cans: 45 };
const CACHES = [
  { x: 6.5, y: 60.5, loot: { money: 350, medkit: 1, a9: 20 } }, { x: 45.5, y: 47.5, loot: { a545: 40, antirad: 1 } },
  { x: 108.5, y: 100.5, loot: { grenade: 2, cans: 2, money: 200 } }, { x: 21.5, y: 25.5, loot: { art_blood: 1, vodka: 1 } },
  { x: 112.5, y: 40.5, loot: { a12: 16, bandage: 3, money: 500 } }, { x: 52.5, y: 98.5, loot: { ar_bandit: 1, sausage: 2 } }
];
function survDefaults() {
  if (S.food === undefined) S.food = 90;
  if (S.bleed === undefined) S.bleed = 0;
  S.cond = S.cond || { w_pm: 85, w_obrez: 75, w_aksu: 80 };
  S.caches = S.caches || {};
  if (S.rankSeen === undefined) S.rankSeen = rankOf(score());
}
function ensureCaches() {
  CACHES.forEach((c, i) => {
    if (objs.some(o => o.cacheId === i)) return;
    objs.push({ k: 'cache', cacheId: i, x: c.x * T, y: c.y * T, loot: S.caches[i] === 2 ? {} : Object.assign({}, S.flags['cache_contents_'+i] || c.loot), name: 'Тайник' });
  });
}
function revealCache(fromName, idx) {
  const free = CACHES.map((c, i) => i).filter(i => !S.caches[i]);
  if (!free.length) return;
  const i = idx != null && free.includes(idx) ? idx : free[ri(0, free.length - 1)];
  S.caches[i] = 1;
  const c = CACHES[i];
  bulletin('В КПК ' + (fromName ? fromName : 'покойника') + ' нашлись координаты тайника. Метка на карте.');
}
const cond = id => (S.cond[id] === undefined ? 80 : S.cond[id]);
function wearAndJam(id) {
  const W = WP[id]; if (!W || W.melee) return false;
  S.cond[id] = Math.max(0, cond(id) - (W.auto ? 0.07 : W.pellets ? 0.35 : 0.15));
  const c = cond(id);
  if (c < 65 && chance((65 - c) / 500)) { P.jam = 1; play('jam'); msg('Заклинило! ' + (IN.touch ? 'Жми «Перезар.»,' : 'Жми R,') + ' чтобы передёрнуть.', 'bad'); return true; }
  return false;
}
function survival(dt) {
  survDefaults();
  // голод
  S.food = Math.max(0, S.food - dt * 0.065);
  if (S.food < 20 && !S.flags.hungryMsg) { S.flags.hungryMsg = 1; msg('Ты голоден. Съешь что-нибудь из рюкзака.', 'bad'); }
  if (S.food >= 30) S.flags.hungryMsg = 0;
  if (S.food <= 0) P.hp -= 0.12 * dt;
  // кровотечение
  if (S.bleed > 0) {
    P.hp -= S.bleed * 0.55 * dt;
    P.bleedT = (P.bleedT || 0) - dt;
    if (P.bleedT <= 0) { P.bleedT = 0.6; decals.push({ x: P.x + rnd(-6, 6), y: P.y + rnd(-6, 6), r: rnd(1.5, 3), a: 0.7 }); }
  }
  // детектор артефактов
  let bd = 1e9;
  for (const a of arts) { const d = dst(P.x, P.y, a.x, a.y); if (d < bd) bd = d; }
  P.detT = (P.detT || 0) - dt;
  if (bd < 280 && P.detT <= 0 && !inBunker(P.x, P.y)) { P.detT = 0.12 + (bd / 280) * 1.2; play('beep', undefined, undefined, 0.5 + (1 - bd / 280) * 0.8); }
  P.detD = bd;
  // ранг
  const r = rankOf(score());
  if (r > S.rankSeen) { S.rankSeen = r; news('Ранг повышен: ' + RANKS[r] + '.'); }
  // тайники рядом
}
function cacheNear() {
  let best = null, bd = 44;
  for (const o of objs) if (o.k === 'cache' && S.caches[o.cacheId] === 1 && Object.keys(o.loot).length) { const d = dst(P.x, P.y, o.x, o.y); if (d < bd && los(P.x,P.y,o.x,o.y)) { bd = d; best = o; } }
  return best;
}
function drawCaches() {
  for (const o of objs) {
    if (o.k !== 'cache' || S.caches[o.cacheId] !== 1 || !Object.keys(o.loot).length) continue;
    if (ART) { artCache(o); continue; }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 4, 9, 5, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#5a4a30'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 8, 7, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#3a2e1c'; ctx.fillRect(o.x - 2, o.y - 9, 4, 4);
    const p = 0.5 + 0.5 * Math.sin(S.min * 5); ctx.fillStyle = 'rgba(220,170,80,' + (0.3 + p * 0.4) + ')'; ctx.fillRect(o.x - 2, o.y - 16, 4, 4);
  }
}

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

/* ===================== Кордон+: заказы, напарники, костёр, сигналы SOS, кровосос ===================== */
/* все места берутся из справочника локаций (gloc.js) */
const SOS_SPOTS = locAnchors('sos').map(a => [a.x, a.y, a.loc]);
const CLEAR_SPOTS = locAnchors('clear').map(a => [a.x, a.y, 'у ' + LOC[a.loc].gen, a.loc]);
const SUCKER_HOME = locPt('lair', 'sucker');
const TALES = [
  'Был у нас один, Чижом звали. Нашёл «Каплю», обрадовался, сунул за пазуху и пошёл в бар хвастать. Неделю потом не мог согреться, хоть водкой отпаивай. Артефакт без контейнера носить — себя не уважать.',
  'Говорят, если ночью у насыпи слышишь, как кто-то зовёт по имени, не оборачивайся. Мой напарник обернулся. Нашли его ботинки, а самого нет.',
  'Сидорович, думаешь, жадный? Жадный. Но в долг даёт, если видит, что вернёшься. Мне в первую ходку аптечку дал, сказал: «Помрёшь — с тебя спишу».',
  'Вояки под мостом раньше за бутылку пропускали. Потом прапорщика сменили, теперь деньги подавай. Зона меняется, люди тоже.',
  'Слепой пёс глаз не имеет, а ты для него как фонарь. Чуют страх, честное слово. Стой спокойно, стреляй в первого, остальные дрогнут.',
  'Был тут один умник, хотел болт в «Трамплин» кинуть, чтобы посмотреть, как летает. Болт вернулся. Прямо в лоб. Шишка неделю держалась, зато теперь он аккуратный.',
  'Кабан в Зоне не тот, что в лесу дома. Он не убегает. Видишь, землю роет — отходи вбок, по прямой он быстрее тебя.',
  'Я как-то тайник нашёл, а в нём записка: «Брат, оставь хоть патроны». Оставил. Через месяц в том же месте нашёл аптечку и тушёнку. Тут так принято.',
  'После выброса небо ещё час красное. Старики говорят, в это время артефакты сами светятся. Только лезть туда рано, аномалии злые.',
  'Хлев за фермой на северо-востоке обходи. Оттуда наши не возвращаются, а Хомяк говорит, что видел там, как воздух сам по себе дышит.'
];
const RUMOR_FLAVOR = ['Сталкер наклоняется ближе и шепчет координаты.', 'Под водку язык развязался: он рассказал про чужой схрон.', 'Он чертит палкой на земле, где лежит заначка покойного товарища.'];

function plusDefaults() {
  if (!S.jobs) S.jobs = { offer: [], day: -1, act: null, done: 0, seq: 0 };
  if (S.jobs.seq == null) S.jobs.seq = 0;
  if (!S.sos) S.sos = { next: null, act: null };
  if (!S.dyn) S.dyn = { v: 0, seq: 0, npcs: [] };
  if (!S.q3) S.q3 = { sucker: 0 };
}
let plusInit = false;
function plusSounds() {
  if (plusInit) return; plusInit = true;
  SND.sucker = v => { tn(90, 55, 0.6, 0.22 * v, 'sawtooth', 0); tn(140, 70, 0.5, 0.1 * v, 'square', 0.05); nz(0.5, 500, 1.5, 0.12 * v, 'lowpass'); };
  SND.breath = v => { nz(0.9, 380, 1, 0.06 * v, 'lowpass'); };
}

/* ---------- заказы Сидоровича ----------
   у заказа есть id и статус: offered → active → rewarded | cancelled.
   группа зачистки помечена jobTag = id заказа; прогресс идёт только от своей группы. */
function jobGen(day) {
  let seed = day * 7919 + 13; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = [];
  const pool = ['hunt', 'trophy', 'art', 'clear', 'hunt2'];
  let guard = 0;
  while (out.length < 3 && guard++ < 50) {
    const k = pool[Math.floor(r() * pool.length)];
    if (out.some(o => o.t === k)) continue;
    let j = null;
    if (k === 'hunt') { const n = 3 + Math.floor(r() * 3); j = { k: 'hunt', kind: 'dog', n: n, got: 0, pay: n * 160, n_: 'Отстрел: слепые псы ×' + n, d: 'Псы обнаглели, к самому бункеру подходят. Перебей ' + n + ' штук где угодно на Кордоне. Засчитываются твои выстрелы и выстрелы нанятого напарника.' }; }
    if (k === 'hunt2') { const n = 1 + Math.floor(r() * 2); j = { k: 'hunt', kind: 'boar', n: n, got: 0, pay: n * 420, n_: 'Отстрел: кабаны ×' + n, d: 'Кабаны за насыпью разбивают тропу. Завали ' + n + '. Засчитываются твои выстрелы и выстрелы нанятого напарника.' }; }
    if (k === 'trophy') { const it = r() < 0.5 ? 'tail' : 'hoof', n = it === 'tail' ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2); j = { k: 'trophy', item: it, n: n, pay: ITEMS[it].sell * 2 * n, n_: 'Трофеи: ' + ITEMS[it].n + ' ×' + n, d: 'Заказчик из-за кордона платит вдвое против обычного: ' + ITEMS[it].sell * 2 + ' RU за штуку вместо ' + ITEMS[it].sell + '. Принеси ' + n + ' шт.' }; }
    if (k === 'art') j = { k: 'art', pay: 0, n_: 'Любой артефакт', d: 'Клиенту всё равно какой, лишь бы светился. Плачу в полтора раза больше обычной цены. Какой отдать, выберешь сам.' };
    if (k === 'clear') { const okSp = CLEAR_SPOTS.filter(clearReachable); if (!okSp.length) continue; const sp = okSp[Math.floor(r() * okSp.length)]; j = { k: 'clear', loc: sp[3], x: sp[0], y: sp[1], where: sp[2], n: 3, got: 0, pay: 1100, n_: 'Зачистка: бандиты ' + sp[2], d: 'Там встала группа бандитов и трясёт новичков. Убери всех троих. Неважно, кто их добьёт: важно, чтобы группы не стало.' }; }
    j.t = k; out.push(j);
  }
  return out;
}
/* цель зачистки: на проходимой клетке, достижима пешком от деревни (с учётом закрытого моста) */
function clearReachable(sp) { const f = freeTile(sp[0], sp[1]); const v = LOC.village ? locPt('village', 'safe') : FIRE; return Math.hypot(f.x - sp[0], f.y - sp[1]) < 2.5 && !nearAnom(f.x * T, f.y * T, 30) && !!findPath(v.x, v.y, f.x * T, f.y * T); }
function jobOffers() {
  const day = Math.floor((S.min - 360) / 1440);
  if (S.jobs.day !== day) { S.jobs.day = day; S.jobs.offer = jobGen(day + (S.jobs.done || 0) * 31); }
  return S.jobs.offer;
}
const artIds = () => Object.keys(S.inv).filter(id => id.indexOf('art_') === 0 && S.inv[id] > 0);
const artFree = id => cnt(id) - S.belt.filter(b => b === id).length;
function jobReady(j) {
  if (!j || j.status !== 'active') return false;
  if (j.k === 'hunt' || j.k === 'clear') return j.got >= j.n;
  if (j.k === 'trophy') return cnt(j.item) >= j.n;
  if (j.k === 'art') return artIds().length > 0;
  return false;
}
function jobTake(j) {
  const a = JSON.parse(JSON.stringify(j));
  a.id = 'c' + (++S.jobs.seq); a.status = 'active'; a.taken = S.min;
  S.jobs.act = a;
  S.jobs.offer = S.jobs.offer.filter(o => o !== j);
  if (a.k === 'clear') spawnClear(a);
  bulletin('Заказ взят: ' + a.n_ + '.');
}
function spawnClear(j) {
  const have = ents.filter(e => e.alive && e.jobTag === j.id).length;
  for (let i = have; i < j.n - j.got; i++) {
    const p = freeTile(j.x + (i - 1) * 1.2, j.y + (i % 2) * 1.2);
    const e = mkHuman({ fac: 'bandit', x: p.x, y: p.y, wpn: i === 0 ? 'w_obrez' : 'w_pm' });
    e.jobTag = j.id; e.uid = dynId(); e.home = { x: p.x * T, y: p.y * T }; e.stay = 1; ents.push(e);
  }
}
/* отменённая/закрытая группа становится обычными бандитами: больше не связана с заказом */
function releaseGroup(id) { ents.forEach(e => { if (e.jobTag === id) { e.jobTag = 0; e.stay = 0; e.uid = null; } }); }
function jobCancel() {
  const j = S.jobs.act; if (!j) return;
  j.status = 'cancelled'; releaseGroup(j.id); S.jobs.act = null; S.rep -= 2;
  bulletin('Заказ отменён: ' + j.n_ + '.');
}
function jobTurnIn(artId) {
  const j = S.jobs.act;
  if (!j || j.status !== 'active' || !jobReady(j)) return false;
  let pay = j.pay;
  if (j.k === 'art') {
    const id = artId || artIds().find(x => artFree(x) > 0) || artIds()[0];
    if (!id || !cnt(id)) return false;
    pay = artPay(id);
    if (artFree(id) <= 0) { const i = S.belt.indexOf(id); if (i >= 0) S.belt.splice(i, 1); }
    take(id, 1);
  }
  if (j.k === 'trophy') take(j.item, j.n);
  j.status = 'rewarded'; S.jobs.act = null;          // сначала закрываем, потом платим: повторная сдача невозможна
  if (j.k === 'clear') releaseGroup(j.id);
  S.money += pay; S.jobs.done = (S.jobs.done || 0) + 1; S.rep += 4; S.stats.q++;
  if (S.jobs.done % 5 === 0) { give('medkit', 2); give('grenade', 1); sys('Премия за постоянство: аптечка ×2, граната.'); }
  say(['Вот это я понимаю, работа. Держи.', 'Без обмана. Деньги твои.', 'Нормально. Заходи ещё, заказы будут.'][S.jobs.done % 3]);
  sys('Получено: ' + pay + ' RU. Заказ выполнен.'); bulletin('Заказ выполнен, получено ' + pay + ' RU.'); save(true);
  return true;
}
const artPay = id => Math.round(sellPrice(id) * 1.5 / 10) * 10;
function jobOpts() {
  const o = [];
  const j = S.jobs.act;
  if (j) {
    if (j.k === 'art' && jobReady(j)) {
      artIds().forEach(id => {
        const onBelt = artFree(id) <= 0;
        const sure = panel && panel.artSure === id;
        o.push({ t: 'Сдать: ' + ITEMS[id].n + ' · ' + artPay(id) + ' RU' + (onBelt ? (sure ? ' · снять с пояса, подтверждаю' : ' · надет на пояс') : ''), k: onBelt ? 'bad' : 'key', fn: () => {
          if (onBelt && !sure) { panel.artSure = id; sys('«' + ITEMS[id].n + '» висит на поясе. Нажми ещё раз, чтобы снять и сдать.'); return; }
          panel.artSure = null; jobTurnIn(id);
        } });
      });
    } else if (jobReady(j)) o.push({ t: 'Сдать заказ: ' + j.n_ + ' · ' + j.pay + ' RU', k: 'key', fn: () => jobTurnIn() });
    else o.push({ t: 'Как там мой заказ?', fn: () => say('«' + j.n_ + '». ' + jobProgress(j) + ' Не тяни.') });
    o.push({ t: 'Отказаться от заказа', k: 'bad', fn: () => { jobCancel(); say('Ну и ладно. Найду другого.'); } });
  } else {
    const L = jobOffers();
    if (!L.length) o.push({ t: 'Есть заказы?', fn: () => say('На сегодня всё разобрали. Завтра приходи.') });
    L.forEach(x => o.push({ t: 'Заказ: ' + x.n_ + (x.pay ? ' · ' + x.pay + ' RU' : ' · ×1,5 от цены'), fn: () => { say(x.d); jobTake(x); } }));
  }
  return o;
}
function jobProgress(j) {
  if (j.k === 'hunt' || j.k === 'clear') return 'Сделано ' + Math.min(j.got, j.n) + ' из ' + j.n + '.';
  if (j.k === 'trophy') return 'С собой ' + cnt(j.item) + ' из ' + j.n + '.';
  return 'Артефакта при тебе нет.';
}
function freeTile(x, y) {
  for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const tx = Math.floor(x) + dx, ty = Math.floor(y) + dy;
    if (tx > 1 && ty > 1 && tx < PW - 1 && ty < MH - 1 && nav[ty * MW + tx]) return { x: tx + 0.5, y: ty + 0.5 };
  }
  return { x: x, y: y };
}

/* ---------- напарник ---------- */
function hireOpts(e) {
  const o = [];
  if (e.named || e.robbed || e.guard || e.patrol || e.sos) return o;
  if (e.follow) {
    o.push({ t: e.wait ? 'Пошли дальше' : 'Жди здесь', fn: () => { e.wait = !e.wait; e.waitAt = e.wait ? { x: e.x, y: e.y } : null; say(e.wait ? 'Понял, держу место.' : 'Иду за тобой.'); } });
    o.push({ t: 'Свободен, спасибо', fn: () => { endHire(e, 'Бывай. Если что, я у костра.'); } });
  } else if (!ents.some(x => x.alive && x.follow)) {
    const price = 350 + (e.rank || 0) * 200;
    o.push({ t: 'Пойдёшь со мной? · ' + price + ' RU на сутки', k: 'key', d: S.money < price || S.rep < 0, fn: () => {
      S.money -= price; e.follow = 1; e.wait = 0; e.hireEnd = S.min + 1440; e.hirePaid = price; setCampSeat(e, false); e.trip = null; if (!e.uid) e.uid = dynId();
      say(['Деньги вперёд, это правильно. Веди, только под пули зря не подставляй.', 'Сутки мои. Спину прикрою, но в аномалии за тобой не полезу.', 'Договорились. Скажешь ждать — буду ждать.'][e.seed % 3]);
      sys(e.name + ' идёт с тобой до ' + clockStr(e.hireEnd) + '.'); news('Нанят напарник: ' + e.name + '.');
    } });
  }
  return o;
}
function endHire(e, line) {
  e.follow = 0; e.wait = 0; e.waitAt = null;
  e.home = { x: FIRE.x + rnd(-60, 60), y: FIRE.y + rnd(-40, 40) }; e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
  if (!e.sid) e.uid = null;
  if (line) say(line);
}
const offCam = o => Math.abs(o.x - cam.x) > VW / 2 / Z + 48 || Math.abs(o.y - cam.y) > VH / 2 / Z + 48;
function nearAnom(x, y, pad) { return anoms.find(a => dst(a.x, a.y, x, y) < a.r + pad) || null; }
function followTick(e, dt) {
  if (!e.follow) return false;
  if (S.min > e.hireEnd) { endHire(e); msg(e.name + ': срок вышел, я в деревню.', 'say'); news('Контракт с напарником ' + e.name + ' закончился.'); return true; }
  if (e.wait && e.waitAt) { if (dE(e, e.waitAt) > 10) goTo(e, e.waitAt.x, e.waitAt.y, 70, dt); return true; }
  const tgt = inBunker(P.x, P.y) ? { x: HATCH.x + 30, y: HATCH.y + 20 } : P;
  const d = dst(e.x, e.y, tgt.x, tgt.y);
  // догоняющий телепорт: только вне камеры, вне боя и в проверенную безопасную точку позади игрока
  if (d > 900 && !inBunker(P.x, P.y) && !(P.combatT > 0) && offCam(e)) {
    const back = VW / 2 / Z / T + 3, p = freeTile(P.x / T - Math.cos(P.ang) * back, P.y / T - Math.sin(P.ang) * back);
    if (offCam({ x: p.x * T, y: p.y * T }) && !nearAnom(p.x * T, p.y * T, 20) && findPath(p.x * T, p.y * T, P.x, P.y)) { e.x = p.x * T; e.y = p.y * T; e.path = null; }
    return true;
  }
  const an = nearAnom(e.x, e.y, 26);
  if (an) { steer(e, e.x + (e.x - an.x), e.y + (e.y - an.y), 110, dt); return true; }   // в известную аномалию не идёт
  if (d > 70) goTo(e, tgt.x, tgt.y, d > 220 ? 125 : 88, dt);
  else e.ang += angD(e.ang, P.ang) * Math.min(1, dt * 2);
  return true;
}

/* ---------- время: отдых и сон проходят через одну модель ----------
   за час отдыха: сытость −2,4 (в движении −3,9); лечение +12 только без кровотечения и при сытости от 30;
   при нулевой сытости здоровье падает. Мир не симулируется покадрово: таймеры событий сверяются по S.min. */
const REST = { food: 2.4, heal: 12, starve: 7, danger: 12 };   // danger: ниже этой сытости отдых прерывается
/* одна модель и для прогноза, и для выполнения: simRest ничего не меняет, advanceWorldTime применяет её результат */
function simRest(minutes, ctx, st) {
  let food = st.food, hp = st.hp, done = 0, stop = '';
  const hours = minutes / 60;
  for (let i = 0; i < Math.ceil(hours - 1e-9); i++) {
    const part = Math.min(1, hours - i);
    if (food - REST.food * part < REST.danger) { stop = 'hunger'; break; }
    const fed = food >= 30;
    food = Math.max(0, food - REST.food * part);
    if (food <= 0) hp -= REST.starve * part;
    else if (fed && !st.bleed) hp += REST.heal * part * (ctx === 'sleep' ? 1.5 : 1);
    done += part * 60;
  }
  return { minutes: done, food: food, hp: clamp(hp, 1, 100), stop: stop, asked: minutes, healed: hp > st.hp };
}
function restPreview(h, ctx) { return simRest(h * 60, ctx || 'rest', { food: S.food, hp: P.hp, bleed: S.bleed }); }
const fmtH = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return (h ? h + ' ч' : '') + (mm ? (h ? ' ' : '') + mm + ' мин' : '') || '0 мин'; };
/* подпись кнопки: что будет на самом деле */
function restLabel(verb, minutes, ctx) {
  const r = simRest(minutes, ctx, { food: S.food, hp: P.hp, bleed: S.bleed });
  const real = r.minutes < minutes - 0.5;
  return verb + ' ' + fmtH(minutes) + (real ? ' → прервётся через ' + fmtH(r.minutes) + ' (голод)' : '') +
    ' · сытость ' + (Math.round(S.food * 10) / 10) + '→' + (Math.round(r.food * 10) / 10) + ', здоровье ' + Math.round(P.hp) + '→' + Math.round(r.hp) +
    (!r.healed && r.minutes > 0 && S.food < 30 ? ' (голодным не лечишься)' : '');
}
function restBlock(h) {
  if (S.bleed > 0) return 'Сначала останови кровь: перевяжись или используй аптечку.';
  if (S.food < REST.danger + REST.food) return 'Слишком голоден, чтобы отдыхать: сытость ' + Math.round(S.food) + '. Сначала поешь.';
  if (ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 520)) return 'Рядом враги, не до отдыха.';
  return '';
}
function advanceWorldTime(minutes, ctx) {
  const before = S.min;
  const r = simRest(minutes, ctx, { food: S.food, hp: P.hp, bleed: S.bleed });
  S.food = r.food; P.hp = r.hp; if (r.minutes > 0) P.st = 100;
  S.min += r.minutes;
  cleanExpiredCrates();
  renewFieldCrates();
  const stop = r.stop === 'hunger' ? 'Отдых прерван через ' + fmtH(r.minutes) + ': голод стал опасным (сытость ' + (Math.round(S.food * 10) / 10) + '). Поешь, потом отдыхай.' : '';
  const done = r.minutes;
  // события, у которых прошёл срок, закрываются сразу и честно
  plusDefaults();
  if (S.sos.act && S.min > S.sos.act.until) finishEncounter('timeout');
  ents.forEach(e => { if (e.alive && e.follow && S.min > e.hireEnd) { endHire(e); news('Контракт с напарником ' + e.name + ' закончился, пока ты отдыхал.'); } });
  if (S.blow && S.blow.stage === 0 && S.blow.next < S.min) S.blow.next = S.min + 5;   // выброс не пропускается целиком
  return { from: before, to: S.min, minutes: done, stop: stop };
}

/* ---------- костёр ---------- */
function fireTeller() {
  let b = null, bd = 200;
  for (const e of ents) if (e.alive && e.kind === 'human' && e.fac === 'loner' && !e.follow && !e.sos && dst(e.x, e.y, FIRE.x, FIRE.y) < bd) { bd = dst(e.x, e.y, FIRE.x, FIRE.y); b = e; }
  return b;
}
function nearestFreeCache(x, y) {
  let b = -1, bd = 1e12;
  CACHES.forEach((c, i) => { if (S.caches[i]) return; const d = (c.x * T - x) ** 2 + (c.y * T - y) ** 2; if (d < bd) { bd = d; b = i; } });
  return b;
}
function restOpts(te) {
  const o = [], blk = restBlock();
  [1, 3].forEach(h => {
    o.push({ t: restLabel('Отдохнуть', h * 60, 'rest'), d: !!blk, fn: () => {
      const b2 = restBlock(); if (b2) { sys(b2); return; }
      const r = advanceWorldTime(h * 60, 'rest');
      if (r.minutes > 0) say(te ? TALES[(S.flags.tale * 7 + h) % TALES.length] : 'Огонь греет, руки перестали дрожать.');
      sys((r.minutes > 0 ? 'Прошло ' + fmtH(r.minutes) + '. Сейчас ' + clockStr(S.min) + '. ' : '') + (r.stop || '')); save(true);
    } });
  });
  if (blk) o.push({ t: blk, d: true, fn: () => {} });
  return o;
}
function restAtFire() {
  if (ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 520)) { msg('Рядом враги, не до посиделок.', 'bad'); return; }
  const te = fireTeller();
  S.flags.tale = ((S.flags.tale || 0) + 1);
  let ti = (S.flags.tale * 3 + Math.floor(S.min / 60)) % TALES.length; if (ti === S.flags.lastTale) ti = (ti + 1) % TALES.length; S.flags.lastTale = ti;
  const tale = TALES[ti];
  const card = te ? cardOf(te) : meCard();
  dialog(card, [te ? tale : 'У костра никого. Только треск поленьев и далёкий вой за насыпью.'], () => {
    const o = restOpts(te);
    const ci = nearestFreeCache(P.x, P.y);
    if (te && has('vodka') && ci >= 0) o.push({ t: 'Налить ему водки и расспросить про ближайший схрон', k: 'key', fn: () => {
      const i = nearestFreeCache(P.x, P.y); if (i < 0) { say('Да всё уж растащили, брат.'); return; }
      take('vodka', 1); say(RUMOR_FLAVOR[S.flags.tale % RUMOR_FLAVOR.length]); revealCache(te.name, i);
    } });
    else if (te && has('vodka')) o.push({ t: 'Про схроны спрашивать без толку: всё уже открыто', d: true, fn: () => {} });
    if (te) o.push({ t: 'Спросить, что слышно', fn: () => say(LORE[(S.flags.tale * 5 + 3) % LORE.length]) });
    o.push({ t: 'Подняться', close: 1 });
    return o;
  }, 'dialog', te);
}

/* ---------- сигналы SOS: один жизненный цикл ----------
   active → finishEncounter(helped | self | dead | timeout | lost). Любой исход снимает метки, пишет журнал, убирает маркер. */
const SOS_FIRST = 150, SOS_GAP = [240, 360], SOS_TIME = 150, SOS_HOLD = 50;
/* Фазы нападающих (без заморозки, восприятие NPC не выключается):
   prep — идут к своей точке кольца (точки проверены путём точка→группа);
   siege — люди сидят в точке и редко стреляют на подавление, псы кружат у точки и не лезут;
          раненый нападающий сам переходит в штурм;
   storm — обычный бой (по времени SOS_HOLD, при приближении игрока или после его попадания);
   retreat — последний из 3–4 нападающих уходит, событие закрывается. Таймаут — только запасной исход. */
function finishEncounter(reason) {
  const a = S.sos.act; if (!a) return;
  const call = radioQueue.findIndex(note => note.k === 'radio');
  if (call >= 0) radioQueue.splice(call, 1);
  const allies = ents.filter(e => e.alive && e.sos === a.id), foes = ents.filter(e => e.alive && e.sosFoe === a.id);
  const lead = a.names && a.names[0] || (allies[0] && allies[0].name) || 'сталкеров';
  if (reason === 'helped' && !a.rewarded) {
    a.rewarded = 1;
    if (a.pk > 0 || S.flags.sosAssist === a.id) {
      for (const e of allies) if (e.uid) S.flags['sosFriend_' + e.uid] = 1;
    }
    const pay = a.pay, gift = a.gift;
    S.money += pay; give(gift, gift === 'a545' ? 30 : 1); S.rep += 8;
    if (allies[0]) msg(allies[0].name + ': — Спасибо, брат! Без тебя бы не выбрались.', 'say');
    msg('Благодарность: ' + pay + ' RU, ' + ITEMS[gift].n + '.', 'good');
    bulletin('Отбили группу ' + lead + ' у ' + a.where + '. Одиночки это запомнят.');
    S.sos.saved = (S.sos.saved || []).concat([{ name: lead, t: S.min, where: a.where }]).slice(-10);
  } else if (reason === 'self') bulletin('Группа ' + lead + ' у ' + a.where + ' отбилась сама.');
  else if (reason === 'dead') bulletin('Сигнал SOS пропал. Группа ' + lead + ' у ' + a.where + ' погибла.');
  else if (reason === 'timeout') news('Связь с группой ' + lead + ' у ' + a.where + ' потеряна. Чем кончилось, неизвестно.');
  else if (reason === 'lost') news('Сигнал SOS из старой записи не восстановлен. Событие закрыто без последствий.');
  allies.forEach(e => { e.sos = 0; if (reason === 'helped' || reason === 'self') { e.resident = 1; e.rescuedAt = S.min; } else e.uid = null; e.stay = 0; e.home = { x: FIRE.x + rnd(-60, 60), y: FIRE.y + rnd(-40, 40) }; e.trip = { x: e.home.x, y: e.home.y, stage: 2 }; });
  foes.forEach(e => { e.sosFoe = 0; e.uid = null; e.stay = 0; e.sosPhase = null; e.home = { x: e.x, y: e.y }; });
  delete S.flags.sosAssist;
  S.sos.last = { reason: reason, where: a.where, t: S.min };
  S.sos.act = null; S.sos.next = S.min + rnd(SOS_GAP[0], SOS_GAP[1]);
}
function sosTick() {
  const s = S.sos;
  if (s.act) {
    const a = s.act;
    const allies = ents.filter(e => e.alive && e.sos === a.id);
    const foes = ents.filter(e => e.alive && e.sosFoe === a.id);
    if (dst(P.x, P.y, a.x * T, a.y * T) < 560) a.seen = 1;
    // осада: нападающие держат кольцо и постреливают, штурм через SOS_HOLD секунд или когда игрок рядом/их ранили
    if (!a.storm && (S.min > a.start + SOS_HOLD || a.pk > 0 || foes.some(e => e.hitByP || dE(e, P) < 420))) { a.storm = 1; foes.forEach(e => sosStorm(e, a)); }
    if (a.storm && !a.retreat && foes.length === 1 && (a.nFoes || 3) >= 3 && allies.length) { a.retreat = 1; const e = foes[0], ang = Math.atan2(e.y - a.y * T, e.x - a.x * T); e.sosPhase = 'retreat'; const f = freeTile(a.x + Math.cos(ang) * 22, a.y + Math.sin(ang) * 22); e.retreatTo = { x: f.x * T, y: f.y * T }; msg('Нападающий отходит.', 'say'); }
    // вне зоны обновления ИИ (далеко от игрока) бой не симулируется покадрово: исход решается расчётом
    const far = o => Math.abs(o.x - P.x) > 1400 && Math.abs(o.y - P.y) > 1400;
    if (allies.length && foes.length && S.min > a.start + SOS_HOLD + 25 && allies.concat(foes).every(far) && !a.offRes) {
      a.offRes = 1;
      const aHP = allies.reduce((s, e) => s + e.hp, 0), fHP = foes.reduce((s, e) => s + e.hp * (e.kind === 'dog' ? 0.8 : 1.2), 0);
      const roll = hash2(a.start | 0, (a.x * 7) | 0);    /* 0..1, воспроизводимо от события */
      const alliesWin = roll < aHP / (aHP + fHP);
      (alliesWin ? foes : allies).forEach(e => kill(e, null));
      if (alliesWin) allies.forEach(e => { e.hp = Math.max(10, e.hp * 0.6); });
      return;
    }
    if (!allies.length) finishEncounter('dead');
    else if (!foes.length) finishEncounter(a.pk > 0 || S.flags.sosAssist === a.id || dst(P.x, P.y, a.x * T, a.y * T) < 420 ? 'helped' : 'self');
    else if (S.min > a.until) finishEncounter('timeout');
    return;
  }
  if (!S.flags.intro || inBunker(P.x, P.y)) return;
  if (s.next == null) s.next = S.min + SOS_FIRST;
  if (S.min < s.next) return;
  // только точки, до которых игрок реально может дойти (север закрыт, пока не пройден мост)
  const spots = SOS_SPOTS.filter(p => { const d = dst(p[0] * T, p[1] * T, P.x, P.y); if (d < 600 || d > 2600) return false; const f = freeTile(p[0], p[1]); if (ents.some(e => e.alive && (e.fac === 'bandit' || e.fac === 'mutant') && !e.sosFoe && dst(e.x, e.y, f.x * T, f.y * T) < 700)) return false; return !!findPath(P.x, P.y, f.x * T, f.y * T); });   /* не рядом с уже живущими врагами */
  if (!spots.length) { s.next = S.min + 30; return; }
  const sp = spots[ri(0, spots.length - 1)], id = 's' + (++S.jobs.seq);
  const dog = chance(0.5), where = dirName(sp[0], sp[1]);
  const c = freeTile(sp[0], sp[1]);
  const names = [], allies0 = [];
  for (let i = 0; i < 2; i++) { const p = freeTile(c.x + i * 1.2, c.y + 0.6); const e = mkHuman({ fac: 'loner', x: p.x, y: p.y, wpn: chance(0.6) ? 'w_pm' : 'w_obrez' }); e.sos = id; e.uid = dynId(); e.stay = 1; e.home = { x: p.x * T, y: p.y * T }; allies0.push(e); ents.push(e); names.push(e.name); }
  // точки кольца: ~13,5 клетки от группы, путь точка→группа обязателен и не длиннее 32 клеток
  const ring = [], a0 = rnd(0, 6.28);
  for (let k = 0; k < 12 && ring.length < 4; k++) {
    const ang = a0 + k * 0.9, f = freeTile(c.x + Math.cos(ang) * 13.5, c.y + Math.sin(ang) * 13.5);   // за дальностью дневного зрения NPC (400 px)
    const pth = findPath(f.x * T, f.y * T, c.x * T, c.y * T);
    if (pth && pth.length <= 32 && !ring.some(r => Math.hypot(r.x - f.x, r.y - f.y) < 3)) ring.push(f);
  }
  if (!ring.length) { allies0.forEach(e => { const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); }); s.next = S.min + 30; return; }
  const nF = dog ? 4 : 3;
  for (let i = 0; i < nF; i++) {
    const rp = ring[i % ring.length], st = freeTile(rp.x + Math.cos(a0) * 5, rp.y + Math.sin(a0) * 5);
    const e = dog ? mkDog({ pack: 'sos', x: st.x, y: st.y }) : mkHuman({ fac: 'bandit', x: st.x, y: st.y, wpn: chance(0.6) ? 'w_pm' : 'w_obrez' });
    e.sosFoe = id; e.uid = dynId(); e.ringPt = { x: rp.x * T + rnd(-12, 12), y: rp.y * T + rnd(-12, 12) }; e.home = { x: e.ringPt.x, y: e.ringPt.y }; e.sosPhase = 'prep'; e.stay = 1; e.supT = rnd(2, 4); ents.push(e);
  }
  s.act = { id: id, loc: sp[2] || locNear(sp[0], sp[1]).id, x: c.x, y: c.y, where: where, until: S.min + SOS_TIME, start: S.min, dog: dog ? 1 : 0, names: names, pk: 0, seen: 0, nFoes: dog ? 4 : 3, pay: ri(25, 55) * 10, gift: ['medkit', 'a545', 'antirad', 'grenade', 'cans'][ri(0, 4)] };
  radioNews('SOS! Сталкеры у ' + where + ': «' + (dog ? 'Псы окружили, патроны кончаются!' : 'Бандиты прижали, нужна помощь!') + '»');
  play('siren', undefined, undefined, 0.25);
}
function dirName(x, y) { return locNear(x, y).gen; }
function sosStorm(e, a) { e.sosPhase = null; e.stay = 0; e.crouch = 0; e.home = { x: a.x * T, y: a.y * T }; }
/* поведение нападающего SOS до штурма; true — кадр обработан здесь */
function sosFoeAI(e, dt) {
  const a = S.sos.act;
  if (!a || e.sosFoe !== a.id) { e.sosPhase = null; return false; }
  if ((e.hitByP || e.hp < e.maxhp * 0.5) && e.sosPhase !== 'retreat') { sosStorm(e, a); return false; }   // ранил игрок или тяжело ранен — отвечает сам
  const c = { x: a.x * T, y: a.y * T };
  if (e.sosPhase === 'retreat') {
    goTo(e, e.retreatTo.x, e.retreatTo.y, 130, dt);
    if (dst(e.x, e.y, c.x, c.y) > 560 || dst(e.x, e.y, e.retreatTo.x, e.retreatTo.y) < 20) { e.sosFoe = 0; e.uid = null; e.sosPhase = null; e.stay = 0; e.home = { x: e.x, y: e.y }; }
    return true;
  }
  if (e.sosPhase === 'prep') {
    if (goTo(e, e.ringPt.x, e.ringPt.y, e.kind === 'dog' ? 120 : 95, dt) < 22) e.sosPhase = 'siege';
    return true;
  }
  if (e.sosPhase === 'siege') {
    const ang = Math.atan2(c.y - e.y, c.x - e.x);
    if (e.kind === 'dog') {
      e.orb = (e.orb || rnd(0, 6.28)) + dt * 0.5;
      steer(e, e.ringPt.x + Math.cos(e.orb) * 20, e.ringPt.y + Math.sin(e.orb) * 20, 55, dt);
      e.ang += angD(e.ang, ang) * Math.min(1, dt * 3);
      if (chance(dt * 0.15)) play('dog', e.x, e.y, 0.4);
    } else {
      if (dst(e.x, e.y, e.ringPt.x, e.ringPt.y) > 14) goTo(e, e.ringPt.x, e.ringPt.y, 70, dt);
      e.crouch = 1; e.supT -= dt;
      const tg = ents.find(o => o.alive && o.sos === a.id && dE(o, e) < 520 && los(e.x, e.y, o.x, o.y));
      if (tg) { const ta = Math.atan2(tg.y - e.y, tg.x - e.x); e.ang += angD(e.ang, ta) * Math.min(1, dt * 4);
        if (e.supT <= 0 && Math.abs(angD(e.ang, ta)) < 0.2) { e.supT = rnd(2.8, 4.5); const W0 = WP[e.wpn] || WP.w_pm, W = Object.assign({}, W0, { dmg: W0.dmg * 0.3 }); fire(e, e.ang, W, 0.3); /* подавление: в основном мимо и не насмерть до штурма */ play(W.snd || 'p', e.x, e.y, 0.7); } }
      else e.ang += angD(e.ang, ang) * Math.min(1, dt * 2);
    }
    return true;
  }
  return false;
}

/* ---------- смена версии карты ----------
   если сохранение сделано на другой mapVersion, координаты событий пересчитываются по id локаций,
   а игрок и динамические NPC ставятся на ближайшую проходимую клетку у безопасного якоря. */
function remapToMap() {
  const from = S.mapVersion || 'kordon-0.6';
  if (from === MAP_VERSION) return;
  // копия исходного сохранения до миграции (MIGRATION.md)
  try { localStorage.setItem(KEY + '-backup-' + from, JSON.stringify(S)); } catch (e) {}
  S.migratedFrom = from;
  const j = S.jobs && S.jobs.act;
  if (j && j.k === 'clear') { const c = CLEAR_SPOTS.find(c => c[3] === j.loc) || CLEAR_SPOTS.find(c => c[2] === j.where); if (c) { j.loc = c[3]; j.x = c[0]; j.y = c[1]; j.where = c[2]; } }
  const a = S.sos && S.sos.act;
  if (a) { const sp = SOS_SPOTS.find(p => p[2] === a.loc) || SOS_SPOTS.find(p => 'у ' + LOC[p[2]].gen === 'у ' + a.where); if (sp) { const f = freeTile(sp[0], sp[1]); a.x = f.x; a.y = f.y; a.loc = sp[2]; } }
  if (BIG) { fog.fill(0); fogDirty = true; S.fog = ''; }   // старая маска разведки не совпадает с новой картой
  const big = BIG && from === 'kordon-rc1';
  (S.dyn && S.dyn.npcs || []).forEach(r => { if (big) { const q = RMp(r.x, r.y); r.x = q[0]; r.y = q[1]; } const f = freeTile(r.x / T, r.y / T); r.x = f.x * T; r.y = f.y * T; });
  if (!inBunker(S.x, S.y)) {
    const safe = LOC.village && LOC.village.anchors.safe ? locPt('village', 'safe') : null;
    const f = freeTile(S.x / T, S.y / T);
    // при смене карты игрок переносится в безопасную точку деревни (не в новую стену и не в аномалию)
    if (big) { const q = RMp(S.x, S.y), g = freeTile(q[0] / T, q[1] / T); S.x = g.x * T; S.y = g.y * T; }
    else if (MAP_ID === 'rc1' && safe) { S.x = safe.x; S.y = safe.y; } else { S.x = f.x * T; S.y = f.y * T; }
  }
  if (P) { P.x = S.x; P.y = S.y; if (typeof cam !== 'undefined') { cam.x = P.x; cam.y = P.y; } }   // игрок уже создан spawnWorld до миграции
  news('Карта обновлена (' + from + ' → ' + MAP_VERSION + '). Деньги, вещи и задания сохранены; места заданий пересчитаны' + (big ? '. Кордон стал больше: ты на том же месте, карту КПК придётся открыть заново. Копия старого сохранения оставлена.' : MAP_ID === 'rc1' ? ', тебя перенесли к костру деревни. Копия старого сохранения оставлена.' : '.'));
  S.mapVersion = MAP_VERSION;
}

/* ---------- живой мир в сохранении ----------
   S.dyn.npcs — снимок динамических людей/зверей (напарник, участники SOS, группа заказа).
   Ссылки (tgt) не пишем; базовые NPC с sid переопределяются, без sid создаются заново. */
const DYN_VER = 2;
function dynId() { S.dyn = S.dyn || { v: 0, seq: 0, npcs: [] }; return 'u' + (++S.dyn.seq); }
function dynSnapshot() {
  plusDefaults(); S.mapVersion = MAP_VERSION;
  S.dyn.v = DYN_VER;
  S.dyn.npcs = ents.filter(e => e.alive && e !== P && (e.follow || e.sos || e.sosFoe || e.jobTag || e.traded || e.resident)).map(e => ({
    uid: e.uid || (e.uid = dynId()), sid: e.sid || null, kind: e.kind, fac: e.fac, name: e.name, wpn: e.wpn, rank: e.rank,
    x: e.x, y: e.y, hp: e.hp, maxhp: e.maxhp, mag: e.mag,
    follow: e.follow ? 1 : 0, wait: e.wait ? 1 : 0, waitAt: e.waitAt || null, hireEnd: e.hireEnd || 0, hirePaid: e.hirePaid || 0,
    sos: e.sos || 0, sosFoe: e.sosFoe || 0, jobTag: e.jobTag || 0, stay: e.stay ? 1 : 0, home: e.home,
    sosPhase: e.sosPhase || null, ringPt: e.ringPt || null, traded: e.traded ? 1 : 0, resident: e.resident ? 1 : 0, inv: e.traded ? e.inv : undefined, money: e.traded ? e.money : undefined, wcond: e.traded ? e.wcond : undefined, rescuedAt: e.rescuedAt
  }));
}
function dynRestore() {
  plusDefaults();
  const v = S.dyn.v || 0;
  remapToMap();
  // миграция старых сохранений (0.6): заказ без id, SOS без участников
  if (v < DYN_VER) {
    const j = S.jobs.act;
    if (j && !j.id) { j.id = 'c' + (++S.jobs.seq); j.status = 'active'; }
    if (S.sos.act && !S.dyn.npcs.length) { finishEncounter('lost'); }
    if (S.sos.t != null && S.sos.next == null) { S.sos.next = S.min + SOS_FIRST; delete S.sos.t; }
    S.dyn.v = DYN_VER;
  }
  const seen = new Set();
  (S.dyn.npcs || []).forEach(r => {
    if (seen.has(r.uid)) return; seen.add(r.uid);
    let e = r.sid ? ents.find(x => x.sid === r.sid && x.alive) : null;
    if (r.sid && !e) return;                                   // базовый NPC мёртв — не воскрешаем
    if (!e) {
      if (r.kind === 'dog') e = mkDog({ pack: 'sos', x: r.x / T, y: r.y / T });
      else e = mkHuman({ fac: r.fac, x: r.x / T, y: r.y / T, wpn: r.wpn, rank: r.rank, name: r.name });
      ents.push(e);
    }
    Object.assign(e, { uid: r.uid, x: r.x, y: r.y, hp: r.hp, maxhp: r.maxhp || e.maxhp, follow: r.follow, wait: r.wait, waitAt: r.waitAt, hireEnd: r.hireEnd, hirePaid: r.hirePaid,
      sos: r.sos, sosFoe: r.sosFoe, jobTag: r.jobTag, stay: r.stay, home: r.home || { x: r.x, y: r.y }, traded: r.traded, resident: r.resident, rescuedAt: r.rescuedAt, sosPhase: r.sosPhase, ringPt: r.ringPt });
    if (S.flags.angry && S.flags.angry[r.sid || r.uid]) e.angry = 1;
    if (r.traded) { if (r.inv) e.inv = r.inv; if (r.money != null) e.money = r.money; if (r.wcond) e.wcond = r.wcond; }
    if (r.name) e.name = r.name;
    if (r.mag != null) e.mag = r.mag;
    if (e.follow) { e.sit = 0; e.trip = null; }
  });
  // заказ без живой группы (старое сохранение) — досоздать остаток, без повтора уже убитых
  const j = S.jobs.act;
  if (j && j.k === 'clear' && j.status === 'active' && j.got < j.n) spawnClear(j);
  // SOS без участников после загрузки — закрыть честно, без штрафа
  const a = S.sos.act;
  if (a && !ents.some(e => e.alive && (e.sos === a.id || e.sosFoe === a.id))) finishEncounter('lost');
}

/* ---------- кровосос ---------- */
function mkSucker() {
  return { id: nextId++, kind: 'sucker', sid: 'sucker', fac: 'mutant', name: 'Кровосос', x: SUCKER_HOME.x, y: SUCKER_HOME.y, r: 12, hp: 560, maxhp: 560,
    ang: 0, alive: 1, cool: 0, think: 0, home: { x: SUCKER_HOME.x, y: SUCKER_HOME.y }, kx: 0, ky: 0, flash: 0, step: 0, cloak: 1, state: 'lurk', st: 0, hp0: 560, breathT: 2 };
}
function aiSucker(e, dt) {
  e.cool -= dt; e.st -= dt; e.think -= dt; e.breathT -= dt;
  if (e.hp < e.hp0 - 1) { const lost = e.hp0 - e.hp; e.hp0 = e.hp; e.dmgAcc = (e.dmgAcc || 0) + lost; e.cloak = Math.min(e.cloak, 0.35); if (e.dmgAcc > 110 && e.state !== 'flee') { e.state = 'flee'; e.st = 1.8; e.dmgAcc = 0; play('sucker', e.x, e.y, 0.8); } }
  const want = e.state === 'strike' ? 0 : 1;
  e.cloak += (want - e.cloak) * Math.min(1, dt * (want ? (e.state === 'flee' ? 2.2 : 0.9) : 6));
  // признаки невидимки: следы в пыли, брызги на воде, короткое искажение (рисуется в drawSucker)
  e.printT = (e.printT || 0) - dt;
  if (e.cloak > 0.5 && e.printT <= 0 && (e.state === 'stalk' || e.state === 'flee' || e.wander)) {
    e.printT = 0.35; const side = (e.pr = !e.pr) ? 1 : -1, px = e.x + Math.cos(e.ang + 1.57) * 4 * side, py = e.y + Math.sin(e.ang + 1.57) * 4 * side;
    if (tAt(Math.floor(e.x / T), Math.floor(e.y / T)) === SW) for (let i = 0; i < 4; i++) parts.push({ x: e.x, y: e.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: 0.5, c: '#9fb4b8', s: 2 });
    else decals.push({ x: px, y: py, r: 2.2, a: 0.55, burn: 1 });
    if (decals.length > 400) decals.splice(0, decals.length - 400);
  }
  if (e.breathT <= 0) { e.breathT = rnd(3, 6); if (e.state !== 'lurk' || dE(e, P) < 300) play('breath', e.x, e.y, 0.9); }
  if (e.think <= 0) {
    e.think = 0.3;
    if (!e.tgt || !e.tgt.alive || dE(e, e.tgt) > 650) {
      e.tgt = null;
      for (const o of ents) if (o.alive && o.kind === 'human' && o.fac !== 'trader' && !o.captive && !inBunker(o.x, o.y) && dE(e, o) < (night() ? 420 : 260) && los(e.x, e.y, o.x, o.y)) { e.tgt = o; break; }
      if (e.tgt && e.state === 'lurk') { e.state = 'stalk'; play('sucker', e.x, e.y, 0.6); }
    }
  }
  const t = e.tgt;
  if (!t || e.state === 'lurk') {
    e.state = 'lurk'; e.idleT = (e.idleT || 0) - dt;
    if (e.idleT <= 0) { e.idleT = rnd(3, 7); const a = rnd(0, 6.28); e.wander = { x: e.home.x + Math.cos(a) * rnd(10, 70), y: e.home.y + Math.sin(a) * rnd(10, 60) }; }
    if (dE(e, e.home) > 500) goTo(e, e.home.x, e.home.y, 90, dt);
    else if (e.wander) { steer(e, e.wander.x, e.wander.y, 40, dt); if (dst(e.x, e.y, e.wander.x, e.wander.y) < 10) e.wander = null; }
    return;
  }
  const a = Math.atan2(t.y - e.y, t.x - e.x), d = dE(e, t);
  if (e.state === 'flee') {
    steer(e, e.x - Math.cos(a) * 80, e.y - Math.sin(a) * 80, 150, dt);
    if (e.st <= 0) { e.state = 'stalk'; e.cool = 1; }
    return;
  }
  if (e.state === 'stalk') {
    e.ang += angD(e.ang, a) * Math.min(1, dt * 5);
    const side = Math.sin(S.min * 0.9 + e.id) * 0.9;
    if (d > 120) goTo(e, t.x + Math.cos(a + 1.57) * side * 70, t.y + Math.sin(a + 1.57) * side * 70, 135, dt);
    else steer(e, t.x, t.y, 175, dt);
    if (d < 46 && e.cool <= 0) { e.state = 'strike'; e.st = 0.35; play('sucker', e.x, e.y, 1); }
    return;
  }
  if (e.state === 'strike') {
    e.ang = a; steer(e, t.x, t.y, 60, dt);
    if (e.st <= 0) {
      if (d < 50) {
        hurt(t, rnd(18, 26), e, a);
        if (t === P) { S.bleed = Math.min(3, (S.bleed || 0) + 1); msg('Тебя схватили! Кровотечение.', 'bad'); }
        e.hp = Math.min(e.maxhp, e.hp + 15); e.hp0 = e.hp;
      }
      e.cool = rnd(1.2, 2); e.state = chance(0.45) ? 'flee' : 'stalk'; e.st = 1.2;
    }
  }
}
function drawSucker(e) {
  const vis = 0.07 + (1 - e.cloak) * 0.93;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.cloak > 0.5) {
    // мерцание: воздух дрожит
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(S.min * 40 + e.id);
    ctx.strokeStyle = 'rgba(220,230,240,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(Math.sin(S.min * 9 + i) * 2, Math.cos(S.min * 7 + i) * 2, 9 + i * 3, 0.3 * i, 0.3 * i + 2.4); ctx.stroke(); }
  }
  ctx.globalAlpha = vis;
  if (G3_READY()) {   // кадры G3: та же видимость/мерцание; в невидимой фазе тень не рисуется
    ctx.restore(); ctx.save();
    const ok = g3Draw(e, { opacity: vis, shadow: e.cloak < 0.5 });
    ctx.restore();
    if (ok) { ctx.globalAlpha = 1; return; }   // только после успешного кадра; иначе — прежняя отрисовка
    ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = vis;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 4, 14, 9, e.ang, 0, 6.28); ctx.fill();
  ctx.rotate(e.ang);
  const ph = e.step * 0.25;
  ctx.strokeStyle = '#5d4a44'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(2, s * 8); ctx.lineTo(12 + Math.sin(ph + s) * 3 + (e.state === 'strike' ? 8 : 0), s * 13); ctx.stroke(); });
  ctx.fillStyle = e.flash > 0 ? '#f0e0d8' : '#6e5852'; ctx.beginPath(); ctx.ellipse(-2, 0, 10, 11, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#5a4640'; ctx.beginPath(); ctx.ellipse(-5, 0, 5, 9, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = e.flash > 0 ? '#f0e0d8' : '#7d6660'; ctx.beginPath(); ctx.ellipse(9, 0, 6, 5.5, 0, 0, 6.28); ctx.fill();
  ctx.strokeStyle = '#8a5a55'; ctx.lineWidth = 1.6;
  for (let i = -1.5; i <= 1.5; i++) { ctx.beginPath(); ctx.moveTo(13, i * 1.6); ctx.quadraticCurveTo(17, i * 2.5 + Math.sin(S.min * 30 + i) * 2, 20 + (e.state === 'strike' ? 4 : 0), i * 3); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,60,40,' + (0.5 + (1 - e.cloak) * 0.5) + ')'; ctx.fillRect(10, -3, 2, 1.6); ctx.fillRect(10, 1.4, 2, 1.6);
  ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  ctx.restore(); ctx.globalAlpha = 1;
}
function suckerTick() {
  if (S.q3.sucker >= 1 && S.q3.sucker < 3 && !S.dead.sucker && !ents.some(e => e.kind === 'sucker')) ents.push(mkSucker());
}

/* ---------- общий тик и хуки ---------- */
function plusTick(dt) {
  plusDefaults(); plusSounds();
  for (const e of ents) if (e.follow && e.alive && e.tgt && !e.tgt.alive) e.tgt = null;
  S._plusT = (S._plusT || 0) - dt;
  if (S._plusT > 0) return;
  S._plusT = 1;
  sosTick(); suckerTick(); cluesTick();
}
function plusKill(e, src) {
  plusDefaults();
  const byMe = src === P || (src && src.follow);
  const j = S.jobs.act;
  if (j && j.status === 'active') {
    if (j.k === 'hunt' && byMe && e.kind === j.kind) { j.got++; bulletin('Заказ: ' + Math.min(j.got, j.n) + ' из ' + j.n + (j.got >= j.n ? '. Возвращайся к Сидоровичу.' : '.')); }
    if (j.k === 'clear' && e.jobTag === j.id) { j.got++; if (j.got >= j.n) { bulletin('Заказ: бандиты ' + j.where + ' уничтожены. Возвращайся к Сидоровичу.'); } }
  }
  const a = S.sos.act;
  if (a && e.sosFoe === a.id && byMe) a.pk = (a.pk || 0) + 1;
  if (e.kind === 'sucker') { S.q3.sucker = 2; bulletin('Кровосос в хлеву убит. Возвращайся к Волку.'); }
  if (e.follow) { bulletin('Погиб напарник ' + e.name + '.'); }
}
function plusInteract(cand) {
  const d = dst(P.x, P.y, FIRE.x, FIRE.y);
  if (d < 50 && !inBunker(P.x, P.y)) cand(d - 25, { k: 'rest', label: 'Посидеть у костра' });
  interactRC1(cand);
}
function plusTargets(out) {
  plusDefaults();
  targetsRC1(out);
  const a = S.sos.act; if (a) out.push({ qid: 'sos', x: a.x * T, y: a.y * T, n: 'SOS: помочь сталкерам у ' + a.where });
  const j = S.jobs.act;
  if (j && j.k === 'clear' && j.got < j.n) out.push({ qid: 'job', x: j.x * T, y: j.y * T, n: 'Зачистка ' + j.where });
  if (j && jobReady(j)) { const p = locPt('sid', inBunker(P.x, P.y) ? 'trader' : 'hatch'); out.push({ qid: 'job', x: p.x, y: p.y, n: 'Сдать заказ Сидоровичу' }); }
  if (S.q3.sucker === 1) out.push({ qid: 'sucker', x: SUCKER_HOME.x, y: SUCKER_HOME.y, n: 'Хлев за фермой' });
  if (S.q3.sucker === 2) { const w = byS('wolf'); if (w) out.push({ qid: 'sucker', x: w.x, y: w.y, n: 'Вернуться к Волку' }); }
}
function plusQList(L) {
  plusDefaults();
  const j = S.jobs.act;
  if (j) L.push({ id: 'job', loc: j.loc || 'sid', n: 'Заказ: ' + j.n_, d: j.d + ' ' + (jobReady(j) ? 'Готово, сдай Сидоровичу.' : jobProgress(j)), st: 'a' });
  if (S.q3.sucker) L.push({ id: 'sucker', loc: 'lair', n: 'Ночной гость', d: S.q3.sucker === 1 ? 'В хлеву за фермой на северо-востоке пропадают люди. Волк просит разобраться. Тварь невидима, пока не кинется: следи, где дрожит воздух.' : S.q3.sucker === 2 ? 'Тварь убита. Вернись к Волку за наградой.' : 'Выполнено. Деревня скинулась на награду.', st: S.q3.sucker === 3 ? 'd' : 'a' });
  qListRC1(L);
  if (S.sos.act) L.push({ id: 'sos', loc: S.sos.act.loc, n: 'Сигнал SOS', d: 'Сталкеры у ' + S.sos.act.where + ' просят помощи. Успей, пока их не добили.', st: 'a' });
}
function wolfPlusOpts() {
  plusDefaults();
  const o = wolfRC1Opts();
  if (S.q.flash >= 2 && S.q3.sucker === 0) o.push({ t: 'Говорят, люди пропадают?', fn: () => {
    say('Пропадают. Двое наших пошли к старому хлеву за фермой, на северо-востоке, и с концами. Хомяк клянётся, что видел там, как воздух сам по себе дышит. Сходи, только не ночью. Принесёшь доказательство, что тварь мертва, деревня скинется: две тысячи и аптечки.');
    S.q3.sucker = 1; bulletin('Задание: Ночной гость. Хлев за фермой на северо-востоке.');
  } });
  if (S.q3.sucker === 2) o.push({ t: 'С тварью в хлеву покончено', k: 'key', fn: () => {
    S.money += 2000; give('medkit', 3); S.q3.sucker = 3; S.stats.q++; S.rep += 15;
    say('Сам ходил смотреть: лежит. Ну и мерзость. Держи, как обещали, и спасибо от всей деревни.');
    sys('Получено: 2000 RU, Аптечка ×3. Задание выполнено.'); bulletin('Выполнено: Ночной гость.'); save(true);
  } });
  return o;
}

/* ===================== окна этапа B: диалог, КПК, рюкзак, торговля =====================
   Отдельная разметка для каждого окна внутри общего оверлея. Графика панелей пока CSS;
   какие растровые части нужны — см. qa/ASSETS_MISSING.md. */

/* ---------- общие ---------- */
const condOf = id => (WP[id] && !WP[id].melee ? Math.round(S.cond[id] == null ? 80 : S.cond[id]) : null);
function itemCell(id, opt) {
  opt = opt || {};
  const c = el('button', 'icell' + (opt.sel ? ' sel' : '') + (opt.on ? ' on' : '') + (opt.dim ? ' dim' : ''));
  c.type = 'button';
  c.appendChild(itemIcon(id));
  if (opt.q > 1) c.appendChild(el('span', 'bd', String(opt.q)));
  if (opt.price != null) c.appendChild(el('span', 'pr', opt.price + ''));
  const cd = opt.cond != null ? opt.cond : null;
  if (cd != null) { const b = el('i', 'cnd' + (cd < 35 ? ' bad' : cd < 65 ? ' mid' : '')); b.style.width = cd + '%'; c.appendChild(b); }
  c.setAttribute('aria-label', (id === 'knife' ? 'Нож' : ITEMS[id].n) + (opt.q > 1 ? ', ' + opt.q + ' шт.' : '') + (opt.price != null ? ', ' + opt.price + ' RU' : ''));
  if (opt.why) { c.appendChild(el('span', 'why', opt.why)); c.title = opt.why; c.setAttribute('aria-label', c.getAttribute('aria-label') + ', ' + opt.why); }
  if (opt.fn) c.addEventListener('click', e => { e.stopPropagation(); opt.fn(); });
  if (opt.disabled) c.disabled = true;
  return c;
}
const itemName = id => id === 'knife' ? 'Нож' : ITEMS[id].n;
const itemW = id => id === 'knife' ? 0.3 : (ITEMS[id].w || 0);

/* ---------- диалог: компактный портрет + реплики + варианты ---------- */
function drawDialog2() {
  const box = el('div', 'dlg');
  const side = el('div', 'dlg-who');
  const c = panel.card;
  side.appendChild(portraitFor(c));
  side.appendChild(el('div', 'pn', c.n));
  side.appendChild(el('div', 'pm', [c.rank, c.grp].filter(Boolean).join(' · ')));
  if (c.att) side.appendChild(el('div', 'pa' + (/враг/.test(c.att) ? ' foe' : /друг|свой/.test(c.att) ? ' pal' : ''), c.att));
  if (c.money !== undefined) side.appendChild(el('div', 'price', c.money + ' RU'));
  box.appendChild(side);
  const main = el('div', 'dlg-main');
  const L = el('div', 'dlg-lines');
  panel.lines.slice(-5).forEach(l => L.appendChild(el('p', l.s, (l.s === 'npc' ? '— ' : l.s === 'me' ? '› ' : '') + l.t)));
  main.appendChild(L);
  const O = el('div', 'dlg-opts');
  panel.opts().forEach((o, i) => O.appendChild(btn((o.k || '') + ' opt', (i + 1) + '. ' + o.t, () => {
    if (o.close) { closePanel(); if (o.fn) o.fn(); return; }
    panel.lines.push({ s: 'me', t: o.t });
    o.fn();
    if (panel && (panel.kind === 'dialog' || panel.kind === 'trader')) { refresh(); const ln = pbody.querySelector('.dlg-lines'); if (ln) ln.scrollTop = ln.scrollHeight; }
  }, o.d)));
  main.appendChild(O);
  box.appendChild(main);
  pbody.appendChild(box);
}

/* ---------- КПК: карта ~65% + выбранное задание ~35%, вкладки снизу ---------- */
const PDA_TABS2 = [['map', 'Карта и задания'], ['log', 'Журнал'], ['stat', 'Данные']];
function drawPda2() {
  if (panel.tab !== 'map') { drawPda(); return; }
  if (!panel.f) panel.f = { ppl: 1, cache: 1, loc: 1 };
  const all = qList(), act = all.filter(q => q.st === 'a'), done = all.filter(q => q.st !== 'a');
  if (!panel.qsel || !all.some(q => q.id === panel.qsel)) panel.qsel = S.trackedQuestId || (act[0] && act[0].id) || null;
  const box = el('div', 'kpk');
  // карта: масштаб ×1…×4 от «вся карта влезает», по умолчанию ×2 вокруг игрока
  const mapc = el('div', 'kpk-map');
  if (panel.zl == null) { panel.zl = 2; panel.focus = 'me'; }
  const selT = qTargets().filter(t => t.qid === panel.qsel);
  const bar = el('div', 'kpk-bar');
  bar.appendChild(btn('chip zb', '−', () => { panel.zl = Math.max(1, panel.zl - 1); refresh(); }, panel.zl <= 1));
  bar.appendChild(el('span', 'zl', '×' + panel.zl));
  bar.appendChild(btn('chip zb', '+', () => { panel.zl = Math.min(4, panel.zl + 1); refresh(); }, panel.zl >= 4));
  bar.appendChild(btn('chip', 'К игроку', () => { panel.focus = 'me'; if (panel.zl < 2) panel.zl = 2; refresh(); }));
  bar.appendChild(btn('chip', 'К цели', () => { panel.focus = 'target'; if (panel.zl < 2) panel.zl = 2; refresh(); }, !selT.length));
  [['ppl', 'Люди'], ['cache', 'Тайники'], ['loc', 'Подписи']].forEach(f => bar.appendChild(btn('chip' + (panel.f[f[0]] ? ' on' : ''), f[1], () => { panel.f[f[0]] = !panel.f[f[0]]; refresh(); })));
  mapc.appendChild(bar); markScrollX(bar);
  const w = el('div', 'mapwrap kpk-wrap'), cv2 = el('canvas'); cv2.id = 'bigmap';
  w.appendChild(cv2); mapc.appendChild(w);
  const focusPt = () => {
    const p = panel.focus === 'target' && selT[0] ? selT[0] : P;
    return inBunker(p.x, p.y) ? HATCH : p;
  };
  requestAnimationFrame(() => {
    if (!cv2.isConnected) return;
    const fit = Math.min(w.clientWidth / PW, w.clientHeight / MH);      // ×1: вся карта влезает
    const cover = Math.max(w.clientWidth / PW, w.clientHeight / MH);    // заполняет панель целиком
    const k = panel.zl === 1 ? fit : Math.max(fit * panel.zl, cover * (1 + 0.45 * (panel.zl - 2)));
    const cssW = Math.round(PW * k), cssH = Math.round(MH * k);
    const dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.min(2600 / cssW, dpr);
    cv2.width = Math.round(cssW * px); cv2.height = Math.round(cssH * px);
    cv2.style.width = cssW + 'px'; cv2.style.height = cssH + 'px';
    const out = {};
    drawMapTo(cv2.getContext('2d'), cv2.width / PW, panel.f.loc, { ppl: panel.f.ppl, cache: panel.f.cache, sel: selT, u: px, out: out });
    panel.mapLabels = out.labels;
    const f = focusPt();
    w.scrollLeft = f.x / (PW * T) * cssW - w.clientWidth / 2; w.scrollTop = f.y / (MH * T) * cssH - w.clientHeight / 2;
  });
  mapc.appendChild(mapLegend());
  box.appendChild(mapc);
  // задания
  const qc = el('div', 'kpk-q');
  if (!all.length) qc.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
  const list = el('div', 'kpk-list');
  act.forEach(q => {
    const b = btn('qrow' + (q.id === panel.qsel ? ' sel' : '') + (q.id === S.trackedQuestId ? ' trk' : '') + (q.id === 'sos' ? ' sos' : ''), '', () => { panel.qsel = q.id; refresh(); });
    b.appendChild(el('span', 'qm', q.id === S.trackedQuestId ? '◆' : q.id === 'sos' ? '!' : '◇'));
    b.appendChild(el('span', 'qt', q.n));
    list.appendChild(b);
  });
  if (done.length) {
    const d = el('details', 'kpk-done'); d.appendChild(el('summary', '', 'Завершённые (' + done.length + ')'));
    done.forEach(q => d.appendChild(el('div', 'qdone' + (q.st === 'f' ? ' fail' : ''), q.n + (q.st === 'f' ? ' · провалено' : ' · выполнено'))));
    list.appendChild(d);
  }
  const q = all.find(x => x.id === panel.qsel);
  if (q) {
    const dt = el('div', 'kpk-detail');
    dt.appendChild(el('div', 'nm', q.n));
    const where = q.loc && LOC[q.loc] ? LOC[q.loc].name : '';
    const t = selT[0];
    if (where || t) dt.appendChild(el('div', 'ds lite', [where, t ? t.n + ' · ' + Math.round(dst(P.x, P.y, t.x, t.y) / T * 1.5) + ' м' : ''].filter(Boolean).join(' — ')));
    dt.appendChild(el('div', 'ds', q.d));
    if (q.st === 'a') dt.appendChild(btn(q.id === S.trackedQuestId ? 'go on' : 'go', q.id === S.trackedQuestId ? 'Отслеживается' : 'Отслеживать', () => { S.trackedQuestId = q.id; refresh(); }, q.id === S.trackedQuestId));
    qc.appendChild(dt);
  }
  qc.appendChild(list);
  box.appendChild(qc);
  pbody.appendChild(box);
}

/* ---------- рюкзак: снаряжение | сетка | описание со сравнением ---------- */
function drawInv2() {
  const box = el('div', 'inv3');
  // снаряжение
  const eq = el('div', 'inv-eq');
  { const who = el('div', 'tr-who'); who.appendChild(portraitFor(meCard())); const t = el('div'); t.appendChild(el('div', 'pn', 'Меченый')); t.appendChild(el('div', 'price', RANKS[rankOf(score())])); who.appendChild(t); eq.appendChild(who); }
  const slot = (label, id, onTap) => { const s = el('div', 'slot'); s.appendChild(el('span', 'sl', label)); s.appendChild(id ? itemCell(id, { on: 1, cond: condOf(id), sel: panel.sel === id, fn: () => { panel.sel = id; refresh(); } }) : el('div', 'icell empty')); return s; };
  eq.appendChild(slot('В руках', S.weapon));
  eq.appendChild(slot('Костюм', S.armor));
  const belt = el('div', 'slot beltslot'); belt.appendChild(el('span', 'sl', 'Пояс'));
  const br = el('div', 'beltrow');
  for (let i = 0; i < 3; i++) { const id = S.belt[i]; br.appendChild(id ? itemCell(id, { on: 1, sel: panel.sel === id, fn: () => { panel.sel = id; refresh(); } }) : el('div', 'icell empty')); }
  belt.appendChild(br); eq.appendChild(belt);
  const wt = weight(), st = el('div', 'inv-stats');
  const wb = el('div', 'wbar'); const wi = el('i'); wi.style.width = Math.min(100, wt / MAXW * 100) + '%'; if (wt > MAXW) wb.classList.add('over'); wb.appendChild(wi);
  st.appendChild(el('div', 'ds', 'Вес ' + wt + ' / ' + MAXW + ' кг')); st.appendChild(wb);
  st.appendChild(el('div', 'ds', 'Защита ' + Math.round(def() * 100) + '% · Радиация ' + Math.round(S.rad)));
  st.appendChild(el('div', 'ds', 'Сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '') + ' · ' + S.money + ' RU'));
  eq.appendChild(st);
  box.appendChild(eq);
  // сетка
  const gw = el('div', 'inv-grid');
  const ids = ['knife'].concat(Object.keys(S.inv).filter(id => ITEMS[id] && S.inv[id] > 0));
  const g = el('div', 'igrid');
  ids.forEach(id => g.appendChild(itemCell(id, { q: id === 'knife' ? 1 : cnt(id), cond: condOf(id), sel: panel.sel === id, on: S.weapon === id || S.armor === id || beltCount(id) > 0, fn: () => { panel.sel = id; panel.hint = ''; refresh(); } })));
  const pad = Math.max(0, 24 - ids.length); for (let i = 0; i < pad; i++) g.appendChild(el('div', 'icell empty'));
  gw.appendChild(g); box.appendChild(gw);
  // описание
  const dv = el('div', 'inv-detail');
  const id = panel.sel;
  if (!id || (id !== 'knife' && !has(id))) dv.appendChild(el('p', 'note', 'Выбери вещь. Артефакты вешаются на пояс, до трёх штук. Оружие в руках меняется по кругу кнопкой на HUD.'));
  else {
    const it = id === 'knife' ? { n: 'Нож', w: 0.3 } : ITEMS[id];
    dv.appendChild(el('div', 'nm', it.n + (cnt(id) > 1 ? ' ×' + cnt(id) : '')));
    const rows = el('div', 'cmp');
    const line = (k, v, d) => { const r = el('div', 'cr'); r.appendChild(el('span', 'ck', k)); r.appendChild(el('span', 'cv', v)); if (d) r.appendChild(el('span', 'cd ' + (d > 0 ? 'up' : 'dn'), (d > 0 ? '+' : '') + d)); rows.appendChild(r); };
    if (WP[id]) {
      const W = WP[id], C = WP[S.weapon], same = S.weapon === id;
      line('Урон', W.dmg + (W.pellets ? '×' + W.pellets : ''), same ? 0 : Math.round(W.dmg * (W.pellets || 1) - C.dmg * (C.pellets || 1)));
      if (!W.melee) { line('Магазин', W.mag, same || C.melee ? 0 : W.mag - C.mag); line('Дальность', W.range, same || C.melee ? 0 : W.range - C.range); line('Состояние', condOf(id) + '%'); }
      if (!same) rows.appendChild(el('div', 'ds lite', 'Сравнение с тем, что в руках: ' + itemName(S.weapon)));
    } else if (it.armor) {
      const cur = ITEMS[S.armor] ? ITEMS[S.armor].armor : 0;
      line('Защита', Math.round(it.armor * 100) + '%', S.armor === id ? 0 : Math.round((it.armor - cur) * 100));
    }
    if (FOOD[id]) line('Сытость', '+' + FOOD[id]);
    if (it.heal) line('Лечение', '+' + it.heal);
    if (ARTFX[id]) rows.appendChild(el('div', 'ds', ARTFX[id]));
    line('Вес', (Math.round(itemW(id) * Math.max(1, cnt(id)) * 100) / 100) + ' кг');
    dv.appendChild(rows);
    if (it.d) dv.appendChild(el('div', 'ds lite', it.d));
    const row = el('div', 'btnrow');
    if (WP[id] && S.weapon !== id) row.appendChild(btn('go', 'Взять в руки', () => { setWeapon(id); refresh(); }));
    if (it.armor && S.armor !== id) row.appendChild(btn('go', 'Надеть', () => { S.armor = id; refresh(); }));
    if (it.heal !== undefined || it.rad !== undefined || FOOD[id]) row.appendChild(btn('go', FOOD[id] ? 'Съесть' : 'Применить', () => { useItem(id); refresh(); }));
    if (ARTFX[id]) row.appendChild(btn('go', beltCount(id) ? 'Снять с пояса' : 'На пояс', () => {
      if (beltCount(id)) S.belt.splice(S.belt.indexOf(id), 1);
      else if (S.belt.length >= 3) panel.hint = 'Пояс занят: сначала сними другой артефакт.';
      else S.belt.push(id);
      refresh();
    }));
    if (id !== 'knife' && !it.quest && S.armor !== id && S.weapon !== id) row.appendChild(btn('wide', 'Выбросить', () => {
      const q = cnt(id); take(id, q); S.belt = S.belt.filter(b => b !== id);
      const wc = condOf(id); objs.push({ k: 'body', kind: 'sack', x: P.x + rnd(-6, 6), y: P.y + 12, ang: 0, fac: 'loner', name: 'Рюкзак', seed: 1, loot: { [id]: q }, wcond: wc != null ? { [id]: wc } : null, t: S.min });
      if (WP[id]) { delete S.cond[id]; delete S.mag[id]; }
      panel.sel = null; refresh();
    }));
    dv.appendChild(row);
  }
  box.appendChild(dv);
  pbody.appendChild(box);
  markScroll([gw, dv, eq]);
}

/* ---------- торговля: две сетки + корзина обмена + итог + подтверждение ----------
   выбор кладёт вещь в предложение, ничего не списывается до «Подтвердить». Закрытие окна отменяет предложение. */
/* состояние оружия у продавца задано заранее и видно до сделки: у Сидоровича новое (100%), у сталкера — своё, 55–85% */
const TRADER_WCOND = 100;
function stockCond(e, id) {
  if (!WP[id] || WP[id].melee) return null;
  if (!e) return TRADER_WCOND;
  e.wcond = e.wcond || {}; if (e.wcond[id] == null) e.wcond[id] = ri(55, 85); return e.wcond[id];
}
function tradeStock(e) {
  const one = id => (ITEMS[id].weapon || ITEMS[id].armor) && has(id);   // один ствол/костюм каждого типа: экземпляры не объединяются
  if (e) return Object.keys(e.inv).filter(id => e.inv[id] > 0).map(id => ({ id: id, q: 1, p: Math.ceil(ITEMS[id].price * (S.rep >= 20 ? 1.1 : 1.3)), c: one(id) ? 0 : e.inv[id], cond: stockCond(e, id) }));
  return STOCK.map(s => Object.assign({ c: (ITEMS[s.id].weapon || ITEMS[s.id].armor) ? (has(s.id) ? 0 : 1) : 99, cond: stockCond(null, s.id) }, s));
}
function sellUnit(id) { return ITEMS[id].ammo ? Math.min(10, cnt(id)) : 1; }
function tradePrice(id, e) { const c = condOf(id); return Math.max(1, Math.floor(sellPrice(id, !!e) * (c != null ? Math.max(0.3, c / 100) : 1))); }
/* почему вещь нельзя продать сейчас — короткий знак на ячейке вместо затемнения до черноты */
function sellWhy(id, e, o) {
  const it = ITEMS[id]; if (!it) return null;
  if (it.quest) return 'квест';
  if (o && o.sell[id]) return 'в корз.';
  if (id === S.weapon && WP[id] && !WP[id].melee) return 'в руках';
  if (id === S.armor) return 'надето';
  if (beltCount(id)) return 'пояс';
  if (e && (it.weapon || it.armor)) return 'не берёт';
  return null;
}
function sellable(id, e) {
  const it = ITEMS[id]; if (!it || it.quest || !(S.inv[id] > 0)) return 0;
  if (e && (it.weapon || it.armor)) return 0;
  let n = cnt(id) - beltCount(id);
  if (id === S.armor) n -= 1;
  if (id === S.weapon && WP[id] && !WP[id].melee && cnt(id) <= 1) n -= 1;
  return Math.max(0, n);
}
function offerSum(e) {
  const o = panel.offer, st = tradeStock(e);
  let buy = 0, sell = 0, w = 0;
  Object.entries(o.buy).forEach(([id, n]) => { const s = st.find(x => x.id === id); if (s) { buy += s.p * n; w += itemW(id) * s.q * n; } });
  Object.entries(o.sell).forEach(([id, n]) => { const u = ITEMS[id].ammo ? 10 : 1; sell += tradePrice(id, e) * Math.min(n * u, cnt(id)); w -= itemW(id) * Math.min(n * u, cnt(id)); });
  return { buy: buy, sell: sell, net: sell - buy, wAfter: Math.round((weight() + w) * 10) / 10 };
}
function tradeCheck(e) {
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  if (!Object.keys(o.buy).length && !Object.keys(o.sell).length) return 'Предложение пустое.';
  for (const [id, n] of Object.entries(o.buy)) { const s = st.find(x => x.id === id); if (!s || s.c < n) return 'У торговца нет столько: ' + itemName(id) + '.'; }
  for (const [id, n] of Object.entries(o.sell)) {
    const u = ITEMS[id].ammo ? 10 : 1; if (sellable(id, e) >= Math.min(n * u, cnt(id)) && cnt(id) > 0) continue;
    if (cnt(id) <= 0) return 'У тебя больше нет: ' + itemName(id) + '.';
    if (id === S.weapon) return itemName(id) + ' в руках: сначала возьми другое оружие.';
    if (id === S.armor) return itemName(id) + ' надет: сначала сними.';
    if (beltCount(id)) return itemName(id) + ' на поясе: сначала сними.';
    return 'Это нельзя продать: ' + itemName(id) + '.';
  }
  if (sm.net < 0 && S.money < -sm.net) return 'Не хватает ' + (-sm.net - S.money) + ' RU.';
  if (sm.net > 0 && e && e.money < sm.net) return 'У него не хватает денег: есть ' + e.money + ' RU.';
  if (sm.wAfter > MAXW * 1.6) return 'Столько не унести: будет ' + sm.wAfter + ' кг.';
  return '';
}
function tradeDo(e) {
  const err = tradeCheck(e); if (err) { panel.hint = err; refresh(); return; }
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  Object.entries(o.sell).forEach(([id, n]) => {
    const u = ITEMS[id].ammo ? 10 : 1, q = Math.min(n * u, cnt(id)), c = condOf(id);
    take(id, q); if (e) { e.inv[id] = (e.inv[id] || 0) + q; if (c != null) { e.wcond = e.wcond || {}; e.wcond[id] = c; } }
    if (WP[id] && !cnt(id)) { delete S.cond[id]; delete S.mag[id]; }      // проданный ствол уносит своё состояние и патроны в магазине
  });
  Object.entries(o.buy).forEach(([id, n]) => {
    const s = st.find(x => x.id === id); give(id, s.q * n);
    if (WP[id] && !WP[id].melee) { S.cond[id] = s.cond; S.mag[id] = 0; }  // купленный ствол: состояние продавца, магазин пустой
    if (e) { e.inv[id] -= n; if (e.inv[id] <= 0) { delete e.inv[id]; if (e.wcond) delete e.wcond[id]; } }
  });
  S.money += sm.net; if (e) e.money -= sm.net; if (e) e.traded = 1;   // инвентарь и деньги этого NPC теперь сохраняются
  panel.offer = { buy: {}, sell: {} }; play('pick');
  panel.hint = 'Сделка закрыта: ' + (sm.net >= 0 ? 'получено ' + sm.net : 'доплачено ' + (-sm.net)) + ' RU.' + (sm.wAfter > MAXW ? ' Перегруз: ' + sm.wAfter + ' кг.' : '');
  refresh();
}
function drawTrade2() {
  const e = panel.e;
  if (!panel.offer) panel.offer = { buy: {}, sell: {} };
  if (!panel.side) panel.side = 'their';
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  const box = el('div', 'trade2' + (panel.side === 'mine' ? ' show-mine' : ' show-their'));
  // шапка: портреты и переключатель для узкого экрана
  const head = el('div', 'tr-head');
  const me = el('div', 'tr-who'); me.appendChild(portraitFor(meCard())); const mt = el('div'); mt.appendChild(el('div', 'pn', 'Меченый')); mt.appendChild(el('div', 'price', S.money + ' RU')); me.appendChild(mt); head.appendChild(me);
  const sw = el('div', 'tr-switch');
  sw.appendChild(btn('chip' + (panel.side === 'mine' ? ' on' : ''), 'Мои вещи', () => { panel.side = 'mine'; refresh(); }));
  sw.appendChild(btn('chip' + (panel.side === 'their' ? ' on' : ''), 'Торговец', () => { panel.side = 'their'; refresh(); }));
  head.appendChild(sw);
  const th = el('div', 'tr-who r'); const c = e ? cardOf(e) : SIDCARD(); const tt = el('div'); tt.appendChild(el('div', 'pn', c.n)); tt.appendChild(el('div', 'price', e ? e.money + ' RU' : 'касса без дна')); th.appendChild(tt); th.appendChild(portraitFor(c)); head.appendChild(th);
  box.appendChild(head);
  // мои вещи
  const mine = el('div', 'tr-col mine'); mine.appendChild(el('h3', 'h3', 'Мои вещи · продать'));
  const gm = el('div', 'igrid');
  Object.keys(S.inv).filter(id => ITEMS[id] && S.inv[id] > 0).forEach(id => {
    const left = sellable(id, e) - (o.sell[id] || 0) * (ITEMS[id].ammo ? 10 : 1);
    gm.appendChild(itemCell(id, { q: cnt(id), cond: condOf(id), price: sellable(id, e) ? tradePrice(id, e) * sellUnit(id) : null, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : sellWhy(id, e, o),
      fn: () => { o.sell[id] = (o.sell[id] || 0) + 1; panel.hint = ''; refresh(); } }));
  });
  mine.appendChild(gm);
  // товар торговца
  const their = el('div', 'tr-col their'); their.appendChild(el('h3', 'h3', 'Товар · купить'));
  const gt = el('div', 'igrid');
  if (!st.length) their.appendChild(el('p', 'note', 'Ему нечего продать.'));
  st.forEach(s => { const left = s.c - (o.buy[s.id] || 0); gt.appendChild(itemCell(s.id, { q: s.q > 1 ? s.q : (e ? s.c : 0), price: s.p, cond: s.cond, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : (o.buy[s.id] ? 'в корз.' : has(s.id) ? 'есть' : 'нет'), fn: () => { o.buy[s.id] = (o.buy[s.id] || 0) + 1; panel.hint = ''; refresh(); } })); });
  their.appendChild(gt);
  // корзина
  const cart = el('div', 'tr-cart');
  const lineFor = (side, id, n) => {
    const s = side === 'buy' ? st.find(x => x.id === id) : null;
    const q = side === 'buy' ? s.q * n : Math.min(n * (ITEMS[id].ammo ? 10 : 1), cnt(id));
    const p = side === 'buy' ? s.p * n : tradePrice(id, e) * q;
    const b = btn('cline ' + side, '', () => { o[side][id]--; if (o[side][id] <= 0) delete o[side][id]; refresh(); });
    const cd = side === 'buy' ? s.cond : condOf(id);
    b.appendChild(itemIcon(id)); b.appendChild(el('span', 'cn', itemName(id) + (q > 1 ? ' ×' + q : '') + (cd != null ? ' · ' + cd + '%' : ''))); b.appendChild(el('span', 'cp', (side === 'buy' ? '−' : '+') + p)); b.setAttribute('aria-label', 'Убрать из сделки: ' + itemName(id));
    return b;
  };
  const cs = el('div', 'cside'); cs.appendChild(el('div', 'ch', 'Отдаю')); Object.entries(o.sell).forEach(([id, n]) => cs.appendChild(lineFor('sell', id, n))); if (!Object.keys(o.sell).length) cs.appendChild(el('div', 'ce', '—'));
  const cb = el('div', 'cside'); cb.appendChild(el('div', 'ch', 'Беру')); Object.entries(o.buy).forEach(([id, n]) => cb.appendChild(lineFor('buy', id, n))); if (!Object.keys(o.buy).length) cb.appendChild(el('div', 'ce', '—'));
  const cl = el('div', 'clines'); cl.appendChild(cs); cl.appendChild(cb); cart.appendChild(cl);
  const tot = el('div', 'tr-total');
  const err = tradeCheck(e);
  tot.appendChild(el('div', 'tsum', 'Отдаю ' + sm.sell + ' · беру ' + sm.buy));
  tot.appendChild(el('div', 'tnet ' + (sm.net >= 0 ? 'plus' : 'minus'), sm.net >= 0 ? 'Тебе доплатят: ' + sm.net + ' RU' : 'Доплата: ' + (-sm.net) + ' RU'));
  tot.appendChild(el('div', 'twt' + (sm.wAfter > MAXW ? ' over' : ''), 'Вес после: ' + sm.wAfter + ' / ' + MAXW + ' кг'));
  const acts = el('div', 'tr-acts');
  acts.appendChild(btn('chip', 'Сбросить', () => { panel.offer = { buy: {}, sell: {} }; panel.hint = ''; refresh(); }, !Object.keys(o.buy).length && !Object.keys(o.sell).length));
  acts.appendChild(btn('go deal', 'Подтвердить', () => tradeDo(e), !!err));
  tot.appendChild(acts);
  if (err && (Object.keys(o.buy).length || Object.keys(o.sell).length)) tot.appendChild(el('div', 'terr', err));
  cart.appendChild(tot);
  box.appendChild(mine); box.appendChild(cart); box.appendChild(their);
  pbody.appendChild(box);
  markScroll([mine, their, box.querySelector('.clines')]);
}

/* горизонтальная строка фильтров: «▶» у правого края, пока есть что прокрутить */
function markScrollX(n) {
  requestAnimationFrame(() => { if (!n.isConnected) return; n.classList.add('scrollcue-x');
    const upd = () => n.classList.toggle('more-x', n.scrollWidth - n.clientWidth - n.scrollLeft > 6);
    upd(); n.addEventListener('scroll', upd, { passive: true }); });
}
/* подсказка «▼ ещё», если содержимое прокручивается; снимается, когда долистали до конца */
function markScroll(list) {
  requestAnimationFrame(() => list.forEach(n => {
    if (!n) return; n.classList.add('scrollcue');
    const upd = () => n.classList.toggle('more', n.scrollHeight - n.clientHeight - n.scrollTop > 6);
    upd(); n.addEventListener('scroll', upd, { passive: true });
  }));
}

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

/* ===================== RC1: «Свет в деревне», улики «Ночного гостя», переход на Свалку =====================
   Состояния цепочек хранятся в S и проходят через сохранение; награды выдаются один раз (флаг rewarded). */
function q5() { if (!S.q5) S.q5 = { st: 'not_started', rewarded: 0 }; return S.q5; }
function q3c() { if (!S.q3c) S.q3c = { story: 0, tracks: 0, barn: 0, warned: 0 }; return S.q3c; }
const villageLit = () => MAP_ID === 'rc1' && S && S.q5 && S.q5.st === 'completed';

/* предметы на земле (предохранитель, канистра): не запекаются в фон, исчезают после подбора */
function rcSpawnObjs() {
  if (MAP_ID !== 'rc1') return;
  for (let i = objs.length - 1; i >= 0; i--) if (objs[i].pick) objs.splice(i, 1);   // повторный applyState (загрузка/новая игра) не дублирует предметы
  [['fuse', 'fusebox', 'pump', 'fuse'], ['fuel', 'fuelcan', 'atp', 'fuel']].forEach(([id, k, loc, an]) => {
    if (S.flags['pk_' + id]) return;
    const p = locPt(loc, an); objs.push({ k: k, pick: id, x: p.x - 9, y: p.y - 8, w: 18, h: 16 });
  });
}
function drawPick(o) {   // растр G4 (gg7.js: g7Pick); ниже — прежняя отрисовка как запасной путь
  if (g7Pick(o)) return;
  ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-7, -4, 16, 12);
  if (o.pick === 'fuel') { ctx.fillStyle = '#9b2a1c'; ctx.fillRect(-8, -7, 15, 14); ctx.fillStyle = '#5a160e'; ctx.fillRect(-4, -10, 6, 4); }
  else { ctx.fillStyle = '#c9b88a'; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-2, -6, 4, 12); }
  const t = (S.min * 2) % 1; ctx.strokeStyle = 'rgba(255,220,140,' + (0.5 - t * 0.5) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 10 + t * 10, 0, 6.28); ctx.stroke();
  ctx.restore();
}
function pickUp(o) {
  give(o.pick, 1); S.flags['pk_' + o.pick] = 1;
  const i = objs.indexOf(o); if (i >= 0) objs.splice(i, 1);
  play('pick');
  const q = q5();
  if (q.st === 'collecting' && has('fuse') && has('fuel')) { q.st = 'ready'; bulletin('Предохранитель и топливо у тебя. Неси к генератору у костра.'); }
  else if (q.st === 'not_started') news('Нашёл ' + ITEMS[o.pick].n.toLowerCase() + '. Кому-то в деревне это может пригодиться.');
}
/* разговор с Волком */
function wolfRC1Opts() {
  if (MAP_ID !== 'rc1') return [];
  const o = [], q = q5(), c = q3c();
  if (q.st === 'not_started' && S.q.flash >= 1) o.push({ t: 'Что с генератором у костра?', fn: () => {
    say('Стоит без дела с весны. Мотор целый, сгорел предохранитель, и бензина ни капли. Предохранитель поищи на старой водокачке к северу, там щиток был. Канистры видели на АТП, у бандитов. Принесёшь — вечером будет свет, и верстак заработает.');
    q.st = has('fuse') && has('fuel') ? 'ready' : 'collecting'; bulletin('Задание: Свет в деревне. Предохранитель — водокачка, топливо — АТП.');
  } });
  if (q.st === 'completed') o.push({ t: 'Как вам со светом?', fn: () => say('Живём как люди. Вечером у костра видно, кто пришёл, а не только кто стреляет. И верстак теперь твой, пользуйся.') });
  if (S.q3.sucker >= 1 && S.q3.sucker < 3 && !c.story) o.push({ t: 'Расскажи подробнее про хлев', fn: () => {
    c.story = 1;
    say('Хомяк ночью шёл мимо фермы и видел следы босых ног, будто человек, только пальцы длинные. От фермы они уходят к хлеву на востоке. Если пойдёшь — бинты возьми побольше: кого оно цепляет, тот кровью истекает.');
    bulletin('Ночной гость: следы у фермы ведут к хлеву. Возьми бинты.');
  } });
  if (S.q3.sucker === 3) o.push({ t: 'Ферма теперь спокойная?', fn: () => say('Лис говорит, по ночам больше никто не скребётся в стену. Спасибо тебе от всех, кто туда ходит.') });
  return o;
}
/* верстак после генератора: ремонт до 70%, оплата за каждый процент */
function benchOpts() {
  const worn = WORDER.filter(w => w !== 'knife' && !WP[w].toss && has(w) && (S.cond[w] == null ? 80 : S.cond[w]) < 70);
  const cost = worn.reduce((s, w) => s + Math.ceil((70 - (S.cond[w] == null ? 80 : S.cond[w])) * 6), 0);
  return worn.length ? [{ t: 'Подлатать оружие до 70% · ' + cost + ' RU', k: 'key', d: S.money < cost, fn: () => { S.money -= cost; worn.forEach(w => S.cond[w] = 70); sys('Оружие подлатано до 70%. Полный ремонт — у Сидоровича.'); } }]
    : [{ t: 'Оружие в порядке (выше 70%) — верстаку делать нечего', d: true, fn: () => {} }];
}
function gensetUse() {
  const q = q5();
  if (q.st === 'completed') { dialog(meCard(), ['Генератор ровно гудит. Рядом верстак: можно подлатать оружие, но не лучше 70%.'], () => benchOpts().concat([{ t: 'Отойти', close: 1 }]), 'dialog'); return; }
  if (q.st === 'not_started') { msg('Старый генератор. Без предохранителя и топлива не заведётся.', 'say'); return; }
  if (!has('fuse') || !has('fuel')) { msg('Не хватает: ' + [has('fuse') ? '' : 'предохранителя', has('fuel') ? '' : 'топлива'].filter(Boolean).join(' и ') + '.', 'bad'); return; }
  take('fuse', 1); take('fuel', 1); q.st = 'completed';
  if (!q.rewarded) { q.rewarded = 1; S.money += 600; S.rep += 10; S.stats.q++; }
  play('reload'); msg('Генератор заработал. Вечером в деревне будет свет.', 'good');
  bulletin('Выполнено: Свет в деревне. Деревня скинулась 600 RU, верстак у генератора открыт.'); save(true);
}
function qListRC1(L) {
  if (MAP_ID !== 'rc1') return;
  const q = q5();
  if (q.st !== 'not_started') L.push({ id: 'light', loc: 'village', n: 'Свет в деревне', st: q.st === 'completed' ? 'd' : 'a',
    d: q.st === 'completed' ? 'Генератор работает, верстак у костра открыт.' : 'Нужны предохранитель (водокачка) и канистра топлива (АТП) — в любом порядке. ' + (has('fuse') ? 'Предохранитель есть. ' : '') + (has('fuel') ? 'Топливо есть. ' : '') + (q.st === 'ready' ? 'Неси к генератору у костра.' : '') });
}
function targetsRC1(out) {
  if (MAP_ID !== 'rc1') return;
  const q = q5();
  if (q.st === 'collecting') {
    if (!has('fuse')) { const p = locPt('pump', 'fuse'); out.push({ qid: 'light', x: p.x, y: p.y, n: 'Предохранитель на водокачке' }); }
    if (!has('fuel')) { const p = locPt('atp', 'fuel'); out.push({ qid: 'light', x: p.x, y: p.y, n: 'Канистра на АТП' }); }
  }
  if (q.st === 'ready') { const p = locPt('village', 'generator'); out.push({ qid: 'light', x: p.x, y: p.y, n: 'Починить генератор' }); }
  const c = q3c();
  if (S.q3.sucker === 1 && !c.tracks) { const p = locPt('farm', 'tracks'); out.push({ qid: 'sucker', x: p.x, y: p.y, n: 'Следы у фермы' }); }
}
/* улики «Ночного гостя»: следы у фермы → осмотр хлева с предупреждением; убийство раньше улик тоже закрывает цепочку */
function cluesTick() {
  if (MAP_ID !== 'rc1' || !P || !P.alive || S.q3.sucker !== 1) return;
  const c = q3c();
  if (!c.tracks && dst(P.x, P.y, locPt('farm', 'tracks').x, locPt('farm', 'tracks').y) < 70) { c.tracks = 1; msg('Следы босых ног с длинными пальцами. Уходят на восток, к хлеву.', 'say'); bulletin('Ночной гость: следы у фермы ведут к хлеву.'); }
  const porch = locPt('lair', 'porch');
  if (!c.warned && dst(P.x, P.y, porch.x, porch.y) < 160) { c.warned = 1; msg('Внутри что-то дышит. Тварь невидима, пока не кинется; её удар вызывает кровотечение. Держи бинты под рукой.', 'bad'); }
  const ins = locPt('lair', 'inside');
  if (!c.barn && dst(P.x, P.y, ins.x, ins.y) < 90) { c.barn = 1; bulletin('Ночной гость: в хлеву кости и обрывки курток. Тварь где-то рядом.'); }
}
/* переход на Свалку: критерий «добраться до перехода» */
function exitUse() {
  if (!S.flags.reachedExit) { S.flags.reachedExit = 1; news('Дошёл до перехода на Свалку. Дальше — в следующей части.'); save(true); }
  msg('Дорога на Свалку. Эта локация появится в следующей версии.', 'say');
}
function interactRC1(cand) {
  if (MAP_ID !== 'rc1') return;
  for (const o of objs) if (o.pick) { const d = dst(P.x, P.y, o.x + o.w / 2, o.y + o.h / 2); if (d < 44) cand(d - 15, { k: 'pick', o: o, label: 'Взять: ' + ITEMS[o.pick].n }); }
  const g = locPt('village', 'generator'), dg = dst(P.x, P.y, g.x, g.y);
  if (dg < 56) cand(dg - 5, { k: 'genset', label: q5().st === 'completed' ? 'Верстак у генератора' : 'Генератор' });
  const ex = locPt('exit', 'gate'), de = dst(P.x, P.y, ex.x, ex.y);
  if (de < 90) cand(de, { k: 'exit', label: 'Переход на Свалку' });
}

/* ===================== Тестовая карта RC1 (mapVersion kordon-rc1) =====================
   Единственное описание мест RC1: геометрия, якоря, стартовые NPC, мутанты, тайники, аномалии, артефакты.
   Строится поверх общей геометрии Кордона (деревня, бункер, АТП, мост, туннель, болото совпадают со схемой)
   и добавляет: автобус с раненым, водокачку, сады и южный обход, релейную будку, хлев, восточную канаву,
   боковой пролом АТП, учебную аномальную площадку, переход на Свалку.
   Включается только флагом сборки rc1; прежняя карта (k07) не меняется. */
const RC1 = {
  locations: {
    village: { name: 'Деревня новичков', gen: 'деревни новичков', type: 'safe', bounds: [14, 70, 46, 98], entrances: [[33, 70], [46, 83], [24, 98]],
      anchors: { fire: CAMP_TILE.slice(), shust: [34.5, 80.5], tolik: [35, 81], wolf: [27.5, 79], safe: [30, 88], generator: [34.5, 86.5], bench: [36.5, 84.5],
        lamps: [[27, 81], [34, 81], [27.5, 88], [34, 88.5], [30.5, 78.5]] } },
    sid: { name: 'Бункер Сидоровича', gen: 'бункера', type: 'safe', bounds: [8, 94, 17, 102], entrances: [[12.5, 98.5]],
      anchors: { hatch: [12.5, 98.5], trader: [SID_DESK_X, SID_DESK_Y], stairs: [SID_STAIR_X, SID_STAIR_Y], spawn: [SID_SHOP ? SID_STAIR_X : 126.5, SID_SPAWN_Y], safe: [14.5, 95.5] } },
    bus: { name: 'Автобус у дороги', gen: 'автобуса', type: 'story', bounds: [44, 72, 53, 80], entrances: [[48, 80], [44, 75]],
      anchors: { bus: [47, 75], tolik: [49.5, 77.5], safe: [47, 79] } },
    pump: { name: 'Старая водокачка', gen: 'старой водокачки', type: 'story', bounds: [32, 57, 42, 67], entrances: [[36, 67], [42, 62]],
      anchors: { building: [36.5, 61.5], fuse: [35.5, 61.2], clear: [40, 66], sos: [[40, 66]], safe: [36, 68] } },
    atp: { name: 'АТП', gen: 'АТП', type: 'danger', bounds: [84, 58, 112, 84], entrances: [[86, 71.5], [103.5, 83], [99.5, 59]],
      anchors: { garage: [94.5, 64.6], petr: [93, 71.5], petr2: [97, 71.5], fuel: [107.4, 66.5], approach: [80, 71.5], breach: [103.5, 84.5], safe: [78, 72], b4: [101.5, 79.5] } },
    orchard: { name: 'Восточные сады', gen: 'восточных садов', type: 'story', bounds: [88, 86, 110, 100], entrances: [[95, 86], [90, 97]],
      anchors: { shed: [99, 92.5], clear: [94, 94], sos: [[96, 96]], safe: [92, 97] } },
    south_path: { name: 'Южная тропа', gen: 'южной тропы', type: 'story', bounds: [44, 95, 90, 99], entrances: [[46, 97], [88, 97]],
      anchors: { clear: [74, 97], safe: [56, 97] } },
    field: { name: 'Учебное поле аномалий', gen: 'поля аномалий', type: 'anomaly', bounds: [66, 46, 84, 60], entrances: [[69, 59], [83, 52]],
      anchors: { medusa: [74.5, 53.5], boltPoint: [69.5, 58.5], bypass: [83, 52], sos: [[80, 44]] } },
    army: { name: 'Южный блокпост', gen: 'южного блокпоста', type: 'danger', bounds: [56, 98, 72, 108], entrances: [[64, 98]], anchors: { post: [64, 102.6] } },
    swamp: { name: 'Болото', gen: 'болота', type: 'anomaly', bounds: [14, 44, 36, 56], entrances: [[25, 56]], anchors: { sos: [[16, 68]] } },
    dogs_lair: { name: 'Логово псов', gen: 'леса на западе', type: 'danger', bounds: [4, 36, 18, 50], entrances: [[16, 44]], anchors: { lair: [10.5, 42.5] } },
    trafo: { name: 'Трансформаторная', gen: 'трансформаторной', type: 'anomaly', bounds: [27, 31, 37, 41], entrances: [[33, 41]], anchors: { box: [32.5, 33.5] } },
    tunnel: { name: 'Туннель под насыпью', gen: 'туннеля', type: 'anomaly', bounds: [34, 25, 42, 34], entrances: [[38, 34], [38, 25]], anchors: { south: [38, 33], north: [38, 25.5] } },
    bridge: { name: 'Мост, военные', gen: 'моста', type: 'danger', bounds: [58, 28, 70, 38], entrances: [[64, 38], [64, 26]], anchors: { post: [63.5, 34.2] } },
    camp: { name: 'Лагерь путейцев', gen: 'лагеря путейцев', type: 'safe', bounds: [42, 17, 52, 26], entrances: [[47, 26], [52, 20]], anchors: { fire: [46.5, 21.5], sos: [[50, 22]], safe: [44, 23] } },
    farm: { name: 'Ферма', gen: 'фермы', type: 'story', bounds: [80, 8, 97, 22], entrances: [[88, 22], [80, 17]], anchors: { fox: [88.5, 14.5], tracks: [91.5, 19.5], safe: [86, 21] } },
    lair: { name: 'Хлев за фермой', gen: 'хлева за фермой', type: 'danger', bounds: [102, 7, 113, 17], entrances: [[104, 12.5], [108, 17]], anchors: { sucker: [107.5, 12.5], inside: [106, 12.5], porch: [102.5, 12.5] } },
    east_ditch: { name: 'Восточная канава', gen: 'восточной канавы', type: 'anomaly', bounds: [100, 18, 108, 36], entrances: [[103.5, 18], [103.5, 35]], anchors: { culvert: [103.5, 29], clear: [104, 22] } },
    relay: { name: 'Релейная будка', gen: 'релейной будки', type: 'story', bounds: [98, 34, 108, 42], entrances: [[102.5, 42]], anchors: { booth: [102.5, 38], stash: [101.3, 37.2], sos: [[108, 32]], safe: [102.5, 44] } },
    rail: { name: 'Железная дорога', gen: 'железной дороги', type: 'story', bounds: [70, 40, 86, 48], entrances: [[78, 48]], anchors: { clear: [78, 43] } },
    exit: { name: 'Переход на Свалку', gen: 'перехода на Свалку', type: 'story', bounds: [58, 1, 72, 8], entrances: [[64, 8]], anchors: { gate: [64, 5.5] } }
  },
  /* стартовые NPC и мутанты: только позиции и привязки, характеристики берутся из прежних описаний */
  npcMoves: { tolik: ['bus', 'tolik'], b4: ['atp', 'b4'] },   // b4 в 0.7 стоял в углу стены гаража
  dogs: [
    { sid: 'd1', pack: 'lair', at: [9, 41] }, { sid: 'd2', pack: 'lair', at: [11, 42] }, { sid: 'd3', pack: 'lair', at: [10, 44] }, { sid: 'd4', pack: 'lair', at: [12.5, 43] },
    { sid: 'f1', pack: 'north', at: [70, 20] }, { sid: 'f2', pack: 'north', at: [72, 21] }, { sid: 'f3', pack: 'north', at: [73.5, 19.5] },
    { sid: 'o1', pack: 'orchard', at: [104, 95] }, { sid: 'o2', pack: 'orchard', at: [106, 93.5] }
  ],
  boars: [{ sid: 'k1', at: [52, 12] }, { sid: 'k2', at: [54.5, 13] }, { sid: 'k3', at: [76, 24] }],
  caches: [
    { at: [6.5, 60.5], loot: { money: 350, medkit: 1, a9: 20 } }, { at: [45.5, 47.5], loot: { a545: 40, antirad: 1 } },
    { at: [108.5, 100.5], loot: { grenade: 2, cans: 2, money: 200 } }, { at: [21.5, 25.5], loot: { art_blood: 1, vodka: 1 } },
    { at: [112.5, 40.5], loot: { a12: 16, bandage: 3, money: 500 } }, { at: [52.5, 98.5], loot: { ar_bandit: 1, sausage: 2 } }
  ]
};
if (MAP_ID === 'rc1') {
  // справочник локаций: заменить содержимое общим описанием RC1 (id остаются прежними там, где место совпадает)
  LOCATIONS.length = 0;
  Object.entries(RC1.locations).forEach(([id, l]) => LOCATIONS.push(Object.assign({ id: id }, l)));
  Object.keys(LOC).forEach(k => delete LOC[k]); LOCATIONS.forEach(l => { LOC[l.id] = l; });
  // NPC
  Object.entries(RC1.npcMoves).forEach(([sid, ref]) => { const d = NPCDEF.find(n => n.sid === sid); const a = LOC[ref[0]].anchors[ref[1]]; if (d) { d.x = a[0]; d.y = a[1]; } });
  DOGDEF.length = 0; RC1.dogs.forEach(d => DOGDEF.push({ sid: d.sid, pack: d.pack, x: d.at[0], y: d.at[1] }));
  CACHES.length = 0; RC1.caches.forEach(c => CACHES.push({ x: c.at[0], y: c.at[1], loot: c.loot }));
  // подписи старой карты заменяются справочником (КПК рисует подписи из LOCATIONS)
  LABELS.length = 0;
  // события берут точки из справочника
  SOS_SPOTS.length = 0; locAnchors('sos').forEach(a => SOS_SPOTS.push([a.x, a.y, a.loc]));
  CLEAR_SPOTS.length = 0; locAnchors('clear').forEach(a => CLEAR_SPOTS.push([a.x, a.y, 'у ' + LOC[a.loc].gen, a.loc]));
  const sh = locPt('lair', 'sucker'); SUCKER_HOME.x = sh.x; SUCKER_HOME.y = sh.y;
}
function boarDefs() { return MAP_ID === 'rc1' ? RC1.boars.map(b => ({ sid: b.sid, x: b.at[0], y: b.at[1] })) : [{ sid: 'k1', x: 52, y: 12 }, { sid: 'k2', x: 54.5, y: 13 }, { sid: 'k3', x: 76, y: 24 }]; }

/* ---------- геометрия RC1 ---------- */
function rcClear(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const t = tAt(x, y); if (t === TR || t === BU) setT(x, y, GR); } reserve(x0, y0, x1, y1); }
function rcPath(pts, w) {
  w = w || 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
      for (let dy = -w + 1; dy <= w - 1 || dy === 0; dy++) { for (let dx = -w + 1; dx <= w - 1 || dx === 0; dx++) { const t = tAt(x + dx, y + dy); if (t !== AS && t !== RA && t !== CO && t !== BR && t !== FL && t !== CF && t !== SW) setT(x + dx, y + dy, DI); if (dx >= w - 1) break; } if (dy >= w - 1) break; }
      reserve(x - w, y - w, x + w, y + w);
    }
  }
}
function rc1Gen() {
  // автобус: с поля аномалий к дороге у деревни (раненый Толик рядом)
  const bus = objs.find(o => o.k === 'bus'); if (bus) { bus.x = 45 * T; bus.y = 74 * T; }
  rcClear(43, 71, 53, 80);
  rcPath([[46, 82], [47, 77], [48, 74], [50, 72]]);
  // водокачка: кирпичное здание, внутри предохранитель для генератора
  rcClear(31, 56, 43, 68);
  house(33, 58, 7, 6, [[3, 5], [4, 5], [6, 2]], BR, 0.08);
  rcPath([[33, 74], [35, 70], [36, 66]]);                 // деревня ↔ водокачка
  rcPath([[39, 61], [43, 64], [46, 70], [47, 74]]);         // водокачка ↔ автобус
  // сады к югу от АТП: ряды деревьев, сарай, вход с двух сторон
  for (let y = 88; y <= 99; y++) for (let x = 88; x <= 110; x++) { const t = tAt(x, y); if (t === TR || t === BU) setT(x, y, GR); }
  for (let y = 88; y <= 98; y += 3) for (let x = 89; x <= 109; x += 3) if (!(x >= 97 && x <= 103 && y >= 90 && y <= 95)) setT(x, y, TR);
  house(97, 90, 6, 5, [[0, 2], [3, 4]], BR, 0.12);
  rcPath([[95, 84], [95, 89], [95, 97]]);
  // южная тропа: сады ↔ деревня мимо блокпоста по северному краю
  rcPath([[95, 97], [80, 97], [70, 96], [58, 96], [46, 95], [40, 93]]);
  // АТП: боковой рискованный пролом в южной стене (основной въезд — открытый западный)
  for (let x = 103; x <= 104; x++) setT(x, 82, DI);
  rcPath([[103, 83], [103, 86], [99, 88]]);
  ANOM0.push({ x: 105.5 * T, y: 85.2 * T, r: 24, k: 'e' });
  rads.push({ x: 101 * T, y: 84 * T, r: 70, p: 2.5 });
  // северный выход АТП к релейной будке
  for (let x = 99; x <= 100; x++) setT(x, 60, DI);
  // релейная будка: бетонная будка с находкой
  rcClear(97, 33, 109, 45);
  house(100, 36, 5, 4, [[2, 3]], CO, 0);
  rcPath([[102, 41], [102, 50], [100, 56], [100, 59]]);
  addObj({ k: 'crate', x: 101 * T + 3, y: 37 * T + 3, w: 26, h: 26, solid: 1, stash: 'st7', loot: { a545: 20, antirad: 1, money: 180 } });
  // восточная канава под насыпью: третий, рискованный проход на север
  for (let y = 27; y <= 31; y++) for (let x = 103; x <= 104; x++) setT(x, y, CF);
  rcClear(101, 17, 106, 35);
  rcPath([[103.5, 35], [103.5, 31]]); rcPath([[103.5, 27], [103.5, 18], [105, 17]]);
  ANOM0.push({ x: 103.6 * T, y: 26.3 * T, r: 22, k: 'g' });
  rads.push({ x: 103.5 * T, y: 29 * T, r: 60, p: 3.5 });
  // хлев за фермой
  rcClear(101, 6, 114, 18);
  house(104, 9, 8, 7, [[0, 3], [4, 6]], BR, 0.3, 'ruin');
  rcPath([[96, 17], [100, 14], [103, 12.5]]);
  // ферма ↔ лагерь путейцев (дорожка по y=17 есть), следы у фермы
  addObj({ k: 'tracks', x: 91 * T, y: 19 * T, w: 24, h: 24 });
  // учебная площадка: точка броска болта (мешки) и обход по краю поля
  addObj({ k: 'sand', x: 69 * T, y: 58 * T + 8, w: T, h: 16, solid: 1 });
  rcPath([[69, 60], [83, 60], [83, 46], [79, 44]]);
  // переход на Свалку: ворота с блоками у верхнего края дороги
  rcClear(58, 2, 72, 8);
  // генератор в деревне и верстак (появляется после ремонта, но место зарезервировано)
  addObj({ k: 'genset', x: 34 * T, y: 86 * T, w: 30, h: 22, solid: 1 });
  addObj({ k: 'fuelcan', x: 107 * T, y: 66 * T, w: 18, h: 18, pick: 'fuel' });
  addObj({ k: 'fusebox', x: 35 * T + 4, y: 61 * T, w: 16, h: 14, pick: 'fuse' });
}

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
const TOLIK_AT_JUNCTION = BIG && !/(?:^#|&)tolik-junction-off(?:&|$)/.test(location.hash);
const TOLIK_SCENE_SHIFT = [34, -11];
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
const streamCenter = y => 230 + 2 * Math.sin(y / 17) + 1.5 * Math.sin(y / 7 + 1);
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
    anchors: { clear: [122, 25], sos: [[133, 22]] } });
  bigLoc('tower', { name: 'Охотничья вышка', gen: 'охотничьей вышки', type: 'story', bounds: [11, 24, 22, 35], entrances: [[19, 31]],
    anchors: { top: [16.5, 29.5], clear: [18, 33] } });
  bigLoc('exit_w', { name: 'Дорога на Залесье', gen: 'дороги на Залесье', type: 'story', bounds: [0, 112, 8, 124], entrances: [[6, 118]], anchors: { gate: [3, 118] } });
  bigLoc('exit_e', { name: 'Дорога на Затон', gen: 'дороги на Затон', type: 'story', bounds: [232, 86, 239, 98], entrances: [[233, 92]], anchors: { gate: [237, 92] } });
  SOS_SPOTS.push([38, 137, 'hutor'], [224, 99, 'ford'], [133, 22, 'column']);
  CLEAR_SPOTS.push([33, 131, 'у хутора', 'hutor'], [226, 97, 'у брода', 'ford'], [122, 25, 'у разбитой колонны', 'column']);
  // колонна техники у дороги на Свалку
  [[120, 19, 0], [123, 23, 1], [121.5, 27.5, 0], [131, 21, 1]].forEach((c, i) => addObj({ k: 'car', x: c[0] * T, y: c[1] * T + 4, w: 2 * T, h: T - 8, solid: 1, opaque: 0, seed: 10 + i }));
  addObj({ k: 'crate', x: 125 * T + 3, y: 23 * T + 3, w: 26, h: 26, solid: 1, stash: 'st8', loot: { a545: 30, medkit: 1, money: 240 } });
  ANOM0.push({ x: 125.5 * T, y: 26.5 * T, r: 26, k: 'g' }, { x: 119.5 * T, y: 23.5 * T, r: 22, k: 'e' });
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
  ['c1_trace_wheel', 131.5, 6.5, 26, 0.14],
  // Колонна
  ['c1_trace_wheel', 121.5, 23.5, 29, 0.18],
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
  ['c1_trace_reel', 65, 65, 39, 0.09],
  ['c1_bricks', 66.3, 65.4, 24, -0.36],
  // Мост
  ['c1_trace_pipes', 123, 60, 59, -0.2],
  ['c1_sandbags', 122, 62, 44, 0.12],
  // Восточная канава и релейная будка
  ['c1_trace_pipes', 206.5, 53, 48, 0.67],
  ['c1_trace_reel', 210, 67, 37, -0.11],
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
  // Дорога на Залесье
  ['c1_trace_stump', 7, 117, 51, -0.12],
  ['c1_log0', 16, 122, 41, 0.55],
  // Хутор
  ['c1_trace_churn', 34, 134, 25, -0.41],
  ['c1_stump1', 35.1, 134.5, 29, 0.3],
  // Водокачка
  ['c1_trace_pipes', 78.5, 126, 62, -0.12],
  ['c1_trace_reel', 79, 127.5, 31, 0.16],
  // Обочины шоссе
  ['c1_trace_wheel', 122, 88, 28, 0.47],
  ['c1_junk', 118.5, 149, 34, -0.2],
  ['c1_trace_wheel', 127.5, 178, 27, -0.25],
  // АТП
  ['c1_trace_wheel', 193, 141, 34, -0.12],
  ['c1_tires', 194.4, 141.4, 36, 0.1],
  ['c1_trace_pipes', 200, 148, 49, 0.2],
  // Автобус
  ...(TOLIK_AT_JUNCTION ? [
    ['c1_trace_wheel', 81, 160, 25, 0.18],
    ['c1_junk', 75, 160.6, 34, -0.27],
    ['c1_trace_kettle', 78, 161, 22, 0.22],
  ].map(([id, x, y, width, angle]) =>
    [id, x + TOLIK_SCENE_SHIFT[0], y + TOLIK_SCENE_SHIFT[1], width, angle]
  ) : [['c1_trace_wheel', 81, 160, 25, 0.18]]),
  // Восточные сады
  ['c1_trace_apples', 195, 187, 37, -0.13],
  ['c1_trace_apples', 197.4, 187.9, 25, 0.56],
  ['c1_log0', 200, 191, 39, 0.22],
  // Южная тропа
  ['c1_trace_kettle', 149, 192, 31, 0.1],
  ['c1_log1', 147.5, 192.6, 44, -0.38],
  // Южный блокпост
  ['c1_sandbags', 131, 205, 51, 0.23],
  ['c1_trace_reel', 133, 204.5, 32, -0.32],
];

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
  const jh = e.jumpT > 0 ? Math.sin(Math.PI * (1 - e.jumpT / JUMP_T)) : 0;
  const sw0 = e.kind === 'human' && a.moving ? gaitSway(e) : null, sw = jh ? Object.assign({ dx: 0, dy: 0, k: 1 }, sw0, { k: (sw0 ? sw0.k : 1) * (1 + 0.2 * jh), dy: (sw0 ? sw0.dy : 0) - 5 * jh }) : sw0;
  if (sw) { target.save(); target.translate(e.x + sw.dx, e.y + sw.dy); target.scale(sw.k, sw.k); target.translate(-e.x, -e.y); }
  const sh = e.kind === 'human' && BIG && window.CORDON_G8_ON;   // контраст с землёй: мягкая тень-обводка вправо-вниз, как у остальных объектов
  if (sh) { const k = Math.abs(target.getTransform().a); target.save(); target.shadowColor = 'rgba(8,8,4,0.6)'; target.shadowBlur = 2.6 * k; target.shadowOffsetX = 1.6 * k; target.shadowOffsetY = 2.2 * k; }
  const images = jacketFor(e)?.images || G3.images;
  const ok = CordonG3.draw(target, man, images, a, e.kind === 'human' ? (c2 => {
    if (e === P && window.CORDON_G8_ON) {
      const roll = packImage('assets/g8/player_bedroll.webp');
      if (roll) {
        const top = (skin === 'bandit' ? -12 : -15) - (e.crouch ? 1 : 0);
        c2.drawImage(roll, -10.5, top, 21, 6);
      }
    }
    const w = weaponLocal(e); if (window.__g7tap) window.__g7tap(e, g3Base, c2.getTransform(), w); drawWeaponLocal(c2, w); }) : null);
  if (sh) target.restore();
  if (ok && e.flash > 0) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); CordonG3.draw(target, man, images, Object.assign({}, a, { shadow: false }), null); target.restore(); }
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
  ctx.drawImage((jacketFor(o)?.images || G3.images)[f.file], -f.width / 2, -f.height / 2, f.width, f.height); ctx.restore();
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
.hud.zh .zh-w,body.is-touch .hud.zh .zh-w{width:180px;height:58px;padding:3px 8px 3px 4px}.zh-w #wico,.zh-w #wico img{width:64px;height:38px}.hud.zh .zh-w .am,body.is-touch .hud.zh .zh-w .am{font-size:16px}
body.is-touch .touch.zt .rb{width:46px;height:46px}body.is-touch .touch.zt .fire{width:100px;height:100px}body.is-touch .joy{width:112px;height:112px}.joy b{width:46px;height:46px;margin:-23px}
.hud.zh .zh-p,body.is-touch .hud.zh .zh-p{min-height:calc(44px / var(--hz, 1));font-size:13px}
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
.hud.zh .zh-w,body.is-touch .hud.zh .zh-w{width:172px;height:58px;padding:3px 8px 3px 4px}
.hud.zh .zh-w,body.is-touch .hud.zh .zh-w{width:190px}.zh-w #wico,.zh-w #wico img{width:64px;height:38px}.zh-wi{overflow:hidden}.zh-w .cnd span{overflow:hidden;text-overflow:ellipsis}.hud.zh .zh-w .wn{font-size:11px}
.hud.zh .zh-w .am,body.is-touch .hud.zh .zh-w .am,.hud.zh .zh-w .am small{font-size:16px}.zh-w .cnd span{font-size:10px}
.hud.zh .zh-det{top:calc(68px + var(--sat));height:30px;width:66px}
body.is-touch .touch.zt .rb{width:46px;height:46px}body.is-touch .touch.zt .rb svg{width:21px;height:21px}
body.is-touch .touch.zt{--st:min(50px,calc((100vh / var(--hz, 1) - 122px - var(--sat) - var(--sab)) / 5))}
body.is-touch .touch.zt .c1{top:calc(114px + var(--sat))}body.is-touch .touch.zt .c2{top:calc(114px + var(--sat) + var(--st))}body.is-touch .touch.zt .c3{top:calc(114px + var(--sat) + var(--st) * 2)}body.is-touch .touch.zt .c4{top:calc(114px + var(--sat) + var(--st) * 3)}body.is-touch .touch.zt .c5{top:calc(114px + var(--sat) + var(--st) * 4)}
body.is-touch .touch.zt .fire{width:96px;height:96px;right:calc(62px + var(--sar))}body.is-touch .touch.zt .fire svg{width:50px;height:50px}
body.is-touch .joy{width:110px;height:110px}.joy b{width:46px;height:46px;margin:-23px}
.hud.zh .zh-p,body.is-touch .hud.zh .zh-p{min-height:calc(44px / var(--hz, 1));font-size:13px}
}
/* стелс-кнопка, счётчики аптечек, выбор бинт/аптечка */
.hud.zh .zh-p.kill{border-color:#a8321f;box-shadow:0 0 12px rgba(200,40,20,.55);color:#ffd9cf}.hud.zh .zh-p.kill .pi{background:#b3271a;border-radius:50%;width:10px;height:10px;display:inline-block;margin-right:8px}
.touch.zt #b-med{overflow:visible}.touch.zt .mb{position:absolute;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;font:700 10px/15px Arial;font-style:normal;text-align:center;pointer-events:none}
.touch.zt .mb:empty{display:none}.touch.zt .mb.m{right:-5px;top:-5px;background:#b3271a;color:#fff}.touch.zt .mb.b{right:-5px;bottom:-5px;background:#e8e2d0;color:#1a1612}
.touch.zt #b-med.empty{opacity:.45}
body.is-touch .touch.zt .medpick{position:absolute;right:calc(70px + var(--sar));top:calc(108px + var(--sat) + var(--st, 50px));display:flex;gap:8px;z-index:5;pointer-events:auto}
body.is-touch .touch.zt .medpick[hidden]{display:none}
body.is-touch .touch.zt .medpick button{position:static!important;inset:auto!important;transform:none!important;width:auto!important;height:auto!important;text-transform:none;letter-spacing:0;pointer-events:auto;min-width:96px!important;min-height:46px!important;padding:4px 10px!important;border-radius:10px!important;border:1.5px solid rgba(236,229,206,.35)!important;background:rgba(14,14,11,.85)!important;box-shadow:0 2px 8px rgba(0,0,0,.5)!important;color:#ece6d3!important;font:700 12px Arial!important;filter:none!important;display:grid;grid-template-columns:auto auto;align-items:center;column-gap:6px;text-align:left}
.touch.zt .medpick em{font-style:normal;font-size:16px!important;color:#f6c446;justify-self:end}.touch.zt .medpick small{grid-column:1/3;font-size:10px!important;font-weight:400;color:#bfb69c}
/* фонарик (блок над детектором) и ровная панель оружия */
.hud.zh .zh-det{cursor:pointer;pointer-events:auto}.hud.zh .zh-det::after{content:'';position:absolute;inset:-3px -4px -11px}
.hud.zh .zh-det .torch{color:#6f7a7c;fill:currentColor;width:18px;height:18px}.hud.zh .zh-det.on .torch{color:#62b6ff;filter:drop-shadow(0 0 4px rgba(80,170,255,.7))}.hud.zh .zh-det:not(.on) .beam{display:none}
.zh-w #wico{flex:0 0 76px!important;width:76px!important;height:44px!important;overflow:hidden}.zh-w #wico img{width:76px!important;height:44px!important;object-fit:contain!important}
.hud.zh .zh-w .wn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.zh-w.mel .cnd{display:none}
body.is-touch .touch.zt .rb.on{background:rgba(70,62,40,.6)!important;border-color:rgba(246,190,90,.7)!important}
/* круглые кнопки и джойстик — тёмные полупрозрачные, белые значки (референс); ржавчина остаётся на верхних панелях */
body.is-touch .touch.zt .rb,body.is-touch .touch.zt .fire{border-image:none!important;border:1.5px solid rgba(236,229,206,.3)!important;background:rgba(14,14,11,.5)!important;border-radius:50%!important;box-shadow:0 2px 6px rgba(0,0,0,.35)!important}
body.is-touch .touch.zt .rb svg,body.is-touch .touch.zt .fire svg{color:#ece6d3;stroke:#ece6d3;filter:none}
body.is-touch .touch.zt .fire{border-width:2px!important;background:rgba(14,14,11,.42)!important}
body.is-touch .joy{background:radial-gradient(circle,rgba(14,14,11,.2) 0,rgba(14,14,11,.5) 72%)!important;border:1.5px solid rgba(236,229,206,.3)!important;opacity:1}
.joy b{background:radial-gradient(circle at 40% 35%,rgba(200,196,182,.62),rgba(120,117,106,.5))!important;box-shadow:0 2px 6px rgba(0,0,0,.5)!important}
body.is-touch .joy .ar{display:block;opacity:.6}` : '')
  + (U.bar_hp && I[U.bar_hp.file] ? `
.zh-bar.hp .bar i{background:${url('bar_hp')} left/auto 100% repeat-x,#b8261a}.zh-bar.fd .bar i{background:${url('bar_fd')} left/auto 100% repeat-x,#c99620}` : '');
  const st = document.createElement('style'); st.id = 'g3-ui'; st.textContent = css; document.head.appendChild(st);
})();

/* ===================== G7: модульные люди (риг G5), ключевые позы G6, единая геометрия оружия =====================
   Подключён по art/g7/ONE_TASK_FOR_CLAUDE.md. Механика не меняется: хитбоксы, скорость, урон, сейвы.
   Состояние рига хранится в WeakMap и в сейв не попадает. Обновление — в update (g7Tick), отрисовка — только чтение.
   Порядок: позы G6 (плен, падение, мутанты) → риг G5 → кадры G3 → B1 → процедурная отрисовка.
   Выключатели: #rig-off (только риг), #poses-off (только позы G6), #g3-off / #b1-off — как раньше. */
const G7 = {
  rigOn: G3.on && !/rig-off/.test(location.hash) && !!window.CordonRig && !!window.CORDON_RIG && (!window.CORDON_G8_ON || /rig-on/.test(location.hash)),   // G8: люди рисуются нарисованными кадрами шага
  poseOn: G3.on && !/poses-off/.test(location.hash) && !!window.CordonPoseKeys,
  img: null, skins: {}, vt: 0
};
(function loadG7() {
  if (!G7.rigOn) return;
  for (const k in CORDON_RIG.dead) { const f = CORDON_RIG.dead[k]; if (!CORDON_RIG.images[f] && G3.pack && G3.pack.images[f]) CORDON_RIG.images[f] = G3.pack.images[f]; }   // кадры трупов — общие с G3
  CordonRig.load(CORDON_RIG).then(im => {
    G7.img = im;
    const m = CORDON_RIG.manifest.skins;   // готовность — по фактически загруженному набору каждой кожи
    for (const k in m) G7.skins[k] = Object.values(m[k]).every(f => im[f]) && !!im[CORDON_RIG.dead[k]];
  });
})();
const RIGS = new WeakMap(), GAIT = new WeakMap(), BODYFX = new WeakMap();

/* кожа: броня игрока → костюм; NPC → группировка; Сидорович — отдельные кадры G4 */
function rigSkin(e) {
  if (e.kind !== 'human' || e.sid === 'sid') return null;
  if (e === P) return S.armor === 'ar_zarya' ? 'zarya' : S.armor === 'ar_bandit' ? 'bandit' : 'loner';
  return { bandit: 'bandit', army: 'army' }[e.fac] || 'loner';
}
function rigState(e, moving) {
  if (!e.alive) return 'dead';
  if (e.wounded) return 'wounded';
  if (e.captive) return 'captive';
  if (e.sit) return 'seated';
  if (e.crouch) return moving ? 'crouch_walk' : 'crouch';
  return moving ? 'walk' : 'idle';
}
function rigComplete(skin) { const m = CORDON_RIG.manifest.skins[skin]; for (const k in m) if (!G7.img[m[k]]) return false; return true; }
/* риг рисует человека: стоя/шагом/присев/сидя. Ранение — нарисованный кадр G3, плен — кадр G6 */
const RIG_SEATED = false;   // сидящих рисует нарисованный кадр G3 seated: у рига сидя — укороченная стойка без согнутых ног
function rigActive(e) {
  if (!G7.rigOn || !G7.img || e.wounded || e.captive || (e.sit && !RIG_SEATED)) return null;
  const skin = rigSkin(e); if (!skin || !G7.skins[skin] || !rigComplete(skin)) return null;
  let r = RIGS.get(e); if (!r) { r = { rig: CordonRig.create(rigState(e, false)), skin: skin }; RIGS.set(e, r); }
  r.skin = skin; return r;
}

/* ---------- шаг и состояние: от фактического пути за тик, в update ---------- */
function g7Tick(dt) {
  G7.vt += dt;
  for (const e of ents) {
    if (!e.alive || e.qaRig) continue;   // qaRig — только для приёмочных кадров: состояние задано вручную
    let g = GAIT.get(e); if (!g) { g = { x: e.x, y: e.y, dist: 0, moveT: 0 }; GAIT.set(e, g); }
    let d = Math.hypot(e.x - g.x, e.y - g.y); g.x = e.x; g.y = e.y;
    const tele = d > 40;   // загрузка, перестановка, телепорт, переход: не считать ходьбой
    if (tele) d = 0;
    g.dist += d;
    g.moveT = d > 0.05 && d / Math.max(dt, 1e-3) > 6 ? 0.12 : Math.max(0, g.moveT - dt);
    if (e.kind === 'human') {
      const r = rigActive(e);
      if (r) CordonRig.update(r.rig, { state: rigState(e, g.moveT > 0), distance: d, teleported: tele }, dt);
    }
  }
  for (const o of objs) if (o.k === 'body') { const b = BODYFX.get(o); if (b && b.rig) CordonRig.update(b.rig, { state: 'dead', distance: 0 }, dt); }
}
function gaitOf(e) {
  const g = GAIT.get(e) || { dist: 0, moveT: 0 }, stride = e.kind === 'human' ? 11 : e.kind === 'boar' ? 16 : 13;
  return { moving: g.moveT > 0, phase: Math.floor(g.dist / stride) % 4 };
}
/* новый труп (событие смерти в этой сессии): короткий рисованный переход. Загруженные трупы сразу лежат */
function g7Fresh(o) {
  const b = { t0: G7.vt, rig: null };
  const skin = o.kind === 'human' ? ({ bandit: 'bandit', army: 'army' }[o.fac] || 'loner') : null;
  if (skin && G7.rigOn && G7.skins[skin] && !g7PoseFrame(skin, 'fall_start')) { b.rig = CordonRig.create('idle'); b.skin = skin; }   // запасной путь G5 только без кадров G6
  BODYFX.set(o, b);
}
function g7PoseFrame(skin, pose) {
  const a = G3.pack && G3.pack.manifest.actors[skin] && G3.pack.manifest.actors[skin][pose];
  return a && G3.images && G3.images[a.file] ? a : null;
}

/* ---------- единая геометрия оружия: хват, цевьё и дуло в южных локальных координатах тела ---------- */
function weaponLocal(e) {
  const id = e === P ? S.weapon : e.wpn, W = G3W[id]; if (!W) return null;
  const grip = id === 'w_pm' || id === 'knife' ? 'one' : 'two';
  const r = rigActive(e);
  if (r) {
    const s = CordonRig.sockets(r.rig.pose, grip);
    if (!s.hasEquipment || ['seated', 'captive', 'wounded', 'dead'].includes(r.rig.state)) return null;
    return { mode: 'rig', id: id, W: W, grip: grip, main: s.main, support: s.support, muzzle: [s.main[0], s.main[1] + W.len] };
  }
  if (!G3_READY() || e.sit || e.wounded || e.captive) return null;
  const hand = e === P && window.CORDON_G8_ON && grip === 'one' ? [3.5, 10] : G3_GRIP;
  const main = [hand[0], hand[1] + (e.crouch ? -1 : 0)];
  return { mode: 'g3', id: id, W: W, grip: grip, main: main, support: [main[0], main[1] + 8], muzzle: [main[0], main[1] + W.len] };
}
/* единственное преобразование локальной точки в мир (рендер поворачивает на ang − π/2) */
function localToWorld(e, ang, lat, fwd) {
  return { x: e.x + Math.sin(ang) * lat + Math.cos(ang) * fwd, y: e.y - Math.cos(ang) * lat + Math.sin(ang) * fwd };
}
function g7Muzzle(e, ang) {
  const w = weaponLocal(e); if (!w || w.W.blade) return null;
  return localToWorld(e, ang, w.muzzle[0], w.muzzle[1]);
}
/* слой оружия: рукоять в main, ствол вдоль +y до muzzle. Тот же объект w, что и для дула */
function drawWeaponLocal(c2, w) {
  if (!w) return;
  const W = w.W, x = w.main[0], y = w.main[1];
  const H8 = window.CORDON_G8_ON && CORDON_G8.hand[w.id], him = H8 && packImage(H8.file);
  if (him) {   // G8: нарисованный вид сверху; хват в той же точке, конец ствола = muzzle (геометрия выстрела не меняется)
    const gf = W.blade ? 0.3 : 0.22, L = W.len / (1 - gf) + (W.blade ? 2 : 0), wd = W.blade ? Math.max(1.9, L * H8.aspect) : L * H8.aspect;
    c2.drawImage(him, x - wd / 2, y - L * gf, wd, L); return;
  }
  if (W.blade) { c2.fillStyle = '#a9aca8'; c2.fillRect(x - 1, y, W.w, W.len); c2.fillStyle = '#3a2e24'; c2.fillRect(x - 1.5, y - 3, 3, 3); return; }
  c2.fillStyle = '#1c1c1a'; c2.fillRect(x - W.w / 2, y - 2, W.w, W.len + 2);        // рукоять чуть позади кисти, конец ствола = muzzle
  if (W.mag) { c2.fillStyle = '#5a3a22'; c2.fillRect(x + W.w / 2 - 0.5, y + 4, 3, 4); }
  c2.fillStyle = 'rgba(255,255,255,0.12)'; c2.fillRect(x - W.w / 2, y - 2, 1, W.len + 2);
  if (w.grip === 'two') { c2.fillStyle = '#3b2c20'; c2.fillRect(x - W.w / 2 - 0.4, w.support[1] - 1.5, W.w + 0.8, 3.5); }   // цевьё под второй кистью
}

/* G8. У постоянных жителей Кордона sid стабилен и в старых сохранениях. */
const JACKET_COLORS = ['white', 'beige', 'brown'];
const JACKET_POSES = ['idle', 'walk_left', 'walk_pass_left', 'walk_right', 'walk_pass_right',
  'crouch', 'captive', 'wounded', 'fall_start', 'fall_mid', 'dead', 'dead2'];
const jacketSets = [];
function jacketIndex(e) {
  if (e.k === 'body') return (e.seed || 0) % JACKET_COLORS.length;
  const identity = e.sid || e.name || '';
  return Array.from(identity).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % JACKET_COLORS.length;
}
function jacketFor(e) {
  if (!window.CORDON_G8_ON || G7.rigOn || e === P || e.fac !== 'loner' || e.kind !== 'human') return null;
  const index = jacketIndex(e);
  if (jacketSets[index]) return jacketSets[index];
  const sheet = packImage('assets/g8/jacket_' + JACKET_COLORS[index] + '.webp');
  if (!sheet || !G3.images) return null;
  const images = Object.create(G3.images);
  JACKET_POSES.forEach((pose, i) => {
    const f = g7PoseFrame('loner', pose);
    if (!f) return;
    const original = G3.images[f.file], cell = document.createElement('canvas');
    cell.width = original.naturalWidth; cell.height = original.naturalHeight;
    cell.getContext('2d').drawImage(sheet, i * 192, 168, cell.width, cell.height, 0, 0, cell.width, cell.height);
    images[f.file] = cell;
  });
  return jacketSets[index] = { sheet, images };
}

/* ---------- отрисовка людей ---------- */
function shadowAt(e, rx) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 3, rx || 10, 7, 0, 0, 6.28); ctx.fill(); }
function g7Human(e, extra, target) {
  if (!G3_READY()) return false;
  const opacity = extra && extra.opacity != null ? extra.opacity : 1;
  if (e.sid === 'sid') {   // Сидорович G4: idle/seated/relaxed, табурет уже в кадре, оружие не рисуется
    const give = typeof panel !== 'undefined' && panel && panel.kind === 'trade' && g7PoseFrame('sid', 'give');   // G8: торговля — протягивает свёрток
    const f = give || g7PoseFrame('sid', window.CORDON_G8_ON && e.talkT > 0 ? 'idle' : e.sit ? 'seated' : e.talkT > 0 ? 'idle' : 'relaxed') || g7PoseFrame('sid', 'idle'); if (!f) return false;
    drawFrameAt(e.x, e.y, e.ang, f, opacity, 1, target); if (e.flash > 0) flashFrame(e, f, 1, target); return true;
  }
  if (e.captive && !e.wounded && G7.poseOn) {   // связанный пленник: цельный кадр, без модульных рук/ствола
    const skin = rigSkin(e), f = skin && g7PoseFrame(skin, 'captive');
    if (f) { drawFrameAt(e.x, e.y, e.ang, f, opacity, CAPTIVE_K, target, jacketFor(e)?.images); if (e.flash > 0) flashFrame(e, f, CAPTIVE_K, target); return true; }
  }
  if (window.CORDON_G8_ON && (e.sit || e.campRise != null) && !e.wounded && !e.captive && rigSkin(e) === 'loner') {
    const sheet = jacketFor(e)?.sheet || packImage('assets/g8/camp_rise.webp');
    if (sheet) {
      // 17 кадров с готовым смешиванием в premultiplied alpha: силуэт сохраняет плотность.
      const rise = e.campRise || 0, frame = Math.round(rise * 16);
      const sw = sheet.naturalWidth / 17, sh = 168;
      target.save(); target.translate(e.x, e.y); target.rotate(e.ang - Math.PI / 2);
      const alpha = target.globalAlpha * opacity;
      target.globalAlpha = alpha;
      target.drawImage(sheet, frame * sw, 0, sw, sh, -24, -28, 48, 56);
      if (e.flash > 0) {
        target.save();
        target.globalCompositeOperation = 'lighter';
        target.globalAlpha = alpha * Math.min(0.5, e.flash * 4);
        target.drawImage(sheet, frame * sw, 0, sw, sh, -24, -28, 48, 56);
        target.restore();
      }
      if (rise > 0.75 && !e.sit) {
        target.globalAlpha = alpha * (rise * 4 - 3);
        drawWeaponLocal(target, weaponLocal(e));
      }
      target.restore(); return true;
    }
  }
  const r = rigActive(e); if (!r) return false;
  const w = weaponLocal(e), base = window.__g7tap ? target.getTransform() : null, o = { skin: r.skin, x: e.x, y: e.y, angle: e.ang, grip: w ? w.grip : 'none', opacity: opacity,
    deadImage: G7.img[CORDON_RIG.dead[r.skin]], drawEquipment: c2 => { if (base) window.__g7tap(e, base, c2.getTransform(), w); drawWeaponLocal(c2, w); } };
  const ok = CordonRig.draw(target, G7.img, CORDON_RIG.manifest, r.rig, o);
  if (ok && e.flash > 0) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); CordonRig.draw(target, G7.img, CORDON_RIG.manifest, r.rig, Object.assign({}, o, { drawEquipment: null })); target.restore(); }
  return ok;
}
const CAPTIVE_K = 0.86;   // кадр 64×72: голова/плечи сверены с соседним idle (48×56) — без этого пленник крупнее стоящих
function drawFrameAt(x, y, ang, f, opacity, k, target = ctx, images = G3.images) {
  target.save(); target.translate(x, y); target.rotate((ang || 0) - Math.PI / 2); target.globalAlpha *= opacity == null ? 1 : opacity; if (k) target.scale(k, k);
  target.drawImage(images[f.file], -f.width * f.pivot[0], -f.height * f.pivot[1], f.width, f.height); target.restore();
}
function flashFrame(e, f, k, target) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); drawFrameAt(e.x, e.y, e.ang, f, 1, k, target, jacketFor(e)?.images); target.restore(); }

/* ---------- мутанты: подготовка только в существующем wind кабана, отдача — на событие попадания ---------- */
function g7Mutant(e, a) {
  if (!G7.poseOn) return false;
  let pose = null;
  if (e.kind === 'boar' && e.state === 'wind') pose = 'anticipation';
  else if (e.flash > 0 && !(e.kind === 'sucker' && e.cloak > 0.3)) pose = 'recoil';   // скрытого кровососа новая поза не выдаёт
  if (!pose) return false;
  const f = g7PoseFrame(e.kind, pose); if (!f) return false;
  if (a.shadow !== false) shadowAt(e, e.kind === 'boar' ? 13 : 10);
  drawFrameAt(e.x, e.y, e.ang, f, a.opacity);
  return true;
}

/* ---------- трупы: падение людей fall_start → fall_mid → dead, мутанты collapse → dead ---------- */
function g7Body(o) {
  const b = BODYFX.get(o); if (!b || !G3_READY()) return false;
  const age = G7.vt - b.t0;
  if (age > 0.4) { b.rig = null; return false; }   // переход окончен — обычный труп, тот же центр и угол
  const skin = o.kind === 'human' ? ({ bandit: 'bandit', army: 'army' }[o.fac] || 'loner') : o.kind;
  if (G7.poseOn && window.CordonPoseKeys) {
    const pose = CordonPoseKeys.sample(skin, 'death_transition', age);
    if (pose && pose !== 'dead') { const f = g7PoseFrame(skin, pose); if (f) { bloodPool(o, Math.min(1, age / 0.34)); drawFrameAt(o.x, o.y, o.ang, f, 1, 1, ctx, jacketFor(o)?.images); return true; } }
    if (pose === 'dead') return false;
  }
  if (b.rig && G7.img && G7.skins[b.skin]) {   // запасной путь G5: наклон и смешивание к кадру трупа
    bloodPool(o, Math.min(1, age / 0.4));
    return CordonRig.draw(ctx, G7.img, CORDON_RIG.manifest, b.rig, { skin: b.skin, x: o.x, y: o.y, angle: o.ang, grip: 'none', deadImage: G7.img[CORDON_RIG.dead[b.skin]] });
  }
  return false;
}
function bloodPool(o, k) {   // неровное пятно из нескольких эллипсов, форма стабильна для трупа
  const s = (o.seed || 1) * 9301 + Math.floor(o.x) * 49297 + Math.floor(o.y) * 233;
  ctx.save(); ctx.translate(o.x, o.y); ctx.fillStyle = 'rgba(70,10,6,' + (0.5 * k) + ')'; ctx.beginPath();   // один контур: без наложения прозрачности
  for (let i = 0; i < 4; i++) { const h = Math.sin(s + i * 12.9898) * 43758.5453, r = h - Math.floor(h), cx = 2 + (r - 0.5) * 12, cy = 2 + Math.cos(s + i) * 6;
    ctx.moveTo(cx + (8 + r * 8) * (i ? 0.7 : 1), cy); ctx.ellipse(cx, cy, (8 + r * 8) * (i ? 0.7 : 1), (5 + r * 6) * (i ? 0.7 : 1), r * 3, 0, 6.28); }
  ctx.fill(); ctx.restore();
}

/* ---------- генератор и предметы на земле: новые растры в прежних размерах/области ---------- */
function g7Prop(o) {
  if (!G3_READY()) return false;
  const pr = G3.pack.manifest.props && G3.pack.manifest.props.generator, im = pr && packImage(pr.file);
  if (!im) return false;
  const k = Math.min(o.w / pr.width, o.h / pr.height) * 1.17;   // содержимое PNG ≈86% кадра: вписываем рисунок, а не поля, в bbox
  const w = pr.width * k, h = pr.height * k;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2 + 2, o.y + o.h - 2, o.w / 2, 4, 0, 0, 6.28); ctx.fill();
  ctx.drawImage(im, o.x + (o.w - w) / 2, o.y + (o.h - h) / 2, w, h);
  return true;
}
const PICK_SIZE = { fuel: [18, 22], fuse: [12, 12] };
function g7Pick(o) {
  if (!G3_READY() || !G3.pack) return false;
  const it = G3.pack.manifest.items[o.pick], im = it && packImage(it.file); if (!im) return false;
  const sz = PICK_SIZE[o.pick] || [14, 14], cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(cx + 1, cy + sz[1] / 2 - 1, sz[0] / 2 + 1, 3, 0, 0, 6.28); ctx.fill();
  ctx.drawImage(im, cx - sz[0] / 2, cy - sz[1] / 2, sz[0], sz[1]);
  const t = (S.min * 2) % 1; ctx.strokeStyle = 'rgba(255,220,140,' + (0.5 - t * 0.5) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 10 + t * 10, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1;
  return true;
}
/* встроенные изображения пакета, которых нет среди кадров актёров (props, предметы на земле): загружаются один раз */
const PACKIMG = {};
function packImage(file) {
  let im = PACKIMG[file];
  if (!im) { const src = G3.pack && G3.pack.images[file]; if (!src) return null; im = PACKIMG[file] = new Image(); im.onerror = () => { im.bad = 1; }; im.src = src; }
  return !im.bad && im.complete && im.naturalWidth ? im : null;
}

/* приёмочные кадры: провести риг по заданному пути с шагом 1/fps, затем заморозить (e.qaRig) */
function qaRig(e, dist, fps, state) {
  const r = rigActive(e); if (!r) return null;
  const n = Math.max(1, Math.round((dist || 0) / 2)), dt = 1 / (fps || 60);
  let g = GAIT.get(e); if (!g) { g = { x: e.x, y: e.y, dist: 0, moveT: 0 }; GAIT.set(e, g); }
  for (let i = 0; i < n; i++) CordonRig.update(r.rig, { state: state || rigState(e, dist > 0), distance: dist ? dist / n : 0 }, dt);
  if (dist) { g.dist += dist; g.moveT = 1; }
  e.qaRig = 1; return { phase: r.rig.phase, step: r.rig.step, state: r.rig.state };
}

/* Контуры наземного декора. Та же точка, угол и масштаб, что у рисунка.
   Выпуклый контур берём с альфа-канала до добавления падающей тени. */
const propCells = new Map(), propHulls = new Map(), fieldProps = [];
function spriteHull(id) {
  if (propHulls.has(id)) return propHulls.get(id);
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); ART.draw(g, id, 16, 16, 32, 32);
  const rgba = g.getImageData(0, 0, 32, 32).data, points = [];
  for (let x = 0; x < 32; x++) {
    let lo = 32, hi = -1;
    for (let y = 0; y < 32; y++) if (rgba[(y*32+x)*4+3] >= 144) { lo = Math.min(lo,y); hi = y; }
    if (hi >= 0) { points.push([x+.5,lo+.5]); if (hi > lo) points.push([x+.5,hi+.5]); }
  }
  const half = ordered => {
    const edge = [];
    for (const p of ordered) {
      while (edge.length >= 2) {
        const a = edge[edge.length-2], b = edge[edge.length-1];
        if ((b[0]-a[0])*(p[1]-a[1]) > (b[1]-a[1])*(p[0]-a[0])) break;
        edge.pop();
      }
      edge.push(p);
    }
    edge.pop(); return edge;
  };
  const hull = half(points).concat(half(points.reverse()));
  propHulls.set(id,hull); return hull;
}
function addFootprint(id,x,y,w,h,angle=0) {
  const ca=Math.cos(angle), sa=Math.sin(angle);
  const vertices=spriteHull(id).map(([u,v]) => {
    const dx=(u/32-.5)*w, dy=(v/32-.5)*h;
    return [x+ca*dx-sa*dy,y+sa*dx+ca*dy];
  });
  if (vertices.length < 3) return;
  const xs=vertices.map(p=>p[0]), ys=vertices.map(p=>p[1]);
  const p={id,vertices}; fieldProps.push(p);
  for(let ty=Math.floor(Math.min(...ys)/T);ty<=Math.floor(Math.max(...ys)/T);ty++)
    for(let tx=Math.floor(Math.min(...xs)/T);tx<=Math.floor(Math.max(...xs)/T);tx++) {
      if (!inb(tx,ty)) continue;
      const key=ty*MW+tx;
      if (!propCells.has(key)) propCells.set(key,[]);
      propCells.get(key).push(p);
    }
}
function touchesProp(p,e,push=false) {
  let inside=true, best=Infinity, ox=0, oy=0, nx=0, ny=0;
  for(let i=0;i<p.vertices.length;i++){
    const a=p.vertices[i], b=p.vertices[(i+1)%p.vertices.length], dx=b[0]-a[0],dy=b[1]-a[1];
    const u=e.x-a[0],v=e.y-a[1], length=dx*dx+dy*dy;
    if(dx*v-dy*u<0) inside=false;
    const t=clamp((u*dx+v*dy)/length,0,1), qx=u-t*dx,qy=v-t*dy, ds=qx*qx+qy*qy;
    if(ds<best){best=ds;ox=qx;oy=qy;nx=dy/Math.sqrt(length);ny=-dx/Math.sqrt(length);}
  }
  if(!inside && best>=e.r*e.r) return false;
  if(push){
    const d=Math.sqrt(best);
    if(d>.0001){nx=ox/d*(inside?-1:1);ny=oy/d*(inside?-1:1);}
    const shift=e.r+(inside?d:-d); e.x+=shift*nx; e.y+=shift*ny;
  }
  return true;
}
function buildFieldProps(){
  propCells.clear(); fieldProps.length=0;
  if(!ART) return;
  for(const [kind,tx,ty,angle] of DECOR){
    if(kind==='ford'||(kind==='fence' && BIG && C1)) continue;
    const art=C1 && C1DECOR[kind], id=art?art[0]:kind, sp=ART.m.sprites[id];
    if(!sp) continue;
    const w=art?art[1]:sp.logicalSize[0], h=art?w*sp.rect[3]/sp.rect[2]:sp.logicalSize[1];
    addFootprint(id,tx*T,ty*T,w,h,angle);
  }
  if(!C1) return;
  if(BIG) for(const [id,tx,ty,w,a] of CORDON_DETAILS){
    if(id==='c1_trace_apples') continue;
    const r=ART.m.sprites[id].rect;
    addFootprint(id,tx*T,ty*T,w,w*r[3]/r[2],a);
  }
  for(let y=3;y<=MH-4;y++) for(let x=3;x<=PW-4;x++){
    if(tAt(x,y)!==GR) continue;
    const p=scatterObject(x,y);
    if(p && !p.id.startsWith('c1_decal')) addFootprint(p.id,p.cx,p.cy,p.w,p.hh,p.a);
  }
}

/* Сейфы и схроны привязаны к тем же местам, что ящики во всех версиях карты. */
function placeSearchContainers(){
  for(const [anchor,kind,loot] of [
    ['st1','safe',{money:180,a9:12}], ['st7','safe',{antirad:1,money:90}],
    ['st3','hiding',{bandage:2,bread:1}], ['st5','hiding',{a12:6,medkit:1}]
  ]){
    const ref=objs.find(o=>o.stash===anchor); if(!ref) continue;
    const tx=Math.floor(ref.x/T), ty=Math.floor(ref.y/T);
    let placed=false;
    for(let r=1;r<=5&&!placed;r++) for(let dy=-r;dy<=r&&!placed;dy++) for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
      const x=tx+dx,y=ty+dy;
      const cx=(x+.5)*T, cy=(y+.5)*T;
      if(HOUSES.some(h=>h.entrances.some(d=>Math.hypot(cx-h.x*T-d.x,cy-h.y*T-d.y)<72))) continue;
      if(NPCDEF.some(n=>Math.hypot(cx-n.x*T,cy-n.y*T)<32)) continue;
      if(!inb(x,y)||!nav[y*MW+x] || ![[1,0],[-1,0],[0,1],[0,-1]].every(([i,j])=>nav[(y+j)*MW+x+i])) continue;
      addObj({k:kind,stash:kind+'_'+anchor,x:(x+.5)*T-11,y:(y+.5)*T-9,w:22,h:18,solid:kind==='safe',loot});
      placed=true; break;
    }
  }
}
function restoreContainer(o){
  if(!o.initialLoot) o.initialLoot={...o.loot};
  o.looted=!!S.flags['st_'+o.stash];
  o.loot=o.looted?{}:{...(S.flags['contents_'+o.stash]||o.initialLoot)};
  if(o.k==='crate'){
    o.broken=o.looted||!!S.flags['broken_'+o.stash];
    o.solid=!o.broken;
  }
}
function recordContents(o){
  const empty=!Object.keys(o.loot).length;
  if(o.fieldTile != null){
    const stock = S.flags.fieldCrates;
    stock.drops[o.fieldTile] = o.loot;
    o.looted = empty;
  }else if(o.stash){
    S.flags['contents_'+o.stash]={...o.loot}; o.looted=empty;
    if(empty) S.flags['st_'+o.stash]=1;
  }else if(o.k==='cache'){
    S.flags['cache_contents_'+o.cacheId]={...o.loot};
    if(empty) S.caches[o.cacheId]=2;
  }
}
function breakCrate(o){
  if(o.broken || o.k!=='crate' || !o.stash) return;
  if(o.fieldTile != null) breakFieldBox(o);
  else S.flags['broken_'+o.stash]=1;
  o.broken=true; o.solid=false; scheduleCrateCleanup(o); buildGrids();
  play('hit',o.x,o.y);
  for(let i=0;i<8;i++) parts.push({x:o.x+o.w/2,y:o.y+o.h/2,vx:rnd(-50,50),vy:rnd(-45,45),life:rnd(.15,.4),c:i%2?'#947349':'#59402a',s:2});
}
// Игровые минуты, отсчитываются от удара, а не от подбора или загрузки.
const CRATE_LIFETIME = 6 * 60;
let nextCrateCleanup = Infinity;
const retiredFixedCrates = [];

function scheduleCrateCleanup(o) {
  const times = S.flags.crateCleanup || (S.flags.crateCleanup = {});
  // У старых сохранений нет времени разрушения. Даём срок от первой загрузки.
  const end = times[o.stash] ?? (times[o.stash] = S.min + CRATE_LIFETIME);
  nextCrateCleanup = Math.min(nextCrateCleanup, end);
}

function clearCrateRemains(index) {
  const o = objs[index];
  if (G.near?.o === o) G.near = null;
  o.loot = {}; o.looted = true;
  objs.splice(index, 1);
  if (o.fieldTile != null) {
    delete S.flags.fieldCrates.drops[o.fieldTile];
  } else {
    // В новой игре исходный ящик снова понадобится. В этом прохождении достаточно одной отметки.
    retiredFixedCrates.push(o);
    S.flags['st_'+o.stash] = 2;
    delete S.flags['contents_'+o.stash];
    delete S.flags['broken_'+o.stash];
  }
}

function cleanExpiredCrates() {
  if (S.min < nextCrateCleanup) return;
  const times = S.flags.crateCleanup;
  nextCrateCleanup = Infinity;
  for (let i = objs.length-1; i >= 0; i--) {
    const o = objs[i];
    if (!o.broken || o.k !== 'crate') continue;
    if (times[o.stash] <= S.min) {
      delete times[o.stash];
      clearCrateRemains(i);
    } else {
      nextCrateCleanup = Math.min(nextCrateCleanup, times[o.stash]);
    }
  }
  if (!Object.keys(times).length) delete S.flags.crateCleanup;
}

function restoreCrateCleanup() {
  nextCrateCleanup = Infinity;
  for (let i = objs.length-1; i >= 0; i--) {
    const o = objs[i];
    if (!o.broken || o.k !== 'crate') continue;
    if (o.fieldTile == null && S.flags['st_'+o.stash] === 2) clearCrateRemains(i);
    else scheduleCrateCleanup(o);
  }
  cleanExpiredCrates();
}

function containerOnRay(sh,ca,sa,limit){
  let o=null,d=limit;
  for(const box of objs){
    if(!(box.stash && box.solid)) continue;
    const t=rayBox(box,sh.x,sh.y,ca,sa,0,d);
    if(t<d){o=box;d=t;}
  }
  return {o,d};
}
function containerDraw(o){
  const g=ctx,x=o.x+o.w/2,y=o.y+o.h/2;
  g.save(); g.translate(x,y);
  if(o.k==='crate'){
    for(const [dx,dy,len,angle] of [[-8,-7,19,-.48],[2,-5,21,.23],[-5,4,16,.68],[5,8,15,-.19]]){
      g.save();g.translate(dx,dy);g.rotate(angle);g.fillStyle='#32291f';g.fillRect(-len/2,-2,len,5);
      g.fillStyle='#806343';g.fillRect(-len/2,-2,len-1,2);g.restore();
    }
    Object.keys(o.loot).forEach((id,i)=>{
      const drops=[[15,-4],[5,13],[-13,6],[-4,-13]];
      const [px,py]=drops[i%drops.length];
      const frame=G3.pack?.manifest.items?.[id], im=frame && packImage(frame.file);
      if(im){
        const scale=15/Math.max(im.naturalWidth,im.naturalHeight);
        const w=im.naturalWidth*scale,h=im.naturalHeight*scale;
        g.drawImage(im,px-w/2,py-h/2,w,h);
      }
      else {g.fillStyle=id==='money'?'#83816a':'#ada389';g.fillRect(px-4,py-3,8,6);g.fillStyle='#534b39';g.fillRect(px-1,py-3,2,6);}
    });
  }else if(o.k==='safe'){
    g.fillStyle='#242522';g.fillRect(-11,-8,23,19);
    const metal=g.createLinearGradient(0,-9,0,8);metal.addColorStop(0,'#76766a');metal.addColorStop(1,'#41433c');
    g.fillStyle=metal;g.fillRect(-11,-10,22,16);g.strokeStyle='#969081';g.strokeRect(-9,-8,18,12);
    g.fillStyle='#2b2c28';g.fillRect(-7,-5,3,7);g.fillStyle='#aca38a';g.fillRect(-7,-5,5,2);
    g.beginPath();g.arc(5,-2,2,0,Math.PI*2);g.stroke();
  }else if(ART){ART.draw(g,'stash',0,0,22,18);}
  else{g.fillStyle='#55513a';g.fillRect(-10,-6,20,12);g.fillStyle='#322d21';g.fillRect(-8,-1,16,2);}
  g.restore();
}

// Оставляем персонажа как можно ближе к его исходному месту у костра или поста.
function clearPropSpawn(e) {
  const tx=Math.floor(e.x/T), ty=Math.floor(e.y/T);
  if(!propCells.has(ty*MW+tx)) return;
  for(let distance=0;distance<=2*T;distance+=3){
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8, x=e.x+Math.cos(a)*distance, y=e.y+Math.sin(a)*distance;
      if(!nav[Math.floor(y/T)*MW+Math.floor(x/T)]) continue;
      const probe={x,y,r:e.r}; collide(probe);
      if(Math.hypot(probe.x-x,probe.y-y)>.01) continue;
      e.x=e.home.x=x; e.y=e.home.y=y;
      return;
    }
  }
}

// На большом Кордоне 24 сменных ящика. В сохранении хранятся клетки, добыча и
// абсолютные сроки по игровым часам. Обломки с вещами существуют независимо от замены.
const FIELD_CRATE_COUNT = 24;
const fieldCrateSites = [];
let nextFieldCrateAt = Infinity;

function buildFieldCrateSites() {
  if (!BIG) return;
  const start = locPt('village', 'safe');
  const root = nearestNav(Math.floor(start.x / T), Math.floor(start.y / T));
  const reachable = new Uint8Array(MW * MH), queue = [root];
  reachable[root] = 1;
  for (let i = 0; i < queue.length; i++) {
    for (const adjacent of [queue[i]-1, queue[i]+1, queue[i]-MW, queue[i]+MW]) {
      if (nav[adjacent] && !reachable[adjacent]) {
        reachable[adjacent] = 1;
        queue.push(adjacent);
      }
    }
  }
  // Между точками остаётся не менее шести клеток. Вокруг каждой свободен
  // квадрат 3×3, поэтому поставленный ящик можно обойти с четырёх сторон.
  fieldCrateSites.length = 0;
  for (let y = 4; y < MH-4; y += 6) for (let x = 4; x < PW-4; x += 6) {
    const tile = y*MW+x, cx = (x+.5)*T, cy = (y+.5)*T;
    if (map[tile] !== GR || !reachable[tile] || DIRS.some(([dx,dy]) => !nav[tile+dx+dy*MW])) continue;
    const clearance = {x:cx, y:cy, r:20};
    if ([[0,0],...DIRS].some(([dx,dy]) =>
      propCells.get(tile+dx+dy*MW)?.some(prop => touchesProp(prop,clearance)))) continue;
    if (HOUSES.some(h => x >= h.x-2 && x < h.x+h.w+2 && y >= h.y-2 && y < h.y+h.h+2)) continue;
    if (objs.some(o => Math.hypot(o.x+(o.w||0)/2-cx,o.y+(o.h||0)/2-cy) < 65)) continue;
    if (NPCDEF.some(n => Math.hypot(n.x*T-cx,n.y*T-cy) < 70)) continue;
    if (CACHES.some(c => Math.hypot(c.x*T-cx,c.y*T-cy) < 48)) continue;
    fieldCrateSites.push(tile);
  }
}

function fieldSector(tile) {
  return Math.floor((tile%MW)*3/PW) + (Math.floor(tile/MW) >= MH/2 ? 3 : 0);
}

function chooseFieldSite(stock, previous) {
  const used = new Set(stock.slots.map(slot => slot.tile)), counts = [0,0,0,0,0,0];
  for (const slot of stock.slots) if (!slot.due) counts[fieldSector(slot.tile)]++;
  const candidates = [], questItems = objs.filter(o => o.pick);
  let best = Infinity;
  for (const tile of fieldCrateSites) {
    if (used.has(tile) || stock.drops[tile] || (previous != null && fieldSector(tile) === fieldSector(previous))) continue;
    if (previous != null && Math.hypot(tile%MW-previous%MW,Math.floor(tile/MW)-Math.floor(previous/MW)) < 32) continue;
    const cx = (tile%MW+.5)*T, cy = (Math.floor(tile/MW)+.5)*T;
    if (previous != null && Math.abs(cx-P.x) < VW/(2*Z)+2*T && Math.abs(cy-P.y) < VH/(2*Z)+2*T) continue;
    const score = counts[fieldSector(tile)];
    if (score > best || !nav[tile]) continue;
    if (ents.some(e => e.alive && Math.hypot(e.x-cx,e.y-cy) < 60)) continue;
    if (questItems.some(o => Math.hypot(o.x-cx,o.y-cy) < 50)) continue;
    if (score < best) { best = score; candidates.length = 0; }
    candidates.push(tile);
  }
  return candidates.length ? candidates[ri(0,candidates.length-1)] : null;
}

function fieldCrateLoot() {
  const ammo = ['a9','a12','a545'][ri(0,2)];
  const supplies = ['bandage','bread','cans','antirad','medkit'][ri(0,4)];
  const loot = { [ammo]: ammo === 'a12' ? ri(2,5) : ri(4,12), [supplies]: 1 };
  if (ri(1,4) === 1) loot.money = ri(15,65);
  return loot;
}

function fieldBox(tile, loot, broken) {
  return {k:'crate', stash:'field_'+tile, fieldTile:tile,
    x:(tile%MW+.5)*T-13, y:(Math.floor(tile/MW)+.5)*T-13,
    w:26, h:26, loot, broken, solid:!broken, looted:broken && !Object.keys(loot).length};
}

function loadFieldCrates() {
  nextFieldCrateAt = Infinity;
  if (!BIG) return;
  const stock = S.flags.fieldCrates || (S.flags.fieldCrates = {slots:[], drops:{}});
  while (stock.slots.length < FIELD_CRATE_COUNT) {
    const tile = chooseFieldSite(stock, null);
    if (tile == null) break;
    stock.slots.push({tile, loot:fieldCrateLoot(), due:0});
  }
  for (const slot of stock.slots) {
    if (!slot.due) objs.push(fieldBox(slot.tile,slot.loot,false));
    else nextFieldCrateAt = Math.min(nextFieldCrateAt,slot.due);
  }
  for (const [tile,loot] of Object.entries(stock.drops)) objs.push(fieldBox(Number(tile),loot,true));
  buildGrids();
}

function breakFieldBox(o) {
  const stock = S.flags.fieldCrates, tile = o.fieldTile;
  const slot = stock.slots.find(s => s.tile === tile && !s.due);
  stock.drops[tile] = o.loot;
  slot.loot = {};
  slot.due = S.min + ri(120,240);
  nextFieldCrateAt = Math.min(nextFieldCrateAt,slot.due);
}

function renewFieldCrates() {
  if (S.min < nextFieldCrateAt) return;
  const stock = S.flags.fieldCrates;
  let changed = false;
  nextFieldCrateAt = Infinity;
  for (const slot of stock.slots) {
    if (!slot.due) continue;
    if (slot.due <= S.min) {
      const tile = chooseFieldSite(stock,slot.tile);
      if (tile != null) {
        slot.tile = tile; slot.due = 0; slot.loot = fieldCrateLoot();
        objs.push(fieldBox(tile,slot.loot,false));
        changed = true;
        continue;
      }
    }
    nextFieldCrateAt = Math.min(nextFieldCrateAt,slot.due > S.min ? slot.due : S.min+1);
  }
  if (changed) buildGrids();
}

/* ===================== звук ===================== */
let AC = null, master = null, noiseBuf = null;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340;
    const g = AC.createGain(); g.gain.value = 0.05;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(g); g.connect(master); src.start();
  } catch (e) { AC = null; }
}
function nz(dur, freq, q, vol, type, when) {
  const t = AC.currentTime + (when || 0), s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(Math.max(0.0001, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function tn(f0, f1, dur, vol, type, when) {
  const t = AC.currentTime + (when || 0), o = AC.createOscillator(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(Math.max(0.0001, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
const SND = {
  p: v => gunshot('p', v), s: v => gunshot('s', v), r: v => gunshot('r', v),
  shell: v => { const f = 4200 + Math.random() * 1500; tn(f, f * 0.98, 0.05, 0.05 * v, 'sine', 0.35); tn(f * 1.3, f * 1.28, 0.04, 0.03 * v, 'sine', 0.47); },
  knife: v => nz(0.09, 3000, 2, 0.35 * v, 'bandpass'),
  click: () => { nz(0.02, 3500, 4, 0.25, 'bandpass'); tn(900, 700, 0.025, 0.08, 'square'); },
  jam: () => { nz(0.04, 2200, 5, 0.35, 'bandpass'); nz(0.05, 1200, 5, 0.25, 'bandpass', 0.08); },
  beep: v => tn(1900, 1900, 0.05, 0.08 * v, 'square'),
  eat: () => { nz(0.08, 900, 2, 0.15, 'bandpass'); nz(0.08, 700, 2, 0.12, 'bandpass', 0.18); },
  reload: () => { nz(0.05, 2500, 3, 0.3, 'bandpass'); nz(0.06, 1700, 3, 0.3, 'bandpass', 0.35); },
  geiger: () => nz(0.01, 3200, 1, 0.4, 'highpass'),
  hurt: () => tn(150, 60, 0.18, 0.35, 'triangle'),
  dog: v => { tn(560, 280, 0.11, 0.22 * v, 'sawtooth'); tn(520, 260, 0.1, 0.18 * v, 'sawtooth', 0.15); },
  boom: v => { nz(1.3, 380, 0.5, 1.3 * v); tn(80, 28, 0.9, 0.7 * v); },
  anomG: v => { tn(95, 30, 0.9, 0.6 * v); nz(0.6, 300, 1, 0.4 * v); },
  anomE: v => { nz(0.35, 5000, 2, 0.6 * v, 'highpass'); tn(60, 58, 0.3, 0.25 * v, 'sawtooth'); },
  zap: v => nz(0.06, 6000, 3, 0.15 * v, 'highpass'),
  pda: () => { tn(1320, 1320, 0.06, 0.1, 'square'); tn(1760, 1760, 0.08, 0.1, 'square', 0.08); },
  bolt: () => tn(2600, 2200, 0.05, 0.08, 'triangle'),
  pick: () => tn(700, 1100, 0.1, 0.15, 'triangle'),
  stepGrass: v => nz(0.07, 700 + Math.random() * 300, 0.8, 0.13 * v),
  stepDirt: v => nz(0.06, 500 + Math.random() * 200, 1, 0.16 * v),
  stepHard: v => { nz(0.03, 2200 + Math.random() * 600, 1.5, 0.14 * v, 'bandpass'); nz(0.05, 300, 1, 0.08 * v); },
  stepWood: v => { nz(0.05, 450 + Math.random() * 150, 3, 0.2 * v, 'bandpass'); tn(140, 90, 0.05, 0.05 * v, 'triangle'); },
  stepWet: v => { nz(0.09, 1400 + Math.random() * 600, 1.2, 0.12 * v, 'bandpass'); nz(0.05, 400, 1, 0.06 * v); },
  stepGravel: v => { nz(0.08, 3000, 0.8, 0.12 * v, 'highpass'); nz(0.05, 600, 1, 0.07 * v); },
  stepDog: v => nz(0.03, 900, 2, 0.06 * v, 'bandpass'),
  voice: v => { const n = 3 + Math.floor(Math.random() * 4), f = 95 + Math.random() * 70; for (let i = 0; i < n; i++) { const ff = f * (0.85 + Math.random() * 0.35); tn(ff, ff * 0.92, 0.09, 0.07 * v, 'triangle', i * 0.1); nz(0.03, 2500, 2, 0.03 * v, 'bandpass', i * 0.1 + 0.05); } },
  radio: v => { nz(0.25, 2500, 1, 0.1 * v, 'bandpass'); SND.voice(v * 0.7); nz(0.08, 3000, 2, 0.12 * v, 'bandpass', 0.6); },
  thunder: () => { nz(2.6, 140, 0.4, 0.9); nz(0.5, 500, 0.6, 0.5); },
  siren: () => { tn(380, 760, 1.8, 0.1, 'sawtooth'); tn(760, 380, 1.8, 0.1, 'sawtooth', 1.8); },
  blow: () => { nz(3.5, 90, 0.4, 1.2); tn(55, 30, 3, 0.8); }
};
function play(name, x, y, mul) {
  if (!AC || !SND[name]) return;
  let v = mul || 1;
  if (x !== undefined && P) { const d = dst(P.x, P.y, x, y); v *= clamp(1 - d / 950, 0, 1); if (v < 0.03) return; if (inBunker(P.x, P.y) !== inBunker(x, y)) return; }
  try { SND[name](v); } catch (e) {}
}

/* ---------- выстрелы: щелчок, хлопок, низ, хвост с эхом ---------- */
let verb = null, verbIn = null;
function makeVerb() {
  const sr = AC.sampleRate, len = Math.floor(sr * 1.8), b = AC.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (t < 0.012 ? 0 : 1) * (t > 0.09 && t < 0.11 ? 1.8 : 1); } }
  verb = AC.createConvolver(); verb.buffer = b;
  verbIn = AC.createGain(); verbIn.gain.value = 0.55;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  verbIn.connect(lp); lp.connect(verb); verb.connect(master);
}
const GUN = {
  p: { crack: 2600, cv: 0.9, cd: 0.035, body: 520, bv: 1.1, bd: 0.11, thump: [150, 45], tv: 0.7, tail: 0.6 },
  s: { crack: 1900, cv: 1.0, cd: 0.05, body: 340, bv: 1.6, bd: 0.22, thump: [110, 32], tv: 1.1, tail: 1.0 },
  r: { crack: 3100, cv: 1.0, cd: 0.03, body: 620, bv: 1.0, bd: 0.09, thump: [170, 50], tv: 0.6, tail: 0.75 }
};
function gunshot(k, v) {
  if (!verb) makeVerb();
  const G = GUN[k], far = 1 - v, t = AC.currentTime;
  const out = AC.createGain(); out.gain.value = 1;
  const tone = AC.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 12000 - far * 10500;
  out.connect(tone); tone.connect(master);
  const send = AC.createGain(); send.gain.value = 0.35 + far * 0.9; out.connect(send); send.connect(verbIn);
  const burst = (dur, f, q, vol, type, when) => {
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = AC.createGain(); const st = t + (when || 0);
    g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(vol, st + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    s.connect(fl); fl.connect(g); g.connect(out); s.start(st, Math.random() * 0.4); s.stop(st + dur + 0.05);
  };
  const vv = v * (1 - far * 0.35);
  burst(0.006, 6000, 0.7, 1.2 * vv * (1 - far), 'highpass');
  burst(G.cd, G.crack, 0.9, G.cv * vv, 'bandpass');
  burst(G.bd, G.body, 0.6, G.bv * vv, 'lowpass');
  const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(G.thump[0], t); o.frequency.exponentialRampToValueAtTime(G.thump[1], t + 0.12);
  og.gain.setValueAtTime(G.tv * vv, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.2);
  burst(0.5 * G.tail + far * 0.6, 900 - far * 400, 0.5, 0.18 * v, 'lowpass', 0.015);
}

/* ===================== DOM-помощники ===================== */
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function sv(tag, attrs, text) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; }
function icon(id) { const s = sv('svg', { 'class': 'ic', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); s.appendChild(sv('use', { href: '#' + id })); return s; }
function btn(cls, text, fn, dis) { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', e => { e.stopPropagation(); fn(); }); if (dis) b.disabled = true; return b; }
const ICON = { knife: 'i-knife', w_pm: 'i-pm', w_obrez: 'i-obrez', w_aksu: 'i-aksu', medkit: 'i-medkit', bandage: 'i-bandage', antirad: 'i-antirad',
  vodka: 'i-vodka', bread: 'i-bread', sausage: 'i-sausage', cans: 'i-cans', grenade: 'i-grenade', a9: 'i-ammo', a12: 'i-ammo', a545: 'i-ammo',
  ar_jacket: 'i-jacket', ar_bandit: 'i-jacket', ar_zarya: 'i-suit', art_medusa: 'i-art', art_bengal: 'i-art', art_blood: 'i-art', tail: 'i-tail', tentacle: 'i-tail', flash: 'i-flash' };
const ICOL = { art_medusa: '#dc9330', art_bengal: '#7fb0c4', art_blood: '#d64541', medkit: '#9db264', bandage: '#9db264', antirad: '#9db264', flash: '#7fb0c4' };
function itemIcon(id) { const g = g3Icon(id); if (g) return g; const b = b1Icon(id); if (b) return b; const i = icon(ICON[id] || 'i-pack'); if (ICOL[id]) i.style.color = ICOL[id]; return i; }
const FCOL = { loner: '#d9c25a', bandit: '#a79cc4', army: '#6fa35c', mutant: '#d64541', trader: '#7fb0c4' };
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function avatar(name, fac) {
    var h = hash(name || '?'), s = sv('svg', { 'class': 'ava', viewBox: '0 0 48 48', 'aria-hidden': 'true' });
    var coats = { loner: ['#5d6243', '#6b5a3c', '#4d5a4a', '#70664a'], bandit: ['#2b2b30', '#3a3340', '#33302c'], army: ['#3f5a36', '#4a6040'], trader: ['#4c5a60', '#5a5248'] }[fac] || ['#555'];
    var coat = coats[h % coats.length], skin = ['#c9a784', '#b8946f', '#d3b392', '#a98562'][(h >>> 3) % 4], gear = (h >>> 5) % 4, beard = (h >>> 8) % 3 === 0;
    s.appendChild(sv('rect', { width: 48, height: 48, fill: '#0c100b' }));
    s.appendChild(sv('path', { d: 'M0 30h48M0 18h48M0 6h48', stroke: '#141a12', 'stroke-width': 1 }));
    if (fac === 'mutant') {
      s.appendChild(sv('path', { d: 'M10 34c0-9 6-17 14-17s14 8 14 17c-3 4-8 6-14 6s-11-2-14-6zM12 20l2-9 6 6M36 20l-2-9-6 6', fill: '#5a2a26', stroke: '#d64541', 'stroke-width': 1 }));
      s.appendChild(sv('path', { d: 'M18 33l2 4 2-4 2 4 2-4 2 4 2-4', fill: 'none', stroke: '#d8d2bc', 'stroke-width': 1.200 }));
      return s;
    }
    s.appendChild(sv('path', { d: 'M4 48c0-11 8-16 20-16s20 5 20 16z', fill: coat }));
    if (gear === 0) s.appendChild(sv('ellipse', { cx: 24, cy: 20.500, rx: 12, ry: 13.500, fill: coat, stroke: '#0c100b', 'stroke-width': .8 }));
    s.appendChild(sv('path', { d: 'M20 30h8v5l-4 3-4-3z', fill: skin }));
    s.appendChild(sv('ellipse', { cx: 24, cy: 21, rx: 8, ry: 9.500, fill: skin }));
    if (beard) s.appendChild(sv('path', { d: 'M16.500 23c1 6 4 8.500 7.500 8.500s6.500-2.500 7.500-8.500c-2 2-5 3-7.500 3s-5.500-1-7.500-3z', fill: '#3a3128' }));
    s.appendChild(sv('path', { d: 'M19.500 20.500h3M25.500 20.500h3', stroke: '#1c1812', 'stroke-width': 1.400, 'stroke-linecap': 'round' }));
    if (gear === 0) s.appendChild(sv('path', { d: 'M15 18c1-5 4.500-8 9-8s8 3 9 8c-2.500-2.500-5.500-3.500-9-3.500s-6.500 1-9 3.500z', fill: '#0c100b', opacity: .45 }));
    else if (gear === 1) s.appendChild(sv('path', { d: 'M15.500 17.500c0-6 4-9.500 8.500-9.500s8.500 3.500 8.500 9.500c-3-1.500-6-2-8.500-2s-5.500.5-8.500 2z', fill: '#2c2f33' }));
    else if (gear === 2) s.appendChild(sv('path', { d: 'M15 17c0-5 4-8.500 9-8.500s9 3.500 9 8.500l5 1.500-1 1.800-13-1.500-9 .5z', fill: '#4a4436' }));
    else s.appendChild(sv('path', { d: 'M16 16c1-4 4-6.500 8-6.500s7 2.500 8 6.500c-2.500-2-5-2.500-8-2.500s-5.500.5-8 2.500z', fill: '#3a3128' }));
    s.appendChild(sv('rect', { x: 0, y: 44, width: 48, height: 4, fill: FCOL[fac] || '#555', opacity: .9 }));
    return s;
  }

function person(c) {
  const p = el('div', 'person');
  p.appendChild(portraitFor(c));
  const d = el('div', 'grow');
  d.appendChild(el('div', 'pn', c.n));
  if (c.rank || c.grp) d.appendChild(el('div', 'pm', [c.rank, c.grp].filter(Boolean).join(' · ')));
  if (c.att) d.appendChild(el('div', 'pa' + (/враг/.test(c.att) ? ' foe' : /друг/.test(c.att) ? ' pal' : ''), c.att));
  if (c.money !== undefined) d.appendChild(el('div', 'price', c.money + ' RU'));
  p.appendChild(d);
  return p;
}
const cardOf = e => ({ ent: e, n: e.name, rank: RANKS[e.rank || 0], grp: FAC_N[e.fac], fac: e.fac, att: attWord(e) });
const SIDCARD = () => ({ ent: byS('sid') || { sid: 'sid', name: 'Сидорович', fac: 'trader' }, n: 'Сидорович', rank: 'ветеран', grp: 'Торговцы', fac: 'trader', att: 'нейтрал' });
const meCard = () => ({ isPlayer: 1, n: 'Меченый', rank: RANKS[rankOf(score())], grp: 'Одиночки', fac: 'loner', att: S.rep >= 20 ? 'свой среди одиночек' : S.rep <= -30 ? 'враг одиночек' : 'нейтрал', money: S.money });

/* ===================== панели ===================== */
let panel = null;
const ov = $('ov'), pbody = $('pbody'), ptitle = $('ptitle'), ptabs = $('ptabs');
function openPanel(kind, title, tabs) {
  panel = { kind: kind, tab: tabs ? tabs[0][0] : null, tabs: tabs, sel: null, hint: '' };
  ptitle.textContent = title;
  ov.classList.add('open');
  IN.fire = false; IN.touchFire = false; IN.fireStick = null; IN.btnFire = false; IN.left = null; IN.aimStick = null; IN.moveX = IN.moveY = 0;
  drawTabs();
}
function drawTabs() {
  ptabs.textContent = '';
  ptabs.style.display = panel.tabs ? '' : 'none';
  (panel.tabs || []).forEach(t => {
    const b = btn('', t[1], () => { panel.tab = t[0]; panel.hint = ''; drawTabs(); refresh(); pbody.scrollTop = 0; });
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', panel.tab === t[0] ? 'true' : 'false');
    ptabs.appendChild(b);
  });
}
function closePanel() { if (!panel) return; const k = panel.kind; panel = null; ov.classList.remove('open'); if (k === 'trader' || k === 'trade') save(true); }
$('pclose').addEventListener('click', closePanel);
ov.addEventListener('click', e => { if (e.target === ov) closePanel(); });
function refresh() {
  if (!panel) return;
  const top = pbody.scrollTop;
  pbody.textContent = '';
  if (panel.hint) pbody.appendChild(el('p', 'hint', panel.hint));
  ({ dialog: drawDialog2, trade: drawTrade2, inv: drawInv2, loot: drawLoot, pda: drawPda2, menu: drawMenu })[panel.kind === 'trader' ? 'dialog' : panel.kind]();
  pbody.scrollTop = top;
}

/* ---------- диалоги ---------- */
function dialog(card, lines, optsFn, kind, e) {
  openPanel(kind || 'dialog', 'Разговор');
  panel.card = card; panel.lines = lines.map(t => ({ s: 'npc', t: t })); panel.opts = optsFn; panel.e = e;
  refresh(); pbody.scrollTop = 0;
}
function say(t) { if (!panel || !panel.lines) { msg(t, 'say'); return; } panel.lines.push({ s: 'npc', t: t }); }
function sys(t) { if (!panel || !panel.lines) { msg(t, 'good'); return; } panel.lines.push({ s: 'sys', t: t }); }
function drawDialog() {
  pbody.appendChild(person(panel.card));
  const L = el('div', 'lines');
  panel.lines.slice(-8).forEach(l => L.appendChild(el('p', l.s, (l.s === 'npc' ? '— ' : l.s === 'me' ? '› ' : '') + l.t)));
  pbody.appendChild(L);
  const O = el('div', 'opts');
  panel.opts().forEach(o => O.appendChild(btn(o.k || '', o.t, () => {
    if (o.close) { closePanel(); if (o.fn) o.fn(); return; }
    panel.lines.push({ s: 'me', t: o.t });
    o.fn();
    if (panel && (panel.kind === 'dialog' || panel.kind === 'trader')) { refresh(); pbody.scrollTop = pbody.scrollHeight; }
  }, o.d)));
  pbody.appendChild(O);
}
function talk(e) {
  if (e.sid === 'wolf') return talkWolf(e);
  if (e.fac === 'army') {
    const south = e.guard === 'south';
    return dialog(cardOf(e), [south ? 'Назад. Здесь граница Зоны, проход закрыт.' : S.flags.bridgePaid ? 'А, это ты. Проходи.' : 'Стоять. Проход под мостом платный: пятьсот, и мы тебя не видели.'], () => [
      south ? { t: 'А если договоримся?', fn: () => say('Не договоримся. Свободен.') }
        : S.flags.bridgePaid ? { t: 'Я уже платил', fn: () => say('Помню. Проходи, не задерживай.') }
        : { t: 'Пропусти за 500 RU', k: 'key', d: S.money < 500, fn: () => { S.money -= 500; S.flags.bridgePaid = 1; openBarrier(); say('Другой разговор. Проходи, шлагбаум поднят. Туда и обратно, сколько хочешь.'); sys('Мост открыт.'); news('Заплатил военным 500 RU за проход под мостом.'); } },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  if (e.sid === 'fox') return dialog(cardOf(e), [S.q2.fox === 3 ? 'Отбились. Ты меня второй раз за день спасаешь, Меченый.' : 'Чего тебе?'], () => {
    const o = [];
    if (S.q2.fox === 3) o.push({ t: 'Что знаешь про Стрелка?', k: 'key', fn: () => {
      say('Стрелок? Слышал. Ходил на север дальше всех и возвращался. Лично не знал. А вот брат мой, Серый, с его группой пересекался. Он на Свалке, в ангаре. Скажешь, что от Лиса.');
      S.q2.fox = 4; S.stats.q++; S.rep += 10; give('a12', 6); S.money += 300; sys('Получено: 300 RU, Дробь ×6. Задание выполнено.'); bulletin('Выполнено: Найти Лиса. Серый ждёт на Свалке.'); save(true);
    } });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
  if (e.sid === 'tolik') return dialog(cardOf(e), ['Меченый! Если б не ты, лежать бы мне у той дороги.'], () => [{ t: 'Бывай', close: 1 }], 'dialog', e);
  if (e.sid === 'shust') return dialog(cardOf(e), ['Меченый! Век не забуду, что ты меня вытащил. Буду в деревне, отлежусь.'], () => [{ t: 'Береги себя', close: 1 }], 'dialog', e);
  if (e.sid === 'petr' || e.sid === 'petr2') {
    return dialog(cardOf(e), [S.flags.atpClear ? 'Ну ты дал! АТП теперь наше. Тут пока и осядем.' : 'Тише. Бандиты на АТП, за бетонным забором. Мы тут вторые сутки лежим, ждём подмогу. Пойдёшь первым, мы следом.'], () => [
      { t: 'Что там внутри?', fn: () => say('Двор, два гаража. Человек семь, главарь с автоматом сидит в большом гараже. Там же и Шустрого держат.') },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  // обычный одиночка
  const lines = [S.rep >= 20 ? 'О, Меченый! Наслышан, наслышан.' : S.rep < 0 ? 'Чего надо? Про тебя тут нехорошее говорят.' : 'Здоров, брат. Чего хотел?'];
  dialog(cardOf(e), lines, () => {
    const o = [{ t: 'Что нового?', fn: () => { e.talked = (e.talked || 0) + 1; say(e.robbed ? 'Нам говорить не о чем.' : LORE[(e.seed + e.talked * 5) % LORE.length]); } }];
    if (!e.robbed) o.push({ t: 'Давай поторгуем', fn: () => openTrade(e) });
    hireOpts(e).forEach(x => o.push(x));
    if (!e.robbed && !e.follow) o.push({ t: 'Ствол на него: «Выворачивай карманы»', k: 'bad', fn: () => robNpc(e) });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
}
function robNpc(e) {
  const tier = { knife: 0, w_pm: 1, w_obrez: 2, w_aksu: 3 };
  const p = clamp(0.45 + (tier[S.weapon] - tier[e.wpn]) * 0.18 + (P.hp > 60 ? 0.1 : -0.1) - (e.rank || 0) * 0.08, 0.1, 0.9);
  const crowd = ents.filter(o => o.alive && o.fac === 'loner' && o !== e && dE(o, e) < 300).length;
  S.rep -= crowd ? 25 : 15;
  if (chance(p) && !crowd) {
    const got = [];
    if (e.money) { S.money += e.money; got.push(e.money + ' RU'); e.money = 0; }
    Object.keys(e.inv).forEach(k => { give(k, e.inv[k]); got.push(ITEMS[k].n); }); e.inv = {};
    e.robbed = 1;
    say('Ладно, ладно! Подавись. Зона всё видит, Меченый.');
    sys(got.length ? 'Отобрано: ' + got.join(', ') + '. Одиночки об этом узнают.' : 'У него ничего не было. Одиночки об этом узнают.');
  } else {
    say(crowd ? 'Мужики, гляньте! Этот на своих ствол наставил!' : 'Ах ты гнида! Ну давай!');
    anger(e); closePanel();
  }
}
function talkWolf(e) {
  dialog(cardOf(e), [S.q.flash === 1 ? 'Меченый? Сидорович по рации предупредил. Про Шустрого знаешь?' : 'Здорово, Меченый.'], () => {
    const o = [];
    if (S.q.flash === 1) o.push({ t: 'Я насчёт Шустрого', k: 'key', fn: () => {
      say('Его взяли бандиты, держат на АТП, это к востоку от большой дороги. Мои, Петруха с Хомяком, залегли у забора и ждут. С ножом туда идти нельзя: держи ПМ и три обоймы.');
      give('w_pm', 1); give('a9', 16); S.mag.w_pm = 8; setWeapon('w_pm'); S.q.flash = 2;
      sys('Получено: ПМ, Патроны 9×18 ×24. Задание обновлено.');
      bulletin('Волк выдал ПМ. Цель: АТП на востоке.');
    } });
    if (S.q.flash >= 2 && S.q.pack === 0) o.push({ t: 'Есть ещё работа?', fn: () => {
      say('Есть. В лесу на северо-западе завелась стая слепых псов, уже двоих наших порвали. Перебьёшь, отдам обрез и патроны к нему.');
      S.q.pack = 1; bulletin('Задание: перебить стаю слепых псов в северо-западном лесу.');
    } });
    if (S.q.pack === 2) o.push({ t: 'Стаи больше нет', k: 'key', fn: () => {
      if (!has('w_obrez')) { give('w_obrez', 1); give('a12', 12); sys('Получено: Обрез, Дробь ×12.'); } else { give('a12', 12); S.money += 500; sys('Получено: Дробь ×12, 500 RU.'); }
      say('Уважаю. Слово держу. И людям расскажу, что ты наш.');
      S.q.pack = 3; S.stats.q++; S.rep += 10; bulletin('Выполнено: Стая у леса.'); save(true);
    } });
    wolfPlusOpts().forEach(x => o.push(x));
    o.push({ t: 'Что посоветуешь?', fn: () => say('Не стой на открытом, двигайся. Кидай болты, где воздух дрожит. Ночью включай голову: псы в темноте видят лучше тебя. И считай патроны, магазин кончается всегда не вовремя.') });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
}
function talkTrader() {
  if (!S.flags.intro) {
    S.flags.intro = 1;
    return dialog(SIDCARD(), ['Очухался, Меченый? Тебя сняли с грузовика смерти, с таких живыми не возвращаются. Ты первый на моей памяти.', 'В КПК у тебя одна запись: «Убить Стрелка». Имени не помнишь, так и будешь Меченым, по наколке. Я тебе жизнь спас, за тобой должок.'], () => [
      { t: 'Что за работа?', k: 'key', fn: () => {
        say('Мой курьер, Шустрый, пропал вместе с флешкой. Говорят, его взяли бандиты. Иди к Волку в деревню новичков, он поможет. Флешку принесёшь мне, остальное потом.');
        S.q.flash = 1; bulletin('Задание: Флешка Шустрого. Найди Волка в деревне новичков.');
        sys('Задание: Флешка Шустрого. Метка на миникарте.');
        panel.opts = traderOpts;
      } }
    ], 'trader');
  }
  dialog(SIDCARD(), ['Ну, чего тебе?'], traderOpts, 'trader');
}
function traderOpts() {
  const o = [{ t: 'Торговать', k: 'key', fn: () => openTrade(null) }];
  if (S.q.flash === 3 && has('flash')) o.push({ t: 'Отдать флешку Шустрого', k: 'key', fn: () => {
    take('flash', 1); S.money += 1500; S.q.flash = 4; S.flags.flashDone = 1; S.stats.q++; S.rep += 15;
    say('Вот это дело. Держи полторы тысячи, заработал.');
    sys('Получено: 1500 RU. Задание выполнено.'); bulletin('Выполнено: Флешка Шустрого.'); save(true);
  } });
  if (S.q.flash === 4 && S.flags.flashDone && S.q2.fox === 0) o.push({ t: 'Что со Стрелком?', k: 'key', fn: () => {
    say('Есть сталкер по кличке Лис, он ходил с людьми, что Стрелка знали. Ушёл за насыпь, к разрушенной ферме на северо-востоке, и пропал со связи. Найди его. Вояки под мостом берут пятьсот за проход. Жадные, но слово держат. Кому жалко денег, лезет через туннель левее, а там электры.');
    S.q2.fox = 1; bulletin('Задание: Найти Лиса за насыпью.');
  } });
  if (S.q.medusa === 1 && has('art_medusa')) o.push({ t: 'Отдать «Медузу» за 1000 RU', k: 'key', fn: () => {
    take('art_medusa', 1); S.money += 1000; S.q.medusa = 2; S.stats.q++;
    say('Она самая. Тысяча, как договаривались.'); sys('Получено: 1000 RU.'); bulletin('Выполнено: «Медуза» для Сидоровича.');
  } });
  if (S.q.medusa === 0) o.push({ t: 'Есть ещё работа?', fn: () => {
    const landmark = TOLIK_AT_JUNCTION ? 'к северу от развилки на АТП' : 'за ржавым автобусом у дороги';
    say('Нужна «Медуза». Ищи на поле аномалий ' + landmark + '. Обычно беру за семьсот, под заказ дам тысячу. Болты кидай, а то соберёшь тебя потом по частям.');
    S.q.medusa = 1; bulletin('Задание: «Медуза» для Сидоровича.');
  } });
  jobOpts().forEach(x => o.push(x));
  if (S.rep <= -30) o.push({ t: 'Уладить с одиночками · 2000 RU', k: 'key', d: S.money < 2000, fn: () => {
    S.money -= 2000; S.rep = 0; S.flags.angry = {}; ents.forEach(e => { if (e.fac === 'loner') e.angry = 0; });
    say('Ладно, замолвлю слово. Второй раз не возьмусь.');
  } });
  const worn = WORDER.filter(w => w !== 'knife' && !WP[w].toss && has(w) && cond(w) < 95);
  if (worn.length) { const cost = worn.reduce((a, w) => a + Math.ceil((100 - cond(w)) * ITEMS[w].price / 400 / 10) * 10, 0);
    o.push({ t: 'Починить оружие · ' + cost + ' RU', d: S.money < cost, fn: () => { S.money -= cost; worn.forEach(w => S.cond[w] = 100); P.jam = 0; say('Почистил, смазал, пружины поменял. Стреляет как новый.'); sys('Оружие починено.'); } }); }
  { const till = Math.ceil((S.min - 360 + 1) / 1440) * 1440 + 360 - S.min, blk = !!restBlock();
    o.push({ t: restLabel('Отоспаться до утра:', till, 'sleep'), d: blk, fn: () => {
      const b = restBlock(); if (b) { sys(b); return; }
      const r = advanceWorldTime(till, 'sleep'); save(true);
      if (r.stop) { say('Не спится на пустой желудок, а?'); sys(r.stop + ' Сейчас ' + clockStr(S.min) + '.'); }
      else { say('Ложись вон на ящики. Утро вечера мудренее.'); sys('Наступило утро, ' + clockStr(S.min) + '. Игра сохранена.'); } } }); }
  o.push({ t: 'Закончить разговор', close: 1 });
  return o;
}

/* ---------- торговля ---------- */
function openTrade(e) {
  openPanel('trade', e ? 'Торг: ' + e.name : 'Торг: Сидорович');
  panel.e = e; refresh(); pbody.scrollTop = 0;
}
function sellPrice(id, toNpc) { const it = ITEMS[id]; return it.sell !== undefined ? Math.floor(it.sell * (toNpc ? 0.8 : 1)) : Math.max(1, Math.floor((it.price || 0) * (toNpc ? 0.5 : 0.35))); }
function drawTrade() {
  const e = panel.e;
  const top = el('div', 'cols');
  top.appendChild(person(meCard()));
  top.appendChild(person(e ? Object.assign(cardOf(e), { money: e.money }) : SIDCARD()));
  pbody.appendChild(top);
  const cols = el('div', 'cols');
  const a = el('div'), b = el('div');
  a.appendChild(el('h3', 'h3', 'Купить'));
  const stock = e ? Object.keys(e.inv).map(id => ({ id: id, q: 1, p: Math.ceil(ITEMS[id].price * (S.rep >= 20 ? 1.1 : 1.3)), c: e.inv[id] })) : STOCK.map(s => Object.assign({ c: (ITEMS[s.id].weapon || ITEMS[s.id].armor) && has(s.id) ? 0 : 99 }, s));
  if (!stock.length) a.appendChild(el('p', 'note', 'Ему нечего продать.'));
  stock.forEach(s => {
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(itemIcon(s.id)); r.appendChild(t);
    const g = el('div', 'grow'); g.appendChild(el('div', 'nm', ITEMS[s.id].n + (s.q > 1 ? ' ×' + s.q : ''))); g.appendChild(el('div', 'price', s.p + ' RU')); r.appendChild(g);
    r.appendChild(btn('', s.c <= 0 ? 'Есть' : 'Купить', () => {
      if (S.money < s.p) { panel.hint = 'Не хватает ' + (s.p - S.money) + ' RU.'; refresh(); return; }
      S.money -= s.p; give(s.id, s.q); if (e) { e.money += s.p; e.inv[s.id]--; if (!e.inv[s.id]) delete e.inv[s.id]; }
      play('pick'); panel.hint = 'Куплено: ' + ITEMS[s.id].n + '.'; refresh();
    }, s.c <= 0 || S.money < s.p));
    a.appendChild(r);
  });
  b.appendChild(el('h3', 'h3', 'Продать'));
  const mine = Object.keys(S.inv).filter(id => ITEMS[id] && !ITEMS[id].quest && (!e || !(ITEMS[id].weapon || ITEMS[id].armor)) && !(id === S.armor && cnt(id) === 1));
  if (!mine.length) b.appendChild(el('p', 'note', 'Продавать нечего.'));
  mine.forEach(id => {
    const isAmmo = ITEMS[id].ammo, q = isAmmo ? Math.min(cnt(id), 10) : 1, p = sellPrice(id, !!e) * q;
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(itemIcon(id)); r.appendChild(t);
    const g = el('div', 'grow'); g.appendChild(el('div', 'nm', ITEMS[id].n + (cnt(id) > 1 ? ' (' + cnt(id) + ')' : ''))); g.appendChild(el('div', 'price', '+' + p + ' RU' + (q > 1 ? ' за ' + q : ''))); r.appendChild(g);
    r.appendChild(btn('', 'Продать', () => {
      if (e && e.money < p) { panel.hint = 'У него не хватает денег.'; refresh(); return; }
      take(id, q); S.money += p; if (e) { e.money -= p; e.inv[id] = (e.inv[id] || 0) + q; }
      play('pick'); panel.hint = 'Продано: ' + ITEMS[id].n + '.'; refresh();
    }));
    b.appendChild(r);
  });
  cols.appendChild(a); cols.appendChild(b); pbody.appendChild(cols);
}

/* ---------- рюкзак ---------- */
function drawInv() {
  pbody.appendChild(person(meCard()));
  pbody.appendChild(el('p', 'note', 'Вес ' + weight() + ' из ' + MAXW + ' кг · защита ' + Math.round(def() * 100) + '% · радиация ' + Math.round(S.rad) + ' · сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '')));
  const ids = ['knife'].concat(Object.keys(S.inv));
  const g = el('div', 'grid');
  ids.forEach(id => {
    const c = el('button', 'cell' + (panel.sel === id ? ' sel' : '') + ((S.weapon === id || S.armor === id || beltCount(id)) ? ' on' : ''));
    c.type = 'button'; c.appendChild(itemIcon(id));
    if (cnt(id) > 1) c.appendChild(el('span', 'bd', String(cnt(id))));
    c.setAttribute('aria-label', id === 'knife' ? 'Нож' : ITEMS[id].n);
    c.addEventListener('click', () => { panel.sel = id; panel.hint = ''; refresh(); });
    g.appendChild(c);
  });
  pbody.appendChild(g);
  const id = panel.sel;
  if (!id || (id !== 'knife' && !has(id))) { pbody.appendChild(el('p', 'note', 'Нажми на вещь, чтобы посмотреть её и применить. Артефакты вешаются на пояс, до трёх штук.')); return; }
  const it = id === 'knife' ? { n: 'Нож', w: 0.3 } : ITEMS[id];
  const d = el('div', 'detail');
  d.appendChild(el('div', 'nm', it.n + (cnt(id) > 1 ? ' ×' + cnt(id) : '')));
  let desc = it.d || '';
  if (WP[id]) { const W = WP[id]; desc = W.toss ? 'Взрыв по площади, урон до ' + W.dmg + '. Выбери в ячейке оружия и жми «Огонь»' : W.melee ? 'Урон ' + W.dmg + ', только вплотную' : 'Урон ' + W.dmg + (W.pellets ? '×' + W.pellets : '') + ', магазин ' + W.mag + ', дальность ' + W.range + '. Состояние ' + Math.round(cond(id)) + '%' + (cond(id) < 65 ? ', может заклинить. Почини у Сидоровича' : ''); }
  if (FOOD[id]) desc += ', сытость +' + FOOD[id];
  if (it.armor) desc = 'Защита ' + Math.round(it.armor * 100) + '%';
  if (ARTFX[id]) desc += '. ' + ARTFX[id];
  d.appendChild(el('div', 'ds', desc));
  d.appendChild(el('div', 'ds', 'Вес ' + (Math.round((it.w || 0) * Math.max(1, cnt(id)) * 100) / 100) + ' кг'));
  const row = el('div', 'btnrow');
  if (WP[id] && S.weapon !== id) row.appendChild(btn('go', 'Взять в руки', () => { setWeapon(id); refresh(); }));
  if (it.armor && S.armor !== id) row.appendChild(btn('go', 'Надеть', () => { S.armor = id; refresh(); }));
  if (it.heal !== undefined || it.rad !== undefined) row.appendChild(btn('go', 'Применить', () => { useItem(id); refresh(); }));
  if (ARTFX[id]) row.appendChild(btn('go', beltCount(id) ? 'Снять с пояса' : 'На пояс', () => {
    if (beltCount(id)) S.belt.splice(S.belt.indexOf(id), 1);
    else if (S.belt.length >= 3) panel.hint = 'Пояс занят: сначала сними другой артефакт.';
    else S.belt.push(id);
    refresh();
  }));
  if (id !== 'knife' && !it.quest && S.armor !== id) row.appendChild(btn('wide', 'Выбросить', () => {
    const q = cnt(id); take(id, q);
    objs.push({ k: 'body', kind: 'sack', x: P.x + rnd(-6, 6), y: P.y + 12, ang: 0, fac: 'loner', name: 'Рюкзак', seed: 1, loot: { [id]: q }, t: S.min });
    panel.sel = null; refresh();
  }));
  d.appendChild(row);
  pbody.appendChild(d);
}

/* ---------- обыск ---------- */
function openLoot(o) {
  if (o.loot.__tip) { delete o.loot.__tip; revealCache(o.name); }
  if (o.k === 'crate') return;
  openPanel('loot', o.k === 'cache' || o.k === 'hiding' ? 'Тайник' : o.k === 'safe' ? 'Сейф' : 'Обыск: ' + o.name); panel.o = o; refresh(); pbody.scrollTop = 0;
}
function drawLoot() {
  const o = panel.o, keys = Object.keys(o.loot).filter(k => k !== '__tip');
  if (!keys.length) { pbody.appendChild(el('p', 'note', 'Пусто.')); return; }
  keys.forEach(k => {
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(k === 'money' ? icon('i-pack') : itemIcon(k)); r.appendChild(t);
    r.appendChild(el('div', 'grow nm', k === 'money' ? o.loot[k] + ' RU' : ITEMS[k].n + (o.loot[k] > 1 ? ' ×' + o.loot[k] : '')));
    const dupW = k !== 'money' && WP[k] && !WP[k].melee && has(k);
    if (dupW) r.appendChild(el('span', 'note', 'Такой ствол уже есть'));
    r.appendChild(btn('', 'Взять', () => {
      // правило одного ствола каждого типа: дубликат не берётся, состояние брошенного ствола возвращается при подборе
      if (k === 'money') S.money += o.loot[k]; else { give(k, o.loot[k]); if (WP[k] && !WP[k].melee) S.cond[k] = o.wcond && o.wcond[k] != null ? o.wcond[k] : (S.cond[k] == null ? 80 : S.cond[k]); }
      delete o.loot[k]; play('pick');
      recordContents(o);
      refresh();
    }, dupW));
    pbody.appendChild(r);
  });
  pbody.appendChild(btn('go', 'Взять всё', () => { lootAll(o); closePanel(); }));
}

/* ---------- ПДА ---------- */
const PDA_TABS = [['map', 'Карта'], ['tasks', 'Задания'], ['log', 'Журнал'], ['stat', 'Данные']];
function drawPda() {
  if (panel.tab === 'map') {
    const bar = el('div', 'mapbar'); bar.appendChild(el('span', 'note', panel.zoom ? 'Листай карту пальцем.' : 'Вся карта Кордона.'));
    bar.appendChild(btn('chip', panel.zoom ? 'Отдалить' : 'Приблизить', () => { panel.zoom = !panel.zoom; refresh(); }));
    pbody.appendChild(bar);
    const w = el('div', 'mapwrap' + (panel.zoom ? ' zoom' : '')), c = el('canvas'); c.id = 'bigmap'; c.width = PW * 6; c.height = MH * 6;
    w.appendChild(c); pbody.appendChild(w);
    drawMapTo(c.getContext('2d'), 6, true);
    if (panel.zoom) requestAnimationFrame(() => { const pp = inBunker(P.x, P.y) ? HATCH : P; w.scrollLeft = pp.x / (PW * T) * w.scrollWidth - w.clientWidth / 2; w.scrollTop = pp.y / (MH * T) * w.scrollHeight - w.clientHeight / 2; });
    pbody.appendChild(mapLegend());
  } else if (panel.tab === 'tasks') {
    const L = qList();
    if (!L.length) pbody.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
    L.sort((a, b) => (a.st === 'a' ? 0 : 1) - (b.st === 'a' ? 0 : 1)).forEach(q => {
      const r = el('div', 'row'), g = el('div', 'grow');
      g.appendChild(el('div', 'nm', q.n + (q.st === 'd' ? ' · выполнено' : q.st === 'f' ? ' · провалено' : ''))); g.appendChild(el('div', 'ds', q.d));
      r.appendChild(g); pbody.appendChild(r);
    });
  } else if (panel.tab === 'log') {
    if (!S.news.length) pbody.appendChild(el('p', 'note', 'Записей пока нет.'));
    S.news.slice().reverse().forEach(n => { const r = el('div', 'row'), g = el('div', 'grow'); g.appendChild(el('div', 'tm', clockStr(n.t))); g.appendChild(el('div', 'ds lite', n.x)); r.appendChild(g); pbody.appendChild(r); });
  } else {
    pbody.appendChild(person(meCard()));
    const st = el('div', 'stat');
    [['Убито людей', S.stats.kS], ['Убито мутантов', S.stats.kM], ['Выполнено заданий', S.stats.q], ['Найдено артефактов', S.stats.art], ['Очки рейтинга', score()], ['Отношение одиночек', S.rep]].forEach(x => { st.appendChild(el('span', '', x[0])); st.appendChild(el('b', '', String(x[1]))); });
    pbody.appendChild(st);
  }
}
/* ---------- меню ---------- */
function drawMenu() {
  pbody.appendChild(el('p', 'note', 'Зона: Кордон, 2D-прототип RC1 (тестовая карта). Игра сохраняется сама у костра и у Сидоровича. Здесь можно сохраниться вручную, если рядом нет врагов.'));
  pbody.appendChild(btn('wide', 'Сохранить игру', () => {
    if (ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 450)) panel.hint = 'Рядом враги, сохраниться нельзя.';
    else { save(true); panel.hint = 'Игра сохранена.'; }
    refresh();
  }));
  pbody.appendChild(btn('wide', 'Загрузить последнее сохранение', () => { const d = loadSave(); if (d) { applyState(d); closePanel(); } else { panel.hint = 'Сохранений нет.'; refresh(); } }));
  pbody.appendChild(btn('wide', (AC && master && master.gain.value === 0 ? 'Включить' : 'Выключить') + ' звук', () => { audioInit(); if (master) master.gain.value = master.gain.value ? 0 : 0.55; refresh(); }));
  pbody.appendChild(btn('wide warn', 'Начать заново', () => { if (panel.sure) { applyState(freshS()); closePanel(); intro(); } else { panel.sure = 1; panel.hint = 'Прогресс сотрётся. Нажми ещё раз, чтобы начать заново.'; refresh(); } }));
  const k = el('div', 'note'); k.style.lineHeight = '1.8';
  k.textContent = 'Клавиатура: WASD ходить, Shift бег, C присесть, мышь целиться, ЛКМ стрелять, R перезарядка или передёрнуть затвор, E действие, F болт, G граната, Q или H аптечка, 1–4 оружие, I рюкзак, M КПК, Esc меню. На телефоне: левый палец ходит, правый целится и стреляет.';
  pbody.appendChild(k);
}

/* ===================== карта ===================== */
const TCOL = ['#3f4628', '#5a4b34', '#3c3c37', '#26332c', '#7a7a6d', '#1f2a17', '#4a3a29', '#6f4a39', '#2f3a22', '#58534a', '#55554d'];
const miniC = document.createElement('canvas'), fogC = document.createElement('canvas');
// Четыре пикселя на клетку. Каналы маски хранят покрытие всех дорог и асфальта
// отдельно: после интерполяции узкая тропа, широкий двор и развилка сохраняют форму.
function buildBigMini() {
  const K = 4;
  miniC.width = PW * K; miniC.height = MH * K;
  const g = miniC.getContext('2d');
  const base = document.createElement('canvas');
  base.width = PW; base.height = MH;
  const bg = base.getContext('2d'), terrain = bg.createImageData(PW, MH), roads = bg.createImageData(PW, MH);
  const palette = [0x655a46, 0x655a46, 0x655a46, 0x405653, 0x817e71, 0x484735,
       0x6b5d4b, 0x726152, 0x58573e, 0x655e51, 0x797465, 0x24251e];
  const tiles = surfaceTiles();
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    const t = tiles[y * MW + x], c = palette[t], i = (y * PW + x) * 4;
    const k = 0.69 + vnoise(x, y, 6) * 0.37 + hash2(x, y) * 0.24;
    terrain.data[i] = (c >> 16) * k;
    terrain.data[i + 1] = ((c >> 8) & 255) * k;
    terrain.data[i + 2] = (c & 255) * k;
    terrain.data[i + 3] = roads.data[i + 3] = 255;
    roads.data[i] = t === DI || t === AS ? 255 : 0;
    roads.data[i + 1] = t === AS ? 255 : 0;
  }
  bg.putImageData(roads, 0, 0);
  g.drawImage(base, 0, 0, miniC.width, miniC.height);
  const mask = g.getImageData(0, 0, miniC.width, miniC.height);
  bg.putImageData(terrain, 0, 0);
  g.drawImage(base, 0, 0, miniC.width, miniC.height);
  g.save(); g.scale(K, K);
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    if (map[y * MW + x] !== TR) continue;
    const n = hash2(x, y), crown = yardTreeCrown && yardTreeCells.has(y * MW + x) ? yardTreeCrown : CANOPY[Math.floor(n * CANOPY.length)];
    const width = (2.8 + n * 0.9) * CAN_PAD;
    g.drawImage(crown, x + 0.5 - width / 2, y + 0.4 - width / 2, width, width);
  }
  g.restore();
  // Порог убирает размытие внутри полотна, мягкая кромка соединяет диагональные клетки.
  for (let i = 0; i < mask.data.length; i += 4) {
    const coverage = mask.data[i];
    if (!coverage) { mask.data[i + 3] = 0; continue; }
    const asphalt = clamp((mask.data[i + 1] - 80) / 80, 0, 1);
    const pixel = i / 4, x = pixel % miniC.width, y = Math.floor(pixel / miniC.width);
    const grain = (hash2(x, y) - 0.5) * 13 + (vnoise(x, y, 7) - 0.5) * 22;
    mask.data[i] = 148 - asphalt * 32 + grain;
    mask.data[i + 1] = 128 - asphalt * 15 + grain;
    mask.data[i + 2] = 103 + asphalt * 5 + grain;
    mask.data[i + 3] = clamp((coverage - 35 + grain) * 1.45, 0, 238);
  }
  // putImageData не смешивает прозрачность. Переиспользуем временный холст для наложения.
  base.width = miniC.width; base.height = miniC.height;
  bg.putImageData(mask, 0, 0); g.drawImage(base, 0, 0);
  if (ART) {
    // Фактура сухой травы смягчает переход между грунтом и обочиной в масштабе HUD.
    g.save(); g.scale(0.4, 0.4); g.globalCompositeOperation = 'soft-light';
    artFill(g, 'grass_dry', 0, 0, miniC.width / 0.4, miniC.height / 0.4);
    g.restore();
  }
  g.scale(K, K); g.imageSmoothingQuality = 'high';
  if (BIG && C1 && ART) {
    g.strokeStyle = '#473e31'; g.lineWidth = 0.32;
    g.beginPath();
    for (const [, x1, y1, x2, y2] of CORDON_FENCES) {
      g.moveTo(x1, y1); g.lineTo(x2, y2);
    }
    g.stroke();
  }
  HOUSES.forEach((h, i) => {
    if (h.x >= PW) return;
    g.fillStyle = '#36372e'; g.fillRect(h.x - 0.2, h.y - 0.2, h.w + 0.5, h.h + 0.6);
    g.fillStyle = '#887d6a'; g.fillRect(h.x, h.y, h.w, h.h);
    if (ROOFS[i]) drawHouseRoof(g, h, i, 1/T);
  });
  objs.forEach(o => {
    if (o.static && o.solid && o.x < PW * T && (o.k === 'bus' || o.k === 'car')) {
      g.fillStyle = o.k === 'bus' ? '#8a6a2a' : '#6b6a5e';
      g.fillRect(o.x / T, o.y / T, Math.max(1, o.w / T), Math.max(1, o.h / T));
    }
  });
}
async function buildMini() {
  fogC.width = PW; fogC.height = MH;
  if (TOLIK_AT_JUNCTION && ART && C1 && window.CORDON_AERIAL) {
    const photo = new Image();
    photo.src = window.CORDON_AERIAL;
    try {
      await photo.decode();
      if (photo.width === PW * 4 && photo.height === MH * 4) {
        miniC.width = photo.width; miniC.height = photo.height;
        miniC.getContext('2d').drawImage(photo, 0, 0);
        return;
      }
    } catch (e) { /* Старый браузер использует карту из клеток мира. */ }
  }
  if (BIG) { buildBigMini(); return; }
  if (ART) {
    const K = 4; miniC.width = PW * K; miniC.height = MH * K;
    const g = miniC.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(groundC, 0, 0, PW * T, WH, 0, 0, PW * K, MH * K);
    HOUSES.forEach((h, i) => { if (h.x < PW && ROOFS[i]) drawHouseRoof(g, h, i, K/T); });
    for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) if (map[y * MW + x] === TR) { g.fillStyle = 'rgba(30,42,22,0.75)'; g.beginPath(); g.arc(x * K + K / 2, y * K + K / 2, K * 0.9, 0, 6.28); g.fill(); }
    return;
  }
  miniC.width = PW; miniC.height = MH;
  const g = miniC.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) { g.fillStyle = TCOL[map[y * MW + x]]; g.fillRect(x, y, 1, 1); }
  HOUSES.forEach(h => { if (h.x < PW) { g.fillStyle = h.mat === 'conc' ? '#5d5e56' : '#6a4f3c'; g.fillRect(h.x, h.y, h.w, h.h); } });
  objs.forEach(o => { if (o.static && o.solid && o.x < PW * T) { g.fillStyle = o.k === 'bus' ? '#8a6a2a' : '#6b6a5e'; g.fillRect(o.x / T, o.y / T, Math.max(1, o.w / T), Math.max(1, o.h / T)); } });
}
function updateFog() {
  if (!fogDirty) return; fogDirty = false;
  const g = fogC.getContext('2d'), id = g.createImageData(PW, MH);
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) { const i = y * PW + x; id.data[i * 4] = 10; id.data[i * 4 + 1] = 12; id.data[i * 4 + 2] = 9; id.data[i * 4 + 3] = fog[y * MW + x] ? 0 : 60; }
  g.putImageData(id, 0, 0);
}
const MAP_INK = {
  player: '#68d1da', target: '#6ad2dc', sos: '#f07560', hatch: '#9bbdc8',
  cache: '#e7bd79', neutral: '#efd168', enemy: '#f16e59', friend: '#95d677'
};
function mapSymbol(g, kind, x, y, u, angle = 0, ringOnly = false) {
  const color = MAP_INK[kind];
  g.save(); g.translate(x, y); g.scale(u, u);
  g.lineJoin = 'round'; g.fillStyle = color; g.strokeStyle = '#252823'; g.lineWidth = 1.3;
  g.beginPath();
  if (kind === 'player') {
    g.rotate(angle); g.moveTo(7, 0); g.lineTo(-4.7, -4.9); g.lineTo(-2.7, 0); g.lineTo(-4.7, 4.9); g.closePath();
  } else if (kind === 'hatch' || kind === 'cache') {
    g.rect(-2.8, -2.8, 5.6, 5.6);
  } else {
    const target = kind === 'target' || kind === 'sos';
    const r = target ? 4.8 : 2.9;
    g.arc(0, 0, r, 0, 2 * Math.PI);
    g.fillStyle = '#252823'; if (!ringOnly) g.fill(); g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = color; g.lineWidth = 1.25; g.stroke();
    if (!ringOnly && (target || kind === 'friend')) {
      g.beginPath(); g.arc(0, 0, target ? 2.35 : 1.05, 0, 2 * Math.PI); g.fillStyle = color; g.fill();
    }
    g.restore(); return;
  }
  g.fill(); g.stroke(); g.restore();
}
function mapLegend() {
  const legend = el('div', 'legend map-key');
  for (const [kind, name] of [['player','Вы'], ['neutral','Нейтрал'], ['enemy','Враг'], ['friend','Друг'],
      ['target','Цель'], ['sos','SOS'], ['cache','Тайник'], ['hatch','Бункер']]) {
    const item = el('span'), icon = el('canvas'); icon.width = icon.height = 32;
    mapSymbol(icon.getContext('2d'), kind, 16, 16, 2);
    item.append(icon, document.createTextNode(name)); legend.appendChild(item);
  }
  return legend;
}
function visibleContact(e) {
  return e !== P && e.alive && !inBunker(e.x, e.y) && !(e.cloak > 0.7) && dE(e, P) <= 520;
}
/* карта КПК: o.u — сколько пикселей холста в одном CSS-пикселе (маркеры и подписи одного экранного размера при любом масштабе);
   подписи раскладываются без наложения: сначала выбранная цель, потом места; не влезла ни в одну позицию — не рисуется */
function drawMapTo(g, s, full, o) {
  o = o || { ppl: 1, cache: 1 };
  const u = o.u || 1;
  updateFog();
  g.imageSmoothingEnabled = !!ART;
  g.drawImage(miniC, 0, 0, PW * s, MH * s);
  g.drawImage(fogC, 0, 0, PW * s, MH * s);
  const busy = [];   // занятые прямоугольники: маркеры и подписи
  const mark = (x, y, r) => busy.push([x - r, y - r, x + r, y + r]);
  const hx = HATCH.x / T * s, hy = HATCH.y / T * s;
  mapSymbol(g, 'hatch', hx, hy, u); mark(hx, hy, 5 * u);
  if (o.ppl) ents.forEach(e => {
    if (visibleContact(e)) mapSymbol(g, playerRelation(e), e.x / T * s, e.y / T * s, u);
  });
  if (o.cache) objs.forEach(c => {
    if (c.k !== 'cache' || S.caches[c.cacheId] !== 1) return;
    const x = c.x / T * s, y = c.y / T * s;
    mapSymbol(g, 'cache', x, y, u); mark(x, y, 5 * u);
  });
  const selQ = o.sel || [], tracked = trackedTarget(), labs = [];
  qTargets().forEach(q => {
    const point = inBunker(q.x, q.y) ? HATCH : q;
    const x = point.x / T * s, y = point.y / T * s;
    const selected = selQ.some(t => t.qid === q.qid && t.x === q.x && t.y === q.y);
    g.globalAlpha = selected || q.qid === 'sos' || (tracked && q.qid === tracked.qid) ? 1 : 0.68;
    const onContact = o.ppl && ents.some(e => e.x === q.x && e.y === q.y && visibleContact(e));
    mapSymbol(g, q.qid === 'sos' ? 'sos' : 'target', x, y, (selected ? 1.45 : 1) * u, 0, onContact);
    g.globalAlpha = 1; mark(x, y, (selected ? 9 : 6) * u);
    if (selected) labs.push({ t: q.n, x, y, gap: 11 * u, pri: 0, font: '700 ' + Math.round(13 * u) + 'px Arial', c: '#c2f4f3' });
  });
  const pp = inBunker(P.x, P.y) ? HATCH : P;
  const px = pp.x / T * s, py = pp.y / T * s;
  mark(px, py, 8 * u);
  if (full) LOCATIONS.forEach(l => {
    if (l.id === 'sid') return;
    const cx = (l.bounds[0] + l.bounds[2]) / 2, cy = (l.bounds[1] + l.bounds[3]) / 2;
    if (!fog[Math.min(MH - 1, Math.max(0, Math.round(cy))) * MW + Math.min(MW - 1, Math.round(cx))]) return;
    labs.push({ t: l.name, x: cx * s, y: cy * s, gap: 0, pri: 1, font: '600 ' + Math.round(11.5 * u) + 'px Arial', c: 'rgba(232,222,186,0.95)' });
  });
  // раскладка подписей
  const hit = (a) => busy.some(b => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]);
  labs.sort((a, b) => a.pri - b.pri).forEach(L => {
    g.font = L.font; const w = g.measureText(L.t).width, h = parseFloat(L.font.split(' ')[1]) * 1.15, pad = 2 * u;
    const tries = L.gap ? [[L.gap, -h / 2], [-L.gap - w, -h / 2], [-w / 2, -L.gap - h], [-w / 2, L.gap]] : [[-w / 2, -h / 2], [-w / 2, -h * 1.6], [-w / 2, h * 0.6], [6 * u, -h / 2], [-w - 6 * u, -h / 2]];
    for (const [dx, dy] of tries) {
      const r = [L.x + dx - pad, L.y + dy - pad, L.x + dx + w + pad, L.y + dy + h + pad];
      if (r[0] < 0 || r[1] < 0 || r[2] > PW * s || r[3] > MH * s || hit(r)) continue;
      busy.push(r);
      g.textBaseline = 'top'; g.lineWidth = 3 * u; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(L.t, L.x + dx, L.y + dy); g.fillStyle = L.c; g.fillText(L.t, L.x + dx, L.y + dy);
      L.placed = 1; break;
    }
  });
  g.textBaseline = 'alphabetic'; g.lineWidth = 1;
  if (o.out) o.out.labels = labs.map(L => ({ t: L.t, placed: !!L.placed }));
  mapSymbol(g, 'player', px, py, u, P.ang);
}
const mini = $('mini'), mctx = mini.getContext('2d');
function drawMini() {
  const W = mini.clientWidth || 128;
  if (mini.width !== W * 2) { mini.width = W * 2; mini.height = W * 2; }
  const size = mini.width, s = size / 32;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#0d120c'; mctx.fillRect(0, 0, size, size);
  if (inBunker(P.x, P.y)) { mctx.fillStyle = '#7fb0c4'; mctx.font = '600 22px "Russo One", sans-serif'; mctx.textAlign = 'center'; mctx.fillText('БУНКЕР', size / 2, size / 2 - 6); mctx.font = '500 16px "IBM Plex Mono", monospace'; mctx.fillStyle = '#8f8c74'; mctx.fillText('под землёй', size / 2, size / 2 + 20); mctx.textAlign = 'start'; return; }
  mctx.setTransform(1, 0, 0, 1, size / 2 - P.x / T * s, size / 2 - P.y / T * s);
  mctx.imageSmoothingEnabled = !!ART;
  mctx.drawImage(miniC, 0, 0, PW * s, MH * s); mctx.drawImage(fogC, 0, 0, PW * s, MH * s);
  if (darkness() > 0.3) {
    mctx.fillStyle = 'rgba(4,7,12,0.35)';
    mctx.fillRect(P.x / T * s - size / 2, P.y / T * s - size / 2, size, size);
  }
  mapSymbol(mctx, 'hatch', HATCH.x / T * s, HATCH.y / T * s, 1.65);
  objs.forEach(o => {
    if (o.k === 'cache' && S.caches[o.cacheId] === 1) mapSymbol(mctx, 'cache', o.x / T * s, o.y / T * s, 1.65);
  });
  ents.forEach(e => {
    if (visibleContact(e)) mapSymbol(mctx, playerRelation(e), e.x / T * s, e.y / T * s, 1.65);
  });
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const tq = trackedTarget();
  qTargets().forEach(q => {
    if (q !== tq && !(tq && q.qid === tq.qid && q.x === tq.x && q.y === tq.y) && q.qid !== 'sos') mctx.globalAlpha = 0.45; else mctx.globalAlpha = 1;
    let x = size / 2 + (q.x - P.x) / T * s, y = size / 2 + (q.y - P.y) / T * s;
    const edge = x < 10 || y < 10 || x > size - 10 || y > size - 10;
    if (edge) { const a = Math.atan2(y - size / 2, x - size / 2); x = size / 2 + Math.cos(a) * (size / 2 - 12); y = size / 2 + Math.sin(a) * (size / 2 - 12); }
    const onContact = !edge && ents.some(e => e.x === q.x && e.y === q.y && visibleContact(e));
    mapSymbol(mctx, q.qid === 'sos' ? 'sos' : 'target', x, y, 1.8, 0, onContact);
  });
  mctx.globalAlpha = 1;
  mapSymbol(mctx, 'player', size / 2, size / 2, 2, P.ang);
}

/* ===================== HUD ===================== */
/* крупные силуэты оружия для панели (свои, упрощённые) */
const WSG = '<defs><linearGradient id="wm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5a58"/><stop offset=".5" stop-color="#2a2a29"/><stop offset="1" stop-color="#141414"/></linearGradient><linearGradient id="ww" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8632e"/><stop offset="1" stop-color="#6a3012"/></linearGradient></defs>';
const WSIL = {
  w_aksu: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M3 13l26-2v3.5L9 20v4H3z" fill="none" stroke="url(#wm)" stroke-width="2.6" stroke-linejoin="round"/><path d="M28 9h46v11H28z" fill="url(#wm)"/><path d="M33 7h30v2H33z" fill="#3a3a39"/><path d="M74 10.5h19v7.5H74z" fill="url(#ww)"/><path d="M93 12.5h15v3H93z" fill="url(#wm)"/><path d="M107 11h8v6h-8z" fill="url(#wm)"/><path d="M57 20h9c1 7 4 12 9 17l-8 4c-6-6-9-13-10-21z" fill="url(#ww)"/><path d="M41 20h8l-2.5 14h-7.5z" fill="#2a1a12"/><path d="M49 20c1 4 3 5 7 4" fill="none" stroke="#2a2a29" stroke-width="1.6"/></svg>',
  w_pm: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M34 10h54v10H34z" fill="url(#wm)"/><path d="M36 20h34l-4 4H52l-3 15H37l1-13z" fill="url(#wm)"/><path d="M38 23h10l-2 14h-8z" fill="#3a2418"/><path d="M52 24c1 4 4 6 9 5" fill="none" stroke="#2a2a29" stroke-width="1.6"/><path d="M40 12h44v1.5H40z" fill="#6a6a68"/></svg>',
  w_obrez: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M40 11h72v4.5H40zM40 15.5h72V20H40z" fill="url(#wm)"/><path d="M26 10h16v12H26z" fill="url(#wm)"/><path d="M6 19c8-3 14-6 21-8v11c-5 3-10 7-15 11l-6-3z" fill="url(#ww)"/><path d="M42 20h20v4H42z" fill="url(#ww)"/><path d="M30 22c1 4 3 5 7 4" fill="none" stroke="#2a2a29" stroke-width="1.6"/></svg>',
  knife: '<svg viewBox="0 0 120 44">' + WSG + '<path d="M44 17l58-4c6 0 10 3 12 7-4 2-8 3-14 3H44z" fill="#b9bcbd"/><path d="M44 17l58-4c6 0 10 3 12 7H44z" fill="#dfe2e2"/><path d="M38 11h6v20h-6z" fill="url(#wm)"/><path d="M12 15h26v11H12c-3 0-5-2-5-5.5S9 15 12 15z" fill="#2a2420"/><path d="M16 15v11M22 15v11M28 15v11" stroke="#3e352e" stroke-width="1.4"/></svg>'
};
const H = { hp: $('hpb'), hpv: $('hpv'), fd: $('fdb'), fdv: $('fdv'), radv: $('radv'), sBleed: $('s-bleed'), sBleedN: $('s-bleedn'), sRad: $('s-rad'), wcn: $('wcn'), wcb: $('wcb'), sig: $('sig'), det: $('det'), st: $('stb'), stv: $('stv'), belt: $('belt'), clock: $('clock'), money: $('money'),
  status: $('status'), quest: $('quest'), msgs: $('msgs'), feedback: $('field-feedback'), prompt: $('prompt'), wico: $('wico'), wn: $('wn'), am: $('am') };
let hudT = 0, lastW = '', lastNotice;
function hud(dt) {
  if (!P) return;
  H.hp.style.width = clamp(P.hp, 0, 100) + '%'; H.hp.parentNode.classList.toggle('low', P.hp < 30); H.hpv.textContent = Math.max(0, Math.round(P.hp));
  H.fd.style.width = clamp(S.food, 0, 100) + '%'; H.fdv.textContent = Math.round(S.food); H.fd.parentNode.classList.toggle('low', S.food < 20);
  H.sRad.classList.toggle('on', S.rad > 1); H.sRad.classList.toggle('hi', S.rad > 40); H.radv.textContent = S.rad > 1 ? Math.round(S.rad) : '';
  H.sBleed.classList.toggle('on', !!S.bleed); H.sBleedN.textContent = S.bleed > 1 ? S.bleed : '';
  const sg = P.detD < 280 ? Math.ceil((1 - P.detD / 280) * 5) : 0;
  if (H.sig.dataset.v != sg) { H.sig.dataset.v = sg; [...H.sig.children].forEach((b, i) => b.classList.toggle('on', i < sg)); H.det.classList.toggle('on', sg > 0); }
  H.st.style.width = P.st + '%'; H.stv.textContent = weight() > MAXW ? '!' : Math.round(P.st);
  const fol = ents.find(x => x.alive && x.follow);
  const stt = [fol ? 'напарник ' + fol.name.split(' ')[0] + (fol.wait ? ' ждёт' : '') + ' до ' + clockStr(fol.hireEnd).replace(/ · день \d+/, '') : '', S.food < 20 ? 'голод' : '', P.jam ? 'заклинило' : '', weight() > MAXW ? 'перегруз' : '', P.detD < 280 ? 'аномалия ' + Math.round(P.detD / T * 1.5) + ' м' : ''].filter(Boolean).join(' · ');
  { const m = cnt('medkit'), b = cnt('bandage'); $('mb-m').textContent = m || ''; $('mb-b').textContent = b || ''; $('mp-mn').textContent = m; $('mp-bn').textContent = b; $('b-med').classList.toggle('empty', !m && !b); }
  $('b-crouch').classList.toggle('on', !!P.crouch); H.det.classList.toggle('on', S.torch !== false); $('b-jump').classList.toggle('on', P.jumpT > 0);
  if (H.status.textContent !== stt) H.status.textContent = stt;
  drawMini();   // мини-карта каждый кадр: метки двигаются плавно (туман обновляется реже, ниже)
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.15;
  H.clock.textContent = clockStr(); H.money.textContent = S.money + ' RU';
  const bs = S.belt.join(',');
  if (H.belt.dataset.v !== bs) { H.belt.dataset.v = bs; H.belt.textContent = ''; S.belt.forEach(a => { const sp = el('span'); sp.appendChild(itemIcon(a)); H.belt.appendChild(sp); }); }
  const W = WP[S.weapon];
  if (lastW !== S.weapon) { lastW = S.weapon; H.wico.textContent = ''; const bi = (window.CORDON_G8_ON && g3Icon(S.weapon)) || b1Icon(S.weapon); if (bi) H.wico.appendChild(bi); else if (WSIL[S.weapon]) H.wico.innerHTML = WSIL[S.weapon]; else H.wico.appendChild(icon(ICON[S.weapon])); H.wn.textContent = W.n; }
  $('wpnbox').classList.toggle('rel', P.reload > 0);
  H.am.textContent = '';
  const cd = W.melee ? 100 : Math.round(S.cond[S.weapon] == null ? 100 : S.cond[S.weapon]);
  $('wpnbox').classList.toggle('mel', !!W.melee);   // нож и граната: без полосы состояния, одна подпись
  H.wcn.textContent = W.melee ? '' : 'Состояние: ' + cd + '%'; H.wcb.style.width = cd + '%'; H.wcb.parentNode.className = 'cb' + (cd < 35 ? ' bad' : cd < 65 ? ' mid' : '');
  if (W.toss) H.am.textContent = '× ' + cnt('grenade');
  else if (W.melee) H.am.textContent = '∞';
  else { H.am.appendChild(document.createTextNode(String(S.mag[S.weapon] || 0))); H.am.appendChild(el('small', '', ' / ' + cnt(W.ammo))); if (P.reload > 0) H.am.appendChild(el('div', 'rl', 'перезарядка')); }
  const q = trackedTarget();
  H.quest.textContent = '';
  if (q) {
    const d = Math.round(dst(P.x, P.y, q.x, q.y) / T * 1.5), a = Math.atan2(q.y - P.y, q.x - P.x);
    H.quest.appendChild(el('span', 'ex', '!')); H.quest.appendChild(el('span', 'qn', q.n));
    const ar = el('span', 'arr', '➤'); ar.style.transform = 'rotate(' + a + 'rad)'; H.quest.appendChild(ar); H.quest.appendChild(el('span', 'qd', d + ' м'));
  }
  const message = radioQueue[0];
  if (message !== lastNotice) {
    lastNotice = message;
    H.msgs.replaceChildren();
    if (message) {
      const line = el('p', message.k);
      line.append(el('span', 'sender', 'КПК'));
      line.append(document.createTextNode(message.t));
      H.msgs.append(line);
    }
  }
  if (message) H.msgs.style.opacity = clamp(message.life / 1.2, 0, 1);
  const local = !message && MSGS[MSGS.length - 1];
  const feedback = local ? local.t : '';
  if (H.feedback.textContent !== feedback) H.feedback.textContent = feedback;
  if (local) H.feedback.style.opacity = clamp(local.life / 1.2, 0, 1);
  const n = G.near;
  H.prompt.textContent = ''; H.prompt.classList.toggle('kill', !!(n && n.k === 'kill'));
  if (n && P.alive && !panel) { const ic = el('span', 'pi ' + n.k); H.prompt.appendChild(ic); if (!IN.touch) H.prompt.appendChild(el('kbd', '', 'E')); H.prompt.appendChild(document.createTextNode(n.label.replace(/^Поговорить: /, 'Говорить: ') + '.')); }
  updateFog();
}

/* ===================== ввод ===================== */
function interact() {
  const n = G.near; if (!n || !P.alive) return;
  if (n.k === 'talk') talk(n.e);
  else if (n.k === 'trader') { save(true); talkTrader(); }
  else if (n.k === 'down') goThrough(true);
  else if (n.k === 'up') goThrough(false);
  else if (n.k === 'heal') {
    const e = n.e;
    if (healWounded(e)) dialog(cardOf(e), e.sid === 'fox' ? ['Спасибо, брат... Тихо! Слышишь вой? Стая вернулась, бери ствол!'] : ['Живой... Спасибо, братишка. Держи, что есть: деньги и антирад. Я твой должник.'], () => [{ t: e.sid === 'fox' ? 'К бою' : 'Береги себя', close: 1 }], 'dialog', e);
  }
  else if (n.k === 'kill') takedown(n.e);
  else if (n.k === 'pickupLoot' && n.o.broken) lootAll(n.o);
  else if (n.k === 'loot') openLoot(n.o);
  else if (n.k === 'rest') restAtFire();
  else if (n.k === 'pick') pickUp(n.o);
  else if (n.k === 'genset') gensetUse();
  else if (n.k === 'exit') exitUse();
  else if (n.k === 'art') takeArt(n.a);
  else if (n.k === 'free') {
    if (ents.some(e => e.alive && e.fac === 'bandit' && dE(e, n.e) < 260)) { msg('Сначала разберись с бандитами рядом.', 'bad'); return; }
    freeShust(n.e);
    dialog(cardOf(n.e), ['Думал, всё, спишут меня. Флешка при мне, в подкладку зашита, эти олухи не нашли. Отнеси Сидоровичу, я пока в деревню, отлежусь.'], () => [{ t: 'Иди, я прикрою', close: 1 }], 'dialog', n.e);
  }
}
const KEYS = {};
addEventListener('keydown', e => {
  audioInit();
  const k = e.code;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].indexOf(k) >= 0 && !panel) e.preventDefault();
  if (title.open) return;
  if (k === 'Escape') { if (panel) closePanel(); else { openPanel('menu', 'Меню'); refresh(); } return; }
  if (panel) { if ((k === 'KeyI' && panel.kind === 'inv') || (k === 'KeyM' && panel.kind === 'pda') || k === 'Tab') { e.preventDefault(); closePanel(); } return; }
  KEYS[k] = true;
  if (!P.alive) return;
  if (k === 'KeyE' || k === 'Space') interact();
  if (k === 'KeyR') startReload();
  if (k === 'KeyF') throwBolt();
  if (k === 'KeyG') throwNade();
  if (k === 'KeyQ') healWith('medkit');
  if (k === 'KeyB') healWith('bandage');
  if (k === 'KeyH') quickHeal();
  if (k === 'KeyV') startJump();
  if (k === 'KeyL') toggleTorch();
  if (k === 'Digit5') setWeapon('grenade');
  if (k === 'KeyC' || k === 'ControlLeft') { P.crouch = !P.crouch; }
  if (k === 'Digit1') setWeapon('knife'); if (k === 'Digit2') setWeapon('w_pm'); if (k === 'Digit3') setWeapon('w_obrez'); if (k === 'Digit4') setWeapon('w_aksu');
  if (k === 'KeyI' || k === 'Tab') { e.preventDefault(); openPanel('inv', 'Рюкзак'); refresh(); }
  if (k === 'KeyM' || k === 'KeyP') { openPanel('pda', 'КПК', PDA_TABS2); refresh(); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
/* сворачивание окна/потеря фокуса: никакой ввод не остаётся «зажатым» */
function resetInput() {
  for (const k in KEYS) KEYS[k] = false;
  IN.fire = false; IN.touchFire = false; IN.btnFire = false; IN.fireStick = null; IN.left = null; IN.aimStick = null; IN.moveX = IN.moveY = 0;
  const fb = document.getElementById('b-fire'); if (fb) { fb.classList.remove('on'); fb.style.setProperty('--fx', '0px'); fb.style.setProperty('--fy', '0px'); }
  if (typeof joyReset === 'function') joyReset();
}
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
function keyMove() {
  if (IN.touch) return;
  IN.moveX = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0);
  IN.moveY = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
  IN.sprint = !!(KEYS.ShiftLeft || KEYS.ShiftRight);
}
function setTouch(on) { if (IN.touch === on) return; IN.touch = on; document.body.classList.toggle('is-touch', on); }
const JOY = $('joy'), JOYK = $('joyk');
function joyAt(x, y, s) {
  const r = JOY.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (Math.hypot(x - cx, y - cy) < r.width * 0.55) { s.ox = cx; s.oy = cy; }
  else { JOY.style.left = (x - r.width / 2) + 'px'; JOY.style.top = (y - r.height / 2) + 'px'; JOY.style.bottom = 'auto'; }
  JOY.classList.add('on');
}
function joyReset() { JOY.style.left = JOY.style.top = JOY.style.bottom = ''; JOYK.style.transform = ''; JOY.classList.remove('on'); }
cv.addEventListener('pointerdown', e => {
  audioInit();
  if (panel || title.open) return;
  if (e.pointerType === 'mouse') { setTouch(false); IN.mx = e.clientX; IN.my = e.clientY; if (e.button === 0) IN.fire = true; return; }
  setTouch(true);
  cv.setPointerCapture(e.pointerId);
  const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, a: P.ang };
  if (e.clientX < VW * 0.5) { IN.left = s; joyAt(e.clientX, e.clientY, s); } else IN.aimStick = s;
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { IN.mx = e.clientX; IN.my = e.clientY; if (IN.touch) setTouch(false); return; }
  const s = IN.left && IN.left.id === e.pointerId ? IN.left : IN.aimStick && IN.aimStick.id === e.pointerId ? IN.aimStick : null;
  if (!s) return;
  let dx = (e.clientX - s.ox) / 56, dy = (e.clientY - s.oy) / 56;
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  s.dx = dx; s.dy = dy;
  if (s === IN.left) { IN.moveX = dx; IN.moveY = dy; JOYK.style.transform = 'translate(' + (dx * 34) + 'px,' + (dy * 34) + 'px)'; }
  else { if (m > 0.2) s.a = Math.atan2(dy, dx); IN.touchFire = m > 0.92; }
});
function endPtr(e) {
  if (e.pointerType === 'mouse') { IN.fire = false; return; }
  if (IN.left && IN.left.id === e.pointerId) { IN.left = null; IN.moveX = IN.moveY = 0; joyReset(); }
  if (IN.aimStick && IN.aimStick.id === e.pointerId) { IN.aimStick = null; IN.touchFire = false; }
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (!panel) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
const TB = { 'b-crouch': () => { P.crouch = !P.crouch; $('b-crouch').classList.toggle('on', !!P.crouch); }, 'b-rel': startReload, 'b-bolt': throwBolt, 'b-med': medButton, 'b-jump': startJump, 'det': toggleTorch, 'b-wpn': () => cycleWeapon(1) };
const fireB = $('b-fire');
fireB.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); try { fireB.setPointerCapture(e.pointerId); } catch (x) {} const r = fireB.getBoundingClientRect(); IN.fireStick = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, a: 0, m: 0 }; IN.btnFire = true; fireB.classList.add('on'); });
fireB.addEventListener('pointermove', e => { const f = IN.fireStick; if (!f) return; const dx = e.clientX - f.cx, dy = e.clientY - f.cy, m = Math.min(1, Math.hypot(dx, dy) / 60); f.m = m; if (m > 0.25) f.a = Math.atan2(dy, dx); fireB.style.setProperty('--fx', (Math.cos(f.a) * m * 14) + 'px'); fireB.style.setProperty('--fy', (Math.sin(f.a) * m * 14) + 'px'); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => fireB.addEventListener(t, () => { IN.btnFire = false; IN.fireStick = null; fireB.classList.remove('on'); fireB.style.setProperty('--fx', '0px'); fireB.style.setProperty('--fy', '0px'); }));
$('prompt').addEventListener('click', e => { e.stopPropagation(); audioInit(); if (!panel) interact(); });
$('rot-skip').addEventListener('click', () => document.body.classList.add('portrait-ok'));
Object.keys(TB).forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if (P.alive && !panel) TB[id](); }));
['mp-bandage', 'mp-medkit'].forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (P.alive && !panel) healWith(id === 'mp-medkit' ? 'medkit' : 'bandage'); }));
$('wpnbox').addEventListener('click', () => { if (P.alive && !panel) cycleWeapon(1); });
$('t-inv').addEventListener('click', () => { if (!panel && P.alive) { openPanel('inv', 'Рюкзак'); refresh(); } });
$('t-pda').addEventListener('click', () => { if (!panel && P.alive) { openPanel('pda', 'КПК', PDA_TABS2); refresh(); } });
$('t-menu').addEventListener('click', () => { if (!panel) { openPanel('menu', 'Меню'); refresh(); } });
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) setTouch(true);

/* ===================== заставка и смерть ===================== */
const title = { open: true, el: $('title') };
function showTitle(kind) {
  title.open = true; title.el.classList.add('open'); document.body.classList.add('title-open');
  const c = $('tcard'); c.textContent = ''; c.classList.toggle('death', kind === 'death');
  if (kind === 'death') {
    const h = el('h1', '', 'Зона забрала'); h.appendChild(el('span', '', 'ещё одного')); c.appendChild(h);
    c.appendChild(el('div', 'tape'));
    c.appendChild(el('p', '', 'Последнее сохранение делается само у костра в деревне и у Сидоровича.'));
    const b = el('div', 'tbtns');
    b.appendChild(btn('go', 'Загрузить сохранение', () => { const d = loadSave(); applyState(d || freshS()); hideTitle(); if (!d) intro(); }));
    b.appendChild(btn('alt', 'Начать заново', () => { applyState(freshS()); hideTitle(); intro(); }));
    c.appendChild(b);
    return;
  }
  const h = el('h1', '', 'Зона: Кордон'); h.appendChild(el('span', '', '2D-прототип')); c.appendChild(h);
  c.appendChild(el('div', 'tape'));
  c.appendChild(el('p', '', 'Фанатская игра по мотивам «Теней Чернобыля» с видом сверху. Живые сталкеры, бандиты, слепые псы, аномалии, день и ночь.'));
  const k = el('div', 'keysel');
  k.innerHTML = IN.touch ? 'Играй в горизонтальном положении. <b>Левый палец</b> ходит, <b>правый</b> целится. Красная кнопка «Огонь» стреляет и сама наводит на ближайшего врага. Когда рядом есть что взять или с кем поговорить, внизу появляется оранжевая кнопка: жми на неё.'
    : '<b>WASD</b> ходить · <b>Shift</b> бег · <b>мышь</b> прицел и огонь · <b>R</b> перезарядка · <b>E</b> действие · <b>F</b> болт · <b>G</b> граната · <b>Q</b> аптечка · <b>I</b> рюкзак · <b>M</b> КПК';
  c.appendChild(k);
  const b = el('div', 'tbtns'), sv0 = loadSave();
  if (sv0) b.appendChild(btn('go', 'Продолжить', () => { audioInit(); applyState(sv0); hideTitle(); }));
  b.appendChild(btn(sv0 ? 'alt' : 'go', 'Новая игра', () => { audioInit(); applyState(freshS()); hideTitle(); intro(); }));
  c.appendChild(b);
}
function goFull() {   // на весь экран там, где браузер это умеет (Android, iPad, компьютер); на iPhone — через «На экран Домой»
  try { const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; if (IN.touch && f && !document.fullscreenElement && !document.webkitFullscreenElement) { const r = f.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } } catch (e) {}
}
function hideTitle() { goFull(); title.open = false; title.el.classList.remove('open'); document.body.classList.remove('title-open'); }
function onDeath() { showTitle('death'); }
function intro() { setTimeout(() => { if (!panel && P.alive) { msg('Ты очнулся в бункере у торговца. Подойди к прилавку и поговори с Сидоровичем.', 'say'); } }, 400); }

/* ===================== цикл ===================== */
let last = performance.now();
/* автоподстройка: если в игре кадр в среднем дольше 22 мс, кроны деревьев рисуются мельче (меньше заливки для слабого телефона) */
const AQ = { buf: [], done: /aq-off/.test(location.hash) };
function autoQuality(ms) {
  if (AQ.done || panel || title.open || document.hidden) return;
  if (ms > 0 && ms < 200) AQ.buf.push(ms);
  if (AQ.buf.length < 180) return;
  const a = AQ.buf.slice().sort((x, y) => x - y), med = a[a.length >> 1]; AQ.buf.length = 0;
  if (med > 22 && CAN_SZ > 72) { CAN_SZ = Math.max(72, CAN_SZ - 12); CANOPY.length = 0; buildCanopy(); AQ.lowered = (AQ.lowered || 0) + 1; }
  else AQ.done = true;
}
function frame(now) {
  requestAnimationFrame(frame);
  autoQuality(now - last);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  keyMove();
  if (!panel && !title.open) update(dt);
  render();
  hud(dt);
}
/* загрузка по шагам: если на телефоне что-то падает, на экране видно где и почему (а не тёмный экран) */
function bootStep(t) { window.__bootStep = t; const b = document.getElementById('bootlog'); if (b) b.firstChild.textContent = 'Загрузка: ' + t + '…'; }
async function boot() {
  bootStep('мир'); gen(); bigWorld(); buildGrids();
  HOUSES.forEach(buildEntrances);
  resize();
  bootStep('графика'); await loadArt(); await prepareShopGate(); bigFences(); buildFieldProps(); buildGrids(); placeSearchContainers(); buildGrids(); buildFieldCrateSites();
  bootStep('деревья'); buildCanopy(); bootStep('земля'); paintGround(); bootStep('крыши'); buildRoofs(); bootStep('карта'); await buildMini();
  bootStep('сохранение');
  let sv = null; try { sv = loadSave(); if (sv) applyState(sv); } catch (e) {
    console.error(e); try { localStorage.setItem('zona-broken-save', localStorage.getItem(KEY) || ''); } catch (e2) {}
    sv = null; window.__bootWarn = 'Сохранение не загрузилось (' + (e && e.message) + '). Копия отложена, начата новая игра.';
  }
  if (!sv) applyState(freshS());
  const bl = document.getElementById('bootlog'); if (bl) bl.remove(); bootStep('игра');
  if (window.__bootWarn) setTimeout(() => msg(window.__bootWarn, 'bad'), 500);
  addEventListener('resize', resize);
  showTitle();
  requestAnimationFrame(frame);
}
window.__zRender = render;
window.__bigTiles = () => map;
window.__zRM = { t: RMt, p: RMp, BIG: BIG };
window.__zBig = { aq: () => ({ can: CAN_SZ, lowered: AQ.lowered || 0, done: AQ.done }), gStat: gStat, cache: () => GCACHE.size, GMAX: GMAX, mini: () => [miniC.width, miniC.height], fogLen: () => fog.length, PW: () => PW, MH: () => MH, msgs: () => [...radioQueue, ...MSGS].map(m => m.t) };
window.__z = { resetInput: resetInput, rc: { mk: { mkHuman, mkDog, mkBoar, mkSucker }, g3: () => ({ ready: G3_READY(), skin: P ? g3Skin(P) : null }), q5, q3c, gensetUse, pickUp, wolfRC1Opts, exitUse, benchOpts, sosFoeAI, muzzlePoint, actorPose, GFX, g7: { G3, portraitFor, itemIcon, G7, GAIT, RIGS, BODYFX, weaponLocal, localToWorld, g7Muzzle, rayWall, rayCircle, shotTrace, fire, rigActive, g7Fresh, g7Tick, qaRig, ballOff, WP, get tracers() { return tracers; }, get flashes() { return flashes; }, opq, T } }, seed: n => { Math.random = mulberry32(n); }, gfxSnap: () => ({ ANOM0, NPCDEF, DOGDEF, CACHES, HOUSES }), map: { fieldProps, collide, los, LOC, LOCATIONS, ANOM0, objs, nav, MW, openBarrier, buildGrids, MAP_ID, MAP_VERSION, drawMapTo }, openLoot: openLoot, clearMsgs: () => { MSGS.length = 0; radioQueue.length = 0; }, reveal: reveal, get WX() { return WX; }, cam: cam, openTrade: openTrade, openPanel: openPanel, refresh: refresh, PDA_TABS2: PDA_TABS2, dialog: dialog, cardOf: cardOf, save: save, loadSave: loadSave, loc: { LOCATIONS, locAnchors, locPt, MAP_VERSION }, plus: { simRest, restLabel, trackedTarget, restBlock, REST, freeTile, get SOS_SPOTS() { return SOS_SPOTS; }, jobCancel, finishEncounter, advanceWorldTime, restPreview, jobOpts, dynSnapshot, jobOffers, jobTake, jobTurnIn, jobReady, hireOpts, restAtFire, sosTick, mkSucker, traderOpts, wolfPlusOpts, qTargets, qList }, get art() { return !!ART; }, goThrough: goThrough, get S() { return S; }, get P() { return P; }, get ents() { return ents; }, IN: IN, update: update, interact: interact, talkTrader: talkTrader, applyState: applyState, freshS: freshS, hideTitle: hideTitle, get panel() { return panel; }, closePanel: closePanel, findPath: findPath, get near() { return G.near; } };
/* мост: тип открытой панели для стилей */
(function(){ const oldHUD = hud; hud = function(dt){ oldHUD(dt); ov.dataset.kind = panel ? panel.kind : ''; }; })();

boot();

})();
