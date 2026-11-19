"""G7 регрессии в трёх графических режимах: всё включено, #rig-off (кадры G3), #g3-off (B1/процедурная)."""
import asyncio, json, sys
from playwright.async_api import async_playwright
async def run(b, suf):
    pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await pg.goto('file:///home/claude/zona2d/index.html#qa-seed=7'+suf); await pg.wait_for_timeout(1500)
    await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
    r=json.loads(await pg.evaluate(open('qa/g7.js').read()))
    if suf=='':
        r.update(json.loads(await pg.evaluate(open('qa/g7fail.js').read())))
        await pg.evaluate("__z.closePanel()"); await pg.wait_for_timeout(200)
        r.update(json.loads(await pg.evaluate(open('qa/g7hud.js').read())))
        p2=await (await pg.context.browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,has_touch=True,is_mobile=True)).new_page()
        await p2.goto('file:///home/claude/zona2d/index.html#qa'); await p2.wait_for_timeout(1300)
        await p2.get_by_role('button',name='Новая игра').tap(); await p2.wait_for_timeout(300)
        try: await p2.click('#rot-skip',timeout=1500)
        except Exception: pass
        u=json.loads(await p2.evaluate(open('qa/g7hud.js').read())); r['U1_hud_edges_390x844_dpr3']=u['U1_hud_edges']; await p2.close()
    r['pageErrors']=errs; await pg.close(); return r
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        out={}
        for suf in ['', '-rig-off', '-g3-off']:
            r=await run(b, suf); out[suf or 'all-on']=r
            print('==', suf or 'all-on')
            for k,v in r.items():
                if isinstance(v,dict): print(' ',k,'OK ' if v.get('ok') else 'FAIL',json.dumps({a:c for a,c in v.items() if a!='ok'},ensure_ascii=False)[:260])
            print('  pageErrors',r['pageErrors'][:3])
        # исход попаданий одинаков во всех режимах
        keys=['G2_wall_before_muzzle','G3_point_blank','G4_corner_and_open','G5_friendly_fire_rules']
        same={k:len({json.dumps(out[m][k].get('outcome',{a:c for a,c in out[m][k].items()}),sort_keys=True) for m in out})==1 for k in keys}
        out['same_outcome_all_modes']=same; print('same outcome across graphics modes:',same)
        json.dump(out,open('qa/g7/g7_result.json','w'),ensure_ascii=False,indent=1); await b.close()
asyncio.run(main())
