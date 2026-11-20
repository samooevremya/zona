"""Bake the small held-item sprites used by build.py (Playwright Chromium and Pillow)."""
import base64
import io
import os
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

art = Path(__file__).resolve().parents[1] / 'art'
held = art / 'g8/held'
texture = (art / 'g8/src/item_w_pm.png').read_bytes()
texture_uri = 'data:image/png;base64,' + base64.b64encode(texture).decode()

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM'), args=['--single-process','--disable-gpu'])
    page = browser.new_page()
    for source in sorted(held.glob('*.svg')):
        svg = source.read_text().replace('../src/item_w_pm.png', texture_uri)
        data = page.evaluate("""async svg => {
          const im = new Image();
          im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          await im.decode();
          const c=document.createElement('canvas'); c.width=im.width; c.height=im.height;
          c.getContext('2d').drawImage(im,0,0);
          return c.toDataURL('image/png').split(',')[1];
        }""", svg)
        Image.open(io.BytesIO(base64.b64decode(data))).save(source.with_suffix('.webp'), lossless=True)
    browser.close()

with Image.open(art / 'b2/png/grenade.png') as im:
    grenade = im.crop(im.getchannel('A').getbbox())
    grenade.thumbnail((24,30), Image.Resampling.LANCZOS)
    grenade.save(held/'grenade.webp', lossless=True)
