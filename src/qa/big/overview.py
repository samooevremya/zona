import asyncio, json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':844,'height':390})).new_page()
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7'); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button',name='Новая игра').click(); await pg.wait_for_timeout(300)
        d=await pg.evaluate("""()=>{const m=__z.map; const nav=Array.from(m.nav); return {MW:m.MW, tiles:window.__bigTiles?Array.from(window.__bigTiles()):null, nav:nav, locs:m.LOCATIONS.map(l=>({id:l.id,n:l.name,t:l.type,b:l.bounds})), objs:m.objs.filter(o=>o.static).map(o=>[o.k,o.x/32,o.y/32,o.w/32,o.h/32]), npcs:__z.ents.map(e=>[e.kind,e.fac,e.x/32,e.y/32,e.name||e.sid||''])}}""")
        json.dump(d,open('qa/big/ov.json','w'))
        await b.close()
asyncio.run(main())
