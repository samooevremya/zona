/* Зона · прототип 2.5D деревни новичков. Отдельная страница: игру не трогает.
   Мир в игровых пикселях (клетка = 32): x вправо, z вниз (как y в игре), y вверх. */
(function () {
  const D = window.VILLAGE, T = D.T, OX = D.X0 * T, OZ = D.Y0 * T, WX = (D.X1 - D.X0) * T, WZ = (D.Y1 - D.Y0) * T;
  const cv = document.getElementById('c'), gl = cv.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) { document.getElementById('err').textContent = 'WebGL недоступен в этом браузере'; return; }
  const SUN = norm([0.55, 0.85, 0.45]), SH = [0.62, 0.74];          // свет сверху-слева; тень вправо-вниз (на единицу высоты)

  /* ---------- математика ---------- */
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function persp(fov, a, n, f) { const t = 1 / Math.tan(fov / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }
  function look(e, c, u) {
    const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm([u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]), y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
  }
  function mul(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }

  /* ---------- шейдеры ---------- */
  function prog(vs, fs) {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([t, s]) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(sh); gl.attachShader(p, sh); });
    gl.linkProgram(p); return p;
  }
  const PT = prog(`attribute vec3 p;attribute vec2 t;attribute vec3 n;uniform mat4 m;varying vec2 vt;varying float vl;uniform vec3 L;uniform float lit;
    void main(){vt=t;vl=mix(1.0,0.55+0.6*max(dot(n,L),0.0),lit);gl_Position=m*vec4(p,1.0);}`,
    `precision mediump float;varying vec2 vt;varying float vl;uniform sampler2D s;uniform float cut;uniform vec3 tint;uniform float al;
    void main(){vec4 c=texture2D(s,vt);if(c.a<cut)discard;vec3 col=c.rgb*vl*tint;gl_FragColor=vec4(col*vec3(1.02,0.97,0.88),c.a*al);}`);
  const PC = prog(`attribute vec3 p;attribute vec3 n;uniform mat4 m;varying float vl;uniform vec3 L;void main(){vl=0.5+0.55*max(dot(n,L),0.0);gl_Position=m*vec4(p,1.0);}`,
    `precision mediump float;uniform vec4 col;uniform float lit;varying float vl;void main(){gl_FragColor=vec4(col.rgb*mix(1.0,vl,lit),col.a);}`);

  /* ---------- буферы ---------- */
  function mesh(arr, stride) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return { b, n: arr.length / stride }; }
  function tex(img, rep) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const pot = !(img.width & (img.width - 1)) && !(img.height & (img.height - 1));
    if (pot) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const w = rep && pot ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    return t;
  }
  // вершина: x y z u v nx ny nz
  function quad(o, a, b, c, d, uv, n) { [[a, uv[0]], [b, uv[1]], [c, uv[2]], [a, uv[0]], [c, uv[2]], [d, uv[3]]].forEach(([p, t]) => o.push(p[0], p[1], p[2], t[0], t[1], n[0], n[1], n[2])); }
  function tri(o, a, b, c, ua, ub, uc, n) { [[a, ua], [b, ub], [c, uc]].forEach(([p, t]) => o.push(p[0], p[1], p[2], t[0], t[1], n[0], n[1], n[2])); }
  function faceN(a, b, c) { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]); }

  /* ---------- текстуры стен (рисуем сами) ---------- */
  function rnd(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function wallTex(kind, seed) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), R = rnd(seed);
    if (kind === 'conc') {
      g.fillStyle = '#6b6a62'; g.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < .5 ? 40 : 150},${R() < .5 ? 38 : 140},30,${R() * .12})`; g.fillRect(R() * 256, R() * 128, 2 + R() * 6, 2 + R() * 6); }
      g.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
      for (let i = 0; i < 5; i++) { const x = R() * 240; g.fillStyle = 'rgba(70,45,25,.35)'; g.fillRect(x, 60 + R() * 40, 3, 30 + R() * 30); }
    } else {
      const base = [[96, 84, 66], [84, 74, 60], [104, 92, 72]][seed % 3];
      for (let x = 0; x < 256; x += 16) { const k = .78 + R() * .35; g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`; g.fillRect(x, 0, 16, 128); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, 0, 1.5, 128); }
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${R() < .5 ? 20 : 200},${R() < .5 ? 18 : 185},10,${R() * .08})`; g.fillRect(R() * 256, R() * 128, 1, 3 + R() * 10); }
      const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,30,15,.55)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    }
    return c;
  }
  // окно или дверь поверх стены: рисуем тёмный проём отдельной текстурой
  const holeC = document.createElement('canvas'); holeC.width = holeC.height = 64; { const g = holeC.getContext('2d'); g.fillStyle = '#4b3b29'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#121310'; g.fillRect(6, 6, 52, 52); g.fillStyle = 'rgba(120,140,140,.18)'; g.fillRect(8, 8, 22, 22); g.fillRect(34, 34, 22, 22); g.fillStyle = '#4b3b29'; g.fillRect(30, 6, 4, 52); g.fillRect(6, 30, 52, 4); }
  const doorC = document.createElement('canvas'); doorC.width = 64; doorC.height = 128; { const g = doorC.getContext('2d'); g.fillStyle = '#3a2c1d'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#0d0d0b'; g.fillRect(6, 8, 52, 120); }

  /* ---------- загрузка картинок ---------- */
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });

  async function build() {
    const W = {};
    W.ground = tex(await load(D.ground));
    const ground = mesh((() => { const o = []; quad(o, [OX, 0, OZ], [OX + WX, 0, OZ], [OX + WX, 0, OZ + WZ], [OX, 0, OZ + WZ], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 1, 0]); return o; })(), 8);

    /* дома */
    const houses = [], shadowTri = [], solid = [];
    const WALL_H = 84;
    for (let i = 0; i < D.houses.length; i++) {
      const h = D.houses[i], x0 = h.x * T, z0 = h.y * T, x1 = x0 + h.w * T, z1 = z0 + h.h * T, conc = h.mat === 'conc';
      solid.push([x0, z0, x1, z1]);
      const roofImg = await load(h.roof);
      // рамка крыши в картинке (по непрозрачным пикселям); нижнюю «стену» из 2D-крыши отрезаем — у нас настоящие стены
      const cc = document.createElement('canvas'); cc.width = roofImg.width; cc.height = roofImg.height; const cg = cc.getContext('2d'); cg.drawImage(roofImg, 0, 0);
      const px = cg.getImageData(0, 0, cc.width, cc.height).data; let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = 0; y < cc.height; y++) for (let x = 0; x < cc.width; x++) if (px[(y * cc.width + x) * 4 + 3] > 200) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      const cwx = x0 - h.pad, cwz = z0 - h.pad;                       // мировые координаты левого верхнего угла картинки крыши
      const ov = 10, rx0 = Math.max(cwx + bx0, x0 - ov), rx1 = Math.min(cwx + bx1, x1 + ov), rz0 = Math.max(cwz + by0, z0 - ov), rz1 = Math.min(cwz + by1, z1 + ov);
      const U = x => (x - cwx) / cc.width, V = z => (z - cwz) / cc.height;
      const short = Math.min(rx1 - rx0, rz1 - rz0), ridgeH = WALL_H + Math.min(110, short * 0.42), along = (rx1 - rx0) >= (rz1 - rz0);
      const rf = [], ins = short * 0.5;   // вальмовая крыша: конёк вдоль длинной стороны
      let A = [rx0, WALL_H, rz0], B = [rx1, WALL_H, rz0], C = [rx1, WALL_H, rz1], Dd = [rx0, WALL_H, rz1], R1, R2;
      if (along) { const zm = (rz0 + rz1) / 2; R1 = [rx0 + ins * .6, ridgeH, zm]; R2 = [rx1 - ins * .6, ridgeH, zm]; }
      else { const xm = (rx0 + rx1) / 2; R1 = [xm, ridgeH, rz0 + ins * .6]; R2 = [xm, ridgeH, rz1 - ins * .6]; }
      const uv = p => [U(p[0]), V(p[2])];
      const addQ = (a, b, c, d) => { const n = faceN(a, b, c); quad(rf, a, b, c, d, [uv(a), uv(b), uv(c), uv(d)], n); };
      const addT = (a, b, c) => tri(rf, a, b, c, uv(a), uv(b), uv(c), faceN(a, b, c));
      if (h.ruin) { addQ(A, B, C, Dd); }            // у руины — плоская разбитая крыша с дырами
      else if (along) { addQ(A, B, R2, R1); addQ(C, Dd, R1, R2); addT(Dd, A, R1); addT(B, C, R2); }
      else { addQ(B, C, R2, R1); addQ(Dd, A, R1, R2); addT(A, B, R1); addT(C, Dd, R2); }
      // стены
      const wl = [], wt = tex(wallTex(conc ? 'conc' : 'wood', i + 3), true), sides = [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]];
      const holes = [], doors = [];
      sides.forEach(([a, b], si) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = norm([b[1] - a[1], 0, -(b[0] - a[0])]);
        quad(wl, [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], WALL_H, b[1]], [a[0], WALL_H, a[1]], [[0, 1], [len / 128, 1], [len / 128, 0], [0, 0]], n);
        // окна через каждые ~2.5 клетки
        const cnt = Math.max(1, Math.floor(len / 80));
        for (let k = 0; k < cnt; k++) {
          const t = (k + .5) / cnt, cx = a[0] + (b[0] - a[0]) * t, cz = a[1] + (b[1] - a[1]) * t, dx = (b[0] - a[0]) / len * 11, dz = (b[1] - a[1]) / len * 11, o = [n[0] * .8, n[2] * .8];
          if ((k + si + i) % 3 === 2) continue;
          quad(holes, [cx - dx + o[0], 30, cz - dz + o[1]], [cx + dx + o[0], 30, cz + dz + o[1]], [cx + dx + o[0], 58, cz + dz + o[1]], [cx - dx + o[0], 58, cz - dz + o[1]], [[0, 1], [1, 1], [1, 0], [0, 0]], n);
        }
      });
      (h.doors || []).forEach(dd => {
        const tx = h.x + dd[0], tz = h.y + dd[1], cx = tx * T + 16, cz = tz * T + 16;
        let n, a, b; if (dd[1] === 0) { n = [0, 0, -1]; a = [cx + 13, z0 - .8]; b = [cx - 13, z0 - .8]; } else if (dd[1] === h.h - 1) { n = [0, 0, 1]; a = [cx - 13, z1 + .8]; b = [cx + 13, z1 + .8]; } else if (dd[0] === 0) { n = [-1, 0, 0]; a = [x0 - .8, cz - 13]; b = [x0 - .8, cz + 13]; } else { n = [1, 0, 0]; a = [x1 + .8, cz + 13]; b = [x1 + .8, cz - 13]; }
        quad(doors, [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], 62, b[1]], [a[0], 62, a[1]], [[0, 1], [1, 1], [1, 0], [0, 0]], n);
      });
      houses.push({ roof: mesh(rf, 8), roofT: tex(cc), wall: mesh(wl, 8), wallT: wt, holes: holes.length ? mesh(holes, 8) : null, doors: doors.length ? mesh(doors, 8) : null });
      // тень дома: проекция «коробки» до конька вправо-вниз
      const hh = h.ruin ? WALL_H : (WALL_H + ridgeH) / 2 + 8, sx = SH[0] * hh, sz = SH[1] * hh;
      const pts = [[rx0, rz0], [rx1, rz0], [rx1, rz1], [rx0, rz1]];
      const hull = convex(pts.concat(pts.map(p => [p[0] + sx, p[1] + sz])));
      for (let k = 1; k + 1 < hull.length; k++) shadowTri.push(hull[0][0], .6, hull[0][1], 0, 1, 0, hull[k][0], .6, hull[k][1], 0, 1, 0, hull[k + 1][0], .6, hull[k + 1][1], 0, 1, 0);
    }
    W.holeT = tex(holeC); W.doorT = tex(doorC);

    /* деревья: крона — горизонтальная картинка на высоте, ствол — тонкий столб, тень — эллипс на земле */
    const crownT = await Promise.all(D.crowns.map(load)).then(a => a.map(i => tex(i)));
    const byCrown = D.crowns.map(() => []), trunks = [];
    D.trees.forEach(([ci, x, z, w, hgt]) => {
      const s = (w + hgt) / 2, y = 70 + s * 0.55, hw = w / 2 * 1.25, hh = hgt / 2 * 1.25;
      quad(byCrown[ci], [x - hw, y, z - hh], [x + hw, y, z - hh], [x + hw, y, z + hh], [x - hw, y, z + hh], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 1, 0]);
      const y2 = y - 16, k2 = .82; quad(byCrown[ci], [x - hw * k2, y2, z - hh * k2], [x + hw * k2, y2, z - hh * k2], [x + hw * k2, y2, z + hh * k2], [x - hw * k2, y2, z + hh * k2], [[1, 0], [1, 1], [0, 1], [0, 0]], [0, 1, 0]);
      const r = 3 + s * 0.02, tz = z + 4;
      [[[x - r, tz - r], [x + r, tz - r]], [[x + r, tz - r], [x + r, tz + r]], [[x + r, tz + r], [x - r, tz + r]], [[x - r, tz + r], [x - r, tz - r]]].forEach(([a, b]) => {
        const n = norm([b[1] - a[1], 0, -(b[0] - a[0])]);
        [[a, 0], [b, 0], [b, y], [a, 0], [b, y], [a, y]].forEach(([p, yy]) => trunks.push(p[0], yy, p[1], n[0], n[1], n[2]));
      });
      // тень кроны
      const cx = x + SH[0] * y, cz = z + SH[1] * y, rx = hw * .82, rz = hh * .78, N = 14;
      for (let k = 0; k < N; k++) { const a0 = k / N * 6.283, a1 = (k + 1) / N * 6.283; shadowTri.push(cx, .5, cz, 0, 1, 0, cx + Math.cos(a0) * rx, .5, cz + Math.sin(a0) * rz, 0, 1, 0, cx + Math.cos(a1) * rx, .5, cz + Math.sin(a1) * rz, 0, 1, 0); }
    });
    W.crowns = byCrown.map((o, i) => ({ m: o.length ? mesh(o, 8) : null, t: crownT[i] }));
    W.trunks = mesh(trunks, 6);
    W.shadow = mesh(shadowTri, 6);
    W.houses = houses; W.ground2 = ground; W.solid = solid;

    /* персонажи */
    W.spr = {};
    for (const k in D.img) W.spr[k] = { t: tex(await load(D.img[k])), w: D.man[k].w, h: D.man[k].h };
    W.quad1 = mesh((() => { const o = []; quad(o, [-.5, 0, -.5], [.5, 0, -.5], [.5, 0, .5], [-.5, 0, .5], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 1, 0]); return o; })(), 8);
    // круг тени/свечения
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const g = gc.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
    W.blob = tex(gc);
    return W;
  }
  function convex(p) {
    p = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  /* ---------- состояние ---------- */
  const fire = (() => { const s = D.ents.filter(e => e.sit); if (!s.length) return null; return [s.reduce((a, e) => a + e.x, 0) / s.length, s.reduce((a, e) => a + e.y, 0) / s.length]; })();
  const P = { x: fire ? fire[0] - 40 : OX + WX / 2, z: fire ? fire[1] + 150 : OZ + WZ / 2, ang: -Math.PI / 2, dist: 0, moving: false };
  const cam = { yaw: 0, pitch: 0.95, dist: 620 };
  const IN = { x: 0, y: 0, k: {} };

  function draw(W, t) {
    const w = cv.clientWidth * devicePixelRatio | 0, h = cv.clientHeight * devicePixelRatio | 0; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h); gl.clearColor(0.09, 0.085, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const cy = Math.cos(cam.pitch), eye = [P.x - Math.sin(cam.yaw) * cy * cam.dist, Math.sin(cam.pitch) * cam.dist, P.z + Math.cos(cam.yaw) * cy * cam.dist];
    const up = cam.pitch > 1.5 ? [Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)] : [0, 1, 0];
    const M = mul(persp(0.62, w / h, 20, 6000), look(eye, [P.x, 40, P.z], up));
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // текстурная программа
    gl.useProgram(PT);
    const aP = gl.getAttribLocation(PT, 'p'), aT = gl.getAttribLocation(PT, 't'), aN = gl.getAttribLocation(PT, 'n');
    const uM = gl.getUniformLocation(PT, 'm'), uCut = gl.getUniformLocation(PT, 'cut'), uL = gl.getUniformLocation(PT, 'L'), uLit = gl.getUniformLocation(PT, 'lit'), uTint = gl.getUniformLocation(PT, 'tint'), uAl = gl.getUniformLocation(PT, 'al');
    gl.uniform3fv(uL, SUN); gl.uniform3f(uTint, 1, 1, 1); gl.uniform1f(uAl, 1);
    const bindT = (m, tx, mat, lit, cut) => {
      gl.useProgram(PT); attrs([aP, aT, aN]);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
      gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(aT, 2, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 32, 20);
      gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniformMatrix4fv(uM, false, mat); gl.uniform1f(uLit, lit); gl.uniform1f(uCut, cut);
      gl.drawArrays(gl.TRIANGLES, 0, m.n);
    };
    bindT(W.ground2, W.ground, M, 0, 0);
    // отсвет костра на земле
    if (fire) { gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); const r = 150 + Math.sin(t * 9) * 6 + Math.sin(t * 23) * 4; gl.uniform3f(uTint, 1, .55, .22); gl.uniform1f(uAl, .45); bindT(W.quad1, W.blob, mul(M, tr(fire[0], .8, fire[1], r * 2, 1, r * 2, 0)), 0, 0); gl.uniform3f(uTint, 1, 1, 1); gl.uniform1f(uAl, 1); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true); }

    // тени: одной заливкой поверх земли
    gl.useProgram(PC); const cP = gl.getAttribLocation(PC, 'p'), cN = gl.getAttribLocation(PC, 'n'), cM = gl.getUniformLocation(PC, 'm'), cC = gl.getUniformLocation(PC, 'col'), cLit = gl.getUniformLocation(PC, 'lit'), cL = gl.getUniformLocation(PC, 'L');
    gl.uniform3fv(cL, SUN);
    const bindC = (m, mat, col, lit) => { gl.useProgram(PC); attrs([cP, cN]); gl.bindBuffer(gl.ARRAY_BUFFER, m.b); gl.vertexAttribPointer(cP, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(cN, 3, gl.FLOAT, false, 24, 12); gl.uniformMatrix4fv(cM, false, mat); gl.uniform4fv(cC, col); gl.uniform1f(cLit, lit); gl.drawArrays(gl.TRIANGLES, 0, m.n); };
    gl.depthMask(false);
    bindC(W.shadow, M, [0.03, 0.03, 0.02, 0.30], 0);
    gl.depthMask(true);
    bindC(W.trunks, M, [0.2, 0.16, 0.11, 1], 1);

    // дома
    gl.useProgram(PT); gl.uniform3fv(uL, SUN);
    W.houses.forEach(h => {
      bindT(h.wall, h.wallT, M, 1, .5);
      if (h.holes) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -2); bindT(h.holes, W.holeT, M, 1, .5); gl.disable(gl.POLYGON_OFFSET_FILL); }
      if (h.doors) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -2); bindT(h.doors, W.doorT, M, 1, .5); gl.disable(gl.POLYGON_OFFSET_FILL); }
      bindT(h.roof, h.roofT, M, 1, .55);
    });

    // люди: нарисованы сверху — кладём картинку горизонтально на высоте плеч, тень на землю
    const drawGuy = (e, key, sit) => {
      const s = W.spr[key] || W.spr['loner_idle']; if (!s) return;
      const y = sit ? 34 : 56, a = (e.ang || 0) - Math.PI / 2;
      gl.depthMask(false); gl.uniform3f(uTint, 0, 0, 0); gl.uniform1f(uAl, .45); bindT(W.quad1, W.blob, mul(M, tr(e.x + SH[0] * y * .55, .7, e.z + SH[1] * y * .55, 30, 1, 26, 0)), 0, 0); gl.uniform3f(uTint, 1, 1, 1); gl.uniform1f(uAl, 1); gl.depthMask(true);
      bindT(W.quad1, s.t, mul(M, tr(e.x, y, e.z, s.w, 1, s.h, a)), 0, .5);
    };
    D.ents.forEach(e => drawGuy({ x: e.x, z: e.y, ang: e.ang }, (e.fac || 'loner') + (e.sit ? '_seated' : '_idle'), e.sit));
    const cyc = ['walk_left', 'walk_pass_left', 'walk_right', 'walk_pass_right'], ph = Math.floor(P.dist / 11) % 4;
    drawGuy({ x: P.x, z: P.z, ang: P.ang }, 'loner_' + (P.moving ? cyc[ph] : 'idle'), false);

    // кроны (горизонтально, на высоте; рядом с героем становятся прозрачнее)
    W.crowns.forEach(c => { if (c.m) bindT(c.m, c.t, M, 0, .3); });
    // огонь
    if (fire) { gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); const f = 26 + Math.sin(t * 13) * 4; gl.uniform3f(uTint, 1, .62, .25); gl.uniform1f(uAl, .95); bindT(W.quad1, W.blob, mul(M, tr(fire[0], 10, fire[1], f, 1, f, 0)), 0, 0); gl.uniform3f(uTint, 1, .9, .6); bindT(W.quad1, W.blob, mul(M, tr(fire[0], 12, fire[1], f * .45, 1, f * .45, 0)), 0, 0); gl.uniform3f(uTint, 1, 1, 1); gl.uniform1f(uAl, 1); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(true); }
  }
  function attrs(on) { for (let i = 0; i < 4; i++) on.includes(i) ? gl.enableVertexAttribArray(i) : gl.disableVertexAttribArray(i); }
  // модель: перенос, масштаб, поворот вокруг вертикали
  function tr(x, y, z, sx, sy, sz, a) { const c = Math.cos(a), s = Math.sin(a); return [c * sx, 0, s * sx, 0, 0, sy, 0, 0, -s * sz, 0, c * sz, 0, x, y, z, 1]; }

  /* ---------- управление ---------- */
  function update(W, dt) {
    let mx = IN.x, my = IN.y;
    if (IN.k.KeyW || IN.k.ArrowUp) my -= 1; if (IN.k.KeyS || IN.k.ArrowDown) my += 1; if (IN.k.KeyA || IN.k.ArrowLeft) mx -= 1; if (IN.k.KeyD || IN.k.ArrowRight) mx += 1;
    if (IN.k.KeyQ) cam.yaw -= dt * 1.6; if (IN.k.KeyE) cam.yaw += dt * 1.6;
    const l = Math.hypot(mx, my); P.moving = l > 0.1;
    if (P.moving) {
      if (l > 1) { mx /= l; my /= l; }
      // вперёд — от камеры
      const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw), dx = mx * c - my * s, dz = mx * s + my * c, sp = 150 * Math.min(1, l);
      const nx = P.x + dx * sp * dt, nz = P.z + dz * sp * dt, r = 11;
      const hit = (x, z) => W.solid.some(b => x > b[0] - r && x < b[2] + r && z > b[1] - r && z < b[3] + r) || x < OX + 20 || z < OZ + 20 || x > OX + WX - 20 || z > OZ + WZ - 20;
      const ox = P.x, oz = P.z;
      if (!hit(nx, P.z)) P.x = nx; if (!hit(P.x, nz)) P.z = nz;
      P.dist += Math.hypot(P.x - ox, P.z - oz); P.ang = Math.atan2(dz, dx);
    }
  }
  // джойстик и поворот камеры пальцем
  const joy = document.getElementById('joy'), knob = joy.firstElementChild; let jt = null, rt = null;
  addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    if (e.clientX < innerWidth * 0.45 && !jt) { jt = { id: e.pointerId, x: e.clientX, y: e.clientY }; joy.style.left = e.clientX - 60 + 'px'; joy.style.top = e.clientY - 60 + 'px'; joy.classList.add('on'); }
    else if (!rt) rt = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  addEventListener('pointermove', e => {
    if (jt && e.pointerId === jt.id) { let dx = e.clientX - jt.x, dy = e.clientY - jt.y; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } IN.x = dx / m; IN.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; }
    if (rt && e.pointerId === rt.id) { cam.yaw += (e.clientX - rt.x) * 0.006; cam.pitch = Math.max(0.45, Math.min(1.56, cam.pitch + (e.clientY - rt.y) * 0.004)); rt.x = e.clientX; rt.y = e.clientY; }
  });
  const up = e => { if (jt && e.pointerId === jt.id) { jt = null; IN.x = IN.y = 0; knob.style.transform = ''; joy.classList.remove('on'); } if (rt && e.pointerId === rt.id) rt = null; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('keydown', e => IN.k[e.code] = 1); addEventListener('keyup', e => IN.k[e.code] = 0);
  addEventListener('wheel', e => { cam.dist = Math.max(260, Math.min(1400, cam.dist * (1 + e.deltaY * 0.001))); }, { passive: true });
  document.getElementById('b-top').onclick = () => { cam.pitch = 1.56; cam.yaw = 0; };
  document.getElementById('b-25').onclick = () => { cam.pitch = 0.95; cam.yaw = 0; };
  document.getElementById('b-low').onclick = () => { cam.pitch = 0.6; };
  document.getElementById('b-zi').onclick = () => { cam.dist = Math.max(260, cam.dist * 0.8); };
  document.getElementById('b-zo').onclick = () => { cam.dist = Math.min(1400, cam.dist * 1.25); };

  build().then(W => {
    document.getElementById('load').remove();
    let last = performance.now(), fps = 0, fc = 0, ft = 0; const fe = document.getElementById('fps');
    const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(W, dt); draw(W, now / 1000); fc++; ft += dt; if (ft > 1) { fe.textContent = Math.round(fc / ft) + ' FPS'; fc = 0; ft = 0; } requestAnimationFrame(loop); };
    requestAnimationFrame(loop); window.__proto = { P, cam, W };
  }).catch(e => { document.getElementById('err').textContent = 'Ошибка: ' + e; });
})();
