import sys
MAPFLAG = sys.argv[1] if len(sys.argv) > 1 else 'k07'
BIGF = MAPFLAG == 'big'
if BIGF: MAPFLAG = 'rc1'
h=open('head.html',encoding='utf8').read(); b=open('body.html',encoding='utf8').read(); sp=open('sprite.svg',encoding='utf8').read(); av=open('avatar.js',encoding='utf8').read()
css=open('ui/ui-theme.css',encoding='utf8').read()+'\n'+open('ui/zona-fixes.css',encoding='utf8').read()+'\n'+open('ui/hud-ref.css',encoding='utf8').read()+'\n'+open('ui/windows.css',encoding='utf8').read(); icons=open('ui/ui-icons.svg',encoding='utf8').read(); bridge=open('ui/ui-bridge.js',encoding='utf8').read()
h=h.replace('</style>','</style>\n<style>\n'+css+'\n</style>',1)
g5=open('g5.js',encoding='utf8').read().replace('/*AVATAR*/',av)
pos=g5.rfind('boot();')
assert pos>0
g5=g5[:pos]+bridge+'\n'+g5[pos:]
js="(function () {\n'use strict';\n"+"\n".join(open(f,encoding='utf8').read() for f in ['g1.js','gloc.js','g2.js','g3.js','g4.js','g6.js','g7.js','g8art.js','g9.js','gui.js','gb1.js','gquest.js','gmap_rc1.js','gbig.js','gg3.js','gg7.js','gprops.js'])+"\n"+g5+"\n})();\n"
open('game.js','w',encoding='utf8').write(js)
art=open('art/manifest.inline.js',encoding='utf8').read()+'\n'+open('art/c1/c1.inline.js',encoding='utf8').read()+'\n'+open('art/pack/village-renderer.js',encoding='utf8').read()
import base64 as _b64, os as _os
# Предметы с листа house_village_floor, без стен и пола вокруг них.
with open('art/c1/furniture.png', 'rb') as furniture:
    furniture_url = 'data:image/png;base64,' + _b64.b64encode(furniture.read()).decode()
art += '\nwindow.C1_MANIFEST.images.furniture = {file:' + repr(furniture_url) + '};'
_b1png={f[:-4]:'data:image/png;base64,'+_b64.b64encode(open('art/b1/png/'+f,'rb').read()).decode() for f in sorted(_os.listdir('art/b1/png')) if f.endswith('.png')}
art+='\n'+open('art/b1/manifest.js',encoding='utf8').read()+'\n'+open('art/b1/renderer.js',encoding='utf8').read()
_b2m=__import__('json').load(open('art/b2/manifest.json',encoding='utf8'))
art+='\n'+open('art/b2/items.inline.js',encoding='utf8').read()+'\nwindow.CORDON_ITEMS_B2_SIZE='+__import__('json').dumps({k:v['logicalSize'] for k,v in _b2m['items'].items()})+';'
art+='\n'+'\n'.join(open('art/g7/'+f,encoding='utf8').read() for f in ['assets.inline.js','renderer.js','portraits.js','rig.inline.nodead.js','rig.js','pose-keys.js'])
art+='\n'+open('art/g8/g8.inline.js',encoding='utf8').read()
jackets = {}
for color in ('white', 'beige', 'brown'):
    file = 'jacket_' + color + '.webp'
    with open('art/g8/src/' + file, 'rb') as sprite:
        jackets['assets/g8/' + file] = 'data:image/webp;base64,' + _b64.b64encode(sprite.read()).decode()
art += '\nif(window.CORDON_G8_ON) Object.assign(CORDON_G31.images,' + __import__('json').dumps(jackets) + ');'
art+='\nwindow.CORDON_B1_ATLAS='+repr('data:image/png;base64,'+_b64.b64encode(open('art/b1/atlas.png','rb').read()).decode())+';\nwindow.CORDON_B1_PNG='+__import__('json').dumps(_b1png)+';'
if BIGF:
    shop = _b64.b64encode(open('art/sid-shop.webp', 'rb').read()).decode()
    art += '\nwindow.SID_SHOP_IMAGE="data:image/webp;base64,' + shop + '";'
    gate = _b64.b64encode(open('art/sid-gate.webp', 'rb').read()).decode()
    art += '\nwindow.SID_GATE_IMAGE="data:image/webp;base64,' + gate + '";'
    poses = _b64.b64encode(open('art/sid-desk-poses.webp', 'rb').read()).decode()
    art += '\nwindow.SID_DESK_POSES="data:image/webp;base64,' + poses + '";'
    aerial = _b64.b64encode(open('art/cordon-aerial.webp', 'rb').read()).decode()
    art += '\nwindow.CORDON_AERIAL="data:image/webp;base64,' + aerial + '";'
OUT = 'index_big.html' if BIGF else 'index.html' if MAPFLAG == 'rc1' else 'index_k07.html'
open(OUT,'w',encoding='utf8').write(h+sp+"\n"+icons+"\n"+b+"\n<script>window.ZONA_MAP="+repr(MAPFLAG)+";"+("window.ZONA_BIG=1;" if BIGF else "")+"\n"+art+"\n</script>\n<script>\n"+js+"</script>\n</body>\n</html>\n")
print('built', OUT, MAPFLAG)
