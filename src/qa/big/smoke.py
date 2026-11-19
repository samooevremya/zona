import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300])); pg.on('console',lambda m: errs.append('console:'+m.text[:200]) if m.type=='error' else None)
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7'); await pg.wait_for_timeout(2500)
        print('errors after load',errs[:5])
        try:
            await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(500)
        except Exception as e: print('no button',e)
        info=await pg.evaluate("""()=>{const z=__z;return {ver:z.map.MAP_VERSION, MW:z.map.MW, P:[Math.round(z.P.x/32),Math.round(z.P.y/32)], locs:z.map.LOCATIONS.length}}""")
        print(info)
        for name,(x,y) in {'village':(60,170),'atp':(196,142),'bridge':(128,62),'farm':(176,30),'hutor':(33,131),'ford':(226,92)}.items():
            await pg.evaluate(f"()=>{{const P=__z.P;P.x={x}*32;P.y={y}*32;__z.cam.x=P.x;__z.cam.y=P.y;}}")
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'qa/big/s_{name}.png')
        print('errors',errs[:8])
        await b.close()
asyncio.run(main())
