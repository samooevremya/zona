"""Пакет C1 (графика Кордона от GPT): удаление зелёного фона, нарезка листов, бесшовная земля,
сборка атласов и манифеста window.C1_MANIFEST (art/c1/c1.inline.js).
Запуск: python3 tools/c1_build.py <папка с распакованными блоками>"""
import sys, os, glob, json, base64, io
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'c1')
os.makedirs(os.path.join(OUT, 'src'), exist_ok=True)

def find(name):
    f = glob.glob(os.path.join(SRC, '*', name + '.png'))
    assert f, name
    return f[0]

# ---------- зелёный фон ----------
def key_green(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(R, B)
    pure = (G > 170) & (R < 110) & (B < 110) & (G - mx > 90)          # явный хромакей: в рисунке таких цветов нет
    greenish = (G - mx > 28) & (G > 90)
    # фон = явный хромакей + зелёные пиксели, соединённые с ним (сглаженный край)
    lab, n = ndimage.label(greenish | pure)
    keep = np.zeros(n + 1, bool)
    keep[np.unique(lab[pure])] = True; keep[0] = False
    bg = keep[lab]
    # мягкая альфа на границе: по «зелёности» в полосе 3 px вокруг фона
    near = ndimage.binary_dilation(bg, iterations=3) & ~bg
    d = G - mx
    alpha = np.ones_like(G)
    alpha[bg] = 0
    t = np.clip((d - 10) / 90.0, 0, 1)
    alpha[near] = 1 - t[near]
    # убрать зелёный отсвет у краёв
    edge = (alpha < 1) | ndimage.binary_dilation(bg, iterations=4)
    sp = edge & (G > mx)
    G2 = G.copy(); G2[sp] = mx[sp] + (G[sp] - mx[sp]) * 0.15
    rgba = np.dstack([R, G2, B, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def soften_alpha(im, r):
    a = np.asarray(im).copy()
    al = Image.fromarray(a[..., 3]).filter(ImageFilter.GaussianBlur(r))
    al = np.minimum(np.asarray(al), a[..., 3])
    a[..., 3] = al
    return Image.fromarray(a, 'RGBA')

# ---------- нарезка листа на объекты ----------
def slice_sheet(im, expect, merge=10, min_frac=0.003):
    a = np.asarray(im)[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=merge))
    objs = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        area = (a[sl] & (lab[sl] == i)).sum()
        if area < a.size * min_frac: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        objs.append((y0, y1, x0, x1))
    # строки сверху вниз, внутри строки слева направо
    objs.sort(key=lambda o: (o[0] + o[1]) / 2)
    rows, cur = [], []
    for o in objs:
        if cur and (o[0] + o[1]) / 2 - (cur[-1][0] + cur[-1][1]) / 2 > (o[1] - o[0]) * 0.5: rows.append(cur); cur = []
        cur.append(o)
    if cur: rows.append(cur)
    out = []
    for r in rows:
        for y0, y1, x0, x1 in sorted(r, key=lambda o: o[2]):
            out.append(im.crop((x0, y0, x1, y1)))
    if expect and len(out) != expect: print('  ! %d objects, expected %d' % (len(out), expect))
    return out

def trim(im):
    bb = im.getbbox(); return im.crop(bb) if bb else im

def fit(im, long_side):
    w, h = im.size; k = long_side / max(w, h)
    return im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS) if k < 1 else im

# ---------- бесшовная земля ----------
def periodic(arr, axis, frac=0.5):
    n = arr.shape[axis]
    rolled = np.roll(arr, n // 2, axis=axis)
    x = np.arange(n) / n
    w = np.clip(np.abs(x - 0.5) * 2, 0, 1)              # 0 в середине, 1 у краёв
    w = np.clip((w - (1 - frac)) / frac, 0, 1)            # переход только у краёв
    w = w * w * (3 - 2 * w)
    shape = [1, 1, 1]; shape[axis] = n
    w = w.reshape(shape)
    return arr * (1 - w) + rolled * w

def seamless(im, axes=(0, 1), frac=0.45):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    for ax in axes: a = periodic(a, ax, frac)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

SPR = {}     # id → (Image, logicalSize [w,h] в игровых px, extra)
MAT = {}     # id → (Image, size в игровых px на период)
def add(id, im, logical, **kw):
    SPR[id] = (im, logical, kw); im.save(os.path.join(OUT, 'src', id + '.png'))
def addm(id, im, size):
    MAT[id] = (im, size); im.save(os.path.join(OUT, 'src', 'mat_' + id + '.png'))

print('земля')
addm('grass', seamless(Image.open(find('ground_grass'))).resize((512, 512), Image.LANCZOS), 512)
addm('grass_dry', seamless(Image.open(find('ground_grass_dry'))).resize((512, 512), Image.LANCZOS), 512)
addm('dirt', seamless(Image.open(find('ground_mud'))).resize((512, 512), Image.LANCZOS), 448)
addm('forest', seamless(Image.open(find('ground_forest'))).resize((512, 512), Image.LANCZOS), 512)
addm('swamp', seamless(Image.open(find('ground_swamp'))).resize((512, 512), Image.LANCZOS), 448)
addm('water', seamless(Image.open(find('ground_water'))).resize((512, 512), Image.LANCZOS), 384)
addm('floor_concrete', seamless(Image.open(find('ground_concrete'))).resize((512, 512), Image.LANCZOS), 384)
# асфальт: полоса без разметки, отражённая в квадрат, затем бесшовная по вертикали
asp = Image.open(find('ground_asphalt')).convert('RGB')
A = np.asarray(asp).astype(np.float32)
col = A.mean(axis=(0, 2)); W = A.shape[1]
lane = asp.crop((int(W * 0.31), 0, int(W * 0.47), A.shape[0]))
sq = Image.new('RGB', (lane.width * 2, lane.height)); sq.paste(lane, (0, 0)); sq.paste(lane.transpose(Image.FLIP_LEFT_RIGHT), (lane.width, 0))
sq = seamless(sq, axes=(0,))
addm('asphalt', sq.resize((256, 512), Image.LANCZOS).resize((512, 512), Image.LANCZOS), 320)
# насыпь: полоса щебня с рельсами, бесшовная по горизонтали
rail = Image.open(find('ground_rail')).convert('RGB')
ra = np.asarray(rail).astype(np.float32).mean(axis=(1, 2))
band = rail.crop((0, int(rail.height * 0.30), rail.width, int(rail.height * 0.72)))
band = seamless(band, axes=(1,))
addm('rail', band.resize((768, round(768 * band.height / band.width)), Image.LANCZOS), 0)
# асфальтовая полоса целиком (для шоссе с разметкой и обочинами), вертикально бесшовная
road = seamless(asp.crop((int(W * 0.22), 0, int(W * 0.78), A.shape[0])), axes=(0,))
addm('road', road.resize((288, 512), Image.LANCZOS), 0)

print('растительность')
def sheet(name, expect, merge=10):
    im = key_green(find(name)); return [trim(x) for x in slice_sheet(im, expect, merge)]
for i, im in enumerate(sheet('tree_pine', 4)): add('c1_pine%d' % i, fit(im, 256), [104, 104])
for i, im in enumerate(sheet('tree_birch', 4, 14)): add('c1_birch%d' % i, fit(im, 240), [96, 96])
for i, im in enumerate(sheet('tree_dead', 4, 16)): add('c1_dead%d' % i, fit(im, 240), [92, 92])
for i, im in enumerate(sheet('tree_fallen', 3, 12)): add('c1_log%d' % i, fit(im, 256), [120, 40])
for i, im in enumerate(sheet('bush', 4)): add('c1_bush%d' % i, fit(im, 128), [40, 40])
for i, im in enumerate(sheet('grass_tufts', 6, 8)): add('c1_tuft%d' % i, fit(im, 96), [26, 26])
st = sheet('stump_rock', 6)
for i, im in enumerate(st[:3]): add('c1_stump%d' % i, fit(im, 96), [28, 28])
for i, im in enumerate(st[3:]): add('c1_rock%d' % i, fit(im, 96), [30, 30])

print('постройки')
for i, im in enumerate(sheet('house_village_roof', 3, 6)): add('c1_roof_house%d' % i, fit(im, 640), [256, 192])
for i, im in enumerate(sheet('shed_roof', 2, 6)): add('c1_roof_shed%d' % i, fit(im, 320), [128, 128])
add('c1_roof_barn', fit(trim(key_green(find('farm_barn_roof'))), 900), [512, 256])
add('c1_roof_hangar', fit(trim(key_green(find('atp_hangar_roof'))), 900), [640, 384])
add('c1_roof_office', fit(trim(key_green(find('atp_office_roof'))), 640), [320, 256])
for i, im in enumerate(sheet('booth', 3, 6)): add('c1_booth%d' % i, fit(im, 192), [96, 96])
add('c1_hatch', fit(trim(key_green(find('bunker_hatch'))), 256), [48, 48])
add('c1_pump', fit(trim(key_green(find('pump_tower'))), 384), [192, 192])
add('c1_tower', fit(trim(key_green(find('hunter_tower'))), 256), [128, 128])
add('c1_ford', fit(trim(soften_alpha(key_green(find('ford')), 4)), 512), [256, 256])
add('c1_tunnel', fit(trim(key_green(find('tunnel_mouth'))), 512), [320, 448])
add('c1_bridge', fit(trim(key_green(find('bridge_rail'))), 900), [704, 448])

print('объекты')
add('c1_bus', fit(trim(key_green(find('bus_wreck'))), 512), [384, 96])
cars = sheet('car_wrecks', 4, 6)
for i, im in enumerate(cars[:3]): add('c1_car%d' % i, fit(im, 256), [160, 96])
add('c1_tractor', fit(cars[3], 256), [160, 96])
for i, im in enumerate(sheet('army_wrecks', 3, 6)): add('c1_army%d' % i, fit(im, 320), [192, 96])
fim = key_green(find('fences')); fen = []
for r in range(3):
    for c in range(2): fen.append(trim(fim.crop((c * fim.width // 2, r * fim.height // 3, (c + 1) * fim.width // 2, (r + 1) * fim.height // 3))))
names = ['picket', 'picket_br', 'concrete', 'concrete_br', 'mesh', 'mesh_br']
# в листе: слева целые, справа сломанные (2 колонки × 3 строки)
for nm, im in zip(['picket', 'picket_br', 'concrete', 'concrete_br', 'mesh', 'mesh_br'], fen): add('c1_fence_' + nm, fit(im, 512), [256, 32])
props = sheet('props_small', 8, 6)
for nm, im in zip(['crate', 'crate_army', 'barrel', 'tires', 'sandbags', 'bricks', 'fridge', 'junk'], props): add('c1_' + nm, fit(im, 128), [64, 64])
add('c1_campfire', fit(trim(key_green(find('campfire'))), 192), [96, 96])
for nm, im in zip(['pole_wood', 'pole_conc', 'lamp'], sheet('power_pole', 3, 6)): add('c1_' + nm, fit(im, 128), [64, 64])
add('c1_checkpoint', fit(trim(key_green(find('checkpoint'))), 512), [256, 128])
for i, im in enumerate(sheet('decals', 6, 4)): add('c1_decal%d' % i, fit(soften_alpha(im, 3), 192), [128, 128])

# лужи для болота: вода с мягкой неровной кромкой
wat = Image.open(find('ground_water')).convert('RGB')
rng = np.random.default_rng(5)
for i in range(3):
    S = 160; yy, xx = np.mgrid[0:S, 0:S] / S - 0.5
    ang = np.arctan2(yy, xx); r = np.hypot(xx, yy)
    rad = 0.36 + sum(rng.uniform(0.02, 0.06) * np.sin(k * ang + rng.uniform(0, 6.28)) for k in (2, 3, 5))
    al = np.clip((rad - r) / 0.07, 0, 1)
    crop = wat.crop((i * 300, i * 200, i * 300 + 320, i * 200 + 320)).resize((S, S), Image.LANCZOS)
    a_ = np.dstack([np.asarray(crop), (al * 235).astype(np.uint8)])
    add('c1_pool%d' % i, Image.fromarray(a_, 'RGBA'), [96, 96])

# ---------- атласы (простая укладка полками) ----------
def pack(items, W=2048):
    items = sorted(items, key=lambda kv: -kv[1].size[1])
    x = y = sh = 0; pos = {}
    for k, im in items:
        w, h = im.size
        if x + w + 2 > W: x = 0; y += sh + 2; sh = 0
        pos[k] = (x, y, w, h); x += w + 2; sh = max(sh, h)
    H = y + sh
    atl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k, im in items: atl.paste(im, pos[k][:2])
    return atl, pos

def webp_uri(im, q=86):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())

man = {'version': 'c1-1', 'images': {}, 'sprites': {}}
groups = {
  'c1veg': [k for k in SPR if k.startswith(('c1_pool', 'c1_pine', 'c1_birch', 'c1_dead', 'c1_log', 'c1_bush', 'c1_tuft', 'c1_stump', 'c1_rock'))],
  'c1bld': [k for k in SPR if k.startswith(('c1_roof', 'c1_booth', 'c1_hatch', 'c1_pump', 'c1_tower', 'c1_ford', 'c1_tunnel', 'c1_bridge'))],
}
groups['c1prop'] = [k for k in SPR if not any(k in v for v in groups.values())]
total = 0
for g, keys in groups.items():
    atl, pos = pack([(k, SPR[k][0]) for k in keys])
    uri, n = webp_uri(atl); total += n
    man['images'][g] = {'file': uri}
    for k in keys:
        im, logical, kw = SPR[k]
        # логический размер: вписать картинку в заданный бокс без искажения
        w, h = im.size; s = min(logical[0] / w, logical[1] / h)
        man['sprites'][k] = {'kind': 'sprite', 'atlas': g, 'rect': list(pos[k]), 'logicalSize': [round(w * s), round(h * s)], 'pivot': [0.5, 0.5]}
    print(g, atl.size, n // 1024, 'KB')
# материалы: каждый отдельной картинкой, период в игровых px
for k, (im, size) in MAT.items():
    uri, n = webp_uri(im, 84); total += n
    man['images']['c1m_' + k] = {'file': uri}
    man['sprites'][k] = {'kind': 'material', 'atlas': 'c1m_' + k, 'rect': [0, 0, im.width, im.height], 'logicalSize': [size or im.width, size or im.height], 'pivot': [0.5, 0.5], 'seamless': True}
print('итого', total // 1024, 'KB,', len(man['sprites']), 'элементов')
open(os.path.join(OUT, 'c1.inline.js'), 'w').write('window.C1_MANIFEST=' + json.dumps(man, ensure_ascii=False) + ';\n')
json.dump({k: v for k, v in man['sprites'].items()}, open(os.path.join(OUT, 'sprites.json'), 'w'), ensure_ascii=False, indent=1)
