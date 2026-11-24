// Existing numerical balance shared with the legacy edition.
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
const DIFFICULTIES = {
  rookie: {name:'Новичок', note:'Больше припасов, выгодная торговля. Легче попасть и пережить ранение.',
    buy:.8, income:1.20, loot:1.40, incoming:.65, spread:.75},
  normal: {name:'Средний', note:'Торговцы берут дороже, патроны приходится экономить. Обычный урон.',
    buy:1.12, income:.88, loot:.82, incoming:1, spread:1},
  hard: {name:'Сложный', note:'Патронов меньше, снаряжение дороже. Противники бьют сильнее.',
    buy:1.25, income:.80, loot:.75, incoming:1.25, spread:1.10},
  master: {name:'Мастер', note:'Скудная добыча, дорогой ремонт и низкий заработок. Ошибки в бою обходятся дорого.',
    buy:1.55, income:.60, loot:.50, incoming:1.55, spread:1.20}
};
