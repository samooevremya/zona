import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    out={}
    for vw,vh in [(844,390),(390,844)]:
        async with async_playwright() as p:
            b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
            ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,has_touch=True,is_mobile=True)
            pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
            await pg.goto('file:///home/claude/zona2d/index_big.html'); await pg.wait_for_timeout(900)
            await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
            if vh>vw:
                try: await pg.click('#rot-skip',timeout=1500)
                except Exception: pass
            r=json.loads(await pg.evaluate(open('qa/big/b.js').read())); out[f'{vw}x{vh}']=(r,errs); await b.close()
    json.dump(out,open('qa/big/b_result.json','w'),ensure_ascii=False,indent=1)
    for k,(r,e) in out.items():
        print('==',k,'pageerrors',e[:2])
        for n,v in r.items():
            if not isinstance(v,dict): continue
            print(' ',n,'OK ' if v.get('ok') else 'FAIL',json.dumps({a:b for a,b in v.items() if a!='ok'},ensure_ascii=False)[:330])
asyncio.run(main())
