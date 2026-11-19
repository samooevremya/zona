import asyncio, sys
from playwright.async_api import async_playwright
SP={'village':[62,170],'village_n':[56,160],'atp':[194,140],'column':[124,25],'hutor':[33,132],'forest':[100,150]}
async def main(tag):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7'+tag); await pg.wait_for_timeout(2000)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(400)
        for n,xy in SP.items():
            await pg.evaluate("(xy)=>{const z=__z,P=z.P;z.S.flags.intro=1;P.x=xy[0]*32;P.y=xy[1]*32;z.cam.x=P.x;z.cam.y=P.y;z.clearMsgs();z.closePanel&&z.closePanel();}", xy); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'qa/big/c1_{n}.png')
        print('errors',errs[:5]); await b.close()
asyncio.run(main(sys.argv[1] if len(sys.argv)>1 else ''))
