// The station uses the same world pixels, actor scale and camera zoom as the campaign.
const stationHeight = 0.16;
const walls = new Map(), canopyLayers = new WeakMap();
const stationContains = (x, y) => x >= 155 * T && x < 246 * T && y >= 36 * T && y < 80 * T;
let stationFixtures;
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
  const sideDir = [[0, -1], [1, 0], [0, 1], [-1, 0]][side];
  const ds = (h.entrances || [])
                 .filter(e => e.nx === sideDir[0] && e.ny === sideDir[1])
                 .map(e => ({u: side % 2 ? e.y : e.x, w: e.width}));
  for (const door of ds) {
    const w = Math.min(door.w, 36), l = door.u - w / 2;
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
    const u = (i + .5) * len / n;
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
  // Horizontal strips follow the four projected corners; doors meet their original sill.
  const u = roofPoint(...a, k), v = roofPoint(...b, k);
  const N = 8;
  for (let j = 0; j < N; j++) {
    let t = j / N, s = (j + 1) / N, ax = lerp(u[0], a[0], t), ay = lerp(u[1], a[1], t),
        bx = lerp(v[0], b[0], t), by = lerp(v[1], b[1], t), dx = lerp(u[0], a[0], s),
        dy = lerp(u[1], a[1], s);
    ctx.save();
    ctx.transform((bx - ax) / tex.width, (by - ay) / tex.width, dx - ax, dy - ay, ax, ay);
    ctx.drawImage(tex, 0, t * tex.height, tex.width, tex.height / N, 0, 0, tex.width, 1.1);
    ctx.restore();
  }
}
function drawStationHouse(h, i) {
  const x = h.x * T, y = h.y * T, w = h.w * T, d = h.h * T;
  const k = stationHeight * (w > 300 ? 1.12 : 1), corners = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const ends = [[0, 1], [1, 2], [3, 2], [0, 3]], vis = [cam.y<y, cam.x>x + w, cam.y > y + d, cam.x < x];
  for (let s = 0; s < 4; s++)
    if (vis[s]) {
      const [a, b] = ends[s];
      texturedFace(corners[a], corners[b], k, wallTexture(h, s, s % 2 ? d : w, h.mat !== 'conc', 'house'));
    }
  const roof = ROOFS[i], wall = Math.min(20, 10 + h.h * 1.4), [rx, ry] = roofPoint(x - 3, y - 3, k);
  // Remove the old permanent south facade from this stamp so it is not drawn twice.
  ctx.drawImage(roof, 0, 0, (w + 4) * 2, (d + 4 - wall) * 2, rx, ry, (w + 6) * (1 + k), (d + 6) * (1 + k));
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
        const main = j === layer, gain = main ? 1 : .79, alpha = main ? 1 : .59;
        const target = pix[j].data;
        for (let channel = 0; channel < 3; channel++) target[i + channel] = fol.data[i + channel] * gain;
        target[i + 3] = fol.data[i + 3] * alpha;
      }
    }
  frames.forEach((a, j) => a.getContext('2d').putImageData(pix[j], 0, 0));
  canopyLayers.set(c, frames);
}
function leaves(s, x, y, w, h) {
  const layers = canopyLayers.get(s);
  if (!layers) return drawAutumnCrown(s, x, y, w, h);
  for (let j = 0; j < 4; j++) {
    let k = stationHeight * [0, .16, .37, .59][j], p = roofPoint(x, y, k);
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
function drawStationFixtures() {
  if (!stationFixtures)
    stationFixtures = objs.filter(
        o => stationContains(o.x + o.w / 2, o.y + o.h / 2) &&
            (o.k === 'freightWagon' || o.k === 'fence' || o.k === 'pylon'));
  const halfWidth = VW / (2 * Z), halfHeight = VH / (2 * Z);

  for (const o of stationFixtures) {
    let x = o.x + o.w / 2, y = o.y + o.h / 2;
    if (Math.abs(x - cam.x) > halfWidth + o.w || Math.abs(y - cam.y) > halfHeight + o.h) continue;
    if (o.k === 'freightWagon') {
      const k = stationHeight * .30, img = lesserSprites[o.sprite], x0 = o.x + o.w * .05,
            x1 = o.x + o.w * .95, y0 = o.y + o.h * .09, y1 = o.y + o.h * .90;
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
    if (o.k === 'fence' && o.material) {
      let vertical = o.h > o.w, n = Math.ceil(Math.max(o.h, o.w) / 55);
      for (let j = 0; j <= n; j++) {
        posts(
            vertical ? x : o.x + j * o.w / n, vertical ? o.y + j * o.h / n : y, stationHeight * .19, 1.5,
            '#514d41');
      }
      let a = roofPoint(vertical ? x : o.x, vertical ? o.y : y, stationHeight * .17),
          b = roofPoint(vertical ? x : o.x + o.w, vertical ? o.y + o.h : y, stationHeight * .17);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#827f70';
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    }
    if (o.k === 'pylon') posts(x, y, stationHeight * .72, 2.2, '#686457');
  }
  // The taller timber upright shares the packhouse fence's south-east corner.
  const poleX = 194 * T, poleY = 69.8 * T;
  if (Math.abs(cam.x - poleX) < halfWidth + 30 && Math.abs(cam.y - poleY) < halfHeight + 30) {
    posts(poleX, poleY, stationHeight * .5, 2.2, '#595343');
    const top = roofPoint(poleX, poleY, stationHeight * .5);
    c1Draw(ctx, 'c1_pole_wood', ...top, 23, .12);
  }
  for (const [id, x, y, w, angle] of CORDON_DETAILS)
    if (id === 'c1_yard_car' && stationContains(x * T, y * T) && Math.abs(x * T - cam.x) < halfWidth + w &&
        Math.abs(y * T - cam.y) < halfHeight + w) {
      carBody(x * T, y * T, w, angle);
    }
}
// Warp the roof, windscreen and bonnet at separate heights; the wheel footprint stays fixed.
function carBody(x, y, w, ang) {
  let im = walls.get('carImage');
  if (!im) {
    const s = ART.m.sprites.c1_yard_car;
    im = document.createElement('canvas');
    im.width = 200;
    im.height = 122;
    im.getContext('2d').drawImage(ART.images[s.atlas], ...s.rect, 0, 0, 200, 122);
    c1Grade(im, 0, 0, 200, 122);
    walls.set('carImage', im);
  }
  const X = [0, 13, 40, 57, 119, 146, 186, 200], Y = [0, 16, 26, 72, 95, 109, 122],
        zl = [0, .05, .07, .19, .19, .08, .05, 0], zw = [0, .32, 1, 1, .72, .31, 0];
  const pt = (i, j) => {
    const dx = (X[i] - 100) * w / 200, dy = (Y[j] - 61) * w / 200;
    return roofPoint(
        x + dx * Math.cos(ang) - dy * Math.sin(ang), y + dx * Math.sin(ang) + dy * Math.cos(ang),
        stationHeight * zl[i] * zw[j]);
  };
  function tri(a, b, c, u, v, width, height, inverse) {
    const sx = (inverse ? -1 : 1) / width, sy = (inverse ? -1 : 1) / height;
    const A = (b[0] - a[0]) * sx, B = (b[1] - a[1]) * sx, C = (c[0] - a[0]) * sy, D = (c[1] - a[1]) * sy;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.lineTo(...c);
    ctx.closePath();
    ctx.clip();
    ctx.transform(A, B, C, D, a[0] - A * u - C * v, a[1] - B * u - D * v);
    ctx.drawImage(im, 0, 0);
    ctx.restore();
  }
  for (let j = 0; j < Y.length - 1; j++)
    for (let i = 0; i < X.length - 1; i++) {
      const a = pt(i, j), b = pt(i + 1, j), c = pt(i, j + 1), d = pt(i + 1, j + 1), du = X[i + 1] - X[i],
            dv = Y[j + 1] - Y[j];
      tri(a, b, c, X[i], Y[j], du, dv, false);
      tri(d, c, b, X[i + 1], Y[j + 1], du, dv, true);
    }
}

// Build the clean counterpart with the same transform used by the original tree stamp.
function cacheStationCrown(c, transform, spriteName, variant, width) {
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
