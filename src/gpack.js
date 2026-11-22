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
