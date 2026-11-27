// Perspective only affects world-space drawing. Save data, collision and PDA coordinates stay on the ground
// plane.
const perspective = BIG && C1 && !/perspective-off/.test(location.hash);
const houseHeight = .115;
const walls = new Map(), canopyLayers = new WeakMap();
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
  weatherFacade(g,len,wood,rand);
  const sideDir = [[0, -1], [1, 0], [0, 1], [-1, 0]][side];
  const ds = (h.entrances || [])
                 .filter(e => e.nx === sideDir[0] && e.ny === sideDir[1])
                 .map(e => ({u: side % 2 ? e.y : e.x, w: e.width}));
  for (const door of ds) {
    const w = Math.min(door.w, len - 4), l = door.u - w / 2;
    if(BEREZKI && (h.loadingBay || h.baseRoom?.kind==='hangar'))continue;
    g.fillStyle = '#766b56';
    g.fillRect(l - 3, 22, w + 6, 66);
    g.fillStyle = '#211f1a';
    g.fillRect(l, 25, w, 63);
    g.fillStyle = '#4f483a';
    g.fillRect(l + 1, 27, w * .27, 59);
    if(BEREZKI && h.baseRoom){
      artFill(g,'floor_wood',l+w*.77,27,w*.22,58);
      beam(g,l+w*.77,27,l+w*.77,84,2,'#978c77');
    }
    g.fillStyle = '#a69b7f';
    g.fillRect(l + w * .19, 57, 2, 3);
  }
  const panes=(h.facadePanes ||= []);panes[side]=[];
  for (let i = 0, n = Math.max(1, Math.floor(len / 65)); i < n; i++) {
    const u = (i + .43 + .14*rand()) * len / n;
    if (ds.some(d => Math.abs(d.u - u) < d.w * (BEREZKI && (h.loadingBay || h.baseRoom?.kind==='hangar')?1:.5) + 18)) continue;
    panes[side].push(u);
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
    if(rand()<.68) {
      g.fillStyle='#161915'; g.beginPath();g.moveTo(l+1,24);g.lineTo(l+11,24);
      g.lineTo(l+8,30);g.lineTo(l+5,28);g.lineTo(l+1,39);g.fill();
      if(rand()<.64){g.save();g.translate(u,39);g.rotate((rand()-.5)*.64);
        artFill(g,'floor_wood',-16,-3,32,6);g.fillStyle='#41372b';g.fillRect(-12,-1,1,2);g.fillRect(10,-1,1,2);g.restore();}
    }
    g.fillStyle = '#a1987f';
    g.fillRect(l - 4, 52, 34, 2);
    g.fillStyle = 'rgba(26,23,19,.5)';
    g.fillRect(l - 3, 54, 32, 2);
  }
  g.fillStyle = 'rgba(50,44,36,.55)';
  g.fillRect(0, 79, len, 9);
  if(BEREZKI && (h.loadingBay || h.baseRoom?.kind==='hangar'))for(const d of ds)paintHangarGate(g,d);
  const dim = g.createLinearGradient(0, 0, 0, 88);
  dim.addColorStop(0, 'rgba(23,21,16,.64)');
  dim.addColorStop(.22, 'rgba(23,21,16,.10)');
  dim.addColorStop(1, 'rgba(23,21,16,.04)');
  g.fillStyle = dim;
  g.fillRect(0, 0, len, 88);
  if (h.storeys) winterFacade(c,h,ds);
  walls.set(key, c);
  return c;
}
function texturedFace(a, b, k, tex, light) {
  // Sample the whole facade once. Narrow independently resampled bands flicker
  // as the camera makes the projected wall a fraction of a pixel taller.
  const u = roofPoint(...a,k), v = roofPoint(...b,k);
  const dx=(a[0]+b[0]-u[0]-v[0])/2, dy=(a[1]+b[1]-u[1]-v[1])/2;
  ctx.save();
  ctx.beginPath();ctx.moveTo(...u);ctx.lineTo(...v);ctx.lineTo(...b);ctx.lineTo(...a);ctx.closePath();ctx.clip();
  ctx.imageSmoothingEnabled=true;
  ctx.transform((b[0]-a[0])/tex.width,(b[1]-a[1])/tex.width,dx/tex.height,dy/tex.height,a[0]-dx,a[1]-dy);
  const overhang=Math.ceil(k*tex.width/2)+1;
  ctx.drawImage(tex,0,0,1,tex.height,-overhang,0,overhang,tex.height);
  ctx.drawImage(tex,tex.width-1,0,1,tex.height,tex.width,0,overhang,tex.height);
  ctx.drawImage(tex,0,0);
  if(light)light(ctx);
  lampShadowOnWall(a,b,tex);
  ctx.restore();
}
function roofLift(h){
  if (BEREZKI && h.residenceWalls)return winterLens*48*h.storeys;
  if (h.storeys) return .105 * h.storeys;
  return houseHeight*(h.ruin ? .72 : h.mat==='depot' ? 1.55 : h.w*T<110 ? .68 : h.w*T>300 ? 1.12 : 1);
}
function clipRoofsFromLight(g,x,y,w,h,inView){
  for(const house of HOUSES){
    const width=house.w*T,height=house.h*T,left=house.x*T,top=house.y*T;
    if(house.a<.52 || !inView(left+width/2,top+height/2,Math.max(width,height)*.64+40))continue;
    const lift=perspective && ART?roofLift(house):0,[u,v]=roofPoint(left-3,top-3,lift);
    if(BEREZKI && house.residenceWalls && lift){
      const [rx,ry]=residencePoint(left,top,lift);
      g.beginPath();g.rect(x-4,y-4,w+8,h+8);g.rect(rx,ry,width*(1+lift),height*(1+lift));g.clip('evenodd');continue;
    }
    const roofY=v;
    g.beginPath();g.rect(x-4,y-4,w+8,h+8);g.rect(u,roofY,(width+6)*(1+lift),(height+6)*(1+lift));g.clip('evenodd');
  }
}
function drawRaisedHouse(h, i) {
  if(h.residenceWalls){drawResidence(h,i);return;}
  const x = h.x * T, y = h.y * T, w = h.w * T, d = h.h * T;
  const k=roofLift(h), corners = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const ends = [[0, 1], [1, 2], [3, 2], [0, 3]], vis = [cam.y<y, cam.x>x + w, cam.y > y + d, cam.x < x];
  h.litPanes=[];
  for (let s = 0; s < 4; s++)
    if (vis[s]) {
      const [a, b] = ends[s];
      const tex=wallTexture(h,s,s%2?d:w,h.mat!=='conc' && h.mat!=='depot','house');
      const panes=h.facadePanes[s],u=panes?.[Math.floor((panes.length-1)/2)];
      const lit=u!==undefined && (s===2 || s===(h.x+h.y)%2) && occupiedWindow(h);
      const pane=lit?facadePane(h,s,u,corners[a]):null;
      if(pane)h.litPanes.push(pane);
      texturedFace(corners[a],corners[b],k,tex,pane?g=>glowingPane(g,u,pane.wallX,pane.wallY,pane.nx,pane.ny):null);
    }
  lookoutPosts(h,x,y,w,d,k);
  const porch = h.entrances?.find(e => e.approach === 'porch');
  if (porch && h.porchDepth && cam.y > y + d) {
    const [u, v] = roofPoint(x + porch.x, y + d, k * .62);
    ctx.save();
    ctx.translate(u - porch.x - 3, v);
    drawPorch(ctx, porch, -2, 11);
    ctx.restore();
  }
  const roof = ROOFS[i], [rx, ry] = roofPoint(x - 3, y - 3, k);
  const surface = h.roofSurface || [w + 4, d + 4];
  const density = roof.width / (w + 10);
  ctx.drawImage(
      roof, 0, 0, surface[0] * density, surface[1] * density, rx, ry, (w + 6) * (1 + k), (d + 6) * (1 + k));
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
        const main = j === layer;
        const daylight = .965 + .034 * (j - 1) - .10 * (nx + ny);
        const gain = main ? daylight : .78, alpha = main ? 1 : .59;
        const target = pix[j].data;
        for (let channel = 0; channel < 3; channel++) target[i + channel] = fol.data[i + channel] * gain;
        target[i + 3] = fol.data[i + 3] * alpha;
      }
    }
  frames.forEach((a, j) => a.getContext('2d').putImageData(pix[j], 0, 0));
  canopyLayers.set(c, frames);
}
function drawLayeredCrown(s, x, y, w, h, kind) {
  const layers = canopyLayers.get(s);
  if (!layers) return drawAutumnCrown(s, x, y, w, h);
  const height = (kind.startsWith('c1_pine')     ? .12 :
                      kind.startsWith('c1_dead') ? .065 :
                                                   .096) *
      clamp(h / 150, .72, 1.2);
  // The trunk stays rooted; the pale upper branch and leaf clusters travel with the crown.
  drawAutumnCrown(layers[0], x, y, w, h);
  const tip = roofPoint(x, y, height * .68);
  ctx.save();
  ctx.strokeStyle = kind.startsWith('c1_birch') ? '#938975' : '#4c4537';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(...tip);
  ctx.stroke();
  ctx.restore();
  for (let j = 1; j < 4; j++) {
    const k = height * [0, .25, .63, 1][j], p = roofPoint(x, y, k);
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
// Build the clean counterpart with the same transform used by the original tree stamp.
function cacheCrownLayers(c, transform, spriteName, variant, width) {
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

// Heights are fractions of the camera distance. Draw silhouettes against their actual footprint.
const objectHeight = {
  bus: .043,
  car: .027,
  trafo: .049,
  freightWagon: .049,
  scrapCrane: .066,
  hatch: .05,
  pylon: .078,
  blocks: .015,
  sand: .012,
  bed: .009,
  table: .017,
  shelf: .032,
  bars: .023
};
const objectSurfaces = new WeakMap(), detailSurfaces = new Map(), unshadowedSurface = new WeakSet();
function detailHeight(id) {
  if (/yard_car|tractor|truck/.test(id)) return .03;
  if (/pole|reel|barrel|drum/.test(id)) return .017;
  if (/rock|bricks|log|sleepers|pipes|sandbags|boat|stump|junk|kettle|tires|wheel|churn|crate/.test(id))
    return .009;
  return 0;
}
function makeSurface(width, height, paint) {
  const top = document.createElement('canvas');
  top.width = Math.ceil(width * 1.5);
  top.height = Math.ceil(height * 1.5);
  const g = top.getContext('2d');
  g.scale(top.width / width, top.height / height);
  paint(g);
  c1Grade(top, 0, 0, top.width, top.height);
  const side = document.createElement('canvas');
  side.width = top.width;
  side.height = top.height;
  const flank = side.getContext('2d');
  flank.drawImage(top, 0, 0);
  flank.globalCompositeOperation = 'source-atop';
  flank.fillStyle = 'rgba(30,26,21,.49)';
  flank.fillRect(0, 0, side.width, side.height);
  return {top, side, width, height};
}
function raisedSprite(surface, x, y, k, angle = 0) {
  const {width: w, height: h, side, top} = surface;
  const [u, v] = roofPoint(x, y, k), dx = u - x, dy = v - y;
  const steps = Math.min(7, Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.8)));
  ctx.save();
  ctx.translate(x, y);
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, scale = 1 + k * t;
    ctx.save();
    ctx.translate(dx * t, dy * t);
    ctx.rotate(angle);
    ctx.drawImage(j === steps ? top : side, -w * scale / 2, -h * scale / 2, w * scale, h * scale);
    ctx.restore();
  }
  ctx.restore();
}
function worldDetail(id, x, y, w, angle) {
  const k = detailHeight(id);
  if (!k) return;
  const key = id + '/' + w;
  let surface = detailSurfaces.get(key);
  if (!surface) {
    const rect = ART.m.sprites[id].rect, h = w * rect[3] / rect[2];
    surface = makeSurface(w, h, g => c1Draw(g, id, w / 2, h / 2, w));
    detailSurfaces.set(key, surface);
  }
  raisedSprite(surface, x, y, k, angle);
}
function objectSurface(o) {
  let surface = objectSurfaces.get(o);
  if (surface) return surface;
  // Include the overhang of the crane jib, the bus bonnet and chipped concrete caps.
  const pad = o.k === 'scrapCrane' ? 4 * T : 18, w = o.w + 2 * pad, h = o.h + 2 * pad;
  surface = makeSurface(w, h, g => {
    g.translate(pad - o.x, pad - o.y);
    // The silhouette supplies side faces. Its ground shadow is already in the terrain chunk.
    unshadowedSurface.add(g);
    try {
      paintStaticObject(g, o);
    } finally {
      unshadowedSurface.delete(g);
    }
  });
  objectSurfaces.set(o, surface);
  return surface;
}
// Pre-cut feathered height bands once. The full-resolution silhouette and its contact
// point stay intact as the upper parts move. Canvas doesn't have to tessellate alpha sprites.
const reliefBands = new WeakMap();
function reliefPatch(image, x, y, w, h, angle, profile, amplitude) {
  let bands = reliefBands.get(image);
  if (!bands) {
    const size = Math.min(1, 640 / Math.max(image.width, image.height));
    const base = document.createElement('canvas');
    base.width = Math.round(image.width * size);
    base.height = Math.round(image.height * size);
    const g = base.getContext('2d');
    g.drawImage(image, 0, 0, base.width, base.height);
    c1Grade(base, 0, 0, base.width, base.height);
    const pixels = g.getImageData(0, 0, base.width, base.height), levels = 6;
    const heights = new Float32Array(base.width * base.height);
    let low = 0, high = 0;
    for (let j = 0; j < base.height; j++)
      for (let i = 0; i < base.width; i++) {
        const z = profile(i / (base.width - 1), j / (base.height - 1));
        heights[j * base.width + i] = z;
        low = Math.min(low, z);
        high = Math.max(high, z);
      }
    bands = [];
    for (let n = 0; n < levels; n++) {
      const z = low + (high - low) * n / (levels - 1);
      const c = document.createElement('canvas');
      c.width = base.width;
      c.height = base.height;
      const cg = c.getContext('2d'), p = cg.createImageData(c.width, c.height);
      for (let i = 0; i < heights.length; i++) {
        const t = (heights[i] - low) * (levels - 1) / (high - low || 1);
        const coverage = n === 0 ? 1 : clamp(t - n + 1, 0, 1);
        if (!coverage) continue;
        const ix = i * 4;
        p.data[ix] = pixels.data[ix];
        p.data[ix + 1] = pixels.data[ix + 1];
        p.data[ix + 2] = pixels.data[ix + 2];
        // Feathering inside the same surface fills newly visible back slopes.
        // On transparent fringes distribute coverage to avoid darkening the outline.
        const alpha = pixels.data[ix + 3] / 255;
        p.data[ix + 3] =
            255 * coverage * (alpha > .96 ? alpha : 1 - (1 - alpha) ** (1 / Math.max(1, 1 + t)));
      }
      cg.putImageData(p, 0, 0);
      bands.push({image: c, z});
    }
    reliefBands.set(image, bands);
  }
  for (const layer of bands) {
    const k = amplitude * layer.z, [cx, cy] = roofPoint(x, y, k);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(1 + k, 1 + k);
    ctx.drawImage(layer.image, -w * .5, -h * .5, w, h);
    ctx.restore();
  }
}
function ridge(u, v) {
  const xx = 2 * u - 1, yy = 2 * v - 1;
  return Math.max(0, 1 - xx * xx - yy * yy) ** 2 * (1 + .16 * Math.sin(8 * u + 4 * v));
}
function gateHeightAt(u, v) {
  const hill = .038 * ridge(u, v);
  const inner = clamp((.18 - Math.abs(u - .5)) / .075, 0, 1);
  const stairs = clamp((v - .19) / .11, 0, 1) * clamp((.85 - v) / .45, 0, 1);
  const leaf = Math.max(0, 1 - Math.abs(Math.abs(u - .5) - .285) / .12) * clamp((v - .14) / .14, 0, 1) *
      clamp((.82 - v) / .14, 0, 1);
  return hill + .032 * leaf - .075 * inner * stairs;
}
function drawWorldRelief(inView) {
  const visible = (x, y, r) => inView(x, y, r + 35);
  for (const [x, y, w, h, a] of dumpHills) {
    if (!lesserSprites.slag || !visible(x * T, y * T, w * T * .6)) continue;
    ctx.save();
    reliefPatch(lesserSprites.slag, x * T, y * T, w * T, h * T, a, ridge, .084);
    ctx.restore();
  }
  for (const [id, tx, ty, w, a] of CORDON_DETAILS)
    if (visible(tx * T, ty * T, w)) worldDetail(id, tx * T, ty * T, w, a);
  for (const [kind, tx, ty, a] of DECOR) {
    const entry = C1DECOR[kind];
    if (entry && visible(tx * T, ty * T, entry[1])) worldDetail(entry[0], tx * T, ty * T, entry[1], a);
  }
  for (const o of objs) {
    const x = o.x + o.w / 2, y = o.y + o.h / 2, k = objectHeight[o.k];
    if (!(k || o.k === 'fence') || !visible(x, y, Math.max(o.w, o.h) / 2 + 64)) continue;
    if (o.k === 'fence') {
      if(o.material==='railMesh'){drawHighWire(o);continue;}
      const vertical = o.h > o.w, len = vertical ? o.h : o.w, n = Math.ceil(len / 52),
            height = o.material === 'stockade' ? .043 : .024;
      for (let i = 0; i <= n; i++)
        posts(vertical ? x : o.x + len * i / n, vertical ? o.y + len * i / n : y, height, 1.45, '#595448');
      const a = roofPoint(vertical ? x : o.x, vertical ? o.y : y, height);
      const b = roofPoint(vertical ? x : o.x + len, vertical ? o.y + len : y, height);
      ctx.strokeStyle = '#777364';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    } else if (o.k === 'freightWagon' && o.sprite === 'wagon' && lesserSprites.wagon) {
      drawFreightBody(o);
    } else if (o.k === 'hatch' && gateTerrain) {
      reliefPatch(gateTerrain, x, y, o.w, o.h, 0, gateHeightAt, 1);
    } else {
      if (o.k === 'pylon') posts(x, y, k, 2, '#787364');
      if (o.k === 'pylon') {
        const top = roofPoint(x, y, k);
        c1Draw(ctx, 'c1_pole_conc', ...top, 44, (o.x * 7 % 3) * .2);
      } else
        raisedSprite(objectSurface(o), x, y, k);
    }
  }
  if (lesserSprites.barge && visible(35.1 * T, (LESSER_TOP + 82) * T, 180)) {
    const hull = lesserSprites.barge;
    reliefPatch(hull, 35.1 * T, (LESSER_TOP + 82) * T, 324, 324 * hull.height / hull.width, 0, ridge, .033);
  }
  for (const sign of trailSigns) {
    const x = sign.x * T, y = sign.y * T;
    if (!visible(x, y, 50)) continue;
    const [u, v] = roofPoint(x, y, .025), sx = (x - u) / 30, sy = (y - v) / 30;
    // Shear about the foot of the sign; its lettering travels with the board.
    ctx.save();
    ctx.transform(1, 0, sx, 1 + sy, -sx * y, -sy * y);
    drawTrailSign(ctx, sign);
    ctx.restore();
  }
  for (const {kind, x, y, radius} of lesserLandmarks)
    if (visible(x * T, (LESSER_TOP + y) * T, radius * 1.3))
      raisedLandmark(kind, x * T, (LESSER_TOP + y) * T, radius);
  for (const [x, y] of dumpTanks)
    if (visible(x * T, y * T, 76)) raisedLandmark('tank', x * T, y * T, 1.125 * T);
}
function raisedLandmark(kind, x, y, r) {
  const image = lesserSprites[kind];
  if (!image) return;
  const k = 2 * r / Math.max(image.width, image.height), w = image.width * k, h = image.height * k;
  const height = {mill: .118, dome: .103, antenna: .14, silo: .085, tank: .047}[kind];
  groundShadow(ctx, x, y, w * .42, h * .31, 0, 4);
  reliefPatch(image, x, y, w, h, 0, ridge, height);
}
function ballastSlope(g, x, y, w, h) {
  const side = g.createLinearGradient(0, y, 0, y + h);
  for (const [at, c] of [
           [0, 'transparent'], [.1, 'rgba(196,173,121,.29)'], [.29, 'transparent'], [.66, 'transparent'],
           [.82, 'rgba(43,35,26,.23)'], [.94, 'rgba(34,31,23,.38)'], [1, 'transparent']])
    side.addColorStop(at, c);
  g.fillStyle = side;
  g.fillRect(x, y, w, h);
}
// Sample relief in world coordinates, before roads and props. The light comes from the north-west.
// Local landforms are in tile coordinates. Roads, wetlands and yards taper back to level.
const knolls = [
  [WEST + 39, NORTH_ROWS + 43, 13, 6, -.3], [WEST + 74, NORTH_ROWS + 105, 10, 7, .5],
  [WEST + 177, NORTH_ROWS + 78, 19, 8, -.65], [WEST + 197, NORTH_ROWS + 174, 14, 6, .32],
  [64, LESSER_TOP + 20, 14, 5, .35], [117, LESSER_TOP + 62, 12, 8, -.45], [143, LESSER_TOP + 2, 18, 5, -.4],
  [313, 67, 14, 6, .23], [354, 88, 9, 5, -.73]
];
let hillshade;
function paintHills(g) {
  if (!hillshade) {
    const step = 2, im = document.createElement('canvas');
    im.width = PW * step;
    im.height = MH * step;
    const gc = im.getContext('2d'), pix = gc.createImageData(im.width, im.height);
    const terrain = autumnTerrain();
    for (let y = 0; y < im.height; y++)
      for (let x = 0; x < im.width; x++) {
        const tx = Math.floor(x / step), ty = Math.floor(y / step), tile = ty * MW + tx;
        if (!GROUNDISH(map[tile])) continue;
        const region = ty < NORTH_ROWS ? 1.5 : tx < WEST ? .91 : 1.1;
        const exposure = Math.min(1, terrain.water[tile] / 5, terrain.verge[tile] / 3);
        const slope = (vnoise(x * 2 + 2, y * 2 + 2, 43) - vnoise(x * 2 - 2, y * 2 - 2, 43)) * .94 +
            (vnoise(x * 2 + 2, y * 2 + 1, 20) - vnoise(x * 2 - 2, y * 2 - 1, 20)) * .34;
        const i = (y * im.width + x) * 4, lit = slope > 0;
        pix.data[i] = lit ? 212 : 38;
        pix.data[i + 1] = lit ? 190 : 34;
        pix.data[i + 2] = lit ? 143 : 26;
        pix.data[i + 3] = Math.min(66, Math.abs(slope) * 450 * region) * exposure;
      }
    for (const [cx, cy, rx, ry, a] of knolls) {
      const radius = Math.ceil(Math.max(rx, ry) * 1.15), sn = Math.sin(a), cs = Math.cos(a);
      for (let j = (cy - radius) * step; j < (cy + radius) * step; j++)
        for (let i = (cx - radius) * step; i < (cx + radius) * step; i++) {
          if (j < 0 || i < 0 || j >= im.height || i >= im.width) continue;
          const tile = (j / step | 0) * MW + (i / step | 0);
          if (!GROUNDISH(map[tile])) continue;
          const dx = i / step - cx, dy = j / step - cy, u = (dx * cs + dy * sn) / rx,
                v = (dy * cs - dx * sn) / ry;
          const r = u * u + v * v + .09 * Math.sin(4 * u + 3 * v);
          if (r >= 1) continue;
          const light = -(u * (cs + sn) + v * (cs - sn)) * (1 - r);
          const ix = (j * im.width + i) * 4;
          const weight = Math.min(1, terrain.water[tile] / 5, terrain.verge[tile] / 3);
          pix.data[ix] = light > 0 ? 220 : 36;
          pix.data[ix + 1] = light > 0 ? 198 : 32;
          pix.data[ix + 2] = light > 0 ? 157 : 27;
          pix.data[ix + 3] = Math.min(85, Math.abs(light) * 175) * weight;
        }
    }
    gc.putImageData(pix, 0, 0);
    hillshade = im;
  }
  const {x0, y0, x1, y1} = GWP, k = hillshade.width / (PW * T);
  g.drawImage(hillshade, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, x0, y0, x1 - x0, y1 - y0);
}

