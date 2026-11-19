import asyncio, json
from playwright.async_api import async_playwright
async def run(vw,vh):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,has_touch=True,is_mobile=True)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/index.html'); await pg.wait_for_timeout(900)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        if vh>vw:
            try: await pg.click('#rot-skip',timeout=1500)
            except Exception: pass
        await pg.evaluate(open('qa/b.js').read())
        await pg.wait_for_timeout(300)
        st=lambda: pg.evaluate("(()=>{const w=document.querySelector('.kpk-wrap'),c=document.getElementById('bigmap'); return {zl:__z.panel.zl, sl:Math.round(w.scrollLeft), st:Math.round(w.scrollTop), cw:c.clientWidth, ch:c.clientHeight, ww:w.clientWidth, wh:w.clientHeight, labels:__z.panel.mapLabels}})()")
        a=await st()
        await pg.click('text=К цели'); await pg.wait_for_timeout(300); t=await st()
        await pg.click('text=К игроку'); await pg.wait_for_timeout(300); m=await st()
        await pg.click('.kpk-bar .zb >> nth=0'); await pg.wait_for_timeout(300); z1=await st()
        await pg.screenshot(path=f'qa/kpk_zoom1_{vw}x{vh}.png')
        placed=[l for l in z1['labels'] if l['placed']]
        ok = a['zl']==2 and (a['cw']>=a['ww']-1 and a['ch']>=a['wh']-1 and (a['cw']>a['ww'] or a['ch']>a['wh'])) and (t['sl'],t['st'])!=(m['sl'],m['st']) and any('Шустр' in l['t'] and l['placed'] for l in a['labels']) and z1['zl']==1
        res={'dims':[a['cw'],a['ch'],a['ww'],a['wh']],'ok':ok,'startZoom':a['zl'],'mapWiderThanPane':(a['cw']>=a['ww']-1 and a['ch']>=a['wh']-1 and (a['cw']>a['ww'] or a['ch']>a['wh'])),'scrollToTarget':[t['sl'],t['st']],'scrollToPlayer':[m['sl'],m['st']],
             'labelsPlacedZ2':sum(l['placed'] for l in a['labels']),'labelsSkippedZ2':[l['t'] for l in a['labels'] if not l['placed']],
             'labelsPlacedZ1':len(placed),'labelsSkippedZ1':[l['t'] for l in z1['labels'] if not l['placed']],'errors':errs}
        await b.close(); return res
async def main():
    out={f'{w}x{h}':await run(w,h) for w,h in [(844,390),(390,844)]}
    json.dump(out,open('qa/b7_result.json','w'),ensure_ascii=False,indent=1)
    for k,v in out.items(): print(k,'OK' if v['ok'] else 'FAIL',json.dumps(v,ensure_ascii=False)[:500])
asyncio.run(main())
