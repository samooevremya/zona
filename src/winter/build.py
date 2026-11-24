"""Build a portable winter game with an explicit source allowlist."""
from pathlib import Path
import base64
import json

HERE = Path(__file__).resolve().parent
SRC = HERE.parent


def build():
    scripts = [p.read_text() for p in (
        HERE / 'material.js', HERE / 'balance.js', HERE / 'map.js', HERE / 'terrain.js', HERE / 'rooms.js',
        HERE / 'survival.js', HERE / 'people.js', HERE / 'field.js', HERE / 'behavior.js', HERE / 'equipment.js', HERE / 'landscape.js', HERE / 'scenery.js', HERE / 'game.js', HERE / 'atlas.js', HERE / 'controls.js',
    )]
    shell = (HERE / 'shell.html').read_text()
    html = shell.replace('/* WINTER_GAME */', '\n'.join(scripts))
    def data_url(path, mime):
        return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()
    audio = ('SandL1','SandR2','wood01','wood02','mud02','swing','pistol','shotgun','rifle',
             'loadPistol','loadRifle','loadShell','metalLatch','carve')
    html = html.replace('__MATERIAL_ATLAS__', data_url(HERE / 'materials.webp','image/webp'))
    for token, name in [('__LANDSCAPE_ART__','landscape'),('__FURNISHING_ART__','furnishings'),('__ROOF_ART__','roofs'),('__YARD_ART__','yard'),('__SUITE_ART__','suites')]:
        html = html.replace(token,data_url(HERE / (name+'.webp'),'image/webp'))
    html = html.replace('__OBJECT_ATLAS__', data_url(HERE / 'objects.webp','image/webp'))
    html = html.replace('__WINTER_AUDIO__', json.dumps({k:data_url(SRC / 'audio' / (k+'.mp3'),'audio/mpeg') for k in audio}))
    for out in (SRC / 'index_big.html', SRC.parent / 'index.html'):
        out.write_text(html)
    return html


if __name__ == '__main__':
    build()