// The rail goes over the Cordon highway. Abutments sit on the existing railway banks.
// Fade the deck locally underfoot as with house roofs, so the gate and actors remain readable.
function liftContainer(o, paint) {
  const height = o.k === 'safe' ? .026 : .014, x = o.x + o.w / 2, y = o.y + o.h / 2;
  const [dx,dy]=BEREZKI ? winterParallax(x,y,o.k==='safe'?28:18) : [(x-cam.x)*height,(y-cam.y)*height];
  ctx.save();
  ctx.translate(dx * .4, dy * .4);
  paint(o);
  ctx.translate(dx * .6, dy * .6);
  paint(o);
  ctx.restore();
}

// Wheelsets and buffers sit on the track independently of the raised wagon body.
function drawFreightBody(o) {
  const k = objectHeight.freightWagon, img = lesserSprites[o.sprite], x0 = o.x + o.w * .05,
        x1 = o.x + o.w * .95, y0 = o.y + o.h * .09, y1 = o.y + o.h * .90;
  for (const [u, v, w, h] of [[0, .9, 1, .1], [0, .32, .049, .32], [.951, .32, .049, .32]])
    ctx.drawImage(
        img, u * img.width, v * img.height, w * img.width, h * img.height, o.x + u * o.w, o.y + v * o.h,
        w * o.w, h * o.h);
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
