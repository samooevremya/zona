(() => {
const z = __z, M = z.map, R = {}, T = 32;
const pathLen = (a, b) => { const p = z.findPath(a[0] * T, a[1] * T, b[0] * T, b[1] * T); if (!p) return null; let L = 0, x = a[0] * T, y = a[1] * T; p.forEach(q => { L += Math.hypot(q.x - x, q.y - y); x = q.x; y = q.y; }); return Math.round(L / T); };
const inAnom = (x, y) => M.ANOM0.some(a => Math.hypot(a.x - x * T, a.y - y * T) < a.r + 10);
const navAt = (x, y) => !!M.nav[Math.floor(y) * M.MW + Math.floor(x)];
// 1. все якоря и входы: на проходимой клетке (кроме внутренностей бункера), не в аномалии
const bad = [];
M.LOCATIONS.forEach(l => {
  const pts = [];
  Object.entries(l.anchors).forEach(([k, a]) => (Array.isArray(a[0]) ? a : [a]).forEach(p => pts.push([k, p])));
  l.entrances.forEach((p, i) => pts.push(['вход' + i, p]));
  pts.forEach(([k, p]) => {
    if (l.id === 'sid' && !['hatch', 'safe', 'вход0'].includes(k)) return;
    if (['bus', 'building', 'box', 'booth', 'generator', 'fuse', 'fuel', 'stash', 'shed', 'culvert', 'gate', 'post', 'lamps', 'bench', 'tracks', 'lair'].includes(k)) return; // объекты, а не точки появления
    const ok = [[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(d => navAt(p[0] + d[0] * 0.6, p[1] + d[1] * 0.6));
    if (!ok) bad.push(l.id + '.' + k + ' не на проходимой клетке');
    if (/safe|sos|clear|вход/.test(k) && inAnom(p[0], p[1])) bad.push(l.id + '.' + k + ' в аномалии');
  });
});
R.anchors = { ok: bad.length === 0, problems: bad };
// 2. обязательные маршруты (мост закрыт: юг; мост открыт: север)
const L = id => M.LOC[id], E = (id, i) => L(id).entrances[i || 0], A = (id, k) => L(id).anchors[k];
const south = [['village', 'bus'], ['bus', 'pump'], ['pump', 'village'], ['village', 'atp'], ['atp', 'orchard'], ['orchard', 'south_path'], ['south_path', 'village'], ['village', 'sid'], ['village', 'field'], ['village', 'relay'], ['relay', 'atp'], ['village', 'army'], ['village', 'swamp'], ['village', 'trafo']];
const north = [['tunnel', 'camp'], ['camp', 'farm'], ['farm', 'lair'], ['lair', 'east_ditch'], ['east_ditch', 'relay'], ['camp', 'exit'], ['bridge', 'camp']];
const route = (a, b) => pathLen(E(a), E(b));
R.routesSouthBridgeClosed = {}; south.forEach(([a, b]) => R.routesSouthBridgeClosed[a + '→' + b] = route(a, b));
// север без моста: через туннель и через восточную канаву
R.routesNorthBridgeClosed = {}; north.forEach(([a, b]) => R.routesNorthBridgeClosed[a + '→' + b] = route(a, b));
R.crossings = { 'деревня→лагерь (туннель/канава, мост закрыт)': pathLen(A('village', 'safe'), A('camp', 'safe')) };
M.openBarrier();
R.crossings['деревня→лагерь (мост открыт)'] = pathLen(A('village', 'safe'), A('camp', 'safe'));
R.crossings['деревня→переход на Свалку'] = pathLen(A('village', 'safe'), E('exit'));
// АТП: два подхода и отход
R.atpApproaches = { 'запад (въезд)': pathLen(A('atp', 'approach'), A('atp', 'petr')), 'юг (пролом)': pathLen(E('orchard'), [103.5, 80]), 'север (к будке)': pathLen(A('relay', 'safe'), [99.5, 62]) };
const allRoutes = Object.values(R.routesSouthBridgeClosed).concat(Object.values(R.routesNorthBridgeClosed), Object.values(R.crossings), Object.values(R.atpApproaches));
R.routes = { ok: allRoutes.every(v => v != null), missing: Object.entries(Object.assign({}, R.routesSouthBridgeClosed, R.routesNorthBridgeClosed, R.crossings, R.atpApproaches)).filter(([k, v]) => v == null).map(([k]) => k) };
// 3. стартовые NPC/мутанты/тайники не в стенах
const g = z.gfxSnap(), wall = [];
g.NPCDEF.forEach(d => { if (d.x > 120) return; if (!navAt(d.x, d.y)) wall.push('NPC ' + d.sid); });
g.DOGDEF.forEach(d => { if (!navAt(d.x, d.y)) wall.push('пёс ' + d.sid); });
g.CACHES.forEach((c, i) => { if (!pathLen(A('village', 'safe'), [c.x, c.y])) wall.push('тайник ' + i + ' недостижим'); });
R.spawns = { ok: wall.length === 0, problems: wall };
R.mapVersion = M.MAP_VERSION;
return JSON.stringify(R);
})()
