/* Зона · прототип «объём как в первых GTA». Отдельная страница: игру не трогает.
   Камера строго сверху, как в игре. Высокие вещи (дома, кроны) рисуются с перспективой:
   точка на высоте h уходит от центра экрана в f(h) = CAMH / (CAMH − h) раз.
   Мир в игровых пикселях (клетка = 32): x вправо, z вниз. */
(function () {
  const D = window.VILLAGE, T = D.T, OX = D.X0 * T, OZ = D.Y0 * T, WX = (D.X1 - D.X0) * T, WZ = (D.Y1 - D.Y0) * T;
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  const WALL_H = 84;
  const VOL = [{ n: 'Объём: выкл', h: 1e9 }, { n: 'Объём: слабый', h: 1500 }, { n: 'Объём: средний', h: 950 }, { n: 'Объём: сильный', h: 620 }];
  let vol = 3, CAMH = VOL[vol].h, Z = 1, DPR = 1;
  const P = { x: 0, z: 0, ang: -Math.PI / 2, dist: 0, moving: false };
  const IN = { x: 0, y: 0, k: {} };
  const f = h => CAMH / (CAMH - h);
  let SX = 0, SY = 0;                                           // центр экрана в пикселях канваса
  const proj = (x, z, h) => { const k = f(h) * Z * DPR; return [SX + (x - P.x) * k, SY + (z - P.z) * k]; };
  const plane = h => { const k = f(h) * Z * DPR; g.setTransform(k, 0, 0, k, SX - P.x * k, SY - P.z * k); };

  /* ---------- текстуры ---------- */
  function rnd(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function tile(kind, seed) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const q = c.getContext('2d'), R = rnd(seed);
    if (kind === 'conc') {
      q.fillStyle = '#6b6a62'; q.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 900; i++) { q.fillStyle = `rgba(${R() < .5 ? 40 : 150},${R() < .5 ? 38 : 140},30,${R() * .12})`; q.fillRect(R() * 256, R() * 128, 2 + R() * 6, 2 + R() * 6); }
      q.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < 256; x += 64) { q.beginPath(); q.moveTo(x, 0); q.lineTo(x, 128); q.stroke(); }
      for (let i = 0; i < 5; i++) { const x = R() * 240; q.fillStyle = 'rgba(70,45,25,.35)'; q.fillRect(x, 60 + R() * 40, 3, 30 + R() * 30); }
    } else {
      const base = [[96, 84, 66], [84, 74, 60], [104, 92, 72]][seed % 3];
      for (let x = 0; x < 256; x += 16) { const k = .78 + R() * .35; q.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`; q.fillRect(x, 0, 16, 128); q.fillStyle = 'rgba(0,0,0,.45)'; q.fillRect(x, 0, 1.5, 128); }
      for (let i = 0; i < 1400; i++) { q.fillStyle = `rgba(${R() < .5 ? 20 : 200},${R() < .5 ? 18 : 185},10,${R() * .08})`; q.fillRect(R() * 256, R() * 128, 1, 3 + R() * 10); }
    }
    return c;
  }
  // стена целиком: длина × высота в мировых пикселях, окна, двери, свет по направлению
  function wallCanvas(len, n, kind, seed, doors, wins) {
    const c = document.createElement('canvas'); c.width = Math.max(4, Math.ceil(len)); c.height = WALL_H; const q = c.getContext('2d');
    const t = tile(kind, seed); for (let x = 0; x < len; x += 168) q.drawImage(t, x, 0, 168, WALL_H);
    wins.forEach(cx => { q.fillStyle = '#4b3b29'; q.fillRect(cx - 12, 24, 24, 31); q.fillStyle = '#121310'; q.fillRect(cx - 10, 26, 20, 27); q.fillStyle = 'rgba(130,150,150,.2)'; q.fillRect(cx - 9, 27, 8, 12); q.fillStyle = '#4b3b29'; q.fillRect(cx - 1, 26, 2, 27); q.fillRect(cx - 10, 38, 20, 2); });
    doors.forEach(cx => { q.fillStyle = '#3a2c1d'; q.fillRect(cx - 14, WALL_H - 64, 28, 64); q.fillStyle = '#0d0d0b'; q.fillRect(cx - 11, WALL_H - 60, 22, 60); });
    // свет сверху-слева: стены на запад и север светлее
    const lit = Math.max(0, -(n[0] * .64 + n[1] * .77)), dark = .3 - lit * .3;
    q.fillStyle = `rgba(12,10,6,${dark})`; q.fillRect(0, 0, c.width, WALL_H);
    let gr = q.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(0, 0, c.width, 22);   // тень под свесом крыши
    gr = q.createLinearGradient(0, WALL_H - 18, 0, WALL_H); gr.addColorStop(0, 'rgba(40,30,15,0)'); gr.addColorStop(1, 'rgba(40,30,15,.6)'); q.fillStyle = gr; q.fillRect(0, WALL_H - 18, c.width, 18);   // грязь снизу
    q.fillStyle = 'rgba(0,0,0,.35)'; q.fillRect(0, 0, 1.5, WALL_H); q.fillRect(c.width - 1.5, 0, 1.5, WALL_H);   // углы
    return c;
  }
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });

  /* ---------- сборка мира ---------- */
  async function build() {
    const W = { items: [], solid: [] };
    W.ground = await load(D.ground);
    for (let i = 0; i < D.houses.length; i++) {
      const h = D.houses[i], x0 = h.x * T, z0 = h.y * T, x1 = x0 + h.w * T, z1 = z0 + h.h * T, conc = h.mat === 'conc';
      W.solid.push([x0, z0, x1, z1]);
      const img = await load(h.roof), cc = document.createElement('canvas'); cc.width = img.width; cc.height = img.height; const cg = cc.getContext('2d'); cg.drawImage(img, 0, 0);
      const px = cg.getImageData(0, 0, cc.width, cc.height).data; let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = 0; y < cc.height; y++) for (let x = 0; x < cc.width; x++) if (px[(y * cc.width + x) * 4 + 3] > 200) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      const cwx = x0 - h.pad, cwz = z0 - h.pad, ov = 9;
      const roof = [Math.max(cwx + bx0, x0 - ov), Math.max(cwz + by0, z0 - ov), Math.min(cwx + bx1, x1 + ov), Math.min(cwz + by1, z1 + ov)];
      // двери по сторонам (в пикселях вдоль стены)
      const dd = [[], [], [], []];
      (h.doors || []).forEach(d => { const cx = (h.x + d[0]) * T + 16, cz = (h.y + d[1]) * T + 16; if (d[1] === 0) dd[0].push(cx - x0); else if (d[1] === h.h - 1) dd[2].push(x1 - cx); else if (d[0] === 0) dd[3].push(z1 - cz); else dd[1].push(cz - z0); });
      const sides = [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]];
      const walls = sides.map(([a, b], si) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
        const cnt = Math.max(1, Math.floor(len / 80)), wins = [];
        for (let k = 0; k < cnt; k++) { if ((k + si + i) % 3 === 2) continue; const wx = (k + .5) / cnt * len; if (dd[si].some(d => Math.abs(d - wx) < 30)) continue; wins.push(wx); }
        return { a, b, len, n, c: wallCanvas(len, n, conc ? 'conc' : 'wood', i * 4 + si + 3, dd[si], wins) };
      });
      W.items.push({ type: 'house', cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.hypot(x1 - x0, z1 - z0) / 2 + 40, walls, roofC: cc, roof, rw: [cwx, cwz], x0, z0, x1, z1 });
    }
    // кроны: верхний слой и затемнённый нижний
    const crowns = await Promise.all(D.crowns.map(load)), darkC = crowns.map(im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const q = c.getContext('2d'); q.drawImage(im, 0, 0); q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(18,16,8,.45)'; q.fillRect(0, 0, c.width, c.height); return c; });
    D.trees.forEach(([ci, x, z, w, hh]) => { const s = (w + hh) / 2; W.items.push({ type: 'tree', cx: x, cz: z, r: s * .8 + 40, w, hh, top: crowns[ci], low: darkC[ci], hc: 46 + s * .42 }); });
    W.spr = {}; for (const k in D.img) W.spr[k] = { i: await load(D.img[k]), w: D.man[k].w, h: D.man[k].h };
    return W;
  }

  /* ---------- рисование ---------- */
  const fire = (() => { const s = D.ents.filter(e => e.sit); if (!s.length) return null; return [s.reduce((a, e) => a + e.x, 0) / s.length, s.reduce((a, e) => a + e.y, 0) / s.length]; })();
  P.x = fire ? fire[0] - 40 : OX + WX / 2; P.z = fire ? fire[1] + 150 : OZ + WZ / 2;

  function wall(w, h0, h1) {
    // стена — полосы снизу вверх, каждая натягивается аффинно и обрезается своей трапецией
    const N = 3, img = w.c;
    for (let k = 0; k < N; k++) {
      const ha = h0 + (h1 - h0) * k / N, hb = h0 + (h1 - h0) * (k + 1) / N;
      const BL = proj(w.a[0], w.a[1], ha), BR = proj(w.b[0], w.b[1], ha), TL = proj(w.a[0], w.a[1], hb), TR = proj(w.b[0], w.b[1], hb);
      g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.beginPath(); g.moveTo(BL[0], BL[1]); g.lineTo(BR[0], BR[1]); g.lineTo(TR[0], TR[1]); g.lineTo(TL[0], TL[1]); g.closePath(); g.clip();
      const sy = WALL_H - hb, bh = hb - ha, ux = (TR[0] - TL[0]) / w.len, uy = (TR[1] - TL[1]) / w.len, vx = (BL[0] - TL[0]) / bh, vy = (BL[1] - TL[1]) / bh;
      g.setTransform(ux, uy, vx * 1.02, vy * 1.02, TL[0], TL[1]); g.drawImage(img, 0, sy, img.width, bh, 0, 0, w.len, bh);
      g.restore();
    }
  }
  function house(it) {
    it.walls.forEach(w => { const mx = (w.a[0] + w.b[0]) / 2 - P.x, mz = (w.a[1] + w.b[1]) / 2 - P.z; if (w.n[0] * mx + w.n[1] * mz < 0) wall(w, 0, WALL_H); });
    plane(WALL_H); g.save(); g.beginPath(); g.rect(it.roof[0], it.roof[1], it.roof[2] - it.roof[0], it.roof[3] - it.roof[1]); g.clip();
    g.drawImage(it.roofC, it.rw[0], it.rw[1]); g.restore();
    // тонкая тёмная кромка свеса
    g.strokeStyle = 'rgba(10,9,6,.55)'; g.lineWidth = 2; g.strokeRect(it.roof[0], it.roof[1], it.roof[2] - it.roof[0], it.roof[3] - it.roof[1]);
  }
  function tree(it) {
    const b = proj(it.cx, it.cz + 4, 0), t = proj(it.cx, it.cz + 4, it.hc * .7);
    g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = '#2f261b'; g.lineCap = 'round'; g.lineWidth = Math.max(2, 4.5 * Z * DPR); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
    plane(it.hc * .62); g.drawImage(it.low, it.cx - it.w * .45, it.cz - it.hh * .45, it.w * .9, it.hh * .9);
    plane(it.hc); g.drawImage(it.top, it.cx - it.w * .55, it.cz - it.hh * .55, it.w * 1.1, it.hh * 1.1);
  }
  function guy(W, x, z, ang, key, sit) {
    const s = W.spr[key] || W.spr.loner_idle; if (!s) return;
    plane(0);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 5, z + 6, 15, 12, 0, 0, 6.283); g.fill();
    const k = f(sit ? 14 : 24), sx = P.x + (x - P.x) * k, sz = P.z + (z - P.z) * k;   // плечи чуть выше земли
    g.save(); g.translate(sx, sz); g.rotate(ang + Math.PI / 2); g.drawImage(s.i, -s.w / 2, -s.h / 2, s.w, s.h); g.restore();
  }
  function draw(W, t) {
    const cw = cv.clientWidth, ch = cv.clientHeight; DPR = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== (cw * DPR | 0) || cv.height !== (ch * DPR | 0)) { cv.width = cw * DPR | 0; cv.height = ch * DPR | 0; }
    SX = cv.width / 2; SY = cv.height / 2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#16150f'; g.fillRect(0, 0, cv.width, cv.height);
    plane(0); g.imageSmoothingEnabled = true; g.drawImage(W.ground, OX, OZ, WX, WZ);
    if (fire) { g.globalCompositeOperation = 'lighter'; const r = 150 + Math.sin(t * 9) * 6 + Math.sin(t * 23) * 4, gr = g.createRadialGradient(fire[0], fire[1], 0, fire[0], fire[1], r); gr.addColorStop(0, 'rgba(255,140,55,.45)'); gr.addColorStop(1, 'rgba(255,140,55,0)'); g.fillStyle = gr; g.fillRect(fire[0] - r, fire[1] - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; }
    // тени домов на землю (свет сверху-слева)
    g.fillStyle = 'rgba(8,7,4,.32)';
    W.items.forEach(it => { if (it.type !== 'house') return; const sx = .62 * 96, sz = .74 * 96, a = it.x0, b = it.z0, c = it.x1, d = it.z1;
      g.beginPath(); g.moveTo(c, b); g.lineTo(c + sx, b + sz); g.lineTo(c + sx, d + sz); g.lineTo(a + sx, d + sz); g.lineTo(a, d); g.lineTo(c, d); g.closePath(); g.fill(); });
    // люди
    D.ents.forEach(e => guy(W, e.x, e.y, e.ang || 0, (e.fac || 'loner') + (e.sit ? '_seated' : '_idle'), e.sit));
    const cyc = ['walk_left', 'walk_pass_left', 'walk_right', 'walk_pass_right'];
    guy(W, P.x, P.z, P.ang, 'loner_' + (P.moving ? cyc[Math.floor(P.dist / 11) % 4] : 'idle'), false);
    if (fire) { plane(10); g.globalCompositeOperation = 'lighter'; const r = 16 + Math.sin(t * 13) * 3, gr = g.createRadialGradient(fire[0], fire[1], 0, fire[0], fire[1], r); gr.addColorStop(0, 'rgba(255,235,170,.95)'); gr.addColorStop(.5, 'rgba(255,140,50,.6)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(fire[0] - r, fire[1] - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; }
    // высокое: от дальних к ближним (к центру экрана)
    const vw = cv.width / (Z * DPR) / 2 + 60, vh = cv.height / (Z * DPR) / 2 + 60;
    const vis = W.items.filter(it => Math.abs(it.cx - P.x) < vw + it.r && Math.abs(it.cz - P.z) < vh + it.r);
    vis.forEach(it => it.d = (it.type === 'house' ? Math.max(0, Math.max(it.x0 - P.x, P.x - it.x1)) ** 2 + Math.max(0, Math.max(it.z0 - P.z, P.z - it.z1)) ** 2 : (it.cx - P.x) ** 2 + (it.cz - P.z) ** 2));
    vis.sort((a, b) => b.d - a.d).forEach(it => it.type === 'house' ? house(it) : tree(it));
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- управление ---------- */
  function update(W, dt) {
    let mx = IN.x, my = IN.y;
    if (IN.k.KeyW || IN.k.ArrowUp) my -= 1; if (IN.k.KeyS || IN.k.ArrowDown) my += 1; if (IN.k.KeyA || IN.k.ArrowLeft) mx -= 1; if (IN.k.KeyD || IN.k.ArrowRight) mx += 1;
    const l = Math.hypot(mx, my); P.moving = l > 0.1;
    if (P.moving) {
      if (l > 1) { mx /= l; my /= l; }
      const sp = 150 * Math.min(1, l), nx = P.x + mx * sp * dt, nz = P.z + my * sp * dt, r = 11;
      const hit = (x, z) => W.solid.some(b => x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r) || x < OX + 20 || z < OZ + 20 || x > OX + WX - 20 || z > OZ + WZ - 20;
      const ox = P.x, oz = P.z; if (!hit(nx, P.z)) P.x = nx; if (!hit(P.x, nz)) P.z = nz;
      P.dist += Math.hypot(P.x - ox, P.z - oz); P.ang = Math.atan2(my, mx);
    }
  }
  const joy = document.getElementById('joy'), knob = joy.firstElementChild; let jt = null;
  addEventListener('pointerdown', e => { if (e.target.closest('button') || jt) return; jt = { id: e.pointerId, x: e.clientX, y: e.clientY }; joy.style.left = e.clientX - 60 + 'px'; joy.style.top = e.clientY - 60 + 'px'; joy.classList.add('on'); });
  addEventListener('pointermove', e => { if (!jt || e.pointerId !== jt.id) return; let dx = e.clientX - jt.x, dy = e.clientY - jt.y; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } IN.x = dx / m; IN.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; });
  const up = e => { if (jt && e.pointerId === jt.id) { jt = null; IN.x = IN.y = 0; knob.style.transform = ''; joy.classList.remove('on'); } };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('keydown', e => IN.k[e.code] = 1); addEventListener('keyup', e => IN.k[e.code] = 0);
  const baseZ = () => Math.max(0.55, Math.min(1.4, Math.min(innerWidth, innerHeight) / 560));
  let zm = 1; Z = baseZ();
  addEventListener('resize', () => Z = baseZ() * zm);
  addEventListener('wheel', e => { zm = Math.max(.5, Math.min(2, zm * (1 - e.deltaY * .001))); Z = baseZ() * zm; }, { passive: true });
  const bv = document.getElementById('b-vol'); const setVol = v => { vol = v; CAMH = VOL[v].h; bv.textContent = VOL[v].n; }; setVol(vol);
  bv.onclick = () => setVol((vol + 1) % VOL.length);
  document.getElementById('b-zi').onclick = () => { zm = Math.min(2, zm * 1.2); Z = baseZ() * zm; };
  document.getElementById('b-zo').onclick = () => { zm = Math.max(.5, zm / 1.2); Z = baseZ() * zm; };

  build().then(W => {
    document.getElementById('load').remove();
    let last = performance.now(), fc = 0, ft = 0; const fe = document.getElementById('fps');
    const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(W, dt); draw(W, now / 1000); fc++; ft += dt; if (ft > 1) { fe.textContent = Math.round(fc / ft) + ' FPS'; fc = 0; ft = 0; } requestAnimationFrame(loop); };
    requestAnimationFrame(loop); window.__proto = { P, W, setVol, get Z() { return Z; } };
  }).catch(e => { document.getElementById('err').textContent = 'Ошибка: ' + e; });
})();
