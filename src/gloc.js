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
    anchors: { hatch: [12.5, 98.5], trader: [126.5, SID_DESK_Y], stairs: [SID_STAIR_X, 11.4], spawn: [126.5, 8.6] } },
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
