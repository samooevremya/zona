"""Визуальная матрица G7: риг людей, позы G6, оружие, падение. Камера у костра, 13:00, ясно.
Аргументы: [hash-suffix] [prefix] — например  -rig-off off_  для сравнения со старым путём."""
import asyncio, json, sys, re
from playwright.async_api import async_playwright
src = open('qa/shotsG3.py', encoding='utf8').read()
exec(src[:src.index('async def main')])          # FIX, STAGE, D, LINEUP, ROT, POSES, WEAP, SUCK
FREEZE = """((walks)=>{const g7=__z.rc.g7; (window.__qa||[]).forEach((e,i)=>{ const w=walks[i]; g7.qaRig(e, w==null?0:w*11+0.01, 60); }); })"""
async def main():
    suf = sys.argv[1] if len(sys.argv) > 1 else ''
    pre = sys.argv[2] if len(sys.argv) > 2 else ''
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/index.html#qa' + suf); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button', name='Новая игра').tap(); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{const S=__z.S; S.flags.intro=1; S.weapon='w_pm'; S.inv.w_pm=1; S.armor='ar_jacket'; S.inv.ar_jacket=1;})()")
        async def shot(name, rows, cx=31.5, cy=88.5, hour=13, zoom=None, clip=None):
            await pg.evaluate(FIX + '(%s)' % hour); await pg.evaluate(STAGE + '(%s,%s,%s)' % (cx, cy, json.dumps(rows)))
            walks = [d.get('walk') for r in rows for d in r if not d.get('dead')]
            await pg.evaluate(FREEZE + '(%s)' % json.dumps(walks))
            await pg.evaluate("document.querySelector('.hud').style.visibility='hidden'; document.querySelector('.touch').style.visibility='hidden'")
            await pg.wait_for_timeout(350); await pg.evaluate(FIX + '(%s)' % hour); await pg.wait_for_timeout(80)
            await pg.screenshot(path=f'qa/g7/{pre}{name}.png', clip=clip)
        await shot('01_lineup', LINEUP)
        await shot('02_rot_loner', [[{'fac': 'loner', 'a': i * 0.7854, 'w': 'w_aksu', 'gap': 1.5} for i in range(8)], [{'fac': 'bandit', 'a': i * 0.7854, 'w': 'w_pm', 'gap': 1.5} for i in range(8)]])
        await shot('03_poses', POSES)
        await shot('04_weapons', WEAP)
        await shot('05_mutants', SUCK)
        await shot('06_walkcycle', [[{'fac': f, 'a': D, 'w': 'w_aksu', 'walk': k, 'gap': 1.6} for k in range(4)] + [{'fac': f, 'a': D, 'w': 'w_aksu', 'crouch': 1, 'walk': k, 'gap': 1.6} for k in (0, 2)] for f in ('loner', 'army')])
        await shot('07_sid_skins', [[{'fac': 'army', 'a': D, 'w': 'w_aksu', 'gap': 1.7}, {'fac': 'bandit', 'a': D, 'w': 'w_obrez', 'gap': 1.7}, {'fac': 'loner', 'a': D, 'captive': 1, 'gap': 1.7}, {'fac': 'bandit', 'a': D, 'captive': 1, 'gap': 1.7}, {'fac': 'army', 'a': D, 'wounded': 1, 'gap': 1.7}]])
        print('ok', errs[:3]); await b.close()
asyncio.run(main())
