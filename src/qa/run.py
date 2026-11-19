import asyncio, json, sys
from playwright.async_api import async_playwright
async def run(page_file, js):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/'+page_file+'#qa-seed=20261118'); await pg.wait_for_timeout(900)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        r=json.loads(await pg.evaluate(js))
        await b.close(); return r, errs
async def main():
    js=open('qa/p0.js').read(); out={}
    for f in sys.argv[1:]:
        out[f]=await run(f, js)
    json.dump(out, open('qa/p0_result.json','w'), ensure_ascii=False, indent=1)
    for f,(r,e) in out.items():
        print('==',f, 'pageerrors:',e[:3])
        for k,v in r.items(): print(' ',k, ('OK ' if v.get('ok') else 'FAIL'), json.dumps({kk:vv for kk,vv in v.items() if kk!='ok'},ensure_ascii=False)[:300])
asyncio.run(main())
