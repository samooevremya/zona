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
