import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7'); await pg.wait_for_timeout(1000)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.get_by_role('button',name='Пропустить').tap(); await pg.wait_for_timeout(300)
        r=json.loads(await pg.evaluate(open('qa/big/rc1.js').read()))
        r['pageErrors']=errs
        json.dump(r,open('qa/big/rc1_result.json','w'),ensure_ascii=False,indent=1)
        for k,v in r.items():
            if isinstance(v,dict): print(k,'OK ' if v.get('ok') else 'FAIL',json.dumps({a:c for a,c in v.items() if a!='ok'},ensure_ascii=False)[:300])
        print('pageErrors',errs[:3]); await b.close()
asyncio.run(main())
