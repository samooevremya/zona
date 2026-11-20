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
      anchors: { hatch: [12.5, 98.5], trader: [126.5, SID_DESK_Y], stairs: [SID_STAIR_X, 11.4], spawn: [126.5, 8.6], safe: [14.5, 95.5] } },
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
