import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/zona2d/index.html'); await pg.wait_for_timeout(900)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        r=await pg.evaluate("""(()=>{const z=__z,X=z.plus,S=z.S,P=z.P,o={};
          S.flags.intro=1; S.inv.art_medusa=1; S.inv.art_blood=1; S.belt=['art_blood']; S.inv.art_blood=1;
          X.jobTake({k:'art',pay:0,n_:'Любой артефакт',d:''}); z.talkTrader();
          o.opts=[...document.querySelectorAll('#pbody button')].map(b=>b.textContent).filter(t=>/Сдать/.test(t));
          const bb=[...document.querySelectorAll('#pbody button')].find(b=>/Кровь|blood|надет/i.test(b.textContent)); const m0=S.money;
          bb.click(); o.afterFirstClick={money:S.money-m0, belt:S.belt.slice()};
          const bb2=[...document.querySelectorAll('#pbody button')].find(b=>/подтверждаю/.test(b.textContent)); if(bb2) bb2.click();
          o.afterConfirm={money:S.money-m0, belt:S.belt.slice(), blood:S.inv.art_blood||0, medusa:S.inv.art_medusa}; z.closePanel();
          P.x=30.5*32+20; P.y=84.5*32; S.bleed=1; S.food=55; P.hp=45; X.restAtFire();
          return o;})()""")
        await pg.wait_for_timeout(300); await pg.screenshot(path='qa/rest_bleeding.png')
        await pg.evaluate("""(()=>{__z.closePanel(); __z.S.bleed=0; __z.plus.restAtFire();})()""")
        await pg.wait_for_timeout(300); await pg.screenshot(path='qa/rest_ok.png')
        print(json.dumps(r,ensure_ascii=False,indent=1), errs); await b.close()
asyncio.run(main())
