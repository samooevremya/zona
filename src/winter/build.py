"""Build a portable winter game with an explicit source allowlist."""
from pathlib import Path
import base64
import json

HERE = Path(__file__).resolve().parent
SRC = HERE.parent


def build():
    scripts = [p.read_text() for p in (
        HERE / 'material.js', HERE / 'balance.js', HERE / 'map.js', HERE / 'terrain.js', HERE / 'rooms.js',
        HERE / 'station.js', HERE / 'survival.js', HERE / 'people.js', HERE / 'field.js', HERE / 'behavior.js', HERE / 'equipment.js', HERE / 'landscape.js', HERE / 'scenery.js', HERE / 'walking.js', HERE / 'depth.js', HERE / 'game.js', HERE / 'atlas.js', HERE / 'controls.js',
    )]
    shell = (HERE / 'shell.html').read_text()
    html = shell.replace('/* WINTER_GAME */', '\n'.join(scripts))
    def data_url(path, mime):
        return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()
    # Reuse the authored HUD, including its touch buttons and SVGs, in both games.
    markup = (SRC / 'body.html').read_text().split('<div class="hud zh">',1)[1].split('<div class="rotate"',1)[0]
    markup = '<div class="hud zh">' + markup
    css = (SRC / 'ui' / 'hud-ref.css').read_text()
    ids = {'joy':'stick','t-pda':'map','t-inv':'bag','t-menu':'menu','wpnbox':'hand','det':'lamp',
           'prompt':'act','b-fire':'fire','b-rel':'reload','b-crouch':'stance','b-jump':'jump',
           'quest':'place','status':'stats','mini':'radar'}
    original = (SRC / 'body.html').read_text()
    editor_markup = '<i id="layout-insets"' + original.split('<i id="layout-insets"', 1)[1].split('</dialog>', 1)[0] + '</dialog>'
    css += '#field-world{' + (SRC / 'ui/main-menu.css').read_text().split('#field-world{', 1)[1].split(':is(#title.start', 1)[0]
    editor = (SRC / 'gcontrols.js').read_text().replace("'zona-touch-layout-v1'", "'km100-touch-layout-v1'")
    editor = editor.replace('localStorage.getItem(CONTROL_KEY)', "localStorage.getItem(CONTROL_KEY) || localStorage.getItem('zona-touch-layout-v1')")
    adapter = (HERE / 'layout.js').read_text().replace('__CONTROL_IDS__', json.dumps(ids)).replace('/* ORIGINAL_EDITOR */', editor)
    html = html.replace('__LAYOUT_EDITOR__', editor_markup).replace('</script>', adapter + '\n</script>')
    import re
    for old,new in ids.items():
        markup=markup.replace('id="'+old+'"','id="'+new+'"')
        css=re.sub(r'#'+old+r'(?![\w-])','#'+new,css)
    raw=(SRC/'art/g8/g8.inline.js').read_text().split('globalThis.CORDON_G8=',1)[1]
    artwork=json.JSONDecoder().raw_decode(raw)[0]['images']
    sprites={k.split('/')[-1].split('.')[0]:v for k,v in artwork.items()}
    css+=':root{--frame:url("'+sprites['ui_button']+'");--knob:url("'+sprites['ui_knob']+'")}'
    html=html.replace('__FIELD_HUD__',markup).replace('__HUD_STYLE__',css+(HERE/'hud.css').read_text())
    html=html.replace('__HAND_ICONS__',json.dumps({k:sprites[k] for k in ('item_knife','item_w_pm','item_w_aksu')}))
    audio = ('SandL1','SandR2','wood01','wood02','mud02','swing','pistol','shotgun','rifle',
             'loadPistol','loadRifle','loadShell','metalLatch','carve')
    html = html.replace('__MATERIAL_ATLAS__', data_url(HERE / 'materials.webp','image/webp'))
    for token, name in [('__LANDSCAPE_ART__','landscape'),('__FURNISHING_ART__','furnishings'),('__ROOF_ART__','roofs'),('__YARD_ART__','yard')]:
        html = html.replace(token,data_url(HERE / (name+'.webp'),'image/webp'))
    html = html.replace('__OBJECT_ATLAS__', data_url(HERE / 'objects.webp','image/webp'))
    html = html.replace('__WINTER_AUDIO__', json.dumps({k:data_url(SRC / 'audio' / (k+'.mp3'),'audio/mpeg') for k in audio}))
    for out in (SRC / 'index_big.html', SRC.parent / 'index.html'):
        out.write_text(html)
    return html


if __name__ == '__main__':
    build()
