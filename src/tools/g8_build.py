"""Пакет G8 (персонажи, мутанты, Сидорович, оружие, HUD от GPT, блоки 5–7).
Удаляет зелёный фон, режет листы, подгоняет масштаб под прежние кадры G7 и пишет
art/g8/g8.inline.js — патч поверх CORDON_G31 (кадры, иконки, UI) и CORDON_RIG (части рига).
Запуск: python3 tools/g8_build.py <распакованный архив>"""
import sys, os, json, base64, io
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'art', 'g8'); os.makedirs(os.path.join(OUT, 'src'), exist_ok=True)
PX = 3          # пикселей на игровую единицу в выходных PNG/WebP (было 2)
P = lambda *a: os.path.join(SRC, *a)

# ---------- хромакей ----------
def key_green(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(R, B)
    pure = (G > 170) & (R < 120) & (B < 120) & (G - mx > 90)
    greenish = (G - mx > 40) & (G > 120)
    lab, n = ndimage.label(greenish | pure)
    keep = np.zeros(n + 1, bool); keep[np.unique(lab[pure])] = True; keep[0] = False
    bg = keep[lab]
    near = ndimage.binary_dilation(bg, iterations=2) & ~bg
    d = G - mx
    alpha = np.ones_like(G); alpha[bg] = 0
    t = np.clip((d - 15) / 90.0, 0, 1); alpha[near] = 1 - t[near]
    edge = (alpha < 1) | ndimage.binary_dilation(bg, iterations=3)
    sp = edge & (G > mx)
    G2 = G.copy(); G2[sp] = mx[sp] + (G[sp] - mx[sp]) * 0.15
    return Image.fromarray(np.dstack([R, G2, B, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')

def objects(im, merge=6, min_area=1500):
    """объекты листа: [(bbox, crop)], отсортированы по рядам и слева направо"""
    al = np.asarray(im)[..., 3] > 40
    lab, n = ndimage.label(ndimage.binary_dilation(al, iterations=merge))
    objs = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        m = al[sl] & (lab[sl] == i)
        if m.sum() < min_area: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        crop = np.asarray(im)[y0:y1, x0:x1].copy(); crop[..., 3] = np.where(m, crop[..., 3], 0)
        objs.append(((x0, y0, x1, y1), Image.fromarray(crop, 'RGBA')))
    # ряды: кластеры по центру Y
    objs.sort(key=lambda o: (o[0][1] + o[0][3]) / 2)
    rows, cur = [], []
    for o in objs:
        cy = (o[0][1] + o[0][3]) / 2
        if cur and cy - (cur[-1][0][1] + cur[-1][0][3]) / 2 > 120: rows.append(cur); cur = []
        cur.append(o)
    if cur: rows.append(cur)
    return [o for r in rows for o in sorted(r, key=lambda o: o[0][0])]

def grade(im, sat=0.9, con=1.04, warm=(1.0, 0.985, 0.95)):
    """лёгкая подгонка под землю C1: чуть приглушить и согреть"""
    a = np.asarray(im).astype(np.float32)
    rgb = a[..., :3]; l = rgb @ np.array([.299, .587, .114])
    rgb = l[..., None] + (rgb - l[..., None]) * sat
    rgb = (rgb - 110) * con + 110
    rgb *= np.array(warm)
    a[..., :3] = rgb
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')

def place(crop, ox, oy, s, W, H):
    """кадр W×H игровых единиц; crop масштабируется s (ед./px), левый верхний угол в (ox, oy) ед. от центра кадра"""
    w, h = max(1, round(crop.width * s * PX)), max(1, round(crop.height * s * PX))
    sm = crop.resize((w, h), Image.LANCZOS)
    can = Image.new('RGBA', (round(W * PX), round(H * PX)), (0, 0, 0, 0))
    can.alpha_composite(sm, (round((W / 2 + ox) * PX), round((H / 2 + oy) * PX)))
    return can

def uri(im, q=88):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

G3IMG, G3ACT, RIGIMG, ITEMS, UI = {}, {}, {}, {}, {}
def put_frame(skin, pose, im, W, H, sock=True):
    f = 'assets/g8/%s_%s.webp' % (skin, pose)
    G3IMG[f] = uri(im)
    G3ACT.setdefault(skin, {})[pose] = {'file': f, 'width': W, 'height': H, 'pivot': [0.5, 0.5], 'equipmentSocket': [0, 7] if sock else None, 'fit': 'g8'}
    im.save(os.path.join(OUT, 'src', '%s_%s.png' % (skin, pose)))

def bbox_center(b): return ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

def frames_sheet(path, cols, rows):
    im = key_green(path)
    return im, objects(im), im.width / cols, im.height / rows

def cell_of(b, cw, ch): c = bbox_center(b); return int(c[0] // cw), int(c[1] // ch)

def register(objs, cw, ch, ref, s):
    """смещения кадров относительно своей ячейки, как у опорного кадра ref (его центр → центр кадра)"""
    rb = objs[ref][0]; rc = cell_of(rb, cw, ch); rcx, rcy = bbox_center(rb)
    dx0, dy0 = rcx - rc[0] * cw, rcy - rc[1] * ch
    out = []
    for b, crop in objs:
        c = cell_of(b, cw, ch)
        ox = (b[0] - c[0] * cw - dx0) * s; oy = (b[1] - c[1] * ch - dy0) * s
        out.append((crop, ox, oy))
    return out

# ---------- люди ----------
HUMAN = ['idle', 'walk_left', 'walk_right', 'walk_pass_left', 'walk_pass_right', 'seated', 'crouch', 'wounded', 'captive', 'fall_start', 'fall_mid_old', 'dead_old']
SIZE = {'wounded': (60, 64), 'captive': (64, 72), 'fall_start': (64, 72)}
IDLE_W = 26.0      # ширина стоящего сталкера с руками, ед. (риг: плечи ±9, кисти ±11)
SKINS = ['loner', 'zarya', 'bandit', 'army']
RIGPARTS = ['core', 'arm_l_upper', 'arm_l_lower', 'arm_l_hand', 'arm_r_upper', 'arm_r_lower', 'arm_r_hand', 'leg_l', 'leg_r']
RIGPX = {'core': (24, 27), 'arm_l_upper': (7, 10), 'arm_r_upper': (7, 10), 'arm_l_lower': (6, 10), 'arm_r_lower': (6, 10), 'arm_l_hand': (6, 7), 'arm_r_hand': (6, 7), 'leg_l': (7, 18), 'leg_r': (7, 18)}
for sk in SKINS:
    im, objs, cw, ch = frames_sheet(P('01_Stalkers', sk + '_frames.png'), 4, 3)
    assert len(objs) == 12, (sk, len(objs))
    objs = [(b, grade(c)) for b, c in objs]
    s = IDLE_W / (objs[0][0][2] - objs[0][0][0])
    for (crop, ox, oy), pose in zip(register(objs, cw, ch, 0, s), HUMAN):
        if pose.endswith('_old'): continue
        W, H = SIZE.get(pose, (48, 56))
        put_frame(sk, pose, place(crop, ox, oy, s, W, H), W, H, pose not in ('captive', 'fall_start'))
    # части рига: core | l_upper | l_lower / l_hand | r_upper | r_lower / r_hand | leg_l | leg_r
    pim = key_green(P('01_Stalkers', sk + '_parts.png'))
    parts = objects(pim); assert len(parts) == 9, (sk, len(parts))
    for (b, crop), name in zip(parts, RIGPARTS):
        crop = grade(crop)
        w, h = RIGPX[name]; k = 4   # 4 px на единицу: части рисуются мелко, но на ретине нужна резкость
        sm = crop.resize((w * k, h * k), Image.LANCZOS)
        f = 'assets/g8/rig_%s_%s.webp' % (sk, name)
        RIGIMG['assets/rig/%s_%s.png' % (sk, name)] = uri(sm, 90)
        sm.save(os.path.join(OUT, 'src', 'rig_%s_%s.png' % (sk, name)))

# смерти: ряд 1 — падение, ряд 2 — лежит; асимметричный лист — второй вариант трупа
DEAD_L = 60.0
dim = key_green(P('02_Deaths', 'deaths.png')); d = objects(dim); assert len(d) == 8, len(d)
s = DEAD_L / (d[4][0][3] - d[4][0][1])
for i, sk in enumerate(SKINS):
    for row, pose in ((0, 'fall_mid'), (1, 'dead')):
        b, crop = d[row * 4 + i]
        crop = grade(crop)
        put_frame(sk, pose, place(crop, -crop.width * s / 2, -crop.height * s / 2, s, 64, 72), 64, 72, False)
aim = key_green(P('02_Deaths', 'deaths_asymmetric.png')); a = objects(aim, merge=4); assert len(a) == 4, len(a)
s = DEAD_L / (a[0][0][3] - a[0][0][1])
for i, sk in enumerate(SKINS):
    b, crop = a[i]; crop = grade(crop)
    put_frame(sk, 'dead2', place(crop, -crop.width * s / 2, -crop.height * s / 2, s, 64, 72), 64, 72, False)

# ---------- мутанты ----------
MUT = ['idle', 'walk_left', 'walk_pass_left', 'walk_right', 'walk_pass_right', 'attack', 'recoil', 'dead']
MSIZE = {'dog': ('h', 41.5, 44, 60), 'boar': ('h', 45.5, 56, 64), 'sucker': ('w', 28.5, 52, 60)}
def waist(crop):
    al = np.asarray(crop)[..., 3] > 40; h = al.shape[0]; cx = al.shape[1] // 2; ws = []
    for y in range(int(h * .35), int(h * .6)):
        row = al[y]
        if not row[cx]: continue
        l = cx
        while l > 0 and row[l - 1]: l -= 1
        r = cx
        while r < len(row) - 1 and row[r + 1]: r += 1
        ws.append(r - l + 1)
    return float(np.median(ws))
for kind, fn in (('dog', 'dog_frames'), ('boar', 'boar_frames'), ('sucker', 'sucker_frames')):
    im, objs, cw, ch = frames_sheet(P('05_Mutants', fn + '.png'), 4, 2)
    assert len(objs) == 8, (kind, len(objs))
    objs = [(b, grade(c, sat=.92)) for b, c in objs]
    axis, val, W, H = MSIZE[kind]
    b0 = objs[0][0]; s = val / ((b0[3] - b0[1]) if axis == 'h' else (b0[2] - b0[0]))
    reg = register(objs, cw, ch, 0, s)
    if kind == 'dog':   # бег — с отдельного листа галопа (4 кадра в ряд), масштаб по ширине поясницы
        gim = key_green(P('05_Mutants', 'dog_gallop.png')); go = objects(gim); assert len(go) == 4, len(go)
        go = [(b, grade(c, sat=.92)) for b, c in go]
        sg = s * waist(objs[0][1]) / waist(go[1][1])
        greg = register(go, gim.width / 4, gim.height, 1, sg)
        reg[1:5] = greg     # walk_left, walk_pass_left, walk_right, walk_pass_right
    for (crop, ox, oy), pose in zip(reg, MUT):
        ww, hh = (64, 72) if pose in ('dead', 'recoil') else (W, H)
        if pose == 'dead': ox, oy = -crop.width * s / 2, -crop.height * s / 2
        fim = place(crop, ox, oy, sg if (kind == 'dog' and pose.startswith('walk')) else s, ww, hh)
        put_frame(kind, pose, fim, ww, hh, False)
    G3ACT[kind]['anticipation'] = dict(G3ACT[kind]['attack'])
    G3ACT[kind]['collapse'] = dict(G3ACT[kind]['recoil'])

# ---------- Сидорович: 3 кадра, стол перед ним ----------
im = key_green(P('04_Sidorovich', 'sidorovich_frames.png')); so = objects(im); assert len(so) == 3, len(so)
so = [(b, grade(c)) for b, c in so]
s = 34.0 / (so[0][0][2] - so[0][0][0])
cw = im.width / 3
# центр сущности — грудь Сидоровича (≈35% высоты кадра от верха), стол уходит вперёд (юг)
b0 = so[0][0]; ax = (b0[0] + b0[2]) / 2 - 0 * cw; ay = b0[1] + (b0[3] - b0[1]) * 0.33
for i, ((b, crop), pose) in enumerate(zip(so, ('relaxed', 'idle', 'give'))):
    ox = (b[0] - i * cw - ax) * s; oy = (b[1] - ay) * s
    put_frame('sid', pose, place(crop, ox, oy, s, 40, 72), 40, 72, False)
G3ACT['sid']['seated'] = dict(G3ACT['sid']['relaxed'])

# ---------- оружие: иконки (вид сбоку) и вид сверху для рук ----------
def fit_icon(path, size=128, pad=8):
    im = key_green(path); o = objects(im, merge=8)
    b, crop = max(o, key=lambda x: (x[0][2] - x[0][0]) * (x[0][3] - x[0][1]))
    crop = grade(crop, sat=.95)
    k = min((size - 2 * pad) / crop.width, (size - 2 * pad) / crop.height)
    sm = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
    can = Image.new('RGBA', (size, size), (0, 0, 0, 0)); can.alpha_composite(sm, ((size - sm.width) // 2, (size - sm.height) // 2))
    return can, crop
for id_, fn in (('w_aksu', 'rifle_side'), ('knife', 'knife_side'), ('w_pm', 'pistol_side')):
    ic, _ = fit_icon(P('03_Weapons', fn + '.png'), 256, 14)
    b_ = io.BytesIO(); ic.resize((128, 128), Image.LANCZOS).save(b_, 'PNG', optimize=True)
    f = 'assets/g8/item_%s.png' % id_; G3IMG[f] = 'data:image/png;base64,' + base64.b64encode(b_.getvalue()).decode()
    ITEMS[id_] = {'file': f, 'width': 128, 'height': 128, 'logicalWidth': 64, 'logicalHeight': 64, 'source': 'G8 ' + fn}
    ic.save(os.path.join(OUT, 'src', 'item_%s.png' % id_))
HAND = {}
for id_, fn in (('w_aksu', 'rifle_top'), ('knife', 'knife_top')):
    im = key_green(P('03_Weapons', fn + '.png')); o = objects(im, merge=8)
    b, crop = max(o, key=lambda x: (x[0][2] - x[0][0]) * (x[0][3] - x[0][1]))
    crop = grade(crop, sat=.95)
    crop = crop.rotate(-90, expand=True)          # ствол/лезвие вниз = +y (юг)
    k = 160 / crop.height if crop.height > 160 else 1
    sm = crop.resize((max(1, round(crop.width * k)), round(crop.height * k)), Image.LANCZOS)
    f = 'assets/g8/hand_%s.webp' % id_; G3IMG[f] = uri(sm, 90)
    HAND[id_] = {'file': f, 'aspect': sm.width / sm.height}
    sm.save(os.path.join(OUT, 'src', 'hand_%s.png' % id_))

# ---------- HUD ----------
hud = key_green(P('06_HUD', 'hud_atlas.png'))
def crop_box(box):
    c = hud.crop(box); al = np.asarray(c)[..., 3] > 30; ys, xs = np.nonzero(al)
    return c.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
def nine(src, b_src, W, H, b_out):
    """9-slice: углы сохраняются (масштаб b_out/b_src), края и центр — растягиваются"""
    k = b_out / b_src
    s = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS); b = b_out
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sw, sh = s.size
    def pc(x0, y0, x1, y1, dx, dy, dw, dh):
        if x1 <= x0 or y1 <= y0 or dw <= 0 or dh <= 0: return
        out.alpha_composite(s.crop((x0, y0, x1, y1)).resize((dw, dh), Image.LANCZOS), (dx, dy))
    for (x0, x1, dx, dw) in ((0, b, 0, b), (b, sw - b, b, W - 2 * b), (sw - b, sw, W - b, b)):
        for (y0, y1, dy, dh) in ((0, b, 0, b), (b, sh - b, b, H - 2 * b), (sh - b, sh, H - b, b)):
            pc(x0, y0, x1, y1, dx, dy, dw, dh)
    return out
def ui(key, im, slice_, w, h):
    f = 'assets/g8/ui_%s.webp' % key; G3IMG[f] = uri(im, 92)
    UI[key] = {'file': f, 'width': w, 'height': h, 'borderImageSlice': slice_}
    im.save(os.path.join(OUT, 'src', 'ui_%s.png' % key))
big = crop_box((15, 50, 565, 415))            # большая панель
ui('panel', nine(big, 30, 256, 256, 32), 32, 128, 128)
ui('pda', nine(big, 30, 384, 384, 64), 64, 192, 192)
btn = crop_box((655, 460, 925, 580))           # прямоугольная кнопка
btnp = crop_box((655, 595, 925, 715))          # нажатая
ui('button', nine(btn, 22, 384, 160, 20), 20, 192, 80)
sel = np.asarray(nine(btnp, 22, 384, 160, 20)).astype(np.float32)
sel[..., :3] = sel[..., :3] * np.array([.95, .85, .6]) + np.array([118, 92, 42]) * (sel[..., 3:] > 0) * 0.55   # латунь: тёмный текст читается
ui('selected', Image.fromarray(sel.clip(0, 255).astype(np.uint8), 'RGBA'), 20, 192, 80)
ui('slot', nine(btn, 22, 128, 128, 10), 10, 64, 64)
rnd = crop_box((950, 445, 1090, 585)).resize((192, 192), Image.LANCZOS); ui('round', rnd, 0, 96, 96)
mapf = crop_box((575, 50, 940, 415)); ui('map', nine(mapf, 40, 240, 240, 36), 36, 120, 120)
ui('joy', crop_box((1110, 440, 1390, 720)).resize((248, 248), Image.LANCZOS), 0, 124, 124)
ui('knob', crop_box((1400, 515, 1520, 640)).resize((104, 104), Image.LANCZOS), 0, 52, 52)
ui('bar_hp', crop_box((20, 595, 625, 640)).resize((256, 12), Image.LANCZOS), 0, 128, 6)
ui('bar_fd', crop_box((20, 660, 625, 705)).resize((256, 12), Image.LANCZOS), 0, 128, 6)
barf = crop_box((10, 480, 635, 565)); ui('barframe', nine(barf, 14, 256, 28, 10), 5, 128, 14)

pack = {'version': 'g8-1', 'images': G3IMG, 'actors': G3ACT, 'rig': RIGIMG, 'items': ITEMS, 'ui': UI, 'hand': HAND}
js = '/* G8: персонажи, мутанты, Сидорович, оружие, HUD (GPT, блоки 5–7). Сборка: tools/g8_build.py */\n' \
     'globalThis.CORDON_G8=' + json.dumps(pack, ensure_ascii=False, separators=(',', ':')) + ';\n' + \
     '''(function(g){const p=g.CORDON_G8,a=g.CORDON_G31,r=g.CORDON_RIG;if(!p||!a||/g8-off/.test(location.hash))return;
Object.assign(a.images,p.images);for(const k in p.actors)a.manifest.actors[k]=Object.assign(a.manifest.actors[k]||{},p.actors[k]);
Object.assign(a.manifest.items,p.items);Object.assign(a.manifest.ui,p.ui);if(r)Object.assign(r.images,p.rig);g.CORDON_G8_ON=1;})(globalThis);\n'''
open(os.path.join(OUT, 'g8.inline.js'), 'w', encoding='utf8').write(js)
print('g8: frames', len(G3IMG), 'rig', len(RIGIMG), 'bytes', len(js))
