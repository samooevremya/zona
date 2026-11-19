"""Переводит тесты старой карты на большой Кордон: координаты в старых клетках пересчитываются через RMt/RMp игры."""
import re, sys, os
SHIM = """const __RM = window.__zRM;
const RPx = (x, y) => __RM.p(x, y)[0], RPy = (x, y) => __RM.p(x, y)[1];
const __setOld = (x, y) => { const r = __RM.p(x, y); z.P.x = r[0]; z.P.y = r[1]; };
"""
for f in sys.argv[1:]:
    s = open(f).read()
    # пары присваиваний из старых чисел: P().x = <старые клетки>; P().y = ...;
    s = re.sub(r"P\(\)\.x = ((?:[0-9.]+|p\[0\]|f\[0\]) \* (?:32|T)(?: [+-] [0-9.]+)?); P\(\)\.y = ((?:[0-9.]+|p\[1\]|f\[1\]) \* (?:32|T)(?: [+-] [0-9.]+)?);", r"__setOld(\1, \2);", s)
    # вставить шим после определения z
    m = re.search(r"const z = [^;]+;\n", s)
    if m: s = s[:m.end()] + SHIM + s[m.end():]
    else: s = SHIM.replace('z.P','__z.P') + s
    # Math.hypot(e.x - A * 32, e.y - B * 32)
    s = re.sub(r"Math\.hypot\((\w+)\.x - ([0-9.]+) \* 32, (\w+)\.y - ([0-9.]+) \* 32\)", r"Math.hypot(\1.x - RPx(\2 * 32, \4 * 32), \3.y - RPy(\2 * 32, \4 * 32))", s)
    # findPath(f[0] * 32, f[1] * 32, ...)
    s = s.replace("z.findPath(f[0] * 32, f[1] * 32,", "z.findPath(RPx(f[0] * 32, f[1] * 32), RPy(f[0] * 32, f[1] * 32),")
    s = s.replace("let L = 0, px = f[0] * 32, py = f[1] * 32;", "let L = 0, px = RPx(f[0] * 32, f[1] * 32), py = RPy(f[0] * 32, f[1] * 32);")
    s = re.sub(r"\{ k: 'clear', x: ([0-9.]+), y: ([0-9.]+),", r"{ k: 'clear', x: __RM.t(\1, \2)[0], y: __RM.t(\1, \2)[1],", s)
    s = s.replace("S().mapVersion === 'kordon-rc1'", "S().mapVersion === z.loc.MAP_VERSION")
    out = os.path.join('qa/big', os.path.basename(f))
    open(out, 'w').write(s); print('->', out)
