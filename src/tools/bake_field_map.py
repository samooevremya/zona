"""Bake the Cordon's static aerial layer from a built src/index_big.html.

Requires Playwright with Chromium. Set CHROMIUM_PATH to use a local browser.
"""
import base64
import os
from pathlib import Path
from tempfile import TemporaryDirectory

from playwright.sync_api import sync_playwright

SRC = Path(__file__).resolve().parents[1]
BAKE = """
window.bakeFieldMap = () => {
  const k = 4, c = document.createElement('canvas');
  c.width = PW * k; c.height = MH * k;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  // This browser is used only to export the terrain. Leave discoveries off the plate.
  for (let i = objs.length - 1; i >= 0; i--) {
    if (!objs[i].static || objs[i].k === 'cache') objs.splice(i, 1);
  }
  GCACHE.clear(); GPEND = null;
  const step = GCH * k / T;
  for (let y = 0; y * step < c.height; y++)
    for (let x = 0; x * step < c.width; x++)
      g.drawImage(groundChunk(x, y), x * step, y * step, step, step);
  g.scale(k, k);
  HOUSES.forEach((h, i) => {
    if (h.x < PW && ROOFS[i]) g.drawImage(ROOFS[i], h.x - 3/T, h.y - 3/T, h.w + 10/T, h.h + 10/T);
  });
  for (let y = 0; y < MH; y++) for (let x = 0; x < PW; x++) {
    if (map[y * MW + x] !== TR) continue;
    const n = hash2(x, y), crown = yardTreeCrown && yardTreeCells.has(y * MW + x)
      ? yardTreeCrown : CANOPY[Math.floor(n * CANOPY.length)];
    const w = (2.8 + n * .9) * CAN_PAD;
    g.drawImage(crown, x + .5 - w/2, y + .4 - w/2, w, w);
  }
  return c.toDataURL('image/webp', .94).split(',')[1];
};
"""
if __name__ == '__main__':
    html = (SRC / 'index_big.html').read_text()
    marker = 'window.__zRender = render;'
    assert html.count(marker) == 1
    with TemporaryDirectory() as tmp, sync_playwright() as pw:
        page_file = Path(tmp) / 'map.html'
        page_file.write_text(html.replace(marker, BAKE + marker))
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'),
                                     args=['--single-process', '--disable-gpu'])
        page = browser.new_page()
        page.route('https://fonts.**/*', lambda route: route.abort())
        page.goto(page_file.as_uri() + '#qa-seed=7&gs1')
        page.get_by_role('button', name='Новая игра').wait_for()
        data = base64.b64decode(page.evaluate('window.bakeFieldMap()'))
        assert data[8:12] == b'WEBP'
        (SRC / 'art' / 'cordon-aerial.webp').write_bytes(data)
        browser.close()
