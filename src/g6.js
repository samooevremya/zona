/* ===================== погода, выброс, шаги, голоса, гитара ===================== */
const WX = { cloud: 0.15, rain: 0, fog: 0, wind: 0.35, flash: 0, red: 0, clouds: [], drops: [] };
const WXT = { clear: [0.1, 0, 0], cloudy: [0.65, 0, 0], rain: [0.85, 0.6, 0.06], storm: [1, 1, 0.06], fog: [0.45, 0, 0.8] };
const WXN = { clear: 'Проясняется', cloudy: 'Небо затягивает тучами', rain: 'Начинается дождь', storm: 'Идёт гроза', fog: 'Опускается туман' };
for (let i = 0; i < 7; i++) WX.clouds.push({ x: rnd(0, WW), y: rnd(0, WH), r: rnd(350, 700) });
function pickWeather() {
  const r = Math.random(), h = hour();
  const k = r < 0.34 ? 'clear' : r < 0.58 ? 'cloudy' : r < 0.78 ? 'rain' : r < 0.87 ? 'storm' : (h < 9 || h > 18 ? 'fog' : 'cloudy');
  S.wx = { k: k, until: S.min + rnd(120, 300) };
  if (P && P.alive && S.min > 430) msg('Погода: ' + WXN[k].toLowerCase() + '.', 'pda');
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
function blowout(dt) {
  const B = S.blow;
  if (B.stage === 0 && S.min >= B.next && P.alive) {
    B.stage = 1; B.t = 80;
    news('Внимание всем сталкерам! Приближается выброс! Срочно найдите укрытие!', true);
    msg('Выброс через минуту! Укройся в доме с целой крышей или в бункере.', 'bad');
    ents.forEach(e => {
      if (!e.alive || e === P || e.kind !== 'human' || sheltered(e.x, e.y) || e.captive || e.guard) return;
      let best = null, bd = 1100;
      HOUSES.forEach(h => { if (h.ruin) return; const cx = (h.x + h.w / 2) * T, cy = (h.y + h.h / 2) * T, d = dst(e.x, e.y, cx, cy); if (d < bd) { bd = d; best = { x: cx, y: cy }; } });
      if (best) { e.sit = 0; e.campRise = null; e.tgt = null; e.trip = { x: best.x + rnd(-20, 20), y: best.y + rnd(-14, 14), stage: 0, shelter: 1 }; e.path = null; }
    });
    const caller = ents.find(e => e.alive && e.fac === 'loner' && dE(e, P) < 500 && !e.captive);
    if (caller) sayLine(caller, 'Выброс! Все в укрытие!');
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
      news('Выброс закончился.' + (born ? ' В аномалиях наверняка родились новые артефакты.' : ''), true);
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
