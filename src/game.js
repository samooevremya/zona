(function () {
'use strict';
/* ===================== основа ===================== */
const T = 32, BIG = typeof window !== 'undefined' && window.ZONA_BIG === 1;
/* BIG: большой Кордон 240×220 (+12 клеток под бункер). Старая карта генерируется в свои массивы 132×110, затем gbig.js переносит её по частям. */
const CORDON_ROWS = BIG ? 220 : 110, WEST = BIG ? 240 : 0, NORTH_ROWS = BIG ? 132 : 0,
  LESSER_TOP = NORTH_ROWS + 68, WORLD_ROWS = NORTH_ROWS + CORDON_ROWS;
let MW = BIG ? WEST + 252 : 132, MH = WORLD_ROWS, PW = BIG ? WEST + 240 : 120, WW = MW * T, WH = MH * T;
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
  a9: { n: 'Патроны 9×18', price: 8, ammo: 1, w: 0.01, d: 'Для ПМ и АПС' },
  a12: { n: 'Дробь 12 калибра', price: 20, ammo: 1, w: 0.04, d: 'Для обреза и ТОЗ-34' },
  a545: { n: 'Патроны 5,45×39', price: 15, ammo: 1, w: 0.012, d: 'Для АКС-74У' },
  a762: { n: 'Патроны 7,62×39', price: 18, ammo: 1, w: 0.016, d: 'Для АКМС' },
  w_aps: { n: 'АПС', price: 2100, weapon: 1, w: 1.05, d: 'Автоматический пистолет. При удержании спуска стреляет очередью.' },
  w_toz34: { n: 'ТОЗ-34', price: 2700, weapon: 1, w: 3.1, d: 'Длинная охотничья двустволка. Дробь ложится плотнее, чем у обреза.' },
  w_akms: { n: 'АКМС', price: 6200, weapon: 1, w: 3.3, d: 'Автомат со складным прикладом. Пуля мощнее, чем у АКС-74У, но патроны тяжелее.' },
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
  engraved_pm: {n:'Наградной ПМ Лиса',quest:1,w:0.73,d:'На рукояти пластинка с фамилией. Вернуть Лису.'},
  damaged_pda: {n:'Разбитый КПК',quest:1,w:0.26,d:'Найден в сером рюкзаке у грузовика.'},
  post_case: {n:'Кейс с документами',quest:1,w:1.2,d:'Доставить Сидоровичу.'},
  restored_pda: {n:'Восстановленный КПК',quest:1,w:0.26,d:'В памяти сохранилась запись Стрелка.'},
  flash: { n: 'Флешка Шустрого', quest: 1, w: 0, d: 'Отдать Сидоровичу' }
};
const ARTFX = { art_medusa: 'На поясе: радиация копится вдвое медленнее и уходит сама', art_bengal: 'На поясе: защита +5%, электра бьёт вдвое слабее', art_blood: 'На поясе: понемногу лечит, но слегка фонит' };
const WP = {
  knife: { n: 'Нож', melee: 1, dmg: 34, rate: 0.5, range: 26, pref: 0 },
  w_aps: { n: 'АПС', ammo: 'a9', mag: 20, dmg: 19, rate: 0.13, spread: 0.065, range: 465, reload: 1.75, snd: 'p', pref: 175, auto: 1 },
  w_toz34: { n: 'ТОЗ-34', ammo: 'a12', mag: 2, dmg: 22, pellets: 7, rate: 0.19, spread: 0.095, range: 395, reload: 2.15, snd: 's', pref: 150 },
  w_akms: { n: 'АКМС', ammo: 'a762', mag: 30, dmg: 22, rate: 0.115, spread: 0.073, range: 660, reload: 2.6, snd: 'r', pref: 285, auto: 1 },
  w_pm: { n: 'ПМ', ammo: 'a9', mag: 8, dmg: 22, rate: 0.24, spread: 0.04, range: 520, reload: 1.4, snd: 'p', pref: 200 },
  w_obrez: { n: 'Обрез', ammo: 'a12', mag: 2, dmg: 23, pellets: 7, rate: 0.16, spread: 0.16, range: 300, reload: 1.9, snd: 's', pref: 110 },
  w_aksu: { n: 'АКС-74У', ammo: 'a545', mag: 30, dmg: 17, rate: 0.095, spread: 0.06, range: 620, reload: 2.3, snd: 'r', pref: 280, auto: 1 },
  grenade: { n: 'Граната', melee: 1, toss: 1, dmg: 110, rate: 1, range: 0, pref: 0 }   // выбирается в ячейке оружия, «Огонь» бросает
};
const WORDER = ['knife', 'w_pm', 'w_obrez', 'w_aksu', 'grenade', ...Object.keys(DETECTORS), 'w_aps', 'w_toz34', 'w_akms'];
const STOCK = [
  ...Object.entries(DETECTORS).map(([id, model]) => ({ id, q: 1, p: model.price })),
  { id: 'medkit', q: 1, p: 300 }, { id: 'bandage', q: 1, p: 80 }, { id: 'antirad', q: 1, p: 250 }, { id: 'vodka', q: 1, p: 100 }, { id: 'energy', q: 1, p: 150 },
  { id: 'bread', q: 1, p: 40 }, { id: 'sausage', q: 1, p: 60 }, { id: 'cans', q: 1, p: 90 }, { id: 'grenade', q: 1, p: 350 },
  { id: 'a9', q: 20, p: 160 }, { id: 'a12', q: 10, p: 200 }, { id: 'a545', q: 30, p: 450 },
  { id: 'w_pm', q: 1, p: 600 }, { id: 'w_obrez', q: 1, p: 1200 }, { id: 'w_aksu', q: 1, p: 4500 }, { id: 'ar_zarya', q: 1, p: 6000 },
  { id: 'a762', q: 30, p: 540 }, ...['w_aps', 'w_toz34', 'w_akms'].map(id => ({id, q: 1, p: ITEMS[id].price}))
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
const WORLD = { MW, MH, PW, map, keep, roadX };
const BIGW = BIG ? { MW:252, MH:CORDON_ROWS, PW:240, map:new Uint8Array(252*CORDON_ROWS),
  keep:new Uint8Array(252*CORDON_ROWS), roadX:new Int16Array(roadX) } : null;
const cordonOrigin = () => BIG && map===WORLD.map ? WEST : 0;
function useGrid(g) { MW = g.MW; MH = g.MH; PW = g.PW; WW = MW * T; WH = MH * T; map = g.map; keep = g.keep; roadX = g.roadX; }
const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const tAt = (x, y) => inb(x, y) ? map[y * MW + x] : VO;
const setT = (x, y, v) => { if (inb(x, y)) map[y * MW + x] = v; };
function reserve(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) keep[y * MW + x] = 1; }
function reserveC(cx, cy, r) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (inb(x, y) && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) keep[y * MW + x] = 1; }
const HOUSES = [];
function house(x, y, w, h, doors, wall, broken, roof, random = srnd) {
  wall = wall === undefined ? BR : wall; broken = broken === undefined ? 0.04 : broken;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const edge = xx === x || yy === y || xx === x + w - 1 || yy === y + h - 1;
    const corner = (xx === x || xx === x + w - 1) && (yy === y || yy === y + h - 1);
    setT(xx, yy, edge && (corner || random() > broken) ? wall : (wall === CO ? CF : FL));
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
      else if (BIG && home === '78,118' && ny === -1) approach = 'deck';
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
const inBunker = (x, y) => x > BUNK.x0 && (!BIG || y < 16*T);
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
  if(BIG) {
    for(const dx of [-4,2]) addObj({k:'blocks',roadblock:true,x:(roadX[3]+dx)*T,y:3*T,w:2*T,h:T*.52,solid:1});
  } else addObj({ k: 'blocks', x: (roadX[3] - 4) * T, y: 3 * T, w: 9 * T, h: T, solid: 1 });
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
// Spatial buckets for short walking probes. Transparent furniture and mesh fences
// still stop a body, so a visibility ray cannot answer this question.
const broadPropEdges=new Uint8Array(MW*MH);
const walkSolids=new Map(), propEdgeBlocks=new Uint8Array(MW*MH), propBlockedCenters=new Set();
function clearFooting(x,y,r){
  const body={x,y,r};
  for(let j=Math.floor((y-r)/T);j<=Math.floor((y+r)/T);j++)
    for(let i=Math.floor((x-r)/T);i<=Math.floor((x+r)/T);i++){
      if(!inb(i,j))return false;
      const cell=j*MW+i;
      if(SOLID[map[cell]] && Math.hypot(x-clamp(x,i*T,(i+1)*T),y-clamp(y,j*T,(j+1)*T))<r)return false;
      const solids=walkSolids.get(cell);
      if(solids)for(const o of solids)if(o.solid &&
        Math.hypot(x-clamp(x,o.x,o.x+o.w),y-clamp(y,o.y,o.y+o.h))<r)return false;
      const props=propCells.get(cell);
      if(props && props.some(p=>touchesProp(p,body)))return false;
    }
  return true;
}
function clearWalk(x,y,tx,ty,r=11){
  const n=Math.max(1,Math.ceil(Math.hypot(tx-x,ty-y)/7));
  for(let i=1;i<=n;i++)if(!clearFooting(x+(tx-x)*i/n,y+(ty-y)*i/n,r))return false;
  return true;
}
function walkAnchor(px,py,r=11){
  const tx=Math.floor(px/T),ty=Math.floor(py/T);
  for(let ring=0;ring<=4;ring++){
    let best=-1,dist=Infinity;
    for(let y=ty-ring;y<=ty+ring;y++)for(let x=tx-ring;x<=tx+ring;x++){
      if(!inb(x,y)||Math.max(Math.abs(x-tx),Math.abs(y-ty))!==ring||!nav[y*MW+x])continue;
      const wx=(x+.5)*T,wy=(y+.5)*T,d=Math.hypot(wx-px,wy-py);
      if(d<dist&&clearWalk(px,py,wx,wy,r)){best=y*MW+x;dist=d;}
    }
    if(best>=0)return best;
  }
  return -1;
}
let navRevision = 0;
function buildGrids() {
  navRevision++;
  fences.length = 0;walkSolids.clear();
  for (let i = 0; i < MW * MH; i++) { nav[i] = SOLID[map[i]] ? 0 : 1; opq[i] = OPAQ[map[i]]; }
  objs.forEach(o => {
    if (!o.solid) return;
    if (o.k === 'fence') fences.push(o);
    for (let y = Math.floor(o.y / T); y <= Math.floor((o.y + o.h - 1) / T); y++)
      for (let x = Math.floor(o.x / T); x <= Math.floor((o.x + o.w - 1) / T); x++) if (inb(x, y)) {
        const cell=y*MW+x;
        if(!walkSolids.has(cell))walkSolids.set(cell,[]);
        walkSolids.get(cell).push(o);
        nav[y * MW + x] = 0; if (o.opaque) opq[y * MW + x] = 1;
      }
  });
  for(const cell of propBlockedCenters)nav[cell]=0;
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
function navNeighbor(x, y, k, r=11) {
  const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
  if (!inb(nx, ny) || !nav[ny * MW + nx]) return -1;
  if ((r>11 ? broadPropEdges : propEdgeBlocks)[y*MW+x] & (1<<k)) return -1;
  if (k >= 4 && (!nav[y * MW + nx] || !nav[ny * MW + x])) return -1;
  return ny * MW + nx;
}
function nearestNav(tx, ty) {
  for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tx + dx, y = ty + dy; if (inb(x, y) && nav[y * MW + x]) return y * MW + x;
  }
  return -1;
}
function findPath(sx, sy, tx, ty, walking=false,r=11) {
  const s=walking?walkAnchor(sx,sy,r):nearestNav(Math.floor(sx/T),Math.floor(sy/T));
  const g=walking?walkAnchor(tx,ty,r):nearestNav(Math.floor(tx/T),Math.floor(ty/T));
  if (s < 0 || g < 0) return null;
  bfsPrev.fill(-1); bfsPrev[s] = s;
  let h = 0, t = 0; bfsQ[t++] = s;
  while (h < t) {
    const c = bfsQ[h++]; if (c === g) break;
    const cx = c % MW, cy = (c / MW) | 0;
    for (let k = 0; k < 8; k++) {
      const ni = navNeighbor(cx, cy, k,r);
      if (ni < 0 || bfsPrev[ni] >= 0) continue;
      bfsPrev[ni] = c; bfsQ[t++] = ni;
    }
  }
  if (bfsPrev[g] < 0) return null;
  const pts = []; let c = g;
  while (c !== s) { pts.push({ x: (c % MW) * T + 16, y: ((c / MW) | 0) * T + 16 }); c = bfsPrev[c]; }
  if(walking)pts.push({x:(s%MW+.5)*T,y:(Math.floor(s/MW)+.5)*T});
  pts.reverse();
  return pts;
}

/* ===================== справочник локаций =====================
   Все места, на которые ссылаются задания, события, NPC, подписи и цели, задаются здесь.
   Координаты в клетках (T=32). Перенос карты = правка этого справочника и тайлов;
   код заданий и сохранения ссылаются на id и имена якорей, а не на числа.
   bounds: [x0, y0, x1, y1]; entrances: точки входа; anchors: именованные точки или списки точек. */
const MAP_ID = (typeof window !== 'undefined' && window.ZONA_MAP) || 'k07';
const MAP_VERSION = (typeof window !== 'undefined' && window.ZONA_BIG === 1) ? 'kordon-north' : MAP_ID === 'rc1' ? 'kordon-rc1' : 'kordon-0.7';
const LOCATIONS = [
  { id: 'village', name: 'Деревня новичков', gen: 'деревни новичков', type: 'safe', bounds: [18, 74, 42, 92], entrances: [[33, 74], [42, 84], [24, 92]],
    anchors: { fire: CAMP_TILE.slice(), shust: [34.5, 80.5], tolik: [35, 81], seats: [[28.2, 83.3], [31.8, 82.7], [32.6, 85.6], [28.6, 86.4]], wolf: [20.5, 79], safe: [30, 88] } },
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

/* Первая копия каждого ствола использует поля старых сохранений и боевой системы.
   В запасе хранятся только дополнительные экземпляры, каждый со своим магазином. */
const PACK_CELLS = 48, PACK_KG = 1.2, KNIFE_KG = .3;
const carryLimit = (armor = S.armor) => armor === 'ar_zarya' ? 50 : 35;
const isGun = id => !!ITEMS[id]?.weapon;
function footprint(id) {
  if (id === 'w_aksu' || id === 'w_obrez') return [3,1];
  if (kitSlot(id) === 'sidearm') return [2,1];
  if (id === 'w_toz34' || id === 'w_akms') return [4,1];
  return ITEMS[id]?.armor ? [2,2] : [1,1];
}
const stackLimit = id => ITEMS[id]?.ammo ? 60 : isGun(id) || DETECTORS[id] || ITEMS[id]?.armor ? 1 : 5;
const KIT_LABELS = {sidearm:'Пистолет', primary:'Основное', grenade:'Граната', detector:'Детектор'};
function kitSlot(id) {
  if (id === 'w_pm' || id === 'w_aps') return 'sidearm';
  if (isGun(id)) return 'primary';
  if (id === 'grenade') return 'grenade';
  if (DETECTORS[id]) return 'detector';
  return null;
}
function restoreKit() {
  S.flags ||= {};
  if (!S.flags.kit) {
    S.flags.kit = {};
    for (const id of WORDER) {
      const slot = kitSlot(id);
      if (slot && has(id) && !S.flags.kit[slot]) S.flags.kit[slot] = id;
    }
  }
  if (S.weapon !== 'hands' && S.weapon !== 'knife' && !has(S.weapon)) S.weapon = 'knife';
  const active = kitSlot(S.weapon);
  if (active) S.flags.kit[active] = S.weapon;
  for (const [slot,id] of Object.entries(S.flags.kit)) {
    if (id !== null && (!has(id) || kitSlot(id) !== slot)) delete S.flags.kit[slot];
  }
}
function kitItem(slot) {
  const id = kitSlot(S.weapon) === slot ? S.weapon : S.flags.kit?.[slot];
  return id && has(id) ? id : null;
}
function wornCount(id) {
  const slot = kitSlot(id);
  return (slot && kitItem(slot) === id ? 1 : 0) + (S.armor === id ? 1 : 0) + beltCount(id);
}
function mountGear(id,index,draw) {
  const slot = kitSlot(id);
  if (!slot || !has(id)) return;
  if (isGun(id) && index) {
    const spares=spareList(id), copy=spares[index-1];
    if (!copy) return;
    spares[index-1]=primaryGun(id);
    setPrimary(id,copy);
  }
  if (draw || kitSlot(S.weapon) === slot) setWeapon(id);
  else S.flags.kit[slot] = id;
}
function stowGear(id) {
  if (id === S.weapon) setWeapon('knife');
  S.flags.kit[kitSlot(id)] = null;
}
// A vacant slot accepts the first matching purchase or pickup. A deliberately
// emptied slot stays empty until the player assigns it again.
function incomingKit(ids) {
  const mounted = new Set(), kit = {...S.flags.kit};
  for (const id of ids) {
    const slot = kitSlot(id);
    if (slot && !(slot in kit) && !kitItem(slot)) {
      kit[slot] = id; mounted.add(id);
    }
  }
  return mounted;
}
function packCells(inv, stowing, incoming) {
  return Object.entries(inv).reduce((total,[id,n]) => {
    const [w,h] = footprint(id);
    return total + w*h*Math.ceil(Math.max(0,n-wornCount(id)+(id===stowing?1:0)-(incoming?.has(id)?1:0))/stackLimit(id));
  },0);
}
function primaryGun(id) { return {cond:S.cond?.[id] ?? 80, mag:S.mag[id] || 0}; }
function gunCopy(id,index) {
  return index ? S.flags.spareGuns?.[id]?.[index-1] || {cond:80,mag:0} : primaryGun(id);
}
function setPrimary(id,gun) { S.cond[id]=gun.cond; S.mag[id]=gun.mag; }
function spareList(id) {
  const lists=S.flags.spareGuns ||= {};
  const guns=lists[id] ||= [];
  while (guns.length < cnt(id)-1) guns.push({cond:80,mag:0});
  return guns;
}
function gunsBelow(condition) {
  const worn=[];
  for (const id of WORDER.filter(isGun)) {
    for(let i=0;i<cnt(id);i++) {
      const gun=gunCopy(id,i);
      if(gun.cond<condition) worn.push({id,index:i,cond:gun.cond});
    }
  }
  return worn;
}
function repairCopies(copies,condition) {
  for (const {id,index} of copies) {
    if(index) spareList(id)[index-1].cond=condition;
    else S.cond[id]=condition;
  }
}
function loadedMass(id,gun) { return gun ? (ITEMS[WP[id].ammo]?.w || 0)*gun.mag : 0; }
function weight() {
  let kg=PACK_KG+KNIFE_KG;
  for (const [id,n] of Object.entries(S.inv)) {
    kg+=(ITEMS[id]?.w || 0)*n;
    if (isGun(id)) for(let i=0;i<n;i++) kg+=loadedMass(id,gunCopy(id,i));
  }
  return Math.round(kg*1000)/1000;
}
const showKg = kg => Number(kg.toFixed(3)).toLocaleString('ru-RU');
function capacityError(kg,cells,armor=S.armor) {
  if (kg > carryLimit(armor)+.00001) return 'Превышен вес: '+showKg(kg)+' / '+carryLimit(armor)+' кг.';
  if (cells > PACK_CELLS) return 'Не хватает ячеек: '+cells+' / '+PACK_CELLS+'.';
  return '';
}
function receiveError(id,n,gun) {
  const inv={...S.inv,[id]:cnt(id)+n};
  return capacityError(weight()+ITEMS[id].w*n+loadedMass(id,gun),packCells(inv,null,incomingKit([id])));
}
function addPacked(id,n=1,gun) {
  if (incomingKit([id]).has(id)) S.flags.kit[kitSlot(id)] = id;
  if (isGun(id)) {
    for (let i=0;i<n;i++) {
      const copy={...(gun || {cond:80,mag:0})};
      if (cnt(id)) spareList(id).push(copy); else setPrimary(id,copy);
      S.inv[id]=cnt(id)+1;
    }
  } else S.inv[id]=cnt(id)+n;
}
// Продажа и склад по умолчанию берут запасной ствол. Снаряжение в руках защищено.
function removePacked(id,n=1,index=cnt(id)-1) {
  let gun;
  if (isGun(id)) {
    gun=gunCopy(id,index);
    const spares=spareList(id);
    if (index) spares.splice(index-1,1);
    else if (spares.length) setPrimary(id,spares.pop());
    if (cnt(id)===1) { delete S.cond[id]; delete S.mag[id]; }
  }
  take(id,n); return gun;
}
function personalStock() { return S.flags.personalStock ||= {loot:{},guns:{}}; }
function putStock(stock,id,n,gun) {
  stock.loot[id]=(stock.loot[id] || 0)+n;
  if (gun) ((stock.guns ||= {})[id] ||= []).push({...gun});
}
function lootGun(stock,id) {
  return isGun(id) ? stock.guns?.[id]?.at(-1) || {cond:stock.wcond?.[id] ?? 80,mag:0} : null;
}
// Переносит только то, что поместилось. Остаток остаётся в исходном контейнере.
function collectStock(stock,id,limit=Infinity) {
  const available=Math.min(stock.loot[id] || 0,limit);
  let moved=0;
  if (id==='money') { S.money+=available; moved=available; }
  else if (ITEMS[id]) {
    while (moved < available) {
      const gun=lootGun(stock,id);
      if (receiveError(id,1,gun)) break;
      addPacked(id,1,gun);
      if (gun) stock.guns?.[id]?.pop();
      moved++;
    }
  }
  if (moved) {
    stock.loot[id]-=moved;
    if (!stock.loot[id]) { delete stock.loot[id]; if(stock.guns) delete stock.guns[id]; }
  }
  return moved;
}
function give(id,n=1,gun) {
  // Обязательные награды доступны и при полном рюкзаке.
  const stock={loot:{[id]:n},wcond:{},guns:gun?{[id]:Array(n).fill(gun)}:{}};
  const moved=collectStock(stock,id);
  if (moved<n) {
    const left=n-moved;
    if (gun) for(let i=0;i<left;i++) putStock(personalStock(),id,1,gun);
    else putStock(personalStock(),id,left);
    const note=ITEMS[id].n+' ×'+left+' — в личном ящике.';
    msg(note); news(note);
  }
  return moved;
}

/* ===================== состояние ===================== */
let S = null, P = null, ents = [], decals = [], parts = [], tracers = [], flashes = [], bolts = [], nades = [], crows = [], anoms = [], arts = [];
let bridgeBarrier;
let armyAngry = false, nextId = 1, spawnT = 0, fogT = 0, saveT = 0, warnT = 0;
const cnt = id => S.inv[id] || 0;
const has = id => cnt(id) > 0;
const beltCount = id => S.belt.filter(x => x === id).length;
function take(id, n) {
  S.inv[id] = Math.max(0, cnt(id) - (n || 1)); if (!S.inv[id]) delete S.inv[id];
  while (beltCount(id) > cnt(id)) S.belt.splice(S.belt.indexOf(id), 1);
  if (!has(id)) {
    if (S.weapon === id) setWeapon('knife');
    const slot=kitSlot(id);
    if (slot && S.flags.kit?.[slot] === id) delete S.flags.kit[slot];
  }
}
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

const DIFFICULTIES = {
  rookie: {name:'Новичок', note:'Больше припасов, выгодная торговля. Легче попасть и пережить ранение.',
    buy:.8, income:1.20, loot:1.40, incoming:.65, spread:.75},
  normal: {name:'Средний', note:'Обычные цены, запасы и урон.',
    buy:1, income:1, loot:1, incoming:1, spread:1},
  hard: {name:'Сложный', note:'Патронов меньше, снаряжение дороже. Противники бьют сильнее.',
    buy:1.25, income:.80, loot:.75, incoming:1.25, spread:1.10},
  master: {name:'Мастер', note:'Скудная добыча, дорогой ремонт и низкий заработок. Ошибки в бою обходятся дорого.',
    buy:1.55, income:.60, loot:.50, incoming:1.55, spread:1.20}
};
function difficultyKey(id) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTIES,id) ? id : 'normal';
}
function rules() { return DIFFICULTIES[difficultyKey(S?.difficulty)]; }
const purchaseCost = base => Math.ceil(base*rules().buy);
const earnings = base => Math.round(base*rules().income);
const supplyCount = count => Math.max(1,Math.round(count*rules().loot));

function freshS(difficulty='normal') {
  return { v: 1, difficulty:difficultyKey(difficulty), money: 0, inv: { ar_jacket: 1, medkit: 1, bandage: 2, bread: 1 }, weapon: 'knife', armor: 'ar_jacket', belt: [], mag: {},
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
  { sid: 'wolf', fac: 'loner', name: 'Волк', x: 20.5, y: 79, wpn: 'w_obrez', hp: 130, rank: 2, stay: 1, named: 1 },
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
// Perception supplies a remembered position. Hidden actors never supply fresh coordinates.
function mutantPrey(o){
  return o && o.alive && o.kind==='human' && o.fac!=='trader' && !o.captive && !inBunker(o.x,o.y);
}
function leaveHunt(e){
  e.tgt=e.trail=e.path=e.wander=null;e.routeRetry=0;e.returning=true;
  e.scentTime=0;e.searchBlocked=0;e.fleeT=0;e.huntProbe=null;
  e.state=e.kind==='sucker'?'lurk':'idle';
}
function mutantTarget(e,dt,sightRange,chaseRange){
  if(e.returning)return null;
  if(e.tgt)e.scentTime=(e.scentTime||0)-dt;
  if(e.tgt && (!mutantPrey(e.tgt) || dE(e,e.tgt)>chaseRange)){
    leaveHunt(e);return null;
  }
  if(e.think<=0){
    e.think=.25;
    let best=null,nearest=Infinity;
    for(const o of ents){
      if(!mutantPrey(o))continue;
      const range=o===e.tgt?chaseRange:sightRange*(e.kind==='dog'&&o===P?clamp(pVis()*1.1,.5,1.2):1);
      const d=dE(e,o);
      if(d>=range || d>=nearest || !clearNPCShot(e,o,true))continue;
      nearest=d;best=o;
    }
    if(best){
      if(e.kind==='dog'){
        for(const mate of ents)if(mate!==e&&mate.alive&&mate.kind==='dog'&&mate.pack===e.pack&&
            (!mate.tgt||mate.tgt===best)&&!mate.returning&&dE(e,mate)<220){
          mate.tgt=best;mate.trail={x:best.x,y:best.y};mate.scentTime=4;
        }
      }
      e.tgt=best;e.trail={x:best.x,y:best.y};e.scentTime=4;
    }
    if(e.tgt){
      // Give up an unreachable target even when it can be seen through wire mesh.
      const moved=e.huntProbe?dE(e,e.huntProbe):Infinity;
      if(moved<4 && (e.routeRetry>0 || e.stuck>.1))e.searchBlocked=(e.searchBlocked||0)+.25;
      else e.searchBlocked=0;
      e.huntProbe={x:e.x,y:e.y};
    }
  }
  if(e.tgt && (!e.trail || e.scentTime<=0 || e.searchBlocked>=3)){
    leaveHunt(e);return null;
  }
  return e.tgt;
}
function roamDen(e,dt,speed){
  if(e.returning || dE(e,e.home)>120){
    e.returning=true;
    if(e.denRevision!==navRevision || !e.denSpot){
      e.denRevision=navRevision;e.denSpot=e.home;
      if(!clearFooting(e.home.x,e.home.y,e.r)){
        // A respawned crate can occupy the original resting spot.
        const cx=Math.floor(e.home.x/T),cy=Math.floor(e.home.y/T);
        let nearest=Infinity;
        for(let y=cy-2;y<=cy+2;y++)for(let x=cx-2;x<=cx+2;x++){
          if(!inb(x,y)||!nav[y*MW+x])continue;
          const p={x:(x+.5)*T,y:(y+.5)*T},d=dE(p,e.home);
          if(d<nearest&&clearFooting(p.x,p.y,e.r)&&findPath(e.x,e.y,p.x,p.y,true,e.r)){
            e.denSpot=p;nearest=d;
          }
        }
      }
    }
    if(goTo(e,e.denSpot.x,e.denSpot.y,90,dt)<11){
      e.returning=false;e.wander=e.path=null;e.idleT=rnd(2,5);
    }
    return;
  }
  e.idleT=(e.idleT||0)-dt;
  if(e.wander){
    if(goTo(e,e.wander.x,e.wander.y,speed,dt)<8 || e.routeRetry>0)e.wander=null;
  }else if(e.idleT<=0){
    e.idleT=rnd(2,6);
    const a=rnd(0,Math.PI*2),r=rnd(20,80),x=e.home.x+Math.cos(a)*r,y=e.home.y+Math.sin(a)*r;
    if(walkAnchor(x,y,e.r)>=0 && clearFooting(x,y,e.r))e.wander={x,y};
  }
}
function mutantApproach(e,point,speed,dt){
  // A human can hug a wall closer than a boar. Aim for a point just short of the prey.
  const d=dE(e,point),pad=Math.min(d,Math.max(0,e.r-9)+2);
  if(d<1)return;
  const x=point.x+(e.x-point.x)*pad/d,y=point.y+(e.y-point.y)*pad/d;
  const dest=clearFooting(x,y,e.r)?{x,y}:point;
  goTo(e,dest.x,dest.y,speed,dt);
}
function canStrike(e,t,reach){
  return mutantPrey(t) && dE(e,t)<reach && clearNPCShot(e,t);
}
/* кабан: замечает, роет землю, бросается рывком по прямой; после рывка оглушён — уходи в сторону */
function aiBoar(e, dt) {
  e.cool -= dt; e.think -= dt; e.st -= dt;
  const t=mutantTarget(e,dt,300,560);
  if(!t){roamDen(e,dt,45);return;}
  const want=Math.atan2(e.trail.y-e.y,e.trail.x-e.x);
  if (e.state === 'idle' || e.state === 'stalk') {
    e.state = 'stalk'; e.ang += angD(e.ang, want) * Math.min(1, dt * 4);
    if (dE(e,e.trail)>240 || !clearWalk(e.x,e.y,e.trail.x,e.trail.y,e.r)) mutantApproach(e,e.trail,90,dt);
    else if (e.cool <= 0 && canStrike(e,t,241)) { e.state = 'wind'; e.st = 0.6; play('dog', e.x, e.y, 0.7); }
    else mutantApproach(e,e.trail,50,dt);
  } else if (e.state === 'wind') {
    e.ang += angD(e.ang, want) * Math.min(1, dt * 6);
    if (chance(dt * 12)) parts.push({ x: e.x - Math.cos(e.ang) * 10, y: e.y - Math.sin(e.ang) * 10, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.4, c: '#5a4a34', s: 2 });
    if (e.st <= 0) { e.state = 'charge'; e.st = 0.85; e.hit = 0; }
  } else if (e.state === 'charge') {
    const sp = 330 * dt, ox = e.x, oy = e.y;
    const nx=ox+Math.cos(e.ang)*sp,ny=oy+Math.sin(e.ang)*sp;
    if(clearWalk(ox,oy,nx,ny,e.r))moveE(e,nx-ox,ny-oy);
    e.step+=dst(ox,oy,e.x,e.y);
    if (!e.hit) for (const o of ents) { if (canStrike(e,o,e.r+o.r+4)) { e.hit = 1; hurt(o, rnd(24, 34), e, e.ang); o.kx += Math.cos(e.ang) * 320; o.ky += Math.sin(e.ang) * 320; break; } }
    if (e.st <= 0 || dst(ox, oy, e.x, e.y) < sp * 0.3) { e.state = 'stun'; e.st = 1.1; e.cool = 1.6; }
  } else if (e.state === 'stun') { if (e.st <= 0) e.state = 'stalk'; }
}
const FAC_N = { loner: 'Одиночки', bandit: 'Бандиты', army: 'Военные', mutant: 'Мутанты', trader: 'Торговцы', player: 'Одиночки' };
const nameI = { loner: 0, bandit: 3 };
function rollInv(fac) {
  const inv = {};
  ['bandage', 'sausage', 'bread', 'vodka', 'cans'].forEach(i => { if (chance((FOOD[i] ? .16 : .3)*rules().loot)) inv[i] = 1; });
  if (chance((fac === 'army' ? 0.5 : 0.25)*rules().loot)) inv.medkit = 1;
  if (chance(.15*rules().loot)) inv.antirad = 1;
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
    money: earnings((d.fac === 'army' ? ri(100, 300) : ri(50, 300)) + rank * 120), inv: rollInv(d.fac), kx: 0, ky: 0, flash: 0, step: 0,
    wounded: d.wounded, fireRef: d.localFire || (d.fire === 2 ? FIRE2 : FIRE),
    seed: Math.floor(Math.random() * 1e6), path: null, pi: 0, idleT: rnd(1, 5), trip: null, score: [ri(2, 14), ri(15, 44), ri(45, 80)][Math.min(rank, 2)] };
  if (d.sid==='dump_scale') { e.inv={antirad:4,energy:3,bandage:5,cans:4,a12:14}; e.money=1800; }
  if (d.sid==='lz_barman') {e.inv={energy:8,bread:6,cans:5,vodka:4,bandage:3};e.money=2200;}
  e.maxhp = e.hp;
  if (e.sit) e.ang = Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x);
  if (e.guard === 'bridge') e.ang = (BIG && e.sid==='a1' ? -1 : 1)*Math.PI/2;
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
const DEN_RECOVERY = 24 * 60;
let mutantDens = new Map();
function registerDens() {
  mutantDens = new Map();
  for (const d of DOGDEF) register(d, mkDog, d.pack);
  for (const d of boarDefs()) register(d, mkBoar, d.pack || (d.sid === 'k3' ? 'boar_east' : 'boar'));
  function register(d, make, pack) {
    if (!mutantDens.has(pack)) mutantDens.set(pack, []);
    mutantDens.get(pack).push({def:{...d,pack}, make});
  }
}
function spawnDenMember(member) {
  const e = member.make(member.def);
  e.den = member.def.pack;
  clearPropSpawn(e);
  ents.push(e);
}
function clearedDen(pack) {
  const members = mutantDens.get(pack);
  if (members && members.every(m => S.dead[m.def.sid])) {
    const deadlines = S.flags.denRecovery ||= {};
    deadlines[pack] ??= S.min + DEN_RECOVERY;
  }
}
function renewDens() {
  const deadlines = S.flags.denRecovery;
  if (!deadlines) return;
  for (const [pack, until] of Object.entries(deadlines)) {
    const members = mutantDens.get(pack);
    if (!members || S.min < until) continue;
    const safeToSpawn = members.every(({def}) => {
      const x = def.x*T, y = def.y*T;
      const onScreen = Math.abs(cam.x-x)<VW/(2*Z)+4*T && Math.abs(cam.y-y)<VH/(2*Z)+4*T;
      return S.dead[def.sid] && !onScreen && dst(P.x,P.y,x,y)>1200;
    });
    if (!safeToSpawn) continue;
    for (const member of members) {
      const sid = member.def.sid;
      ents = ents.filter(e => e.sid !== sid || e.alive);
      delete S.dead[sid];
      spawnDenMember(member);
    }
    delete deadlines[pack];
  }
}
function spawnWorld() {
  ents = []; decals = []; parts = []; tracers = []; flashes = []; bolts = []; nades = []; crows = [];
  for (let i = objs.length - 1; i >= 0; i--) if (!objs[i].static) objs.splice(i, 1);
  objs.push(...retiredFixedCrates); retiredFixedCrates.length = 0;
  objs.forEach(o => { if (o.stash) restoreContainer(o); });
  armyAngry = !!S.flags.armyAngry;
  bridgeBarrier = objs.find(o => o.key === 'bar');
  if (bridgeBarrier) { bridgeBarrier.solid = S.flags.bridgePaid ? 0 : 1; buildGrids(); }
  S.q2 = S.q2 || { fox: 0, tolik: 0 };
  P = mkPlayer(); ents.push(P);
  delete S.dead.sid; // Сохранение из версии, где торговца можно было убить.
  NPCDEF.forEach(d => {
    if (S.dead[d.sid]) return;
    const e = mkHuman(d);
    if (d.sid === 'shust' && S.flags.shustFree) { const p = walkPoint(locPt('atp','petr'),3,2); e.captive = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'tolik' && S.flags.tolikUp) { const p = locPt('village', 'tolik'); e.captive = e.wounded = 0; e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (d.sid === 'fox' && S.flags.foxUp) { e.captive = e.wounded = 0; }
    if ((d.sid === 'petr' || d.sid === 'petr2') && S.flags.atpClear) { const p = locPt('atp', d.sid); e.x = e.home.x = p.x; e.y = e.home.y = p.y; }
    if (S.flags.angry && S.flags.angry[d.sid]) e.angry = 1;
    ents.push(e);
  });
  registerDens();
  for (const [pack,members] of mutantDens) {
    for (const member of members) if (!S.dead[member.def.sid]) spawnDenMember(member);
    clearedDen(pack); // Also initialise the cooldown for a cleared den in an older save.
  }
  rcSpawnObjs();
  campaignCast();


  anoms = ANOM0.map(spawnAnomaly);
  arts = ARTS0.filter(a => !S.flags['art_' + a.key]).map(a => Object.assign({}, a));
}
const byS = sid => ents.find(e => e.sid === sid && e.alive);

/* ===================== отношения ===================== */
function hostile(a, b) {
  if (a === b || !a.alive || !b.alive || a.captive || b.captive) return false;
  const fa = a.fac, fb = b.fac;
  if(BIG && (a.guard==='south' && b===P || b.guard==='south' && a===P) && S.campaign && ['case','escape'].includes(chapter()) && storyArea())return true;
  if (fa === 'trader' || fb === 'trader') return false;
  if (fa === 'mutant' || fb === 'mutant') return fa !== fb;
  if (fa === fb) return false;
  const pair = (x, y) => (fa === x && fb === y) || (fa === y && fb === x);
  if (pair('bandit', 'loner') || pair('bandit', 'player') || pair('bandit', 'army')) return true;
  if (pair('army', 'player')) { const s = fa === 'army' ? a : b; return armyAngry || !!s.angry || (s.guard==='sphere' && !!S.flags.sphereAlarm); }
  if (pair('loner', 'player')) { const l = fa === 'loner' ? a : b; return S.rep <= -30 || !!l.angry; }
  return false;
}
function playerRelation(e) {
  if (hostile(e, P)) return 'enemy';
  if (e.fac !== 'loner') return 'neutral';
  if (e.storyMan || e.follow || (e.uid && S.flags['sosFriend_' + e.uid])) return 'friend';
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
function lonerWitnesses(victim) {
  return ents.filter(o => {
    if (o === victim || o.fac !== 'loner' || !o.alive || o.captive) return false;
    const range = sight(o);
    return [P, victim].every(target =>
      dE(o, target) < range && seesActor(o, target) &&
      Math.abs(angD(o.ang, Math.atan2(target.y - o.y, target.x - o.x))) < 1.0);
  });
}
function rememberAttacker(e) {
  if (!e.sid && !e.uid) e.uid = dynId();
  e.angry = 1;
  markAngry(e);
}
function witnessLonerAttack(victim, fatal, witnesses = lonerWitnesses(victim)) {
  witnesses.forEach(rememberAttacker);
  if (!fatal) { rememberAttacker(victim); return; }
  if (!witnesses.length) return;
  const reports = S.flags.lonerReports || (S.flags.lonerReports = []);
  reports.push({ victim: victim.name, due: S.min + 3, witnesses: witnesses.map(e => e.sid || e.uid) });
}
function deliverLonerReports() {
  const reports = S.flags.lonerReports;
  if (!reports) return;
  S.flags.lonerReports = reports.filter(report => {
    if (report.due > S.min) return true;
    const sender = ents.find(e => e.alive && !e.captive && report.witnesses.includes(e.sid || e.uid));
    if (sender) {
      S.rep -= 35;
      bulletin(sender.name + ' в эфире: «Видел, как Меченый убил одиночку. Погиб ' + report.victim + '».');
    }
    return false;
  });
  if (!S.flags.lonerReports.length) delete S.flags.lonerReports;
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
const SPHERE_WARNING='Охрана «Сферы»: Стой! Территория под охраной. Войдёшь за ограду — откроем огонь.';
function checkSpherePerimeter(){
  if(!P.alive) return;
  const x=P.x/T,y=P.y/T-LESSER_TOP;
  const gap=Math.max(151.5-x,x-176.8,37-y,y-56);
  const flags=S.flags;
  if(gap>7){
    if(flags.sphereWarnAt!=null){delete flags.sphereWarnAt;delete flags.sphereAlarm;}
    return;
  }
  if(gap>5 || flags.sphereAlarm || armyAngry) return;
  const guards=ents.filter(e=>e.guard==='sphere' && e.alive);
  if(!guards.length) return;
  if(flags.sphereWarnAt==null){
    flags.sphereWarnAt=S.min;radioNotice(SPHERE_WARNING);
    return;
  }
  if(gap>=0 || S.min-flags.sphereWarnAt<1.5) return;
  flags.sphereAlarm=1;
  for(const guard of guards){
    guard.aw=1;guard.tgt=P;guard.mem=6;guard.lastSeen={x:P.x,y:P.y};
  }
}
function checkBridgeCrossing(oldX, oldY) {
  if (!bridgeBarrier?.solid || S.flags.bridgePaid || !P.alive) return;
  const lineY = bridgeBarrier.y + bridgeBarrier.h / 2;
  if ((oldY < lineY) === (P.y < lineY)) return;
  const x = oldX + (P.x - oldX) * (lineY - oldY) / (P.y - oldY);
  if (x < bridgeBarrier.x - P.r || x > bridgeBarrier.x + bridgeBarrier.w + P.r) return;
  let alarm = false;
  for (const guard of ents) {
    if (guard.guard !== 'bridge' || !guard.alive || guard.angry) continue;
    guard.angry = 1;
    markAngry(guard);
    guard.tgt = P;
    guard.aw = 1;
    guard.lastSeen = {x:P.x, y:P.y};
    guard.mem = 6;
    alarm = true;
  }
  if (alarm) msg('Часовой: — Нарушитель у шлагбаума! Огонь!', 'bad');
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
  for (let i = 0; i < objs.length; i++) { const o = objs[i]; if (o.solid && !(hop && canVaultObject(o)) && e.x + e.r > o.x && e.x - e.r < o.x + o.w && e.y + e.r > o.y && e.y - e.r < o.y + o.h) pushOut(e, o.x, o.y, o.w, o.h); }
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const nearby=propCells.get(y*MW+x);
    if(nearby) for(const p of nearby) if(!hop || !p.vaultable) touchesProp(p,e,true);
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
  e.yielding=false;e.lastWalk=S.min;
  const distance=dst(e.x,e.y,tx,ty);
  if(distance<1)return distance;
  const changed=!e.goal||dst(e.goal.x,e.goal.y,tx,ty)>12||e.pathRevision!==navRevision;
  if(changed){e.path=null;e.routeRetry=0;}
  if(!e.path){
    if(e.routeRetry>0){e.routeRetry-=dt;return distance;}
    e.goal={x:tx,y:ty};e.pathRevision=navRevision;e.pi=0;
    const direct=distance<260 && clearWalk(e.x,e.y,tx,ty,e.r) &&
      !anoms.some(a=>{
        const dx=tx-e.x,dy=ty-e.y,t=clamp(((a.x-e.x)*dx+(a.y-e.y)*dy)/(distance*distance),0,1);
        return dst(a.x,a.y,e.x+t*dx,e.y+t*dy)<a.r+e.r;
      });
    e.path=direct?[e.goal]:findPath(e.x,e.y,tx,ty,true,e.r);
    if(!e.path){e.routeRetry=.9;return distance;}
    if(!direct)e.path.push(e.goal);
    e.stuck=0;
  }
  // Reach the centre before turning at a door jamb. Clamp the last step to the waypoint.
  let p=e.path[e.pi];
  while(p){
    const next=e.path[e.pi+1],gap=dE(e,p);
    // Travellers sharing a gate can pass on either side of the waypoint centre.
    if(gap>=1 && !(next&&gap<24&&clearWalk(e.x,e.y,next.x,next.y,e.r)))break;
    p=e.path[++e.pi];
  }
  if(!p){e.path=null;return distance;}
  // At a shared corner, let one traveller complete the turn before the next enters.
  if((e.kind==='human'||e.fac==='mutant') && dE(e,p)<T*1.6 && ents.some(o=>{
    if(o===e||!o.alive||o.id>=e.id||!o.path||S.min-o.lastWalk>.2||dE(o,e)>T*1.7)return false;
    const next=o.path[o.pi];return next&&dE(next,p)<8&&dE(o,p)<T*1.5;
  })){
    e.yielding=true;return distance;
  }
  const d=dE(e,p),dx=(p.x-e.x)/d,dy=(p.y-e.y)/d;
  const step=Math.min(d,speed*dt*(swampAt(e.x,e.y)?.55:1)),ox=e.x,oy=e.y;
  moveE(e,dx*step,dy*step);
  e.step+=dst(ox,oy,e.x,e.y);
  e.ang+=angD(e.ang,Math.atan2(dy,dx))*Math.min(1,dt*6);
  e.stuck=d-dE(e,p)<step*.2?(e.stuck||0)+dt:0;
  if(e.stuck>.45){e.path=null;e.routeRetry=.15;}
  return dst(e.x,e.y,tx,ty);
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
// Ground elevations in world units, sampled from the same landforms as the renderer.
// Both ends of a shot stand on the ground; two people on one crest can see each other.
let combatRelief;
function terrainLevel(x,y) {
  if(!BIG || x<0 || y<0 || x>=(MW-1)*T || y>=(MH-1)*T)return 0;
  if(!combatRelief){
    combatRelief=new Float32Array(MW*MH);
    function mound(cx,cy,rx,ry,a,height){
      const sn=Math.sin(a),cs=Math.cos(a),r=Math.ceil(Math.max(rx,ry));
      for(let j=Math.max(0,Math.floor(cy-r));j<=Math.min(MH-1,cy+r);j++)
        for(let i=Math.max(0,Math.floor(cx-r));i<=Math.min(MW-1,cx+r);i++){
          const u=((i-cx)*cs+(j-cy)*sn)/rx,v=((j-cy)*cs-(i-cx)*sn)/ry;
          const k=j*MW+i;
          combatRelief[k]=Math.max(combatRelief[k],height*Math.max(0,1-u*u-v*v)**2);
        }
    }
    for(const [cx,cy,rx,ry,a] of knolls)mound(cx,cy,rx,ry,a,48);
    for(const [cx,cy,w,h,a] of dumpHills)mound(cx,cy,w/2,h/2,a,84);
  }
  const u=x/T,v=y/T,i=Math.floor(u),j=Math.floor(v),k=j*MW+i;
  return lerp(lerp(combatRelief[k],combatRelief[k+1],u-i),
              lerp(combatRelief[k+MW],combatRelief[k+MW+1],u-i),v-j);
}
// Clip a ray against the same convex footprint that stops a walking actor.
function propRay(p,x,y,dx,dy,near,far){
  let enter=near,exit=far;
  for(let i=0;i<p.vertices.length;i++){
    const a=p.vertices[i],b=p.vertices[(i+1)%p.vertices.length];
    const ex=b[0]-a[0],ey=b[1]-a[1],offset=ex*(y-a[1])-ey*(x-a[0]),rate=ex*dy-ey*dx;
    if(Math.abs(rate)<1e-8){if(offset<0)return Infinity;continue;}
    if(rate>0)enter=Math.max(enter,-offset/rate);
    else exit=Math.min(exit,-offset/rate);
    if(enter>exit)return Infinity;
  }
  return enter;
}
function npcBarrier(from,dx,dy,limit,target,vision=false){
  if(limit<=0)return 0;
  const {x,y}=from,base=terrainLevel(x,y)+18,range=target?dE(from,target):0;
  const slope=range>1?(terrainLevel(target.x,target.y)+18-base)/range:0;
  let i=Math.floor(x/T),j=Math.floor(y/T),near=0;
  const sx=dx>0?1:-1,sy=dy>0?1:-1;
  const stepX=dx?T/Math.abs(dx):Infinity,stepY=dy?T/Math.abs(dy):Infinity;
  let nextX=dx?((i+(dx>0))*T-x)/dx:Infinity,nextY=dy?((j+(dy>0))*T-y)/dy:Infinity;
  function tileBlocks(i,j){
    if(!inb(i,j))return true;
    const tile=map[j*MW+i];
    return OPAQ[tile] || tile===RA;
  }
  while(near<limit){
    if(tileBlocks(i,j))return near;
    const cell=j*MW+i,far=Math.min(nextX,nextY,limit);
    let hit=Infinity;
    const solids=walkSolids.get(cell),props=propCells.get(cell);
    if(solids)for(const o of solids)if(o.solid && !(vision && o.k==='fence' && !o.opaque && o.material!=='concreteWire' && o.material!=='stockade'))
      hit=Math.min(hit,rayBox(o,x,y,dx,dy,near,far));
    if(props)for(const p of props)hit=Math.min(hit,propRay(p,x,y,dx,dy,near,far));
    const mid=(near+far)/2;
    if(terrainLevel(x+dx*mid,y+dy*mid)>base+slope*mid)hit=Math.min(hit,mid);
    else if(terrainLevel(x+dx*far,y+dy*far)>base+slope*far)hit=Math.min(hit,far);
    if(hit<=far)return hit;
    if(far===limit)break;
    const crossX=nextX<=nextY+1e-8,crossY=nextY<=nextX+1e-8;
    if(crossX&&crossY&&(tileBlocks(i+sx,j)||tileBlocks(i,j+sy)))return far;
    if(crossX){i+=sx;nextX+=stepX;}
    if(crossY){j+=sy;nextY+=stepY;}
    near=far;
  }
  return limit;
}
function clearNPCShot(from,to,vision=false){
  const d=dE(from,to);
  return d<.01 || npcBarrier(from,(to.x-from.x)/d,(to.y-from.y)/d,d,to,vision)>=d;
}
function seesActor(observer, target, openRay=false) {
  if (!los(observer.x, observer.y, target.x, target.y)) return false;
  if(!openRay && observer.kind==='human' && !clearNPCShot(observer,target,true))return false;
  if (!target.crouch) return true;
  const dx = observer.x - target.x, dy = observer.y - target.y, d = Math.hypot(dx, dy);
  return !d || rayFence(target.x, target.y, dx / d, dy / d, 0, Math.min(d, FENCE_REACH)) === Infinity;
}
function shotBarrier(sh, ca, sa, reach, target=sh.tgt) {
  if(sh!==P && sh.kind==='human')return npcBarrier(sh,ca,sa,reach,target);
  const wall = rayWall(sh.x, sh.y, ca, sa, reach);
  return sh.crouch ? Math.min(wall, rayFence(sh.x, sh.y, ca, sa, 0, Math.min(wall, FENCE_REACH))) : wall;
}
const ballOff = sh => (sh.r || 11) + 8;
function shotTrace(sh, a, W, target=sh.tgt) {   // чистая функция исхода одного луча: {t, best, wall}
  const ca = Math.cos(a), sa = Math.sin(a), reach = W.range + ballOff(sh);
  const wallT = shotBarrier(sh,ca,sa,reach,target);
  let best = null, bt = wallT;

  for (const e of ents) {
    if (!e.alive || e === sh) continue;
    const t = rayCircle(sh.x, sh.y, ca, sa, e.x, e.y, e.r + (e.captive ? -4 : 0));
    if (t !== null && t <= bt) { best = e; bt = t; }
  }
  if (sh===P && best && best.crouch) {
    const centerT = (best.x - sh.x) * ca + (best.y - sh.y) * sa;
    const fence = rayFence(sh.x, sh.y, ca, sa, Math.max(0, centerT - FENCE_REACH), bt);
    if (fence <= bt) { bt = fence; best = null; }
  }
  if(sh===P){
    const box=containerOnRay(sh,ca,sa,bt);
    if(box.o)return {t:box.d,best:null,box:box.o,wall:true,ca,sa};
  }
  return { t: bt, best: best, wall: !best && bt < reach, ca: ca, sa: sa };
}
// Только реальные выстрелы между противниками продлевают локальную перестрелку.
function noteGunfight(sh, target) {
  if (!target || !hostile(sh,target)) return;
  const x=(sh.x+target.x)/2, y=(sh.y+target.y)/2;
  if (dst(P.x,P.y,x,y)>480) return;
  P.combatT=3;
  let fight=P.gunfight;
  if (!fight || fight.until<S.min || dst(x,y,fight.x,fight.y)>480) fight=P.gunfight={};
  Object.assign(fight,{x,y,until:S.min+8});
}
function fire(sh, ang, W, spread, target = sh.tgt) {
  const mz = muzzlePoint(sh, ang), n = W.pellets || 1;
  let shots;
  if(sh!==P){
    if(!target || !hostile(sh,target) || !clearNPCShot(sh,target) || !lineClear(sh,target))return false;
    shots=[];
    for(let k=0;k<n;k++){
      const a=ang+rnd(-spread,spread),r=shotTrace(sh,a,W,target);
      if(r.best && !hostile(sh,r.best))return false;
      shots.push({a,r});
    }
  }
  const ca0 = Math.cos(ang), sa0 = Math.sin(ang), mzT = Math.max(0, (mz.x - sh.x) * ca0 + (mz.y - sh.y) * sa0);
  const w0 = shotBarrier(sh, ca0, sa0, mzT + 1, target), blocked = w0 < mzT;   // ствол упёрся в стену: вспышка у стены, не за ней
  const fx = blocked ? sh.x + ca0 * Math.max(0, w0 - 1) : mz.x, fy = blocked ? sh.y + sa0 * Math.max(0, w0 - 1) : mz.y;
  if (sh!==P) noteGunfight(sh,target);
  // Дробины одного выстрела считаются одним попаданием по своим.
  const shot = sh === P ? { fight:P.gunfight, id:(P.shotId=(P.shotId || 0)+1) } : null;
  for (let k = 0; k < n; k++) {
    const a = shots ? shots[k].a : ang + (Math.random() - 0.5) * 2 * spread, r = shots ? shots[k].r : shotTrace(sh, a, W), ca = r.ca, sa = r.sa, best = r.best, bt = r.t;
    const ex = sh.x + ca * bt, ey = sh.y + sa * bt;
    if (bt > mzT + 0.5 && !blocked) tracers.push({ x0: mz.x, y0: mz.y, x1: ex, y1: ey, life: 0.07, w: n > 1 ? 1 : 1.6 });
    if(r.box && sh===P && r.box.k==='crate'){ breakCrate(r.box); continue; }
    if (best && coverBlocks(best, sh.x, sh.y) && chance(best === P ? 0.6 : 0.5)) {
      const cx = best.x - ca * 22, cy = best.y - sa * 22;
      if (tracers.length && tracers[tracers.length - 1].x1 === ex) { tracers[tracers.length - 1].x1 = cx; tracers[tracers.length - 1].y1 = cy; }
      for (let i = 0; i < 4; i++) parts.push({ x: cx, y: cy, vx: rnd(-90, 90), vy: rnd(-90, 90), life: rnd(0.15, 0.3), c: '#d8c9a0', s: 1.6 });
    } else if (best && best.sid !== 'sid') {
      if (sh===P && hostile(sh,best)) noteGunfight(sh,best);
      const fall = n > 1 ? clamp(1.3 - Math.max(0, bt - ballOff(sh)) / W.range, 0.3, 1) : 1;
      hurt(best, W.dmg * fall * rnd(0.85, 1.15), sh, a, shot);
      if (sh===P) { P.hitT=.2; P.impact={x:ex,y:ey,kill:!best.alive}; }
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
  return true;
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
function lineClear(sh, t, from=sh) {
  const a = Math.atan2(t.y - from.y, t.x - from.x), ca = Math.cos(a), sa = Math.sin(a), L = dE(from, t);
  for (const e of ents) {
    if (!e.alive || e === sh || e === t || hostile(sh, e)) continue;
    const vx = e.x - from.x, vy = e.y - from.y, k = vx * ca + vy * sa;
    if (k < 0 || k > L) continue;
    const px = vx - ca * k, py = vy - sa * k;
    if (px * px + py * py < (e.r + 6) ** 2) return false;
  }
  return true;
}
function melee(sh, W) {
  const passFriends = sh === P && combatNear();
  let hit = null, bd = 1e9;
  ents.forEach(e => {
    if(sh!==P && (!hostile(sh,e)||!clearNPCShot(sh,e)))return;
    if (!e.alive || e === sh || (passFriends && !hostile(sh, e))) return;
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
  if(hit && sh===P && canTakeDown(hit)){takedown(hit);return;}
  const sneak = hit && sh === P && hit.kind === 'human' && hit.tgt !== P && (hit.aw || 0) < 1;
  if (hit) hurt(hit, W.dmg * rnd(0.9, 1.1) * (sneak ? 3 : 1), sh, sh.ang);
}
function hurt(e, dmg, src, ang, shot) {
  if(BIG && src===P && chapter()==='rescue' && S.campaign.atpWait && ATP_BANDITS.includes(e.sid))beginAssault();
  if(BIG && src===P && e.guard==='south')alarmPost();
  if (!e.alive || e.sid === 'sid') return;
  if (src && (src === P || src.follow)) {
    e.hitByP = 1;
    if (e.sosFoe && S.sos && S.sos.act && S.sos.act.id === e.sosFoe) S.flags.sosAssist = e.sosFoe;
  }
  if (e === P) {
    if (src?.kind && src!==P) dmg*=rules().incoming;
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
    if (src === P && e.fac === 'loner' && e.hp > 0 && !hostile(e, P)) {
      const fight=shot?.fight;
      if (fight && fight.until>=S.min && dE(P,fight)<=480 && dE(e,fight)<=480 &&
          (!fight.warningShot || fight.warningShot===shot.id)) {
        if (!fight.warningShot) sayLine(e,'Свои!');
        fight.warningShot=shot.id;
      } else witnessLonerAttack(e, false);
    }
    if (src === P && e.fac === 'army' && !hostile(e, P)) anger(e);
    if (hostile(e, src)) { e.tgt = src; e.lastSeen = { x: src.x, y: src.y }; e.mem = 6; e.react = Math.min(e.react, 0.15); }
  }
  if (e.hp <= 0) kill(e, src);
}
function kill(e, src) {
  if (e.sid === 'sid') return;
  if(BIG && STORY_KEYS.includes(e.sid)){woundKey(e);return;}
  e.alive = 0; e.hp = 0;
  if (e === P) { deathT = 1.6; play('hurt'); return; }
  if (e.sid) S.dead[e.sid] = 1;
  if (e.den) clearedDen(e.den);
  const witnesses = src === P && e.fac === 'loner' ? lonerWitnesses(e) : null;
  (witnesses || ents).forEach(o => { if (o.alive && o !== e && o.kind === 'human' && o.fac === e.fac && dE(o, e) < 420) o.morale = (o.morale === undefined ? 1 : o.morale) - 0.3; });
  decals.push({ x: e.x + rnd(-4, 4), y: e.y + rnd(-4, 4), r: rnd(10, 16), a: 0.75 });
  if (decals.length > 140) decals.shift();
  dropBody(e);
  const byPlayer = src === P;
  if (byPlayer) {
    if (e.kind !== 'human') S.stats.kM++; else S.stats.kS++;
    if (witnesses) witnessLonerAttack(e, true, witnesses);
    if (e.fac === 'bandit') S.rep += 3;
  } else if (e.fac === 'loner' && (dE(e, P) > 380 || !los(P.x, P.y, e.x, e.y))) {
    const why = src === 'blow' ? 'выброс' : src === 'anom' ? 'аномалия' : src && src.fac === 'mutant' ? 'слепые псы' : src && src.fac === 'bandit' ? 'бандиты' : src && src.fac === 'army' ? 'военные' : 'неизвестно';
    bulletin('Погиб сталкер ' + e.name + '. Причина: ' + why + '.');
  } else if (e.fac === 'bandit' && src && src.fac === 'loner' && dE(e, P) > 380) {
    bulletin('Одиночки убили бандита по кличке ' + e.name + '.');
  }
  plusKill(e, src);
}
const MUTANT_TROPHIES = {dog:'tail', boar:'hoof', sucker:'tentacle'};
function dropBody(e) {
  const loot = {};
  const trophy = MUTANT_TROPHIES[e.kind];
  if (trophy) loot[trophy] = 1;
  else {
    if (e.money) loot.money = e.money;
    Object.keys(e.inv || {}).forEach(k => loot[k] = e.inv[k]);
    const W = WP[e.wpn];
    if (W && W.ammo) { loot[W.ammo] = (loot[W.ammo] || 0) + supplyCount((W.ammo === 'a545' || W.ammo === 'a762') ? ri(15, 35) : W.ammo === 'a12' ? ri(3, 8) : ri(6, 14)); loot[e.wpn] = (loot[e.wpn] || 0)+1; }
    if (e.fac === 'army' && chance(0.3)) loot.grenade = 1;
    if (e.sid === 'boss') { loot.ar_bandit = 1; loot.grenade = 2; }
  }
  if (e.kind === 'human' && (e.fac === 'loner' || e.fac === 'bandit') && chance(0.3)) loot.__tip = 1;
  const body = { k: 'body', x: e.x, y: e.y, ang: e.ang, fac: e.fac, kind: e.kind, name: e.name, seed: e.seed || 1, loot: loot, guns:e.guns, wcond:e.wcond, t: S.min };
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
  if((e.sid==='petr' || e.sid==='petr2') && !S.flags.assault && !S.flags.atpClear){
    e.tgt=null;e.path=null;return;
  }
  e.cool -= dt; e.think -= dt; stealthTick(e, dt);
  const W = WP[e.wpn];
  if (e.reload > 0) { e.reload -= dt; if (e.reload <= 0) e.mag = W.mag; }
  if (e.think <= 0) {
    e.think = 0.25 + Math.random() * 0.15;
    const t = findTarget(e);
    if (t && t !== e.tgt) { e.tgt = t; e.react = rnd(0.35, 0.8) - (e.rank || 0) * 0.08; if (chance(0.6)) callout(e, 'combat'); }
    if (!t && e.tgt && (!e.tgt.alive || !hostile(e, e.tgt))) e.tgt = null;
    // охрана южного блокпоста
    if (e.guard === 'south' && BIG && ['case','escape'].includes(chapter()) && storyArea() && e.aw>=1)alarmPost();
    if (e.guard === 'south' && !(BIG && ['case','escape'].includes(chapter())) && P.alive && dE(e, P) < 300 && seesActor(e, P)) {
      const d = dE(e, P);
      if (d < 150 && !e.angry && !armyAngry) { e.angry=1;e.aw=1;e.tgt=P;e.react=.3;e.mem=8;e.lastSeen={x:P.x,y:P.y}; msg('Часовой: — Огонь по нарушителю!', 'bad'); }
      else if (d < 300 && warnT <= 0 && !e.angry) { warnT = 8; msg('Часовой: — Стой! Назад, стреляю без предупреждения!', 'bad'); }
    }
  }
  const t = e.tgt;
  if (t && t.alive && hostile(e, t)) { combatHuman(e, t, W, dt); return; }
  if(e.inBattle){
    e.inBattle=false;e.healing=0;e.healT=0;e.firingSpot=null;e.peekTime=0;
    e.path=null;e.routeRetry=0;e.mem=0;e.lastSeen=null;
  }
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
  if (e.guard && e.guard!=='south') return 'hold';
  if (WP[e.wpn].pellets && !has('push')) return 'push';
  if (mates.length >= 1 && !has('flank')) return 'flank';
  if (!has('push') && mates.length >= 2) return 'push';
  return 'hold';
}
/* укрытие: проходимая клетка рядом с препятствием, которое стоит между ней и целью */
// Search only locally connected cells. The travel cost follows doors and fence openings.
function battlePosition(e,t,minD,maxD,seekCover){
  const start=walkAnchor(e.x,e.y);
  if(start<0)return null;
  const queue=[start],steps=[0],visited=new Set(queue);
  let best=null,bestCost=Infinity;
  for(let i=0;i<queue.length;i++){
    const cell=queue[i],x=cell%MW,y=Math.floor(cell/MW),cost=steps[i]*T;
    if(cost>bestCost || steps[i]>9)break;
    const p={x:(x+.5)*T,y:(y+.5)*T},d=dE(p,t);
    if(d>=minD && d<=maxD && !ents.some(o=>o!==e&&o.alive&&o.cover&&dE(o.cover,p)<22)){
      const dx=(t.x-p.x)/d,dy=(t.y-p.y)/d;
      const usable=seekCover ? npcBarrier(p,dx,dy,54,t)<54 :
        dE(e,p)>20 && clearNPCShot(p,t) && lineClear(e,t,p);
      if(usable){
        const score=cost+Math.abs(d-(minD+maxD)/2)*.22;
        if(score<bestCost){bestCost=score;best=p;}
      }
    }
    for(let k=0;k<8;k++){
      const n=navNeighbor(x,y,k);
      if(n>=0&&!visited.has(n)){visited.add(n);queue.push(n);steps.push(steps[i]+1);}
    }
  }
  return best;
}
function findCover(e,t,minD,maxD){
  const near=Math.max(25,Math.min(minD,dE(e,t)-64));
  return battlePosition(e,t,near,maxD,true);
}
function npcHeal(e,patient=e) {
  const id = e.inv.medkit ? 'medkit' : e.inv.bandage ? 'bandage' : null;
  if (!id) return false;
  e.inv[id]--; if (!e.inv[id]) delete e.inv[id];
  patient.hp = Math.min(patient.maxhp, patient.hp + (id === 'medkit' ? 45 : 18));
  return true;
}
function npcGrenade(e, x, y) {
  const dest={x,y};
  if(!clearNPCShot(e,dest) || ents.some(o=>o!==e&&o.alive&&!hostile(e,o)&&dE(o,dest)<145))return;
  e.nade = 0;
  const a = Math.atan2(y - e.y, x - e.x), d = Math.min(260, dst(e.x, e.y, x, y));
  nades.push({ x: e.x, y: e.y, vx: Math.cos(a) * d * 1.25, vy: Math.sin(a) * d * 1.25, t: 1.6, z: 0, vz: 160, owner: e });
  callout(e, 'nade', true);
  if (dst(x, y, P.x, P.y) < 300) msg('Граната! Уходи с места!', 'bad');
}
function combatHuman(e, t, W, dt) {
  if(!e.inBattle){
    e.inBattle=true;
    if(e.sit)e.seat=1;
    if(!e.trip&&!e.follow)e.trip={stage:2,returnTo:e.guard?{...e.home}:{x:e.x,y:e.y}};
    e.coverWait=0;
    if(e.trip?.stage===1)e.trip.stage=0;
  }
  e.sit=0;e.campRise=null;e.aidTarget=null;
  const d=dE(e,t), inRange=d<sight(e)*1.45;
  const openRay=inRange && clearNPCShot(e,t);
  const visible=inRange && seesActor(e,t,openRay), see=visible && openRay;
  if (visible) { e.lastSeen = { x: t.x, y: t.y }; e.mem = 8; e.react -= dt; e.unseen = 0; }
  else { e.mem -= dt; e.unseen = (e.unseen || 0) + dt; }
  const want = Math.atan2(t.y - e.y, t.x - e.x);
  if (!e.role) { e.tacT=0; e.role = pickRole(e, t); e.morale = e.morale === undefined ? 1 : e.morale; if (e.nade === undefined) e.nade = (e.fac === 'army' ? 0.6 : e.fac === 'bandit' ? 0.35 : 0.2) > Math.random() ? 1 : 0; }
  e.tacT = (e.tacT || 0) - dt;
  // бегство при потере духа
  if (e.morale < 0.35 && e.hp < e.maxhp * 0.5 && !e.guard) {
    if (!e.routT) {
      e.routT=rnd(5,8);e.cover=findCover(e,t,Math.max(30,d-30),d+230);callout(e,'hurt',true);
    }
    e.routT -= dt; e.crouch = 0;
    if(e.cover)goTo(e,e.cover.x,e.cover.y,128,dt);
    else steer(e,e.x-Math.cos(want)*60,e.y-Math.sin(want)*60,128,dt);
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
  // Finish the move into cover, then seek a shooting angle on the last known position.
  if(e.cover && !see && e.role==='hold' && e.mem>0){
    if(dE(e,e.cover)>9){goTo(e,e.cover.x,e.cover.y,105,dt);return;}
    e.inCover=1;e.crouch=1;
    e.coverWait=(e.coverWait||0)+dt;
    if(e.coverWait<.85)return;
    e.coverWait=0;e.cover=null;
  }
  // цель не видна
  if (!see) {
    e.crouch = 0; e.inCover = 0;
    if(e.lastSeen && (!e.guard || e.guard==='south') && e.mem>0){
      e.peekTime=(e.peekTime||0)-dt;
      if(e.peekTime<=0){
        e.peekTime=1.5;e.firingSpot=battlePosition(e,e.lastSeen,28,W.range||300,false);
      }
      const dest=e.firingSpot||e.lastSeen;
      e.cover=null;goTo(e,dest.x,dest.y,90,dt);
    }
    if (e.mem <= 0) { e.tgt = null; e.role = null; }
    return;
  }
  e.ang += angD(e.ang, want) * Math.min(1, dt * 7);
  const pref = W.pref || 20;
  // движение по роли
  if (W.melee) { e.crouch = 0; goTo(e, t.x, t.y, 110, dt); }
  else if (e.guard && e.guard!=='south') { e.crouch = d > 160 ? 1 : 0; }
  else if (e.role === 'hold') {
    if (e.tacT <= 0) { e.tacT = rnd(4, 8); e.cover = findCover(e, t, Math.max(120, pref - 60), pref + 160); }
    if (e.cover && dst(e.x, e.y, e.cover.x, e.cover.y) > 10) { e.crouch = 0; e.inCover = 0; goTo(e, e.cover.x, e.cover.y, 105, dt); }
    else { e.inCover = !!e.cover; e.crouch = e.cover ? (e.cool > W.rate * 1.2 ? 1 : 0) : 0; if (!e.cover && d < pref - 60) goTo(e, e.x - Math.cos(want) * 60, e.y - Math.sin(want) * 60, 70, dt); }
  } else if (e.role === 'flank') {
    if (!e.side) e.side = chance(0.5) ? 1 : -1;
    const fa = want + Math.PI + e.side * 1.25, fx = t.x + Math.cos(fa) * pref, fy = t.y + Math.sin(fa) * pref;
    e.crouch = 0; e.inCover = 0;
    if (!clearFooting(fx,fy,e.r) || goTo(e, fx, fy, 112, dt) < 30 || e.routeRetry>0 || e.stuck > 1) { e.role = 'hold'; e.cover = null; }
  } else {
    e.crouch = 0; e.inCover = 0;
    if (d > pref) goTo(e, t.x, t.y, 92, dt);
    else { e.strT = (e.strT || 0) - dt; if (e.strT <= 0) { e.strT = rnd(0.8, 1.8); e.side = chance(0.5) ? 1 : -1; } goTo(e, e.x + Math.cos(want + e.side * 1.57) * 60, e.y + Math.sin(want + e.side * 1.57) * 60, 64, dt); }
  }
  // гранату в укрывшегося
  if (e.nade && t.crouch && d > 120 && d < 260 && chance(dt * 0.25)) { npcGrenade(e, t.x, t.y); return; }
  // огонь
  if (W.melee) { if (d < e.r + t.r + W.range && e.cool <= 0) { e.cool = W.rate * 1.6; melee(e, W); } return; }
  if (e.react <= 0 && e.cool <= 0 && e.reload <= 0 && d < W.range * 0.92 && Math.abs(angD(e.ang, want)) < 0.25) {
    if (!lineClear(e,t)) {
      if(!e.guard || e.guard==='south'){
        e.peekTime=(e.peekTime||0)-dt;
        if(e.peekTime<=0){e.peekTime=1;e.firingSpot=battlePosition(e,t,28,W.range,false);}
        if(e.firingSpot)goTo(e,e.firingSpot.x,e.firingSpot.y,86,dt);
      }
      return;
    }
    const moving = !e.inCover && e.role !== 'hold';
    const acc = { bandit: 0.12, loner: 0.1, army: 0.07 }[e.fac] - (e.rank || 0) * 0.015 + (night() && d > 200 ? 0.05 : 0) + (moving ? 0.04 : 0) + (t === P && P.crouch ? 0.03 : 0);
    e.crouch = 0;
    if(!fire(e,e.ang,W,W.spread+acc))return;
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
// On a quiet stretch a free stalker can interrupt an errand to dress a companion's wound.
function helpCompanion(e,dt){
  if(e.fac!=='loner'||e.follow||e.guard||e.stay||e.named||e.sos||e.jobTag||e.squadMate)return false;
  const patient=o=>o!==e&&o!==P&&o.alive&&o.fac===e.fac&&!o.wounded&&!o.captive&&!o.tgt&&
    o.hp<o.maxhp*.5&&dE(e,o)<160;
  if(e.aidTarget && (!patient(e.aidTarget)||!(e.inv.medkit||e.inv.bandage)))e.aidTarget=null;
  if(!e.aidTarget){
    e.aidCheck=(e.aidCheck||0)-dt;if(e.aidCheck>0)return false;
    e.aidCheck=2+(e.id%5)*.23;
    if(e.hp<e.maxhp*.5||!(e.inv.medkit||e.inv.bandage))return false;
    let nearest=Infinity;
    for(const o of ents)if(patient(o)&&dE(e,o)<nearest&&seesActor(e,o)&&
      !ents.some(m=>m.alive&&m!==e&&m.aidTarget===o)&&walkAnchor(o.x,o.y)>=0){
      e.aidTarget=o;nearest=dE(e,o);
    }
    if(!e.aidTarget)return false;
    if(e.sit){e.seat=1;e.trip ||= {stage:2};setCampSeat(e,false);}
    e.aidTime=0;
  }
  const o=e.aidTarget;e.aidTime+=dt;
  if(dE(e,o)<34&&clearWalk(e.x,e.y,o.x,o.y,e.r)){
    npcHeal(e,o);e.assisted=o.assisted=true; sayLine(e,'Держись. Сейчас перевяжу.');
    e.aidTarget=null;e.aidCheck=12;
  }else if(e.aidTime>8){e.aidTarget=null;e.aidCheck=10;}
  else goTo(e,o.x,o.y,78,dt);
  return true;
}
function idleHuman(e, dt) {
  if(e.squadMate && chapter()==='battle'){
    const destination=dE(P,northCamp())<340?northCamp():P;
    if(dE(e,destination)>90)goTo(e,destination.x,destination.y,90,dt);
    return;
  }
  if((e.sid==='petr' || e.sid==='petr2') && S.flags.assault && !S.flags.atpClear){
    const goal=locPt('atp',e.sid);if(dE(e,goal)>12)goTo(e,goal.x,goal.y,82,dt);
    return;
  }
  if (followTick(e, dt)) return;
  if(e.sid==='shust' && S.campaign?.liberated){
    const room=loftAt(e);
    if(room){
      if(goTo(e,room.landing.x,room.landing.y,62,dt)<11){
        e.x=room.stair.x;e.y=room.stair.y;e.path=null;e.routeRetry=0;
        e.trip={stage:2,returnTo:{...e.home}};
      }
      return;
    }
  }
  if(e.trip?.returnTo){
    const dest=e.trip.returnTo;
    if(goTo(e,dest.x,dest.y,82,dt)<7){
      e.trip=null;if(e.seat)setCampSeat(e,true);
    }
    return;
  }
  if(e.sid==='wolf'){if(dE(e,e.home)>5)goTo(e,e.home.x,e.home.y,65,dt);return;}
  if(helpCompanion(e,dt))return;
  if(e.guard==='south' && BIG && night()){
    if((e.aw||0)>.05 && storyArea() && seesActor(e,P)){
      const direction=Math.atan2(P.y-e.y,P.x-e.x);
      e.ang+=angD(e.ang,direction)*Math.min(1,dt*3);
      return;
    }
    const west=e.sid==='a4' || e.sid?.startsWith('reliefa4');
    const route=west?[[123,202],[122,210],[126,210]]:[[132,208],[138,208],[132,211]];
    const index=e.postWaypoint||0, [x,y]=route[index], dest=worldPoint(x+.5,y+.5);
    if(dE(e,dest)>12)goTo(e,dest.x,dest.y,42,dt);
    else if((e.idleT-=dt)<=0){e.postWaypoint=(index+1)%route.length;e.idleT=3;}
    return;
  }
  if (e.guard) {
    if (dE(e, e.home) > 8) goTo(e, e.home.x, e.home.y, 70, dt);
    else { e.ang += angD(e.ang, (e.guard === 'south' || (BIG && e.sid==='a1')) ? -Math.PI / 2 : Math.PI / 2) * dt * 2; }
    return;
  }
  if (e.sit) {
    e.ang += angD(e.ang, Math.atan2(e.fireRef.y - e.y, e.fireRef.x - e.x)) * dt * 2;
    if (e.fac === 'loner' && !e.named && !e.stay && !e.squadMate && chance(dt * 0.004)) { setCampSeat(e, false); startTrip(e); }
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
      if (nav[ti] && clearWalk(e.x,e.y,wx,wy,e.r)) e.wander = { x: wx, y: wy };
    } else e.ang += rnd(-1.2, 1.2);
  }
  if (e.fac === 'loner' && !e.stay && !e.named && chance(dt * 0.003)) startTrip(e);
}
function startTrip(e) {
  // In poor weather prefer the local camp, in daylight favour a nearby unoccupied stop.
  const resting=night()||WX.rain>.45||e.hp<e.maxhp*.65;
  const spots=LOCATIONS.filter(l=>!['danger','anomaly'].includes(l.type) &&
    l.id!=='sid' && (l.anchors.fire||l.entrances?.length)).map(l=>{
    const [x,y]=l.anchors.fire||l.entrances[0],angle=e.id*2.4;
    const p=l.anchors.fire?freeTile(x+3*Math.cos(angle),y+3*Math.sin(angle)):freeTile(x,y);
    const dest={x:p.x*T,y:p.y*T},distance=dE(e,dest);
    const busy=ents.filter(m=>m!==e&&m.alive&&m.trip?.stage===0&&dE(m.trip,dest)<60).length;
    const score=distance*(.8+Math.random()*.4)+busy*180+(resting&&!l.anchors.fire?750:0);
    return {dest,score,distance};
  }).filter(s=>s.distance>90&&s.distance<2600).sort((a,b)=>a.score-b.score);
  for(const {dest} of spots){
    if(ents.some(o=>o.alive&&hostile(e,o)&&dE(o,dest)<220)||!findPath(e.x,e.y,dest.x,dest.y,true))continue;
    e.seat=e.seat||(dE(e,FIRE)<110?1:0);
    e.trip={...dest,stage:0};return;
  }
  if(e.seat)setCampSeat(e,true);
}
function aiDog(e, dt) {
  e.cool -= dt; e.think -= dt; e.barkT -= dt;
  const t=mutantTarget(e,dt,night()?320:280,520);
  if (t) {
    if (e.barkT <= 0) { e.barkT = rnd(2, 5); play('dog', e.x, e.y); }
    const want=Math.atan2(e.trail.y-e.y,e.trail.x-e.x);
    e.ang+=angD(e.ang,want)*Math.min(1,dt*9);
    if (e.hp < e.maxhp * 0.35 && !e.fled) { e.fleeT = 2; e.fled = 1; }
    if(e.fleeT>0){e.fleeT-=dt;goTo(e,e.home.x,e.home.y,170,dt);return;}
    if(!canStrike(e,t,e.r+t.r+4))mutantApproach(e,e.trail,172,dt);
    else if (e.cool <= 0) {
      e.cool = rnd(0.7, 1.1);
      hurt(t, rnd(7, 13), e, want);
      e.kx -= Math.cos(want) * 140; e.ky -= Math.sin(want) * 140;
    }
    return;
  }
  roamDen(e,dt,55);
}

/* ===================== задания ===================== */
function qTargets() {
  return campaignTargets();
}
/* отслеживаемая цель: выбранное задание, иначе первое активное (SOS не перехватывает выбор) */
function trackedTarget() {
  const T0 = qTargets();
  const act = qList().filter(q => q.st === 'a');
  if (!act.some(q => q.id === S.trackedQuestId)) S.trackedQuestId = (act.find(q => q.id !== 'sos') || act[0] || {}).id || null;
  return T0.find(t => t.qid === S.trackedQuestId) || null;
}
function qList() {
  return campaignList();
}

/* ===================== жизнь мира ===================== */
function spawnTick() {
  const far = (x, y) => dst(x, y, P.x, P.y) > 520;
  const villageLoners = ents.filter(e => e.alive && e.fac === 'loner' && !e.named && dst(e.home.x, e.home.y, FIRE.x, FIRE.y) < 260).length;
  if (villageLoners < 4 && far(...RMp(21 * T, 82.5 * T))) {
    const seat = YARD_SEATS.map(s=>RMt(s.x,s.y)).find(([x,y])=>
      !ents.some(o=>o.alive && o.home && dst(x*T,y*T,o.home.x,o.home.y)<24));
    if(seat){
      const [x,y]=RMt(21,82.5);
      const e=mkHuman({fac:'loner',x,y,wpn:chance(.7)?'w_pm':'w_obrez'});
      e.home={x:seat[0]*T,y:seat[1]*T};e.seat=1;e.fireRef=FIRE;
      e.trip={...e.home,stage:2};
      ents.push(e);
    }
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
  renewDens();
}

/* S.min advances by one game minute per second of unpaused play.
   Absolute deadlines keep probes and gravity pulses in sync across reloads and rest. */
const ELECTRA_WINDOW = 3, GRAVITY_PERIOD = 8, GRAVITY_CALM = 3.5, GRAVITY_WARNING = 1.25;

function spawnAnomaly(site) {
  const key = site.id || site.k+'_'+Math.round(site.x)+'_'+Math.round(site.y);
  return {...site, key, until:S.flags.anomalyDischarges?.[key] || 0,
    offset:((Math.floor(site.x/T)*17 + Math.floor(site.y/T)*31) % 80)/10,
    hitUntil:new WeakMap(), reveal:0, fx:0, soundAt:0};
}
function gravityClock(a) { return (S.min + a.offset) % GRAVITY_PERIOD; }
function anomalyPhase(a) {
  if (a.k === 'e') {
    const remaining = a.until - S.min;
    return remaining <= 0 ? 'active' : remaining <= 1.25 ? 'warning' : 'quiet';
  }
  const t = gravityClock(a);
  return t < GRAVITY_CALM ? 'quiet' : t < GRAVITY_CALM+GRAVITY_WARNING ? 'warning' : 'active';
}
function anomalyHint() {
  let nearest = null, edge = 135;
  for (const a of anoms) {
    const d = dE(a,P) - a.r;
    if (d < edge) { edge=d; nearest=a; }
  }
  if (!nearest) return '';
  const phase = anomalyPhase(nearest);
  if (nearest.k === 'g') {
    if (nearest.reveal>0) {
      const clock=gravityClock(nearest);
      if (phase==='quiet') return 'Воронка · затишье ещё '+Math.ceil(GRAVITY_CALM-clock)+' с';
      if (phase==='active') return 'Воронка · затишье через '+Math.ceil(GRAVITY_PERIOD-clock)+' с';
    }
    if (phase === 'quiet') return 'Воронка · пыль осела, проходи';
    return phase === 'warning' ? 'Воронка · пыль поднимается!' : 'Воронка · пережди тягу';
  }
  return '';
}

function anomalyBurst(a) {
  a.fx=1;
  play(a.k==='e'?'anomE':'anomG',a.x,a.y);
  if (a.k==='e') flashes.push({x:a.x,y:a.y,a:0,life:.12,big:1,blue:1});
  for(let i=0;i<12;i++){
    const angle=rnd(0,2*Math.PI), speed=rnd(14,50);
    parts.push({x:a.x+Math.cos(angle)*a.r*.7,y:a.y+Math.sin(angle)*a.r*.7,
      vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rnd(.22,.52),
      c:a.k==='e'?'#9dc0c8':'#9a805d',s:1.5});
  }
}
function probeAnomaly(a,b,x,y) {
  a.reveal=10;
  b.x0=x; b.y0=y; b.hit=a; b.t=0; b.dur=.3;
  if (a.k==='e') {
    a.until=S.min+ELECTRA_WINDOW;
    (S.flags.anomalyDischarges ||= {})[a.key]=a.until;
    anomalyBurst(a);
    b.x1=x; b.y1=y;
  } else {
    // The probe traces the pull and marks the perimeter, without resetting the cycle.
    play('bolt',x,y);
    const pull=anomalyPhase(a)==='active' ? .9 : .2;
    b.x1=lerp(x,a.x,pull); b.y1=lerp(y,a.y,pull);
  }
}
function updateBolts(dt) {
  for (let i=bolts.length-1;i>=0;i--) {
    const b=bolts[i], start=Math.min(1,b.t/b.dur);
    b.t+=dt;
    const end=Math.min(1,b.t/b.dur), dx=b.x1-b.x0, dy=b.y1-b.y0;
    const length=Math.hypot(dx,dy), x=b.x0+dx*start,y=b.y0+dy*start;
    if (!b.hit && length>0) {
      let first=null, dist=(end-start)*length;
      for (const a of anoms) {
        if (a.k==='e' && a.until>S.min) continue;
        const hit=rayCircle(x,y,dx/length,dy/length,a.x,a.y,a.r);
        if (hit!==null && hit<=dist) { first=a; dist=hit; }
      }
      if (first) { probeAnomaly(first,b,x+dx/length*dist,y+dy/length*dist); continue; }
    }
    if (end===1) {
      if (!b.hit) play('bolt',b.x1,b.y1);
      bolts.splice(i,1);
    }
  }
}

function updateAnoms(dt) {
  for (const a of anoms) {
    a.reveal=Math.max(0,a.reveal-dt); a.fx=Math.max(0,a.fx-dt*2.8);
    if (a.until && a.until<=S.min) {
      a.until=0;
      delete S.flags.anomalyDischarges[a.key];
    }
    if (anomalyPhase(a)!=='active') continue;
    const electric=a.k==='e';
    if (electric && S.min>=a.soundAt && dE(a,P)<160) {
      play('zap',a.x,a.y,.35); a.soundAt=S.min+2+a.offset*.09;
    }
    for (const e of ents) {
      if (!e.alive || e.captive) continue;
      const d=dE(e,a);
      if (d>=a.r+e.r*.5) continue;
      // Electricity repels at the rim; the vortex pulls towards its damaging core.
      const x=e.x-a.x,y=e.y-a.y, angle=d<1 ? e.ang+Math.PI : Math.atan2(y,x);
      if (electric) { e.kx=Math.cos(angle)*330; e.ky=Math.sin(angle)*330; }
      else {
        e.kx-=x*dt*105; e.ky-=y*dt*105;
        if (d>a.r*.72) continue;
      }
      if ((a.hitUntil.get(e)||0)>S.min) continue;
      a.hitUntil.set(e,S.min+(electric ? 1.15 : GRAVITY_PERIOD-gravityClock(a)));
      if (a.fx<=0) anomalyBurst(a);
      if (!electric) { e.kx=Math.cos(angle)*390; e.ky=Math.sin(angle)*390; }
      const dmg=electric ? (e===P && beltCount('art_bengal') ? 13 : 26) : 30;
      hurt(e,dmg,'anom');
    }
  }
}
function cacheFieldQuiet(o) {
  if (!o.anomalyId) return true;
  const field=anoms.find(a=>a.id===o.anomalyId);
  return !!field && anomalyPhase(field)==='quiet';
}

/* ===================== игрок и мир за кадр ===================== */
const HURTDIR = [];
let hurtFlash = 0, deathT = 0, shakeA = 0, geigerAcc = 0, radRate = 0, ambT = 0;
const IN = { mx: 0, my: 0, fire: false, moveX: 0, moveY: 0, sprint: false, runPointer: null, aimStick: null };
function shake(a) { shakeA = Math.max(shakeA, a); }
const fog = new Uint8Array(MW * MH);
function reveal() {
  if (inBunker(P.x, P.y)) return;
  const cx = Math.floor(P.x / T), cy = Math.floor(P.y / T), r = night() ? 7 : 11;
  let ch = false;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
    if (inb(x, y) && !fog[y * MW + x] && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) { fog[y * MW + x] = 1; ch = true; }
  if (ch) {
    if (!fogDirty) fogRegion = [cx-r,cy-r,cx+r+1,cy+r+1];
    else if (fogRegion) {
      fogRegion[0]=Math.min(fogRegion[0],cx-r); fogRegion[1]=Math.min(fogRegion[1],cy-r);
      fogRegion[2]=Math.max(fogRegion[2],cx+r+1); fogRegion[3]=Math.max(fogRegion[3],cy+r+1);
    }
    fogDirty = true;
  }
}
let fogDirty = true, fogRegion = null;

function startReload() {
  const W = WP[S.weapon];
  if (!W) return;
  if (P.jam && !W.melee) { P.jam = 0; P.reload = 0.8; play('jam'); return; }
  if (W.melee || P.reload > 0) return;
  const m = S.mag[S.weapon] || 0;
  if (m >= W.mag || !cnt(W.ammo)) return;
  P.reload = W.reload; play('reload');
}
function finishReload() {
  const W = WP[S.weapon]; if (!W || W.melee) return;
  const m = S.mag[S.weapon] || 0, n = Math.min(W.mag - m, cnt(W.ammo));
  if(n<=0)return;
  take(W.ammo, n); S.mag[S.weapon] = m + n; hudT=quickHudT=0;
}
let noAmmoT = 0;
function playerFire() {
  const W = WP[S.weapon];
  if (!W || P.cool > 0 || P.reload > 0) return;
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
  if(storyArea())alarmPost();
  if(S.campaign.atpWait && !S.flags.assault && locAt(P.x/T,P.y/T)?.id==='atp')beginAssault();
  S.mag[S.weapon] = m - 1; P.cool = W.rate;
  const moving = Math.abs(IN.moveX) + Math.abs(IN.moveY) > 0.1;
  const spread = W.spread + P.bloom + (moving ? .035 : 0) + (100-cond(S.weapon))*.0008 - (P.crouch ? .015 : 0);
  fire(P, P.ang, W, Math.max(0, spread)*rules().spread);
  P.bloom = Math.min(.14, P.bloom + (W.auto ? .018 : .03));
  P.bloomDelay = .24;
  P.shotFlash = .12;
  if (m===1 && cnt(W.ammo)) {
    const gun=S.weapon, shooter=P;
    setTimeout(()=>{if(P===shooter && P.alive && S.weapon===gun && !S.mag[gun]) startReload();},150);
  }
}
function cycleWeapon(dir) {
  const own = ['knife', ...Object.keys(KIT_LABELS).map(kitItem).filter(Boolean)];
  const i = own.indexOf(S.weapon);
  setWeapon(own[(i + (dir || 1) + own.length) % own.length]);
}
function setWeapon(w) {
  if (w !== 'hands' && w !== 'knife' && !has(w)) return;
  const slot = kitSlot(w);
  if (slot) S.flags.kit[slot] = w;
  if (S.weapon !== w) releaseFireStick();
  S.weapon = w;
  P.detD = Infinity; P.detT = 0;
  P.reload = 0; P.cool = 0.25; P.jam = 0;
}
function useItem(id) {
  const it = ITEMS[id];
  if (id === 'energy' && has(id)) {
    take(id,1); S.flags.energyUntil = S.min + 60; S.flags.poppySleep = 0; play('eat'); return true;
  }
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
  mp.hidden = false; positionMedicinePicker();   // висит, пока не выберешь или не нажмёшь кнопку ещё раз
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
function canVaultObject(o) {
  if(o.k==='fence') return !o.material || ['picket','rail'].includes(o.material);
  return o.k==='crate' || o.k==='sand' || o.k==='blocks' || o.k==='bench';
}
function energyActive() { return S.flags.energyUntil > S.min; }
function exertion(kg) {
  return (1 + .8 * clamp(kg / carryLimit(), 0, 1)) * (energyActive() ? .65 : 1);
}
function startJump() {
  if (P.jumpT > 0 || (P.jumpCD || 0) > 0 || P.sit) return;
  const cost = 15 * exertion(weight());
  if (P.st < cost) { msg('Нет сил прыгать: отдышись.'); return; }
  if (swampAt(P.x, P.y)) { msg('В болоте не прыгнешь.'); return; }
  const ml = Math.hypot(IN.moveX, IN.moveY), a = ml > 0.2 ? Math.atan2(IN.moveY, IN.moveX) : P.ang;
  P.crouch = 0; P.jumpT = JUMP_T; P.jumpCD = 0.85; P.st -= cost; P.jumpA = a; play('step');
}
const JUMP_T = 0.42, JUMP_V = 250;
/* тихое убийство: сзади, пока враг не заметил. Тяжёлая броня защищает от мгновенного поражения */
function canTakeDown(e){
  return S.weapon==='knife' && e.kind==='human' && (hostile(e,P) || e.fac==='army') && !e.captive && e.tgt!==P && (e.aw||0)<1 &&
    dE(e,P)<42 && Math.abs(angD(e.ang,Math.atan2(P.y-e.y,P.x-e.x)))>1.9 && clearNPCShot(P,e);
}
function takedown(e) {
  if (!canTakeDown(e)) return;
  const a = Math.atan2(e.y - P.y, e.x - P.x); P.ang = a; P.cool = 0.7; play('knife', P.x, P.y);
  const heavy = e.sid === 'boss' || e.heavyArmor;
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
  if (!kitItem('grenade')) { msg('Положи гранату в слот снаряжения.'); return; }
  if (P.nadeT > 0) return; P.nadeT = 1;
  if(storyArea())alarmPost();
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
    if (d < 130 && los(n.x, n.y, e.x, e.y) && (n.owner===P || clearNPCShot(n,e))) hurt(e, 100 * (1 - d / 130) + 10, n.owner, Math.atan2(e.y - n.y, e.x - n.x));
  });
  ents.forEach(e => { if (e !== P && e.alive && dE(e, n) < 600 && hostile(e, P)) { e.lastSeen = { x: P.x, y: P.y }; e.mem = 6; } });
}

function resolveActorContacts(dt){
  // толкотня и отдача
  for (let i = 0; i < ents.length; i++) {
    const a = ents[i]; if (!a.alive) continue;
    if (a.sid === 'sid') { a.x = a.home.x; a.y = a.home.y; a.kx = a.ky = 0; }
    if (a.kx || a.ky) { moveE(a, a.kx * dt, a.ky * dt); a.kx *= Math.pow(0.02, dt); a.ky *= Math.pow(0.02, dt); if (Math.abs(a.kx) + Math.abs(a.ky) < 2) a.kx = a.ky = 0; }
    a.flash = Math.max(0, a.flash - dt);
    for (let j = i + 1; j < ents.length; j++) {
      const b = ents[j]; if (!b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const other = a === P ? b : b === P ? a : null;
      const atSeat = other && other.sit && other.fac === 'loner' && other.fireRef === FIRE && dE(other, FIRE) < 130;
      const friendly=other?.kind==='human' && other.fac==='loner' && !hostile(other,P);
      const rr=(a.r+b.r)*(friendly ? .72 : 1);
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d = Math.hypot(dx, dy);
      if (friendly && !other.sit && !other.captive && !other.wounded && d<rr &&
          (IN.moveX || IN.moveY) && !other.tgt) {
        // Give the moving player right of way, including narrow thresholds.
        const sign=IN.moveX*(other.y-P.y)-IN.moveY*(other.x-P.x)>=0?1:-1;
        const step=Math.min(65*dt,rr-d+1);
        const sx=-IN.moveY*sign*step,sy=IN.moveX*sign*step;
        if(clearWalk(other.x,other.y,other.x+sx,other.y+sy,other.r))moveE(other,sx,sy);
        continue;
      }
      if (atSeat && d < rr) {
        // Сидящий остаётся на месте, вокруг него можно пройти.
        const angle = d > 0.01 ? Math.atan2(P.y - other.y, P.x - other.x) : other.ang + Math.PI;
        moveE(P, (rr - d) * Math.cos(angle), (rr - d) * Math.sin(angle));
      } else if (d < rr && d > 0.01) {
        const overlap=rr-d,ux=dx/d,uy=dy/d;
        const share=a.yielding&&!b.yielding?.95:b.yielding&&!a.yielding?.05:.5;
        if (!a.captive && a.sid !== 'sid') moveE(a,-ux*overlap*share,-uy*overlap*share);
        if (!b.captive && b.sid !== 'sid') moveE(b,ux*overlap*(1-share),uy*overlap*(1-share));
      }
    }
  }
}

/* ===================== главный шаг ===================== */
function update(dt) {
  S.min += dt;
  cleanExpiredCrates();
  renewFieldCrates();
  noAmmoT -= dt; warnT -= dt;
  if (fadeT > 0) { fadeT -= dt; if (fadeT <= 0.25 && fadeTo) { P.x = fadeTo.x; P.y = fadeTo.y; P.ang = fadeTo.a; cam.x = P.x; cam.y = P.y; fadeTo = null; save(true); } }
  if (BIG && P.alive && !inBunker(P.x,P.y) && P.y < WORLD_ROWS*T && warnT <= 0 && P.x < PW*T && P.x > (PW-5)*T && Math.abs(P.y/T-BIG_EXITS.east.y)<5) { warnT=6; msg('Дальше Затон. Эта часть Зоны появится в следующей версии.', 'say'); }
  const oldX = P.x, oldY = P.y;
  if (P.alive) updatePlayer(dt);
  else if (deathT > 0) { deathT -= dt; if (deathT <= 0) onDeath(); }
  if(BIG) {
    checkSpherePerimeter();
    if(P.alive && !S.flags.visitedDump && inGarbage(P.x/T,P.y/T)){
      S.flags.visitedDump=1;
      bulletin('Свалка. На западной дороге работает перегрузочное депо.');
    }
  }
  worldFx(dt);
  const tolik=byS('tolik');
  if(tolik?.wounded && dE(P,tolik)<175 && S.min>=(tolik.nextGroan||0)){
    play('groan',tolik.x,tolik.y,.6*(1-dE(P,tolik)/190));tolik.nextGroan=S.min+9+Math.random()*3;
  }
  for (const e of ents) {
    if (!e.alive || e === P) continue;
    if (e.qaHold || blowoutHumanAI(e, dt)) continue;
    if (Math.abs(e.x - P.x) > 1400 && Math.abs(e.y - P.y) > 1400 && !e.trip && !e.tgt && !e.returning) continue;
    if (e.sosPhase && sosFoeAI(e, dt)) continue;
    if (e.kind === 'dog') aiDog(e, dt); else if (e.kind === 'boar') aiBoar(e, dt); else if (e.kind === 'sucker') aiSucker(e, dt); else aiHuman(e, dt);
  }
  resolveActorContacts(dt);
  updateBolts(dt);
  updateAnoms(dt);
  deliverLonerReports();
  checkBridgeCrossing(oldX, oldY);
  g7Tick(dt);
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
    if (p.hearth) p.x += (WX.wind*19 + 4*Math.sin(S.min*.39+p.life)) * dt;
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
  [FIRE, FIRE2].forEach(F => { if (chance(dt * 7)) { const l = rnd(2.2, 3.6); parts.push({ x: F.x + rnd(-3, 3), y: F.y - 6, vx: rnd(-5, 5) + WX.wind * 8, vy: 0, rise: rnd(14, 22), life: l, ml: l, c: '#8a8a84', s: rnd(1.6, 2.6), smoke: 1, hearth: villageAtmosphere && F===FIRE }); } });
  // тела исчезают через двое суток
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (o.k === 'body' && S.min - o.t > 2880 && dst(o.x, o.y, P.x, P.y) > 600) objs.splice(i, 1); }
  // таймеры мира
  spawnT -= dt; if (spawnT <= 0) { spawnT = 20; spawnTick(); }
  fogT -= dt; if (fogT <= 0 && P.alive) { fogT = 0.4; reveal(); }
  saveT -= dt;
  if (saveT <= 0 && P.alive && (dE(P, campOf(P)) < 300 || inBunker(P.x, P.y)) && !ents.some(e => e.alive && e !== P && hostile(e, P) && dE(e, P) < 500)) { saveT = 60; save(true); }
  if(chapter()==='rescue' && S.campaign.atpWait && !S.flags.assault){
    const inside=locAt(P.x/T,P.y/T)?.id==='atp';
    if(inside && ATP_BANDITS.some(id=>byS(id)?.tgt===P))beginAssault();
  }
  if(BIG)updatePostShift();
  if (radioQueue.length && (radioQueue[0].life -= dt) <= 0) radioQueue.shift();
  for (const m of MSGS) m.life -= dt;
  MSGS = MSGS.filter(m => m.life > 0);
  hurtFlash = Math.max(0, hurtFlash - dt * 1.2);
  shakeA = Math.max(0, shakeA - dt * 20);
}
const bearingTo = e => Math.atan2(e.y-P.y,e.x-P.x);
function targetInSight(e,W) {
  return e?.alive && hostile(P,e) && !e.captive && !(e.cloak>.7) &&
    dE(P,e)<=W.range+ballOff(P)+e.r && seesActor(P,e) &&
    !HOUSES.some(h=>h.a>.5 && e.x>h.x*T && e.x<(h.x+h.w)*T && e.y>h.y*T && e.y<(h.y+h.h)*T && !roofHidden(h)) &&
    shotTrace(P,bearingTo(e),W).best===e;
}
function assistedTarget(dir,W,cone) {
  let best=null, score=Infinity;
  for (const e of ents) {
    if (e===P || !e.alive || !hostile(P,e)) continue;
    const error=Math.abs(angD(dir,bearingTo(e)));
    if (error>cone) continue;
    const rank=error + .025*dE(P,e)/W.range;
    if (rank<score && targetInSight(e,W)) {best=e;score=rank;}
  }
  return best;
}
function updatePlayerAim(dt,mx,my) {
  const W=WP[S.weapon], stick=IN.aimStick;
  let tap=IN.tapShot;
  if (tap && (!W || tap.weapon!==S.weapon || (tap.ttl-=dt)<=0 || !targetInSight(tap.enemy,W))) tap=IN.tapShot=null;
  const aiming=!IN.touch || stick?.active || tap;
  P.aimRay=null;
  if (!aiming) {
    P.lock=null;
    if (P.tapFlash && P.shotFlash>0 && W && !W.melee) {
      P.aimRay=shotTrace(P,P.ang,W);
      return;
    }
    P.tapFlash=false;
    if (Math.hypot(mx,my)>.1) P.ang+=angD(P.ang,Math.atan2(my,mx))*Math.min(1,dt*10);
    return;
  }
  const dir=tap ? bearingTo(tap.enemy) : IN.touch ? stick.a : bearingTo(screenToWorld(IN.mx,IN.my));
  let desired=dir;
  const gun=W && !W.melee;
  const assist=firePrefs.strength/100;
  if (tap) P.lock=tap.enemy;
  else if (gun && assist>0) {
    const cone=IN.touch ? .08+.15*assist : .14;
    P.lockT=(P.lockT || 0)-dt;
    if (P.lockT<=0 || Math.abs(angD(P.scanDir ?? dir,dir))>.06) {
      P.lock=assistedTarget(dir,W,cone);
      P.lockT=.1; P.scanDir=dir;
    }
    if (P.lock) {
      const delta=angD(dir,bearingTo(P.lock));
      if (Math.abs(delta)>cone || !targetInSight(P.lock,W)) P.lock=null;
      else desired+=delta*assist;
    }
  } else P.lock=null;
  const delta=angD(P.ang,desired);
  P.ang+=IN.touch ? clamp(delta,-9*dt,9*dt) : delta;
  const aligned=Math.abs(angD(P.ang,desired))<.025;
  if (aligned) P.ang=desired;
  if (gun && IN.touch) {
    P.aimRay=shotTrace(P,P.ang,W);
    if (!P.lock && P.aimRay.best && hostile(P,P.aimRay.best) && targetInSight(P.aimRay.best,W)) P.lock=P.aimRay.best;
  }
  if (aligned && (tap || IN.btnFire || IN.fire)) {
    if (tap && P.cool>0) return;
    if (tap) IN.tapShot=null;
    playerFire();
    P.tapFlash=!!tap && P.shotFlash>0;
  }
}
function updatePlayer(dt) {
  P.cool -= dt; P.medT -= dt; P.boltT = (P.boltT || 0) - dt; P.nadeT = (P.nadeT || 0) - dt;
  P.bloomDelay = Math.max(0,(P.bloomDelay || 0)-dt);
  if (!P.bloomDelay) P.bloom = Math.max(0,P.bloom-dt*.17);
  P.shotFlash = Math.max(0,(P.shotFlash || 0)-dt);
  survival(dt); plusTick(dt);
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) finishReload(); }
  // движение
  let mx = IN.moveX, my = IN.moveY;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const kg = weight(), over = kg > carryLimit();
  const sprint = (IN.sprint || IN.runPointer !== null) && P.st > 5 && !over && ml > 0.1;
  if (sprint) P.crouch = 0; P.sprinting = sprint;
  let sp = (sprint ? 190 : P.crouch ? 62 : 118) * (over ? 0.55 : 1) * (swampAt(P.x, P.y) ? 0.55 : 1);
  if (sprint) P.st = Math.max(0, P.st - 22 * exertion(kg) * (1 + Math.min(5, S.weapon==='knife' ? 0.3 : (ITEMS[S.weapon]?.w || 0)) * .085) * dt); else P.st = Math.min(100, P.st + 14 * (energyActive() ? 1.5 : 1) * dt);
  if (BIG) {
    const inField=P.x<WEST*T && poppyBed(P.x/T,P.y/T-LESSER_TOP)<1 &&
      ![FL,CF,SW].includes(tAt(Math.floor(P.x/T),Math.floor(P.y/T)));
    const exposure=S.flags.poppySleep || 0;
    if (inField && !energyActive()) {
      S.flags.poppySleep=Math.min(42,exposure+dt*(1+.35*exposure/42));
      P.st=Math.max(0,P.st-18*dt);
      sp*=1-.37*S.flags.poppySleep/42;
      if(S.flags.poppySleep>=42) {kill(P,'poppies');return;}
    } else if (exposure) S.flags.poppySleep=Math.max(0,exposure-5*dt);
  }
  P.jumpCD = (P.jumpCD || 0) - dt;
  if (P.jumpT > 0) { P.jumpT -= dt; const ox = P.x, oy = P.y; moveE(P, Math.cos(P.jumpA) * JUMP_V * dt, Math.sin(P.jumpA) * JUMP_V * dt); P.step += dst(ox, oy, P.x, P.y); if (P.jumpT <= 0) { P.jumpT = 0; collide(P); play('step'); } }
  else if (ml > 0.08) { const ox = P.x, oy = P.y; moveE(P, mx * sp * dt, my * sp * dt); P.step += dst(ox, oy, P.x, P.y); }
  P.combatT = Math.max(0,(P.combatT || 0)-dt);
  P.hitT = Math.max(0,(P.hitT || 0)-dt);
  for (let i=HURTDIR.length-1;i>=0;i--) {
    HURTDIR[i].life-=dt;
    if (HURTDIR[i].life<=0) HURTDIR.splice(i,1);
  }
  updatePlayerAim(dt, mx, my);
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

/* ===================== взаимодействие ===================== */
const G = { near: null };
function findInteract() {
  let best = null, bd = 1e9;
  const cand = (d, o) => { if (d < bd) { bd = d; best = o; } };
  for (const e of ents) {
    if (e.alive && hostile(e,P) && canTakeDown(e)) { cand(dE(e, P) - 200, { k: 'kill', e: e, label: 'Убить ножом: ' + e.name }); continue; }   // сзади и незаметно
    if (!e.alive || e === P) continue;
    const d = dE(e, P);
    if (d > 60) continue;
    if (e.storyMan && !hostile(e, P)) { cand(d,{k:'talk',e,label:'Поговорить: '+e.name}); continue; }
    if (e.wounded) cand(d, { k: 'heal', e: e, label: 'Помочь раненому: ' + e.name });
    else if (e.captive) cand(d, { k: 'free', e: e, label: 'Освободить: ' + e.name });
    else if (e.kind === 'human' && !hostile(e, P) && !e.tgt && e.fac !== 'trader') cand(d, { k: 'talk', e: e, label: 'Поговорить: ' + e.name });
  }
  for(const room of lofts) {
    const upstairs=loftAt(P)===room, p=upstairs?room.landing:room.stair;
    const dist=dE(P,p);
    const a=stairAngle(room,upstairs);
    const u=(P.x-p.x)*Math.cos(a)+(P.y-p.y)*Math.sin(a);
    if(dist<41 && u<17 && los(P.x,P.y,p.x,p.y)) cand(dist-4,{k:'floor',room,upstairs,label:upstairs?'Спуститься на первый этаж':'Подняться · '+room.name});
  }
  const sd = byS('sid');
  if (sd && inBunker(P.x, P.y) && dE(sd, P) < 120) cand(dE(sd, P) - 30, { k: 'trader', label: 'Поговорить: Сидорович' });
  const dh = dst(P.x, P.y, HATCH.x, HATCH.y);
  const atEntrance = SID_SHOP ? Math.abs(P.x-HATCH.x)<25 && P.y>=HATCH.y-62 && P.y<HATCH.y+45 : dh<54;
  if (atEntrance) cand(dh, { k: 'down', label: 'Спуститься в бункер' });
  const ds = dst(P.x, P.y, STAIRS.x, STAIRS.y);
  if (ds < (SID_SHOP ? 32 : 56)) cand(ds, { k: 'up', label: 'Подняться наверх' });
  for (const o of objs) {
    if (o.k === 'locker') {
      const x=o.x+o.w/2,y=o.y+o.h/2,d=dst(P.x,P.y,x,y);
      if (d<49 && los(P.x,P.y,x,y)) cand(d,{k:'locker',o,label:'Открыть личный ящик'});
    }
    if ((o.k==='crate' && o.broken && !o.looted) || o.kind==='sack') {
      nearbyGroundItems(o,cand); continue;
    }
    if (o.k === 'body' && MUTANT_TROPHIES[o.kind]) {
      const trophy=MUTANT_TROPHIES[o.kind], d=dE(P,o);
      if (o.loot[trophy] && d<42 && clearNPCShot(P,o))
        cand(d,{k:'carve',o,label:S.weapon==='knife'?'Срезать трофей · '+ITEMS[trophy].n:'Для разделки нужен нож'});
      continue;
    }
    if (o.k === 'body' && Object.keys(o.loot).length) { const d = dst(P.x, P.y, o.x, o.y); if (d < 42) cand(d, { k: 'loot', o: o, label: 'Обыскать: ' + o.name }); }
    if(o.stash && !o.looted && o.k!=='crate'){
      const x=o.x+o.w/2,y=o.y+o.h/2,d=dst(P.x,P.y,x,y);
      if(d<46 && los(P.x,P.y,x,y)){
        if (o.anomalyId) {
          const quiet=cacheFieldQuiet(o);
          cand(d,{k:'loot',o,label:quiet?'Обыскать схрон путейца':'Схрон путейца · дождись затишья'});
        } else cand(d,{k:'loot',o,label:o.k==='safe'?'Обыскать сейф':'Обыскать тайник'});
      }
    }
  }
  if (activeDetectorRange()) for (const a of arts) { const d = dE(P, a); if (d < 38) cand(d - 10, { k: 'art', a: a, label: 'Подобрать: ' + ITEMS[a.id].n }); }
  const cn = cacheNear(); if (cn) cand(dst(P.x, P.y, cn.x, cn.y), { k: 'loot', o: cn, label: 'Открыть тайник' });
  plusInteract(cand);
  return best;
}
function carveMutant(o) {
  const id = MUTANT_TROPHIES[o.kind];
  if (!id || !o.loot[id] || !objs.includes(o) || dE(P,o)>=42 || !clearNPCShot(P,o)) return;
  if (S.weapon !== 'knife') { msg('Возьми нож в руки.', 'say'); return; }
  const error = receiveError(id,1);
  if (error) { msg(error,'bad'); return; }
  collectStock(o,id,1);
  play('knife',P.x,P.y);
  msg('Получен трофей · '+ITEMS[id].n,'say');
}
function lootAll(o) {
  let pickedUp = false;
  for (const id of Object.keys(o.loot)) {
    if (id !== '__tip' && collectStock(o,id)) pickedUp = true;
  }
  if (Object.keys(o.loot).some(id=>ITEMS[id])) msg('Рюкзак заполнен. Остаток можно забрать позже.', 'bad');
  recordContents(o);
  if (pickedUp) play('pick');
}
function takeArt(a) {
  if (!activeDetectorRange() || !arts.includes(a) || dE(P, a) >= 38) return;
  const err=receiveError(a.id,1); if(err) { msg(err,'bad'); return; }
  addPacked(a.id, 1); S.stats.art++; S.flags['art_' + a.key] = 1;
  arts.splice(arts.indexOf(a), 1);
  play('pick');
  news('Найден ' + ITEMS[a.id].n + '.');
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
    S.flags.tolikBlood={x:e.x,y:e.y,t:S.min};S.flags.tolikUp = 1; S.rep += 10; S.money += 300; give('antirad', 1);
    e.home = (h => ({ x: h[0], y: h[1] }))(RMp(35 * T, 81 * T)); e.trip = { x: e.home.x, y: e.home.y, stage: 2 };
    news('Толик получил помощь и вернулся в деревню.');
  }
  return true;
}

/* ===================== сохранение ===================== */
const KEY = /qa/.test(location.hash) ? 'zona2d-kordon-qa' : 'zona2d-kordon-v2';   // QA-прогоны не трогают сохранение игрока
const SAVE_VERSION = 3;
function save(quiet,slot=0) {
  if (!P || !P.alive) return false;
  S.x = P.x; S.y = P.y; S.hp = P.hp;
  let f = ''; for (let i = 0; i < fog.length; i += 6) { let v = 0; for (let b = 0; b < 6; b++) v |= (fog[i + b] ? 1 : 0) << b; f += String.fromCharCode(48 + v); }
  S.fog = f;
  dynSnapshot();
  try { localStorage.setItem(slotKey(slot), JSON.stringify(S)); } catch (e) { if (!quiet) msg('Сохранить не вышло: браузер не даёт места.'); return false; }
  return true;
}
function loadSave(slot=0) {
  try { const raw = localStorage.getItem(slotKey(slot)); if (!raw) return null; const d = JSON.parse(raw); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
function applyState(d) {
  S = d; S.difficulty=difficultyKey(d.difficulty); prepareCampaign(); lastShiftState=null;
  if (BIG && (S.mapVersion==='kordon-big' || S.mapVersion==='kordon-west')) migrateNorthernWorld(S);
  restoreKit();
  fog.fill(0);
  if (S.fog) for (let i = 0; i < S.fog.length; i++) { const v = S.fog.charCodeAt(i) - 48; for (let b = 0; b < 6; b++) if (i * 6 + b < fog.length) fog[i * 6 + b] = (v >> b) & 1; }
  fogDirty = true; fogRegion = null;
  spawnWorld();
  if(BIG && storyArea() && !nav[Math.floor(P.y/T)*MW+Math.floor(P.x/T)]){
    const p=walkPoint(P);P.x=S.x=p.x;P.y=S.y=p.y;
  }
  if(BIG)updatePostShift();
  survDefaults(); ensureCaches(); dynRestore();
  if(BIG && !S.campaign.northSiteUpdated){
    if(chapter()==='battle'){
      const site=northCamp();
      ents.filter(e=>e.assailant).forEach((e,i)=>{
        const p=walkPoint(site,(i%3-1)*2,-Math.floor(i/3)*2);
        e.x=p.x;e.y=p.y;e.home=p;e.path=e.tgt=null;
      });
    }
    S.campaign.northSiteUpdated=true;
  }
  if(S.campaign.liberated)occupyATP();
  villageAftermath();
  if(BIG){
    // Saves on the former south threshold should load on their own side of the new wall.
    const bar=HOUSES.find(h=>h.ok==='78,118');
    if(bar){
      const x=(bar.x+Math.floor(bar.w/2))*T,y=(bar.y+bar.h-1)*T;
      if(P.x>=x-P.r && P.x<=x+T+P.r && P.y>y-P.r && P.y<y+T+P.r)
        P.y=S.y=P.y<y+T/2?y-P.r-1:y+T+P.r+1;
    }
    // A trader snapshot from the old bar also stores its old home and seat.
    for(const sid of ['lz_barman','lz_guest','lz_guest2','a1','a2','shust','wolf']){
      const e=byS(sid), d=NPCDEF.find(n=>n.sid===sid);
      if(!e?.alive || !d || e.evacuating || e.follow || e.wounded || (sid==='shust' && S.flags.shustFree))continue;
      if(e.home && (e.home.x!==d.x*T || e.home.y!==d.y*T)){
        e.home={x:d.x*T,y:d.y*T};e.x=e.home.x;e.y=e.home.y;e.path=null;
      }
    }
  }
  loadFieldCrates(); restoreCrateCleanup(); renewFieldCrates();
  for (const e of ents) if (e !== P && e.home && e.sid !== 'sid') clearPropSpawn(e);
  // Older northern-map saves could stand inside the now closed western cutting.
  if(BIG && cuttingDepth(Math.floor(P.x/T),Math.floor(P.y/T))>=0){
    const verge=freeTile(122,61);
    P.x=S.x=verge.x*T;P.y=S.y=verge.y*T;
  }
  if(BIG && P.x<WEST*T && tAt(Math.floor(P.x/T),Math.floor(P.y/T))===RA){
    const verge=freeTile(P.x/T,P.y/T);
    P.x=S.x=verge.x*T;P.y=S.y=verge.y*T;
  }
  if(inGarbage(P.x/T,P.y/T) && !nav[Math.floor(P.y/T)*MW+Math.floor(P.x/T)]){
    const probe={x:P.x,y:P.y,r:P.r}; collide(probe);
    if(Math.hypot(probe.x-P.x,probe.y-P.y)>.1){
      const free=freeTile(P.x/T,P.y/T); P.x=S.x=free.x*T; P.y=S.y=free.y*T;
    }
  }
  // A saved position can be under an enlarged landmark after the world update.
  if (BIG && objs.some(o=>(o.k==='installation'||o.k==='bargeHull') &&
      P.x+P.r>o.x && P.x-P.r<o.x+o.w && P.y+P.r>o.y && P.y-P.r<o.y+o.h)) {
    collide(P); S.x=P.x; S.y=P.y;
  }
  if(BIG && objs.some(o=>o.solid && (o.home || ['stairRun','partition'].includes(o.k)) &&
      P.x+P.r>o.x && P.x-P.r<o.x+o.w && P.y+P.r>o.y && P.y-P.r<o.y+o.h)){
    const bounds=loftAt(P) || HOUSES.find(h=>P.x>=h.x*T && P.x<(h.x+h.w)*T && P.y>=h.y*T && P.y<(h.y+h.h)*T);
    if(bounds){
      let best=Infinity,position=null;
      for(let ty=bounds.y+1;ty<bounds.y+bounds.h-1;ty++)for(let tx=bounds.x+1;tx<bounds.x+bounds.w-1;tx++){
        if(!nav[ty*MW+tx])continue;
        const x=(tx+.5)*T,y=(ty+.5)*T,d=dst(P.x,P.y,x,y),probe={x,y,r:P.r};
        if(d>=best)continue;
        collide(probe);if(dst(x,y,probe.x,probe.y)>.1)continue;
        best=d;position={x,y};
      }
      if(position){P.x=S.x=position.x;P.y=S.y=position.y;}
    }
  }
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
  const left = x - w / 2, top = y - h / 2, radius = 30;
  const nearPlayer = P && Math.abs(x-P.x)<=w/2+radius && Math.abs(y-P.y)<=h/2+radius;
  const e=canopyCompanion, nearNpc=e && Math.abs(x-e.x)<=w/2+radius && Math.abs(y-e.y)<=h/2+radius;
  if (!nearPlayer && !nearNpc) {
    ctx.drawImage(sprite, left, top, w, h); return;
  }
  if (nearCrown.width !== sprite.width) nearCrown.width = nearCrown.height = sprite.width;
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
  const fire=WORLD_FIRES.find(f=>Math.abs(e.x-f.x)<FIRE_REACH && Math.abs(e.y-f.y)<FIRE_REACH);
  if(!fire){drawHuman(e,ctx);return;}
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
  if (ray) {
    const muzzle=muzzlePoint(P,P.ang);
    const along=(muzzle.x-P.x)*ray.ca+(muzzle.y-P.y)*ray.sa;
    if (along<ray.t) {
      const dx=P.x+ray.ca*ray.t-muzzle.x, dy=P.y+ray.sa*ray.t-muzzle.y;
      const length=Math.hypot(dx,dy);
      if (length>0) {
        const visible=rayWall(muzzle.x,muzzle.y,dx/length,dy/length,length);
        ctx.strokeStyle=P.shotFlash>0 ? '#ff6651' : 'rgba(244,240,224,.84)';
        ctx.lineWidth=1.35/Z;ctx.beginPath();ctx.moveTo(muzzle.x,muzzle.y);
        ctx.lineTo(muzzle.x+dx*visible/length,muzzle.y+dy*visible/length);ctx.stroke();
      }
    }
  }
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
    else if (e===P && S.weapon==='hands') { /* bare hands below */ }
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
  const t=S.min;
  for (const a of anoms) {
    if (Math.abs(a.x-cam.x)>VW/(2*Z)+2*a.r || Math.abs(a.y-cam.y)>VH/(2*Z)+2*a.r) continue;
    const phase=anomalyPhase(a), electric=a.k==='e';
    const vis=Math.max(a.reveal>0 ? .92 : 0, clamp(1-(dE(a,P)-a.r)/225,0,.85),a.fx);
    if (!vis) continue;
    ctx.save(); ctx.translate(a.x,a.y); ctx.globalAlpha*=vis;
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
const reducedCameraMotion = matchMedia('(prefers-reduced-motion: reduce)');
function render() {
  let sx = (Math.random() - 0.5) * shakeA, sy = (Math.random() - 0.5) * shakeA;
  if (S && P && S.blow?.stage === 2 && !sheltered(P.x, P.y) && !reducedCameraMotion.matches) {
    const t = S.blow.t;
    sx += 1.1 * Math.sin(t * 23) + .45 * Math.sin(t * 41);
    sy += .85 * Math.sin(t * 29);
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
  }
  else if(loft){ctx.save();ctx.beginPath();ctx.rect(loft.x*T,loft.y*T,loft.w*T,loft.h*T);ctx.clip();drawLoft(loft);}
  else drawGround(vx, vy, vw, vh);
  const inView = (x, y, m) => x > vx - m && x < vx + vw + m && y > vy - m && y < vy + vh + m;
  if (perspective && ART && !shopVisible && !loft) drawWorldRelief(inView);
  if(villageAtmosphere && ART && WX.rain>.02 && !shopVisible && !loft && inView(HATCH.x,HATCH.y,190))
    paintHatchRuts(ctx,true);
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
  for (const F of WORLD_FIRES) if (inView(F.x, F.y, FIRE_REACH)) { fireGroundLight(F); drawFlames(F); }
  for (const o of objs) {
    if (BIG && o.x>=PW*T && loftAt(o)!==loft) continue;
    if ((o.k==='locker'||o.k==='safe'||o.k==='hiding'||o.broken) && inView(o.x,o.y,40)) {
      if(perspective && !o.broken && (o.k==='locker'||o.k==='safe')) liftContainer(o,containerDraw);
      else containerDraw(o);
    }
    else if (o.k === 'crate' && !(shopVisible && o.shopStack) && inView(o.x, o.y, 40)) {
      if(perspective) liftContainer(o,crateDraw); else crateDraw(o);
    }
    if (o.pick && inView(o.x, o.y, 30)) drawPick(o);
    if (o.k === 'genset' && G3.on && G3.pack && G3.pack.manifest.props && inView(o.x, o.y, 40) && !g7Prop(o)) gensetProc(ctx, o);
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
  for (const e of vis) {
    if (shopVisible && e.sid === 'sid' && deskPoses.complete && deskPoses.naturalWidth) drawDeskTrader(e);
    else if (e.kind === 'dog') drawDog(e); else if (e.kind === 'boar') drawBoar(e); else if (e.kind === 'sucker') drawSucker(e); else if((e.sid==='shust' && e.captive && loft) || (e.sid==='tolik' && e.wounded)) drawRestingCaptive(e);
    else drawLitHuman(e);
    if(e.sit && e.sid?.startsWith('lz_guest')) drawDrinkingCup(e);
    if (e !== P && e.hp < e.maxhp && hostile(e, P) && dE(e, P) < 450 && !HOUSES.some(h => h.a > 0.5 && e.x > h.x * T && e.x < (h.x + h.w) * T && e.y > h.y * T && e.y < (h.y + h.h) * T)) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 12, e.y - 20, 24, 3);
      ctx.fillStyle = '#d64541'; ctx.fillRect(e.x - 12, e.y - 20, 24 * e.hp / e.maxhp, 3);
    }
  }
  if(BIG && P) drawNearPoppies(ctx,P);
  for (const t of tracers) { ctx.strokeStyle = 'rgba(255,230,160,' + (t.life / 0.07) * 0.8 + ')'; ctx.lineWidth = t.w; ctx.beginPath(); ctx.moveTo(t.x0, t.y0); ctx.lineTo(t.x1, t.y1); ctx.stroke(); }
  ctx.lineWidth = 1;
  for (const f of flashes) {
    if (f.big) continue;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
    ctx.fillStyle = 'rgba(255,220,120,0.95)'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(12, 0); ctx.lineTo(0, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,0.9)'; ctx.beginPath(); ctx.arc(1, 0, 3, 0, 6.28); ctx.fill(); ctx.restore();
  }
  for (const p of parts) { if (!inView(p.x, p.y, 20)) continue; const k = p.ml ? p.life / p.ml : 0; ctx.globalAlpha = p.ml ? clamp(Math.min(k * 1.4, (1 - k) * 6), 0, 1) * 0.26 : clamp(p.life * (p.smoke ? 0.5 : 3), 0, 1); ctx.fillStyle = p.c; if (p.hearth) { drawHearthSmoke(p, 1-k); } else if (p.smoke) { ctx.beginPath(); ctx.arc(p.x, p.y, p.ml ? p.s * (1 + (1 - k) * 2.2) : p.s * (2 - p.life * 0.3), 0, 6.28); ctx.fill(); } else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
  // крыши: скрывают дом, пока ты не внутри
  HOUSES.forEach((h, i) => {
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
    if (perspective && ART) drawRaisedHouse(h, i);
    else drawHouseRoof(ctx, h, i, 1);
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
  // Open the leaves over the person within speaking or helping distance.
  const near=G.near;
  canopyCompanion=near?.e?.alive && ['talk','heal','free'].includes(near.k) && dE(near.e,P)<=60 &&
    los(P.x,P.y,near.e.x,near.e.y) ? near.e : null;
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
      if (perspective) drawLayeredCrown(crown, cx + sw, cy, width, height,
        crown === yardTreeCrown ? 'yard' : edge ? edgeCrowns[ci-forestCrowns.length] : forestCrowns[ci]);
      else drawAutumnCrown(crown, cx + sw, cy, width, height);
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
  if (P?.alive) drawPlayerAim();
  // свет, цвет, ночь
  if (shopVisible || loft) ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  if (GRADE.mul) { ctx.fillStyle = GRADE.mul; ctx.fillRect(0, 0, VW, VH); }
  ctx.globalCompositeOperation = 'source-over';
  const bunk = P && (loftAt(P) || inBunker(P.x, P.y));
  const dk = loft ? .18+.15*darkness() : bunk ? (shopVisible ? 0.41 : 0.62) : darkness();
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
    for(const f of WORLD_FIRES) if(f!==FIRE) hole(f.x,f.y,170+Math.sin(S.min*8)*8,.9);
    if (shopVisible) {
      hole(STAIRS.x+2.15*T, 6.13*T, 74, .9);
    } else if (bunk) { hole(RMp(126.5 * T, 7 * T)[0], RMp(126.5 * T, 7 * T)[1], 260 + Math.sin(S.min * 30) * 3, 0.9); hole(RMp(124.5 * T, 3.5 * T)[0], RMp(124.5 * T, 3.5 * T)[1], 120, 0.7); }
    for (const f of flashes) hole(f.x, f.y, f.big ? 260 : 130, 0.9);
    for (const a of anoms) if (a.k === 'e' && (anomalyPhase(a)==='active' || a.fx>.3)) hole(a.x, a.y, 70 + a.fx * 120, 0.5);
    const range = activeDetectorRange();
    if (range) for (const a of arts) if (dE(a, P) <= range) hole(a.x, a.y, 40, 0.6);
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
  if (villageAtmosphere && !bunk) {
    const dawn=clamp(1-Math.abs((S.min%1440)-420)/110,0,1);
    const local=clamp((1080-Math.hypot(cam.x-(FIRE.x+HATCH.x)/2,cam.y-(FIRE.y+HATCH.y)/2))/400,0,1);
    if (dawn*local>.001) {
      ctx.save();ctx.globalAlpha=.16*dawn*local;ctx.fillStyle='#526471';
      ctx.fillRect(0,0,VW,VH);ctx.restore();
    }
  }
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
const sheltered = (x, y) => !!loftAt({x,y}) || inBunker(x, y) || HOUSES.some(h => !h.ruin && x > (h.x + 0.6) * T && x < (h.x + h.w - 0.6) * T && y > (h.y + 0.6) * T && y < (h.y + h.h - 0.6) * T);
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
  if (!AC || loftAt(P) || inBunker(P.x, P.y) || WX.rain > 0.5 || S.blow?.stage) return;
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
  rainG.gain.value = (loftAt(P) || inBunker(P.x, P.y)) ? 0 : WX.rain * 0.16 * under;
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
    const stride = e.kind === 'dog' ? 26 : e === P && P.sprinting ? 44 : 36;
    if (e.step - (e.ls || 0) > stride) {
      e.ls = e.step;
      if (e === P) { if (!P.crouch) play(surf(e.x, e.y), undefined, undefined, P.sprinting ? 1.3 : 1); }
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
const BLOW_WARNING = 'Приближается выброс! Укройтесь в бункере или в доме с целой крышей. Ближайшее укрытие отмечено на карте.';
// One flood from all usable doorways gives each reachable tile its closest shelter.
function shelterRoutes(includeHatch) {
  return { includeHatch, revision: -1, owner: new Int16Array(MW * MH), doors: [] };
}
const playerShelters = shelterRoutes(true), lonerShelters = shelterRoutes(false);
function rebuildShelterRoutes(routes) {
  const { owner: shelterOwner, doors: shelterDoors } = routes;
  shelterOwner.fill(-1);
  shelterDoors.length = 0;
  let head = 0, tail = 0;
  function seed(x, y, house) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), i = cy * MW + cx;
    if (!inb(cx, cy) || !nav[i] || shelterOwner[i] >= 0) return;
    shelterOwner[i] = shelterDoors.length;
    shelterDoors.push({ x, y, house });
    bfsQ[tail++] = i;
  }
  for (const h of HOUSES) {
    if (h.ruin) continue;
    for (const d of h.entrances) {
      const lanes = Math.round(d.width / T);
      for (let lane = 0; lane < lanes; lane++) {
        const offset = (lane - (lanes - 1) / 2) * T;
        seed(h.x*T + d.x - 1.5*T*d.nx + offset*d.ny,
             h.y*T + d.y - 1.5*T*d.ny + offset*d.nx,h);
      }
    }
  }
  if (routes.includeHatch) seed(HATCH.x, HATCH.y + (SID_SHOP ? 27 : -30));
  while (head < tail) {
    const i = bfsQ[head++], x = i % MW, y = Math.floor(i / MW);
    for (let k = 0; k < DIRS.length; k++) {
      const j = navNeighbor(x, y, k);
      if (j < 0 || shelterOwner[j] >= 0) continue;
      shelterOwner[j] = shelterOwner[i];
      bfsQ[tail++] = j;
    }
  }
  routes.revision = navRevision;
}
function routeToShelter(actor, routes) {
  if (routes.revision !== navRevision) rebuildShelterRoutes(routes);
  const cell = walkAnchor(actor.x,actor.y);
  return routes.doors[routes.owner[cell]] || null;
}
function blowShelterTarget() {
  if (!P || !P.alive || !S.blow?.stage || sheltered(P.x, P.y)) return null;
  return routeToShelter(P, playerShelters);
}
// Pick a reachable place behind the doorway. A narrow shop may only have its landing.
function roomShelterPlace(e,door){
  const h=door.house,start=Math.floor(door.y/T)*MW+Math.floor(door.x/T);
  const queue=[start],seen=new Set(queue);
  const neighbours=ents.filter(o=>o!==e&&o.alive&&o.kind==='human'&&
    (o.shelterSpot || sheltered(o.x,o.y))).map(o=>o.shelterSpot||o);
  let best=null,score=Infinity;
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%MW,y=Math.floor(n/MW),p={x:(x+.5)*T,y:(y+.5)*T};
    const nearDoor=h.entrances.some(d=>dst(p.x,p.y,h.x*T+d.x,h.y*T+d.y)<2*T);
    const cost=dE(p,door)+(nearDoor?140:0)+neighbours.reduce((v,o)=>v+Math.max(0,50-dE(o,p))*9,0);
    if(cost<score && neighbours.every(o=>dE(o,p)>2*e.r+3)){best=p;score=cost;}
    for(let k=0;k<4;k++){
      const m=navNeighbor(x,y,k),nx=m%MW,ny=Math.floor(m/MW);
      if(m>=0&&!seen.has(m)&&nx>h.x&&nx<h.x+h.w-1&&ny>h.y&&ny<h.y+h.h-1){
        seen.add(m);queue.push(m);
      }
    }
  }
  return best && {...best,house:h.ok};
}
function shelterPlace(e,avoid){
  const nearest=routeToShelter(e,lonerShelters);
  if(nearest && nearest.house.ok!==avoid){
    const spot=roomShelterPlace(e,nearest);if(spot)return spot;
  }
  const doors=lonerShelters.doors.slice().sort((a,b)=>dE(e,a)-dE(e,b));
  for(const d of doors){
    if(d===nearest || d.house.ok===avoid)continue;
    const spot=roomShelterPlace(e,d);
    if(spot && findPath(e.x,e.y,spot.x,spot.y,true))return spot;
  }
  return nearest && {x:nearest.x,y:nearest.y,house:nearest.house.ok};
}
function blowoutHumanAI(e, dt) {
  if(e.kind!=='human'||e.sid==='sid'||e.wounded||e.captive)return false;
  if(!S.blow?.stage){
    if(e.evacuating){
      e.evacuating=false;e.shelterSpot=null;e.path=null;e.routeRetry=0;
      if(e.trip?.shelter)e.trip=null;
      if(e.trip?.stage===1)e.trip.stage=0;
      // Followers retain their current orders; travellers retain their destination and stage.
      if(!e.follow && !e.trip && e.shelterOrigin && dE(e,e.shelterOrigin)>5)
        e.trip={stage:2,returnTo:e.shelterOrigin};
      else if(e.seat&&!e.sit&&!e.follow&&!e.trip)e.trip={stage:2};
      e.shelterOrigin=null;
    }
    return false;
  }
  if(!e.evacuating){
    e.evacuating=true;e.shelterOrigin={x:e.x,y:e.y};
    e.shelterProbe=null;e.shelterRevision=-1;
    e.path=e.cover=e.role=e.aidTarget=null;e.inCover=0;e.routeRetry=0;
    if(e.trip?.shelter)e.trip=null;
    if(e.sit)e.seat=1;
  }
  e.tgt=e.lastSeen=null;e.mem=e.aw=0;
  if(sheltered(e.x,e.y)){
    const spot=e.shelterSpot,h=spot && HOUSES.find(h=>h.ok===spot.house);
    if(h && e.x>(h.x+.6)*T && e.x<(h.x+h.w-.6)*T && e.y>(h.y+.6)*T && e.y<(h.y+h.h-.6)*T &&
        dE(e,spot)>7 && clearWalk(e.x,e.y,spot.x,spot.y,e.r)){
      goTo(e,spot.x,spot.y,76,dt);return true;
    }
    e.path=null;e.yielding=false;
    return true;
  }
  const probe=e.shelterProbe;
  if(probe)probe.time-=dt;
  const stalled=probe && probe.time<=0 && dE(e,probe)<12 && !sheltered(e.x,e.y);
  if(e.shelterRevision!==navRevision || stalled){
    if(!clearFooting(e.x,e.y,e.r))moveE(e,0,0);
    e.shelterSpot=shelterPlace(e,stalled?e.shelterSpot?.house:null);
    e.shelterRevision=navRevision;e.path=null;
  }
  if(!probe||probe.time<=0)e.shelterProbe={x:e.x,y:e.y,time:2.5};
  e.sit=e.crouch=0;e.campRise=null;
  if(e.shelterSpot && dE(e,e.shelterSpot)>5)goTo(e,e.shelterSpot.x,e.shelterSpot.y,122,dt);
  else {e.path=null;e.yielding=false;}
  return true;
}
function blowout(dt) {
  const B = S.blow;
  if (B.stage === 0 && S.min >= B.next && P.alive) {
    B.stage = 1; B.t = 80;
    radioNews(BLOW_WARNING, true);
  }
  if (B.stage === 1) {
    B.t -= dt; WX.red = lerp(WX.red, 0.5, Math.min(1,dt * 0.05));
    sirenT -= dt; if (sirenT <= 0) { sirenT = 4; play('siren'); }
    if (B.t <= 0) {
      B.stage = 2; B.t = 26; play('blow');
      ents.forEach(e => {
        if (!e.alive || e === P || sheltered(e.x, e.y) || safeFromBlow(e)) return;
        if (chance(e.kind === 'dog' ? 0.5 : 0.6)) { e.hp = 0; kill(e, 'blow'); }
      });
    }
  } else if (B.stage === 2) {
    B.t -= dt; WX.red = lerp(WX.red, 1, Math.min(1,dt * 2));
    if (chance(dt * 1.5)) WX.flash = 0.8;
    if (P.alive && !sheltered(P.x, P.y)) { P.hp -= 9 * dt; S.rad = Math.min(100, S.rad + 1.5 * dt); if (P.hp <= 0) kill(P, 'blow'); }
    if (B.t <= 0) {
      S.flags.blowClearUntil=S.min+12;
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
  if (WX.cloud < 0.2 || (P && (loftAt(P) || inBunker(P.x, P.y)))) return;
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
  const bunk = P && (loftAt(P) || inBunker(P.x, P.y));
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
  const exposed = S.blow?.stage && !sheltered(P.x, P.y);
  if (WX.red > 0.02 && exposed) {
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(255,' + Math.round(255 - WX.red * 140) + ',' + Math.round(255 - WX.red * 160) + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';
    if (S.blow?.stage === 2) { ctx.fillStyle = 'rgba(200,40,20,' + (0.12 + 0.1 * Math.sin(S.min * 14)) + ')'; ctx.fillRect(0, 0, VW, VH); }
  }
  if (WX.flash > 0 && !bunk && (!S.blow?.stage || exposed)) { ctx.fillStyle = 'rgba(235,240,255,' + WX.flash * 0.45 + ')'; ctx.fillRect(0, 0, VW, VH); }
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
function activeDetectorRange() {
  const model = S && DETECTORS[S.weapon];
  return model && has(S.weapon) && P.alive && !inBunker(P.x, P.y) ? model.metres * T / 1.5 : 0;
}
function survival(dt) {
  survDefaults();
  // голод
  S.food = Math.max(0, S.food - dt * 0.048);
  if (S.food < 20 && !S.flags.hungryMsg) { S.flags.hungryMsg = 1; msg('Ты голоден. Съешь что-нибудь из рюкзака.', 'bad'); }
  if (S.food >= 30) S.flags.hungryMsg = 0;
  if (S.food <= 0) P.hp -= 0.12 * dt;
  // кровотечение
  if (S.bleed > 0) {
    P.hp -= S.bleed * 0.55 * dt;
    P.bleedT = (P.bleedT || 0) - dt;
    if (P.bleedT <= 0) { P.bleedT = 0.6; decals.push({ x: P.x + rnd(-6, 6), y: P.y + rnd(-6, 6), r: rnd(1.5, 3), a: 0.7 }); }
  }
  const range = activeDetectorRange();
  P.detD = Infinity;
  if (range) for (const a of arts) {
    const distance = dE(P, a);
    if (distance <= range && distance < P.detD) P.detD = distance;
  }
  if (Number.isFinite(P.detD)) {
    P.detT = (P.detT || 0) - dt;
    if (P.detT <= 0) {
      const fraction = P.detD / range;
      play('beep', undefined, undefined, 1.3 - 0.8 * fraction);
      P.detT = 0.12 + 1.2 * fraction;
    }
  } else P.detT = 0;
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
  const h=(y1-y0+1)*T+18,top=y0*T-9;
  g.save();g.translate(x*T,0);g.beginPath();
  g.rect(0,y*T-(y===y0?9:0),T,T+(y===y0?9:0)+(y===y1?9:0));g.clip();
  drawRailStrip(g,x,top,h);g.restore();
}
function drawRailStrip(g,x,top,h){
  const s=ART.m.sprites.rail,k=h/s.rect[3],pw=s.rect[2]*k;
  const key = 'rail:' + h;
  if (!PATS[key]) { const c = document.createElement('canvas'); c.width = Math.round(pw); c.height = Math.round(h); c.getContext('2d').drawImage(ART.images[s.atlas], ...s.rect, 0, 0, c.width, c.height); PATS[key] = c; }
  const c = PATS[key], ox = ((x * T) % c.width + c.width) % c.width;
  g.save();g.beginPath();g.rect(0,top,T,h);g.clip();
  g.drawImage(c,-ox,top);g.drawImage(c,c.width-ox,top);
  if (perspective) ballastSlope(g,0,top,T,h);
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

// The yard is painted in world coordinates, including the overlap of neighbouring chunks.
const villageAtmosphere = BIG && !location.hash.includes('yard-off');
function nearGroundChunk(x, y, margin) {
  return x >= GWP.x0-margin && x <= GWP.x1+margin && y >= GWP.y0-margin && y <= GWP.y1+margin;
}
function paintVillageHearth(g) {
  if (!nearGroundChunk(FIRE.x, FIRE.y, 112)) return;
  const r = mulberry32(9182);
  g.save(); g.translate(FIRE.x, FIRE.y);
  for (let i=0; i<28; i++) {
    const a=r()*Math.PI*2, radius=r()*32, w=18+r()*33;
    g.globalAlpha=.54;
    g.drawImage(trailPrint(true,i%4),Math.cos(a)*radius-w/2,Math.sin(a)*radius*.76-11,w,23);
  }
  g.globalAlpha=1;
  for (let i=0; i<130; i++) {
    const a=r()*Math.PI*2, radius=9+r()*36;
    g.fillStyle=i%4===0?'rgba(176,166,145,.57)':'rgba(44,36,30,.67)';
    g.fillRect(Math.cos(a)*radius,Math.sin(a)*radius*.8,1+r()*2,.6+r());
  }
  // Split birch and bark chips beside the seating circle.
  g.translate(54,25); g.rotate(-.35);
  groundShadow(g,0,0,17,8,0,2);
  for (let i=0; i<6; i++) {
    const x=(r()-.5)*8, y=(i%4)*3.2-5;
    c1Draw(g,'c1_log'+(i%3),x,y,24+r()*8,(r()-.5)*.25,1,1);
    g.fillStyle='#a88c65'; g.fillRect(x-10+r()*3,y,2.2,1.3);
  }
  for (let i=0; i<16; i++) {
    g.fillStyle=i%3?'#776449':'#a18e71'; g.fillRect((r()-.5)*41,(r()-.5)*23,1+r()*2,.8);
  }
  g.restore();
}
function paintVillageHouseFeet(g) {
  for (const h of HOUSES) {
    const x=h.x*T, y=(h.y+h.h)*T, w=h.w*T;
    if (!nearGroundChunk(x+w/2,y,w/2+30) || Math.abs(x+w/2-FIRE.x)>350 || Math.abs(y-FIRE.y)>410) continue;
    const r=mulberry32(137*h.x+h.y);
    g.save();
    for (let along=4; along<w-4; along+=8) {
      const atDoor=h.entrances.some(d=>d.ny===1 && Math.abs(d.x-along)<d.width*.54);
      if (atDoor) continue;
      const wet=trailPrint(true,Math.floor(r()*4));
      g.globalAlpha=.76; g.drawImage(wet,x+along-12,y-5,27,12+r()*6);
      if(r()<.38){
        g.strokeStyle='#665f42'; g.lineWidth=.9; g.beginPath();
        for(let i=0;i<4;i++){
          const u=x+along+r()*6,v=y+2+r()*3;
          g.moveTo(u,v);g.lineTo(u-4+r()*7,v-2-r()*5);
        }
        g.stroke();
      }
    }
    g.restore();
  }
}
// Short paired depressions at the bend above the hatch. Their damp sheen follows local weather.
const hatchRuts = [[69,-25,45,6,-.64],[90,-18,57,7,-.70],[127,-74,62,6,-.76],[144,-64,44,5,-.80]];
function paintHatchRuts(g, sheen) {
  for (const [dx,dy,w,h,a] of hatchRuts) {
    g.save(); g.translate(HATCH.x+dx,HATCH.y+dy); g.rotate(a);
    if(sheen){
      g.globalAlpha=.35*WX.rain;
      g.drawImage(yardReflection(),-w*.42,-h*.42,w*.84,h*.84);
    } else {
      g.globalAlpha=.87;
      g.drawImage(trailPrint(true,Math.floor(w)%4),-w*.64,-h,w*1.28,h*2);
    }
    g.restore();
  }
}
let rutReflection;
function yardReflection() {
  if(rutReflection)return rutReflection;
  const c=document.createElement('canvas');c.width=96;c.height=18;
  const g=c.getContext('2d'),r=mulberry32(456);
  g.drawImage(trailPrint(true,1),0,0,96,18);g.globalCompositeOperation='source-atop';
  const sky=g.createLinearGradient(0,0,0,18);
  sky.addColorStop(0,'#4c5048');sky.addColorStop(.57,'#a0a6a3');sky.addColorStop(1,'#777968');
  g.fillStyle=sky;g.fillRect(0,0,96,18);g.fillStyle='rgba(50,45,39,.5)';
  for(let i=0;i<28;i++)g.fillRect(r()*95,r()*18,1+r()*7,1);
  return rutReflection=c;
}

function drawVillageLanes(g) {
  if (GWP.x1 < (WEST+40)*T || GWP.x0 > (WEST+86)*T || GWP.y1 < (NORTH_ROWS+159)*T || GWP.y0 > (NORTH_ROWS+184)*T) return;
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
        g.globalAlpha = .65; g.drawImage(trailPrint(false, j % 4), -w/2, -h/2, w, h);
        if (villageAtmosphere && (l === 0 || l === 1 || l === 3)) {
          // Narrow polished centre and occasional heel scuffs, following the walkable lane.
          g.globalAlpha=.47; g.drawImage(trailPrint(false,(j+i)%4),-21,-8+n*3,42,16);
          if(n>.4){
            const side=j%2?1:-1;
            g.rotate(side*.13); g.globalAlpha=.55;
            g.drawImage(trailPrint(true,j%4),-4,side*6-2,8,4);
          }
        }
        g.restore();
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

// Sample centres are fixed in the world, including the halo outside each cached chunk.
function surfaceMask(tiles,kind,shoulders,coverage,x,y,width,height) {
  const left=Math.max(0,Math.floor(x)-5), top=Math.max(0,Math.floor(y)-5);
  const w=Math.min(PW*4,Math.ceil(x+width)+5)-left, h=Math.min(MH*4,Math.ceil(y+height)+5)-top;
  const values=new Float32Array(w*h), rowPass=new Float32Array(w*h);
  for(let j=0;j<h;j++) for(let i=0;i<w;i++)
    values[j*w+i]=coverage(tiles[((top+j)>>2)*MW+((left+i)>>2)], (left+i)>>2, (top+j)>>2) ? 1 : 0;
  for(let pass=0;pass<2;pass++) {
    for(let j=0;j<h;j++) for(let i=0;i<w;i++) {
      let sum=0;const a=Math.max(0,i-2), b=Math.min(w-1,i+2);
      for(let k=a;k<=b;k++) sum+=values[j*w+k];
      rowPass[j*w+i]=sum/(b-a+1);
    }
    for(let j=0;j<h;j++) for(let i=0;i<w;i++) {
      let sum=0;const a=Math.max(0,j-2), b=Math.min(h-1,j+2);
      for(let k=a;k<=b;k++) sum+=rowPass[k*w+i];
      values[j*w+i]=sum/(b-a+1);
    }
  }
  const alpha=new Uint8ClampedArray(w*h);
  for(let j=0;j<h;j++) for(let i=0;i<w;i++) {
    const wx=left+i, wy=top+j, tile=tiles[(wy>>2)*MW+(wx>>2)], base=values[j*w+i];
    if (!base) continue;
    const natural = GROUNDISH(tile) || tile===SW || tile===DI || tile===AS;
    if (!natural) continue;
    const noise = vnoise(wx,wy,4)-.5;
    let v = base + noise * .19 * Math.min(1,base*4);
    if (kind===SW && shoulders && wy/4>=NORTH_ROWS && wx/4>WEST+224) {
      // Use the unrounded axis along the whole eastern stream, including the ford.
      const axis=streamCenter((wy+.5)/4-.5)+.5;
      const bank=1.5-Math.abs((wx+.5)/4-axis);
      v=clamp(.5 + bank*1.8 + noise*.35,0,1);
    } else if (kind===SW) v=clamp((v-.20)*1.95,0,1);
    else if (shoulders && kind===AS) v=clamp((v-.26)*2.15,0,1);
    else v=clamp((v-.045)*1.5,0,1);
    const a = v*v*(3-2*v)*(kind===DI ? 235 : 255);
    alpha[j*w+i]=a;
  }
  return {alpha,width:w,height:h,left,top,spacing:T/4};
}
// Bake opacity into the actual material pixels. A transparent roadside pixel must
// remain transparent even when a mobile canvas batches, crops or reuses a surface.
function stampGroundLayer(g, mask, x, y, w, h, paint) {
  if(w<=0 || h<=0)return;
  const {alpha,width,height,spacing,left,top}=mask;
  // Crop to the actual support of the interpolated coverage. In particular a
  // dry patch at the opposite side of a road chunk is never stamped at all.
  const sampleX=world=>clamp(Math.floor(world/spacing-.5)-left,0,width-1);
  const sampleY=world=>clamp(Math.floor(world/spacing-.5)-top,0,height-1);
  const sx=sampleX(x), sy=sampleY(y);
  const ex=Math.min(width-1,sampleX(x+w)+1),ey=Math.min(height-1,sampleY(y+h)+1);
  let minX=width,maxX=-1,minY=height,maxY=-1;
  for(let j=sy;j<=ey;j++)for(let i=sx;i<=ex;i++){
    if(!alpha[j*width+i])continue;
    minX=Math.min(minX,i);maxX=Math.max(maxX,i);
    minY=Math.min(minY,j);maxY=Math.max(maxY,j);
  }
  if(maxX<0)return;
  const x1=Math.min(x+w,(left+maxX+1.5)*spacing), y1=Math.min(y+h,(top+maxY+1.5)*spacing);
  x=Math.max(x,(left+minX-.5)*spacing);y=Math.max(y,(top+minY-.5)*spacing);
  w=x1-x;h=y1-y;if(w<=0 || h<=0)return;
  const tile=ARTM.materialTile || (ARTM.materialTile=document.createElement('canvas'));
  if(tile.width!==GCH || tile.height!==GCH)tile.width=tile.height=GCH;
  const cg=tile.getContext('2d',{willReadFrequently:true});
  cg.save();
  cg.translate(-x,-y);cg.clearRect(x,y,w,h);paint(cg,x,y,w,h);
  cg.restore();
  const rgba=cg.getImageData(0,0,w,h), pixels=rgba.data;
  // Grid spacing is 8 or 16 world pixels. Interpolate runs between sample
  // centres, avoiding a texture lookup and floor operation for every pixel.
  for(let j=0;j<h;j++){
    const sy=clamp((y+j+.5)/spacing-.5-top,0,height-1);
    const row=Math.floor(sy)*width, next=Math.min(row+width,(height-1)*width);
    const fy=sy-Math.floor(sy);
    for(let i=0;i<w;){
      const world=x+i+.5, gx=Math.floor(world/spacing-.5);
      const ix=clamp(gx-left,0,width-1), jx=clamp(gx+1-left,0,width-1);
      const a=alpha[row+ix]+fy*(alpha[next+ix]-alpha[row+ix]);
      const b=alpha[row+jx]+fy*(alpha[next+jx]-alpha[row+jx]);
      const delta=(b-a)/spacing, end=Math.min(w,(gx+1.5)*spacing-x);
      let opacity=a+(world-(gx+.5)*spacing)*delta;
      for(;i<end;i++,opacity+=delta)pixels[(j*w+i)*4+3]=opacity;
    }
  }
  cg.putImageData(rgba,0,0);
  // One material sample per world pixel, even in the 2× cache. Filtering here
  // would sample a stale texel outside this subrectangle at every cache seam.
  g.save();
  g.imageSmoothingEnabled=false;
  g.drawImage(tile,0,0,w,h,x,y,w,h);
  g.restore();
}
function* paintSurfaceLayers(g,tiles,shoulders){
  const CH=GCH;
  // 3. Мягкие края грунта и асфальта: маска 4 точки на клетку, размытая и с шумом, только поверх травы
  const surfaces = [[DI, shoulders ? 'bare_soil' : 'dirt'], [AS, 'asphalt']];
  if (BIG) {
    if (GW.x0<WEST+2 || GW.x1>=WEST+222 || GW.y0<NORTH_ROWS+2) surfaces.push([SW,'water']);
    if (GW.x1>=WEST-2 && GW.x0<WEST+226 && GW.y1>=NORTH_ROWS-2) surfaces.push([SW,'swamp']);
  }
  else surfaces.push([SW,'water']);
  for (const [tt, id] of surfaces) {
    // Гравий заходит под полотно и выступает за его края.
    const coverage = (t,x,y) => {
      if (tt!==SW) return t===tt || (shoulders && tt===DI && t===AS);
      const marsh=BIG && x>=WEST && x<WEST+224 && y>=NORTH_ROWS;
      return t===SW && marsh===(id==='swamp');
    };
    const sc = 4 / T;
    // только прямоугольник вокруг клеток этого покрытия (края расплываются на 3 клетки): кусок без дороги пропускается
    let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
    for (let y = Math.max(0, GW.y0 - 3); y <= Math.min(MH - 1, GW.y1 + 3); y++) for (let x = Math.max(0, GW.x0 - 3); x <= Math.min(PW - 1, GW.x1 + 3); x++)
      if (coverage(tiles[y * MW + x],x,y)) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    if (bx1 >= 0 && (bx1 + 4) * T > GWP.x0 && (bx0 - 3) * T < GWP.x1 && (by1 + 4) * T > GWP.y0 && (by0 - 3) * T < GWP.y1) {
      const rx0 = Math.max(GWP.x0, (bx0 - 3) * T), ry0 = Math.max(GWP.y0, (by0 - 3) * T), rx1 = Math.min(PW*T,GWP.x1, (bx1 + 4) * T), ry1 = Math.min(MH*T,GWP.y1, (by1 + 4) * T);
      for (let cy = ry0; cy < ry1; cy += CH) for (let cx = rx0; cx < rx1; cx += CH) {
        const w = Math.min(CH, rx1 - cx), h = Math.min(CH, ry1 - cy);
        const mask=surfaceMask(tiles,tt,shoulders,coverage,cx*sc,cy*sc,w*sc,h*sc);
        stampGroundLayer(g,mask,cx,cy,w,h,(cg,cx,cy,w,h)=>{
          if(ART?.m.sprites[id])artFill(cg,id,cx,cy,w,h);
          else{
            cg.fillStyle=tt===DI?'#625441':tt===AS?'#44443e':id==='swamp'?'#404634':'#323e37';
            cg.fillRect(cx,cy,w,h);
          }
          if (shoulders && tt === DI) {
            cg.fillStyle = 'rgba(178,145,101,.16)';
            cg.fillRect(cx, cy, w, h);
            if(ART)drawWheelTracks(cg, cx, cy, w, h);
          }
          if (tt === AS) {
            cg.fillStyle = 'rgba(200,190,150,0.16)';
            for (let row = Math.max(9, Math.floor(cy / (3 * T)) * 3); row * T < cy + h; row += 3)
              cg.fillRect(roadX[row] * T + 14, row * T + 4, 4, 18);
          }
        });
      }
    }
    yield;
  }
}
function* paintGroundMaterials(g) {
  const shoulders = BIG && C1, tiles = surfaceTiles();
  // 1. Основа: трава, грунт, асфальт, полы. Болото, насыпь и пустота остаются из прежней отрисовки.
  for (let y = GW.y0; y <= GW.y1; y++) for (let x = GW.x0; x <= GW.x1; x++) {
    const t = tiles[y * MW + x], px = x * T, py = y * T;
    const id = GROUNDISH(t) || t === DI || t === AS || t === SW ? 'grass' : t === FL ? 'floor_wood' : t === CF ? 'floor_concrete' : null;
    if (id) artFill(g, id, px, py, T, T);
    if (t===RA && BIG && (x<WEST || y<NORTH_ROWS)) artFill(g,'grass',px,py,T,T);
    else if (C1 && t === RA) c1Rail(g,x,y);
    if (t === CF) { g.strokeStyle = 'rgba(25,25,20,0.18)'; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); }
  }
  yield;
  // 2. Сухая трава крупными мягкими пятнами: маска низкого разрешения, накладывается кусками 512 px
  if (!ARTM.dry) {
    const width=MW*2,height=MH*2,alpha=new Uint8ClampedArray(width*height);
    const terrain = shoulders && autumnTerrain();
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const tx = x >> 1, ty = y >> 1, t = tiles[ty * MW + tx];
      const v = vnoise(x, y, 11) * 0.7 + vnoise(x + 31, y + 17, 4) * 0.3;
      let a = GROUNDISH(t) ? clamp((v - 0.5) * 4, 0, 1) : 0;
      if (terrain && (GROUNDISH(t) || t===DI || t===AS || t===SW) && tx < PW) {
        const i = ty * MW + tx;
        const exposure = clamp((terrain.water[i] - 1) / 5, 0, 1);
        const shoulder = Math.max(0, 1 - terrain.verge[i] / 4);
        a = exposure * clamp((v - .20) * 1.9 + shoulder * .25, 0, 1);
      }
      alpha[y*width+x]=a*235;
    }
    ARTM.dry={alpha,width,height,left:0,top:0,spacing:T/2};
  }
  const CH=GCH, sh=BIG?256/GS:CH;
  const wx0=GWP.x0, wy0=GWP.y0, wx1=Math.min(PW*T,GWP.x1), wy1=Math.min(WH,GWP.y1);
  for(let cy=wy0;cy<wy1;cy+=sh){
    for(let cx=wx0;cx<wx1;cx+=CH){
      stampGroundLayer(g,ARTM.dry,cx,cy,Math.min(CH,wx1-cx),Math.min(sh,wy1-cy),(cg,x,y,w,h)=>{
        if(shoulders){cg.fillStyle=autumnGrassPattern(cg);cg.fillRect(x,y,w,h);}
        else artFill(cg,'grass_dry',x,y,w,h);
      });
    }
    if(BIG)yield;
  }
  yield;
  yield* paintSurfaceLayers(g,tiles,shoulders);
  if(C1)c1ForestFloor(g);
}
function* artGround(g) {
  yield* paintGroundMaterials(g);
  const tiles=surfaceTiles();
  yield;
  if (C1) {
    if (BIG) {
      drawSurfaceEdges(g, tiles);
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
    if (villageAtmosphere) {
      paintVillageHearth(g);
      if (nearGroundChunk(HATCH.x,HATCH.y,190)) paintHatchRuts(g,false);
      if (nearGroundChunk(FIRE.x,FIRE.y,720)) paintVillageHouseFeet(g);
    }
  }
  // 4. Растительность группами: у стен, заборов, деревьев и насыпи; середина проходов свободна

  const solidish = t => t === BR || t === CO || t === TR || t === RA;
  const nearPath = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tAt(x + dx, y + dy); if (t === DI || t === AS || t === FL || t === CF) return true; } return false; };
  const fenceNear = (x, y) => DECOR.some(d => d[0] === 'fence' && Math.abs(d[1] - x - 0.5) < 1.6 && Math.abs(d[2] - y - 0.5) < 1.2);
  for (let y = Math.max(2, GW.y0); y <= Math.min(MH - 3, GW.y1); y++) for (let x = Math.max(2, GW.x0); x <= Math.min(PW - 3, GW.x1); x++) {
    if (map[y * MW + x] !== GR) continue;
    const RT = mulberry32(4242 + x * 97 + y * 7919);
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
    const pixels=bg.getImageData(0,0,w,h).data,alpha=new Uint8ClampedArray(w*h);
    for(let i=0;i<alpha.length;i++)alpha[i]=pixels[4*i+3];
    ARTM.forest={alpha,width:w,height:h,left:0,top:0,spacing:T/K};
  }
  const {x0,y0}=GWP,x1=Math.min(PW*T,GWP.x1),y1=Math.min(WH,GWP.y1);
  for(let cy=y0;cy<y1;cy+=GCH)for(let cx=x0;cx<x1;cx+=GCH){
    stampGroundLayer(g,ARTM.forest,cx,cy,Math.min(GCH,x1-cx),Math.min(GCH,y1-cy),
      (cg,x,y,w,h)=>artFill(cg,'forest',x,y,w,h));
  }
}
// Пучки группируются по мировым координатам. Берег узнаётся по камышу,
// обочина — по низкой траве, открытое поле — по более редким куртинам.
function scatterAutumnPlants(g, x, y, terrain) {
  // Тот же пучок попадает в оба соседних куска по своим мировым координатам.
  const seed=hash2(x+17,y+83);
  if(seed<=.32) {
    const px=(x+.18+seed*2)*T, py=(y+.2+.6*hash2(y+7,x))*T, size=14+seed*24;
    ART.draw(g,'c1_tuft'+Math.floor(seed*18),px,py-2,size,size*.86,seed*5,.86);
  }
  const i = y * MW + x, bank = terrain.water[i] <= 2, verge = terrain.verge[i];
  const patch = vnoise(x + 31, y - 19, 5);
  const density = bank ? .23 : verge <= 2 ? .25 : .19;
  if (hash2(x + 191, y + 67) > density * (.25 + patch * 1.4)) return;
  const r = mulberry32((y * MW + x) * 31 + 57);
  const cx = (x + .35 + r() * .3) * T, cy = (y + .35 + r() * .3) * T;
  if (bank || (verge >= 2 && patch > .57 && r() < .19)) {
    const size = bank ? 21 + r() * 13 : 23 + r() * 17;
    groundShadow(g, cx, cy, size * .37, size * .23, .3, 3);
    ART.draw(g, bank ? 'c1_bush3' : 'c1_bush' + Math.floor(r() * 3), cx, cy, size, size, r() * 6.28);
  } else {
    const count = 2 + Math.floor(r() * 3);
    groundShadow(g,cx,cy,10+count*1.3,4+count*.5,-.3,2);
    for (let n = 0; n < count; n++) {
      const size = 10 + r() * 15, dx = (r() - .5) * 21, dy = (r() - .5) * 13;
      ART.draw(g, 'c1_tuft' + Math.floor(r() * 6), cx + dx, cy + dy, size, size * .8, r() * 6.28);
    }
  }
}

/* разброс C1: брёвна, пни, камни, пятна. Место выбирается по хешу клетки, так что соседние куски рисуют одно и то же */
const blockedScatter = new Set();
function scatterObject(x,y) {
    if(blockedScatter.has(y*MW+x)) return null;
    const seedX = BIG && x>=WEST ? x-WEST : x;
    const h = hash2(seedX * 3 + 11, y * 7 + 5); if (h > 0.03) return null;
    let road = false; for (let dy = -2; dy <= 2 && !road; dy++) for (let dx = -2; dx <= 2; dx++) { const t = tAt(x + dx, y + dy); if (t === DI || t === AS || t === BR || t === CO || t === FL || t === CF || t === RA) { road = true; break; } }
    if (road) return null;
    const h2 = hash2(y + 31, seedX + 17), cx = x * T + 16, cy = y * T + 16, a = h2 * 6.28;
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
    if (t0 === SW) {   // Камыш и лужи у кромки воды.
      if (BIG && x>=WEST+224) continue;
      if (BIG && x<WEST && tAt(x-1,y)===SW && tAt(x+1,y)===SW &&
          tAt(x,y-1)===SW && tAt(x,y+1)===SW) continue;
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
  c.width = Math.ceil(width + 24); c.height = 77 + seed % 13;
  const g = c.getContext('2d');
  g.fillStyle = '#a18461'; g.fillRect(0, 0, c.width, c.height);
  if (ART) {
    g.globalAlpha = .46;
    artFill(g, C1 ? 'bare_soil' : 'dirt', 0, 0, c.width, c.height);
  }
  const image = g.getImageData(0, 0, c.width, c.height), data = image.data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const depth = y / c.height;
    const center = c.width / 2 + Math.sin(depth * 3 + seed) * (3 + depth * 6);
    const lateral = (x - center) / (width * (.53 - .16 * depth));
    const rim = Math.hypot(lateral, (y - 9) / (c.height - 12));
    const tuft = vnoise(x + seed, y, 5) - .5;
    const grit = hash2(x + seed, y) - .5, i = (y * c.width + x) * 4;
    data[i + 3] = 235 * clamp((1 - rim + tuft * .32 + grit * .10) * 3.8, 0, 1);
    for (let k = 0; k < 3; k++) data[i + k] += tuft * 16 + grit * 22;
  }
  g.putImageData(image, 0, 0);
  return c;
}

// В локальных координатах ось Y направлена из дома наружу.
// Следы и пороги остаются на земле при исчезновении крыши.
function drawThresholds(g) {
  for (const h of HOUSES) {
    if (h.x > GW.x1 + 3 || h.y > GW.y1 + 3 || h.x + h.w < GW.x0 - 3 || h.y + h.h < GW.y0 - 3) continue;
    const concrete = h.mat === 'conc';
    for (const door of h.entrances) {
      const w = door.width, left = -w / 2;
      g.save(); g.translate(h.x * T + door.x, h.y * T + door.y);
      g.rotate(Math.atan2(-door.nx, door.ny));
      const seed = Math.floor(hash2(h.x * T + door.x, h.y * T + door.y) * 65535);
      if (!door.soil) door.soil = wornEntrance(w + 12, seed);
      g.drawImage(door.soil, -door.soil.width / 2, -7);
      if (door.approach === 'rubble') {
        const random = mulberry32(seed);
        for (let i = 0; i < Math.ceil(w / 4); i++) {
          const x = (i % 2 ? -1 : 1) * (w * (.29 + random() * .21));
          const y = -9 + random() * 24, size = 1.4 + random() * 3.4;
          g.fillStyle = '#514539';
          g.beginPath(); g.moveTo(x-size,y); g.lineTo(x,y-size*.55);
          g.lineTo(x+size*.8,y-.4); g.lineTo(x+size*.5,y+1); g.closePath(); g.fill();
          g.fillStyle = i % 3 ? '#897769' : '#9a7057';
          g.fillRect(x-size*.55,y-size*.4,size,size*.35);
        }
      } else if (door.approach === 'slab') {
        g.fillStyle = '#575449'; g.fillRect(left, -8, w, 18);
        if (ART) artFill(g, 'floor_concrete', left, -8, w, 16);
        g.fillStyle = 'rgba(192,184,157,.35)'; g.fillRect(left+1, 7, w-2, 1);
      } else if (door.approach === 'deck') {
        // Low plank landing visible above the north eave when approaching from the village.
        const depth=27;
        g.fillStyle='#514638';g.fillRect(left-1,-3,w+2,depth+5);
        if(ART)artFill(g,'floor_wood',left,-3,w,depth+3);
        for(let y=4;y<=depth;y+=7)beam(g,left+1,y,-left-1,y,1,'rgba(40,32,26,.52)');
      } else if (door.approach === 'porch') {
        g.fillStyle = '#514336'; g.fillRect(left-2, -6, w+4, 25);
        if (ART) artFill(g, 'floor_wood', left-2, -6, w+4, 23);
        g.fillStyle = '#6e5942'; g.fillRect(left, 19, w, 5);
        g.fillStyle = '#9d876c'; g.fillRect(left+1, 19, w-2, 1);
      }
      // Косяки остаются видны изнутри при прозрачной крыше.
      const wolfDoor = villageAtmosphere && h.ok==='15,72' && door.ny===1;
      if (door.approach === 'earth' && (seed % 3 !== 0 || wolfDoor)) {
        const stone = concrete || h.ruin;
        g.fillStyle = stone ? '#635e50' : '#534638';
        g.fillRect(left+2,-3,w-4,5);
        g.fillStyle = stone ? '#918777' : '#8a775e';
        g.fillRect(left+3,0,w-7,1.4);
        if(wolfDoor){
          g.fillStyle='#40382f';g.fillRect(left+2,2,w-4,3);
          g.fillStyle='#a28a6b';g.fillRect(-w*.23,1,w*.41,1.4);
        }
      }
      g.fillStyle = concrete ? '#807d70' : '#785e46';
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
  g.fillStyle = 'rgba(114,108,92,.22)'; g.fillRect(0, -4, length, 8);
  g.fillStyle = '#898273'; g.fillRect(0, -edge, length, 1);
  for (let i = 0; i <= bays; i++) {
    const x = i * bay;
    g.fillStyle = '#514c44'; g.fillRect(x - 2.5, -5, 5, 10);
    g.fillStyle = '#9a9788'; g.fillRect(x - 2.5, -5, 4, 8.5);
  }
  // Опоры и натяжной трос расположены на крышке; витки слегка выступают над ней.
  g.translate(topX / 4, topY / 4);
  g.fillStyle = '#5b4e42'; g.fillRect(0, -.75, length, 1.5);
  const turns = Math.ceil(length / 7), pitch = length / turns;
  g.strokeStyle = '#51483e'; g.lineWidth = 1.2; g.beginPath();
  for (let i = 0; i < turns; i++) {
    const x = (i + .5) * pitch;
    g.moveTo(x + 4.4, 0); g.ellipse(x, 0, 4.4, 5, 0, 0, 2 * Math.PI);
  }
  g.stroke(); g.beginPath(); g.lineWidth = .65; g.strokeStyle = '#8d8071';
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
  const wood = (o.material === 'picket' || o.material === 'stockade') || o.material === 'rail';
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
  if(o.material==='railMesh' && perspective){
    beam(g,0,0,length,0,1.4,'#504a3c');g.restore();return;
  }
  if (o.material === 'concreteWire') {
    drawCheckpointWall(g, length, bays, upright); g.restore(); return;
  }
  if ((o.material === 'picket' || o.material === 'stockade')) {
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
  if (perspective) {
    const [px,py] = roofPoint(o.x,o.y + o.h/2,.026);
    const dx=px-o.x,dy=py-o.y-o.h/2;
    g.strokeStyle='#564b3e';g.lineWidth=4;g.beginPath();g.moveTo(3,0);g.lineTo(3+dx,dy);
    g.moveTo(o.w,0);g.lineTo(o.w+dx,dy);g.stroke();g.translate(dx,dy);
  }
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
  if(o.k==='depotPier'){
    artFill(g,'wall_concrete',o.x-3,o.y-3,o.w+6,o.h+6);
    g.fillStyle='#514235';g.fillRect(o.x+2,o.y+1,8,11);
    beam(g,o.x+1,o.y+1,o.x+12,o.y+1,2,'#a1896a');
    beam(g,o.x+1,o.y+11,o.x+12,o.y+11,2,'#91785c');return true;
  }
  if (C1 && (o.k === 'bed' || o.k === 'table')) {
    const bed = o.k === 'bed';
    g.save();
    spriteShadow(g, 2, 1.5);
    g.drawImage(ART.images.furniture, bed ? 0 : 64, 0, 64, bed ? 43 : 38,
      o.x, o.y, o.w, o.h);
    if (o.barRole) drawTavernTable(g,o);
    if (o.barService) {
      for(const [id,dx,dy] of [['vodka',6,4],['energy',15,7],['bread',24,6]]) {
        const item=G3.pack?.manifest.items?.[id];
        const im=lesserSprites[id] || (item && packImage(item.file));
        if(im?.naturalWidth) g.drawImage(im,o.x+dx-5,o.y+dy-3,10,9);
      }
    }
    g.restore();
    return true;
  }
  if (C1 && o.k === 'bus') { const w = o.w * 1.25; c1Draw(g, 'c1_bus', cx, cy, w); return true; }
  if (C1 && o.k === 'car' && o.sprite) {
    c1Draw(g, o.sprite, cx, cy, o.w + 4, 0, 1, 5); return true;
  }
  if (C1 && o.k === 'car') {
    const id = o.seed >= 10 ? 'c1_army' + (o.seed % 3) : ['c1_car0', 'c1_car1', 'c1_car2', 'c1_tractor'][o.seed % 4], w = o.seed >= 10 ? 84 : 70, a = o.seed % 2 ? Math.PI : 0;
    c1Draw(g, id, cx, cy, w, a); return true;
  }
  if (C1 && o.k === 'hatch') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(cx + 2, cy + 3, 22, 0, 6.28); g.fill(); c1Draw(g, 'c1_hatch', cx, cy, 46); return true; }
  if (C1 && o.k === 'fire') {
    // У деревенского костра брёвна расставлены у посадочных мест.
    g.save(); spriteShadow(g, 2.6, 1.8);
    if (cx === FIRE.x && cy === FIRE.y) c1Draw(g, 'camp_ring', cx, cy, 40);
    else c1Draw(g, 'c1_campfire', cx, cy, 30 * 192 / 72);
    g.restore(); return true;
  }
  if (C1 && o.k === 'pylon') { c1Draw(g, 'c1_pole_conc', cx, cy, 44, (o.x * 7 % 3) * 0.2); return true; }
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
    if (perspective && detailHeight(id)) groundShadow(g,x,y,width*.39,width*.18,angle,2);
    else c1Draw(g, id, x, y, width, angle);
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
  ['rubble', 34.3, 92.4, 0.5], ['rubble', 11.6, 90.4, 2.1], ['rubble', 25.6, 18.6, 1], ['rubble', 94.3, 18.2, 0.3],
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
      if (!perspective || !detailHeight(id)) c1Draw(g, id, x, y, width, d[3], 1, log ? 3 : 9);
      return;
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
    if (perspective) cacheCrownLayers(c, g.getTransform(), pick[v], v, w);
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
  if (!SHADOWS || (perspective && unshadowedSurface.has(g))) return;
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
  if(h.mat==='watchpost')return 'c1_tower';
  if (BIG && h.x === WEST+15 && h.y === NORTH_ROWS+28) return 'c1_tower';
  if (h.ruin) return big <= (BIG ? 32 : 16) ? 'c1_roof_shed' + (idx % 2) : 'c1_roof_barn';
  if (h.mat === 'conc') return big >= 110 || (BIG && big >= 75 && long >= 1.8) ? 'c1_roof_hangar' : big <= 16 ? 'c1_booth' + (idx % 3) : 'c1_roof_office';
  if (BIG && (h.x<WEST || h.ok?.startsWith('dump_'))) {
    if (h.mat==='plank') return 'c1_roof_plank';
    if (h.mat==='slate') return 'c1_roof_slate';
  }
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
function drawPorch(g, door, eave, ground) {
  const width = door.width + 16, left = door.x + 3 - width / 2;
  const back = eave - 4, front = ground + 3;
  const sheet = balancedGable('c1_roof_slate');
  g.save(); g.shadowColor = 'transparent';
  // Нижние концы стоек видны под передней кромкой; крыша перекрывает фасад.
  for (const x of [left + 3, left + width - 6]) {
    g.fillStyle = '#4d4031'; g.fillRect(x, front, 3, 11);
    g.fillStyle = '#83715b'; g.fillRect(x, front + 1, 1, 9);
  }
  g.drawImage(sheet, sheet.width*.08, sheet.height*.59, sheet.width*.27, sheet.height*.22,
    left, back, width, front-back);
  const shade = g.createLinearGradient(0, back, 0, front);
  shade.addColorStop(0, 'rgba(30,25,20,.52)'); shade.addColorStop(.32, 'rgba(46,38,31,.13)');
  shade.addColorStop(1, 'rgba(99,76,54,.08)');
  g.fillStyle = shade; g.fillRect(left, back, width, front-back);
  g.fillStyle = '#6d6050'; g.fillRect(left, back, width, 1.5);
  g.fillStyle = '#53493e'; g.fillRect(left, front-1, width, 3);
  g.fillStyle = '#998a75'; g.fillRect(left, front-1, width, 1);
  g.restore();
}
function artRoof(h, idx) {
  let id = ROOF_AT[h.ok || (h.x + ',' + h.y)] || (h.ruin ? 'roof_broken' : h.mat === 'conc' ? null : ['roof_slate', 'roof_rust', 'roof_patch'][idx % 3]);
  if (C1) id = c1RoofId(h, idx, id);
  if (!id) return null;
  const W = h.w * T + 10, Hh = h.h * T + 10, c = document.createElement('canvas');
  const home = h.ok || (h.x + ',' + h.y);
  const gable = id === 'c1_roof_slate' || id === 'c1_roof_plank';
  const porch = h.entrances.find(d => d.approach === 'porch');
  h.porchDepth = porch ? 14 : 0;
  c.width = W * 2; c.height = (Hh + h.porchDepth) * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 9; g.shadowOffsetX = 4; g.shadowOffsetY = 6;
  if(h.mat==='depot' && lesserSprites['depot-roof']){
    const rw=W-7,rh=Hh-16; h.roofSurface=[rw,rh];
    artFill(g,'wall_brick',2,rh-3,rw,11);
    g.drawImage(lesserSprites['depot-roof'],0,0,rw,rh);
    g.shadowColor='transparent';
    for(const gate of h.entrances) if(gate.ny===1){
      g.fillStyle='#38342e';g.fillRect(gate.x-gate.width/2+3,rh,gate.width,7);
    }
    g.setTransform(1,0,0,1,0,0);c1Grade(c,0,0,c.width,c.height);return c;
  }
  const crossRidge = BIG && gable && (home === '15,87' || home === '26,71');
  const along = crossRidge ? false : h.w >= h.h, sp = ART.m.sprites[id];
  if (C1 && id.startsWith('c1_')) {   // крыша C1: вырезать середину под пропорции дома, не растягивать
    // объём: снизу видна полоса передней стены, крыша над ней чуть короче и бросает тень на стену
    const flat = id === 'c1_tower' || id.startsWith('c1_booth');
    const wallH = flat ? 6 : Math.min(20, 10 + h.h * 1.4), RW = W - 6, RH = Hh - 6 - wallH;
    h.roofSurface=[RW,RH];
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
    if(BIG && gable && !h.ruin) weatherRoof(g,h,RW,RH);
    if (porch) drawPorch(g, porch, RH, Hh - 7);
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
}
function artCache(o) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + 4, 9, 5, 0, 0, 6.28); ctx.fill();
  ART.draw(ctx, 'stash', o.x, o.y, 16, 14);
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
    if (k === 'trophy') { const it = r() < 0.5 ? 'tail' : 'hoof', n = it === 'tail' ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2); j = { k: 'trophy', item: it, n: n, pay: sellPrice(it) * 2 * n, n_: 'Трофеи: ' + ITEMS[it].n + ' ×' + n, d: 'Заказчик из-за кордона платит вдвое против обычного: ' + sellPrice(it) * 2 + ' RU за штуку вместо ' + sellPrice(it) + '. Принеси ' + n + ' шт.' }; }
    if (k === 'art') j = { k: 'art', pay: 0, n_: 'Любой артефакт', d: 'Клиенту всё равно какой, лишь бы светился. Плачу в полтора раза больше обычной цены. Какой отдать, выберешь сам.' };
    if (k === 'clear') { const okSp = CLEAR_SPOTS.filter(clearReachable); if (!okSp.length) continue; const sp = okSp[Math.floor(r() * okSp.length)]; j = { k: 'clear', loc: sp[3], x: sp[0], y: sp[1], where: sp[2], n: 3, got: 0, pay: 1100, n_: 'Зачистка: бандиты ' + sp[2], d: 'Там встала группа бандитов и трясёт новичков. Убери всех троих. Неважно, кто их добьёт: важно, чтобы группы не стало.' }; }
    if (j.pay && k!=='trophy') j.pay=earnings(j.pay);
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
function releaseGroup(id) { ents.forEach(e => { if (e.jobTag === id) { e.jobTag = 0; e.stay = 0; if (!e.angry) e.uid = null; } }); }
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
function previewOffer(title,description,reward,accept) {
  const previous=panel.opts;
  say(description);sys('Награда · '+reward);
  panel.opts=()=>[
    {t:'Принять · '+title,k:'key',fn:()=>{panel.opts=previous;accept();}},
    {t:'Пока откажусь',fn:()=>{panel.opts=previous;say('Хорошо. Если передумаешь, заходи.');}}
  ];
}
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
    L.forEach(x => o.push({ t: 'Заказ: ' + x.n_ + (x.pay ? ' · ' + x.pay + ' RU' : ' · ×1,5 от цены'), fn: () => previewOffer(x.n_,x.d,x.pay ? x.pay+" RU" : "полторы цены артефакта",()=>{ if(!S.jobs.act && jobOffers().includes(x)) jobTake(x); }) }));
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
  if (!e.sid && !e.angry) e.uid = null;
  if (line) say(line);
}
const offCam = o => Math.abs(o.x - cam.x) > VW / 2 / Z + 48 || Math.abs(o.y - cam.y) > VH / 2 / Z + 48;
function nearAnom(x, y, pad) { return anoms.find(a => dst(a.x, a.y, x, y) < a.r + pad) || null; }
function followTick(e, dt) {
  if (!e.follow) return false;
  if (S.min > e.hireEnd) { endHire(e); msg(e.name + ': срок вышел, я в деревню.', 'say'); news('Контракт с напарником ' + e.name + ' закончился.'); return true; }
  if (e.wait && e.waitAt) { if (dE(e, e.waitAt) > 10) goTo(e, e.waitAt.x, e.waitAt.y, 70, dt); return true; }
  const tgt = inBunker(P.x, P.y) ? { x: HATCH.x + 30, y: HATCH.y + 20 } : (loftAt(P)?.stair || P);
  const d = dst(e.x, e.y, tgt.x, tgt.y);
  // догоняющий телепорт: только вне камеры, вне боя и в проверенную безопасную точку позади игрока
  if (d > 900 && !loftAt(P) && !inBunker(P.x, P.y) && !(P.combatT > 0) && offCam(e)) {
    const back = VW / 2 / Z / T + 3, p = freeTile(P.x / T - Math.cos(P.ang) * back, P.y / T - Math.sin(P.ang) * back);
    if (offCam({ x: p.x * T, y: p.y * T }) && !nearAnom(p.x * T, p.y * T, 20) && findPath(p.x * T, p.y * T, P.x, P.y,true)) {
      e.x = p.x * T; e.y = p.y * T; e.path = null; return true;
    }
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
  const blow=S.blow, safe=sheltered(P.x,P.y);
  if(blow && !blow.stage && blow.next<=before)blowout(0);
  const limit=!safe && blow?(blow.stage?0:Math.max(0,blow.next-before)):minutes;
  const r = simRest(Math.min(limit,minutes), ctx, { food: S.food, hp: P.hp, bleed: S.bleed });
  S.food = r.food; P.hp = r.hp; if (r.minutes > 0) P.st = 100;
  const end=before+r.minutes;
  while(blow && S.min<end){
    if(!blow.stage){
      S.min=Math.min(end,Math.max(S.min,blow.next));
      if(S.min>=blow.next)blowout(0);
    }else{
      const elapsed=Math.min(end-S.min,Math.max(0,blow.t));
      S.min+=elapsed;blowout(elapsed);
      if(!blow.stage)WX.red=0;
    }
  }
  S.min=end;
  cleanExpiredCrates();
  renewFieldCrates();
  const stop = r.stop === 'hunger' ? 'Отдых прерван через ' + fmtH(r.minutes) + ': голод стал опасным (сытость ' + (Math.round(S.food * 10) / 10) + '). Поешь, потом отдыхай.' : '';
  const done = r.minutes;
  // события, у которых прошёл срок, закрываются сразу и честно
  plusDefaults();
  if (S.sos.act && S.min > S.sos.act.until) finishEncounter('timeout');
  ents.forEach(e => { if (e.alive && e.follow && S.min > e.hireEnd) { endHire(e); news('Контракт с напарником ' + e.name + ' закончился, пока ты отдыхал.'); } });
  if(r.minutes<minutes && !stop && !safe && blow?.stage)return {from:before,to:S.min,minutes:done,stop:'Надвигается выброс. Найди укрытие.'};
  return { from: before, to: S.min, minutes: done, stop: stop };
}

/* ---------- костёр ---------- */
function fireTeller() {
  const camp = campOf(P);
  let b = null, bd = 200;
  for (const e of ents) if (e.alive && e.kind === 'human' && e.fac === 'loner' && !e.follow && !e.sos && dE(e,camp) < bd) { bd = dE(e,camp); b = e; }
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
  allies.forEach(e => { e.sos = 0; if (reason === 'helped' || reason === 'self') { e.resident = 1; e.rescuedAt = S.min; } else if (!e.angry) e.uid = null; e.stay = 0; e.home = { x: FIRE.x + rnd(-60, 60), y: FIRE.y + rnd(-40, 40) }; e.trip = { x: e.home.x, y: e.home.y, stage: 2 }; });
  foes.forEach(e => { e.sosFoe = 0; e.uid = null; e.stay = 0; e.sosPhase = null; if(e.kind==='dog')leaveHunt(e);else e.home={x:e.x,y:e.y}; });
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
    e.sosFoe = id; e.uid = dynId(); e.ringPt = { x: rp.x * T + rnd(-12, 12), y: rp.y * T + rnd(-12, 12) }; if(!dog)e.home={...e.ringPt}; e.sosPhase = 'prep'; e.stay = 1; e.supT = rnd(2, 4); ents.push(e);
  }
  s.act = { id: id, loc: sp[2] || locNear(sp[0], sp[1]).id, x: c.x, y: c.y, where: where, until: S.min + SOS_TIME, start: S.min, dog: dog ? 1 : 0, names: names, pk: 0, seen: 0, nFoes: dog ? 4 : 3, pay: earnings(ri(25, 55) * 10), gift: ['medkit', 'a545', 'antirad', 'grenade', 'cans'][ri(0, 4)] };
  radioNews('SOS! Сталкеры у ' + where + ': «' + (dog ? 'Псы окружили, патроны кончаются!' : 'Бандиты прижали, нужна помощь!') + '»');
  play('siren', undefined, undefined, 0.25);
}
function dirName(x, y) { return locNear(x, y).gen; }
function sosStorm(e,a){
  e.sosPhase=null;e.stay=0;e.crouch=0;
  const centre={x:a.x*T,y:a.y*T};
  if(e.kind!=='dog'){e.home=centre;return;}
  const prey=ents.find(o=>o.sos===a.id && mutantPrey(o));
  if(prey){e.tgt=prey;e.trail=centre;e.scentTime=6;}
}
/* поведение нападающего SOS до штурма; true — кадр обработан здесь */
function sosFoeAI(e, dt) {
  const a = S.sos.act;
  if (!a || e.sosFoe !== a.id) { e.sosPhase = null; return false; }
  if ((e.hitByP || e.hp < e.maxhp * 0.5) && e.sosPhase !== 'retreat') { sosStorm(e, a); return false; }   // ранил игрок или тяжело ранен — отвечает сам
  const c = { x: a.x * T, y: a.y * T };
  if (e.sosPhase === 'retreat') {
    const dest=e.retreatTo||e.home;
    goTo(e,dest.x,dest.y,130,dt);
    if (dst(e.x, e.y, c.x, c.y) > 560 || dE(e,dest)<20) { e.sosFoe = 0; e.uid = null; e.sosPhase = null; e.stay = 0; if(e.kind==='dog')leaveHunt(e);else e.home={x:e.x,y:e.y}; }
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
      goTo(e,e.ringPt.x+Math.cos(e.orb)*20,e.ringPt.y+Math.sin(e.orb)*20,55,dt);
      e.ang += angD(e.ang, ang) * Math.min(1, dt * 3);
      if (chance(dt * 0.15)) play('dog', e.x, e.y, 0.4);
    } else {
      if (dst(e.x, e.y, e.ringPt.x, e.ringPt.y) > 14) goTo(e, e.ringPt.x, e.ringPt.y, 70, dt);
      e.crouch = 1; e.supT -= dt;
      const tg = ents.find(o => o.alive && o.sos === a.id && dE(o, e) < 520 && los(e.x, e.y, o.x, o.y));
      if (tg) { const ta = Math.atan2(tg.y - e.y, tg.x - e.x); e.ang += angD(e.ang, ta) * Math.min(1, dt * 4);
        if (e.supT <= 0 && Math.abs(angD(e.ang, ta)) < 0.2) { e.supT = rnd(2.8, 4.5); const W0 = WP[e.wpn] || WP.w_pm, W = Object.assign({}, W0, { dmg: W0.dmg * 0.3 }); fire(e, e.ang, W, 0.3, tg); /* подавление до штурма */ } }
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
  if (BIG) { fog.fill(0); fogDirty = true; fogRegion = null; S.fog = ''; }   // старая маска разведки не совпадает с новой картой
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
  S.flags.fieldBodies=objs.filter(o=>o.k==='body' && !o.raidBody).map(o=>({...o}));
  delete S.flags.mutantBodies;
  S.dyn.npcs = ents.filter(e => e.alive && e !== P && (e.follow || e.sos || e.sosFoe || e.jobTag || e.traded || e.assisted || e.resident || e.evacuating || (e.inBattle && e.trip) || e.trip?.returnTo || (e.angry && !e.sid))).map(e => ({
    uid: e.uid || (e.uid = dynId()), sid: e.sid || null, kind: e.kind, fac: e.fac, name: e.name, wpn: e.wpn, rank: e.rank,
    x: e.x, y: e.y, hp: e.hp, maxhp: e.maxhp, mag: e.mag,
    ...(e.evacuating ? { evacuation: { sit: e.sit || 0, seat: e.seat || 0, trip: e.trip, shelterOrigin:e.shelterOrigin, shelterSpot:e.shelterSpot } } : {}),
    ...((e.inBattle && e.trip) || e.trip?.returnTo ? {returnTrip:e.trip, seat:e.seat} : {}),
    follow: e.follow ? 1 : 0, wait: e.wait ? 1 : 0, waitAt: e.waitAt || null, hireEnd: e.hireEnd || 0, hirePaid: e.hirePaid || 0,
    sos: e.sos || 0, sosFoe: e.sosFoe || 0, jobTag: e.jobTag || 0, stay: e.stay ? 1 : 0, home: e.home,
    sosPhase: e.sosPhase || null, retreatTo: e.sosPhase==='retreat'?e.retreatTo:undefined, ringPt: e.ringPt || null, traded: e.traded ? 1 : 0, resident: e.resident ? 1 : 0, assisted: e.assisted || undefined, inv: e.traded || e.assisted ? e.inv : undefined, money: e.traded ? e.money : undefined, wcond: e.traded ? e.wcond : undefined, guns:e.traded?e.guns:undefined, rescuedAt: e.rescuedAt
  }));
}
function dynRestore() {
  plusDefaults();
  const v = S.dyn.v || 0;
  remapToMap();
  for (const body of S.flags.fieldBodies || S.flags.mutantBodies || []) objs.push({...body,loot:{...body.loot}});
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
      sos: r.sos, sosFoe: r.sosFoe, jobTag: r.jobTag, stay: r.stay, home: r.home || { x: r.x, y: r.y }, traded: r.traded, resident: r.resident, rescuedAt: r.rescuedAt, sosPhase: r.sosPhase, retreatTo:r.retreatTo, ringPt: r.ringPt });
    if (S.flags.angry && S.flags.angry[r.sid || r.uid]) e.angry = 1;
    if (r.assisted) e.assisted = true;
    if (r.inv && (r.traded || r.assisted)) e.inv = r.inv;
    if (r.traded) { if (r.money != null) e.money = r.money; if (r.wcond) e.wcond = r.wcond; if(r.guns) e.guns=r.guns; }
    if (e.sid === 'sid') {
      const seat = NPCDEF.find(d => d.sid === 'sid');
      Object.assign(e, {x: seat.x*T, y: seat.y*T, hp: seat.hp, maxhp: seat.hp,
        home: {x: seat.x*T, y: seat.y*T}, stay: 1, follow: 0});
    }
    if (r.name) e.name = r.name;
    if (r.mag != null) e.mag = r.mag;
    if (e.follow) { e.sit = 0; e.trip = null; }
    if(r.returnTrip)Object.assign(e,{trip:r.returnTrip,seat:r.seat,sit:0});
    if (r.evacuation) Object.assign(e, r.evacuation, { evacuating: true, shelterOrigin:r.evacuation.shelterOrigin || e.home });
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
  const t=mutantTarget(e,dt,night()?420:260,650);
  if(!t){e.state='lurk';roamDen(e,dt,40);return;}
  if(e.state==='lurk'){
    e.state='stalk';play('sucker',e.x,e.y,.6);
  }
  const a=Math.atan2(e.trail.y-e.y,e.trail.x-e.x),d=dE(e,e.trail);
  if (e.state === 'flee') {
    goTo(e,e.home.x,e.home.y,150,dt);
    if (e.st <= 0) { e.state = 'stalk'; e.cool = 1; }
    return;
  }
  if (e.state === 'stalk') {
    e.ang += angD(e.ang, a) * Math.min(1, dt * 5);
    const side = Math.sin(S.min * 0.9 + e.id) * 0.9;
    const flank={x:e.trail.x+Math.cos(a+1.57)*side*70,y:e.trail.y+Math.sin(a+1.57)*side*70};
    const skirt=d>120 && clearWalk(e.trail.x,e.trail.y,flank.x,flank.y,e.r);
    mutantApproach(e,skirt?flank:e.trail,d>120?135:175,dt);
    if (e.cool <= 0 && canStrike(e,t,46)) { e.state = 'strike'; e.st = 0.35; play('sucker', e.x, e.y, 1); }
    return;
  }
  if (e.state === 'strike') {
    e.ang=a;mutantApproach(e,e.trail,60,dt);
    if (e.st <= 0) {
      if (canStrike(e,t,50)) {
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
  sosTick(); campaignTick();
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
  if (!BIG && e.kind === 'sucker') { S.q3.sucker = 2; bulletin('Кровосос в хлеву убит. Возвращайся к Волку.'); }
  if (e.follow) { bulletin('Погиб напарник ' + e.name + '.'); }
}
function plusInteract(cand) {
  const d = dE(P, campOf(P));
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
  if (opt.price != null || opt.dim != null) c.appendChild(el('span','trade-label',itemName(id)));
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

/* Разговор: карточки участников, история и ответы. */
function drawDialog2() {
  const box = el('div', 'dlg');
  function identity(c){
    const side = el('aside', 'dlg-who');
    if (!c.record) side.appendChild(portraitFor(c));
    side.appendChild(el('div', 'pn', c.n));
    side.appendChild(el('div', 'pm', [c.rank, c.grp].filter(Boolean).join(' · ')));
    if (c.att) side.appendChild(el('div', 'pa' + (/враг/.test(c.att) ? ' foe' : /друг|свой/.test(c.att) ? ' pal' : ''), c.att));
    if (c.money !== undefined) side.appendChild(el('div', 'price', c.money + ' RU'));
    return side;
  }
  box.appendChild(identity(meCard()));
  const main = el('div', 'dlg-main');
  const L = el('div', 'dlg-lines');
  L.setAttribute('role','log');L.setAttribute('aria-label','История разговора');L.tabIndex=0;
  for(const line of panel.lines){
    const entry=el('p',line.s);
    if(line.s!=='sys')entry.append(el('strong','',line.name || (line.s==='me'?'Меченый':panel.card.n)));
    entry.append(document.createTextNode(line.t));L.append(entry);
  }
  main.appendChild(L);
  const O = el('div', 'dlg-opts');
  panel.opts().forEach((o, i) => O.appendChild(btn((o.k || '') + ' opt', (i + 1) + '. ' + o.t, () => {
    if (o.close) { closePanel(); if (o.fn) o.fn(); return; }
    panel.lines.push({ s: 'me', t: o.t });
    o.fn();
    if (panel && (panel.kind === 'dialog' || panel.kind === 'trader')) { refresh(); const ln = pbody.querySelector('.dlg-lines'); if (ln) ln.scrollTop = ln.scrollHeight; }
  }, o.d)));
  main.appendChild(O);
  box.append(main,identity(panel.card));
  pbody.appendChild(box);
  L.scrollTop=L.scrollHeight;
}

/* ---------- КПК: карта ~65% + выбранное задание ~35%, вкладки снизу ---------- */
const PDA_TABS2 = [['map', 'Карта и задания'], ['log', 'Журнал'], ['stat', 'Данные']];
// The viewport stores its centre in map tiles. Resizing the panel or opening a
// quest card therefore keeps the same place under the player's finger.
function mountPdaMap(w,cv,state,targets,pick,scaleLabel) {
  const view=state.mapView, touches=new Map();
  let fit,k,width,height,left,top,paintFrame=0,press=null;
  function layout(){
    const W=w.clientWidth,H=w.clientHeight;
    fit=Math.min(W/PW,H/MH); k=fit*view.zoom;
    width=PW*k;height=MH*k;
    const place=(size,screen,center)=>size<=screen?(screen-size)/2:clamp(screen/2-center*k,screen-size,0);
    left=place(width,W,view.x);top=place(height,H,view.y);
    view.x=(W/2-left)/k;view.y=(H/2-top)/k;
    Object.assign(cv.style,{width:width+'px',height:height+'px',transform:'translate('+left+'px,'+top+'px)'});
    scaleLabel.textContent='×'+Number(view.zoom.toFixed(1));
  }
  function paint(){
    paintFrame=0;if(!cv.isConnected || !w.clientWidth || !w.clientHeight)return;
    layout();
    const px=Math.min(devicePixelRatio||1,2,3000/Math.max(width,height));
    cv.width=Math.round(width*px);cv.height=Math.round(height*px);
    const out={};drawMapTo(cv.getContext('2d'),cv.width/PW,state.f.loc,{...state.f,sel:targets,u:px,out});
    state.mapLabels=out.labels;
  }
  function schedule(){if(!paintFrame)paintFrame=requestAnimationFrame(paint);}
  function point(e){const b=w.getBoundingClientRect();return {x:e.clientX-b.left-w.clientLeft,y:e.clientY-b.top-w.clientTop};}
  function change(from,to,zoom){
    const x=(from.x-left)/k,y=(from.y-top)/k;
    view.zoom=clamp(zoom,1,12);
    view.x=x+(w.clientWidth/2-to.x)/(fit*view.zoom);
    view.y=y+(w.clientHeight/2-to.y)/(fit*view.zoom);
    layout();
  }
  function gesture(){
    const [a,b]=touches.values();
    return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}:{...a,d:1};
  }
  w.addEventListener('pointerdown',e=>{
    if(e.button!==0||!k)return;
    const p=point(e);touches.set(e.pointerId,p);w.setPointerCapture(e.pointerId);
    press=touches.size===1?p:null;
  });
  w.addEventListener('pointermove',e=>{
    if(!touches.has(e.pointerId))return;
    const a=gesture(),p=point(e);touches.set(e.pointerId,p);const b=gesture();
    if(press && Math.hypot(p.x-press.x,p.y-press.y)>5)press=null;
    change(a,b,view.zoom*b.d/a.d);
  });
  function end(e){
    if(!touches.delete(e.pointerId))return;
    const p=point(e);
    if(e.type==='pointerup' && press && Math.hypot(p.x-press.x,p.y-press.y)<=5){
      const near=qTargets().map(t=>{const m=worldMapPoint(t);return {id:t.qid,d:Math.hypot(m.x/T*k+left-p.x,m.y/T*k+top-p.y)};})
        .filter(m=>m.d<=18).sort((a,b)=>a.d-b.d);
      if(near.length)pick([...new Set(near.map(m=>m.id))]);
    }
    press=null;if(!touches.size)schedule();
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])w.addEventListener(type,end);
  w.addEventListener('wheel',e=>{e.preventDefault();if(k){const p=point(e);change(p,p,view.zoom*Math.exp(-clamp(e.deltaY,-200,200)*.003));schedule();}},{passive:false});
  const observer=new ResizeObserver(()=>{if(w.isConnected)schedule();});
  requestAnimationFrame(()=>{if(w.isConnected){observer.observe(w);schedule();}});
  state.unmountMap=()=>{observer.disconnect();cancelAnimationFrame(paintFrame);};
}

function drawPda2() {
  if (panel.tab !== 'map') { drawPda(); return; }
  if (!panel.f) panel.f = { ppl: 1, cache: 1, loc: 1 };
  const all = qList(), act = all.filter(q => q.st === 'a'), done = all.filter(q => q.st !== 'a');
  if (!panel.qsel || !all.some(q => q.id === panel.qsel)) panel.qsel = S.trackedQuestId || (act[0] && act[0].id) || null;
  const box = el('div', 'kpk');
  // Начинаем с общего вида, центр хранится в координатах мира.
  const mapc = el('div', 'kpk-map');
  const view=panel.mapView ||= {zoom:1,x:PW/2,y:MH/2};
  const selT=qTargets().filter(t=>t.qid===panel.qsel);
  const bar=el('div','kpk-bar'), scaleLabel=el('span','zl','×'+view.zoom);
  const zoom=n=>{view.zoom=clamp(n,1,12);refresh();};
  const focus=p=>{if(!p)return;const m=worldMapPoint(p);view.x=m.x/T;view.y=m.y/T;zoom(Math.max(3,view.zoom));};
  bar.appendChild(btn('chip zb','−',()=>zoom(view.zoom/1.6)));
  bar.appendChild(scaleLabel);bar.appendChild(btn('chip zb','+',()=>zoom(view.zoom*1.6)));

  bar.appendChild(btn('chip','К игроку',()=>focus(P)));
  bar.appendChild(btn('chip','К цели',()=>focus(selT[0]),!selT.length));
  [['ppl', 'Люди'], ['cache', 'Тайники'], ['loc', 'Подписи']].forEach(f => bar.appendChild(btn('chip' + (panel.f[f[0]] ? ' on' : ''), f[1], () => { panel.f[f[0]] = !panel.f[f[0]]; refresh(); })));
  if (BIG) bar.prepend(el('span','zl', inGarbage(P.x/T,P.y/T) ? 'Свалка' : P.x < WEST*T ? 'Малая Зона' : 'Кордон'));
  mapc.appendChild(bar); markScrollX(bar);
  const w = el('div', 'mapwrap kpk-wrap'), cv2 = el('canvas'); cv2.id = 'bigmap';
  w.appendChild(cv2); mapc.appendChild(w);
  mountPdaMap(w,cv2,panel,selT,ids=>{
    panel.qsel=ids[0];panel.markerChoices=ids.length>1?ids:null;refresh();
  },scaleLabel);
  mapc.appendChild(mapLegend());
  box.appendChild(mapc);
  // задания
  const qc = el('div', 'kpk-q');
  if (!all.length) qc.appendChild(el('p', 'note', 'Заданий нет. Поговори с Сидоровичем в бункере.'));
  if(panel.markerChoices) {
    const choices=el('div','kpk-list');
    for(const id of panel.markerChoices){const q=act.find(q=>q.id===id);if(q)choices.appendChild(btn('qrow',q.n,()=>{panel.qsel=id;panel.markerChoices=null;refresh();}));}
    qc.appendChild(choices);
  }
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
  eq.appendChild(el('h3','pack-heading','Снаряжение'));
  const rack = el('div','gear-rack');
  const slot = (label,id) => {
    const field = el('div','gear-slot');
    field.appendChild(el('span','sl',label));
    if (id) {
      const cell = itemCell(id,{cond:condOf(id),on:id===S.weapon,sel:panel.sel===id && !panel.copy,
        fn:()=>{panel.sel=id;panel.copy=0;refresh();}});
      cell.title=itemName(id); field.appendChild(cell);
    } else field.appendChild(el('span','gear-empty','—'));
    return field;
  };
  rack.appendChild(slot('Костюм',S.armor)); rack.appendChild(slot('Нож','knife'));
  for (const [key,label] of Object.entries(KIT_LABELS)) rack.appendChild(slot(label,kitItem(key)));
  eq.appendChild(rack);
  eq.appendChild(btn('wide',S.weapon==='hands'?'Руки свободны':'Освободить руки',()=>{setWeapon('hands');refresh();},S.weapon==='hands'));
  const belt = el('div', 'slot beltslot'); belt.appendChild(el('span', 'sl', 'Пояс'));
  const br = el('div', 'beltrow');
  for (let i = 0; i < 3; i++) { const id = S.belt[i]; br.appendChild(id ? itemCell(id, { on: 1, sel: panel.sel === id, fn: () => { panel.sel = id; panel.copy=0; refresh(); } }) : el('div', 'icell empty')); }
  belt.appendChild(br); eq.appendChild(belt);
  const wt = weight(), st = el('div', 'inv-stats');
  const wb = el('div', 'wbar'); const wi = el('i'); wi.style.width = Math.min(100, wt / carryLimit() * 100) + '%'; if (wt > carryLimit()) wb.classList.add('over'); wb.appendChild(wi);
  st.appendChild(el('div', 'ds', 'Вес ' + showKg(wt) + ' / ' + carryLimit() + ' кг')); st.appendChild(wb);
  st.appendChild(el('div','ds','Пустой рюкзак · '+showKg(PACK_KG)+' кг'));
  st.appendChild(el('div', 'ds', 'Защита ' + Math.round(def() * 100) + '% · Радиация ' + Math.round(S.rad)));
  st.appendChild(el('div', 'ds', 'Сытость ' + Math.round(S.food) + (S.bleed ? ' · кровотечение' : '') + ' · ' + S.money + ' RU'));
  eq.appendChild(st);
  box.appendChild(eq);
  // сетка
  const gw = el('div', 'inv-grid');
  const ids = Object.keys(S.inv).filter(id => ITEMS[id] && cnt(id) > wornCount(id));
  const used=packCells(S.inv);
  gw.appendChild(el('h3','pack-heading','Рюкзак · '+used+' / '+PACK_CELLS+' ячеек · '+showKg(wt)+' / '+carryLimit()+' кг'));
  const g = el('div', 'igrid pack-grid');
  for (const id of ids) {
    const count=cnt(id), stack=stackLimit(id);
    for(let start=wornCount(id);start<count;start+=stack) {
      const selected=panel.sel===id && (panel.copy || 0)===start;
      const cd=isGun(id)?Math.round(gunCopy(id,start).cond):null;
      const cell=itemCell(id,{q:Math.min(count-start,stack),cond:cd,sel:selected,
        fn:()=>{panel.sel=id; panel.copy=start; panel.hint=''; refresh();}});
      cell.dataset.item=id;
      const [w,h]=footprint(id);
      cell.style.gridColumn='span '+w; cell.style.gridRow='span '+h;
      cell.title=itemName(id)+(cd==null?'':' · '+cd+'%');
      g.appendChild(cell);
    }
  }
  for (let i=used;i<PACK_CELLS;i++) g.appendChild(el('div','icell empty'));
  gw.appendChild(g); box.appendChild(gw);
  // описание
  const dv = el('div', 'inv-detail');
  const id = panel.sel, copy=Math.min(panel.copy || 0,Math.max(0,cnt(id)-1));
  if (!id || (id !== 'knife' && !has(id))) dv.appendChild(el('p', 'note', 'Выбери вещь в рюкзаке и нажми «В слот». В игре касание панели оружия перебирает снаряжение.'));
  else {
    const it = id === 'knife' ? { n: 'Нож', w: 0.3 } : ITEMS[id];
    dv.appendChild(el('div', 'nm', it.n + (isGun(id) && cnt(id)>1?' · '+(copy+1)+' из '+cnt(id):'')));
    const rows = el('div', 'cmp');
    const line = (k, v, d) => { const r = el('div', 'cr'); r.appendChild(el('span', 'ck', k)); r.appendChild(el('span', 'cv', v)); if (d) r.appendChild(el('span', 'cd ' + (d > 0 ? 'up' : 'dn'), (d > 0 ? '+' : '') + d)); rows.appendChild(r); };
    if (DETECTORS[id]) line('Радиус поиска', it.metres + ' м');
    else if (WP[id]) {
      const W = WP[id], C = WP[S.weapon], same = S.weapon === id && !copy;
      line('Урон', W.dmg + (W.pellets ? '×' + W.pellets : ''), same || !C ? 0 : Math.round(W.dmg * (W.pellets || 1) - C.dmg * (C.pellets || 1)));
      if (isGun(id)) { line('Магазин', gunCopy(id,copy).mag+' / '+W.mag, same || !C || C.melee ? 0 : W.mag - C.mag); line('Дальность', W.range, same || !C || C.melee ? 0 : W.range - C.range); line('Состояние', Math.round(gunCopy(id,copy).cond)+'%'); }
      if (!same && C) rows.appendChild(el('div', 'ds lite', 'Сравнение с тем, что в руках: ' + itemName(S.weapon)));
    } else if (it.armor) {
      line('Предел веса',carryLimit(id)+' кг');
      const cur = ITEMS[S.armor] ? ITEMS[S.armor].armor : 0;
      line('Защита', Math.round(it.armor * 100) + '%', S.armor === id ? 0 : Math.round((it.armor - cur) * 100));
    }
    if (FOOD[id]) line('Сытость', '+' + FOOD[id]);
    if (it.heal) line('Лечение', '+' + it.heal);
    if (ARTFX[id]) rows.appendChild(el('div', 'ds', ARTFX[id]));
    line('Вес предмета', showKg(itemW(id)+(isGun(id)?loadedMass(id,gunCopy(id,copy)):0))+' кг');
    line('Размер',footprint(id).join(' × '));
    dv.appendChild(rows);
    if (it.d) dv.appendChild(el('div', 'ds lite', it.d));
    const row = el('div', 'btnrow');
    const slotKey=kitSlot(id), mounted=slotKey && kitItem(slotKey)===id && !copy;
    if (slotKey && !mounted) row.appendChild(btn('go','В слот',()=>{
      mountGear(id,copy,false); panel.copy=0; refresh();
    }));
    if ((WP[id] || DETECTORS[id]) && (S.weapon !== id || copy)) row.appendChild(btn('go','Взять в руки',()=>{
      if (slotKey) mountGear(id,copy,true); else setWeapon(id);
      panel.copy=0; refresh();
    }));
    if (mounted) row.appendChild(btn('wide','В рюкзак',()=>{
      if (packCells(S.inv,id)>PACK_CELLS) panel.hint='Освободи место в рюкзаке.';
      else stowGear(id);
      refresh();
    }));
    if (it.armor && S.armor !== id) row.appendChild(btn('go', 'Надеть', () => { if(weight()>carryLimit(id)) panel.hint='Сначала снизь вес до '+carryLimit(id)+' кг.'; else S.armor=id; refresh(); }));
    if (id==='energy' || it.heal !== undefined || it.rad !== undefined || FOOD[id]) row.appendChild(btn('go', id==='energy' ? 'Выпить' : FOOD[id] ? 'Съесть' : 'Применить', () => { useItem(id); refresh(); }));
    if (ARTFX[id]) row.appendChild(btn('go', beltCount(id) ? 'Снять с пояса' : 'На пояс', () => {
      if (beltCount(id)) {
        if (packCells(S.inv,id)>PACK_CELLS) panel.hint='Освободи место в рюкзаке.';
        else S.belt.splice(S.belt.indexOf(id),1);
      }
      else if (S.belt.length >= 3) panel.hint = 'Пояс занят: сначала сними другой артефакт.';
      else S.belt.push(id);
      refresh();
    }));
    if (id !== 'knife' && !it.quest && copy>=wornCount(id) && cnt(id)>wornCount(id)) row.appendChild(btn('wide','Выбросить',()=>{
      const q=isGun(id)||it.armor?1:Math.min(stackLimit(id),cnt(id)-wornCount(id));
      const gun=removePacked(id,q,copy);
      const sack={k:'body',kind:'sack',x:P.x,y:P.y,ang:0,fac:'loner',name:'Рюкзак',seed:1,loot:{},t:S.min,scatterStart:performance.now()};
      putStock(sack,id,q,gun); objs.push(sack); groundItems(sack);
      panel.sel=null; panel.copy=0; refresh();
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
  if (e) return Object.keys(e.inv).filter(id => ITEMS[id] && e.inv[id]>0).map(id => ({
    id,q:1,p:Math.max(purchaseCost((ITEMS[id].price ?? ITEMS[id].sell ?? 1)*(S.rep>=20?1.1:1.3)),sellPrice(id,false)+1),c:e.inv[id],cond:isGun(id)?vendorGun(e,id,0).cond:null
  }));
  return STOCK.map(s=>({...s,p:purchaseCost(s.p),c:99,cond:isGun(s.id)?TRADER_WCOND:null}));

}
function sellUnit(id) { return ITEMS[id].ammo ? Math.min(10, cnt(id)) : 1; }
function vendorGun(e,id,offset) {
  return e?.guns?.[id]?.at(-1-offset) || {cond:stockCond(e,id),mag:0};
}
function tradePrice(id,e,offset=0) {
  const c=isGun(id)?gunCopy(id,Math.max(0,cnt(id)-1-offset)).cond:null;
  return Math.max(1,Math.floor(sellPrice(id,!!e)*(c==null?1:Math.max(.3,c/100))));
}
function saleTotal(id,q,e) {
  if (!isGun(id)) return tradePrice(id,e)*q;
  let sum=0; for(let i=0;i<q;i++) sum+=tradePrice(id,e,i);
  return sum;
}
/* почему вещь нельзя продать сейчас — короткий знак на ячейке вместо затемнения до черноты */
function sellWhy(id, e, o) {
  const it = ITEMS[id]; if (!it) return null;
  if (it.quest) return 'квест';
  if (o && o.sell[id]) return 'в корз.';
  if (kitSlot(id) && kitItem(kitSlot(id))===id) return id===S.weapon?'в руках':'в слоте';
  if (id === S.armor) return 'надето';
  if (beltCount(id)) return 'пояс';
  if (e && it.armor) return 'не берёт';
  return null;
}
function sellable(id, e) {
  const it = ITEMS[id]; if (!it || it.quest || !(S.inv[id] > 0)) return 0;
  if (e && it.armor) return 0;
  return Math.max(0,cnt(id)-wornCount(id));
}
function offerSum(e) {
  const o = panel.offer, st = tradeStock(e);
  let buy=0,sell=0,kg=weight();
  const inv={...S.inv};
  for(const [id,n] of Object.entries(o.sell)) {
    const q=Math.min(n*(ITEMS[id].ammo?10:1),cnt(id));
    sell+=saleTotal(id,q,e); inv[id]=cnt(id)-q; kg-=itemW(id)*q;
    if(isGun(id)) for(let i=0;i<q;i++) kg-=loadedMass(id,gunCopy(id,cnt(id)-1-i));
  }
  for(const [id,n] of Object.entries(o.buy)) {
    const s=st.find(x=>x.id===id); if(!s) continue;
    const q=s.q*n; buy+=s.p*n; inv[id]=(inv[id] || 0)+q; kg+=itemW(id)*q;
    if(isGun(id)) for(let i=0;i<n;i++) kg+=loadedMass(id,vendorGun(e,id,i));
  }
  return {buy,sell,net:sell-buy,wAfter:Math.round(kg*1000)/1000,cells:packCells(inv,null,incomingKit(Object.keys(o.buy)))};

}
function tradeCheck(e) {
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  if (!Object.keys(o.buy).length && !Object.keys(o.sell).length) return 'Предложение пустое.';
  for (const [id, n] of Object.entries(o.buy)) { const s = st.find(x => x.id === id); if (!s || s.c < n) return 'У торговца нет столько: ' + itemName(id) + '.'; }
  for (const [id, n] of Object.entries(o.sell)) {
    const u = ITEMS[id].ammo ? 10 : 1; if (n <= Math.ceil(sellable(id,e)/u)) continue;
    if (cnt(id) <= 0) return 'У тебя больше нет: ' + itemName(id) + '.';
    if (id === S.weapon) return itemName(id) + ' в руках: сначала возьми другое оружие.';
    if (kitSlot(id) && kitItem(kitSlot(id))===id) return 'Сначала убери '+itemName(id)+' в рюкзак.';
    if (id === S.armor) return itemName(id) + ' надет: сначала сними.';
    if (beltCount(id)) return itemName(id) + ' на поясе: сначала сними.';
    return 'Это нельзя продать: ' + itemName(id) + '.';
  }
  if (sm.net < 0 && S.money < -sm.net) return 'Не хватает ' + (-sm.net - S.money) + ' RU.';
  if (sm.net > 0 && e && e.money < sm.net) return 'У него не хватает денег: есть ' + e.money + ' RU.';
  if (Object.keys(o.buy).length) return capacityError(sm.wAfter,sm.cells);
  return '';
}
function tradeDo(e) {
  const err = tradeCheck(e); if (err) { panel.hint = err; refresh(); return; }
  const o = panel.offer, st = tradeStock(e), sm = offerSum(e);
  // Забираем оплаченный товар из прежнего запаса до пополнения товарами игрока.
  const incoming={loot:{},guns:{}};
  for(const [id,n] of Object.entries(o.buy)) {
    const q=st.find(s=>s.id===id).q*n;
    if(isGun(id)) for(let i=0;i<q;i++) {
      putStock(incoming,id,1,vendorGun(e,id,0)); e?.guns?.[id]?.pop();
    } else putStock(incoming,id,q);
    if(e) { e.inv[id]-=q; if(!e.inv[id]) delete e.inv[id]; }
  }
  for(const [id,n] of Object.entries(o.sell)) {
    const q=Math.min(n*(ITEMS[id].ammo?10:1),cnt(id));
    if (isGun(id)) for(let i=0;i<q;i++) {
      const gun=removePacked(id);
      if(e) ((e.guns ||= {})[id] ||= []).push(gun);
    } else take(id,q);
    if(e) e.inv[id]=(e.inv[id] || 0)+q;
  }
  for(const [id,q] of Object.entries(incoming.loot)) {
    if (isGun(id)) for(const gun of incoming.guns[id]) addPacked(id,1,gun);
    else addPacked(id,q);
  }
  S.money += sm.net; if (e) e.money -= sm.net; if (e) e.traded = 1;   // инвентарь и деньги этого NPC теперь сохраняются
  panel.offer = { buy: {}, sell: {} }; play('pick');
  panel.hint = 'Сделка закрыта: ' + (sm.net >= 0 ? 'получено ' + sm.net : 'доплачено ' + (-sm.net)) + ' RU.';
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
  const me = el('div', 'tr-who'); me.appendChild(portraitFor(meCard())); const mt = el('div'); mt.appendChild(el('div', 'pn', 'Меченый')); mt.appendChild(el('div', 'price', S.money + ' RU')); me.appendChild(mt);
  const sw = el('div', 'tr-switch');
  sw.appendChild(btn('chip' + (panel.side === 'mine' ? ' on' : ''), 'Мои вещи', () => { panel.side = 'mine'; refresh(); }));
  sw.appendChild(btn('chip' + (panel.side === 'their' ? ' on' : ''), 'Торговец', () => { panel.side = 'their'; refresh(); }));
  head.appendChild(sw);
  const th = el('div', 'tr-who r'); const c = e ? cardOf(e) : SIDCARD(); const tt = el('div'); tt.appendChild(el('div', 'pn', c.n)); tt.appendChild(el('div', 'price', e ? e.money + ' RU' : 'Торговец')); th.appendChild(tt); th.appendChild(portraitFor(c));
  box.appendChild(head);
  // мои вещи
  const mine = el('div', 'tr-col mine'); mine.appendChild(me); mine.appendChild(el('h3', 'h3', 'Мой рюкзак · продажа'));
  const gm = el('div', 'igrid');
  Object.keys(S.inv).filter(id => ITEMS[id] && S.inv[id] > 0).forEach(id => {
    const left = sellable(id, e) - (o.sell[id] || 0) * (ITEMS[id].ammo ? 10 : 1);
    gm.appendChild(itemCell(id, { q: cnt(id), cond: isGun(id)?Math.round(gunCopy(id,Math.max(0,cnt(id)-1-(o.sell[id] || 0))).cond):null, price: sellable(id, e) ? tradePrice(id, e,o.sell[id] || 0) * sellUnit(id) : null, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : sellWhy(id, e, o),
      fn: () => { o.sell[id] = (o.sell[id] || 0) + 1; panel.hint = ''; refresh(); } }));
  });
  mine.appendChild(gm);
  // товар торговца
  const their = el('div', 'tr-col their'); their.appendChild(th); their.appendChild(el('h3', 'h3', 'Товары · покупка'));
  const gt = el('div', 'igrid');
  if (!st.length) their.appendChild(el('p', 'note', 'Ему нечего продать.'));
  st.forEach(s => { const left = s.c - (o.buy[s.id] || 0); gt.appendChild(itemCell(s.id, { q: s.q > 1 ? s.q : (e ? s.c : 0), price: s.p, cond: s.cond, dim: left <= 0, disabled: left <= 0, why: left > 0 ? null : (o.buy[s.id] ? 'в корз.' : has(s.id) ? 'есть' : 'нет'), fn: () => { o.buy[s.id] = (o.buy[s.id] || 0) + 1; panel.hint = ''; refresh(); } })); });
  their.appendChild(gt);
  // корзина
  const cart = el('div', 'tr-cart');
  const lineFor = (side, id, n) => {
    const s = side === 'buy' ? st.find(x => x.id === id) : null;
    const q = side === 'buy' ? (s?.q || 1) * n : Math.min(n * (ITEMS[id].ammo ? 10 : 1), cnt(id));
    const p = side === 'buy' ? (s?.p || 0) * n : saleTotal(id,q,e);
    const b = btn('cline ' + side, '', () => { o[side][id]--; if (o[side][id] <= 0) delete o[side][id]; refresh(); });
    const cd = side === 'buy' ? s?.cond : (isGun(id)&&n===1?Math.round(gunCopy(id,cnt(id)-1).cond):null);
    b.appendChild(itemIcon(id)); b.appendChild(el('span', 'cn', itemName(id) + (q > 1 ? ' ×' + q : '') + (cd != null ? ' · ' + cd + '%' : ''))); b.appendChild(el('span', 'cp', (side === 'buy' ? '−' : '+') + p)); b.setAttribute('aria-label', 'Убрать из сделки: ' + itemName(id));
    return b;
  };
  const cs = el('div', 'cside'); cs.appendChild(el('div', 'ch', 'Отдаю')); Object.entries(o.sell).forEach(([id, n]) => cs.appendChild(lineFor('sell', id, n))); if (!Object.keys(o.sell).length) cs.appendChild(el('div', 'ce', '—'));
  const cb = el('div', 'cside'); cb.appendChild(el('div', 'ch', 'Беру')); Object.entries(o.buy).forEach(([id, n]) => cb.appendChild(lineFor('buy', id, n))); if (!Object.keys(o.buy).length) cb.appendChild(el('div', 'ce', '—'));
  const cl = el('div', 'clines'); cl.appendChild(cs); cl.appendChild(cb); cart.appendChild(cl);
  const tot = el('div', 'tr-total');
  const err = tradeCheck(e);
  tot.appendChild(el('div', 'tsum', 'Отдаю ' + sm.sell + ' · беру ' + sm.buy));
  tot.appendChild(el('div', 'tnet ' + (sm.net >= 0 ? 'plus' : 'minus'), sm.net===0?(sm.buy||sm.sell?'Равный обмен':'Сделка не выбрана'):sm.net>0?'К получению: '+sm.net+' RU':'Доплата: '+(-sm.net)+' RU'));
  tot.appendChild(el('div', 'twt' + (sm.wAfter > carryLimit() ? ' over' : ''), 'Вес после: ' + showKg(sm.wAfter) + ' / ' + carryLimit() + ' кг'));
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
function drawLocker() {
  const stock=personalStock(), shell=el('div','locker-panel');
  shell.appendChild(el('p','locker-status','Вес рюкзака · '+showKg(weight())+' / '+carryLimit()+' кг · '+packCells(S.inv)+' / '+PACK_CELLS+' ячеек. Один ящик для обеих баз.'));
  const sides=el('div','locker-sides');
  function side(deposit) {
    const col=el('section','locker-side '+(deposit?'mine':'their'));
    col.appendChild(el('h3','pack-heading',deposit?'Мой рюкзак':'Личный ящик'));
    const contents=deposit?S.inv:stock.loot;
    let rows=0;
    for(const [id,count] of Object.entries(contents)) {
      if (!ITEMS[id] || count<=0) continue;
      const total=isGun(id)?count:1;
      for(let i=0;i<total;i++) {
        const gun=isGun(id)?(deposit?gunCopy(id,i):stock.guns[id]?.[i] || {cond:80,mag:0}):null;
        const available=deposit?sellable(id,null):count;
        const fixed=deposit && (available<=0 || (isGun(id) && wornCount(id)>0 && i===0));
        const row=el('div','locker-row');
        row.appendChild(itemIcon(id));
        const label=el('div','locker-item',itemName(id));
        label.appendChild(el('small','',gun?Math.round(gun.cond)+'% · '+gun.mag+' патр.':count+' шт. · '+showKg(itemW(id))+' кг/шт.'));
        row.appendChild(label);
        const action=deposit?'Положить':'Забрать';
        const move=n=>{
          let moved=0;
          if(deposit) {
            if(fixed || n>sellable(id,null)) return;
            const copy=removePacked(id,n,i); putStock(stock,id,n,copy); moved=n;
          } else if(gun) {
            if(receiveError(id,1,gun)) return;
            stock.guns[id]?.splice(i,1); if(--stock.loot[id]===0) {delete stock.loot[id];delete stock.guns[id];}
            addPacked(id,1,gun); moved=1;
          } else moved=collectStock(stock,id,n);
          panel.hint=(deposit?'В ящик: ':'В рюкзак: ')+itemName(id)+' ×'+moved+'.';
          if(!save(true)) panel.hint+=' Не удалось записать сохранение.';
          refresh();
        };
        const err=deposit?'':receiveError(id,1,gun);
        const one=btn('chip',fixed?'При себе':err?'Не влезает':action,()=>move(1),fixed||!!err);
        if(err) one.title=err; row.appendChild(one);
        if(!gun && available>1) row.appendChild(btn('chip','×'+available,()=>move(available),fixed||!!err));
        col.appendChild(row); rows++;
      }
    }
    if(!rows) col.appendChild(el('p','note',deposit?'Рюкзак пуст.':'Ящик пуст.'));
    return col;
  }
  sides.append(side(true),side(false)); shell.appendChild(sides); pbody.appendChild(shell);
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
  if (e === P && DETECTORS[S.weapon]) return false;
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
  if(BIG)return;
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
  ctx.restore();
}
function pickUp(o) {
  const err=receiveError(o.pick,1); if(err) { msg(err,'bad'); return; }
  addPacked(o.pick, 1); S.flags['pk_' + o.pick] = 1;
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
  const worn=gunsBelow(70);
  const cost=worn.reduce((sum,gun)=>sum+Math.ceil((70-gun.cond)*6),0);
  return worn.length ? [{ t: 'Подлатать оружие до 70% · ' + cost + ' RU', k: 'key', d: S.money < cost, fn: () => { S.money -= cost; repairCopies(worn,70); sys('Оружие подлатано до 70%. Полный ремонт — у Сидоровича.'); } }]
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

  if (!S.flags.reachedExit) { S.flags.reachedExit = 1; news('Дошёл до северного перехода на Свалку.'); save(true); }
  msg(BIG ? 'За поворотом начинается дорога к кладбищу техники.' : 'Северный переход.', 'say');
}
function interactRC1(cand) {
  if (MAP_ID !== 'rc1') return;
  if(BIG){
    storyPrompt(cand);
    const gate=locPt('exit','gate'),d=dE(P,gate);
    if(d<90)cand(d,{k:'exit',label:'Сверить маршрут'});
    return;
  }
  for (const o of objs) if (o.pick) { const d = dst(P.x, P.y, o.x + o.w / 2, o.y + o.h / 2); if (d < 44) cand(d - 15, { k: 'pick', o: o, label: 'Взять: ' + ITEMS[o.pick].n }); }
  const g = locPt('village', 'generator'), dg = dst(P.x, P.y, g.x, g.y);
  if (dg < 56) cand(dg - 5, { k: 'genset', label: q5().st === 'completed' ? 'Верстак у генератора' : 'Генератор' });
  const ex = locPt('exit', 'gate'), de = dst(P.x, P.y, ex.x, ex.y);
  if (de < 90) cand(de, { k: 'exit', label: BIG?'Сверить маршрут':'Переход на Свалку' });
}

// Authored dialogue, in performance order. An empty speaker is a stage direction.
const CORDON_SCRIPT = {
  crash: [
    ["Лис", "Ну вот, а я уж было дальше пошёл. Слышишь меня? Как звать-то тебя?"],
    ["Меченый", "Там… ещё люди."],
    ["Лис", "Я кузов проверил. Один ты остался. Давай руку мне на шею. За рукав отпусти, обоих ведь уронишь."],
    ["Меченый", "Кто ты?"],
    ["Лис", "Лис. Остальное после, тут опять воздух дрожит."],
  ],
  wake: [
    ["Сидорович", "Пей понемногу. Сам сесть сможешь?"],
    ["Меченый", "Попробую. А где тот, который меня вытащил?"],
    ["Сидорович", "Лис? Ушёл давно. Четыре часа ты у меня тут отлёживался. Давай знакомиться. Я Сидорович. А к тебе как обращаться?"],
    ["Меченый", "Я… не помню."],
    ["Сидорович", "А в грузовике как оказался, помнишь?"],
    ["", "Меченый качает головой. Сидорович возвращает ему КПК. На экране открыто единственное задание — «Убить Стрелка»."],
    ["Меченый", "Это моё?"],
    ["Сидорович", "Лис у тебя во внутреннем кармане нашёл. Больше при тебе ничего не было. Стрелок-то хоть знаком?"],
    ["Меченый", "Имя вижу. А лица вспомнить не могу. Ты его знаешь?"],
    ["Сидорович", "Слыхал кое-что. Рукав подними, на локте кровь проступила… А это что у тебя за метка такая?"],
    ["", "На предплечье у героя татуировка. Он проводит по ней пальцем, будто видит впервые."],
    ["Сидорович", "Ну, будешь пока Меченым. Надо же тебя как-то людям представить."],
    ["Меченый", "Пусть Меченый. Тебе известно что-то о Стрелке?"],
    ["Сидорович", "Давай договоримся. Ты мне поможешь, а я сведу тебя с человеком, который со Стрелком пересекался. Идёт?"],
    ["Меченый", "Смотря что тебе нужно."],
    ["Сидорович", "Есть тут сталкер, Шустрым кличут. Нёс мне флешку. Уже до деревни рукой подать было, когда его бандиты перехватили. Держат на старом АТП. Вытащишь Шустрого, флешку принесёшь мне."],
    ["Меченый", "И с чем я туда пойду? С кружкой твоей?"],
    ["Сидорович", "Кружку оставь, она у меня последняя. Выйдешь наверх — найди Волка. Его ребята уже у АТП, ждут команды. Он тебя и вооружит, и скажет, к кому там подойти."],
    ["Меченый", "А если бандиты флешку забрали?"],
    ["Сидорович", "Вот и спросишь Шустрого, куда она делась. Главное, живым его оттуда выведи."],
  ],
  wolf: [
    ["Меченый", "Ты Волк? Меня Сидорович прислал. Я за Шустрым."],
    ["Волк", "А, это тебя Лис вчера принёс. Ну и видок у тебя был, брат… Держи пистолет. Кобуру тоже бери, мне она отдельно без надобности."],
    ["Меченый", "Сидорович говорил, твои люди уже у АТП."],
    ["Волк", "Петруха там за старшего. Сейчас предупрежу, а то выйдешь к нему из кустов, он и разбираться не станет."],
    ["", "Волк снимает рацию с пояса."],
    ["Волк", "Петруха, принимай ещё одного. Меченым зовут. Как у вас там?"],
    ["Петруха, по рации", "Сидим пока. Шустрого минуту назад слышал. Ругается."],
    ["Волк", "Раз ругается, значит, цел. Меченый сейчас подойдёт. Дождись его."],
    ["Меченый", "А Шустрого я как узнаю?"],
    ["Волк", "Если начнёт рассказывать, что почти сам выбрался, — это он."],
  ],
  petr: [
    ["Петруха", "Меченый? Сюда. Волк сказал, ты с нами."],
    ["Меченый", "Где Шустрого держат?"],
    ["Петруха", "Вон в том двухэтажном доме. Слышал его ругань оттуда. Ты как, готов?"],
  ],
  free: [
    ["Шустрый", "Мужик, нож есть? Перережь вот тут. Пальцев уже не чувствую."],
    ["", "Меченый освобождает ему руки. Шустрый с трудом разгибает пальцы."],
    ["Меченый", "Ложкой, что ли, верёвку пилил?"],
    ["Шустрый", "Между прочим, почти перепилил."],
    ["Меченый", "Значит, точно Шустрый. Меня Сидорович послал. Спрашивал про флешку."],
    ["Шустрый", "Помнит, значит. Вот, держи и не спрашивай, где я её прятал от бандосов."],
    ["Меченый", "Помою потом руки после неё. До деревни дойдёшь?"],
    ["Шустрый", "Пока здесь побуду. Обживёмся тут с другими одиночками. Да и бандитов меньше будет на Кордоне."],
  ],
  flash: [
    ["Меченый", "Вот твоя флешка. Шустрый жив, остался на АТП."],
    ["Сидорович", "Добро. Сообщу Волку, а то он уже дважды вызывал."],
    ["Меченый", "Теперь твоя очередь. Кто видел Стрелка?"],
    ["Сидорович", "Лис. Говорил, видел тут Стрелка недавно. Проходил мимо Кордона, но в каком направлении — неизвестно. Он явно умеет следы заметать. Даже Лису стоило бы поучиться."],
    ["Меченый", "И ты с самого начала знал, что мне нужен тот самый человек, который меня сюда притащил?"],
    ["Сидорович", "Знал. А ты четыре часа проспал. Мне надо было его всё это время за штаны держать? Ушёл он к старому хутору. Отметку я тебе поставил. И вот тебе награда небольшая."],
    ["Меченый", "Ладно, тогда пойду найду Лиса. Спасибо за медикаменты."],
  ],
  fox: [
    ["Меченый", "Погоди, я достану."],
    ["Лис", "Голос знакомый… А, пассажир. Ты как сюда попал?"],
    ["Меченый", "На своих ногах. Где болит?"],
    ["Лис", "Выше колена. Собака вцепилась, я до дома еле дошёл. В рюкзаке бинт должен быть."],
    ["Меченый", "Лежи спокойно, у меня аптечка есть."],
    ["", "Меченый перевязывает ему ногу. За стеной опрокидывается пустое ведро. Лис замолкает и прислушивается."],
    ["Лис", "Слышишь, когтями по крыльцу цокает? Та, что меня потрепала, одна была. А сейчас их несколько."],
  ],
  favour: [
    ["Лис", "Вроде всех положили. Спасибо, Меченый. Можно сказать, око за око. Знаю, что ты не просто так меня нашёл. Спрашивай о чём угодно, расскажу, что знаю."],
    ["Меченый", "Сидорович сказал, ты недавно видел Стрелка."],
    ["Лис", "Видеть-то видел. Даже следом начал было идти. А моргнул — и будто не было его. Я ещё пару минут стоял и не понимал, куда он так исчез. Но, если не ошибаюсь, на восток шёл."],
    ["Меченый", "Негусто, конечно. Может, ещё что-нибудь подскажешь?"],
    ["Лис", "Даже не знаю… Может, сходишь к месту крушения грузовика смерти? Там вроде было кое-что полезное. Да, может, и вспомнишь что-нибудь."],
    ["Лис", "Погоди, Меченый. Ты ведь всё равно хотел к грузовику сходить? Поищи там мой «Макаров». Пока тебя из кабины вытаскивал, кобура за что-то зацепилась. Уже у Сидоровича хватился."],
    ["Меченый", "Как пойму, что твой?"],
    ["Лис", "На рукояти пластинка, на ней фамилия. Наградной он. Отец до самой смерти думал, что я его пропил, когда со службы ушёл. А я его столько лет берёг и вот… Обидно, понимаешь?"],
    ["Меченый", "Поищу. Ты говорил, там ещё что-то осталось?"],
    ["Лис", "Рюкзак. Серый, лямка оторвана. Когда я тебя по склону тащил, он под ноги попался. Чуть оба обратно не съехали. Глянь в нём. Может, хоть узнаешь, с кем ехал."],
    ["Меченый", "А ты пока посиди здесь. Чтоб я с твоим пистолетом потом по всему Кордону не бегал."],
    ["Лис", "С этой ногой я тебе это твёрдо обещаю."],
  ],
  returnGun: [
    ["Меченый", "Держи. Фамилию прочёл, пока грязь стирал."],
    ["Лис", "Ну и забудь. Я только-только всех отучил меня по отчеству звать."],
    ["", "Лис протирает большим пальцем пластинку, заворачивает пистолет в тряпицу и убирает во внутренний карман."],
    ["Меченый", "А вот что в рюкзаке было. Стекло вдребезги. Жму сюда — отзывается."],
    ["Лис", "Дай пощупать… Кнопка сбоку провалилась. А ну, подержи."],
    ["", "Лис прижимает крышку. Из динамика прорывается мужской голос: «…Стрелок… Залесье…» Дальше слышен только треск."],
    ["Меченый", "Ещё раз можешь?"],
    ["Лис", "Могу. Только он нам то же самое скажет. Найди Шустрого. Он мне однажды с утопленного наладонника запись вытащил. До сих пор жалею."],
    ["Меченый", "Чего так?"],
    ["Лис", "Я ему тогда под запись обещал заплатить вдвое."],
  ],
  device: [
    ["Меченый", "Мне нужно, чтобы ты починил этот КПК."],
    ["Шустрый", "Хм… Занятно. Я бы и рад взяться, да и ты мне жизнь спас. Но я банально не знаю, как с ним разобраться."],
    ["Меченый", "Это ещё почему? Ты же, как я слышал, мастер в этих делах."],
    ["Шустрый", "Да, тут не поспоришь. Только я по обычным КПК, какие у каждого одиночки. А тут монолитовский. У них вся начинка другая, технологии другие. Не буду спрашивать, откуда он у тебя. Но направлю к человеку, который имел с ними дело. К Сидоровичу."],
    ["Меченый", "Сидор? Скорее всего, эта жаба опять заставит меня выполнять какую-то грязную работу. Без обид, но делать, видимо, нечего…"],
  ],
  bargain: [
    ["Сидорович", "Меченый? Я получил сообщение от Шустрого по поводу монолитовского КПК. Перейду сразу к делу. Я знаю, как его починить. Но для меня потребуется выполнить пару заданий. Думаю, ты согласен?"],
    ["Меченый", "К сожалению, выбора у меня особо нет. Что у тебя за задания?"],
    ["Сидорович", "Тянуть не буду. На южный КПП военных недавно доставили кейс с особо важными данными. Очень уж они меня интересуют. И дам тебе совет — проберись туда ночью. Полезешь днём — подохнешь. А если и получится каким-то чудом перебить вояк, они вышлют спецназ и завалят всех в деревне. Так что слушай. Слева от главной дороги в заборе есть пролом. Кейс держат в канцелярии. Заберёшь документы, может, ещё и оружием получше запасёшься. Как выполнишь — возвращайся. Дам тебе следующее задание."],
  ],
  deliver: [
    ["Сидорович", "Меченый, ты вернулся! Давай кейс сюда. Теперь слушай внимательно. На деревню собираются напасть наёмники. Мне уже известно, где они. Беги к Волку. Он собрал небольшой отряд, пойдёшь с ребятами и разберёшься с наймами. За это получишь свой КПК и неплохой комбез в награду. Давай, меньше слов — больше дела."],
  ],
  muster: [
    ["Волк", "Меченый, опять нужна твоя помощь. Отряд наёмников засел у дома севернее деревни. Бери парней, которых я собрал, и идите туда. А я останусь с новичками и организую оборону."],
  ],
  ready: [
    ["Сталкер", "Ну что, сталкер, ты готов? Там около шести наёмников. Стоит хорошенько подготовиться к этой перестрелке."],
  ],
  held: [
    ["Сталкер", "Фух… Тяжко было. Видимо, отряд наёмников был не самый опытный в Зоне, раз мы справились без потерь. Мы останемся тут, будем охранять территорию и прочешем местность на случай, если придут ещё наймы. А ты возвращайся в деревню, посмотри, как там дела."],
  ],
  aid: [
    ["Волк", "Спасибо тебе, Меченый, за аптечку, а то словил маслину от одного гада… После вашего ухода на нас напал ещё один отряд наёмников. Еле справились, матёрые были. Потерь, к сожалению, избежать не удалось, но всё-таки не все погибли. В общем, оставь раненых на меня и топай к Сидору. Он уже, поди, закончил работать над твоим делом."],
  ],
  reward: [
    ["Сидорович", "Меченый, цел, собака! Молодец, что помог ребятам истребить наёмников. Одному богу известно, чего им надо было от нашей деревни… Вот тебе награда — «Заря» и пять тысяч. И твой КПК как раз готов. Можешь послушать, чего там записали."],
  ],
  listen: [
    ["Стрелок", "Говорит Стрелок. Я отправляюсь в Залесье, чтобы пополнить припасы и разведать несколько мест. Дальше пойду к центру… на север."],
    ["", "Запись затихает в треске помех."],
    ["Сидорович", "Значит, вот тебе куда нужно — в Залесье. Это к западу от Кордона, в Малой Зоне, как её прозвали сталкеры. Там небольшая деревушка, и дела у них не лучше, чем у нас с наёмниками. Так что будь там осторожнее, Меченый."],
    ["Меченый", "Понял тебя, Сидорович. Спасибо за информацию. Надеюсь, свидимся."],
    ["Сидорович", "Удачной охоты, сталкер."],
  ],
};

/* Campaign data is separate from inventory and old quest counters. Named actors
   are reconstructed before resident snapshots, so reloading never rerolls a loss. */
const CHAPTERS=['Последний пассажир','Шустрый влип','Уговор с Сидоровичем','Должок за Кордон','У старой колеи','Чужая начинка','Цена ремонта','Беда с севера','След ведёт в Залесье'];
const STORY={
  wake:[0,'sid','Поговорить с Сидоровичем'],wolf:[1,'village','Получить оружие у Волка'],
  rescue:[1,'atp','Освободить Шустрого на АТП'],flash:[2,'sid','Передать флешку Сидоровичу'],
  fox:[3,'farm','Помочь раненому Лису'],dogs:[3,'farm','Отбиться от слепых собак'],
  favour:[4,'farm','Расспросить Лиса об аварии'],wreck:[4,'column','Найти ПМ и осмотреть серый рюкзак'],
  returnGun:[4,'farm','Вернуть Лису наградной ПМ'],device:[5,'atp','Показать разбитый КПК Шустрому'],
  bargain:[6,'sid','Узнать цену ремонта'],case:[6,'army','Ночью забрать кейс без тревоги'],
  escape:[6,'army','Незаметно вынести кейс за ограду'],deliver:[6,'sid','Доставить кейс Сидоровичу'],
  muster:[7,'village','Найти Волка в деревне'],ready:[7,'village','Собраться с отрядом'],battle:[7,'village','Разбить наёмников к северу от деревни'],
  aid:[7,'village','Вернуться в деревню и помочь Волку'],reward:[7,'sid','Забрать награду и КПК'],
  listen:[8,'sid','Прослушать восстановленную запись'],west:[8,'zalissya','Дойти до Залесья в Малой Зоне'],done:[9,'zalissya','Кордон пройден']
};
const STORY_KEYS=['wolf','fox','shust'], RAIDERS=['Шнур','Кедр','Бухта','Сыч','Грач'];
const ATP_BANDITS=['b1','b2','b3','b4','b5','b6','boss'];
function chapter(){return S.campaign.stage;}
function prepareCampaign(){
  if(!S.campaign){
    const rescued=!!(S.flags.shustFree || S.flags.flashDone);
    S.campaign={stage:S.flags.flashDone?'fox':rescued?'flash':'wake',wounds:{},liberated:rescued};
    if(rescued && !S.flags.flashDone && !S.inv.flash){S.inv.flash=1;if(S.flags.personalStock?.loot)delete S.flags.personalStock.loot.flash;}
    if(rescued){ S.flags.shustFree=S.flags.atpClear=1; ATP_BANDITS.forEach(id=>S.dead[id]=1); }
    delete S.flags.foxUp;
    delete S.flags.cordonStage;
    if(S.news)S.news=S.news.filter(n=>!/(ложный вызов|связаться с серым|серый ждёт|ночной гость|след стрелка|колонн.*частот|свет в деревне|схрон путейца|флешка шустрого|раненый у дороги|медузу.*сидоровичу)/i.test(n.x||''));
    if(S.q3)S.q3.sucker=0;
    if(S.jobs) S.jobs.act=null;
    if(S.dyn?.npcs) S.dyn.npcs=S.dyn.npcs.filter(r=>!r.jobTag && !['column_spool','column_chalk'].includes(r.sid));
    S.q2 ||= {}; S.q2.fox=0;
  }
  for(const id of STORY_KEYS) delete S.dead[id];
}
function nextChapter(stage){
  if(chapter()===stage)return;
  const prev=STORY[chapter()][0], curr=STORY[stage][0];
  if(curr>prev && prev>0)S.stats.q++;
  S.campaign.stage=stage; S.trackedQuestId='chapter'+curr;
  campaignCast(); bulletin(STORY[stage][2]); save(true);
}
const chapterReports=[
  ['sid','Лис вытащил тебя из разбитого грузовика и довёз до бункера.'],
  ['atp','Шустрый свободен. Выжившие одиночки обосновались на АТП.'],
  ['sid','Сидорович получил флешку и подсказал, где искать Лиса.'],
  ['farm','Лис получил аптечку. Стая у фермы разбежалась.'],
  ['column','Ты вернул Лису именной ПМ. На разбитом КПК уцелел голос Стрелка.'],
  ['atp','Шустрый узнал монолитовский КПК и отправил тебя к Сидоровичу.'],
  ['army','Кейс доставлен. Сидорович занялся ремонтом КПК.'],
  ['village','Деревня отбилась. Волк получил помощь, а ты забрал восстановленный КПК.'],
  ['zalissya','Запись Стрелка привела тебя в Залесье.']
];
function campaignList(){
  const [n,loc]=STORY[chapter()];
  const list=CHAPTERS.slice(0,n+1).map((name,i)=>({id:'chapter'+i,n:name,loc:i===n?loc:chapterReports[i][0],st:i===n?'a':'d',d:i===n?campaignLabel():chapterReports[i][1]}));
  if(S.sos?.act)list.push({id:'sos',loc:S.sos.act.loc,n:'Сигнал SOS',st:'a',d:'Сталкерам нужна помощь у '+S.sos.act.where+'.'});
  const job=S.jobs?.act;
  if(job)list.push({id:'job',loc:job.loc||'sid',n:job.n_,d:job.d+' '+(jobReady(job)?'Готово. Вернись к Сидоровичу.':jobProgress(job)),st:'a'});
  return list;
}
function worldPoint(x,y){return {x:(WEST+x)*T,y:(NORTH_ROWS+y)*T};}
function walkPoint(p,dx=0,dy=0){const t=freeTile(p.x/T+dx,p.y/T+dy);return {x:t.x*T,y:t.y*T};}
function storyArea(){return P.x/T-WEST>=112 && P.x/T-WEST<=143 && P.y/T-NORTH_ROWS>=198 && P.y/T-NORTH_ROWS<=215;}
function shiftNumber(){return Math.floor((S.min-21*60)/1440);}
function raidAllies(){return ents.filter(e=>e.alive && e.squadMate);}
function campaignLabel(){
  const c=S.campaign;
  if(c.stage==='case' && (c.mustLeave || c.failedShift===shiftNumber()))return c.mustLeave?'Отступить с южного КПП':'Дождаться следующей ночной смены';
  if(c.stage==='rescue' && !S.flags.assault && atpCompany().length)return 'Поговорить с Петрухой у АТП';
  if(c.stage==='wreck')return c.pistol?'Осмотреть серый рюкзак':c.bag?'Найти наградной ПМ Лиса':STORY.wreck[2];
  return STORY[c.stage][2];
}
function storyPoint(stage=chapter()){
  const a=STORY[stage], actor={wolf:'wolf',fox:'fox',favour:'fox',returnGun:'fox',dogs:'fox',device:'shust',rescue:'shust',aid:'wolf',muster:'wolf'}[stage];
  if(stage==='rescue' && !S.flags.assault && atpCompany().length)return atpCompany()[0];
  if(actor && byS(actor))return routeToActor(byS(actor)) || byS(actor);
  if(a[1]==='sid')return locPt('sid',inBunker(P.x,P.y)?'trader':'hatch');
  if(stage==='wreck')return findSite(S.campaign.pistol?'bag':'pistol');
  if(stage==='case')return S.campaign.mustLeave?worldPoint(110.5,207.5):findSite('case');
  if(stage==='escape')return worldPoint(110.5,207.5);
  if(stage==='ready')return raidAllies()[0] || FIRE;
  if(stage==='battle')return ents.find(e=>e.alive && e.assailant) || northCamp();
  return LESSER_FIRE;
}
function northCamp(){return walkPoint(worldPoint(74.5,128.5));}
function campaignTargets(){
  const targets=[];
  if(chapter()!=='done'){
    const p=storyPoint();targets.push({x:p.x,y:p.y,qid:'chapter'+STORY[chapter()][0],n:campaignLabel()});
  }
  const sos=S.sos?.act;
  if(sos)targets.push({qid:'sos',x:sos.x*T,y:sos.y*T,n:'Сигнал SOS: '+sos.where});
  const job=S.jobs?.act;
  if(job){
    let point, label=job.n_;
    if(jobReady(job)){point=locPt('sid',inBunker(P.x,P.y)?'trader':'hatch');label='Сдать заказ';}
    else if(job.k==='clear')point={x:job.x*T,y:job.y*T};
    else if(job.k==='hunt'||job.k==='trophy'){
      const kind=job.kind || (job.item==='hoof'?'boar':'dog');
      const closest=ents.filter(e=>e.alive && e.den && e.kind===kind).sort((a,b)=>dE(P,a.home)-dE(P,b.home))[0];
      point=closest?.home;
    }else if(job.k==='art'){
      point=locPt('field','medusa');label='Обследовать поле аномалий';
    }
    if(point)targets.push({qid:'job',x:point.x,y:point.y,n:label});
  }
  return targets;
}
let campaignSites;
function findSite(id){
  if(!campaignSites){
    const wreck=locPt('column','wreck');
    campaignSites={pistol:walkPoint(wreck,-1,1),bag:walkPoint(wreck,2,2),case:walkPoint(worldPoint(117.5,205.5))};
  }
  return campaignSites[id];
}
function woundKey(e){
  e.hp=1;e.wounded=e.captive=1;e.tgt=e.path=e.trip=null;e.kx=e.ky=0;e.sit=0;
  S.campaign.wounds[e.sid]=true;
}
function helpStory(e){
  const step=chapter();
  if(e.sid==='fox' && step!=='fox' && !S.flags.foxUp){msg('Лис просит подойти после разговора с Сидоровичем.','say');return;}
  if(!has('medkit')){msg('Нужна аптечка. Можно вернуться с ней позже.','say');return;}
  take('medkit',1);delete S.campaign.wounds[e.sid];e.hp=e.maxhp*.7;e.wounded=0;
  e.captive=e.sid==='shust' && !S.campaign.liberated;
  if(e.sid==='fox' && step==='fox'){
    S.flags.foxUp=1;nextChapter('dogs');playConversation(e,'fox','Выйти во двор');
  }else if(e.sid==='wolf' && step==='aid'){
    nextChapter('reward');playConversation(e,'aid','К Сидоровичу');
  }else {save(true);sayLine(e,'Живой… Спасибо.');}
}
function addCast(id,point,def,tag){
  if(S.dead[id] || byS(id))return;
  const e=def.pack?mkDog({...def,sid:id,x:point.x/T,y:point.y/T}):mkHuman({...def,sid:id,x:point.x/T,y:point.y/T,named:1,stay:1});
  e[tag]=true;e.resident=1;ents.push(e);
}
function campaignCast(){
  if(!BIG)return;
  const c=S.campaign;
  for(const id of STORY_KEYS){
    const e=byS(id);if(!e)continue;
    if(c.wounds[id])woundKey(e);
  }
  if(chapter()==='dogs'){
    const p=locPt('farm','fox');
    for(let i=0;i<4;i++)addCast('traildog'+i,walkPoint(p,5+i%2,4+i),{pack:'foxdogs'},'trailDog');
  }
  if(c.atpReliefSent)spawnAtpRelief();
  if(c.raid){
    RAIDERS.forEach((name,i)=>addCast('northAlly'+i,walkPoint(c.northHeld?northCamp():FIRE,(i-2)*1.8,5),{name,fac:'loner',wpn:i%2?'w_aksu':'w_obrez'},'squadMate'));
    if(chapter()==='battle')for(let i=0;i<6;i++)addCast('northMerc'+i,walkPoint(northCamp(),(i%3-1)*2,-Math.floor(i/3)*2),{name:'Наёмник',fac:'bandit',wpn:i%2?'w_aksu':'w_pm'},'assailant');
  }
}
function atpCompany(){
  return ['petr','petr2','atpRelief0','atpRelief1'].map(byS).filter(Boolean);
}
function spawnAtpRelief(){
  const gate=locPt('atp','petr');
  ['Чибис','Тихон'].forEach((name,i)=>{
    const id='atpRelief'+i;
    if(byS(id)||S.dead[id])return;
    const from=walkPoint(gate,-11-i,5+i),dest=walkPoint(gate,i?2:0,i?3:1);
    addCast(id,from,{name,fac:'loner',wpn:i?'w_pm':'w_obrez'},'relief');
    const e=byS(id);e.home=dest;e.trip={stage:2,returnTo:dest};
  });
}
function occupyATP(){
  const first=!S.campaign.liberated;
  S.campaign.liberated=true;S.flags.atpClear=S.flags.shustFree=1;
  ['petr','petr2','shust'].forEach((id,i)=>{
    const e=byS(id);if(!e)return;
    const p=walkPoint(locPt('atp',i===1?'petr2':'petr'),i===2?3:0,i===2?2:0);
    e.captive=e.wounded?1:0;e.home=p;e.stay=1;e.resident=1;
    if(first){e.follow=e.sit=0;e.path=null;e.trip={stage:2,returnTo:p};}
  });
  if(!atpCompany().length && !S.campaign.atpReliefSent)S.campaign.atpCallAt??=S.min+30;
}
function shustCampLine(){
  if(atpCompany().some(e=>!e.relief || dE(e,e.home)<95))return 'Мы остаёмся на АТП. Обживём гараж.';
  if(S.campaign.atpReliefSent)return 'Ребята ответили по КПК. Жду их здесь.';
  return 'Я пока один. Свяжусь с ребятами по КПК, попрошу прийти на АТП.';
}
function storyRead(name,lines){dialog({n:name,record:true,grp:'Кордон'},lines,()=>[{t:'Понятно',close:1}]);}
function beginAssault(){
  if(chapter()!=='rescue'||S.flags.assault)return;
  S.flags.assault=1;
  for(const e of atpCompany()){
    e.sit=0;e.trip=e.path=null;e.home=locPt('atp',e.sid);e.stay=1;
  }
  bulletin('Отряд Петрухи выдвигается на АТП.');save(true);
}
function petrBriefing(e){
  const decline={t:'Пока не готов. Ждите здесь.',close:1,fn:()=>{S.campaign.atpWait=true;save(true);}};
  playConversation(e,'petr','Готов. Пошли за ним.',beginAssault,decline);
}
// A scene owns only the reply buttons. The conversation panel owns its transcript.
function playConversation(e,key,finishLabel,finish,alternative){
  const trader=!e, stage=chapter(), script=CORDON_SCRIPT[key];
  if(!panel || (trader ? panel.kind!=='trader' : panel.e!==e))
    dialog(trader?SIDCARD():cardOf(e),[],()=>[],trader?'trader':'dialog',e);
  let index=0;
  function advance(){
    while(index<script.length && script[index][0]!=='Меченый'){
      const [name,text]=script[index++];
      const speech=key==='free' && index===script.length && !atpCompany().length?shustCampLine():text;
      panel.lines.push({s:name?'npc':'sys',name:name==='Сталкер'?e?.name:name,t:speech});
    }
    if(index<script.length){
      const reply=script[index++][1];
      panel.opts=()=>[{t:reply,fn:advance}];
    }else{
      panel.opts=()=>[{t:finishLabel,k:'key',fn:()=>{
        if(chapter()!==stage)return;
        if(finish)finish();
        if(trader){panel.opts=traderOpts;refresh();}else closePanel();
      }},...(alternative?[alternative]:[])];
    }
    refresh();
  }
  advance();
}
function storyTalk(e){
  const stage=chapter();
  const scene=(key,label,to,effect)=>playConversation(e,key,label,()=>{effect?.();nextChapter(to);});
  if(e.sid==='wolf' && stage==='wolf')return scene('wolf','Забрать оружие','rescue',()=>{
    const gun=give('w_pm',1,{cond:85,mag:8});give('a9',16);
    if(gun)mountGear('w_pm',cnt('w_pm')-1,true);S.q.flash=2;
  });
  if(e.sid==='fox' && stage==='favour')return scene('favour','Идти к грузовику','wreck');
  if(e.sid==='fox' && stage==='returnGun')return scene('returnGun','Убрать КПК','device',()=>take('engraved_pm'));
  if(e.sid==='shust' && stage==='device')return scene('device','К Сидоровичу','bargain');
  if(e.sid==='wolf' && stage==='muster')return scene('muster','Встретиться с отрядом','ready',()=>{S.campaign.raid=true;});
  if(e.squadMate && stage==='ready')return playConversation(e,'ready','Я готов. Выходим',()=>nextChapter('battle'),{t:'Ещё подготовлюсь',close:1});
  const line=e.sid==='shust'?shustCampLine():e.squadMate?(S.campaign.northHeld?raidDebrief():'Держим этот участок.'):e.sid==='fox'?'С этой ногой далеко не уйдёшь.':'Здорово, Меченый.';
  dialog(cardOf(e),[line],()=>[{t:'До встречи',close:1}],'dialog',e);
}
function raidDebrief(){
  const n=raidAllies().length;
  return n===5?CORDON_SCRIPT.held[0][1]:n?'Не всех уберегли… Я останусь здесь, проверю округу. А ты возвращайся к Волку.':'Волк по КПК: «Меченый, возвращайся. Есть раненые».';
}
function storyTraderOptions(){
  const stage=chapter(), opts=[];
  function offer(at,title,end,to,effect){
    if(stage===at)opts.push({t:title,k:'key',fn:()=>playConversation(null,at,end,()=>{effect?.();nextChapter(to);})});
  }
  offer('wake','Кто меня нашёл?','Найти Волка','wolf');
  if(has('flash'))offer('flash','Передать флешку Шустрого','Забрать медикаменты','fox',()=>{
    take('flash',1);S.flags.flashDone=1;S.q.flash=4;give('medkit',2);give('bandage',3);
  });
  offer('bargain','Показать монолитовский КПК','Договорились','case',()=>take('damaged_pda'));
  if(stage==='case')opts.push({t:'Что делать до следующей смены?',fn:()=>say('Костёр в деревне ещё горит. Передохни там или возьми у меня заказ, пока ждёшь. После тревоги раньше следующей ночи делать там нечего.')});
  offer('deliver','Отдать кейс','К Волку','muster',()=>take('post_case'));
  offer('reward','Получить награду и КПК','Забрать награду','listen',()=>{S.inv.restored_pda=1;S.money+=5000;give('ar_zarya',1);});
  offer('listen','Включить восстановленную запись','Отправиться в Залесье','west');
  return opts;
}
function alarmPost(){
  if(!BIG || !['case','escape'].includes(chapter()) || !night() || S.campaign.failedShift===shiftNumber())return;
  take('post_case',1);
  S.campaign.failedShift=shiftNumber();S.campaign.mustLeave=true;
  S.campaign.stage='case';bulletin('КПП поднял тревогу. Отступи. Кейс снова доставят со следующей ночной сменой.');save(true);
}
function campaignTick(){
  if(!BIG || !P.alive)return;
  const c=S.campaign;
  if(c.liberated && !c.atpReliefSent && !atpCompany().length){
    c.atpCallAt??=S.min+30;
    if(S.min>=c.atpCallAt && !byS('shust')?.wounded){
      c.atpReliefSent=true;spawnAtpRelief();
      bulletin('Шустрый вызывает одиночек на АТП. Чибис и Тихон откликнулись и идут к гаражам.');save(true);
    }
  }
  if(chapter()==='ready' && !raidAllies().length)nextChapter('battle');
  if(chapter()==='dogs' && !ents.some(e=>e.alive && e.trailDog))nextChapter('favour');
  if(['case','escape'].includes(chapter())){
    if(c.mustLeave && !storyArea()){c.mustLeave=false;save(true);}
    if(chapter()==='escape'){
      if(!night() || c.caseShift!==shiftNumber()){take('post_case',1);c.stage='case';bulletin('Смена закончилась. Кейс остался на КПП.');save(true);}
      else if(!storyArea())nextChapter('deliver');
    }
  }
  if(chapter()==='battle' && !ents.some(e=>e.alive && e.assailant)){
    c.northHeld=true;const alive=raidAllies();
    for(const e of alive){e.home={x:e.x,y:e.y};e.trip=e.path=null;e.stay=1;}
    const line=raidDebrief();
    bulletin(line);if(alive.length)sayLine(alive[0],line);
    const wolf=byS('wolf'), village=locPt('village','wolf');
    wolf.x=village.x;wolf.y=village.y;wolf.home=village;woundKey(wolf);
    c.raidAftermath=S.min;villageAftermath();nextChapter('aid');
  }
  if(chapter()==='west' && dE(P,LESSER_FIRE)<145)nextChapter('done');
}
function villageAftermath(){
  if(S.campaign.raidAftermath==null || S.min-S.campaign.raidAftermath>720 || objs.some(o=>o.raidBody))return;
  for(let i=0;i<4;i++){const p=walkPoint(FIRE,i%2?4:-3,2+i);
    objs.push({k:'body',...p,raidBody:true,fac:i<2?'bandit':'loner',name:i<2?'Наёмник':'Защитник деревни',kind:'human',seed:17+i,ang:i*2.3,loot:{},t:S.campaign.raidAftermath});}
}
function storyPrompt(cand){
  const c=S.campaign;
  for(const id of chapter()==='wreck'?['pistol','bag']:chapter()==='case'?['case']:[]){
    if(id!=='case' && c[id])continue;
    const p=findSite(id),d=dE(P,p);if(d<45 && los(P.x,P.y,p.x,p.y))cand(d-35,{k:'story',stage:id,label:{pistol:'Поднять именной ПМ',bag:'Осмотреть серый рюкзак',case:campaignLabel()}[id]});
  }
}
function cordonUse(id){
  const c=S.campaign;
  if(id==='case' && chapter()==='case'){
    if(!night() || c.failedShift===shiftNumber() || c.mustLeave){msg('Кейс под охраной. Дождись ночной смены.','say');return;}
    c.caseShift=shiftNumber();S.inv.post_case=1;nextChapter('escape');return;
  }
  if(chapter()!=='wreck' || !['bag','pistol'].includes(id) || c[id])return;
  c[id]=true;S.inv[id==='bag'?'damaged_pda':'engraved_pm']=1;
  if(c.bag && c.pistol)nextChapter('returnGun');else save(true);
  storyRead(id==='bag'?'Серый рюкзак':'Наградной ПМ',[id==='bag'?'Стекло наладонника разбито. Ты нажимаешь кнопку. Корпус коротко вибрирует, но экран остаётся чёрным.':'На рукояти под грязью проступает пластинка с фамилией. Это пистолет Лиса.']);
}
let storyGunIcon;
function drawCordonTrail(inView){
  if(!BIG || !S?.campaign)return;
  const c=S.campaign;
  for(const id of chapter()==='wreck'?['pistol','bag']:chapter()==='case'?['case']:[]){
    if(id!=='case' && c[id])continue;
    const p=findSite(id);if(!inView(p.x,p.y,32))continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.27);
    if(id==='pistol' && (storyGunIcon ||= itemIcon('w_pm')).naturalWidth)ctx.drawImage(storyGunIcon,-9,-5,18,10);
    else {ctx.shadowColor='#211c19';ctx.shadowOffsetY=2;ctx.fillStyle=id==='case'?'#585947':id==='bag'?'#726e60':'#403c34';ctx.fillRect(-10,-6,20,12);ctx.shadowOffsetY=0;ctx.strokeStyle='#afa488';ctx.strokeRect(-7,-4,14,8);}
    ctx.restore();
  }
}
// Day shift has four additional guards. They leave the playable post at 21:00.
let lastShiftState=null;
function updatePostShift(){
  const day=!night();
  const key=day+':'+shiftNumber();
  if(lastShiftState===key)return;
  lastShiftState=key;
  ents=ents.filter(e=>!e.dayGuard && !e.reliefGuard);
  for(const id of ['a4','a5'])if(!byS(id)){
    const def=NPCDEF.find(e=>e.sid===id);
    addCast('relief'+id+'_'+shiftNumber(),{x:def.x*T,y:def.y*T},def,'reliefGuard');
  }
  if(!day)return;
  for(let i=0;i<4;i++)addCast('postDay'+shiftNumber()+'_'+i,walkPoint(worldPoint(123+i*2,201+i%2)),{name:'Дневной караул',fac:'army',wpn:'w_aksu',guard:'south'},'dayGuard');
}

// The original key remains the rolling autosave. Manual snapshots have independent keys.
const MANUAL_SLOTS=[1,2,3];
function slotKey(slot){return slot?KEY+'-slot-'+slot:KEY;}
function slotPicker(nav,writing,back){
  nav.replaceChildren();
  const status=el('p','pause-note',writing?'Выберите слот для записи':'Выберите сохранение');
  status.setAttribute('role','status');nav.appendChild(status);
  function write(slot){
    if(ents.some(e=>e.alive && e!==P && hostile(e,P) && dE(e,P)<450)){status.textContent='Рядом враги, сохраниться нельзя.';return;}
    if(save(false,slot)){back();msg('Игра сохранена в слот '+slot+'.','good');}else status.textContent='Не удалось записать сохранение.';
  }
  for(const slot of writing?MANUAL_SLOTS:[0,...MANUAL_SLOTS]){
    const d=loadSave(slot),label=slot?'Слот '+slot:'Автосохранение';
    const chapterName=d?.campaign?CHAPTERS[Math.min(8,STORY[d.campaign.stage]?.[0]??0)]:'Кордон';
    const text=d?label+' · '+clockStr(d.min)+' · '+chapterName+' · '+DIFFICULTIES[difficultyKey(d.difficulty)].name:label+' · пусто';
    nav.appendChild(btn('',text,()=>{
      if(!writing){if(panel)closePanel();applyState(d);if(title.open)hideTitle();save(true);return;}
      if(!d){write(slot);return;}
      nav.replaceChildren(status);status.textContent='Заменить сохранение «'+text+'»?';
      nav.append(btn('','Заменить',()=>write(slot)),btn('','Отмена',()=>slotPicker(nav,true,back)));
    },!writing && !d));
  }
  nav.appendChild(btn('','Назад',back));
}

// Original overhead sequence, using the same truck, verge textures and trees as the world.
function intro(){
  resetInput(); title.open=true;
  const scene=el('section','prologue'),canvas=document.createElement('canvas');
  const caption=el('p','prologue-caption','Последний пассажир');
  const skip=btn('','Пропустить',finish);scene.setAttribute('aria-label','Пролог');
  scene.append(canvas,caption,skip);document.body.append(scene);skip.focus();
  const g=canvas.getContext('2d'), strip=document.createElement('canvas');
  strip.width=1440;strip.height=520;
  const b=strip.getContext('2d'),rng=mulberry32(397);
  b.fillStyle='#4d4939';b.fillRect(0,0,1440,520);
  if(ART)artFill(b,'grass_dry',0,0,1440,520);
  b.save();b.beginPath();b.moveTo(0,198);b.bezierCurveTo(420,218,900,169,1440,204);b.lineTo(1440,326);b.bezierCurveTo(900,293,420,337,0,311);b.closePath();b.clip();
  b.fillStyle='#59564b';b.fillRect(0,0,1440,520);if(ART)artFill(b,'dirt',0,0,1440,520);
  for(let i=0;i<6500;i++){b.fillStyle=i%2?'#c4bea417':'#16161219';b.fillRect(rng()*1440,195+rng()*140,2+rng()*8,1+rng()*2);}b.restore();
  if(ART && C1)for(let i=0;i<100;i++){
    const x=rng()*1440,y=i%2?rng()*165:362+rng()*158;
    c1Draw(b,'c1_bush'+(i%4),x,y,22+rng()*70,rng()*6);
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fox={...byS('fox'),captive:0,wounded:0,sit:0,wpn:'hands'};
  const speech=CORDON_SCRIPT.crash;
  const beats=[], arrival=8;
  let clock=arrival;
  for(const [speaker,text] of speech){
    const end=clock+Math.max(2,text.length/17);
    beats.push({end,caption:speaker+' · '+text});clock=end;
  }
  const bunker=clock+.7, duration=bunker+3.6;
  let raf,lastStamp,elapsed=0,thunder=false,ended=false;
  function finish(){
    if(ended)return;ended=true;cancelAnimationFrame(raf);scene.remove();title.open=false;
    P.y=SID_SPAWN_Y*T;P.ang=-Math.PI/2;resetInput();save(true);msg('Ты очнулся в бункере. Поговори с Сидоровичем.','say');
  }
  function draw(now){
    if(ended)return;
    if(lastStamp && !document.hidden)elapsed+=Math.min(.1,(now-lastStamp)/1000);lastStamp=now;
    const t=elapsed, seconds=duration;
    if(t>=seconds){finish();return;}
    const w=Math.max(1,Math.min(1200,scene.clientWidth)),h=Math.max(1,Math.round(w*scene.clientHeight/scene.clientWidth));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
    const s=Math.max(w/840,h/510),time=t,drive=Math.min(time,6.5),roll=clamp((time-5)/1.5,0,1);
    g.setTransform(s,0,0,s,w/2,h/2);g.fillStyle='#211f1c';g.fillRect(-w/s/2,-h/s/2,w/s,h/s);
    g.drawImage(strip,-465-drive*59,-254);
    const x=-83+drive*13,y=5+roll*46;
    g.fillStyle='rgba(9,18,25,.59)';g.fillRect(-w/s/2,-h/s/2,w/s,h/s);
    // A cold ripple bends the verge just before the front wheels reach it.
    if(time>3.65 && time<5.55){
      const phase=(time-3.65)/1.9, bend=Math.sin(phase*Math.PI);
      g.save();g.translate(x+123-phase*86,y-5);g.scale(.64,1);g.lineWidth=1.7;
      for(let i=0;i<3;i++){g.strokeStyle='rgba(177,215,221,'+bend*(.35-i*.075)+')';
        g.beginPath();g.ellipse(0,0,13+i*7+phase*8,29+i*9,phase*.6,0,Math.PI*2);g.stroke();}
      g.restore();
    }
    g.save();g.translate(x,y);g.rotate(.02+roll*.69);
    const beam=g.createLinearGradient(38,0,219,0);beam.addColorStop(0,'rgba(255,227,153,.46)');beam.addColorStop(1,'rgba(245,234,180,0)');
    g.fillStyle=beam;g.beginPath();g.moveTo(37,-12);g.lineTo(220,-72);g.lineTo(220,73);g.lineTo(37,12);g.fill();
    g.scale(1,Math.cos(roll*Math.PI)*.79+.06);
    if(ART && C1)c1Draw(g,'c1_army0',0,0,116,0);else {g.fillStyle='#625d46';g.fillRect(-51,-19,102,38);}
    if(roll>.6){g.fillStyle='#302d29';g.fillRect(-42,-9,80,18);g.fillStyle='#181917';for(const dx of [-36,30])for(const dy of [-14,7])g.fillRect(dx,dy,12,7);}
    g.restore();
    if(time>6.6){
      const approach=clamp((time-6.6)/2.2,0,1);
      fox.x=x+94-approach*66;fox.y=y+55-approach*22;fox.ang=-2.6;
      fox.step=approach*60;fox.crouch=approach===1;drawHuman(fox,g);
    }
    g.setTransform(1,0,0,1,0,0);g.strokeStyle='rgba(199,210,216,.22)';g.beginPath();
    for(let i=0;i<55;i++){const xx=(i*151+t*63)%w, yy=(i*71+t*340)%h;g.moveTo(xx,yy);g.lineTo(xx-4,yy+11);}g.stroke();
    if(time>=5 && !thunder){thunder=true;play('thunder');}
    if(!reduced && time>4.9 && time<5.45){g.fillStyle='rgba(205,218,224,'+(.41*(1-(time-4.9)/.55))+')';g.fillRect(0,0,w,h);}
    if(time>=bunker){
      const u=clamp((time-bunker)/2.7,0,1);
      P.y=(SID_SPAWN_Y+(1-u)*.85)*T;P.ang=-Math.PI/2;P.step=u*28;
      render();g.drawImage(cv,0,0,w,h);
      g.fillStyle='rgba(8,9,8,'+(1-u)+')';g.fillRect(0,0,w,h);
      caption.textContent='Четыре часа спустя · Бункер Сидоровича';
    }else{
      const shade=clamp((time-clock+.6)/1.3,0,1);
      g.fillStyle='rgba(8,9,8,'+shade+')';g.fillRect(0,0,w,h);
      caption.textContent=time<3?'Последний пассажир':time<arrival?'':beats.find(b=>time<b.end)?.caption || '';
    }
    raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
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
      anchors: { fire: CAMP_TILE.slice(), shust: [34.5, 80.5], tolik: [35, 81], wolf: [20.5, 79], safe: [30, 88], generator: [34.5, 86.5], bench: [36.5, 84.5],
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
function boarDefs() { return MAP_ID === 'rc1' ? RC1.boars.map(b => ({ sid: b.sid, pack: b.pack, x: b.at[0], y: b.at[1] })) : [{ sid: 'k1', x: 52, y: 12 }, { sid: 'k2', x: 54.5, y: 13 }, { sid: 'k3', x: 76, y: 24 }]; }

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
  ANOM0.push({ id:'ditch-electra', x:104*T, y:29.5*T, r:43, k:'e' });
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
}

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
  [[84, 166.5], [128, 166.5]],
  [[125, 142.5], [160, 142.5], [183, 142.5]]
];
function bigPath(pts, rad, tile) {
  if (tile === undefined) tile = DI;
  const radius = Math.max(.83, rad), verge = radius + 2;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i-1], [bx, by] = pts[i];
    const dx = bx-ax, dy = by-ay, length2 = dx*dx + dy*dy;
    const left = Math.max(0, Math.ceil(Math.min(ax,bx)-verge));
    const right = Math.min(MW-1, Math.floor(Math.max(ax,bx)+verge));
    const top = Math.max(0, Math.ceil(Math.min(ay,by)-verge));
    const bottom = Math.min(MH-1, Math.floor(Math.max(ay,by)+verge));
    for (let y=top; y<=bottom; y++) for (let x=left; x<=right; x++) {
      const u = length2 ? Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length2)) : 0;
      const dist2 = (x-ax-u*dx)**2 + (y-ay-u*dy)**2;
      if (dist2 > verge*verge) continue;
      keep[y*MW+x] = 1;
      if (dist2 > radius*radius) continue;
      const t = tAt(x,y);
      if (t===AS || t===RA || t===CO || t===BR || t===FL || t===CF || t===VO || (t===SW && tile!==SW)) continue;
      setT(x,y,tile);
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
  P2([[73, 129], [68, 141], [63, 153], [63.8, 159], [62.9, 161], [59, 161.2]], 0.7);                          // водокачка → деревня
  P2([[80, 123.5], [100, 122], [125, 121]], 0.7);                      // водокачка → шоссе
  P2([[73, 129], [66, 129], [62, 126], [52, 125.5], [36, 127.5], [18, 121.5], [0, 118]], 0.8); // исходная колея, продолжается в makeLesserZone
  P2(VEHICLE_ROUTES[1], 0.8);                 // шоссе → АТП
  P2([[197.5, 128], [200, 110], [206, 92], [206.5, 74]], 0.7);         // АТП → релейная будка
  P2([[206, 90], [220, 92], [239, 92]], 0.8);                          // на Затон через брод
  P2([[201.5, 157], [197, 167], [194, 178]], 0.6);                     // пролом АТП → сады
  P2([[189, 190], [168, 194.5], [140, 195], [112, 195], [92, 191], [84, 184]], 0.5); // южная тропа
  P2([[144, 113], [135, 112.5], [125, 112]], 0.7);                     // поле → шоссе
  P2([[158, 105], [157, 92], [156, 90]], 0.6);                         // поле → ж/д будка
  P2([[148, 87], [127, 86.5]], 0.6);                                   // ж/д будка → шоссе
  P2([[72, 69], [72, 80], [125, 80]], 0.7);                            // туннель → шоссе
  P2([[50, 107], [58, 116], [63, 122], [62, 126]], 0.6);                          // болото → водокачка
  P2([[26, 87], [32, 92], [39, 98], [39, 99], [40.1, 101.1], [42, 104], [44.1, 106], [48.3, 106.2], [49.1, 107], [50, 107]], 0.5);                             // логово → болото
  P2([[72, 52], [84, 48.5], [93, 45.5]], 0.6);                         // туннель → лагерь путейцев
  P2([[100, 42], [112, 42], [129, 42]], 0.7);                          // лагерь → шоссе
  P2([[67, 35], [80, 39], [91, 41], [91.9, 45.5], [92.4, 45.8], [93.1, 45.6]], 0.6);                             // свиноферма → лагерь
  P2([[128, 34], [135, 33], [150, 32], [167, 32], [173, 33], [177.6, 36.6], [183.5, 36.6], [184, 32]], 0.7);                          // шоссе → ферма
  P2([[184, 32], [195, 36], [199, 40], [200, 42]], 0.6);                          // ферма → хлев
  P2([[39.5, 26], [26, 28], [21, 31.5], [16, 32]], 0.5);                             // свиноферма → охотничья вышка
  P2([[39, 26], [38, 32], [40, 35], [42.1, 38], [48.9, 38], [49, 36], [67, 35]], .7); // край свинофермы
  // Join both ends of the old stamped lanes outside the village courtyards.
  P2([[42,182.5],[44.4,182.2],[44.5,179.5],[43,178],[43,170],[45,169],[50,169],[51.9,170],[53.5,172.5]], .7);
  P2([[84,184],[84,180],[81.9,179],[76,179],[76,177],[73,177],[69.7,177.6],[66.6,177.6],[66.4,177.4],[66.4,173.6],[67.8,173.5]], .7);
  // Independent office and barracks flank the checkpoint yard.
  const postRandom=mulberry32(8741);
  reserve(111,197,144,216);
  house(114,203,7,6,[[3,5]],BR,0,'slate',postRandom);
  house(132,201,9,5,[[0,2],[5,4]],CO,0,'conc',postRandom);
  for(const [x,y] of [[114,199],[139,211]]){
    house(x,y,3,3,[[x===114?2:0,1]],BR,0,'watchpost',postRandom);
  }
  bigPath([[111,208],[113,208],[117,210],[117,208]],.85);
  bigPath([[128,204],[131,203],[132,203]],.9);
  for(const [id,x] of [['a4',124.5],['a5',131.5]]){
    Object.assign(NPCDEF.find(e=>e.sid===id),{x,y:200.5});
  }
  const post=LOCATIONS.find(l=>l.id==='army');
  Object.assign(post,{bounds:[112,198,143,215],entrances:[[129,198],[112,208]]});
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
  [[42.5,183],[45.6,182.6],[49.9,179],[51.5,177.5],[52.4,177.5],[52.9,174.6],[54,173],[55.2,169],[55.5,166.7],[55.7,163.9],[56,163.6],[56.4,163.1],[59.5,161.7]],
  [[56,163.6],[51,162.7]],
  [[54,173],[52.7,174]],
  [[55.5,166.7],[58.8,166.9],[62,168.6],[65.5,167],[69,163.7]],
  [[62,168.6],[63.6,171.2],[68.3,174]],
  [[62,168.6],[59,176.3]],
  [[65.5,167],[73.4,166.5],[74,166],[84,166.5]],
  [[49.5,177.7],[49.9,179]]
];
function bigVillageYards() {
  // The old yard seats are bark-covered logs. After remapping, keep those only outdoors;
  // furnishHouses lays out the indoor seats against walls and reserves their aisles.
  for(let i=DECOR.length-1;i>=0;i--){
    const [kind,x,y]=DECOR[i];
    if(kind==='bench' && isFloor(tAt(Math.floor(x),Math.floor(y))))DECOR.splice(i,1);
  }
  // Машина у западной кромки двора оставляет проход между костром и домом.
  for (const lane of VILLAGE_LANES) bigPath(lane.map(([x,y])=>[x-.5,y-.5]), .7);
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
  [[120, 19, 0], [123, 23, 1], [121.5, 27.5, 0], [131, 21, 1]].forEach((c, i) => addObj({ k: 'car', x: c[0] * T, y: c[1] * T + 4, w: 2 * T, h: T - 8, solid: 1, opaque: 0, seed: i===3 ? 12 : 10+i }));
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
  ['concreteWire',112.5,198.5,125.5,198.5], ['concreteWire',132.5,198.5,142.5,198.5],
  ['concreteWire',142.5,198.5,142.5,214.5], ['concreteWire',112.5,214.5,142.5,214.5],
  ['concreteWire',112.5,198.5,112.5,207.2], ['concreteWire',112.5,209,112.5,214.5]
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
  ['c1_log0', 16, 124, 41, 0.55],
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
  ['c1_trace_pipes', 201.25, 150.1, 49, 1.53],
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

const LESSER_FIRE = { x: 90.5*T, y: (LESSER_TOP+49.5)*T };
const campOf = e => inGarbage(e.x/T,e.y/T) ? dumpFire : BIG && e.x < WEST*T ? LESSER_FIRE : FIRE;
const WORLD_FIRES = BIG ? [FIRE, FIRE2, LESSER_FIRE] : [FIRE, FIRE2];
const lesserPlaces = [
  // id, название, границы, общедоступная точка подхода
  ['zalissya','Залесье',[78,36,104,57],[91,49]],
  ['poppies','Маковое поле',[20,-21,70,35],[48,27]],
  ['mill','Старая мельница',[40,62,60,79],[55,69]],
  ['cowsheds','Коровники',[111,17,132,33],[123,26]],
  ['tower_lz','Водонапорная башня',[73,25,81,32],[78,31]],
  ['sphere','Комплекс «Сфера»',[152,37,176,54],[155,48]],
  ['barge','Баржа в старице',[25,78,42,88],[40,80]],
  ['survey','Пост замеров',[67,73,80,85],[74,81]],
  ['bulge','Бульба',[118,65,133,78],[126,75]],
  ['postal','Почтовое отделение',[54,37,64,47],[60,44]],
  ['fuel_lz','Склад ГСМ',[183,62,199,76],[191,69]],
  ['elevator_lz','Старый элеватор',[139,77,154,91],[146,82]],
  ['ribs_lz','Рёбра',[97,76,108,88],[105,82]],
  ['boiler_lz','Котельная',[197,22,214,35],[204,31]],
  ['bunker_lz','Бункер наблюдений',[50,6,61,13],[56,11]],
  ['north_lz','Лесной кордон',[18,2,32,13],[25,10]]
];
const lesserLore = {
  dump_scale:'Костёр держим под стеной старой конторы. Отсюда к депо иди вдоль разгрузочной дороги на запад.',
  dump_sorter:'Сухая канава огибает южный отвал. На гребне дозиметр трещит, а внизу можно пройти.',
  dump_driver:'На Кордон держись колеи мимо южных ворот кладбища. К ангару поворачивай на запад у остановки.',
  lz_spool: 'Ящик с зелёным замком стоит в доме у костра. Сюда доходят вещи из твоего ящика на Кордоне.',
  lz_sieve: 'Видишь старую водонапорку за крышами? От неё одна колея идёт к коровникам, другая возвращается в деревню.',
  lz_meter: 'В старице маятник детектора тянет к воде. В самом центре завихрения лучше не задерживаться.',
  lz_watch: 'Держись дороги мимо почты и выйдешь к костру в Залесье. К Кордону держись восточной дороги за котельной.',
  lz_millhand: 'Среди маков глаза сами закрываются. Возьми энергетик или обходи поле по краю.'
};
const poppyBed = (x,y) => ((x-45)/23)**2 + ((y-7)/27)**2 + .09*Math.sin(.24*x+.16*y);
const lesserLandmarks = [
  {kind:'mill', x:46.8, y:73.4, radius:136, baseWidth:161, baseHeight:222, baseOffset:11},
  {kind:'tank', x:77, y:28, radius:48},
  {kind:'antenna', x:85.6, y:44.6, radius:27},
  {kind:'dome', x:165.8, y:43.4, radius:83},
  {kind:'silo', x:128, y:20, radius:28},
  {kind:'silo', x:131, y:20, radius:28},
  {kind:'silo', x:151, y:79.7, radius:40},
  {kind:'silo', x:151, y:83.2, radius:40},
  {kind:'tank', x:193, y:64, radius:31},
  {kind:'tank', x:196, y:64, radius:31}
];
const riverAt = y => 21 + 11*Math.sin((y-10)/17) + 6*Math.sin(y/8);
// Assemble the stamped Cordon once in its own coordinate frame, then place it in
// the eastern half of the final grid. Paths, collision and camera share that grid.
function placeCordon() {
  WORLD.map.fill(VO);
  for (let y=0;y<BIGW.MH;y++) {
    const start=y*BIGW.MW, dest=(NORTH_ROWS+y)*WORLD.MW+WEST;
    WORLD.map.set(BIGW.map.subarray(start,start+BIGW.PW),dest);
    WORLD.keep.set(BIGW.keep.subarray(start,start+BIGW.PW),dest);
    // The trader's interior lives outside the outdoor rectangle in its own room coordinates.
    const room=y*WORLD.MW+WORLD.PW;
    WORLD.map.set(BIGW.map.subarray(start+BIGW.PW,start+BIGW.MW),room);
    WORLD.keep.set(BIGW.keep.subarray(start+BIGW.PW,start+BIGW.MW),room);
    WORLD.roadX[NORTH_ROWS+y]=WEST+BIGW.roadX[y];
  }
  const shift=(p,unit)=>{
    if(p.x<BIGW.PW*unit) p.y+=NORTH_ROWS*unit;
    p.x+=WEST*unit;
  };
  const tile=p=>{if(p[0]<BIGW.PW)p[1]+=NORTH_ROWS;p[0]+=WEST;};
  [...objs,...ANOM0,...ARTS0,...rads,HATCH,STAIRS,FIRE,FIRE2,SUCKER_HOME,...Object.values(POI)].forEach(p=>shift(p,T));
  BUNK.x0+=WEST*T; BUNK.x1+=WEST*T;
  for(const h of HOUSES) {h.ok ||= h.x+','+h.y;shift(h,1);}
  for(const d of [...NPCDEF,...DOGDEF,...CACHES]) shift(d,1);
  for(const l of LOCATIONS){
    if(l.bounds[0]<BIGW.PW){ l.bounds[1]+=NORTH_ROWS;l.bounds[3]+=NORTH_ROWS; }
    l.bounds[0]+=WEST;l.bounds[2]+=WEST;
    const points=new Set(l.entrances||[]);
    for(const v of Object.values(l.anchors||{})) (Array.isArray(v[0])?v:[v]).forEach(p=>points.add(p));
    points.forEach(tile);
  }
  RC1.boars.forEach(b=>tile(b.at));
  SOS_SPOTS.forEach(tile); CLEAR_SPOTS.forEach(tile);
  for(const d of [...DECOR,...CORDON_DETAILS]) {d[1]+=WEST;d[2]+=NORTH_ROWS;}
  for(const f of CORDON_FENCES) { f[1]+=WEST;f[3]+=WEST;f[2]+=NORTH_ROWS;f[4]+=NORTH_ROWS; }
  for(const line of [...VILLAGE_LANES,...VEHICLE_ROUTES]) line.forEach(tile);
  for(const p of Object.values(BIG_EXITS)) shift(p,1);
  for(let i=0;i<FORD.length;i++) FORD[i]+=NORTH_ROWS;
  const oldTrees=[...yardTreeCells];yardTreeCells.clear();
  for(const i of oldTrees) yardTreeCells.add((NORTH_ROWS+Math.floor(i/BIGW.MW))*WORLD.MW+i%BIGW.MW+WEST);
  useGrid(WORLD);
}
function makeLesserZone() {
  if (!BIG) return;
  placeCordon();
  const random = mulberry32(927731);
  const Y = LESSER_TOP;
  for (let y=NORTH_ROWS-Y; y<MH-Y; y++) {
    for (let x=0; x<WEST; x++) {
      let tile = GR;
      const stream = Math.abs(x-riverAt(y));
      const backwater = ((x-30)/10)**2 + ((y-84)/7)**2 < 1;
      const woodland = vnoise(x+73,y+31,12)*.6 + vnoise(x+306,y,5)*.4;
      const roll = random();
      if (x<2 || x>=WEST-2 || y<=NORTH_ROWS+1-Y || y>=MH-Y-2) tile = TR;
      else if (stream < 1.6 || backwater) tile=SW;
      else if (roll < Math.max(.012,(woodland-.42)*1.43)) tile=TR;
      else if (roll > .91) tile=BU;
      setT(x,Y+y,tile);
    }
  }
  // Колея от Залесья смыкается с западной дорогой Кордона.
  const lane = (pts, width, tile=DI) => bigPath(pts.map(([x,y])=>[x,Y+y]),width,tile);
  const clear = (x,y,w,h) => {
    for (let i=x; i<x+w; i++) for (let j=y; j<y+h; j++) setT(i,Y+j,GR);
    reserve(x,Y+y,x+w-1,Y+y+h-1);
  };
  lesserPlaces.forEach(([id,name,b,gate]) => {
    if (id!=='barge' && id!=='poppies') clear(b[0],b[1],b[2]-b[0]+1,b[3]-b[1]+1);
    bigLoc(id,{name,gen:name,type:id==='poppies'||id==='bulge'?'anomaly':'story',
      bounds:[b[0],Y+b[1],b[2],Y+b[3]],entrances:[[gate[0],Y+gate[1]]],anchors:{approach:[gate[0],Y+gate[1]]}});
  });
  for(let y=64;y<=74;y++) for(let x=118;x<=130;x++)
    if(((x-124)/5.5)**2+((y-69)/4.2)**2+vnoise(x,y,2)*.19<1) setT(x,Y+y,SW);
  for(let y=-22;y<=35;y++) for(let x=18;x<=71;x++)
    if(poppyBed(x+.5,y+.5)<1.15 && tAt(x,Y+y)!==SW) setT(x,Y+y,GR);
  lane([[204,31],[222,32],[229,39],[232,48],[240,50],[250,52]],1.05);
  // The cowshed trail crosses the main line on its original timber deck.
  lane([[123,26],[126,21],[126,18],[133,15],[142,2],[145,-8],[145,-19]],1.15);
  bigLoc('lesser_dump',{name:'Северная тропа на Свалку',gen:'северной тропы',type:'story',
    bounds:[191,NORTH_ROWS,199,NORTH_ROWS+5],entrances:[[194,135]],anchors:{approach:[194,135]}});
  lane([[78,31],[74,34],[73,40],[74,45],[76,46]],1.1);
  lane([[36,13],[29,10],[30,-8],[44,-17],[62,-11],[69,5],[65,22],[59,32]],1.1);
  lane([[25,10],[36,13],[39,19],[40,22],[44,24],[48,27],[59,32],[64,36],[65,40],[63,44],[59,44],[68,45],[76,46],[90,46],[102,48],[120,42],[140,47],[146,56],[152,62],[169,64],[181,62],[190,58],[198,59],[198,67],[196,69],[191,69]],2);
  lane([[48,27],[39,29],[32,38],[32,46],[33,52],[34,55.9],[38,59],[42,63],[42,68],[45,69],[49,69],[55,69],[67,61],[72,55],[73,49],[76,46]],1.1);
  lane([[55,69],[53,75],[51,78],[46,80],[40,80]],1.2);
  lane([[55,69],[63,75],[65,80],[69,81],[74,81],[92,77],[107,75],[126,75],[144,69],[149,58],[149,50],[152,48],[155,48]],1.2);
  lane([[78,31],[88,33],[94,26],[105,27],[116,27],[123,26],[129,25],[131,21.5],[135,21.5],[137,30],[144,38],[149,48],[155,48]],1.35);
  lane([[191,69],[186,70],[183,76],[182,82],[164,85],[159,84],[155,82],[154,78],[150,77],[146,80],[126,75]],1.1);
  lane([[36,13],[47,11],[56,11],[70,16],[73,26],[73,29.5],[78,31]],1.2);
  lane([[146,56],[149,48],[155,48],[165,48],[172,48]],1);
  lane([[172,48],[175.5,48.6],[177.7,48.6],[179,50],[183,43],[191,36],[204,31],[222,32]],1.35);
  lane([[204,31],[199,46],[190,58]],1.1);
  lane([[92,77],[97,79],[101,80],[106,80],[112,78],[118,77],[126,75]],1.15);

  // Два брода пересекают русло: оставляем мокрую кромку по обе стороны.
  for (const y of [12,52]) {
    const c=Math.round(riverAt(y));
    for(let i=-4;i<=4;i++) for(let j=-1;j<=1;j++) setT(c+i,Y+y+j,DI);
  }
  const cottages = [
    [78,37,7,5,'slate'],[89,38,7,6,'plank'],[98,41,6,5,'slate'],
    [78,50,12,8,'plank'],[94,53,7,5,'slate'],[56,37,7,5,'plank'],
    [42,17,5,4,'plank'],[45,63,10,5,'plank'],
    [111,18,13,5,'slate'],[117,29,13,5,'slate'],
    [153,39,8,5,'conc'],[168,50,9,5,'conc'],[67,75,7,5,'conc'],
    [140,85,11,5,'slate'],[198,24,12,5,'conc'],[210,27,5,4,'conc'],[51,6,8,4,'conc'],
    [183,63,8,5,'slate'],[187,72,12,5,'conc'],[19,4,6,4,'plank']
  ];
  for (const [x,y,w,h,roof] of cottages) {
    // Leave existing road surfaces along the facade while clearing the plot.
    rcClear(x-1,Y+y-1,x+w,Y+y+h);
    const tavern=x===78 && y===50, mid=Math.floor(w/2);
    const doors=tavern?[[mid,0],[mid+1,0]]:[[mid,h-1]];
    house(x,Y+y,w,h,doors,roof==='conc'?CO:BR,0,roof,random);
    for(const [i] of doors)for(let j=0;j<3;j++)
      setT(x+i,Y+y+(tavern?-1-j:h+j),DI);
    HOUSES[HOUSES.length-1].ok = x+','+(Y+y-NORTH_ROWS);
  }
  // Open strips between the pens and yards are actual walkable gates.
  for (const [kind,x1,y1,x2,y2] of [
    ['stockade',76,35,106,35],['stockade',76,61,106,61],
    ['stockade',76,35,76,44],['stockade',76,49,76,61],
    ['stockade',106,35,106,45],['stockade',106,50,106,61],
    ['picket',78,43.5,81,43.5],['picket',84.7,43.5,87,43.5],
    ['picket',87,39,87,43.5],['picket',93,51.8,96,51.8],
    ['picket',100,50,100,51.8],['picket',98.5,51.8,100,51.8],
    ['rail',108.5,25.5,114,25.5],['rail',108.5,21,108.5,25.5],
    ['rail',128,28.2,133,28.2],['rail',133,23,133,28.2],
    ['mesh',151.5,37,168.5,37],['mesh',151.5,37,151.5,45],
    ['mesh',151.5,51,151.5,56],['mesh',151.5,56,159.5,56],
    ['mesh',176.8,39,176.8,48],['mesh',168.5,37,176.8,37],['mesh',176.8,37,176.8,39]
  ]) CORDON_FENCES.push([kind,x1,Y+y1,x2,Y+y2]);
  for (const [x,y,t] of [[78,44,BU],[86,41,BU],[82,49,TR],[86,50,BU],[94,48,BU],
    [98,38,TR],[101,39,BU],[88,53,BU],[76,53,TR],[111,24,BU],[132,29,TR],
    [47,61,TR],[55,68,BU],[155,37,BU],[168,46,TR],[77,27,BU]]) {
    if(tAt(x,Y+y)===GR) setT(x,Y+y,t);
  }
  // Bar in the southwest plank house; keep the north aisle open towards the village street.
  for (const [barRole,x,y,w,h] of [
    ['counter',80,53.02,96,20],['bench',87.3,52.4,41,19],
    ['guests',80.5,55.2,44,24],['guests',86.3,55.5,35,23],['shelf',79.2,51.1,83,12],['shelf',82,51.1,61,12]
  ]) addObj({k:'table',barRole,barService:barRole==='counter',x:x*T,y:(Y+y)*T,w,h,solid:1});
  for (const sign of trailSigns) {
    const tx=Math.floor(sign.x),ty=Math.floor(sign.y);
    if(tAt(tx,ty)===TR || tAt(tx,ty)===BU) setT(tx,ty,GR);
    const span=sign.village?16:4;
    addObj({k:'signpost',village:!!sign.village,x:sign.x*T-span/2,y:sign.y*T-3,w:span,h:6,solid:1});
  }
  // The hull rests across the reed line. Boxes and sleepers are ashore.
  addObj({k:'bargeHull',x:35.1*T-140,y:(Y+82)*T-26,w:280,h:52,solid:1});
  for (const l of lesserLandmarks) {
    const x=l.x*T,y=(Y+l.y)*T,r=l.radius*(l.kind==='antenna'?.38:.78);
    const w=l.baseWidth || r*2,h=l.baseHeight || r*2;
    addObj({k:'installation',x:x-w/2,y:y-h/2+(l.baseOffset||0),w,h,solid:1,opaque:1});
  }
  addObj({k:'fire',x:LESSER_FIRE.x-10,y:LESSER_FIRE.y-10,w:20,h:20,solid:1});
  addObj({k:'locker',baseName:'Залесье',x:92*T,y:(Y+41)*T,w:26,h:18,solid:true});
  for(const [stash,x,y,loot] of [
    ['lz_mill',51,65,{bandage:2,energy:1}], ['lz_sphere',157,41,{a9:16,medkit:1}],
    ['lz_post',58,39,{bread:1,antirad:1}], ['lz_barge',42,81,{money:75,cans:1}]
  ]) addObj({k:'crate',stash,x:x*T+3,y:(Y+y)*T+3,w:26,h:26,solid:1,loot});
  CORDON_DETAILS.push(...[
    ['c1_trace_reel',52.4,72.2,29,.25],
    ['c1_trace_pipes',207,33.5,65,.1],['c1_trace_reel',143,81,31,.3],
    ['c1_rock1',99,84,98,-.68],['c1_rock0',101,83.7,68,-.64],
    ['c1_rock1',102.7,84.2,76,-.57],['c1_rock0',104.7,85,52,-.51],
    ['c1_tractor',114.8,24.2,80,-.12],['c1_trace_churn',122.5,24,25,-.16],
    ['c1_trace_pipes',160,47,72,.57],['c1_sandbags',153.2,46,52,.08],
    ['c1_barrel',95,46,22,.06],['c1_tires',67,42,39,.17],
    ['c1_trace_wheel',42.7,69.7,23,-.2],['c1_trace_sleepers',41.6,83.4,61,-.28],
    ['c1_crate_army',68,83,30,.04],['c1_trace_stump',39,25,35,.8],
    ['c1_yard_car',83,48.5,69,-.56],['c1_trace_pipes',195,72,75,.2]
  ].map(([id,x,y,width,a])=>[id,x,Y+y,width,a]));
  ANOM0.push({id:'lz-ribs',k:'e',x:102*T,y:(Y+82)*T,r:31},{id:'lz-pool',k:'g',x:124*T,y:(Y+69)*T,r:70},
    {id:'lz-yard',k:'e',x:162*T,y:(Y+51)*T,r:37});
  ARTS0.push({key:'lz_pool',id:'art_medusa',x:126*T,y:(Y+69)*T},
    {key:'lz_yard',id:'art_bengal',x:163*T,y:(Y+51)*T});
  for(const [sid,name,x,y,wpn,fac] of [
    ['lz_barman','Клён',81,51.75,'w_pm','loner'],['lz_guest','Лист',80.2,54.2,'w_pm','loner'],
    ['lz_guest2','Уголёк',81,56,'w_obrez','loner'],
    ['lz_tech','Клемма',86.5,52.8,'w_pm','loner'],['lz_spool','Катушка',89,49,'w_pm','loner'],['lz_sieve','Сито',92,50,'w_obrez','loner'],
    ['lz_millhand','Мельник',54,70,'w_pm','loner'],['lz_meter','Шкала',75,80,'w_pm','loner'],
    ['lz_watch','Кряж',23,9,'w_toz34','loner'],['lz_cut','Дежурный',157,47,'w_pm','army'],
    ['lz_rivet','Радист',170,48,'w_obrez','army']
  ]) NPCDEF.push({sid,name,x:x+.5,y:Y+y+.5,wpn,fac,guard:fac==='army'?'sphere':undefined,named:1,stay:1,sit:['lz_spool','lz_sieve','lz_guest','lz_guest2'].includes(sid),localFire:sid.startsWith('lz_guest')?{x:81.2*T,y:(Y+55.55)*T}:LESSER_FIRE});
  DOGDEF.push({sid:'lz_yard_dog',pack:'lz_yard',x:125.5,y:Y+26.5},{sid:'lz_fuel_dog',pack:'lz_fuel',x:186,y:Y+69});
}
// World tiles. The east end shares both gauge and sleeper phase with the Cordon.
const railAxis = x => NORTH_ROWS+57.5-.0034*Math.max(0,176-x)**2;
const levelCrossing = x => x>=143 && x<=147;
function buildLesserRail() {
  for(let x=0;x<WEST;x++){
    const mid=Math.floor(railAxis(x+.5));
    for(let y=Math.max(0,mid-2);y<=Math.min(MH-1,mid+2);y++){
      const core=Math.abs(y-mid)<=1;
      if(core) setT(x,y,levelCrossing(x)?DI:RA);
      else if(tAt(x,y)===TR || tAt(x,y)===BU) setT(x,y,GR);
    }
  }
}
const lesserMainTrack=Array.from({length:WEST+1},(_,x)=>[x,railAxis(x)]);
function drawLesserRail(g,win) {
  drawFreightTrack(g,lesserMainTrack,win);
  if(win && (win.x0>148*T || win.x1<143*T || win.y0>railAxis(148)*T+40 || win.y1<railAxis(143)*T-40))return;
  for(let x=143;x<148;x++){
    const cy=railAxis(x),slope=railAxis(x+1)-cy;
    g.save();g.translate(x*T,cy*T);g.transform(1,slope,0,1,0,0);
    g.fillStyle='#635849';g.fillRect(0,-8,T,14);
    g.fillStyle='#403932';g.fillRect(0,-1,T,1);g.restore();
  }
}
const lesserSprites = {};
async function loadLesserSprites() {
  await Promise.all(Object.entries(window.LESSER_ART || {}).map(async ([name,url]) => {
    const sprite = new Image(); sprite.src=url;
    try { await sprite.decode(); lesserSprites[name]=sprite; } catch { /* Render the baked map and the simple landmark silhouettes if decoding fails. */ }
  }));
}
// Foot positions, in world tiles. Lettering stays on the face as the board turns.
const trailSigns = [
  {x:369.2,y:NORTH_ROWS+4,label:'СВАЛКА ↑',angle:.08},
  {x:361,y:53.4,label:'← ДЕПО',angle:-.14},
  {x:WEST+8.45,y:NORTH_ROWS+121.35,label:'← МАЛАЯ ЗОНА',angle:-.12},
  {x:58.6,y:LESSER_TOP+45.75,label:'← МЕЛЬНИЦА',angle:-.12},
  {x:112.5,y:LESSER_TOP+50.45,label:'СФЕРА →',angle:.14},
  {x:72,y:LESSER_TOP+43.8,village:true,angle:-.22},
  {x:107.35,y:LESSER_TOP+50.75,village:true,angle:.18}
];
function drawTrailSigns(g) {
  if (!BIG || (perspective && ART)) return;
  for (const sign of trailSigns) {
    const x=sign.x*T, y=sign.y*T, width=sign.village?36:32;
    if (x+width<GWP.x0 || x-width>GWP.x1 || y+width<GWP.y0 || y-width>GWP.y1) continue;
    drawTrailSign(g,sign);
  }
}
function drawTrailSign(g,sign) {
    const x=sign.x*T,y=sign.y*T,width=sign.village?36:32;
    const sprite=lesserSprites[sign.village?'village-sign':'fingerpost'];
    if (!sprite) return;
    const height=width*sprite.height/sprite.width;
    g.save(); g.translate(x,y); g.rotate(sign.angle);
    g.save(); spriteShadow(g,2,1);
    g.globalAlpha=.87;
    g.drawImage(sprite,-width/2,-height,width,height);
    g.restore();
    if (sign.label) {
      g.fillStyle='#baaf93'; g.textAlign='center'; g.textBaseline='middle';
      g.font='600 4px sans-serif';
      g.fillText(sign.label,0,-height*.78,width*.84);
    }
    g.restore();
}
// Окраска соцветий, рёбра оболочек и тени попадают в те же кэшированные
// куски земли, что и местные декорации. На мини-карте используется тот же план.
function drawLesserDetails(g) {
  if (!BIG || GW.x0>=WEST) return;
  const top=LESSER_TOP;
  for(let y=Math.max(-22,GW.y0-top);y<=Math.min(35,GW.y1-top);y++)
    for(let x=Math.max(18,GW.x0);x<=Math.min(71,GW.x1);x++) {
      const density=1-poppyBed(x+.5,y+.5);
      if(density<=0 || tAt(x,top+y)!==GR) continue;
      const rand=mulberry32(x*9181+y*731);
      const sprite=lesserSprites.flowers;
      if(!sprite) continue;
      const clump=vnoise(x+33,y+79,3.5);
      const clusters=Math.floor(Math.sqrt(density)*(.8+4.7*clump)+rand());
      paintPoppyHeads(g,x,y);
      for(let i=0;i<clusters;i++){
        const px=(x+rand())*T, py=(top+y+rand())*T, size=21+rand()*19;
        g.save();g.translate(px,py);g.rotate(rand()*Math.PI*2);
        g.drawImage(sprite,-size/2,-size/2,size,size);g.restore();
      }
    }
  const bx=35.1*T, by=(top+82)*T, hull=lesserSprites.barge;
  if (!perspective && hull && bx+172>=GWP.x0 && bx-172<=GWP.x1 && by+48>=GWP.y0 && by-48<=GWP.y1) {
    const h=324*hull.height/hull.width;
    g.save(); g.translate(bx,by); spriteShadow(g,3,2);
    g.drawImage(hull,-162,-h/2,324,h); g.restore();
  }
  if (!perspective) drawLesserInstallations(g,GWP);
}
function drawLesserInstallations(g,win) {
  for (const l of lesserLandmarks) {
    const x=l.x*T,y=(LESSER_TOP+l.y)*T,r=l.radius;
    if(win && (x+r*2<win.x0 || x-r>win.x1 || y+r*2<win.y0 || y-r>win.y1)) continue;
    g.save();g.translate(x,y);
    spriteShadow(g,l.kind==='antenna'?5:Math.min(14,r*.2),Math.min(8,r*.1));
    const sprite=lesserSprites[l.kind];
    if(sprite) {
      const scale=2*r/Math.max(sprite.width,sprite.height), w=sprite.width*scale,h=sprite.height*scale;
      g.drawImage(sprite,-w/2,-h/2,w,h);
    }
    else {
      g.fillStyle='#79786b';g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    }
    g.restore();
  }
}

// Old maps used either stacked regions (252 columns) or a western region (492 columns).
// Move coordinates, explored cells and tile-keyed loot before restoring actors.
function migrateNorthernWorld(s) {
  const stacked=s.mapVersion==='kordon-big', columns=stacked?252:MW;
  // These landmarks only existed in the preview of the east-west belt.
  const oldPlaces=[
    ['dump_depot',101,8,141,31],['dump_yard',181,31,202,47],['dump_market',221,8,238,22],
    ['dump_mounds',163,29,183,42],['dump_stop',206,19,214,25],['dump_pumps',210,10,220,18],
    ['dump_ditch',155,34,167,42],['dump_checkpoint',196,2,205,10],['dump_watch',244,8,255,16]
  ];
  const point=(p,unit)=>{
    if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if(stacked){
      if(p.y>=CORDON_ROWS*unit) p.y+=(LESSER_TOP-CORDON_ROWS)*unit;
      else { if(p.x<BIGW.PW*unit)p.y+=NORTH_ROWS*unit;p.x+=WEST*unit; }
      return;
    }
    if(p.x>=PW*unit) return;
    if(s.flags?.visitedDump){
      const x=p.x/unit,y=p.y/unit;
      const site=oldPlaces.find(([,l,t,r,b])=>x>=l && x<r+1 && y>=t && y<b+1);
      if(site){
        const [id,l,t]=site, bounds=LOC[id].bounds;
        p.x+=(bounds[0]-l)*unit;p.y+=(bounds[1]-t)*unit;return;
      }
    }
    p.y+=NORTH_ROWS*unit;
  };
  const index=i=>{
    const p={x:i%columns,y:Math.floor(i/columns)};
    point(p,1);return p.y*MW+p.x;
  };
  point(s,T);
  for(const e of s.dyn?.npcs||[]) {
    point(e,T);point(e.home,T);point(e.trip,T);point(e.waitAt,T);point(e.ringPt,T);point(e.evacuation?.trip,T);
  }
  point(s.jobs?.act,1);point(s.sos?.act,1);
  for(const job of s.jobs?.offer||[]) point(job,1);
  const flags=s.flags||{}, stock=flags.fieldCrates;
  if(stock) {
    for(const slot of stock.slots) slot.tile=index(slot.tile);
    stock.drops=Object.fromEntries(Object.entries(stock.drops||{}).map(([k,v])=>[index(+k),v]));
  }
  for(const key of ['groundItems','crateCleanup']) if(flags[key]){
    flags[key]=Object.fromEntries(Object.entries(flags[key]).map(([k,v])=>[
      /^field_\d+$/.test(k)?'field_'+index(+k.slice(6)):k,v]));
  }
  const renamed=[];
  for(const key of Object.keys(flags)){
    const match=/^(broken_|contents_|st_)field_(\d+)$/.exec(key);
    if(match){renamed.push([match[1]+'field_'+index(+match[2]),flags[key]]);delete flags[key];}
  }
  Object.assign(flags,Object.fromEntries(renamed));
  const bits=new Uint8Array(Math.ceil(MW*MH/6));
  for(let i=0;i<(s.fog||'').length;i++){
    const mask=s.fog.charCodeAt(i)-48;
    for(let b=0;b<6;b++) if(mask&(1<<b)){
      const target=index(i*6+b);bits[Math.floor(target/6)]|=1<<(target%6);
    }
  }
  s.fog=Array.from(bits,n=>String.fromCharCode(48+n)).join('');
  s.mapVersion=MAP_VERSION;
}

// The northern extension is part of the same world grid as both southern regions.
function inGarbage(x,y) {
  return BIG && x>=0 && x<PW && y>=0 && y<NORTH_ROWS;
}
const dumpFire = {x:389*T,y:31.6*T};
const dumpHills = [
  [334,84,17,8,-.18],[376,41,13,7,.20],[332,31,16,6,.11],
  [420,23,9,4,-.26],[369,58,8,4,.32]
];
const dumpTanks = [[374,30],[377.3,30]];
const dumpPlaces = [
  ['dump_yard','Кладбище техники',[342,95,363,111],[358,102]],
  ['dump_depot','Перегрузочное депо',[262,30,302,53],[294,50]],
  ['dump_market','Барахолка',[382,23,399,37],[389,33]],
  ['dump_mounds','Шлаковые отвалы',[324,77,344,90],[341,83]],
  ['dump_stop','Старая автостанция',[367,34,375,40],[369,39]],
  ['dump_pumps','Мазутная эстакада',[371,25,381,33],[376,33]],
  ['dump_ditch','Водоотводный коллектор',[316,82,328,90],[322,84]],
  ['dump_checkpoint','Северная застава',[357,9,366,17],[360,14]],
  ['dump_watch','Сторожка весовой',[405,23,416,31],[410,28]],
  ['dump_sorting','Сортировочная станция',[161,47,204,68],[180,60]]
];
// The post, the cemetery entrance and the depot junction lie on the same northbound road.
const dumpHighway=[[367,NORTH_ROWS+2],[367,119],[367,103],
  [366,95],[365,81],[363,66],[363,51],[365,42],[365,30],[362,22],[360,14]];
// The trail stays on the north-west toe of the freight embankment up to the depot deck.
const dumpTrail=[[145,181],[151,178],[165,178],[177,173],[183,162],[188,148],
  [194,135],[200,123],[208,110],[216,99],[225,85],[233,74],[241,61],
  [247,66.52],[252,71],[260,64],[270,58],[279,55],[285,52],[294,50]];
const sortingRoad=[[241,61],[224,63],[207,68],[195,64],[190,61],[180,60],[161,61],[147,64],[132,64],[122,61]];
function easeRailBends(points) {
  const result=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const [x,y]=points[i], [ax,ay]=points[i-1], [bx,by]=points[i+1];
    const enter=Math.hypot(x-ax,y-ay), leave=Math.hypot(bx-x,by-y);
    const trim=Math.min(4,enter*.44,leave*.44);
    for(let j=0;j<=4;j++){
      const before=(1-j/4)**2*trim/enter, after=(j/4)**2*trim/leave;
      result.push([x+(ax-x)*before+(bx-x)*after,y+(ay-y)*before+(by-y)*after]);
    }
  }
  return [...result,points[points.length-1]];
}
// Cubic transitions share a tangent with the track at both ends.
function railCurve(a,b,c,d) {
  const steps=Math.ceil((Math.hypot(b[0]-a[0],b[1]-a[1])+Math.hypot(c[0]-b[0],c[1]-b[1])+Math.hypot(d[0]-c[0],d[1]-c[1]))/1.4);
  const points=[a];
  for(let i=1;i<steps;i++){
    const t=i/steps,u=1-t;
    points.push(a.map((v,j)=>u*u*u*v+3*u*u*t*b[j]+3*u*t*t*c[j]+t*t*t*d[j]));
  }
  return [...points,d];
}
const approachY=x=>77-(x-237)*22/21;
const depotPoints=[241,approachY(241)];
const sidings=[
  [depotPoints,...railCurve([249,approachY(249)],[256,approachY(256)],[263,48],[273,48]),[305,48]],
  [...railCurve(depotPoints,[249,approachY(249)],[248,42],[261,42]),[316,42]],
  [[235,42],[261,42]],
  easeRailBends([[154,railAxis(154)],[160,railAxis(154)+6*(railAxis(155)-railAxis(154))],[166,188.7],[172,187.4],[178,183.5],
   [183,177.5],[187,170],[191,160],[195,149],[200,137],[206,125],
   [213,113],[221,102],[230,88],[237,77],depotPoints]),
  easeRailBends([[81,48],[127,48],[143,48],[155,47],[174,45],[197,45],[207,44.6],[222,42.4],[229,42],[235,42]]),
  [...railCurve([135,48],[142,48],[148,50.6],[156,50.6]),
    ...railCurve([212,50.6],[219,50.6],[224,42],[234,42])],
  [...railCurve([159,50.6],[165,50.6],[169,54.7],[176,54.7]),
    ...railCurve([192,54.7],[199,54.7],[202,50.6],[211,50.6])]
];
const freightLine=sidings[3];
// Intersect the service roads with the same centrelines we render, including
// both branches at the approach. Do this once when the world is constructed.
function levelDecks(road,tracks) {
  const decks=[];
  for(let j=1;j<road.length;j++){
    const [x,y]=road[j-1],rx=road[j][0]-x,ry=road[j][1]-y;
    for(const line of tracks)for(let i=1;i<line.length;i++){
      const [ax,ay]=line[i-1],dx=line[i][0]-ax,dy=line[i][1]-ay;
      const det=rx*dy-ry*dx;
      if(Math.abs(det)<1e-8)continue;
      const along=((ax-x)*dy-(ay-y)*dx)/det, rail=((ax-x)*ry-(ay-y)*rx)/det;
      if(along>=0 && along<1 && rail>=0 && rail<1)
        decks.push({x:x+rx*along,y:y+ry*along,angle:Math.atan2(dy,dx)});
    }
  }
  return decks;
}
const depotServiceRoad=[[311,51],[315.5,46],[315.5,39],[310,36],[304,38],[297,38]];
const freightDecks=[...levelDecks(dumpTrail,sidings),...levelDecks(depotServiceRoad,sidings)];
// Keep the future works beyond a wooded cutting. Its south rim ends north of the old main line.
function cuttingDepth(x,y) {
  return Math.min(80+2*Math.sin(y*.12)-x,72+3*Math.sin(x*.10)-y);
}
function stampFreightBank() {
  // Clear the ballast under the visible branch. The wooded cutting bounds the route.
  for(let i=1;i<freightLine.length;i++){
    const [ax,ay]=freightLine[i-1],[bx,by]=freightLine[i];
    const slope=(by-ay)/(bx-ax),normal=Math.hypot(1,slope);
    for(let x=Math.ceil(ax-.5);x+.5<bx;x++){
      const cy=ay+(x+.5-ax)*slope;
      for(let y=Math.floor(cy-normal);y<=Math.ceil(cy+normal);y++){
        if(Math.abs(y+.5-cy)>.86*normal) continue;
        if(x>165 || tAt(x,y)!==RA) setT(x,y,DI);
      }
    }
  }
}
const wagonWidth=5.75, wagonDepth=1.43;
// Store a wagon on a named horizontal siding. Rail axis, body, collision and PDA
// are derived from this placement. The wheelsets sit underneath the body centre.
function addRailVehicle(siding,x,sprite='wagon',width=wagonWidth,depth=wagonDepth) {
  const line=sidings[siding];
  const segment=line.findIndex(([bx,by],i)=>i>0 && line[i-1][1]===by &&
    line[i-1][0]<=x-width/2 && bx>=x+width/2);
  if(segment<0) throw new Error('No straight track for vehicle at '+x);
  const y=line[segment][1];
  addObj({k:'freightWagon',sprite,x:(x-width/2)*T,y:(y-depth/2)*T,
    w:width*T,h:depth*T,solid:1,opaque:1});
}
function makeGarbage() {
  if (!BIG) return;
  const random=mulberry32(452788);
  // Continuous northern terrain, with open clearings separated by wooded ridges.
  for(let y=0;y<NORTH_ROWS;y++)for(let x=0;x<PW;x++){
    const woodland=.72*vnoise(x+98,y+34,16)+.28*vnoise(x+63,y+70,6);
    const depth=cuttingDepth(x,y);
    const roll=random(), edge=y<2 || x<2 || x>=PW-2 || (depth>=0 && depth<4);
    setT(x,y,edge || roll<Math.max(.018,(woodland-.34)*.97)?TR:roll>.93?BU:GR);
  }
  // Soften the old forest border where the southern maps used to end.
  for(let y=NORTH_ROWS;y<NORTH_ROWS+2;y++)for(let x=3;x<PW-3;x++){
    const cover=vnoise(x+98,y+34,16);
    if(tAt(x,y)===TR && random()>cover*.38) setT(x,y,GR);
  }
  buildLesserRail();
  for(const [id,name,bounds,gate] of dumpPlaces){
    rcClear(...bounds);
    bigLoc(id,{name,gen:name,type:id==='dump_mounds'?'anomaly':'story',
      bounds,entrances:[gate],anchors:{approach:gate}});
  }
  for(const [x,y,w,h] of dumpHills) rcClear(Math.floor(x-w/2),Math.floor(y-h/2),Math.ceil(x+w/2),Math.ceil(y+h/2));
  // A shallow drainage cut runs along the outer toe of the heap. The two
  // banks meet at a dry service ramp beside the concrete pipes.
  for(let x=317;x<=328;x++){
    const mid=86+1.4*Math.sin((x-319)*.4);
    for(let y=83;y<=89;y++){
      const d=Math.abs(y-mid);
      if(d<1.3 && x!==322 && x!==323) setT(x,y,SW);
      else if(d<2.3) setT(x,y,DI);
    }
  }
  bigPath(dumpHighway,1.55,AS);
  for(let i=1;i<dumpHighway.length;i++){
    const [ax,ay]=dumpHighway[i-1],[bx,by]=dumpHighway[i];
    for(let row=by;row<ay && row<NORTH_ROWS;row++) roadX[row]=Math.round(lerp(bx,ax,(row-by)/(ay-by)));
  }
  bigPath(dumpTrail,1.25);
  bigPath(sortingRoad,1.35);
  const lanes=[
    [[367,105],[360,106],[358,102],[354,102],[348,102],[348,105.9]],
    [[365,96],[361,92],[355,93],[353,96],[350,100],[348,102]],
    [[360,106],[356,108],[354,111],[349,113],[342,111],[337,106],[331,94],[323,90],[322,87],[322,84]],
    [[363,51],[356,51],[345,48],[332,49],[322,51],[311,51],[299,51],[291,51]],
    depotServiceRoad,
    [[294,50],[287,51.5],[280,51.5],[274,50],[265,49]],
    [[315.5,39],[313,34],[311,26],[318,25],[332,33],[346,24],[360,14]],
    [[365,42],[369,39],[378,36],[389,33],[397,32]],
    [[362,22],[369,26],[370.5,31],[373,33],[376,33],[381,33],[389,33]],
    [[389,33],[398,33],[405,29],[410,28]],
    [[322,84],[322,66],[322,51]],[[341,83],[352,78],[363,66]]
  ];
  for(const line of lanes) bigPath(line,1.2);
  for(const [x,y,w,h,doors,mat] of [
    [264,32,28,13,[[0,9],[0,10],[27,9],[27,10],[21,12],[22,12]],'depot'],
    [294,32,7,5,[[3,4]],'conc'],[298,44,6,3,[[2,2]],'slate'],
    [383,23,8,5,[[4,4]],'slate'],[393,26,6,4,[[2,3]],'plank'],
    [391,34,8,5,[[4,0]],'ruin'],[342,104,5,5,[[4,2]],'conc'],
    [405,23,8,4,[[5,3]],'conc'],[369,34,6,3,[[2,2]],'slate'],
    [357,10,5,3,[[2,2]],'conc'],
    [230,55,6,4,[[3,3]],'conc'],[174,63,15,6,[[4,0],[11,0]],'slate'],
    [197,57,5,4,[[2,3]],'plank'],[123,55,5,4,[[2,3]],'conc']
  ]) {
    for(let row=y-2;row<=y+h+1;row++)for(let col=x-2;col<=x+w+1;col++){
      if(tAt(col,row)===TR || tAt(col,row)===BU) setT(col,row,GR);
    }
    house(x,y,w,h,doors,mat==='plank'||mat==='depot'?BR:CO,mat==='ruin'?.28:0,mat,random);
    HOUSES[HOUSES.length-1].ok='dump_'+x+'_'+y;
  }
  // The two sidings diverge from the existing embankment and end at wheel stops.
  rcClear(245,40,262,48);
  for(const line of sidings) bigPath(line,1.1);
  stampFreightBank();
  // Clear the same corridor the sleepers and ballast occupy, also between tile centres.
  for(const line of sidings) for(let i=1;i<line.length;i++){
    const [ax,ay]=line[i-1],[bx,by]=line[i], dx=bx-ax,dy=by-ay;
    for(let x=Math.floor(ax-2);x<=Math.ceil(bx+2);x++){
      for(let y=Math.floor(Math.min(ay,by)-2);y<=Math.ceil(Math.max(ay,by)+2);y++){
        const t=tAt(x,y);if(t!==TR && t!==BU)continue;
        const along=clamp(((x+.5-ax)*dx+(y+.5-ay)*dy)/(dx*dx+dy*dy),0,1);
        if(Math.hypot(x+.5-ax-along*dx,y+.5-ay-along*dy)<1.95)setT(x,y,GR);
      }
    }
  }
  for(const spur of [[[233,59],[233,62]],[[178,62],[178,60]],[[199,61],[199,65]],[[125,59],[125,62]]])
    bigPath(spur,1.1);
  for(const [track,x] of [[0,280.5],[0,287.1],[1,297.3],[1,304.3],[1,311.3]]) addRailVehicle(track,x);
  addRailVehicle(2,243,'shunter',5.2,1.45);
  for(const x of [181.5,188.3]) addRailVehicle(6,x);
  addObj({k:'scrapCrane',x:246*T,y:46*T,w:1.65*T,h:1.2*T,solid:1,opaque:1});
  for(const [x,y] of dumpTanks)
    addObj({k:'installation',x:(x-.87)*T,y:(y-.87)*T,w:1.74*T,h:1.74*T,solid:1});
  for(const fence of [
    ['mesh',342,95,351,95],['mesh',356,95,363,95],['mesh',342,95,342,103],
    ['mesh',344,110.5,352,110.5],['mesh',357,110.5,363,110.5],
    ['mesh',262,30,301,30],['mesh',262,30,262,39],
    ['mesh',265,53,277,53],['mesh',300,53,305,53],
    ['concreteWire',356,9.5,361,9.5],['concreteWire',364,9.5,366,9.5],
    ['mesh',372,25,380,25],['mesh',380,25,380,29],
    ['mesh',170,69.8,194,69.8],['mesh',170,64,170,69.8],['mesh',194,67,194,69.8]
  ]) CORDON_FENCES.push(fence);
  for(const [x,y,w,h] of [[344,97,3.9,1.5],[353,98,3.9,1.5],[372.6,40.7,3.9,1.5]])
    addObj({k:'bus',x:x*T,y:y*T,w:w*T,h:h*T,solid:1,opaque:1});
  CORDON_DETAILS.push(
    ['c1_trace_sleepers',191,146.5,56,-.25],['c1_trace_reel',211,109,31,-.15],
    ['c1_trace_pipes',227.5,84.8,60,-.3],['c1_yard_car',241,57,63,-.27],
    ['c1_trace_sleepers',162,57.4,52,.09],['c1_trace_reel',172.4,65.6,33,-.15],
    ['c1_crate_army',189.6,59.5,29,-.04],['c1_trace_pipes',192,64,57,.08],
    ['c1_bricks',130,58.5,28,-.12],['c1_rock0',79,45.7,106,-.3],
    ['c1_rock1',79.5,49.3,86,.22],['c1_trace_sleepers',82.6,50.4,46,.35],
    ['c1_trace_pipes',319,85.4,66,.29],['c1_trace_pipes',325.5,87.5,56,-.18],
    ['c1_bricks',324.7,85.4,30,.24],['c1_sandbags',363.3,12,42,-.17],
    ['c1_yard_car',370,109.8,72,-.18],['c1_trace_wheel',369.1,108.7,24,.13],
    ['c1_trace_pipes',362,87.4,64,-.22],['c1_yard_car',359.8,64.3,66,.24],
    ['c1_tractor',359.7,96.8,83,-.42],['c1_yard_car',351,104.5,74,.27],
    ['c1_yard_car',351.6,107.3,68,-.32],['c1_tires',361,100,35,.2],
    ['c1_trace_wheel',349.8,99.1,21,.12],['c1_junk',355,104,30,-.22],
    ['c1_trace_pipes',361.5,108,68,.35],['c1_trace_reel',344.8,102,32,.13],
    ['c1_trace_sleepers',301,50,57,.12],['c1_crate_army',268,37,31,0],
    ['c1_trace_reel',294,45,34,-.04],['c1_trace_pipes',371.5,34,52,.12],
    ['c1_barrel',379,27,24,0],['c1_trace_kettle',388.2,31.6,20,.1],
    ['c1_crate',385,25,32,.04],['c1_barrel',392,32.1,23,.21],
    ['c1_bricks',400.5,39,32,-.19],['c1_sandbags',406.5,31,41,.08],
    ['c1_tires',375.8,36.3,34,.24],['c1_trace_reel',379.2,38,25,.1]
  );
  // Small side clearings with an open south approach; no structures on the roads.
  rcClear(384,96,390,104);
  rcClear(302,74,308,82);
  CORDON_DETAILS.push(['c1_trace_pipes',386.5,96.5,61,-.17],
    ['c1_tires',389.5,98,26,.31],['c1_rock0',303,75,48,.4]);
  for(const [i,x,y] of [[1,386.5,98.5],[2,388.5,98.5],[3,387.5,99.5]])
    DOGDEF.push({sid:'dump_dog'+i,pack:'dump_pipes',x,y});
  for(const [i,x,y] of [[1,304.5,77.5],[2,306.5,77.5]])
    RC1.boars.push({sid:'dump_boar'+i,pack:'dump_hollow',at:[x,y]});
  WORLD_FIRES.push(dumpFire);
  addObj({k:'fire',x:dumpFire.x-10,y:dumpFire.y-10,w:20,h:20,solid:1});
  for(const [stash,k,x,y,loot] of [
    ['dump_manifest','safe',267,35,{money:95,bandage:2}],
    ['dump_tools','crate',344.1,105.5,{a9:12,antirad:1}],
    ['dump_drain','hiding',324.3,84.2,{medkit:1,energy:1}]
  ]) addObj({k,stash,x:x*T,y:y*T,w:24,h:18,solid:k!=='hiding',loot});
  for(const [sid,name,x,y,fac,wpn] of [
    ['dump_loader','Клин',393,35.5,'loner','w_obrez'],
    ['dump_sentry','Обходчик',362.5,14.6,'loner','w_obrez'],
    ['dump_scale','Латунь',386.4,25.4,'loner','w_pm'],
    ['dump_sorter','Скоба',390.3,31.4,'loner','w_pm'],
    ['dump_driver','Букса',355,102.2,'loner','w_obrez'],
    ['dump_band1','Шкурник',273,38,'bandit','w_aps'],
    ['dump_band2','Крюк',297,34,'bandit','w_akms'],
    ['dump_band3','Копоть',290.1,46,'bandit','w_pm']
  ]) NPCDEF.push({sid,name,x:x+.5,y:y+.5,fac,wpn,named:1,stay:1,sit:sid==='dump_sorter',localFire:dumpFire});
  for(const [x,y] of [[334,84],[376,41],[332,31]]) rads.push({x:x*T,y:y*T,r:85,p:2.2});
  ANOM0.push({id:'dump_sink',k:'g',x:325.5*T,y:86.1*T,r:39},
    {id:'dump_coil',k:'e',x:379*T,y:29*T,r:29});
  ARTS0.push({key:'dump_coil',id:'art_bengal',x:379.5*T,y:29.6*T});
}
function freightBallast(g) {
  if(!PATS.freightBallast){
    const h=3*T+18,s=ART.m.sprites.rail;
    const strip=document.createElement('canvas');
    strip.height=h;strip.width=Math.round(h*s.rect[2]/s.rect[3]);
    const ctx=strip.getContext('2d');
    ctx.drawImage(ART.images[s.atlas],...s.rect,0,0,strip.width,h);
    const edge=ctx.createLinearGradient(0,0,0,h);
    for(const [at,alpha] of [[0,0],[.18,1],[.82,1],[1,0]])edge.addColorStop(at,'rgba(0,0,0,'+alpha+')');
    ctx.globalCompositeOperation='destination-in';ctx.fillStyle=edge;ctx.fillRect(0,0,strip.width,h);
    PATS.freightBallast=g.createPattern(strip,'repeat-x');
  }
  return PATS.freightBallast;
}
// The clipping plane at a joint bisects the bend. Both ribbons end on the
// same line across the ballast, even when a branch runs nearly north-south.
const railSegments=new WeakMap();
function trackSegments(line) {
  if(railSegments.has(line))return railSegments.get(line);
  const segments=[];
  let phase=line[0][0]*T;
  for(let i=1;i<line.length;i++){
    const [x,y]=line[i-1],[bx,by]=line[i],dx=bx-x,dy=by-y;
    const len=Math.hypot(dx,dy)*T,angle=Math.atan2(dy,dx);
    segments.push({x:x*T,y:y*T,bx:bx*T,by:by*T,len,angle,phase});
    phase+=len;
  }
  const phaseOffset=line===lesserMainTrack ? WEST*T-phase : 0;
  for(let i=0;i<segments.length;i++){
    const s=segments[i];
    s.phase+=phaseOffset;
    s.start=Math.tan((s.angle-(segments[i-1]?.angle??s.angle))/2);
    s.end=Math.tan((s.angle-(segments[i+1]?.angle??s.angle))/2);
  }
  railSegments.set(line,segments);
  return segments;
}
function drawFreightTrack(g,line,win,steelOnly=false) {
  const half=(3*T+18)/2, pattern=ART && freightBallast(g);
  for(const s of trackSegments(line)){
    const pad=half*(1+Math.max(Math.abs(s.start),Math.abs(s.end)))+1;
    if(win && (Math.max(s.x,s.bx)+pad<win.x0 || Math.min(s.x,s.bx)-pad>win.x1 ||
        Math.max(s.y,s.by)+pad<win.y0 || Math.min(s.y,s.by)-pad>win.y1))continue;
    g.save();g.translate(s.x,s.y);g.rotate(s.angle);
    g.beginPath();g.moveTo(-s.start*half-.35,-half);g.lineTo(s.len-s.end*half+.35,-half);
    g.lineTo(s.len+s.end*half+.35,half);g.lineTo(s.start*half-.35,half);g.closePath();g.clip();
    if(steelOnly){
      g.beginPath();for(const y of [-17,7])g.rect(-pad,y,s.len+2*pad,5);
      g.clip();
    }
    g.translate(-s.phase,-half);
    if(!pattern){
      if(!steelOnly){
        g.fillStyle='#524d43';g.fillRect(s.phase-pad,0,s.len+2*pad,2*half);
        g.fillStyle='#44392e';
        for(let x=Math.floor((s.phase-pad)/14)*14;x<s.phase+s.len+pad;x+=14)g.fillRect(x,half-25,5,47);
      }
      g.fillStyle='#8a8171';
      for(const y of [-16,8])g.fillRect(s.phase-pad,half+y,s.len+2*pad,2);
      g.restore();continue;
    }
    g.fillStyle=pattern;
    g.fillRect(s.phase-pad,0,s.len+2*pad,2*half);
    if(perspective && !steelOnly && win)ballastSlope(g,s.phase-pad,0,s.len+2*pad,2*half);
    g.restore();
  }
}
function drawDepotDeck(g,deck) {
  g.save();g.translate(deck.x*T,deck.y*T);g.rotate(deck.angle);
  for(const [y,h] of [[-48,29],[-11,17],[13,35]]){
    artFill(g,'floor_wood',-52,y,104,h);
    g.fillStyle='rgba(45,38,31,.35)';g.fillRect(-52,y,104,h);
    for(let x=-51;x<52;x+=12)g.fillRect(x,y,1,h);
  }
  g.restore();
}
function drawWorldTracks(g,win) {
  if(!BIG)return;
  const visible=(x,y,r)=>!win || x+r>=win.x0 && x-r<=win.x1 && y+r>=win.y0 && y-r<=win.y1;
  if(!win || win.x0<=WEST*T+60)drawLesserRail(g,win);
  if(!win || (win.x0<318*T && win.x1>78*T && win.y0<192*T)){
    for(const line of sidings)drawFreightTrack(g,line,win);
    for(const deck of freightDecks)if(ART && visible(deck.x*T,deck.y*T,4*T))drawDepotDeck(g,deck);
    for(const line of sidings)drawFreightTrack(g,line,win,true);
    if(visible(165*T,188*T,16*T))drawFreightTrack(g,lesserMainTrack,{
      x0:Math.max(151*T,win?.x0??0),x1:Math.min(180*T,win?.x1??PW*T),
      y0:win?.y0??0,y1:win?.y1??WH
    },true);

  }
  if(!ART || !C1)return;
  const row=NORTH_ROWS+57,cy=(row+.5)*T;
  // The ruined highway bridge is drawn above the road separately. The two
  // culverts and the stream have a short deck carrying the track over the gap.
  for(const [start,end] of [[WEST+71,WEST+74],[WEST+207,WEST+209],[STREAM_X(row)-1,STREAM_X(row)+2]]){
    const left=start*T,w=(end-start)*T;
    if(!visible(left+w/2,cy,w/2+40))continue;
    g.save();g.fillStyle='rgba(25,23,20,.4)';g.fillRect(left+3,cy-21,w,55);
    for(const side of [-1,1]){
      const edge=cy+side*24;
      artFill(g,'wall_concrete',left-4,edge-3,w+8,6);
      g.fillStyle='#52493e';g.fillRect(left,edge-1,w,2);
    }
    g.beginPath();g.rect(left,cy-22,w,44);g.clip();
    for(let x=start;x<end;x++){
      g.save();g.translate(x*T,cy);drawRailStrip(g,x,-1.5*T-9,3*T+18);g.restore();
    }
    g.restore();
  }
}
function drawDumpDetails(g,win) {
  if(!BIG || (win && (win.y0>(NORTH_ROWS+60)*T || win.x0>425*T || win.x1<77*T))) return;
  const visible=(x,y,r)=>!win || x+r>=win.x0 && x-r<=win.x1 && y+r>=win.y0 && y-r<=win.y1;
  for(const [x,y,w,h,a] of dumpHills){
    if((perspective && win) || !visible(x*T,y*T,w*T) || !lesserSprites.slag) continue;
    g.save();g.globalAlpha=.66;g.translate(x*T,y*T);g.rotate(a);
    g.drawImage(lesserSprites.slag,-w*T/2,-h*T/2,w*T,h*T);g.restore();
  }
  for(const [kind,centres,width] of [['tank',dumpTanks,2.25]]){
    const sprite=lesserSprites[kind]; if(!sprite) continue;
    for(const [x,y] of centres){
      if((perspective && win) || !visible(x*T,y*T,width*T)) continue;
      const w=width*T,h=w*sprite.height/sprite.width;
      g.save();spriteShadow(g,3,2);g.drawImage(sprite,x*T-w/2,y*T-h/2,w,h);g.restore();
    }
  }
}

/* Measured glove centres in the 48 × 56 south-facing G8 animation frames.
   The first glove is the character's right hand (left in the image). */
const GLOVE_FRAMES = {
  idle:            [-4.2,10.8, 4.1,10.8],
  walk_left:       [-6.0, 9.6, 5.7,10.1],
  walk_pass_left:  [-6.0,10.4, 5.4,10.1],
  walk_right:      [-5.6,10.6, 4.0,11.6],
  walk_pass_right: [-4.2,11.0, 3.7,11.3],
  crouch:          [-5.2,12.1, 5.1,12.1]
};
const G8_WALK = ['walk_left','walk_pass_left','walk_right','walk_pass_right'];
// Move the dominant hand, then place the supporting palm along the item.
const HELD_POSES = {
  w_aps:   { side:0.65, forward:2.4 },
  w_toz34: { side:0.25, forward:-0.6, support:9.2, turn:0.50 },
  w_akms:  { side:0.2, forward:-0.8, support:8.6, turn:0.52 },
  knife:   { side:-1.0, forward:0.6 },
  w_pm:    { side:0.7, forward:2.6 },
  w_obrez: { side:0.4, forward:0.0, support:6.2, turn:0.44 },
  w_aksu:  { side:0.2, forward:-0.6, support:8.0, turn:0.51 },
  grenade: { side:-0.4, forward:-0.3 }
};
const HELD_SPRITES = {
  w_aps:   {file:'assets/field/hand_w_aps.svg', width:3.6, grip:.22},
  w_toz34: {file:'assets/field/hand_w_toz34.svg', width:3.5, grip:.31},
  w_akms:  {file:'assets/field/hand_w_akms.svg', width:4.0, grip:.36},
  knife:   {file:'assets/g8/hand_knife.webp',   width:2.35, grip:.32},
  w_pm:    {file:'assets/g8/hand_w_pm.webp',     width:3.9,  grip:.23},
  w_obrez: {file:'assets/g8/hand_w_obrez.webp',  width:4.5,  grip:.32},
  w_aksu:  {file:'assets/g8/hand_w_aksu.webp',  width:3.65, grip:.36},
  grenade: {file:'assets/g8/hand_grenade.webp', width:4.3,  grip:.25}
};
function frameWeapon(e, id, W, grip) {
  const gait = gaitOf(e);
  const pose = e.campRise != null ? 'idle' : e.crouch ? 'crouch' : gait.moving ? G8_WALK[gait.phase] : 'idle';
  const skin = g3Skin(e), mount = HELD_POSES[id] || HELD_POSES.grenade, coords = GLOVE_FRAMES[pose];
  const dy = skin === 'bandit' ? -1.5 : skin === 'army' ? -0.8 : 0;
  const right = [coords[0],coords[1]+dy], left = [coords[2],coords[3]+dy];
  const turn = mount.turn || 0, cos = Math.cos(turn), sin = Math.sin(turn);
  const rear = [right[0]+mount.side,right[1]+mount.forward];
  const front = mount.support ? [rear[0]+sin*mount.support,rear[1]+cos*mount.support] : left;
  // The torso turns across a long weapon. The barrel stays on the aim axis.
  const main = [cos*rear[0]-sin*rear[1],sin*rear[0]+cos*rear[1]];
  const support = mount.support ? [main[0],main[1]+mount.support] : left;
  return {mode:'g3', id, W, grip, pose, right, left, rear, front, turn, main, support, muzzle:[main[0],main[1]+W.len]};
}

const heldFrames = new WeakMap();
function frameCanvas(source) {
  const c = document.createElement('canvas');
  c.width = source.width; c.height = source.height;
  return c;
}
// Separate each forearm along the inside of its sleeve, keeping knees and boots
// on the body layer. Move the cuff and glove together, tapering back to the elbow.
function poseSleeve(body, source, from, to, side, crouch) {
  const arm = frameCanvas(source), g = arm.getContext('2d');
  const scale = arm.width / 48, x = from[0], y = from[1];
  const palm = crouch ? 2.65 : 2.25;
  g.setTransform(scale,0,0,scale,arm.width/2,arm.height/2);
  const cut = new Path2D();
  cut.moveTo(x+side*2.1,y-10.5);
  cut.lineTo(x-side*.15,y-4.2);
  cut.lineTo(x-side*(palm+.6),y-1.5);
  cut.lineTo(x-side*(palm+.6),y+palm+.4);
  cut.lineTo(side*24,y+palm+.4);
  cut.lineTo(side*24,y-10.5);
  cut.closePath(); g.clip(cut); g.drawImage(source,-24,-28,48,56);
  body.save();
  body.setTransform(scale,0,0,scale,arm.width/2,arm.height/2);
  body.clip(cut); body.clearRect(-24,-28,48,56); body.restore();
  const start = Math.floor((28+y-10.5)*scale), end = Math.ceil((28+y+palm+.4)*scale);
  const dx=(to[0]-x)*scale, dy=(to[1]-y)*scale;
  let lastY=start;
  for (let row=start; row<end; row++) {
    const t=clamp((row+1-start)/(8.4*scale),0,1);
    const blend=t*t*(3-2*t);
    const nextY=Math.round(row+1+dy*blend);
    if (nextY>lastY) body.drawImage(arm,0,row,arm.width,1,Math.round(dx*blend),lastY,arm.width,nextY-lastY);
    lastY=nextY;
  }
}
function equippedFrame(images, asset, w) {
  const source = asset && images[asset.file];
  if (!source) return null;
  let models = heldFrames.get(source);
  if (!models) { models=new Map(); heldFrames.set(source,models); }
  const detector = detectorImages[w.id];
  const sprite = detector ? (detector.naturalWidth ? detector : null) : packImage(HELD_SPRITES[w.id].file);
  const cached = models.get(w.id);
  if (cached && cached.sprite === sprite) return cached;
  const body=frameCanvas(source), b=body.getContext('2d');
  b.drawImage(source,0,0);
  const crouch=w.pose==='crouch';
  poseSleeve(b,source,w.right,w.rear,-1,crouch);
  if (w.grip==='two') poseSleeve(b,source,w.left,w.front,1,crouch);
  const scale=source.width/48;
  const image=frameCanvas(source);
  const height=Math.max(56,Math.ceil(30+w.muzzle[1]));
  image.height=height*scale;
  const g=image.getContext('2d');
  g.setTransform(scale,0,0,scale,source.width/2,source.height/2);
  g.save(); g.rotate(w.turn); g.drawImage(body,-24,-28,48,56); g.restore();
  drawWeaponLocal(g,w);
  g.rotate(w.turn);
  // Use the actor's own glove pixels to cover the grip; the stock sits under the shoulder.
  const cover = new Path2D();
  for (const hand of w.grip==='two' ? [w.rear,w.front] : [w.rear]) {
    cover.moveTo(hand[0]+2.5, hand[1]);
    cover.ellipse(hand[0],hand[1],crouch?2.45:1.95,crouch?2.15:1.65,0,0,Math.PI*2);
  }
  if (w.turn) {
    cover.moveTo(7,-3); cover.ellipse(0,-3,7,6.5,0,0,Math.PI*2);
    cover.moveTo(-4,-4); cover.ellipse(-8,-4,4,4.5,0,0,Math.PI*2);
  }
  g.clip(cover); g.drawImage(body,-24,-28,48,56);
  const model={image,height,sprite};
  models.set(w.id,model);
  return model;
}

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
const G3W = {
  w_aps: { len: 12, w: 3.3 }, w_toz34: { len: 23, w: 3.4 }, w_akms: { len: 22, w: 3.7, mag: 1 },
  w_pm: { len: 11, w: 3.2 }, w_obrez: { len: 17, w: 3.6 }, w_aksu: { len: 21, w: 3.6, mag: 1 }, knife: { len: 9, w: 2, blade: 1 }, grenade: {len: 0, w: 3.8, toss: 1} };
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
  const sw = actorFrameMotion(e,e.kind === 'human' && a.moving);
  if (sw) { target.save(); target.translate(e.x + sw.dx, e.y + sw.dy); target.scale(sw.k, sw.k); target.translate(-e.x, -e.y); }
  const sh = e.kind === 'human' && BIG && window.CORDON_G8_ON;   // контраст с землёй: мягкая тень-обводка вправо-вниз, как у остальных объектов
  if (sh) { const k = Math.abs(target.getTransform().a); target.save(); target.shadowColor = 'rgba(8,8,4,0.6)'; target.shadowBlur = 2.6 * k; target.shadowOffsetX = 1.6 * k; target.shadowOffsetY = 2.2 * k; }
  const original = jacketFor(e)?.images || G3.images;
  const w = e.kind === 'human' ? weaponLocal(e) : null;
  const model = w?.pose && equippedFrame(original,man.actors[skin][w.pose],w);
  a.equipped = model;
  const images = original;
  const ok = CordonG3.draw(target, man, images, a, e.kind === 'human' ? (c2 => {
    if (e === P && window.CORDON_G8_ON) {
      const roll = packImage('assets/g8/player_bedroll.webp');
      if (roll) {
        const top = (skin === 'bandit' ? -12 : -15) - (e.crouch ? 1 : 0);
        c2.save(); c2.rotate(w?.turn || 0); c2.drawImage(roll, -10.5, top, 21, 6); c2.restore();
      }
    }
    if (window.__g7tap) window.__g7tap(e, g3Base, c2.getTransform(), w);
    if (!model) drawWeaponLocal(c2,w);
  }) : null);
  if (sh) target.restore();
  if (ok && e.flash > 0) { target.save(); target.globalCompositeOperation = 'lighter'; target.globalAlpha = Math.min(0.5, e.flash * 4); CordonG3.draw(target, man, images, Object.assign({}, a, { shadow: false }), null); target.restore(); }
  if (sw) target.restore();
  return ok;
}
/* шаг: корпус качается из стороны в сторону (период — два шага) и чуть «подпрыгивает» к камере на каждом шаге */
function actorFrameMotion(e, moving) {
  const sway = moving ? gaitSway(e) : null;
  if (!(e.jumpT > 0)) return sway;
  const height = Math.sin(Math.PI * (1-e.jumpT/JUMP_T));
  return {dx:sway?.dx || 0,dy:(sway?.dy || 0)-5*height,k:(sway?.k || 1)*(1+.2*height)};
}
function gaitSway(e) {
  const g = GAIT.get(e); if (!g) return null;
  const ph = g.dist / 44 * Math.PI * 2, side = Math.sin(ph) * 0.9, run = e === P && P.sprinting ? 1.4 : 1;
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
  const id = e === P ? S.weapon : e.wpn, W = G3W[id] || (DETECTORS[id] && { len: 5 }); if (!W) return null;
  const grip = kitSlot(id) === 'sidearm' || id === 'knife' || id === 'grenade' || DETECTORS[id] ? 'one' : 'two';
  const r = rigActive(e);
  if (r) {
    const s = CordonRig.sockets(r.rig.pose, grip);
    if (!s.hasEquipment || ['seated', 'captive', 'wounded', 'dead'].includes(r.rig.state)) return null;
    return { mode: 'rig', id: id, W: W, grip: grip, main: s.main, support: s.support, muzzle: [s.main[0], s.main[1] + W.len] };
  }
  const seated = e.sit && !(window.CORDON_G8_ON && e.campRise > 0.75);
  if (!G3_READY() || !e.alive || seated || e.wounded || e.captive) return null;
  if (window.CORDON_G8_ON) return frameWeapon(e,id,W,grip);
  const hand = G3_GRIP;
  const main = [hand[0], hand[1] + (e.crouch ? -1 : 0)];
  return { mode: 'g3', id: id, W: W, grip: grip, main: main, support: [main[0], main[1] + 8], muzzle: [main[0], main[1] + W.len] };
}
/* единственное преобразование локальной точки в мир (рендер поворачивает на ang − π/2) */
function localToWorld(e, ang, lat, fwd) {
  return { x: e.x + Math.sin(ang) * lat + Math.cos(ang) * fwd, y: e.y - Math.cos(ang) * lat + Math.sin(ang) * fwd };
}
function g7Muzzle(e, ang) {
  const w = weaponLocal(e); if (!w || DETECTORS[w.id] || w.W.blade || w.W.toss) return null;
  const tip = localToWorld(e, ang, w.muzzle[0], w.muzzle[1]);
  const motion = w.pose && e.campRise == null && actorFrameMotion(e,gaitOf(e).moving);
  if (motion) {
    tip.x = e.x + (tip.x-e.x)*motion.k + motion.dx;
    tip.y = e.y + (tip.y-e.y)*motion.k + motion.dy;
  }
  return tip;
}
/* слой оружия: рукоять в main, ствол вдоль +y до muzzle. Тот же объект w, что и для дула */
function drawHeldDetector(g, id, x, y) {
  const image = detectorImages[id];
  if (image.complete && image.naturalWidth) {
    g.save(); g.translate(x,y); g.rotate(Math.PI);
    g.drawImage(image,-5,-8,10,10); g.restore();
  }
}
function drawWeaponLocal(c2, w) {
  if (!w) return;
  const W = w.W, x = w.main[0], y = w.main[1];
  if (DETECTORS[w.id]) { drawHeldDetector(c2,w.id,x,y); return; }
  if (window.CORDON_G8_ON) {
    const shape = HELD_SPRITES[w.id], sprite = packImage(shape.file);
    if (sprite) {
      const length = W.toss ? 6.4 : W.len / (1-shape.grip);
      c2.drawImage(sprite,x-shape.width/2,y-length*shape.grip,shape.width,length);
      return;
    }
  }
  if (W.toss) {
    c2.fillStyle='#696347'; c2.beginPath(); c2.ellipse(x,y+1,2,2.6,0,0,Math.PI*2); c2.fill(); return;
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
      const w = rise > 0.75 ? weaponLocal(e) : null;
      const images = jacketFor(e)?.images || G3.images;
      const model = w?.pose && equippedFrame(images,g7PoseFrame('loner',w.pose),w);
      const blend = model ? rise*4-3 : 0;
      target.globalAlpha = alpha*(1-blend);
      target.drawImage(sheet, frame*sw, 0, sw, sh, -24, -28, 48, 56);
      if (model) {
        target.globalAlpha = alpha*blend;
        target.drawImage(model.image,-24,-28,48,model.height);
      }
      if (e.flash > 0) {
        target.globalCompositeOperation = 'lighter';
        const flash = alpha*Math.min(0.5,e.flash*4);
        target.globalAlpha = flash*(1-blend);
        target.drawImage(sheet, frame*sw, 0, sw, sh, -24, -28, 48, 56);
        if (model) {
          target.globalAlpha = flash*blend;
          target.drawImage(model.image,-24,-28,48,model.height);
        }
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
  const vaultable = /log|stump|sandbag|crate|sack|wheel|tire|bench|sleeper|pipe|junk/.test(id) ||
    (/rock|stone|barrel|drum/.test(id) && Math.min(w,h)<42);
  const p={id,vertices,vaultable}; fieldProps.push(p);
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
  if(!ART){cachePropNavigation();return;}
  for(const [kind,tx,ty,angle] of DECOR){
    if(kind==='ford'||(kind==='fence' && BIG && C1)) continue;
    const art=C1 && C1DECOR[kind], id=art?art[0]:kind, sp=ART.m.sprites[id];
    if(!sp) continue;
    const w=art?art[1]:sp.logicalSize[0], h=art?w*sp.rect[3]/sp.rect[2]:sp.logicalSize[1];
    addFootprint(id,tx*T,ty*T,w,h,angle);
  }
  if(!C1){cachePropNavigation();return;}
  if(BIG) for(const [id,tx,ty,w,a] of CORDON_DETAILS){
    if(id==='c1_trace_apples') continue;
    const r=ART.m.sprites[id].rect;
    addFootprint(id,tx*T,ty*T,w,w*r[3]/r[2],a);
  }
  // Discard scattered solids whose rotated sprite would straddle a fence.
  const fences=objs.filter(o=>o.k==='fence');
  blockedScatter.clear();
  for(let y=3;y<=MH-4;y++) for(let x=3;x<=PW-4;x++){
    if(tAt(x,y)!==GR) continue;
    const p=scatterObject(x,y);
    if(!p || p.id.startsWith('c1_decal')) continue;
    const c=Math.abs(Math.cos(p.a)),s=Math.abs(Math.sin(p.a));
    const rx=(p.w*c+p.hh*s)/2,ry=(p.w*s+p.hh*c)/2;
    if(fences.some(f=>p.cx+rx>f.x && p.cx-rx<f.x+f.w && p.cy+ry>f.y && p.cy-ry<f.y+f.h)){
      blockedScatter.add(y*MW+x);continue;
    }
    addFootprint(p.id,p.cx,p.cy,p.w,p.hh,p.a);
  }
  cachePropNavigation();
}
function cachePropNavigation(){
  // These hulls are static. Cache the few edges cut by them once, not on every crate change.
  propEdgeBlocks.fill(0);broadPropEdges.fill(0);propBlockedCenters.clear();
  for(const p of fieldProps){
    const xs=p.vertices.map(v=>v[0]),ys=p.vertices.map(v=>v[1]);
    const xmin=Math.floor((Math.min(...xs)-11)/T)-1,xmax=Math.floor((Math.max(...xs)+11)/T)+1;
    const ymin=Math.floor((Math.min(...ys)-11)/T)-1,ymax=Math.floor((Math.max(...ys)+11)/T)+1;
    for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
      if(!inb(x,y))continue;
      const key=y*MW+x,cx=(x+.5)*T,cy=(y+.5)*T;
      if(touchesProp(p,{x:cx,y:cy,r:11}))propBlockedCenters.add(key);
      for(const k of [0,2,4,5]){
        const [dx,dy]=DIRS[k];if(!inb(x+dx,y+dy))continue;
        const opposite=k===0?1:k===2?3:k===4?7:6,other=key+dx+dy*MW;
        for(let j=0;j<=6;j++){
          const body={x:cx+dx*T*j/6,y:cy+dy*T*j/6,r:14};
          if(!touchesProp(p,body))continue;
          broadPropEdges[key]|=1<<k;broadPropEdges[other]|=1<<opposite;
          body.r=11;
          if(touchesProp(p,body)){
            propEdgeBlocks[key]|=1<<k;propEdgeBlocks[other]|=1<<opposite;break;
          }
        }
      }
    }
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
  // Оба костра существуют до первого задания. Выбираем свободную обочину у каждого.
  for (const base of ['village','camp']) {
    const fire=locPt(base,'fire'), cx=Math.floor(fire.x/T)+2, cy=Math.floor(fire.y/T)-1;
    let placed=false;
    for(let r=0;r<=5 && !placed;r++) for(let dy=-r;dy<=r && !placed;dy++) for(let dx=-r;dx<=r;dx++) {
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
      const tx=cx+dx,ty=cy+dy,x=(tx+.5)*T,y=(ty+.5)*T;
      if(![[0,0],[1,0],[-1,0],[0,-1],[0,1]].every(([i,j])=>nav[(ty+j)*MW+tx+i])) continue;
      if(HOUSES.some(h=>x>(h.x-1)*T && x<(h.x+h.w+1)*T && y>(h.y-1)*T && y<(h.y+h.h+1)*T)) continue;
      if(NPCDEF.some(n=>Math.hypot(x-n.x*T,y-n.y*T)<36)) continue;
      addObj({k:'locker',baseName:LOC[base].name,x:x-13,y:y-9,w:26,h:18,solid:true});
      placed=true; break;
    }
  }

}
function restoreContainer(o){
  o.scatterStart = null;
  if(!o.initialLoot) o.initialLoot={...o.loot};
  o.looted=!!S.flags['st_'+o.stash];
  const remaining=S.flags['contents_'+o.stash];
  o.loot=o.looted?{}:{...(remaining || o.initialLoot)};
  if (!o.looted && !remaining && o.k==='crate') {
    for (const [id,n] of Object.entries(o.loot)) {
      if (ITEMS[id]?.ammo || id==='money') o.loot[id]=supplyCount(n);
    }
  }
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
  o.broken=true; o.solid=false; scheduleCrateCleanup(o); buildGrids(); groundItems(o); o.scatterStart=performance.now();
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
  forgetGroundItems(o);
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
// Количество хранится в обычном loot. План запоминает место каждой отдельной вещи.
const GROUND_REACH = 34;
const groundBundle = id => id === 'money' || ITEMS[id]?.ammo;
function scatterGroundItems(o) {
  const ids=[];
  for (const [id,count] of Object.entries(o.loot)) {
    for (let i=0;i<(groundBundle(id)?1:count);i++) ids.push(id);
  }
  const cx=o.x+(o.w||0)/2, cy=o.y+(o.h||0)/2;
  const turn=hash2(cx,cy)*Math.PI*2, drops=[], occupied=[];
  for(const other of objs) {
    if (other===o || Math.hypot(other.x-cx,other.y-cy)>110) continue;
    const existing=other.groundItems || (other.broken && S.flags.groundItems?.[other.stash]);
    if(existing) for(const item of existing) occupied.push(groundPosition(other,item));
  }
  for (const [i,id] of ids.entries()) {
    let best=null, score=-Infinity;
    const reach=22+Math.round(hash2(cx+i+7,cy)*6);
    candidates: for (const radius of [reach,34,16,8,0]) for (let j=0;j<12;j++) {
      const a=turn+2*Math.PI*(i/ids.length+j/12);
      const x=Math.round(cx+Math.cos(a)*radius), y=Math.round(cy+Math.sin(a)*radius);
      const probe={x,y,r:11}; collide(probe);
      if (Math.hypot(probe.x-x,probe.y-y)>.1 || !los(cx,cy,x,y)) continue;
      const spacing=occupied.reduce((gap,p)=>Math.min(gap,Math.hypot(x-p.x,y-p.y)),40);
      const value=Math.min(spacing,25)-.14*Math.abs(radius-reach)-j*.03;
      if (value>score) { best={id,dx:x-cx,dy:y-cy}; score=value; }
      if (value===25) break candidates;
    }
    const drop=best || {id,dx:0,dy:0};
    drops.push(drop); occupied.push(groundPosition(o,drop));
  }
  return drops;
}
function groundItems(o) {
  if (o.kind==='sack') return o.groundItems ||= scatterGroundItems(o);
  const layouts=S.flags.groundItems ||= {};
  return layouts[o.stash] ||= scatterGroundItems(o);
}
function forgetGroundItems(o) {
  const layouts=S.flags.groundItems;
  if (layouts && o.stash) {
    delete layouts[o.stash];
    if (!Object.keys(layouts).length) delete S.flags.groundItems;
  }
}
function groundPosition(o,drop) {
  return {x:o.x+(o.w||0)/2+drop.dx, y:o.y+(o.h||0)/2+drop.dy};
}
function nearbyGroundItems(o,cand) {
  if (Math.hypot(P.x-o.x-(o.w||0)/2,P.y-o.y-(o.h||0)/2)>GROUND_REACH+35) return;
  for(const drop of groundItems(o)) {
    const {x,y}=groundPosition(o,drop), d=dst(P.x,P.y,x,y);
    if(d>GROUND_REACH || !los(P.x,P.y,x,y)) continue;
    const id=drop.id, count=o.loot[id];
    const name=id==='money'?count+' RU':ITEMS[id].n+(groundBundle(id)?' ×'+count:'');
    cand(d,{k:'groundItem',o,drop,label:'Подобрать: '+name});
  }
}
function pickGroundItem({o,drop}) {
  const id=drop.id, {x,y}=groundPosition(o,drop);
  if (!objs.includes(o) || !o.loot[id] || dst(P.x,P.y,x,y)>GROUND_REACH || !los(P.x,P.y,x,y)) return;
  const drops=groundItems(o), index=drops.indexOf(drop);
  if (index<0) return;
  const moved=collectStock(o,id,groundBundle(id)?o.loot[id]:1);
  if (!moved) { msg(receiveError(id,1,lootGun(o,id)),'bad'); return; }
  if (!groundBundle(id) || !o.loot[id]) drops.splice(index,1);
  if (o.stash) recordContents(o);
  if (!drops.length) {
    if (o.kind==='sack') objs.splice(objs.indexOf(o),1);
    else forgetGroundItems(o);
  }
  play('pick'); G.near=findInteract();
}
function drawGroundItems(o) {
  if (o.looted || !Object.keys(o.loot).length) return;
  const flight=o.scatterStart==null?1:clamp((performance.now()-o.scatterStart)/240,0,1);
  const remaining=(1-flight)**2;
  for(const drop of groundItems(o)) {
    const {id,dx,dy}=drop, {x,y}=groundPosition(o,drop);
    const frame=G3.pack?.manifest.items?.[id];
    const im=detectorImages[id] || lesserSprites[id] || (frame && packImage(frame.file));
    ctx.save(); ctx.translate(x-dx*remaining,y-dy*remaining-5*Math.sin(Math.PI*flight));
    if (G.near?.drop===drop) {
      ctx.strokeStyle='rgba(234,207,143,.85)'; ctx.lineWidth=1.2; ctx.beginPath();
      for (const sx of [-1,1]) for(const sy of [-1,1]) {
        ctx.moveTo(sx*8,sy*11); ctx.lineTo(sx*12,sy*11); ctx.lineTo(sx*12,sy*7);
      }
      ctx.stroke();
    }
    if(im?.complete && im.naturalWidth) {
      const size=id==='energy'?13:id==='money'?15:isGun(id)?30:22;
      const scale=size/Math.max(im.naturalWidth,im.naturalHeight);
      spriteShadow(ctx,1.5,1);
      const w=im.naturalWidth*scale,h=im.naturalHeight*scale;
      ctx.drawImage(im,-w/2,-h/2,w,h);
    } else {
      ctx.fillStyle=id==='money'?'#83816a':'#ada389'; ctx.fillRect(-5,-3,10,6);
      ctx.fillStyle='#534b39'; ctx.fillRect(-1,-3,2,6);
    }
    ctx.restore();
  }
}

function containerDraw(o){
  const g=ctx,x=o.x+o.w/2,y=o.y+o.h/2;
  g.save(); g.translate(x,y);
  const sprite=o.k==='crate'?lesserSprites.splinters:o.k==='safe'?lesserSprites.safe:null;
  if(sprite){
    const width=o.k==='crate'?36:26, height=width*sprite.height/sprite.width;
    if(o.k==='crate') g.rotate((hash2(Math.floor(x),Math.floor(y))-.5)*1.8);
    spriteShadow(g,o.k==='crate'?1.5:3,1);
    g.drawImage(sprite,-width/2,-height/2,width,height);
  }else if(o.k==='crate'){
    for(const [dx,dy,len,angle] of [[-8,-7,19,-.48],[2,-5,21,.23],[-5,4,16,.68],[5,8,15,-.19]]){
      g.save();g.translate(dx,dy);g.rotate(angle);g.fillStyle='#32291f';g.fillRect(-len/2,-2,len,5);
      g.fillStyle='#806343';g.fillRect(-len/2,-2,len-1,2);g.restore();
    }
  }else if(o.k==='locker'){
    if(ART) ART.draw(g,C1?'c1_crate_army':'crate',0,0,29,22);
    else {g.fillStyle='#63624b';g.fillRect(-13,-9,26,18);}
    // Small green padlock hangs from the front clasp.
    g.strokeStyle='#777866';g.lineWidth=1.2;g.beginPath();g.arc(0,4,1.6,Math.PI,2*Math.PI);g.stroke();
    g.fillStyle='#485443';g.fillRect(-2.4,4,4.8,4);
    g.fillStyle='#b0a582';g.fillRect(-1.8,4,3.1,.7);
  }else if(o.k==='safe'){
    g.fillStyle='#242522';g.fillRect(-11,-8,23,19);
    const metal=g.createLinearGradient(0,-9,0,8);metal.addColorStop(0,'#76766a');metal.addColorStop(1,'#41433c');
    g.fillStyle=metal;g.fillRect(-11,-10,22,16);g.strokeStyle='#969081';g.strokeRect(-9,-8,18,12);
    g.fillStyle='#2b2c28';g.fillRect(-7,-5,3,7);g.fillStyle='#aca38a';g.fillRect(-7,-5,5,2);
    g.beginPath();g.arc(5,-2,2,0,Math.PI*2);g.stroke();
  }else if(ART){ART.draw(g,'stash',0,0,22,18);}
  else{g.fillStyle='#55513a';g.fillRect(-10,-6,20,12);g.fillStyle='#322d21';g.fillRect(-8,-1,16,2);}
  g.restore();
  if(o.k==='crate') drawGroundItems(o);
}

// Оставляем персонажа как можно ближе к его исходному месту у костра или поста.
function clearPropSpawn(e) {
  const atHome = Math.hypot(e.x-e.home.x, e.y-e.home.y) < 1;
  function open(x,y) {
    const tx=Math.floor(x/T), ty=Math.floor(y/T);
    if (!inb(tx,ty) || !nav[ty*MW+tx]) return false;
    if (e.kind === 'human') {
      // Leave enough space for the shoulders at a stationary NPC's post.
      for (let j=ty-1;j<=ty+1;j++) for (let i=tx-1;i<=tx+1;i++)
        if (tAt(i,j)===BU && Math.hypot((i+.5)*T-x,(j+.5)*T-y)<24) return false;
    }
    const probe={x,y,r:e.r}; collide(probe);
    return Math.hypot(probe.x-x,probe.y-y)<.01;
  }
  if (open(e.x,e.y)) return;
  for(let distance=3;distance<=4*T;distance+=3){
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8, x=e.x+Math.cos(a)*distance, y=e.y+Math.sin(a)*distance;
      if(!open(x,y)) continue;
      e.x=x; e.y=y;
      if(atHome || !open(e.home.x,e.home.y)) e.home={x,y};
      e.path=null;
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
    if (DIRS.some(([dx,dy])=>[DI,AS,RA].includes(map[tile+dx+dy*MW]))) continue;
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
  const ammo = ['a9','a12','a545','a762'][ri(0,3)];
  const supplies = ['bandage','bread','cans','antirad','medkit','energy'][ri(0,5)];
  const loot = { [ammo]: supplyCount(ammo === 'a12' ? ri(2,5) : ri(4,12)) };
  const supplyChance=(FOOD[supplies] ? .55 : 1)*rules().loot;
  if (supplyChance>=1 || chance(supplyChance)) loot[supplies]=1;
  if (ri(1,4) === 1) loot.money = earnings(ri(15,65));
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
    if (!slot.due && !fieldCrateSites.includes(slot.tile)) {
      const tile = chooseFieldSite(stock, null);
      if (tile != null) slot.tile = tile;
    }
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

/* Сенсорная раскладка принадлежит устройству, отдельно от сохранения кампании. */
const CONTROL_NAMES = {
  joy:'Джойстик', 'b-fire':'Огонь', 'b-run':'Бег', 'b-rel':'Перезарядка',
  'b-med':'Аптечка', 'b-bolt':'Болт', 'b-crouch':'Присесть', 'b-jump':'Прыжок', det:'Фонарь'
};
const CONTROL_KEY = 'zona-touch-layout-v1';
const FIRE_KEY='zona-touch-fire-v1';
const firePrefs={mode:'stick',strength:45};
function showFireSettings(nav,back) {
  const mode=el('select'), slider=el('input'), value=el('output');
  const modeLabel=el('label','fire-setting','Способ стрельбы'), assistLabel=el('label','fire-setting','Автоприцел');
  const hint=el('p','fire-hint');
  for (const [id,name] of [['stick','Отклонение стика'],['tap','Касание врага']]) {
    const option=el('option','',name); option.value=id; mode.appendChild(option);
  }
  mode.value=firePrefs.mode;
  slider.type='range';slider.min=0;slider.max=100;slider.step=5;slider.value=firePrefs.strength;
  function describe() {
    value.textContent=slider.value+'%';
    hint.textContent=mode.value==='stick'
      ? 'Слегка отклони правый стик, чтобы прицелиться. Доведи его до края, чтобы открыть огонь.'
      : 'Коснись видимого врага для одного выстрела. Правым стиком можно прицелиться. Нож и граната действуют у края стика.';
  }
  function storePrefs() {
    firePrefs.mode=mode.value; firePrefs.strength=Number(slider.value);
    try { localStorage.setItem(FIRE_KEY,JSON.stringify(firePrefs)); } catch (_) {}
    describe();
  }
  mode.onchange=storePrefs; slider.oninput=storePrefs;describe();
  modeLabel.append(mode);assistLabel.append(value,slider);
  nav.replaceChildren(modeLabel,hint,assistLabel,btn('','Назад',back));
  mode.focus();
}
const controlEditor = document.getElementById('control-editor');
let layouts = {landscape:{},portrait:{}}, draftLayout = null, priorTouch = false;
let selectedControl = 'joy', padDrag = null;
const layoutMode = () => innerWidth >= innerHeight ? 'landscape' : 'portrait';

function readControls() {
  try {
    const f=JSON.parse(localStorage.getItem(FIRE_KEY));
    if (f?.mode==='tap' || f?.mode==='stick') firePrefs.mode=f.mode;
    if (Number.isFinite(f?.strength)) firePrefs.strength=clamp(f.strength,0,100);
  } catch (_) {}
  try {
    const data = JSON.parse(localStorage.getItem(CONTROL_KEY));
    for (const mode of Object.keys(layouts)) for (const id of Object.keys(CONTROL_NAMES)) {
      const p=data?.[mode]?.[id];
      if (p && [p.x,p.y,p.size].every(Number.isFinite)) {
        layouts[mode][id]={x:clamp(p.x,0,1),y:clamp(p.y,0,1),size:clamp(p.size,44,164)};
      }
    }
  } catch (_) { /* Storage may be unavailable or contain an older layout. */ }
}
function placeControls() {
  const profile=(draftLayout || layouts)[layoutMode()];
  const zoom=HUDZ || 1;
  const edges=getComputedStyle($('layout-insets'));
  const left=parseFloat(edges.paddingLeft)||0, right=parseFloat(edges.paddingRight)||0;
  const top=parseFloat(edges.paddingTop)||0, bottom=parseFloat(edges.paddingBottom)||0;
  for (const id of Object.keys(CONTROL_NAMES)) {
    const node=$(id), p=profile[id];
    if (!p) { delete node.dataset.layout; continue; }
    const x=clamp(p.x*innerWidth-p.size/2,left,innerWidth-right-p.size);
    const y=clamp(p.y*innerHeight-p.size/2,top,innerHeight-bottom-p.size);
    node.style.setProperty('--pad-x',x/zoom+'px');
    node.style.setProperty('--pad-y',y/zoom+'px');
    node.style.setProperty('--pad-size',p.size/zoom+'px');
    node.dataset.layout='custom';
  }
  positionMedicinePicker();
}
function positionMedicinePicker() {
  const picker=$('medpick'), med=$('b-med');
  if (!med.dataset.layout) { delete picker.dataset.anchor; return; }
  if (picker.hidden || controlEditor.open) return;
  const r=med.getBoundingClientRect(), box=picker.getBoundingClientRect();
  const left=clamp(r.x+(r.width-box.width)/2,4,innerWidth-box.width-4);
  const top=r.top>box.height+8 ? r.top-box.height-6 : clamp(r.bottom+6,4,innerHeight-box.height-4);
  picker.dataset.anchor='custom';
  picker.style.setProperty('--pick-x',left/(HUDZ||1)+'px');
  picker.style.setProperty('--pick-y',top/(HUDZ||1)+'px');
}
function updateLayoutPreview() {
  if (!controlEditor.open) return;
  const view=$('layout-view'), bounds=view.getBoundingClientRect(), world=$('field-world');
  const scale=Math.min(bounds.width/innerWidth,bounds.height/innerHeight);
  const x=(bounds.width-innerWidth*scale)/2, y=(bounds.height-innerHeight*scale)/2;
  world.style.transform='translate('+(bounds.x+x)+'px,'+(bounds.y+y)+'px) scale('+scale+')';
  for (const hit of view.children) {
    const rect=$(hit.dataset.id).getBoundingClientRect();
    hit.style.left=(rect.x-bounds.x)+'px'; hit.style.top=(rect.y-bounds.y)+'px';
    hit.style.width=rect.width+'px'; hit.style.height=rect.height+'px';
    const chosen=hit.dataset.id===selectedControl;
    hit.setAttribute('aria-pressed',String(chosen));
    if (chosen) {
      const size=Math.round(rect.width/scale);
      $('layout-size').value=String(size);
      $('layout-size-value').value=size+' px';
    }
  }
  $('layout-choice').value=selectedControl;
}
function layoutPosition(id) {
  const world=$('field-world').getBoundingClientRect(), r=$(id).getBoundingClientRect();
  return {x:(r.x+r.width/2-world.x)/world.width,y:(r.y+r.height/2-world.y)/world.height,
    size:clamp(Math.round(r.width/world.width*innerWidth),44,164)};
}
function changePad(position) {
  draftLayout[layoutMode()][selectedControl]=position;
  placeControls(); updateLayoutPreview();
}
function openControlEditor() {
  if (controlEditor.open) return;
  draftLayout=JSON.parse(JSON.stringify(layouts));
  priorTouch=IN.touch; resetInput(); hideMedPick(); setTouch(true);
  document.body.classList.add('layout-edit');
  controlEditor.showModal(); selectedControl='joy';
  $('layout-hint').textContent='Перетащи кнопку на экране';
  placeControls(); updateLayoutPreview();
}
function closeControlEditor(saveLayout) {
  if (saveLayout) {
    try { localStorage.setItem(CONTROL_KEY,JSON.stringify(draftLayout)); }
    catch (_) { $('layout-hint').textContent='Браузер не разрешил сохранить раскладку'; return; }
    layouts=draftLayout;
  }
  padDrag=null; draftLayout=null; controlEditor.close();
  document.body.classList.remove('layout-edit'); $('field-world').style.transform='';
  resetInput(); setTouch(priorTouch); placeControls();
}
function setupControlEditor() {
  const view=$('layout-view');
  readControls(); placeControls();
  for (const [id,name] of Object.entries(CONTROL_NAMES)) {
    $('layout-choice').add(new Option(name,id));
    const hit=el('button','layout-hit');
    hit.type='button';hit.dataset.id=id;hit.setAttribute('aria-label',name);
    hit.addEventListener('click',()=>{selectedControl=id;updateLayoutPreview();});
    hit.addEventListener('pointerdown',e=>{
      if (padDrag || e.button!==0) return;
      e.preventDefault(); selectedControl=id; updateLayoutPreview();
      const p=layoutPosition(id);
      padDrag={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,position:p,mode:layoutMode()};
      hit.setPointerCapture(e.pointerId);
    });
    hit.addEventListener('pointermove',e=>{
      if (padDrag?.pointer!==e.pointerId || padDrag.mode!==layoutMode()) return;
      const world=$('field-world').getBoundingClientRect(), p=padDrag.position;
      changePad({x:clamp(p.x+(e.clientX-padDrag.startX)/world.width,0,1),
        y:clamp(p.y+(e.clientY-padDrag.startY)/world.height,0,1),size:p.size});
    });
    hit.addEventListener('lostpointercapture',e=>{if(padDrag?.pointer===e.pointerId) padDrag=null;});
    hit.addEventListener('keydown',e=>{
      const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      const delta=moves[e.key]; if (!delta) return;
      e.preventDefault();selectedControl=id;
      const p=layoutPosition(id), step=e.shiftKey?12:3;
      changePad({...p,x:clamp(p.x+delta[0]*step/innerWidth,0,1),y:clamp(p.y+delta[1]*step/innerHeight,0,1)});
    });
    view.appendChild(hit);
  }
  $('layout-choice').onchange=e=>{selectedControl=e.target.value;updateLayoutPreview();};
  $('layout-size').oninput=e=>changePad({...layoutPosition(selectedControl),size:Number(e.target.value)});
  $('layout-default').onclick=()=>{draftLayout[layoutMode()]={};placeControls();updateLayoutPreview();};
  $('layout-save').onclick=()=>closeControlEditor(true);
  $('layout-cancel').onclick=()=>closeControlEditor(false);
  controlEditor.oncancel=e=>{e.preventDefault();closeControlEditor(false);};
  addEventListener('resize',()=>{padDrag=null;placeControls();updateLayoutPreview();});
  new ResizeObserver(updateLayoutPreview).observe(view);
}

// Perspective only affects world-space drawing. Save data, collision and PDA coordinates stay on the ground
// plane.
const perspective = BIG && C1 && !/perspective-off/.test(location.hash);
const houseHeight = .115;
const walls = new Map(), canopyLayers = new WeakMap();
function roofPoint(x, y, k) {
  return [x + (x - cam.x) * k, y + (y - cam.y) * k];
}
function wallTexture(h, side, len, wood, kind) {
  const key = [h.x, h.y, side, kind].join('/');
  if (walls.has(key)) return walls.get(key);
  const c = document.createElement('canvas');
  c.width = len;
  c.height = 88;
  const g = c.getContext('2d'), rand = mulberry32(h.x * 173 + h.y * 31 + side);
  artFill(g, wood ? 'floor_wood' : 'wall_concrete', 0, 0, len, 88);
  g.fillStyle = wood ? 'rgba(74,61,44,.40)' : 'rgba(119,111,92,.33)';
  g.fillRect(0, 0, len, 88);
  for (let i = 0; i < len * 8; i++) {
    g.fillStyle = rand() < .48 ? 'rgba(35,30,24,.17)' : 'rgba(188,180,151,.16)';
    g.fillRect(rand() * len, rand() * 88, rand() * 2 + 0.3, 1);
  }
  if (wood)
    for (let y = 6; y < 88; y += 7) {
      g.fillStyle = 'rgba(37,33,27,.57)';
      g.fillRect(0, y, len, 1.4);
      g.fillStyle = 'rgba(203,185,151,.26)';
      g.fillRect(0, y + 1.5, len, 1);
    }
  if (!wood) {
    for (let x = 18; x < len; x += 45) {
      g.fillStyle = 'rgba(65,60,50,.3)';
      g.fillRect(x, 0, 1, 78);
      g.fillStyle = 'rgba(172,161,137,.30)';
      g.fillRect(x + 1, 0, 1, 78);
    }
    for (let i = 0; i < 36; i++) {
      const x = rand() * len, y = rand() * 45, r = rand() * 4 + 1;
      const streak = g.createLinearGradient(0, y, 0, y + 22);
      streak.addColorStop(0, 'rgba(57,51,40,.30)');
      streak.addColorStop(1, 'rgba(57,51,40,0)');
      g.fillStyle = streak;
      g.fillRect(x, y, r, 22);
    }
    g.save();
    g.beginPath();
    const cr = len * .12;
    g.moveTo(cr, 76);
    g.lineTo(cr + 4, 69);
    g.lineTo(cr + 9, 68);
    g.lineTo(cr + 10, 63);
    g.lineTo(cr + 19, 61);
    g.lineTo(cr + 24, 74);
    g.lineTo(cr + 31, 76);
    g.lineTo(cr + 30, 80);
    g.lineTo(cr, 80);
    g.clip();
    artFill(g, 'wall_brick', 0, 0, len, 88);
    g.restore();
  }
  weatherFacade(g,len,wood,rand);
  const sideDir = [[0, -1], [1, 0], [0, 1], [-1, 0]][side];
  const ds = (h.entrances || [])
                 .filter(e => e.nx === sideDir[0] && e.ny === sideDir[1])
                 .map(e => ({u: side % 2 ? e.y : e.x, w: e.width}));
  for (const door of ds) {
    const w = Math.min(door.w, len - 4), l = door.u - w / 2;
    g.fillStyle = '#766b56';
    g.fillRect(l - 3, 22, w + 6, 66);
    g.fillStyle = '#211f1a';
    g.fillRect(l, 25, w, 63);
    g.fillStyle = '#4f483a';
    g.fillRect(l + 1, 27, w * .27, 59);
    g.fillStyle = '#a69b7f';
    g.fillRect(l + w * .19, 57, 2, 3);
  }
  for (let i = 0, n = Math.max(1, Math.floor(len / 65)); i < n; i++) {
    const u = (i + .43 + .14*rand()) * len / n;
    if (ds.some(d => Math.abs(d.u - u) < d.w / 2 + 18)) continue;
    let l = u - 13;
    g.fillStyle = '#252623';
    g.fillRect(l - 3, 19, 32, 36);
    g.fillStyle = '#827965';
    g.fillRect(l - 2, 20, 30, 32);
    const glass = g.createLinearGradient(0, 23, 0, 51);
    glass.addColorStop(0, '#252c2a');
    glass.addColorStop(.6, '#414a45');
    glass.addColorStop(1, '#65685a');
    g.fillStyle = glass;
    g.fillRect(l, 23, 26, 27);
    g.fillStyle = '#736c5b';
    g.fillRect(u - 1, 22, 2, 29);
    g.fillRect(l, 32, 26, 2);
    if(rand()<.68) {
      g.fillStyle='#161915'; g.beginPath();g.moveTo(l+1,24);g.lineTo(l+11,24);
      g.lineTo(l+8,30);g.lineTo(l+5,28);g.lineTo(l+1,39);g.fill();
      if(rand()<.64){g.save();g.translate(u,39);g.rotate((rand()-.5)*.64);
        artFill(g,'floor_wood',-16,-3,32,6);g.fillStyle='#41372b';g.fillRect(-12,-1,1,2);g.fillRect(10,-1,1,2);g.restore();}
    }
    g.fillStyle = '#a1987f';
    g.fillRect(l - 4, 52, 34, 2);
    g.fillStyle = 'rgba(26,23,19,.5)';
    g.fillRect(l - 3, 54, 32, 2);
  }
  g.fillStyle = 'rgba(50,44,36,.55)';
  g.fillRect(0, 79, len, 9);
  const dim = g.createLinearGradient(0, 0, 0, 88);
  dim.addColorStop(0, 'rgba(23,21,16,.64)');
  dim.addColorStop(.22, 'rgba(23,21,16,.10)');
  dim.addColorStop(1, 'rgba(23,21,16,.04)');
  g.fillStyle = dim;
  g.fillRect(0, 0, len, 88);
  walls.set(key, c);
  return c;
}
function texturedFace(a, b, k, tex) {
  // Sample the whole facade once. Narrow independently resampled bands flicker
  // as the camera makes the projected wall a fraction of a pixel taller.
  const u = roofPoint(...a,k), v = roofPoint(...b,k);
  const dx=(a[0]+b[0]-u[0]-v[0])/2, dy=(a[1]+b[1]-u[1]-v[1])/2;
  ctx.save();
  ctx.beginPath();ctx.moveTo(...u);ctx.lineTo(...v);ctx.lineTo(...b);ctx.lineTo(...a);ctx.closePath();ctx.clip();
  ctx.imageSmoothingEnabled=true;
  ctx.transform((b[0]-a[0])/tex.width,(b[1]-a[1])/tex.width,dx/tex.height,dy/tex.height,a[0]-dx,a[1]-dy);
  const overhang=Math.ceil(k*tex.width/2)+1;
  ctx.drawImage(tex,0,0,1,tex.height,-overhang,0,overhang,tex.height);
  ctx.drawImage(tex,tex.width-1,0,1,tex.height,tex.width,0,overhang,tex.height);
  ctx.drawImage(tex,0,0);
  ctx.restore();
}
function drawRaisedHouse(h, i) {
  const x = h.x * T, y = h.y * T, w = h.w * T, d = h.h * T;
  const k = houseHeight *
      (h.ruin                ? .72 :
           h.mat === 'depot' ? 1.55 :
           w < 110           ? .68 :
           w > 300           ? 1.12 :
                               1),
        corners = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const ends = [[0, 1], [1, 2], [3, 2], [0, 3]], vis = [cam.y<y, cam.x>x + w, cam.y > y + d, cam.x < x];
  for (let s = 0; s < 4; s++)
    if (vis[s]) {
      const [a, b] = ends[s];
      texturedFace(
          corners[a], corners[b], k,
          wallTexture(h, s, s % 2 ? d : w, h.mat !== 'conc' && h.mat !== 'depot', 'house'));
    }
  const porch = h.entrances?.find(e => e.approach === 'porch');
  if (porch && h.porchDepth && cam.y > y + d) {
    const [u, v] = roofPoint(x + porch.x, y + d, k * .62);
    ctx.save();
    ctx.translate(u - porch.x - 3, v);
    drawPorch(ctx, porch, -2, 11);
    ctx.restore();
  }
  const roof = ROOFS[i], [rx, ry] = roofPoint(x - 3, y - 3, k);
  const surface = h.roofSurface || [w + 4, d + 4];
  const density = roof.width / (w + 10);
  ctx.drawImage(
      roof, 0, 0, surface[0] * density, surface[1] * density, rx, ry, (w + 6) * (1 + k), (d + 6) * (1 + k));
}
function makeLeaves(c, clean) {
  const w = c.width, h = c.height, base = c.getContext('2d').getImageData(0, 0, w, h),
        fol = clean.getContext('2d').getImageData(0, 0, w, h);
  const frames = Array.from({length: 4}, () => {
    let a = document.createElement('canvas');
    a.width = w;
    a.height = h;
    return a;
  });
  const pix = frames.map(a => a.getContext('2d').createImageData(w, h));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let i = (y * w + x) * 4, A = base.data[i + 3] / 255, F = fol.data[i + 3] / 255;
      const shade = pix[0].data;
      shade[i] = 5;
      shade[i + 1] = 6;
      shade[i + 2] = 4;
      shade[i + 3] = 255 * Math.max(0, (A - F) / Math.max(.002, 1 - F));
      if (!F) continue;
      let nx = (x - w * .51) / w, ny = (y - h * .46) / h, r = Math.hypot(nx, ny);
      let z = r + .036 * Math.sin(nx * 24 + ny * 11) + .026 * Math.sin(ny * 23 - nx * 14);
      let layer = z < .18 ? 3 : z < .305 ? 2 : 1;
      for (let j = 1; j <= layer; j++) {
        const main = j === layer;
        const daylight = .965 + .034 * (j - 1) - .10 * (nx + ny);
        const gain = main ? daylight : .78, alpha = main ? 1 : .59;
        const target = pix[j].data;
        for (let channel = 0; channel < 3; channel++) target[i + channel] = fol.data[i + channel] * gain;
        target[i + 3] = fol.data[i + 3] * alpha;
      }
    }
  frames.forEach((a, j) => a.getContext('2d').putImageData(pix[j], 0, 0));
  canopyLayers.set(c, frames);
}
function drawLayeredCrown(s, x, y, w, h, kind) {
  const layers = canopyLayers.get(s);
  if (!layers) return drawAutumnCrown(s, x, y, w, h);
  const height = (kind.startsWith('c1_pine')     ? .12 :
                      kind.startsWith('c1_dead') ? .065 :
                                                   .096) *
      clamp(h / 150, .72, 1.2);
  // The trunk stays rooted; the pale upper branch and leaf clusters travel with the crown.
  drawAutumnCrown(layers[0], x, y, w, h);
  const tip = roofPoint(x, y, height * .68);
  ctx.save();
  ctx.strokeStyle = kind.startsWith('c1_birch') ? '#938975' : '#4c4537';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(...tip);
  ctx.stroke();
  ctx.restore();
  for (let j = 1; j < 4; j++) {
    const k = height * [0, .25, .63, 1][j], p = roofPoint(x, y, k);
    drawAutumnCrown(layers[j], ...p, w * (1 + k * .22), h * (1 + k * .22));
  }
}
function posts(x, y, k, half, col) {
  let [u, v] = roofPoint(x, y, k);
  ctx.strokeStyle = col;
  ctx.lineWidth = half * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(u, v);
  ctx.stroke();
  ctx.fillStyle = '#a59b83';
  ctx.fillRect(u - half, v - half, half * 2, half * 2);
}
// Build the clean counterpart with the same transform used by the original tree stamp.
function cacheCrownLayers(c, transform, spriteName, variant, width) {
  const clean = document.createElement('canvas');
  clean.width = c.width;
  clean.height = c.height;
  const cleanG = clean.getContext('2d');
  cleanG.setTransform(transform);
  if (spriteName.startsWith('c1_birch')) {
    cleanG.drawImage(autumnBirch(spriteName, variant, CAN_SZ * 2), -width / 2, -width / 2, width, width);
  } else
    ART.draw(cleanG, spriteName, 0, 0, width, width);
  c1Grade(clean, 0, 0, clean.width, clean.height);
  makeLeaves(c, clean);
}

// Heights are fractions of the camera distance. Draw silhouettes against their actual footprint.
const objectHeight = {
  bus: .043,
  car: .027,
  trafo: .049,
  freightWagon: .049,
  scrapCrane: .066,
  hatch: .05,
  pylon: .078,
  blocks: .015,
  sand: .012,
  bed: .009,
  table: .017,
  shelf: .032,
  bars: .023
};
const objectSurfaces = new WeakMap(), detailSurfaces = new Map(), unshadowedSurface = new WeakSet();
function detailHeight(id) {
  if (/yard_car|tractor|truck/.test(id)) return .03;
  if (/pole|reel|barrel|drum/.test(id)) return .017;
  if (/rock|bricks|log|sleepers|pipes|sandbags|boat|stump|junk|kettle|tires|wheel|churn|crate/.test(id))
    return .009;
  return 0;
}
function makeSurface(width, height, paint) {
  const top = document.createElement('canvas');
  top.width = Math.ceil(width * 1.5);
  top.height = Math.ceil(height * 1.5);
  const g = top.getContext('2d');
  g.scale(top.width / width, top.height / height);
  paint(g);
  c1Grade(top, 0, 0, top.width, top.height);
  const side = document.createElement('canvas');
  side.width = top.width;
  side.height = top.height;
  const flank = side.getContext('2d');
  flank.drawImage(top, 0, 0);
  flank.globalCompositeOperation = 'source-atop';
  flank.fillStyle = 'rgba(30,26,21,.49)';
  flank.fillRect(0, 0, side.width, side.height);
  return {top, side, width, height};
}
function raisedSprite(surface, x, y, k, angle = 0) {
  const {width: w, height: h, side, top} = surface;
  const [u, v] = roofPoint(x, y, k), dx = u - x, dy = v - y;
  const steps = Math.min(7, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.8)));
  ctx.save();
  ctx.translate(x, y);
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, scale = 1 + k * t;
    ctx.save();
    ctx.translate(dx * t, dy * t);
    ctx.rotate(angle);
    ctx.drawImage(j === steps ? top : side, -w * scale / 2, -h * scale / 2, w * scale, h * scale);
    ctx.restore();
  }
  ctx.restore();
}
function worldDetail(id, x, y, w, angle) {
  const k = detailHeight(id);
  if (!k) return;
  const key = id + '/' + w;
  let surface = detailSurfaces.get(key);
  if (!surface) {
    const rect = ART.m.sprites[id].rect, h = w * rect[3] / rect[2];
    surface = makeSurface(w, h, g => c1Draw(g, id, w / 2, h / 2, w));
    detailSurfaces.set(key, surface);
  }
  raisedSprite(surface, x, y, k, angle);
}
function objectSurface(o) {
  let surface = objectSurfaces.get(o);
  if (surface) return surface;
  // Include the overhang of the crane jib, the bus bonnet and chipped concrete caps.
  const pad = o.k === 'scrapCrane' ? 4 * T : 18, w = o.w + 2 * pad, h = o.h + 2 * pad;
  surface = makeSurface(w, h, g => {
    g.translate(pad - o.x, pad - o.y);
    // The silhouette supplies side faces. Its ground shadow is already in the terrain chunk.
    unshadowedSurface.add(g);
    try {
      paintStaticObject(g, o);
    } finally {
      unshadowedSurface.delete(g);
    }
  });
  objectSurfaces.set(o, surface);
  return surface;
}
// Pre-cut feathered height bands once. The full-resolution silhouette and its contact
// point stay intact as the upper parts move. Canvas doesn't have to tessellate alpha sprites.
const reliefBands = new WeakMap();
function reliefPatch(image, x, y, w, h, angle, profile, amplitude) {
  let bands = reliefBands.get(image);
  if (!bands) {
    const size = Math.min(1, 640 / Math.max(image.width, image.height));
    const base = document.createElement('canvas');
    base.width = Math.round(image.width * size);
    base.height = Math.round(image.height * size);
    const g = base.getContext('2d');
    g.drawImage(image, 0, 0, base.width, base.height);
    c1Grade(base, 0, 0, base.width, base.height);
    const pixels = g.getImageData(0, 0, base.width, base.height), levels = 6;
    const heights = new Float32Array(base.width * base.height);
    let low = 0, high = 0;
    for (let j = 0; j < base.height; j++)
      for (let i = 0; i < base.width; i++) {
        const z = profile(i / (base.width - 1), j / (base.height - 1));
        heights[j * base.width + i] = z;
        low = Math.min(low, z);
        high = Math.max(high, z);
      }
    bands = [];
    for (let n = 0; n < levels; n++) {
      const z = low + (high - low) * n / (levels - 1);
      const c = document.createElement('canvas');
      c.width = base.width;
      c.height = base.height;
      const cg = c.getContext('2d'), p = cg.createImageData(c.width, c.height);
      for (let i = 0; i < heights.length; i++) {
        const t = (heights[i] - low) * (levels - 1) / (high - low || 1);
        const coverage = n === 0 ? 1 : clamp(t - n + 1, 0, 1);
        if (!coverage) continue;
        const ix = i * 4;
        p.data[ix] = pixels.data[ix];
        p.data[ix + 1] = pixels.data[ix + 1];
        p.data[ix + 2] = pixels.data[ix + 2];
        // Feathering inside the same surface fills newly visible back slopes.
        // On transparent fringes distribute coverage to avoid darkening the outline.
        const alpha = pixels.data[ix + 3] / 255;
        p.data[ix + 3] =
            255 * coverage * (alpha > .96 ? alpha : 1 - (1 - alpha) ** (1 / Math.max(1, 1 + t)));
      }
      cg.putImageData(p, 0, 0);
      bands.push({image: c, z});
    }
    reliefBands.set(image, bands);
  }
  for (const layer of bands) {
    const k = amplitude * layer.z, [cx, cy] = roofPoint(x, y, k);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(1 + k, 1 + k);
    ctx.drawImage(layer.image, -w * .5, -h * .5, w, h);
    ctx.restore();
  }
}
function ridge(u, v) {
  const xx = 2 * u - 1, yy = 2 * v - 1;
  return Math.max(0, 1 - xx * xx - yy * yy) ** 2 * (1 + .16 * Math.sin(8 * u + 4 * v));
}
function gateHeightAt(u, v) {
  const hill = .038 * ridge(u, v);
  const inner = clamp((.18 - Math.abs(u - .5)) / .075, 0, 1);
  const stairs = clamp((v - .19) / .11, 0, 1) * clamp((.85 - v) / .45, 0, 1);
  const leaf = Math.max(0, 1 - Math.abs(Math.abs(u - .5) - .285) / .12) * clamp((v - .14) / .14, 0, 1) *
      clamp((.82 - v) / .14, 0, 1);
  return hill + .032 * leaf - .075 * inner * stairs;
}
function drawWorldRelief(inView) {
  const visible = (x, y, r) => inView(x, y, r + 35);
  for (const [x, y, w, h, a] of dumpHills) {
    if (!lesserSprites.slag || !visible(x * T, y * T, w * T * .6)) continue;
    ctx.save();
    reliefPatch(lesserSprites.slag, x * T, y * T, w * T, h * T, a, ridge, .084);
    ctx.restore();
  }
  for (const [id, tx, ty, w, a] of CORDON_DETAILS)
    if (visible(tx * T, ty * T, w)) worldDetail(id, tx * T, ty * T, w, a);
  for (const [kind, tx, ty, a] of DECOR) {
    const entry = C1DECOR[kind];
    if (entry && visible(tx * T, ty * T, entry[1])) worldDetail(entry[0], tx * T, ty * T, entry[1], a);
  }
  for (const o of objs) {
    const x = o.x + o.w / 2, y = o.y + o.h / 2, k = objectHeight[o.k];
    if (!(k || o.k === 'fence') || !visible(x, y, Math.max(o.w, o.h) / 2 + 64)) continue;
    if (o.k === 'fence') {
      if(o.material==='railMesh'){drawHighWire(o);continue;}
      const vertical = o.h > o.w, len = vertical ? o.h : o.w, n = Math.ceil(len / 52),
            height = o.material === 'stockade' ? .043 : .024;
      for (let i = 0; i <= n; i++)
        posts(vertical ? x : o.x + len * i / n, vertical ? o.y + len * i / n : y, height, 1.45, '#595448');
      const a = roofPoint(vertical ? x : o.x, vertical ? o.y : y, height);
      const b = roofPoint(vertical ? x : o.x + len, vertical ? o.y + len : y, height);
      ctx.strokeStyle = '#777364';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    } else if (o.k === 'freightWagon' && o.sprite === 'wagon' && lesserSprites.wagon) {
      drawFreightBody(o);
    } else if (o.k === 'hatch' && gateTerrain) {
      reliefPatch(gateTerrain, x, y, o.w, o.h, 0, gateHeightAt, 1);
    } else {
      if (o.k === 'pylon') posts(x, y, k, 2, '#787364');
      if (o.k === 'pylon') {
        const top = roofPoint(x, y, k);
        c1Draw(ctx, 'c1_pole_conc', ...top, 44, (o.x * 7 % 3) * .2);
      } else
        raisedSprite(objectSurface(o), x, y, k);
    }
  }
  if (lesserSprites.barge && visible(35.1 * T, (LESSER_TOP + 82) * T, 180)) {
    const hull = lesserSprites.barge;
    reliefPatch(hull, 35.1 * T, (LESSER_TOP + 82) * T, 324, 324 * hull.height / hull.width, 0, ridge, .033);
  }
  for (const sign of trailSigns) {
    const x = sign.x * T, y = sign.y * T;
    if (!visible(x, y, 50)) continue;
    const [u, v] = roofPoint(x, y, .025), sx = (x - u) / 30, sy = (y - v) / 30;
    // Shear about the foot of the sign; its lettering travels with the board.
    ctx.save();
    ctx.transform(1, 0, sx, 1 + sy, -sx * y, -sy * y);
    drawTrailSign(ctx, sign);
    ctx.restore();
  }
  for (const {kind, x, y, radius} of lesserLandmarks)
    if (visible(x * T, (LESSER_TOP + y) * T, radius * 1.3))
      raisedLandmark(kind, x * T, (LESSER_TOP + y) * T, radius);
  for (const [x, y] of dumpTanks)
    if (visible(x * T, y * T, 76)) raisedLandmark('tank', x * T, y * T, 1.125 * T);
}
function raisedLandmark(kind, x, y, r) {
  const image = lesserSprites[kind];
  if (!image) return;
  const k = 2 * r / Math.max(image.width, image.height), w = image.width * k, h = image.height * k;
  const height = {mill: .118, dome: .103, antenna: .14, silo: .085, tank: .047}[kind];
  groundShadow(ctx, x, y, w * .42, h * .31, 0, 4);
  reliefPatch(image, x, y, w, h, 0, ridge, height);
}
function ballastSlope(g, x, y, w, h) {
  const side = g.createLinearGradient(0, y, 0, y + h);
  for (const [at, c] of [
           [0, 'transparent'], [.1, 'rgba(196,173,121,.29)'], [.29, 'transparent'], [.66, 'transparent'],
           [.82, 'rgba(43,35,26,.23)'], [.94, 'rgba(34,31,23,.38)'], [1, 'transparent']])
    side.addColorStop(at, c);
  g.fillStyle = side;
  g.fillRect(x, y, w, h);
}
// Sample relief in world coordinates, before roads and props. The light comes from the north-west.
// Local landforms are in tile coordinates. Roads, wetlands and yards taper back to level.
const knolls = [
  [WEST + 39, NORTH_ROWS + 43, 13, 6, -.3], [WEST + 74, NORTH_ROWS + 105, 10, 7, .5],
  [WEST + 177, NORTH_ROWS + 78, 19, 8, -.65], [WEST + 197, NORTH_ROWS + 174, 14, 6, .32],
  [64, LESSER_TOP + 20, 14, 5, .35], [117, LESSER_TOP + 62, 12, 8, -.45], [143, LESSER_TOP + 2, 18, 5, -.4],
  [313, 67, 14, 6, .23], [354, 88, 9, 5, -.73]
];
let hillshade;
function paintHills(g) {
  if (!hillshade) {
    const step = 2, im = document.createElement('canvas');
    im.width = PW * step;
    im.height = MH * step;
    const gc = im.getContext('2d'), pix = gc.createImageData(im.width, im.height);
    const terrain = autumnTerrain();
    for (let y = 0; y < im.height; y++)
      for (let x = 0; x < im.width; x++) {
        const tx = Math.floor(x / step), ty = Math.floor(y / step), tile = ty * MW + tx;
        if (!GROUNDISH(map[tile])) continue;
        const region = ty < NORTH_ROWS ? 1.5 : tx < WEST ? .91 : 1.1;
        const exposure = Math.min(1, terrain.water[tile] / 5, terrain.verge[tile] / 3);
        const slope = (vnoise(x * 2 + 2, y * 2 + 2, 43) - vnoise(x * 2 - 2, y * 2 - 2, 43)) * .94 +
            (vnoise(x * 2 + 2, y * 2 + 1, 20) - vnoise(x * 2 - 2, y * 2 - 1, 20)) * .34;
        const i = (y * im.width + x) * 4, lit = slope > 0;
        pix.data[i] = lit ? 212 : 38;
        pix.data[i + 1] = lit ? 190 : 34;
        pix.data[i + 2] = lit ? 143 : 26;
        pix.data[i + 3] = Math.min(66, Math.abs(slope) * 450 * region) * exposure;
      }
    for (const [cx, cy, rx, ry, a] of knolls) {
      const radius = Math.ceil(Math.max(rx, ry) * 1.15), sn = Math.sin(a), cs = Math.cos(a);
      for (let j = (cy - radius) * step; j < (cy + radius) * step; j++)
        for (let i = (cx - radius) * step; i < (cx + radius) * step; i++) {
          if (j < 0 || i < 0 || j >= im.height || i >= im.width) continue;
          const tile = (j / step | 0) * MW + (i / step | 0);
          if (!GROUNDISH(map[tile])) continue;
          const dx = i / step - cx, dy = j / step - cy, u = (dx * cs + dy * sn) / rx,
                v = (dy * cs - dx * sn) / ry;
          const r = u * u + v * v + .09 * Math.sin(4 * u + 3 * v);
          if (r >= 1) continue;
          const light = -(u * (cs + sn) + v * (cs - sn)) * (1 - r);
          const ix = (j * im.width + i) * 4;
          const weight = Math.min(1, terrain.water[tile] / 5, terrain.verge[tile] / 3);
          pix.data[ix] = light > 0 ? 220 : 36;
          pix.data[ix + 1] = light > 0 ? 198 : 32;
          pix.data[ix + 2] = light > 0 ? 157 : 27;
          pix.data[ix + 3] = Math.min(85, Math.abs(light) * 175) * weight;
        }
    }
    gc.putImageData(pix, 0, 0);
    hillshade = im;
  }
  const {x0, y0, x1, y1} = GWP, k = hillshade.width / (PW * T);
  g.drawImage(hillshade, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
}

// The rail goes over the Cordon highway. Abutments sit on the existing railway banks.
// Fade the deck locally underfoot as with house roofs, so the gate and actors remain readable.
function liftContainer(o, paint) {
  const height = o.k === 'safe' ? .026 : .014, x = o.x + o.w / 2, y = o.y + o.h / 2;
  const [u, v] = roofPoint(x, y, height);
  const dx = u - x, dy = v - y;
  ctx.save();
  ctx.translate(dx * .4, dy * .4);
  paint(o);
  ctx.translate(dx * .6, dy * .6);
  paint(o);
  ctx.restore();
}

// Wheelsets and buffers sit on the track independently of the raised wagon body.
function drawFreightBody(o) {
  const k = objectHeight.freightWagon, img = lesserSprites[o.sprite], x0 = o.x + o.w * .05,
        x1 = o.x + o.w * .95, y0 = o.y + o.h * .09, y1 = o.y + o.h * .90;
  for (const [u, v, w, h] of [[0, .9, 1, .1], [0, .32, .049, .32], [.951, .32, .049, .32]])
    ctx.drawImage(
        img, u * img.width, v * img.height, w * img.width, h * img.height, o.x + u * o.w, o.y + v * o.h,
        w * o.w, h * o.h);
  let tex = walls.get('gondola');
  if (!tex) {
    tex = document.createElement('canvas');
    tex.width = 408;
    tex.height = 32;
    tex.getContext('2d').drawImage(
        img, img.width * .055, img.height * .60, img.width * .885, img.height * .29, 0, 0, 408, 32);
    walls.set('gondola', tex);
  }
  if (cam.y > y1) texturedFace([x0, y1], [x1, y1], k, tex);
  if (cam.y < y0) texturedFace([x0, y0], [x1, y0], k, tex);
  if (cam.x < x0) texturedFace([x0, y0], [x0, y1], k, tex);
  if (cam.x > x1) texturedFace([x1, y0], [x1, y1], k, tex);
  const p = roofPoint(x0, y0, k);
  ctx.drawImage(
      img, img.width * .045, 0, img.width * .91, img.height * .61, ...p, (x1 - x0) * (1 + k),
      (y1 - y0) * (1 + k));
}

// Floor positions use the same saved world coordinates as the separate bunker interior.
const lofts=[];
const tilePoint=(x,y)=>({x:x*T,y:y*T});
function loftAt(p) {
  if(!p || !BIG || p.x<PW*T) return null;
  return lofts.find(r=>p.x>=r.x*T && p.x<(r.x+r.w)*T && p.y>=r.y*T && p.y<(r.y+r.h)*T) || null;
}
const routeToActor=e=>loftAt(e) && loftAt(e)!==loftAt(P)?loftAt(e).stair:e;
const worldMapPoint=p=>loftAt(p)?.stair || (inBunker(p.x,p.y)?HATCH:p);
function buildLandmarks(){
  if(!BIG) return;
  const axis=NORTH_ROWS+57, road=roadX[axis], gate=bridgeBarrier || objs.find(o=>o.key==='bar');
  const cx=gate?(gate.x+gate.w/2)/T:road+.5;
  Object.assign(NPCDEF.find(n=>n.sid==='a1'),{x:cx-.80,y:axis-2.15});
  Object.assign(NPCDEF.find(n=>n.sid==='a2'),{x:cx+.82,y:axis+2.95});
  // Breaks follow all three physical openings in the rail tiles. Short runs can be culled separately.
  for(const y of [axis-.79,axis+1.78]){
    for(const [start,end] of [[WEST,WEST+71],[WEST+74,road-1],[road+2,WEST+207],[WEST+209,PW]]){
      for(let x=start;x<end;x+=8) CORDON_FENCES.push(['railMesh',x,y,Math.min(end,x+8),y]);
    }
  }
  const depot=HOUSES.find(h=>h.mat==='depot');
  for(let y=depot.y+1;y<depot.y+depot.h-1;y++)
    for(let x=depot.x+1;x<depot.x+depot.w-1;x++)if(tAt(x,y)===FL)setT(x,y,CF);
  for(const x of [267,273,280,288]){
    for(const y of [34,39])addObj({k:'depotPier',x:x*T+7,y:y*T+7,w:13,h:13,solid:1});
  }
  for(const [id,x,y,w,a] of [['c1_trace_reel',266,36,38,.16],['c1_crate_army',270,33.7,30,.18],
      ['c1_barrel',282,34,24,.04],['c1_trace_sleepers',277,35,47,-.15],['c1_trace_pipes',288.8,35.6,52,.2]])
    CORDON_DETAILS.push([id,x,y,w,a]);
  for(const [id,name,y,h,stair] of [
    ['atp','Чердак АТП',65,9,tilePoint(438.5,266.73)],
    ['depot','Галерея депо',99,17,tilePoint(290.26,40.25)]
  ]){
    const r={id,name,x:PW+1,y,w:10,h,stair,landing:id==='atp'?tilePoint(PW+3.5,y+h-1.75):tilePoint(PW+2.72,y+h-5.1)};
    lofts.push(r);
    for(let j=0;j<h;j++) for(let i=0;i<r.w;i++){
      const wall=!i||!j||i===r.w-1||j===h-1;
      const voidBay=id==='depot' && i>=4 && i<=6 && j>=3 && j<=h-4 && j!==8;
      setT(r.x+i,r.y+j,wall||voidBay?CO:id==='depot'?CF:FL);
    }
    if(id==='atp') Object.assign(NPCDEF.find(e=>e.sid==='shust'),{x:r.x+7.2,y:y+2.8});
  }
  buildWorkshopRooms();
}
function drawLoftMap(g,r,size){
  const k=Math.min((size-18)/r.w,(size-18)/r.h),ox=(size-r.w*k)/2,oy=(size-r.h*k)/2;
  g.save();g.translate(ox,oy);
  for(let j=0;j<r.h;j++)for(let i=0;i<r.w;i++){
    g.fillStyle=tAt(r.x+i,r.y+j)===CO?'#35352e':nav[(r.y+j)*MW+r.x+i]?'#787158':'#5a5546';g.fillRect(i*k,j*k,k+.3,k+.3);
  }
  const dot=(p,color)=>{g.fillStyle=color;g.beginPath();g.arc((p.x/T-r.x)*k,(p.y/T-r.y)*k,Math.max(3,k*.34),0,Math.PI*2);g.fill();};
  for(const body of objs)if(body.k==='body' && body.kind!=='sack' && loftAt(body)===r)dot(body,'#a9a7a0');
  dot(r.landing,'#d5b16b');if(r.id==='atp' && byS('shust')?.captive)dot(byS('shust'),'#d0bc79');dot(P,'#70dbdc');g.restore();
}
function beam(g,x,y,x1,y1,w,color){
  g.strokeStyle=color;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(x1,y1);g.stroke();
}
function loftSurface(r){
  const c=document.createElement('canvas');c.width=r.w*T;c.height=r.h*T;
  const g=c.getContext('2d'),w=c.width,h=c.height,rand=mulberry32(r.y);
  artFill(g,r.id==='atp'?'floor_wood':'floor_concrete',0,0,w,h);
  const industrial=r.id==='depot';
  if(industrial){
    for(const [top,bottom] of [[3,8],[9,r.h-3]]){
      const x=4*T,y=top*T,v=(bottom-top)*T;
      g.save();g.beginPath();g.rect(x,y,3*T,v);g.clip();
      artFill(g,'floor_concrete',x,y,3*T,v);
      for(const offset of [15,61]){
        for(let i=0;i<v;i+=12)beam(g,x+offset-5,y+i,x+offset+21,y+i,4,'#514236');
        for(const dx of [0,15])beam(g,x+offset+dx,y,x+offset+dx,y+v,2,'#827969');
      }
      g.fillStyle='rgba(15,16,15,.66)';g.fillRect(x,y,3*T,v);
      g.restore();
      for(const [a,b,d,e] of [[x,y,x+3*T,y],[x,y+v,x+3*T,y+v],[x,y,x,y+v],[x+3*T,y,x+3*T,y+v]]){
        beam(g,a+3,b+4,d+3,e+4,4,'rgba(0,0,0,.37)');beam(g,a,b,d,e,4,'#564335');beam(g,a,b-1,d,e-1,1,'#ac9680');
        const n=Math.ceil(Math.hypot(d-a,e-b)/23);
        for(let i=0;i<=n;i++){g.fillStyle='#433d31';g.fillRect(a+(d-a)*i/n-2,b+(e-b)*i/n-2,4,5);}
      }
    }
    // Raised gallery visible above the service tracks; diagonal truss shadows run into the well.
    for(let j=2;j<r.h-2;j+=4) beam(g,T,j*T,w-T,(j+.8)*T,5,'rgba(23,20,17,.22)');
  }else{
    if(ART?.images.roomFittings){
      g.save();g.translate(w-90,89);g.rotate(1.48);
      g.drawImage(ART.images.roomFittings,...roomFittings.bedroll[0],-15,-29,30,58);g.restore();
      const pool=g.createRadialGradient(w-65,3*T,3,w-65,3*T,85);
      pool.addColorStop(0,'rgba(242,210,147,.18)');pool.addColorStop(1,'rgba(242,210,147,0)');
      g.fillStyle=pool;g.fillRect(w-150,T,150,5*T);
    }
    // Scuffed linoleum and a strip of bare boards mark the former dispatch office.
    const wash=g.createLinearGradient(4.7*T,T,w-T,5.6*T);
    wash.addColorStop(0,'rgba(114,114,84,.16)');wash.addColorStop(1,'rgba(102,90,61,.03)');
    g.fillStyle=wash;g.fillRect(4.75*T,T,w-5.75*T,4.6*T);
  }
  g.save();g.translate(-r.x*T,-r.y*T);
  for(const o of objs){
    if(o.x<r.x*T || o.x>=(r.x+r.w)*T || o.y<r.y*T || o.y>=(r.y+r.h)*T)continue;
    if(o.k==='roomFitting')drawRoomFitting(g,o);
    else if(o.k==='partition')paintPartition(g,o);
  }
  g.restore();
  const mat='wall_brick';
  artFill(g,mat,0,0,w,T);artFill(g,mat,0,h-T,w,T);
  for(const x of [0,w-T])artFill(g,mat,x,T,T,h-2*T);
  for(let j=0;j<90;j++){
    const x=rand()*w,y=rand()*h;
    if(x>T && x<w-T && y>T && y<h-T)continue;
    beam(g,x,y,x+rand()*13,y+rand()*6,1,'rgba(15,15,13,.55)');
  }
  for(let j=2;j<r.h-2;j+=3){
    const y=j*T;g.fillStyle='#242824';g.fillRect(w-19,y,11,29);
    for(let k=0;k<3;k++)g.fillRect(w-24,y+k*11,13,2);
    const light=g.createRadialGradient(w-30,y,1,w-30,y,90);
    light.addColorStop(0,'rgba(217,202,154,.21)');light.addColorStop(1,'rgba(217,202,154,0)');g.fillStyle=light;g.fillRect(w-125,y-90,125,180);
  }
  g.save();g.beginPath();g.rect(T,T,w-2*T,h-2*T);g.clip();
  for(const [x,y,angle,len] of [[T,T,0,w-2*T],[w-T,T,Math.PI/2,h-2*T],
      [w-T,h-T,Math.PI,w-2*T],[T,h-T,-Math.PI/2,h-2*T]]){
    g.save();g.translate(x,y);g.rotate(angle);
    const shadow=g.createLinearGradient(0,0,0,10);
    shadow.addColorStop(0,'rgba(31,26,21,.48)');shadow.addColorStop(1,'rgba(31,26,21,0)');
    g.fillStyle=shadow;g.fillRect(0,0,len,10);g.restore();
  }
  g.restore();
  for(const x of [T,w-T])beam(g,x,0,x,h,5,'rgba(28,24,19,.62)');
  const shade=g.createLinearGradient(0,0,w,h);shade.addColorStop(0,'rgba(20,19,15,.44)');shade.addColorStop(1,'rgba(24,21,15,.14)');
  g.fillStyle=shade;g.fillRect(0,0,w,h);return c;
}
function drawLoft(r){if(!r.surface)r.surface=loftSurface(r);ctx.drawImage(r.surface,r.x*T,r.y*T);}
function weatherFacade(g,len,wood,rand){
  for(let i=0;i<Math.ceil(len/24);i++){
    const x=rand()*len,y=rand()*72,w=8+rand()*32,h=6+rand()*17;
    const stain=g.createRadialGradient(x,y,1,x,y,w);
    stain.addColorStop(0,'rgba(44,38,28,.38)');stain.addColorStop(1,'rgba(44,38,28,0)');
    g.fillStyle=stain;g.fillRect(x-w,y-w,2*w,2*w);
    g.save();g.beginPath();g.moveTo(x,y+h);
    for(let j=0;j<=8;j++)g.lineTo(x+w*j/8,y+rand()*h*.45);
    for(let j=8;j>=0;j--)g.lineTo(x+w*j/8,y+h-rand()*h*.33);
    g.clip();artFill(g,wood?'floor_wood':'wall_brick',x,y,w,h);
    g.fillStyle=wood?'rgba(45,39,30,.46)':'rgba(89,67,50,.35)';g.fillRect(x,y,w,h);g.restore();
    beam(g,x,y,x+3,y+5,1,'#443d32');beam(g,x+3,y+5,x+1,y+11,1,'#443d32');
  }
}
function drawTavernTable(g,o){
  const x=o.x,y=o.y,w=o.w,h=o.h;
  if(o.barRole==='shelf'){
    artFill(g,'floor_wood',x,y,w,h);beam(g,x,y+h,x+w,y+h,2,'#473a2b');
    for(let i=4;i<w-3;i+=6){
      const color=i%4?'#6e7350':'#876948';g.fillStyle=color;g.fillRect(x+i,y+3,3,6);
      g.fillStyle='#b2a188';g.fillRect(x+i+1,y+1,1,3);
    }
    return;
  }
  if(o.barRole==='counter'){
    const lamp=g.createRadialGradient(x+w-16,y+5,0,x+w-16,y+5,43);
    lamp.addColorStop(0,'rgba(249,194,96,.43)');lamp.addColorStop(1,'rgba(249,194,96,0)');
    g.fillStyle=lamp;g.fillRect(x+w-60,y-40,88,88);g.fillStyle='#574030';g.fillRect(x,y+h-5,w,5);beam(g,x,y+h-6,x+w,y+h-6,2,'#b19468');}
  if(o.barRole==='bench'){
    for(const [dx,dy,a] of [[7,6,7],[26,10,-6],[20,4,5]]){beam(g,x+dx,y+dy,x+dx+a,y+dy+4,2,'#aba79a');}
    g.fillStyle='#484940';g.fillRect(x+w-9,y+2,7,8);
  }else for(const dx of (o.barRole==='counter'?[w-11,w-19,w-23]:[8,w-9])){
    g.fillStyle='#393c29';g.fillRect(x+dx,y+3,3.5,8);g.fillStyle='#858765';g.fillRect(x+dx+.5,y+3,1,5);
    g.fillStyle='#b8a68a';g.fillRect(x+dx-3,y+11,3,3);
  }
}
function drawDrinkingCup(e){
  const phase=(performance.now()*.00017+(e.sid==='lz_guest'?0:.43))%1;
  const reach=10-5*Math.max(0,Math.sin(phase*2*Math.PI));
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);ctx.fillStyle='#b09a79';ctx.fillRect(reach,4,3,3);
  ctx.fillStyle='#c3b498';ctx.fillRect(reach+2,3.5,3,3.5);ctx.restore();
}
const poppyTufts=[];
function poppyTuft(i){
  if(poppyTufts[i])return poppyTufts[i];
  const c=document.createElement('canvas');c.width=40;c.height=32;
  const g=c.getContext('2d'),rand=mulberry32(557+i*71);
  for(let n=0;n<7;n++){
    const x=4+rand()*32,y=3+rand()*20;
    beam(g,x+4,y+8,x,y,1,'#4e5334');beam(g,x+2,y+4,x-1,y+4,1,'#707041');
    g.fillStyle='rgba(45,30,18,.37)';g.fillRect(x+2,y+3,4,2);
    for(let j=0;j<4;j++){
      const a=j*1.57+.3;g.fillStyle=['#9f3226','#bf4130','#b53225','#873027'][j];
      g.beginPath();g.ellipse(x+Math.cos(a)*1.5,y+Math.sin(a),1.8,.95,a,0,2*Math.PI);g.fill();
    }
    g.fillStyle='#372b25';g.fillRect(x-.7,y-.5,1.4,1.2);
  }
  return poppyTufts[i]=c;
}
function paintPoppyHeads(g,x,y,actor){
  const d=1-poppyBed(x+.5,y+.5);if(d<=0 || tAt(x,LESSER_TOP+y)!==GR)return;
  const rand=mulberry32(x*7321+y*343),n=Math.ceil(Math.sqrt(d)*2.3);
  for(let i=0;i<n;i++){
    const px=(x+rand())*T,py=(LESSER_TOP+y+rand())*T,which=Math.floor(rand()*8);
    if(actor && (py<actor.y || py>actor.y+21 || Math.abs(px-actor.x)>25))continue;
    g.drawImage(poppyTuft(which),px-20,py-20);
  }
}
function drawNearPoppies(g,p){
  const x=Math.floor(p.x/T),y=Math.floor(p.y/T)-LESSER_TOP;
  if(x<18||x>71||y< -22||y>35)return;
  for(let j=y-1;j<=y+1;j++)for(let i=x-1;i<=x+1;i++)paintPoppyHeads(g,i,j,p);
}
// Cut back the banks at each tunnel mouth. Gravel and runnels share the ground chunk cache.
function paintRailSlopes(g){
  const y=(NORTH_ROWS+57.5)*T;
  if(GWP.x1<=WEST*T||GWP.y0>y+125||GWP.y1<y-125)return;
  const left=Math.max(GWP.x0,WEST*T),right=Math.min(GWP.x1,PW*T);
  const portals=[WEST+72.5,roadX[NORTH_ROWS+57]+.5,WEST+208];
  for(let x=Math.floor(left/6)*6;x<right;x+=6){
    const end=Math.min(...portals.map(c=>Math.abs(x/T-c)))*T;
    const taper=clamp((end-47)/62,0,1);
    if(!taper)continue;
    for(const side of [-1,1]){
      const foot=(86+13*Math.sin(x*.008)+8*Math.cos(x*.016+side))*taper;
      const crown=y+side*34,base=crown+side*foot;
      const slope=g.createLinearGradient(0,crown,0,base);
      slope.addColorStop(0,'rgba(62,53,40,.61)');slope.addColorStop(.19,'rgba(142,126,92,.54)');
      slope.addColorStop(.57,side>0?'rgba(64,54,42,.41)':'rgba(126,110,81,.34)');
      slope.addColorStop(1,'rgba(91,78,56,0)');g.fillStyle=slope;
      g.fillRect(x,Math.min(crown,base),6,foot);
      const rand=mulberry32(651+Math.abs(x*3+side));
      for(let i=0;i<8;i++){const px=x+rand()*6,py=crown+side*rand()*foot;
        beam(g,px,py,px+rand()*1.8,py+side*(1+rand()*3),.8,'rgba(56,49,36,.26)');}
    }
  }
}
function drawCheckpointSpan(inView){
  const y=(NORTH_ROWS+57.5)*T,cx=(roadX[NORTH_ROWS+57]+.5)*T;
  if(!inView(cx,y,7*T))return;
  for(const side of [-1,1]){
    const x=cx+side*1.53*T;ctx.save();ctx.translate(x,y);ctx.scale(-side,1);
    const dx=(x-cam.x)*.035*-side,dy=(y-cam.y)*.035;
    ctx.fillStyle='rgba(32,27,19,.31)';ctx.fillRect(-13+4,-27+6,19,64);
    // Flared masonry wing walls retain the soil on either side of the road cut.
    for(const end of [-1,1]){
      ctx.save();ctx.beginPath();ctx.moveTo(-25,end*25);ctx.lineTo(2,end*24);
      ctx.lineTo(-13,end*61);ctx.lineTo(-24,end*75);ctx.lineTo(-34,end*61);ctx.closePath();ctx.clip();
      artFill(ctx,'wall_concrete',-36,-76,42,152);
      for(let j=28;j<76;j+=9)beam(ctx,-37,j*end,1,(j+2)*end,1.4,'#534b40');
      ctx.restore();beam(ctx,1,end*25,-15,end*62,2,'#9a8c76');
    }
    artFill(ctx,'wall_concrete',-20,-33,23,66);
    for(const j of [-22,-3,17])beam(ctx,-16,j,2,j+2,1,'#574f41');
    ctx.translate(dx,dy);
    artFill(ctx,'floor_wood',-24,-25,23,50);
    for(let j=-22;j<=22;j+=11){
      beam(ctx,-34,j,side===1?11:16,j+1,3.7,'#514536');
      beam(ctx,-33,j-1,9,j,1,'#9b8564');
    }
    for(const off of [-16,16]){
      beam(ctx,-38,off,14,off+1,3,'#50483d');beam(ctx,-38,off-1,13,off,1,'#aca38d');
    }
    for(const off of [-27,27]){
      const droop=side>0?4:1;
      beam(ctx,-44,off,17,off+droop,4,'#514234');beam(ctx,-42,off-1,16,off+droop-1,1,'#a68b68');
      beam(ctx,-41,off,-37+dx,off-23+dy,3,'#584638');beam(ctx,-37+dx,off-23+dy,-8,off,2.5,'#78614a');
      beam(ctx,-37+dx,off-23+dy,-6+dx,off-23+dy,2,'#685440');
      beam(ctx,-6+dx,off-23+dy,12,off+2,2,'#775d43');
    }
    ctx.restore();
  }
}
function drawHighWire(o){
  const y=o.y+o.h*.5,x=o.x;
  const dx=(x-cam.x)*.032,dy=(y-cam.y)*.032-4;
  const w=o.w;ctx.save();
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w+dx,y+dy);ctx.lineTo(x+dx,y+dy);ctx.closePath();ctx.clip();
  ctx.strokeStyle='rgba(125,118,97,.83)';ctx.lineWidth=.85;ctx.beginPath();
  for(let s=-12;s<w+12;s+=6){
    ctx.moveTo(x+s,y);ctx.lineTo(x+s+dx+6,y+dy);ctx.moveTo(x+s,y);ctx.lineTo(x+s+dx-6,y+dy);
  }
  ctx.stroke();ctx.restore();
  const bays=Math.ceil(w/42);
  for(let i=0;i<=bays;i++){
    const xx=x+i*w/bays;beam(ctx,xx,y,xx+dx,y+dy,2.6,'#544b3f');
  }
  beam(ctx,x+dx,y+dy,x+w+dx,y+dy,1.2,'#8c8069');
}
function weatherRoof(g,h,w,depth){
  const rand=mulberry32(7201*h.x+h.y),n=Math.floor(rand()*3);
  g.save();g.shadowColor='transparent';
  for(let i=0;i<n;i++){
    const x=(.14+rand()*.68)*w,y=(.18+rand()*.57)*depth,ww=7+rand()*12,hh=6+rand()*8;
    g.save();g.translate(x,y);g.rotate((rand()-.5)*.22);
    g.beginPath();g.moveTo(0,0);g.lineTo(ww*.6,2);g.lineTo(ww,-1);g.lineTo(ww-1,hh-2);
    g.lineTo(ww*.65,hh);g.lineTo(ww*.4,hh-2);g.lineTo(1,hh);g.clip();
    g.fillStyle='#282820';g.fillRect(-1,-2,ww+3,hh+4);beam(g,2,hh+1,7,-1,2.5,'#6e5941');
    beam(g,0,hh*.7,ww,hh*.7-1,1.4,'#5f5143');g.restore();
  }
  g.restore();
}

function drawRestingCaptive(e){
  const pose=g7PoseFrame('loner','fall_mid');
  if(!pose){drawLitHuman(e);return;}
  const breath=Math.sin(performance.now()*.0022);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(-1.29);ctx.scale(1+.009*breath,1);
  groundShadow(ctx,0,0,12,21,0,1);
  drawFrameAt(0,0,Math.PI/2,pose,1,1,ctx,jacketFor(e)?.images);
  ctx.restore();
}

// Top-down cutouts of worn furniture, shared by homes, offices and workshops. Sizes are world pixels.
const roomFittings={
  bench:[[3,16,110,63],53,29], rack:[[119,4,110,88],42,28],
  cabinet:[[247,3,85,90],29,26], desk:[[357,3,98,90],38,34],
  stove:[[33,99,50,90],25,33], bedroll:[[148,99,51,90],25,46],
  supper:[[239,113,101,61],43,26], pallet:[[361,107,89,74],36,29],
  cupboard:[[37,195,41,90],17,36], files:[[141,225,66,29],34,15],
  stool:[[275,225,30,29],13,13], sack:[[377,225,57,29],21,13]
};
function drawRoomFitting(g,o){
  const [rect,w,h]=roomFittings[o.fitting];
  g.save();g.translate(o.x+o.w/2,o.y+o.h/2);
  spriteShadow(g,2.5,1.7);g.rotate(o.angle);
  if(ART?.images.roomFittings){
    g.drawImage(ART.images.roomFittings,...rect,-w/2,-h/2,w,h);
  }else{
    g.fillStyle='#564d3e';g.fillRect(-w/2,-h/2,w,h);g.strokeStyle='#928269';g.strokeRect(-w/2,-h/2,w,h);
  }
  g.restore();
}
function interiorObject(kind,x,y,w,h,extra){
  return addObj({k:kind,x:x-w/2,y:y-h/2,w,h,solid:1,...extra});
}
function furnitureBounds(name,angle){
  const [,w,h]=roomFittings[name];
  return Math.abs(Math.sin(angle))>.5?[h,w]:[w,h];
}
function putFurniture(name,x,y,angle,home){
  const [w,h]=furnitureBounds(name,angle);
  return interiorObject('roomFitting',x,y,w,h,{fitting:name,angle,home});
}
function supplyBox(x,y,key,loot){
  return interiorObject('crate',x,y,24,22,{stash:'room_'+key,loot,home:key});
}
function partition(x,y,w,h,material){
  return addObj({k:'partition',x:x*T,y:y*T,w:w*T,h:h*T,material,opaque:material!=='mesh',solid:1});
}
function paintPartition(g,o){
  const length=Math.max(o.w,o.h),vertical=o.h>o.w;
  g.save();g.translate(o.x+o.w/2,o.y+o.h/2);if(vertical)g.rotate(Math.PI/2);
  g.translate(-length/2,0);const d=Math.min(o.w,o.h);
  g.fillStyle='rgba(25,21,15,.30)';g.fillRect(4,2,length,9);
  if(o.material==='mesh'){
    g.strokeStyle='#827764';g.lineWidth=1;g.beginPath();
    for(let x=0;x<length-5;x+=5){g.moveTo(x,-4);g.lineTo(x+5,3);g.moveTo(x,3);g.lineTo(x+5,-4);}g.stroke();
  }else if(ART)artFill(g,o.material==='timber'?'floor_wood':'wall_brick',0,-d/2,length,d);
  else{g.fillStyle='#675949';g.fillRect(0,-d/2,length,d);}
  beam(g,0,-d/2,length,-d/2,1.7,'#9b8b72');beam(g,0,d/2,length,d/2,2.4,'#493c30');
  for(let i=0,n=Math.ceil(length/35);i<=n;i++){
    const x=i/n*(length-4);g.fillStyle='#554637';g.fillRect(x,-d/2-1,4,d+2);
  }
  g.restore();
}
// Local u runs into the flight, v runs across it. Interaction points are outside its solid footprint.
function stairAngle(room,upper){return upper?(room.id==='atp'?0:Math.PI/2):(room.id==='atp'?Math.PI:-Math.PI/2);}
function stairRun(room,upper){
  const p=upper?room.landing:room.stair,angle=stairAngle(room,upper);
  const length=upper?76:122,across=upper?33:37;
  const mid=18+length/2, alongX=Math.abs(Math.cos(angle))>.5;
  interiorObject('stairRun',p.x+Math.cos(angle)*mid,p.y+Math.sin(angle)*mid,
    alongX?length:across,alongX?across:length,{roomId:room.id,upper});
}
function drawBuiltStair(g,room,upper){
  const p=upper?room.landing:room.stair,a=stairAngle(room,upper);
  const iron=room.id==='depot',len=upper?76:101,half=upper?16.5:18.5;
  g.save();g.translate(p.x,p.y);g.rotate(a);g.translate(18,0);
  const height=upper?0:15;
  if(!upper){
    // The enclosed stringer is fixed to the wall. The landing rests on legs above the floor.
    const outer=-half, inner=outer+height,start=len-21,end=len+21;
    g.fillStyle='rgba(25,21,17,.29)';g.beginPath();g.moveTo(3,outer);
    g.lineTo(end,outer-8);g.lineTo(end+9,half+9);g.lineTo(4,half);g.fill();
    g.save();g.beginPath();g.moveTo(0,outer);g.lineTo(len,inner);g.lineTo(end,inner);
    g.lineTo(end,outer-1);g.lineTo(len,outer-1);g.closePath();g.clip();
    if(ART)artFill(g,iron?'wall_concrete':'floor_wood',0,outer-2,end,height+4);
    g.fillStyle='rgba(47,41,32,.41)';g.fillRect(0,outer-2,end,height+4);g.restore();
    for(const t of [.32,.65,1]){
      const u=len*t;beam(g,u,outer,u,outer+height*t,3,'#574c3d');
      beam(g,u,outer+height*t,u+2,outer+height*t,1,'#ad9674');
    }
    // Move the upper treads toward the wall and shorten their visible going as the flight rises.
    g.transform(1,height/len,0,1,0,0);
    if(ART)artFill(g,iron?'wall_concrete':'floor_wood',start,-half,end-start,2*half+4);
    for(let j=start;j<end;j+=7)beam(g,j,-half,j,half,.9,'#625845');
    beam(g,start,outer,end,outer,3.5,'#5b4d3d');beam(g,start,outer+1,end,outer+1,1,'#aa987a');
    // Recess in the upper wall where the player goes out of sight.
    g.fillStyle='#322f27';g.fillRect(end-15,half-7,15,8);
    beam(g,end-15,half-7,end,half-7,2,'#928773');
  }
  const edge=iron?'#77634d':'#78654e',light=iron?'#a49379':'#b39a73',shadow='#332e26';
  const fill=(x,y,w,h,mat)=>{if(ART)artFill(g,mat,x,y,w,h);else{g.fillStyle=edge;g.fillRect(x,y,w,h);}};
  // Exposed flank below the raised landing, or the deep reveal cut through the floor above.
  if(upper){
    g.fillStyle='#24231d';g.fillRect(-3,-half-4,len+6,half*2+8);
    g.fillStyle='#10130f';g.fillRect(0,-half,len,half*2);
    fill(-14,-half,14,half*2,iron?'floor_concrete':'floor_wood');
  }else{
    g.fillStyle='rgba(23,19,15,.33)';g.beginPath();g.moveTo(0,half);g.lineTo(len,half);
    g.lineTo(len+8,half+12);g.lineTo(15,half+3);g.fill();
    fill(len-24,-half-2,25,2*half+4,iron?'wall_concrete':'floor_wood');
    beam(g,len-24,half+1,len-3,half+9,3,shadow);
    beam(g,len-3,half+9,len-3,half,3,edge);
  }
  const treadEnd=upper?len:len-22,steps=8;
  for(let i=0;i<steps;i++){
    const t=i/steps,u=t*treadEnd,depth=treadEnd/steps;
    fill(u,-half,depth+.3,2*half,iron?'wall_concrete':'floor_wood');
    g.fillStyle=upper?'rgba(20,19,15,'+(.14+.76*t)+')':'rgba(39,33,26,'+(.34-.21*t)+')';
    g.fillRect(u,-half,depth+.3,2*half);
    if(iron){
      g.fillStyle='rgba(36,36,31,.47)';
      for(let v=-half+3;v<half-1;v+=4)g.fillRect(u+3,v,3,1.3);
    }
    const nosing=g.createLinearGradient(u,0,u+depth,0);
    nosing.addColorStop(0,upper?'rgba(174,162,129,.34)':'rgba(35,30,23,.70)');
    nosing.addColorStop(.24,'rgba(73,65,50,.16)');nosing.addColorStop(.42,'rgba(190,174,138,.20)');
    nosing.addColorStop(1,upper?'rgba(22,19,16,.58)':'rgba(87,77,60,.23)');
    g.fillStyle=nosing;g.fillRect(u,-half,depth,2*half);
    beam(g,u,-half,u,half,1.4,shadow);beam(g,u+1.4,-half+1,u+1.4,half-1,1,light);
    if(!iron){beam(g,u+3,-half+3,u+3,half-4,.6,'rgba(164,143,107,.52)');
      g.fillStyle='#4e4435';for(const v of [-half+4,half-5])g.fillRect(u+4,v,1.1,1.2);}

  }
  if(!upper){
    fill(treadEnd,-half,len-treadEnd,2*half,iron?'floor_concrete':'floor_wood');
    for(let u=treadEnd;u<len;u+=6)beam(g,u,-half,u,half,.85,'#655846');
  }
  // Project the rails above their feet; their posts and the shadow open up as the player approaches.
  const cx=(p.x-cam.x)*.019,cy=(p.y-cam.y)*.019;
  const du=clamp(cx*Math.cos(a)+cy*Math.sin(a),-6,6);
  const dv=clamp(-cx*Math.sin(a)+cy*Math.cos(a),-5,5)+(upper?-7:7);
  for(const v of [-half,half]){
    const above=t=>upper?1:.52+1.35*t;
    beam(g,0,v,len,v,3,edge);
    for(const t of [0,.34,.67,1]){
      const k=above(t);beam(g,len*t,v,len*t+du*k,v+dv*k,2.4,shadow);
      g.fillStyle=light;g.fillRect(len*t+du*k-1,v+dv*k-1,2,2);
    }
    beam(g,du*above(0),v+dv*above(0),len+du*above(1),v+dv*above(1),2.4,edge);
    beam(g,du*above(0),v+dv*above(0)-1,len+du*above(1),v+dv*above(1)-1,.9,light);
  }
  if(upper){
    beam(g,len,-half-3,len,half+3,5,'#423d32');beam(g,len+2,-half-3,len+2,half+3,1.5,'#a39172');
    const dark=g.createLinearGradient(0,0,len,0);dark.addColorStop(0,'transparent');dark.addColorStop(1,'rgba(14,15,12,.77)');g.fillStyle=dark;g.fillRect(0,-half+2,len,half*2-4);}
  g.restore();
}
function buildWorkshopRooms(){
  Object.assign(NPCDEF.find(n=>n.sid==='b5'),{x:437.15,y:268.1});
  for(const r of lofts){stairRun(r,false);stairRun(r,true);}
  const atp=lofts.find(r=>r.id==='atp'),dep=lofts.find(r=>r.id==='depot');
  const x=atp.x,y=atp.y;
  // Upstairs: receiving bay on the west, sick berth on the east. The doorway faces a short corridor.
  partition(x+4.55,y+1,.20,1.92,'timber');partition(x+4.55,y+4.98,.20,.80,'timber');
  partition(x+4.55,y+5.62,2.05,.18,'timber');partition(x+8.1,y+5.62,.9,.18,'timber');
  for(const [type,i,j,a] of [
    ['rack',2.15,1.50,0],['bench',1.55,3.65,Math.PI/2],['cabinet',3.52,1.5,0],
    ['stool',2.5,3.5,0],['sack',8.45,3.65,0],['desk',6.35,1.63,0],
    ['cupboard',8.6,4.72,0],['files',8.25,1.45,0]
  ])putFurniture(type,(x+i)*T,(y+j)*T,a,'loft_atp');
  supplyBox((x+1.5)*T,(y+5.5)*T,'atp_up',{bandage:1});
  for(const [type,i,j,a] of [['rack',2.2,1.55,0],['bench',7.8,1.65,0],['cabinet',8.48,6,0],
    ['pallet',2,7.45,Math.PI/2],['files',8.4,11.3,Math.PI/2]])
    putFurniture(type,(dep.x+i)*T,(dep.y+j)*T,a,'loft_depot');
  supplyBox((dep.x+8.15)*T,(dep.y+14.9)*T,'depot_up',{a9:8});
  // A cage for spares in the garage and a dispatcher's booth in the neighbouring ATP building.
  partition(432.45,266,.16,1.55,'mesh');partition(430,268.60,1.05,.16,'mesh');
  partition(432.65,279,.18,.94,'brick');partition(432.65,281.5,.18,1.5,'brick');
}
const furnitureSets={
  home:['supper','stove','bedroll','cupboard','stool','sack'],
  store:['rack','pallet','box','sack','cabinet','pallet'],
  office:['desk','files','cabinet','stool','cupboard','box'],
  shop:['bench','rack','box','cabinet','pallet','stool'],
  ruin:['pallet','sack','box','stool','cabinet'],
  bar:['supper','stool','sack']
};
function houseUse(h){
  if(h.x===WEST+114 && h.y===NORTH_ROWS+203)return 'office';
  if(h.x===WEST+132 && h.y===NORTH_ROWS+201)return 'home';
  if(h.ruin)return 'ruin';
  const region=locAt(h.x+h.w/2,h.y+h.h/2)?.id;
  if(h.ok==='78,118')return 'bar';
  if(h.ok==='89,75')return 'office';
  if(['postal','survey','dump_watch','dump_checkpoint','bunker_lz','sphere'].includes(region))return 'office';
  if(['mill','cowsheds','farm','elevator_lz','dump_market','dump_stop'].includes(region))return 'store';
  if(['atp','pump','relay','fuel_lz','boiler_lz','dump_depot','dump_yard','dump_sorting'].includes(region) || h.mat==='conc')return 'shop';
  return 'home';
}
// Protect the current walkable component around each proposed footprint. This includes doors through
// broken walls. Restrict the flood fill to the room so a second exit outside cannot mask a blocked aisle.
function roomPassageSurvives(h,blocked){
  const reserved=new Set(blocked),adjacent=new Set(),inside=n=>{
    const x=n%MW,y=Math.floor(n/MW);
    return x>=h.x && x<h.x+h.w && y>=h.y && y<h.y+h.h;
  };
  for(const n of blocked)for(const d of [-1,1,MW,-MW]){
    const k=n+d;if(inside(k) && nav[k] && !reserved.has(k))adjacent.add(k);
  }
  if(!adjacent.size)return false;
  const queue=[adjacent.values().next().value],seen=new Set(queue);
  for(let i=0;i<queue.length;i++)for(const d of [-1,1,MW,-MW]){
    const k=queue[i]+d;
    if(inside(k) && nav[k] && !reserved.has(k) && !seen.has(k)){seen.add(k);queue.push(k);}
  }
  return [...adjacent].every(n=>seen.has(n));
}
function furnishHouses(){
  if(!BIG)return;
  for(const h of HOUSES){
    const use=houseUse(h),items=furnitureSets[use],rand=mulberry32(h.x*1361+h.y*313);
    const spots=[];
    for(let j=1;j<h.h-1;j++)for(let i=1;i<h.w-1;i++){
      const x=h.x+i,y=h.y+j;
      if(!isFloor(tAt(x,y)) || !nav[y*MW+x])continue;
      const directions=[[0,-1,0],[1,0,Math.PI/2],[0,1,Math.PI],[-1,0,-Math.PI/2]]
        .filter(([dx,dy])=>[CO,BR].includes(tAt(x+dx,y+dy)));
      if(!directions.length)continue;
      const [dx,dy,a]=directions[Math.floor(rand()*directions.length)];
      spots.push({x:(x+.5)*T+dx*2,y:(y+.5)*T+dy*2,a,rank:rand()});
    }
    spots.sort((a,b)=>a.rank-b.rank);
    const area=(h.w-2)*(h.h-2),limit=Math.min(12,Math.max(1,Math.ceil(area/(h.ruin?10:7))));
    const cx=(h.x+h.w/2)*T,cy=(h.y+h.h/2)*T;
    const local=objs.filter(o=>Math.abs(o.x-cx)<(h.w/2+1)*T && Math.abs(o.y-cy)<(h.h/2+1)*T);
    const initial=local.filter(o=>['bed','table'].includes(o.k)).length;
    let count=0,attempt=0;
    const offset=Math.floor(rand()*items.length);
    for(const p of spots){
      if(count>=Math.max(1,limit-Math.floor(initial*.5)))break;
      const type=items[(offset+attempt++)%items.length];
      const [w,d]=type==='box'?[24,22]:furnitureBounds(type,p.a);
      const left=p.x-w/2,top=p.y-d/2,right=left+w,bottom=top+d;
      const near=(x,y,r)=>Math.hypot(x-clamp(x,left,right),y-clamp(y,top,bottom))<r;
      if(h.entrances.some(e=>near(h.x*T+e.x-e.nx*32,h.y*T+e.y-e.ny*32,24+e.width*.30)))continue;
      if(NPCDEF.some(e=>near(e.x*T,e.y*T,24)) || lofts.some(r=>near(r.stair.x,r.stair.y,52)))continue;
      if(local.some(o=>left<o.x+(o.w||0)+10 && right>o.x-10 && top<o.y+(o.h||0)+10 && bottom>o.y-10))continue;
      const taken=[];
      for(let y=Math.floor(top/T);y<=Math.floor((bottom-.1)/T);y++)for(let x=Math.floor(left/T);x<=Math.floor((right-.1)/T);x++)
        taken.push(y*MW+x);
      if(taken.some(n=>!nav[n] || propCells.has(n)) || !roomPassageSurvives(h,taken))continue;
      const o=type==='box'?supplyBox(p.x,p.y,h.ok+'_'+count,{[use==='shop'?'a9':'bandage']:use==='shop'?6:1}):putFurniture(type,p.x,p.y,p.a,h.ok);
      local.push(o);for(const n of taken)nav[n]=0;count++;
    }
    // Ground-level marks can also fit in single-cell huts and ruins with no free furniture footprint.
    const trim=[];
    for(let i=1;i<h.w-1;i++)for(const j of [0,h.h-1]){
      if(![BR,CO].includes(tAt(h.x+i,h.y+j)))continue;
      trim.push({x:(h.x+i+.5)*T,y:(h.y+j+(j===0?.87:.13))*T,a:j===0?0:Math.PI});
    }
    for(let j=1;j<h.h-1;j++)for(const i of [0,h.w-1]){
      if(![BR,CO].includes(tAt(h.x+i,h.y+j)))continue;
      trim.push({x:(h.x+i+(i===0?.87:.13))*T,y:(h.y+j+.5)*T,a:i===0?-Math.PI/2:Math.PI/2});
    }
    const mountIndex=Math.floor(rand()*trim.length);
    const mounts=[];
    if(trim.length)mounts.push(trim[mountIndex]);
    if(trim.length>12)mounts.push(trim[(mountIndex+Math.floor(trim.length/2))%trim.length]);
    h.interior={use,count,mounts,mark:spots[0] || {x:cx,y:cy,a:0}};
  }
}
function drawRoomMarks(g,h){
  const layout=h.interior;if(!layout)return;
  for(const mount of layout.mounts){
    g.save();g.translate(mount.x,mount.y);g.rotate(mount.a);
    // Scuffs and worn skirting sit flush against the inside face of the wall.
    beam(g,-12,1,10,1,2,'rgba(38,31,24,.31)');
    beam(g,-9,2,4,2,1,'rgba(146,130,102,.29)');
    g.restore();
  }
  const {x,y,a}=layout.mark;
  g.save();g.translate(x,y);g.rotate(a);
  const rand=mulberry32(h.x*181+h.y);
  const stain=g.createRadialGradient(0,0,3,0,0,25);
  stain.addColorStop(0,'rgba(41,32,20,.28)');stain.addColorStop(1,'rgba(40,31,20,0)');
  g.fillStyle=stain;g.fillRect(-25,-25,50,50);
  for(let i=0;i<7;i++){
    const u=rand()*26-13,v=rand()*13;
    if(layout.use==='office' || layout.use==='home'){
      g.fillStyle=i%2?'#837b65':'#a49678';g.fillRect(u,v,3+rand()*3,2+rand()*2);
    }else{beam(g,u,v,u+rand()*9,v+rand()*4,1.6,i%2?'#655641':'#89785c');}
  }
  g.restore();
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
  groan: v => { tn(106,81,.55,.14*v,'triangle'); nz(.36,440,.8,.06*v,'lowpass'); },
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
  vodka: 'i-vodka', bread: 'i-bread', sausage: 'i-sausage', cans: 'i-cans', grenade: 'i-grenade', a9: 'i-ammo', a12: 'i-ammo', a545: 'i-ammo', a762: 'i-ammo',
  ar_jacket: 'i-jacket', ar_bandit: 'i-jacket', ar_zarya: 'i-suit', art_medusa: 'i-art', art_bengal: 'i-art', art_blood: 'i-art', tail: 'i-tail', tentacle: 'i-tail', flash: 'i-flash', damaged_pda: 'i-map', restored_pda: 'i-map', post_case: 'i-pack' };
const ICOL = { art_medusa: '#dc9330', art_bengal: '#7fb0c4', art_blood: '#d64541', medkit: '#9db264', bandage: '#9db264', antirad: '#9db264', flash: '#7fb0c4' };
function itemIcon(id) { if(id==='engraved_pm')id='w_pm'; if (id === 'energy') return icon('i-energy'); if (detectorImages[id]) return detectorImages[id].cloneNode(false); const g = g3Icon(id); if (g) return g; const b = b1Icon(id); if (b) return b; const i = icon(ICON[id] || 'i-pack'); if (ICOL[id]) i.style.color = ICOL[id]; return i; }
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
  panel?.unmountMap?.();
  panel = { kind: kind, tab: tabs ? tabs[0][0] : null, tabs: tabs, sel: null, hint: '' };
  pbody.replaceChildren(); pbody.scrollTop=0;
  ptitle.textContent = title;
  ov.classList.toggle('pause-open', kind==='menu');
  ov.setAttribute('aria-labelledby', kind==='menu'?'pause-heading':'ptitle');
  ov.classList.add('open');
  resetInput();
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
function closePanel() { if (!panel) return; panel.unmountMap?.(); const k = panel.kind; panel = null; ov.classList.remove('open','pause-open'); if (k === 'trader' || k === 'trade') save(true); }
$('pclose').addEventListener('click', closePanel);
ov.addEventListener('click', e => { if (e.target === ov && panel?.kind!=='menu') closePanel(); });
function refresh() {
  if (!panel) return;
  panel.unmountMap?.();panel.unmountMap=null;
  const top = pbody.scrollTop;
  const selectors = panel.kind === 'trade' ? ['.tr-col.mine','.tr-col.their','.clines','.cside:first-child','.cside:last-child'] : [];
  const positions = panel.scrollPositions ||= {};
  for (const sel of selectors) {
    const node = pbody.querySelector(sel);
    if (node && node.clientHeight) positions[sel] = node.scrollTop;
  }
  pbody.textContent = '';
  if (panel.hint) pbody.appendChild(el('p', 'hint', panel.hint));
  ({ dialog: drawDialog2, trade: drawTrade2, inv: drawInv2, loot: drawLoot, locker: drawLocker, pda: drawPda2, menu: drawMenu })[panel.kind === 'trader' ? 'dialog' : panel.kind]();
  for (const sel of selectors) {
    const node = pbody.querySelector(sel);
    if (node && positions[sel]) node.scrollTop = positions[sel];
  }
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
function repairOffer() {
  const worn=gunsBelow(95);
  if(!worn.length) return null;
  const cost=purchaseCost(worn.reduce((sum,w)=>sum+Math.ceil((100-w.cond)*ITEMS[w.id].price/4000)*10,0));
  return {t:'Починить оружие · '+cost+' RU',d:S.money<cost,fn:()=>{
    if(S.money<cost || !gunsBelow(95).length) return;
    S.money-=cost; repairCopies(worn,100); P.jam=0; say('Готово. Можешь забирать.'); sys('Оружие починено.');
  }};
}
function talk(e) {
  if(e.sid==='lz_tech') return dialog(cardOf(e),['Клемма, местный техник. Давай посмотрим, с чем пришёл.'],()=>[
    repairOffer() || {t:'Оружие в порядке',d:true},{t:'До встречи',close:1}
  ],'dialog',e);
  if (e.sid==='lz_barman') return dialog(cardOf(e),['Бар «Под стрехой». С дороги? Горячее кончилось, банка бодрящего найдётся.'],()=>[
    {t:'Покажи припасы',k:'key',fn:()=>openTrade(e)},
    {t:'Что слышно про маки?',fn:()=>say('Начнут слипаться глаза — выпей энергетик или выбирайся на дорогу. Кто лёг среди цветов, уже не встаёт.')},
    {t:'До встречи',close:1}
  ],'dialog',e);
  if(chapter()==='rescue' && !S.flags.assault && (e.sid==='petr' || e.sid==='petr2' && !byS('petr')))return petrBriefing(e);
  if (STORY_KEYS.includes(e.sid) || e.squadMate)return storyTalk(e);
  if (e.fac === 'army') {
    if (hostile(e,P)) return;
    if(e.guard!=='bridge' && e.guard!=='south'){
      const line=e.guard==='sphere'?SPHERE_WARNING:'Военный патруль. Проходи мимо.';
      return dialog(cardOf(e),[line],()=>[{t:'Уйти',close:1}],'dialog',e);
    }
    const south = e.guard === 'south';
    return dialog(cardOf(e), [south ? 'Назад. Здесь граница Зоны, проход закрыт.' : S.flags.bridgePaid ? 'А, это ты. Проходи.' : 'Стоять. Пятьсот за проход в обе стороны. Пересечёшь шлагбаум без оплаты — откроем огонь.'], () => [
      south ? { t: 'А если договоримся?', fn: () => say('Не договоримся. Свободен.') }
        : S.flags.bridgePaid ? { t: 'Я уже платил', fn: () => say('Помню. Проходи, не задерживай.') }
        : { t: 'Пропусти за 500 RU', k: 'key', d: S.money < 500, fn: () => { S.money -= 500; S.flags.bridgePaid = 1; openBarrier(); say('Другой разговор. Проходи, шлагбаум поднят. Туда и обратно, сколько хочешь.'); sys('Мост открыт.'); news('Заплатил военным 500 RU за проход под мостом.'); } },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  if (e.sid === 'petr' || e.sid === 'petr2') {
    return dialog(cardOf(e), [S.flags.atpClear ? 'Ну ты дал! АТП теперь наше. Тут пока и осядем.' : 'Тише. Бандиты на АТП, за бетонным забором. Мы тут вторые сутки лежим, ждём подмогу. Пойдёшь первым, мы следом.'], () => [
      { t: 'Что там внутри?', fn: () => say('Двор, два гаража. Человек семь, главарь с автоматом сидит в большом гараже. Там же и Шустрого держат.') },
      { t: 'Уйти', close: 1 }
    ], 'dialog', e);
  }
  // обычный одиночка
  const lines = [S.rep >= 20 ? 'О, Меченый! Наслышан, наслышан.' : S.rep < 0 ? 'Чего надо? Про тебя тут нехорошее говорят.' : 'Здоров, брат. Чего хотел?'];
  dialog(cardOf(e), lines, () => {
    const o = [{ t: 'Что нового?', fn: () => { e.talked = (e.talked || 0) + 1; say(e.robbed ? 'Нам говорить не о чем.' : (lesserLore[e.sid] && e.talked%2===1 ? lesserLore[e.sid] : LORE[(e.seed + e.talked * 5) % LORE.length])); } }];
    if (!e.robbed) o.push({ t: 'Давай поторгуем', fn: () => openTrade(e) });
    hireOpts(e).forEach(x => o.push(x));
    if (!e.robbed && !e.follow && !DETECTORS[S.weapon]) o.push({ t: 'Ствол на него: «Выворачивай карманы»', k: 'bad', fn: () => robNpc(e) });
    o.push({ t: 'Бывай', close: 1 });
    return o;
  }, 'dialog', e);
}
function robNpc(e) {
  const tier = { knife: 0, w_pm: 1, w_aps: 1, w_obrez: 2, w_toz34: 2, w_aksu: 3, w_akms: 3 };
  const p = clamp(0.45 + (tier[S.weapon] - tier[e.wpn]) * 0.18 + (P.hp > 60 ? 0.1 : -0.1) - (e.rank || 0) * 0.08, 0.1, 0.9);
  const crowd = ents.filter(o => o.alive && o.fac === 'loner' && o !== e && dE(o, e) < 300).length;
  S.rep -= crowd ? 25 : 15;
  if (chance(p) && !crowd) {
    const got = [];
    if (e.money) { S.money += e.money; got.push(e.money + ' RU'); e.money = 0; }
    const pockets={loot:e.inv,guns:e.guns,wcond:e.wcond};
    for(const id of Object.keys(e.inv)) {
      const n=collectStock(pockets,id);
      if(n) got.push(ITEMS[id].n+' ×'+n);
    }
    e.traded=1;
    e.robbed = 1;
    say('Ладно, ладно! Подавись. Зона всё видит, Меченый.');
    sys(got.length ? 'Отобрано: ' + got.join(', ') + '. Одиночки об этом узнают.' : 'У него ничего не было. Одиночки об этом узнают.');
  } else {
    say(crowd ? 'Мужики, гляньте! Этот на своих ствол наставил!' : 'Ах ты гнида! Ну давай!');
    anger(e); closePanel();
  }
}
function talkTrader() {
  let greeting=chapter()==='wake'?'Очнулся? Садись ближе.':'Слушаю тебя, Меченый.';
  if(chapter()==='case' && S.campaign.failedShift===shiftNumber())
    greeting='Слышал, на посту подняли тревогу. До следующей ночи туда ходу нет. Передохни у костра в деревне. А захочешь занять руки — у меня есть работа.';
  dialog(SIDCARD(),[greeting],traderOpts,'trader');
}
function traderOpts(){
  const o=storyTraderOptions().concat([{t:'Торговать',fn:()=>openTrade(null)}]);
  if (S.rep <= -30) o.push({ t: 'Уладить с одиночками · 2000 RU', k: 'key', d: S.money < 2000, fn: () => {
    S.money -= 2000; S.rep = 0; S.flags.angry = {}; ents.forEach(e => { if (e.fac === 'loner') e.angry = 0; });
    say('Ладно, замолвлю слово. Второй раз не возьмусь.');
  } });
  o.push(...jobOpts());
  const repair=repairOffer(); if(repair) o.push(repair);
  o.push({ t: 'Закончить разговор', close: 1 });
  return o;
}

/* ---------- торговля ---------- */
function openTrade(e) {
  openPanel('trade', e ? 'Торг: ' + e.name : 'Торг: Сидорович');
  panel.e = e; refresh(); pbody.scrollTop = 0;
}
function sellPrice(id,toNpc=false) {
  const it=ITEMS[id];
  if (it.sell!==undefined) return earnings(Math.floor(it.sell*(toNpc ? .8 : 1)));
  return Math.max(1,earnings(Math.floor((it.price || 0)*(toNpc ? .5 : .35))));
}
function openLoot(o) {
  if (!cacheFieldQuiet(o)) {
    msg('Крышку тянет вверх. Дождись, когда пыль осядет.', 'say');
    return;
  }
  if (o.loot.__tip) { delete o.loot.__tip; revealCache(o.name); }
  if (o.k === 'crate') return;
  openPanel('loot', o.anomalyId ? 'Схрон путейца' : o.k === 'cache' || o.k === 'hiding' ? 'Тайник' : o.k === 'safe' ? 'Сейф' : 'Обыск: ' + o.name); panel.o = o; refresh(); pbody.scrollTop = 0;
}
function drawLoot() {
  const o = panel.o, keys = Object.keys(o.loot).filter(k => k !== '__tip');
  if (!keys.length) { pbody.appendChild(el('p', 'note', 'Пусто.')); return; }
  keys.forEach(k => {
    const r = el('div', 'row'), t = el('div', 'tile'); t.appendChild(k === 'money' ? icon('i-pack') : itemIcon(k)); r.appendChild(t);
    r.appendChild(el('div', 'grow nm', k === 'money' ? o.loot[k] + ' RU' : ITEMS[k].n + (o.loot[k] > 1 ? ' ×' + o.loot[k] : '')));
    const error=k==='money'?'':receiveError(k,1,lootGun(o,k));
    if (error) r.appendChild(el('span','note',error));
    r.appendChild(btn('', 'Взять', () => {
      const got=collectStock(o,k);
      if (got) play('pick');
      panel.hint=o.loot[k]?'Остаток в контейнере: '+o.loot[k]+' шт.':'';
      recordContents(o); refresh();
    }, !!error));
    pbody.appendChild(r);
  });
  pbody.appendChild(btn('go', 'Взять всё', () => { lootAll(o); if(Object.keys(o.loot).length) refresh(); else closePanel(); }));
}

/* ---------- ПДА ---------- */
const PDA_TABS = [['map', 'Карта'], ['tasks', 'Задания'], ['log', 'Журнал'], ['stat', 'Данные']];
function drawPda() {
  if (panel.tab === 'map') {
    const bar = el('div', 'mapbar'); bar.appendChild(el('span', 'note', panel.zoom ? 'Листай карту пальцем.' : 'Кордон, Малая Зона и Свалка.'));
    bar.appendChild(btn('chip', panel.zoom ? 'Отдалить' : 'Приблизить', () => { panel.zoom = !panel.zoom; refresh(); }));
    pbody.appendChild(bar);
    const w = el('div', 'mapwrap' + (panel.zoom ? ' zoom' : '')), c = el('canvas'); c.id = 'bigmap'; c.width = PW * 6; c.height = MH * 6;
    w.appendChild(c); pbody.appendChild(w);
    drawMapTo(c.getContext('2d'), 6, true);
    if (panel.zoom) requestAnimationFrame(() => { const pp = worldMapPoint(P); w.scrollLeft = pp.x / (PW * T) * w.scrollWidth - w.clientWidth / 2; w.scrollTop = pp.y / (MH * T) * w.scrollHeight - w.clientHeight / 2; });
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
    for(const q of qList().filter(q=>q.st==='a')){
      const row=el('div','row'),entry=el('div','grow');
      entry.append(el('div','nm',q.n),el('div','ds',q.d));
      row.appendChild(entry);pbody.appendChild(row);
    }
    if (!pbody.childElementCount && !S.news.length) pbody.appendChild(el('p', 'note', 'Записей пока нет.'));
    S.news.slice().reverse().forEach(n => { const r = el('div', 'row'), g = el('div', 'grow'); g.appendChild(el('div', 'tm', clockStr(n.t))); g.appendChild(el('div', 'ds lite', n.x)); r.appendChild(g); pbody.appendChild(r); });
  } else {
    pbody.appendChild(person(meCard()));
    pbody.appendChild(el('h3','','Полевые заметки'));
    pbody.appendChild(el('p','note','Электра гаснет ненадолго от болта. Первые искры предупреждают о возврате заряда.' + (MAP_ID==='rc1'?' Так можно пройти Восточную канаву справа от военного моста.':'')));
    pbody.appendChild(el('p','note','Воронку выдаёт пыль: кружащийся мусор тянет к центру, осевший оставляет время пройти. Болт показывает границу.' + (BIG?' У разбитой колонны путеец спрятал вещи прямо под воронкой.':'')));
    const st = el('div', 'stat');
    [['Убито людей', S.stats.kS], ['Убито мутантов', S.stats.kM], ['Выполнено заданий', S.stats.q], ['Найдено артефактов', S.stats.art], ['Очки рейтинга', score()], ['Отношение одиночек', S.rep]].forEach(x => { st.appendChild(el('span', '', x[0])); st.appendChild(el('b', '', String(x[1]))); });
    pbody.appendChild(st);
  }
}
/* ---------- меню ---------- */
function leavePauseSettings() {
  delete panel.pausePage;
  drawMenu();
  document.querySelector('#pause-card .pause-settings').focus();
}
function drawMenu() {
  const card=$('pause-card'), nav=el('nav','start-nav');
  // The title mark is shared with the start screen, which retains its own node.
  const heading=el('h2','pause-caption','Пауза');
  heading.textContent='Пауза · '+rules().name;
  heading.id='pause-heading';
  nav.setAttribute('aria-labelledby',heading.id);
  card.replaceChildren(title.name.cloneNode(true),heading,nav);
  if (panel.pausePage==='settings') {
    heading.textContent='Настройки';
    nav.appendChild(btn('','Настроить управление',openControlEditor));
    nav.appendChild(btn('','Стрельба',()=>showFireSettings(nav,drawMenu)));
    const soundLabel=()=>AC && master && master.gain.value===0?'Включить звук':'Выключить звук';
    const sound=btn('',soundLabel(),()=>{
      audioInit(); if (master) master.gain.value=master.gain.value?0:0.55;
      sound.textContent=soundLabel();
    });
    nav.appendChild(sound);
    nav.appendChild(btn('','Назад',leavePauseSettings));
    return;
  }
  if (panel.pausePage==='help') {
    heading.textContent='Управление и сохранения';
    nav.appendChild(el('p','pause-note',IN.touch
      ? 'Левый джойстик — ходьба. Слегка отклони правый стик для прицеливания. Для огня доведи стик до края или коснись врага в режиме стрельбы касанием. Для бега удерживай кнопку бега, для смены оружия коснись его панели.'
      : 'WASD — движение, Shift — бег, C — присесть, V — прыжок. Мышь — прицел и огонь, R — перезарядка, E — взаимодействие.'));
    if (!IN.touch) nav.appendChild(el('p','pause-note','F — болт, G — граната, Q — аптечка, I — рюкзак, M — КПК, Esc — пауза.'));
    nav.appendChild(el('p','pause-note','Игра сохраняется автоматически у костра и у Сидоровича. Вручную можно сохраниться, когда рядом нет врагов.'));
    nav.appendChild(btn('start-primary','Назад',()=>{delete panel.pausePage;drawMenu();card.querySelector('.pause-help').focus();}));
    return;
  }
  if (panel.pausePage==='restart') {
    heading.textContent='Начать заново?';
    nav.appendChild(el('p','pause-note','Текущая игра начнётся с начала Кордона.'));
    nav.appendChild(btn('start-primary','Отмена',()=>{delete panel.pausePage;drawMenu();card.querySelector('.restart').focus();}));
    newGameControls(nav,'Начать новую игру','',S.difficulty);
    return;
  }
  const message=el('p','pause-note');
  message.setAttribute('role','status');
  nav.appendChild(btn('start-primary','Продолжить игру',closePanel));
  nav.appendChild(btn('','Сохранить игру',()=>slotPicker(nav,true,drawMenu)));
  nav.appendChild(btn('','Загрузить сохранение',()=>slotPicker(nav,false,drawMenu)));
  nav.appendChild(btn('pause-settings','Настройки',()=>{
    panel.pausePage='settings'; drawMenu();
    card.querySelector('button').focus();
  }));
  nav.appendChild(btn('restart','Начать заново',()=>{panel.pausePage='restart';drawMenu();card.querySelector('button').focus();}));
  card.appendChild(message);
  card.appendChild(btn('pause-help','Подсказки',()=>{panel.pausePage='help';drawMenu();card.querySelector('button').focus();}));
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
  if(BIG && ART){g.save();g.scale(1/T,1/T);drawWorldTracks(g);g.restore();}
  HOUSES.forEach((h, i) => {
    if (h.x >= PW) return;
    g.fillStyle = '#36372e'; g.fillRect(h.x - 0.2, h.y - 0.2, h.w + 0.5, h.h + 0.6);
    g.fillStyle = '#887d6a'; g.fillRect(h.x, h.y, h.w, h.h);
    if (ROOFS[i]) drawHouseRoof(g, h, i, 1/T);
  });
  if (BIG) {
    g.save(); g.scale(1/T,1/T); drawLesserInstallations(g); drawDumpDetails(g); g.restore();
    g.fillStyle='rgba(134,61,44,.65)';
    for(let y=-22;y<35;y+=.5) for(let x=18;x<71;x+=.5)
      if (poppyBed(x,y)<.9 && tAt(Math.floor(x),LESSER_TOP+Math.floor(y))===GR)
        g.fillRect(x, LESSER_TOP+y,.32,.32);
  }
  objs.forEach(o => {
    if (o.k==='freightWagon' && lesserSprites[o.sprite])
      g.drawImage(lesserSprites[o.sprite],o.x/T,o.y/T,o.w/T,o.h/T);
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
        miniC.width=photo.width; miniC.height=photo.height;
        miniC.getContext('2d').drawImage(photo,0,0);
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
  const [left,top,right,bottom] = fogRegion || [0,0,PW,MH];
  fogRegion = null;
  const x0=Math.max(0,left), y0=Math.max(0,top), w=Math.min(right,PW)-x0, h=Math.min(bottom,MH)-y0;
  if (w<=0 || h<=0) return;
  const g=fogC.getContext('2d'), id=g.createImageData(w,h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const i=4*(y*w+x); id.data[i]=10; id.data[i+1]=12; id.data[i+2]=9;
    id.data[i+3]=fog[(y0+y)*MW+x0+x] ? 0 : 60;
  }
  g.putImageData(id,x0,y0);
}
const MAP_INK = {
  body:'#a9a7a0', shelter: '#ffe1a1', player: '#68d1da', target: '#6ad2dc', sos: '#f07560', hatch: '#9bbdc8',
  cache: '#e7bd79', neutral: '#efd168', enemy: '#f16e59', friend: '#95d677'
};
function mapSymbol(g, kind, x, y, u, angle = 0, ringOnly = false) {
  const color = kind==='locker' ? '#8ccac4' : MAP_INK[kind];
  g.save(); g.translate(x, y); g.scale(u, u);
  g.lineJoin = 'round'; g.fillStyle = color; g.strokeStyle = '#252823'; g.lineWidth = 1.3;
  g.beginPath();
  if (kind === 'player') {
    g.rotate(angle); g.moveTo(7, 0); g.lineTo(-4.7, -4.9); g.lineTo(-2.7, 0); g.lineTo(-4.7, 4.9); g.closePath();
  } else if (kind === 'shelter') {
    g.moveTo(0,-6); g.lineTo(6,0); g.lineTo(4.5,0); g.lineTo(4.5,5);
    g.lineTo(1.4,5); g.lineTo(1.4,1); g.lineTo(-1.4,1); g.lineTo(-1.4,5);
    g.lineTo(-4.5,5); g.lineTo(-4.5,0); g.lineTo(-6,0); g.closePath();
  } else if (kind === 'locker') {
    g.rect(-5,-3.8,10,7.6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-4,-1); g.lineTo(4,-1); g.stroke();
    g.fillStyle='#242a28'; g.fillRect(-1,-1,2,3); g.restore(); return;
  } else if(kind==='body'){
    g.arc(0,0,2.25,0,2*Math.PI);
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
  for (const [kind, name] of [['player','Вы'], ['neutral','Нейтрал'], ['enemy','Враг'], ['friend','Друг'], ['body','Погибшие'],
      ['target','Цель'], ['sos','SOS'], ['locker','Личный ящик'], ['cache','Тайник'], ['hatch','Бункер'], ...(S.blow?.stage ? [['shelter','Укрытие']] : [])]) {
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
function drawDetectorContacts(g, s, u) {
  const range = activeDetectorRange();
  if (!range) return;
  g.save();
  for (const a of arts) {
    if (dE(P, a) > range) continue;
    const x = a.x / T * s, y = a.y / T * s, r = 3.8 * u;
    g.beginPath(); g.moveTo(x, y-r); g.lineTo(x+r, y); g.lineTo(x, y+r); g.lineTo(x-r, y); g.closePath();
    g.lineWidth = 3*u; g.strokeStyle = '#22251d'; g.stroke();
    g.lineWidth = 1.3*u; g.strokeStyle = '#ffe298'; g.stroke();
  }
  g.restore();
}
function drawBodyContacts(g,s,u,nearOnly=false){

  for(const body of objs){
    if(body.k!=='body' || body.kind==='sack' || (nearOnly && dE(P,body)>24*T))continue;
    const point=worldMapPoint(body), x=point.x/T,y=point.y/T;
    if(!fog[Math.floor(y)*MW+Math.floor(x)])continue;
    mapSymbol(g,'body',x*s,y*s,u);
  }
}
function drawMapTo(g, s, full, o) {
  o = o || { ppl: 1, cache: 1 };
  const u = o.u || 1;
  updateFog();
  g.imageSmoothingEnabled = !!ART;
  g.drawImage(miniC, 0, 0, PW * s, MH * s);
  g.drawImage(fogC, 0, 0, PW * s, MH * s);
  drawDetectorContacts(g, s, u);
  const busy = [];   // занятые прямоугольники: маркеры и подписи
  const mark = (x, y, r) => busy.push([x - r, y - r, x + r, y + r]);
  const hx = HATCH.x / T * s, hy = HATCH.y / T * s;
  mapSymbol(g, 'hatch', hx, hy, u); mark(hx, hy, 5 * u);
  for (const c of objs) if(c.k==='locker') {
    const x=(c.x+c.w/2)/T*s, y=(c.y+c.h/2)/T*s;
    mapSymbol(g,'locker',x,y,u); mark(x,y,6*u);
  }
  if(o.ppl)drawBodyContacts(g,s,u);
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
    const point = worldMapPoint(q);
    const x = point.x / T * s, y = point.y / T * s;
    const selected = selQ.some(t => t.qid === q.qid && t.x === q.x && t.y === q.y);
    g.globalAlpha = selected || q.qid === 'sos' || (tracked && q.qid === tracked.qid) ? 1 : 0.68;
    const onContact = o.ppl && ents.some(e => e.x === q.x && e.y === q.y && visibleContact(e));
    mapSymbol(g, q.qid === 'sos' ? 'sos' : 'target', x, y, (selected ? 1.45 : 1) * u, 0, onContact);
    g.globalAlpha = 1; mark(x, y, (selected ? 9 : 6) * u);
    if (selected) labs.push({ t: q.n, x, y, gap: 11 * u, pri: 0, font: '700 ' + Math.round(13 * u) + 'px Arial', c: '#c2f4f3' });
  });
  const shelter = blowShelterTarget();
  if (shelter) {
    const x = shelter.x / T * s, y = shelter.y / T * s;
    mapSymbol(g, 'shelter', x, y, 1.25*u); mark(x, y, 7*u);
    labs.push({t:'Укрытие', x, y, gap:9*u, pri:-1, font:'700 '+Math.round(13*u)+'px Arial', c:MAP_INK.shelter});
  }
  const pp = worldMapPoint(P);
  const px = pp.x / T * s, py = pp.y / T * s;
  mark(px, py, 8 * u);
  if (full) LOCATIONS.forEach(l => {
    if (l.id === 'sid') return;
    const cx = (l.bounds[0] + l.bounds[2]) / 2, cy = (l.bounds[1] + l.bounds[3]) / 2;
    const villageHub = l.id === 'zalissya';
    if (!villageHub && !fog[Math.min(MH - 1, Math.max(0, Math.round(cy))) * MW + Math.min(MW - 1, Math.round(cx))]) return;
    labs.push({ t: l.name, x: cx * s, y: cy * s, gap: villageHub ? 12*u : 0, pri: villageHub ? .5 : 1, font: '600 ' + Math.round(11.5 * u) + 'px Arial', c: 'rgba(232,222,186,0.95)' });
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
function miniNavigation() {
  const target=trackedTarget();
  const underground=inBunker(P.x,P.y);
  const floor=loftAt(P);
  const point=target && (floor && loftAt(target)!==floor?floor.landing:underground && !inBunker(target.x,target.y)?STAIRS:
    !underground && inBunker(target.x,target.y)?HATCH:target);
  const people=ents.filter(e=>e!==P && e.alive && e.kind==='human' &&
    loftAt(e)===floor && inBunker(e.x,e.y)===underground && dE(e,P)<=520).length;
  $('mini-people').textContent=people;
  $('mini-distance').textContent=point?Math.round(dE(P,point)/T*1.5)+' м':'';
  return point;
}
function miniArrow(point,size,s) {
  if(!point) return;
  const dx=(point.x-P.x)*s/T,dy=(point.y-P.y)*s/T;
  if(Math.hypot(dx,dy)<4) return;
  const edge=(size/2-16)/Math.max(1,Math.abs(dx),Math.abs(dy));
  const k=Math.min(1,edge);
  mctx.save();mctx.translate(size/2+dx*k,size/2+dy*k);mctx.rotate(Math.atan2(dy,dx));
  mctx.beginPath();mctx.moveTo(10,0);mctx.lineTo(-7,-7);mctx.lineTo(-3,0);mctx.lineTo(-7,7);mctx.closePath();
  mctx.fillStyle='#eed7a0';mctx.fill();mctx.lineWidth=2;mctx.strokeStyle='#30291a';mctx.stroke();mctx.restore();
}
function drawMini() {
  const destination=miniNavigation();
  const W = mini.clientWidth || 128;
  if (mini.width !== W * 2) { mini.width = W * 2; mini.height = W * 2; }
  const size = mini.width, s = size / 32;
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#0d120c'; mctx.fillRect(0, 0, size, size);
  if(loftAt(P)){drawLoftMap(mctx,loftAt(P),size);return;}
  if (inBunker(P.x, P.y)) { mctx.fillStyle = '#7fb0c4'; mctx.font = '600 22px "Russo One", sans-serif'; mctx.textAlign = 'center'; mctx.fillText('БУНКЕР', size / 2, size / 2 - 6); mctx.font = '500 16px "IBM Plex Mono", monospace'; mctx.fillStyle = '#8f8c74'; mctx.fillText('под землёй', size / 2, size / 2 + 20); mctx.textAlign = 'start'; miniArrow(destination,size,s); return; }
  mctx.setTransform(1, 0, 0, 1, size / 2 - P.x / T * s, size / 2 - P.y / T * s);
  mctx.imageSmoothingEnabled = !!ART;
  mctx.drawImage(miniC, 0, 0, PW * s, MH * s); mctx.drawImage(fogC, 0, 0, PW * s, MH * s);
  if (darkness() > 0.3) {
    mctx.fillStyle = 'rgba(4,7,12,0.35)';
    mctx.fillRect(P.x / T * s - size / 2, P.y / T * s - size / 2, size, size);
  }
  drawDetectorContacts(mctx, s, 1.65);
  drawBodyContacts(mctx,s,1.65,true);
  mapSymbol(mctx, 'hatch', HATCH.x / T * s, HATCH.y / T * s, 1.65);
  objs.forEach(o => {
    if(o.k==='locker') mapSymbol(mctx,'locker',(o.x+o.w/2)/T*s,(o.y+o.h/2)/T*s,1.65);
    if (o.k === 'cache' && S.caches[o.cacheId] === 1) mapSymbol(mctx, 'cache', o.x / T * s, o.y / T * s, 1.65);
  });
  ents.forEach(e => {
    if (visibleContact(e)) mapSymbol(mctx, playerRelation(e), e.x / T * s, e.y / T * s, 1.65);
  });
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const tq = trackedTarget();
  qTargets().forEach(q => {
    if(tq && q.qid===tq.qid && q.x===tq.x && q.y===tq.y) return;
    if (q !== tq && !(tq && q.qid === tq.qid && q.x === tq.x && q.y === tq.y) && q.qid !== 'sos') mctx.globalAlpha = 0.45; else mctx.globalAlpha = 1;
    let x = size / 2 + (q.x - P.x) / T * s, y = size / 2 + (q.y - P.y) / T * s;
    const edge = x < 10 || y < 10 || x > size - 10 || y > size - 10;
    if (edge) { const a = Math.atan2(y - size / 2, x - size / 2); x = size / 2 + Math.cos(a) * (size / 2 - 12); y = size / 2 + Math.sin(a) * (size / 2 - 12); }
    const onContact = !edge && ents.some(e => e.x === q.x && e.y === q.y && visibleContact(e));
    mapSymbol(mctx, q.qid === 'sos' ? 'sos' : 'target', x, y, 1.8, 0, onContact);
  });
  mctx.globalAlpha = 1;
  const shelter = blowShelterTarget();
  if (shelter) {
    const dx = (shelter.x - P.x) / T * s, dy = (shelter.y - P.y) / T * s;
    const scale = Math.min(1, (size / 2 - 15) / Math.max(1, Math.abs(dx), Math.abs(dy)));
    mapSymbol(mctx, 'shelter', size/2 + dx*scale, size/2 + dy*scale, 2);
  }
  miniArrow(destination,size,s);
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
const H = { hp: $('hpb'), hpv: $('hpv'), fd: $('fdb'), fdv: $('fdv'), radv: $('radv'), sBleed: $('s-bleed'), sBleedN: $('s-bleedn'), sRad: $('s-rad'), wcn: $('wcn'), wcb: $('wcb'), det: $('det'), st: $('stb'), stv: $('stv'), belt: $('belt'), clock: $('clock'), money: $('money'),
  status: $('status'), quest: $('quest'), msgs: $('msgs'), feedback: $('field-feedback'), prompt: $('prompt'), wico: $('wico'), wn: $('wn'), am: $('am') };
let hudT = 0, lastW = '', lastNotice;
let taskState=null, previousTasks=new Set(), previousGoal='', taskUntil=0;
function briefTask() {
  const active=qList().filter(q=>q.st==='a'), target=trackedTarget();
  const ids=new Set(active.map(q=>q.id)), goal=target?target.qid+'|'+target.n:'';
  if(taskState!==S) {taskState=S;previousTasks=new Set();previousGoal='';taskUntil=0;H.quest.replaceChildren();}
  const accepted=active.find(q=>!previousTasks.has(q.id));
  if(accepted || (goal && goal!==previousGoal)){
    H.quest.textContent=(accepted && accepted.id!==target?.qid)?accepted.n:target?.n||accepted.n;
    taskUntil=S.min+5;
  }
  previousTasks=ids;previousGoal=goal;
  if(S.min>=taskUntil && H.quest.textContent) H.quest.replaceChildren();
}
let quickHudT = 0;
function hud(dt) {
  if (!P) return;
  hudT -= dt;
  quickHudT -= dt;
  if (touchRenderer && quickHudT > 0 && hudT > 0) return;
  quickHudT = 1/12;
  H.hp.style.width = clamp(P.hp, 0, 100) + '%'; H.hp.parentNode.classList.toggle('low', P.hp < 30); H.hpv.textContent = Math.max(0, Math.round(P.hp));
  H.fd.style.width = clamp(S.food, 0, 100) + '%'; H.fdv.textContent = Math.round(S.food); H.fd.parentNode.classList.toggle('low', S.food < 20);
  H.sRad.classList.toggle('on', S.rad > 1); H.sRad.classList.toggle('hi', S.rad > 40); H.radv.textContent = S.rad > 1 ? Math.round(S.rad) : '';
  H.sBleed.classList.toggle('on', !!S.bleed); H.sBleedN.textContent = S.bleed > 1 ? S.bleed : '';
  H.st.style.width = P.st + '%'; H.stv.textContent = weight() > carryLimit() ? '!' : Math.round(P.st);
  const fol = ents.find(x => x.alive && x.follow);
  const shelter = blowShelterTarget();
  const shelterStatus = S.blow?.stage ? (sheltered(P.x,P.y) ? (S.blow.stage===1?'Предупреждение · оставайся в укрытии':'Идёт выброс · оставайся в укрытии') : shelter ? 'Укрытие · '+Math.ceil(dE(P,shelter)/T*1.5)+' м' : 'Найдите укрытие') : S.min<(S.flags.blowClearUntil||0)?'Отбой · можно выходить':'';
  const stt = [shelterStatus, S.flags.poppySleep>8 ? (S.flags.poppySleep>26?"Засыпаешь":"Слипаются глаза") : "", energyActive() ? 'энергетик · ' + Math.ceil(S.flags.energyUntil-S.min) + ' с' : '', fol ? 'напарник ' + fol.name.split(' ')[0] + (fol.wait ? ' ждёт' : '') + ' до ' + clockStr(fol.hireEnd).replace(/ · день \d+/, '') : '', S.food < 20 ? 'голод' : '', P.jam ? 'заклинило' : '', weight() > carryLimit() ? 'перегруз' : '', anomalyHint()].filter(Boolean).join(' · ');
  { const m = cnt('medkit'), b = cnt('bandage'); $('mb-m').textContent = m || ''; $('mb-b').textContent = b || ''; $('mp-mn').textContent = m; $('mp-bn').textContent = b; $('b-med').classList.toggle('empty', !m && !b); }
  $('b-crouch').classList.toggle('on', !!P.crouch); H.det.setAttribute('aria-pressed', String(S.torch !== false)); $('b-jump').classList.toggle('on', P.jumpT > 0);
  if (H.status.textContent !== stt) H.status.textContent = stt;
  drawMini();
  if (hudT > 0) return;
  hudT = 0.15;
  H.clock.textContent = clockStr(); H.money.textContent = S.money + ' RU';
  const bs = S.belt.join(',');
  if (H.belt.dataset.v !== bs) { H.belt.dataset.v = bs; H.belt.textContent = ''; S.belt.forEach(a => { const sp = el('span'); sp.appendChild(itemIcon(a)); H.belt.appendChild(sp); }); }
  const empty=S.weapon==='hands', detector = DETECTORS[S.weapon], W = detector || WP[S.weapon] || {n:'Руки свободны',melee:true};
  if (lastW !== S.weapon) { lastW = S.weapon; H.wico.textContent = ''; const bi = detector ? itemIcon(S.weapon) : (window.CORDON_G8_ON && g3Icon(S.weapon)) || b1Icon(S.weapon); if (bi) H.wico.appendChild(bi); else if (WSIL[S.weapon]) H.wico.innerHTML = WSIL[S.weapon]; else if (!empty) H.wico.appendChild(icon(ICON[S.weapon])); H.wn.textContent = detector ? W.n.replace('Детектор ', '') : W.n; }
  $('wpnbox').classList.toggle('rel', P.reload > 0);
  H.am.textContent = '';
  const cd = W.melee ? 100 : Math.round(S.cond[S.weapon] == null ? 100 : S.cond[S.weapon]);
  $('wpnbox').classList.toggle('mel', !!W.melee || !!detector);   // нож и граната: без полосы состояния, одна подпись
  H.wcn.textContent = W.melee || detector ? '' : 'Состояние: ' + cd + '%'; H.wcb.style.width = cd + '%'; H.wcb.parentNode.className = 'cb' + (cd < 35 ? ' bad' : cd < 65 ? ' mid' : '');
  if (detector) H.am.textContent = Number.isFinite(P.detD) ? Math.round(P.detD / T * 1.5) + ' м' : 'Поиск';
  else if (W.toss) H.am.textContent = '× ' + cnt('grenade');
  else if (W.melee) H.am.textContent = empty?'':'∞';
  else { H.am.appendChild(document.createTextNode(String(S.mag[S.weapon] || 0))); H.am.appendChild(el('small', '', ' / ' + cnt(W.ammo))); if (P.reload > 0) H.am.appendChild(el('div', 'rl', 'перезарядка')); else if (W.pellets) H.am.appendChild(el('div','chambers',(S.mag[S.weapon]||0)===2?'● ●':S.mag[S.weapon]?'● ○':'○ ○')); }
  briefTask();
  const sleep=S.flags.poppySleep||0;
  const veil=$('poppy-veil'), fatigue=clamp(sleep/42,0,1);
  const blink=reducedCameraMotion.matches ? .24 : (.5+.5*Math.cos(sleep*(2.3-.014*sleep)))**(3.4-2*fatigue);
  veil.style.opacity=sleep>0?String(.36+.64*fatigue):'0';
  veil.style.setProperty('--lid',String((.07+.40*fatigue+blink*(.38+.15*fatigue))*100)+'%');
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
  if(n.k==='floor' && fadeT<=0){
    const p=n.upstairs?n.room.stair:n.room.landing;
    fadeT=.5;fadeTo={x:p.x,y:p.y,a:P.ang};
  } else if (n.k === 'talk') talk(n.e);
  else if (n.k === 'trader') { save(true); talkTrader(); }
  else if (n.k === 'down') goThrough(true);
  else if (n.k === 'up') goThrough(false);
  else if (n.k === 'heal') {
    const e = n.e;
    if(STORY_KEYS.includes(e.sid))return helpStory(e);
    if (healWounded(e)) dialog(cardOf(e), [e.sid === 'tolik' ? 'Живой… Спасибо, братишка. Держи деньги и антирад. Я твой должник.' : 'Спасибо, брат. Выручил.'], () => [{ t: 'Береги себя', close: 1 }], 'dialog', e);
  }
  else if (n.k === 'kill') takedown(n.e);
  else if (n.k === 'groundItem') pickGroundItem(n);
  else if (n.k === 'locker') { openPanel('locker','Личный ящик · '+n.o.baseName); refresh(); }
  else if (n.k === 'carve') carveMutant(n.o);
  else if (n.k === 'loot') openLoot(n.o);
  else if (n.k === 'rest') restAtFire();
  else if (n.k === 'pick') pickUp(n.o);
  else if (n.k === 'genset') gensetUse();
  else if (n.k === 'story') cordonUse(n.stage);
  else if (n.k === 'exit') exitUse();
  else if (n.k === 'art') takeArt(n.a);
  else if (n.k === 'free') {
    if(n.e.sid!=='shust' || chapter()!=='rescue'){msg('Пока рано.','say');return;}
    if(ATP_BANDITS.some(id=>byS(id))){msg('Сначала обезопась АТП.','say');return;}
    occupyATP();S.inv.flash=1;S.q.flash=3;nextChapter('flash');
    playConversation(n.e,'free','Убрать флешку');
  }
}
const KEYS = {};
addEventListener('keydown', e => {
  if (controlEditor.open) return;
  audioInit();
  const k = e.code;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].indexOf(k) >= 0 && !panel) e.preventDefault();
  if (title.open) return;
  if (k === 'Escape') { if (panel?.pausePage==='settings') leavePauseSettings(); else if (panel) closePanel(); else { openPanel('menu', 'Меню'); refresh(); } return; }
  if (panel) { if ((k === 'KeyI' && panel.kind === 'inv') || (k === 'KeyM' && panel.kind === 'pda') || k === 'Tab') { e.preventDefault(); closePanel(); } return; }
  KEYS[k] = true;
  if (!P.alive) return;
  if (k === 'KeyE' || k === 'Space') interact();
  if (k === 'Digit0') setWeapon('hands');
  if (k === 'KeyR') startReload();
  if (k === 'KeyF') throwBolt();
  if (k === 'KeyG' && S.weapon!=='hands') throwNade();
  if (k === 'KeyQ') healWith('medkit');
  if (k === 'KeyB') healWith('bandage');
  if (k === 'KeyH') quickHeal();
  if (k === 'KeyV') startJump();
  if (k === 'KeyL') toggleTorch();
  if (/^Digit[1-8]$/.test(k)) {
    const keyWeapon=WORDER[Number(k.slice(-1))-1];
    const equipped=kitItem(kitSlot(keyWeapon));
    if (keyWeapon==='knife') setWeapon('knife');
    else if (equipped===keyWeapon || (keyWeapon==='w_pm' && equipped) ||
             (keyWeapon==='w_obrez' && WP[equipped]?.pellets) ||
             (keyWeapon==='w_aksu' && WP[equipped]?.auto)) setWeapon(equipped);
  }
  if (k === 'KeyC' || k === 'ControlLeft') { P.crouch = !P.crouch; }
  if (k === 'KeyI' || k === 'Tab') { e.preventDefault(); openPanel('inv', 'Рюкзак'); refresh(); }
  if (k === 'KeyM' || k === 'KeyP') { openPanel('pda', 'КПК', PDA_TABS2); refresh(); }
});
addEventListener('keyup', e => { KEYS[e.code] = false; });
/* сворачивание окна/потеря фокуса: никакой ввод не остаётся «зажатым» */
function resetInput() {
  IN.sprint = false; IN.runPointer = null; $('b-run').classList.remove('on');
  for (const k in KEYS) KEYS[k] = false;
  IN.fire = false; releaseFireStick(); IN.left = null; IN.moveX = IN.moveY = 0;
  if (typeof joyReset === 'function') joyReset();
}
addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
function keyMove() {
  IN.sprint = !!(KEYS.ShiftLeft || KEYS.ShiftRight);
  if (IN.touch) return;
  IN.moveX = (KEYS.KeyD || KEYS.ArrowRight ? 1 : 0) - (KEYS.KeyA || KEYS.ArrowLeft ? 1 : 0);
  IN.moveY = (KEYS.KeyS || KEYS.ArrowDown ? 1 : 0) - (KEYS.KeyW || KEYS.ArrowUp ? 1 : 0);
}
function setTouch(on) { if (IN.touch === on) return; if (!on) releaseFireStick(); IN.touch = on; document.body.classList.toggle('is-touch', on); }
const JOY = $('joy'), JOYK = $('joyk');
function joyAt(x, y, s) {
  const r = JOY.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (Math.hypot(x - cx, y - cy) < r.width * 0.55) { s.ox = cx; s.oy = cy; }
  else { JOY.style.left = (x - r.width / 2) + 'px'; JOY.style.top = (y - r.height / 2) + 'px'; JOY.style.bottom = 'auto'; }
  JOY.classList.add('on');
}
function joyReset() { JOY.style.left = JOY.style.top = JOY.style.bottom = ''; JOYK.style.transform = ''; JOY.classList.remove('on'); }
function enemyUnderFinger(x,y) {
  const W=WP[S.weapon];
  if (!W || W.melee) return null;
  const w=screenToWorld(x,y);
  let nearest=null, best=Infinity;
  for (const e of ents) {
    if (!e.alive || e===P) continue;
    const d=dE(w,e);
    if (d<=e.r+6/Z && d<best) {best=d;nearest=e;}
  }
  return targetInSight(nearest,W) ? nearest : null;
}
cv.addEventListener('pointerdown', e => {
  audioInit();
  if (panel || title.open) return;
  if (e.pointerType === 'mouse') { setTouch(false); IN.mx = e.clientX; IN.my = e.clientY; if (e.button === 0) IN.fire = true; return; }
  setTouch(true);
  const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, a: P.ang };
  const jr = JOY.getBoundingClientRect();
  const custom = !!JOY.dataset.layout;
  const onStick = custom ? Math.hypot(e.clientX-jr.x-jr.width/2,e.clientY-jr.y-jr.height/2) <= jr.width/2+6 : e.clientX<VW*.5;
  const insideJoy=Math.hypot(e.clientX-jr.x-jr.width/2,e.clientY-jr.y-jr.height/2)<=jr.width/2+6;
  if (firePrefs.mode==='tap' && !insideJoy && !IN.tapFinger) {
    const enemy=enemyUnderFinger(e.clientX,e.clientY);
    if (enemy) {
      IN.tapFinger={id:e.pointerId,x:e.clientX,y:e.clientY,enemy,weapon:S.weapon};
      cv.setPointerCapture(e.pointerId);return;
    }
  }
  if (onStick && !IN.left) {
    cv.setPointerCapture(e.pointerId);
    IN.left = s;
    if (custom) { s.ox=jr.x+jr.width/2; s.oy=jr.y+jr.height/2; JOY.classList.add('on'); }
    else joyAt(e.clientX,e.clientY,s);
    s.radius = custom ? jr.width/2 : 56;
  }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { IN.mx = e.clientX; IN.my = e.clientY; if (IN.touch) setTouch(false); return; }
  const finger=IN.tapFinger;
  if (finger?.id===e.pointerId && Math.hypot(e.clientX-finger.x,e.clientY-finger.y)>9) IN.tapFinger=null;
  const s=IN.left;
  if (!s || s.id!==e.pointerId) return;
  let dx = (e.clientX - s.ox) / (s.radius || 56), dy = (e.clientY - s.oy) / (s.radius || 56);
  const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
  s.dx = dx; s.dy = dy;
  IN.moveX = dx; IN.moveY = dy; JOYK.style.transform = 'translate(' + (dx * Math.min(34,(s.radius || 56)*.6)) + 'px,' + (dy * Math.min(34,(s.radius || 56)*.6)) + 'px)';
});
function endPtr(e) {
  if (e.pointerType === 'mouse') { IN.fire = false; return; }
  const finger=IN.tapFinger;
  if (finger?.id===e.pointerId) {
    IN.tapFinger=null;
    if (e.type==='pointerup' && P.alive && !panel && !title.open && !P.jam && !(P.reload>0) &&
        finger.weapon===S.weapon && S.mag[S.weapon]>0 &&
        Math.hypot(e.clientX-finger.x,e.clientY-finger.y)<=9 && enemyUnderFinger(e.clientX,e.clientY)===finger.enemy) {
      IN.tapShot={enemy:finger.enemy,weapon:S.weapon,ttl:.65};
    }
  }
  if (IN.left && IN.left.id === e.pointerId) { IN.left = null; IN.moveX = IN.moveY = 0; joyReset(); }
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr); cv.addEventListener('lostpointercapture',endPtr);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (!panel) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
const TB = { 'b-crouch': () => { P.crouch = !P.crouch; $('b-crouch').classList.toggle('on', !!P.crouch); }, 'b-rel': startReload, 'b-bolt': throwBolt, 'b-med': medButton, 'b-jump': startJump, 'b-wpn': () => cycleWeapon(1) };
function pressTorch() {
  if (P?.alive && !panel && !title.open) { audioInit(); toggleTorch(); }
}
$('det').addEventListener('pointerdown',e=>{if(e.button===0){e.preventDefault();e.stopPropagation();pressTorch();}});
$('det').addEventListener('click',e=>{if(e.detail===0)pressTorch();});
const runB = $('b-run');
runB.addEventListener('pointerdown', e => {
  if (!P.alive || panel || title.open || IN.runPointer !== null) return;
  e.preventDefault();
  runB.setPointerCapture(e.pointerId);
  IN.runPointer = e.pointerId;
  runB.classList.add('on');
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  runB.addEventListener(type, e => {
    if (e.pointerId !== IN.runPointer) return;
    IN.runPointer = null;
    runB.classList.remove('on');
  });
}
const fireB = $('b-fire');
function releaseFireStick(clearTaps=true) {
  IN.aimStick=null; IN.btnFire=false;
  if (clearTaps) { IN.tapShot=null; IN.tapFinger=null; }
  if (P) { P.aimRay=null; P.lock=null; P.lockT=0; P.shotFlash=0; P.tapFlash=false; }
  fireB.classList.remove('on');
  fireB.style.removeProperty('--aim-x'); fireB.style.removeProperty('--aim-y');
}
function steerFireStick(e) {
  const s=IN.aimStick;
  if (!s || e.pointerId!==s.id) return;
  const dx=e.clientX-s.cx, dy=e.clientY-s.cy, length=Math.hypot(dx,dy);
  const amount=length/s.radius;
  s.active=amount>=.14;
  if (s.active) s.a=Math.atan2(dy,dx);
  IN.btnFire=(firePrefs.mode==='stick' || WP[S.weapon]?.melee) && amount>=(IN.btnFire ? .72 : .82);
  if (!IN.btnFire) P.shotFlash=0;
  if (!s.active) { P.lock=null; P.lockT=0; P.aimRay=null; }
  const k=Math.min(.34,.34*s.radius/Math.max(length,1));
  fireB.style.setProperty('--aim-x',dx*k+'px'); fireB.style.setProperty('--aim-y',dy*k+'px');
}
fireB.addEventListener('pointerdown', e => {
  if (IN.aimStick || panel || title.open || !P?.alive) return;
  e.preventDefault(); e.stopPropagation(); audioInit(); setTouch(true);
  const r=fireB.getBoundingClientRect();
  IN.aimStick={id:e.pointerId,cx:r.left+r.width/2,cy:r.top+r.height/2,radius:r.width/2,a:P.ang};
  fireB.setPointerCapture(e.pointerId);
  steerFireStick(e); fireB.classList.add('on');
});
fireB.addEventListener('pointermove',steerFireStick);
for (const event of ['pointerup','pointercancel','lostpointercapture']) {
  fireB.addEventListener(event,e=>{
    const stick=IN.aimStick;
    if (stick?.id!==e.pointerId) return;
    releaseFireStick(false);
  });
}
$('prompt').addEventListener('click', e => { e.stopPropagation(); audioInit(); if (!panel) interact(); });
$('rot-skip').addEventListener('click', () => document.body.classList.add('portrait-ok'));
Object.keys(TB).forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); if (P.alive && !panel) TB[id](); }));
['mp-bandage', 'mp-medkit'].forEach(id => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (P.alive && !panel) healWith(id === 'mp-medkit' ? 'medkit' : 'bandage'); }));
const weaponButton = $('wpnbox');
let holsterTimer;
for(const type of ['pointerup','pointercancel','lostpointercapture'])weaponButton.addEventListener(type,()=>clearTimeout(holsterTimer));
window.addEventListener('blur',()=>clearTimeout(holsterTimer));
function cycleFromHud() {
  if (P.alive && !panel && !title.open) cycleWeapon(1);
}
weaponButton.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation(); cycleFromHud();
  weaponButton.setPointerCapture(e.pointerId);
  clearTimeout(holsterTimer);
  holsterTimer=setTimeout(()=>{if(P.alive && !panel && !title.open)setWeapon('hands');},500);
});
// Keyboard, assistive activation and programmatic clicks have no pointer press.
weaponButton.addEventListener('click', e => { if (e.detail === 0) cycleFromHud(); });
$('t-inv').addEventListener('click', () => { if (!panel && P.alive) { openPanel('inv', 'Рюкзак'); refresh(); } });
$('t-pda').addEventListener('click', () => { if (!panel && P.alive) { openPanel('pda', 'КПК', PDA_TABS2); refresh(); } });
$('t-menu').addEventListener('click', () => { if (!panel) { openPanel('menu', 'Меню'); refresh(); } });
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) setTouch(true);

/* ===================== заставка и смерть ===================== */
const title = { open: true, el: $('title'), name: document.querySelector('#tcard .start-name') };
function newGameControls(nav,label,buttonClass,initialLevel='normal') {
  const group=el('div','new-campaign'), field=el('label','difficulty-label','Сложность новой игры');
  const select=el('select'), note=el('p','difficulty-note');
  for (const [id,level] of Object.entries(DIFFICULTIES)) {
    const option=el('option','',level.name); option.value=id; select.append(option);
  }
  note.id=panel ? 'restart-difficulty-note' : 'title-difficulty-note';
  select.setAttribute('aria-label','Сложность новой игры');
  select.setAttribute('aria-describedby',note.id);
  select.value=difficultyKey(initialLevel);
  const describe=()=>{ note.textContent=DIFFICULTIES[select.value].note; };
  select.onchange=describe; describe();
  field.append(select);
  group.append(field,note,btn(buttonClass,label,()=>{
    audioInit(); applyState(freshS(select.value));
    if (panel) closePanel();
    if (title.open) hideTitle();
    intro();
  }));
  nav.append(group);
}
function showTitle(kind) {
  resetInput();
  title.open = true; title.el.classList.add('open'); document.body.classList.add('title-open');
  const c = $('tcard'); c.textContent = ''; c.classList.toggle('death', kind === 'death'); title.el.classList.toggle('start', kind !== 'death');
  if (kind === 'death') {
    const h = el('h1', '', 'Зона забрала'); h.appendChild(el('span', '', 'ещё одного')); c.appendChild(h);
    c.appendChild(el('div', 'tape'));
    c.appendChild(el('p', '', 'Последнее сохранение делается само у костра в деревне и у Сидоровича.'));
    const b = el('div', 'tbtns');
    b.appendChild(btn('go','Загрузить сохранение',()=>slotPicker(b,false,()=>showTitle('death'))));
    newGameControls(b,'Начать заново','alt',S.difficulty);
    c.appendChild(b);
    return;
  }
  const nav = el('nav','start-nav');
  nav.setAttribute('aria-label','Главное меню');
  const saved = loadSave();
  if (saved) nav.appendChild(btn('start-primary','Продолжить',()=>{
    audioInit(); applyState(saved); hideTitle();
  }));
  newGameControls(nav,'Новая игра',saved?'':'start-primary');
  if(saved || MANUAL_SLOTS.some(i=>loadSave(i)))nav.appendChild(btn('','Загрузить сохранение',()=>slotPicker(nav,false,()=>showTitle())));
  nav.appendChild(btn('','Управление',openControlEditor));
  nav.appendChild(btn('','Стрельба',()=>showFireSettings(nav,()=>showTitle())));
  c.append(title.name,nav);
}
function goFull() {   // на весь экран там, где браузер это умеет (Android, iPad, компьютер); на iPhone — через «На экран Домой»
  try { const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; if (IN.touch && f && !document.fullscreenElement && !document.webkitFullscreenElement) { const r = f.call(d, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } } catch (e) {}
}
function hideTitle() { goFull(); title.open = false; title.el.classList.remove('open'); document.body.classList.remove('title-open'); }
function onDeath() { showTitle('death'); }
/* ===================== цикл ===================== */
let last = performance.now();
/* автоподстройка: если в игре кадр в среднем дольше 22 мс, кроны деревьев рисуются мельче (меньше заливки для слабого телефона) */
const AQ = { buf: [], done: /aq-off/.test(location.hash) };
function autoQuality(ms) {
  if (AQ.done || panel || title.open || document.hidden) return;
  if (ms > 0 && ms < 200) AQ.buf.push(ms);
  if (AQ.buf.length < (touchRenderer ? 90 : 180)) return;
  const a = AQ.buf.slice().sort((x, y) => x - y), med = a[a.length >> 1]; AQ.buf.length = 0;
  if (touchRenderer) {
    if (med > 24 && touchDensity > 0.85) {
      touchDensity = touchDensity > 1 ? 1 : 0.85;
      sizeWorldCanvas();
    }
    if (touchDensity <= .85) AQ.done = true;
    return;
  }
  if (med > 22 && CAN_SZ > 72) { CAN_SZ = Math.max(72, CAN_SZ - 12); CANOPY.length = 0; buildCanopy(); AQ.lowered = (AQ.lowered || 0) + 1; }
  else AQ.done = true;
}
function frame(now) {
  requestAnimationFrame(frame);
  autoQuality(now - last);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden || (!controlEditor.open && ((title.open && title.el.classList.contains('start')) || panel?.kind==='menu'))) return;
  keyMove();
  if (!panel && !title.open) update(dt);
  render();
  hud(dt);
}
/* загрузка по шагам: если на телефоне что-то падает, на экране видно где и почему (а не тёмный экран) */
function bootStep(t) { window.__bootStep = t; const b = document.getElementById('bootlog'); if (b) b.firstChild.textContent = 'Загрузка: ' + t + '…'; }
async function boot() {
  bootStep('мир'); gen(); bigWorld(); makeLesserZone(); makeGarbage(); buildLandmarks(); buildGrids();
  HOUSES.forEach(buildEntrances);
  resize();
  bootStep('графика'); await loadArt(); await Promise.all([prepareShopGate(), loadLesserSprites()]); bigFences(); buildFieldProps(); buildGrids(); placeSearchContainers(); buildGrids(); furnishHouses(); buildGrids(); buildFieldCrateSites();
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
  setupControlEditor(); showTitle();
  requestAnimationFrame(frame);
}
window.__zRender = render;
window.__bigTiles = () => map;
window.__zRM = { t: RMt, p: RMp, BIG: BIG };
window.__zBig = { railLayout: () => ({sidings, lesserMainTrack, freightDecks}), aq: () => ({ can: CAN_SZ, lowered: AQ.lowered || 0, done: AQ.done }), gStat: gStat, cache: () => GCACHE.size, GMAX: GMAX, mini: () => [miniC.width, miniC.height], fogLen: () => fog.length, PW: () => PW, MH: () => MH, msgs: () => [...radioQueue, ...MSGS].map(m => m.t) };
window.__z = { resetInput: resetInput, rc: { mk: { mkHuman, mkDog, mkBoar, mkSucker }, g3: () => ({ ready: G3_READY(), skin: P ? g3Skin(P) : null }), q5, q3c, gensetUse, pickUp, wolfRC1Opts, exitUse, benchOpts, sosFoeAI, muzzlePoint, actorPose, hurt, sheltered, GFX, g7: { G3, portraitFor, itemIcon, G7, GAIT, RIGS, BODYFX, weaponLocal, localToWorld, g7Muzzle, rayWall, rayCircle, shotTrace, fire, rigActive, g7Fresh, g7Tick, qaRig, ballOff, WP, get tracers() { return tracers; }, get flashes() { return flashes; }, opq, T } }, seed: n => { Math.random = mulberry32(n); }, gfxSnap: () => ({ ANOM0, NPCDEF, DOGDEF, CACHES, HOUSES }), map: { fieldProps, collide, moveE, goTo, los, LOC, LOCATIONS, ANOM0, objs, nav, MW, openBarrier, buildGrids, MAP_ID, MAP_VERSION, drawMapTo }, openLoot: openLoot, clearMsgs: () => { MSGS.length = 0; radioQueue.length = 0; }, reveal: reveal, get WX() { return WX; }, cam: cam, openTrade: openTrade, openPanel: openPanel, refresh: refresh, PDA_TABS2: PDA_TABS2, dialog: dialog, cardOf: cardOf, save: save, loadSave: loadSave, loc: { LOCATIONS, locAnchors, locPt, MAP_VERSION }, plus: { simRest, restLabel, trackedTarget, restBlock, REST, freeTile, get SOS_SPOTS() { return SOS_SPOTS; }, jobCancel, finishEncounter, advanceWorldTime, restPreview, jobOpts, dynSnapshot, jobOffers, jobTake, jobTurnIn, jobReady, hireOpts, restAtFire, sosTick, mkSucker, traderOpts, wolfPlusOpts, qTargets, qList }, get art() { return !!ART; }, goThrough: goThrough, get S() { return S; }, get P() { return P; }, get ents() { return ents; }, IN: IN, update: update, interact: interact, talkTrader: talkTrader, applyState: applyState, freshS: freshS, hideTitle: hideTitle, get panel() { return panel; }, closePanel: closePanel, findPath: findPath, get near() { return G.near; } };
/* мост: тип открытой панели для стилей */
(function(){ const oldHUD = hud; hud = function(dt){ oldHUD(dt); ov.dataset.kind = panel ? panel.kind : ''; }; })();

boot();

})();
