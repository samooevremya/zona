"""Приёмка предметов B2: рюкзак со всеми 19 предметами, торговля с новыми предметами в корзине, обыск.
Тестовое состояние создаётся только на странице проверки, в сохранение не пишется."""
import asyncio
from playwright.async_api import async_playwright
ALL19 = ['bread','sausage','vodka','medkit','antirad','grenade','ar_jacket','ar_bandit','flash','art_medusa','art_bengal','art_blood','tail','hoof','tentacle','w_pm','bandage','cans','ar_zarya']
SETUP = """(()=>{const z=__z,S=z.S; S.flags.intro=1; S.money=6000; S.inv={}; %s.forEach((id,i)=>S.inv[id]= ['tail','bandage','cans','bread','medkit'].includes(id)?(2+i%%3):1);
  Object.assign(S.inv,{w_aksu:1,a545:60,a9:20}); S.weapon='w_aksu'; S.mag.w_aksu=30; S.cond.w_aksu=76; S.cond.w_pm=58; S.armor='ar_jacket'; S.belt=['art_blood']; z.clearMsgs();
  localStorage.clear = localStorage.clear; window.__noSave = 1; })()""" % ALL19
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        res=[]
        for vw,vh in [(844,390),(390,844)]:
            for dpr in [2,3]:
                ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=dpr,has_touch=True,is_mobile=True)
                pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
                await pg.goto('file:///home/claude/zona2d/index.html'); await pg.wait_for_timeout(900)
                await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
                if vh>vw:
                    try: await pg.click('#rot-skip',timeout=1500)
                    except Exception: pass
                await pg.evaluate(SETUP)
                tag=f'{vw}x{vh}_dpr{dpr}'
                await pg.evaluate("(()=>{const z=__z; z.openPanel('inv','Рюкзак'); z.panel.sel='ar_bandit'; z.refresh();})()"); await pg.wait_for_timeout(250)
                await pg.screenshot(path=f'qa/b2/{tag}_1_inventory.png')
                chk=await pg.evaluate("""(()=>{const cells=[...document.querySelectorAll('#pbody .igrid .icell:not(.empty)')];
                  const imgs=cells.map(c=>c.querySelector('img.b1ic')).filter(Boolean);
                  const bad=imgs.filter(i=>!i.complete||!i.naturalWidth).length;
                  const tall=imgs.filter(i=>i.classList.contains('tall')).map(i=>{const r=i.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)});
                  const sizes=imgs.map(i=>{const r=i.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]});
                  const badges=cells.filter(c=>c.querySelector('.bd')).every(c=>{const z=getComputedStyle(c.querySelector('.bd')); return z.position==='absolute'});
                  return {cells:cells.length, newImgs:imgs.length, notLoaded:bad, tallBoxes:tall, maxImg:Math.max(...sizes.map(s=>Math.max(...s))), badgesOnTop:badges};})()""")
                await pg.evaluate("__z.closePanel()")
                await pg.evaluate("(()=>{const z=__z; z.openTrade(null); z.panel.offer={buy:{medkit:1,vodka:1,grenade:1,antirad:1},sell:{hoof:1,tentacle:1,art_medusa:1,flash:0}}; delete z.panel.offer.sell.flash; z.refresh();})()"); await pg.wait_for_timeout(250)
                await pg.screenshot(path=f'qa/b2/{tag}_2_trade.png')
                if vh>vw:
                    await pg.evaluate("(()=>{__z.panel.side='mine'; __z.refresh();})()"); await pg.wait_for_timeout(200)
                    await pg.screenshot(path=f'qa/b2/{tag}_2b_trade_mine.png')
                cart=await pg.evaluate("[...document.querySelectorAll('.cline img.b1ic')].length")
                await pg.evaluate("window.__noclose=1; (()=>{const z=__z; z.panel=null;})()")
                await pg.evaluate("document.getElementById('ov').classList.remove('open')")
                await pg.evaluate("(()=>{const z=__z; z.openLoot({k:'body',name:'Бандит',x:z.P.x,y:z.P.y,loot:{bread:1,sausage:2,vodka:1,ar_bandit:1,tail:1,grenade:1,a9:12,money:140}});})()"); await pg.wait_for_timeout(250)
                await pg.screenshot(path=f'qa/b2/{tag}_3_loot.png')
                lootImgs=await pg.evaluate("[...document.querySelectorAll('#pbody .row img.b1ic')].length")
                res.append((tag, chk, {'cartImgs':cart,'lootImgs':lootImgs}, errs[:2])); await ctx.close()
        for r in res: print(r)
        await b.close()
asyncio.run(main())
