"""Приёмочные кадры этапа B: одна камера (игрок у костра деревни), 13:00, ясно, без случайных событий."""
import asyncio, sys
from playwright.async_api import async_playwright
FIX = """(()=>{const z=__z,S=z.S,P=z.P;
  S.min = 13*60 + 1440; S.wx = { k: 'clear', until: S.min + 9999 }; Object.assign(z.WX, { cloud: 0.1, rain: 0, fog: 0, flash: 0, red: 0 }); z.WX.drops.length = 0;
  P.x = 31.5*32; P.y = 88.2*32; P.ang = -Math.PI/2; z.cam.x = P.x; z.cam.y = P.y;
  z.clearMsgs(); if (S.sos) { S.sos.act = null; S.sos.next = S.min + 99999; } if (S.blow) { S.blow.stage = 0; S.blow.next = S.min + 99999; }
})()"""
SETUP = """(()=>{const z=__z,S=z.S; S.flags.intro=1; S.q.flash=2; S.q.medusa=1; S.q.pack=1; S.q3={sucker:1};
  S.money=4300; Object.assign(S.inv,{w_pm:1,w_aksu:1,a9:40,a545:90,medkit:3,bandage:4,cans:2,bread:1,vodka:1,art_medusa:1,art_blood:1,tail:2,ar_jacket:1});
  S.weapon='w_aksu'; S.mag.w_aksu=30; S.cond.w_aksu=82; S.cond.w_pm=64; S.armor='ar_jacket'; S.belt=['art_blood']; S.trackedQuestId='flash';
  for(let i=0;i<S.fog.length;i++); 
})()"""
async def main():
    vw, vh = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (844, 390)
    tag = 'land' if vw > vh else 'port'
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,has_touch=True,is_mobile=True)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/zona2d/index.html'); await pg.wait_for_timeout(1000)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        if vh > vw:
            try: await pg.click('#rot-skip', timeout=2000)
            except Exception: pass
        await pg.evaluate(SETUP)
        # открыть карту: пройти по местам, чтобы туман снялся вокруг маршрута
        await pg.evaluate("""(()=>{const z=__z,P=z.P; [[30,84],[38,76],[44,70],[52,66],[60,66],[68,60],[74,56],[82,64],[92,70],[100,72],[64,48],[64,40],[52,60],[40,60],[30,54],[22,48],[16,44],[26,50],[20,90],[12,98],[40,94],[56,88],[64,100]].forEach(p=>{P.x=p[0]*32;P.y=p[1]*32; z.reveal();});})()""")
        async def shot(name, js=None, hud=True):
            await pg.evaluate(FIX)
            if js: await pg.evaluate(js)
            await pg.evaluate("document.querySelector('.hud').style.visibility='%s'; document.querySelector('.touch').style.visibility='%s'" % (('visible','visible') if hud else ('hidden','hidden')))
            await pg.wait_for_timeout(700); await pg.evaluate(FIX); await pg.wait_for_timeout(120)
            await pg.screenshot(path=f'qa/shots/{tag}_{name}.png')
        await shot('01_fire_noui', hud=False)
        await shot('02_fire_hud')
        await shot('03_dialog', "(()=>{const z=__z; const w=z.ents.find(e=>e.name==='Волк'); z.P.x=w.x; z.P.y=w.y+40; z.interact && (z.near, 0); })()")
        # открываем разговор с Волком напрямую через interact рядом
        await pg.evaluate("(()=>{const z=__z; const w=z.ents.find(e=>e.name==='Волк'); z.P.x=w.x; z.P.y=w.y+36; for(let i=0;i<3;i++) z.update(1/30); z.interact(); })()")
        await pg.evaluate("(()=>{__z.P.x=31.5*32; __z.P.y=88.2*32;})()")
        await shot('03_dialog')
        await pg.evaluate("__z.closePanel()")
        await shot('04_kpk', "(()=>{const z=__z; z.openPanel('pda','КПК',z.PDA_TABS2); z.panel.qsel='flash'; z.refresh(); })()")
        await pg.evaluate("__z.closePanel()")
        await shot('05_inventory', "(()=>{const z=__z; z.openPanel('inv','Рюкзак'); z.panel.sel='w_pm'; z.refresh(); })()")
        await pg.evaluate("__z.closePanel()")
        await shot('06_trade', "(()=>{const z=__z; z.openTrade(null); z.panel.offer={buy:{medkit:1,a545:1},sell:{tail:2,w_pm:1}}; z.refresh(); })()")
        await pg.evaluate("__z.closePanel()")
        if vh > vw:
            await shot('07_trade_mine', "(()=>{const z=__z; z.openTrade(null); z.panel.offer={buy:{medkit:1,a545:1},sell:{tail:2,w_pm:1}}; z.panel.side='mine'; z.refresh(); })()")
            await pg.evaluate("__z.closePanel()")
        print(tag, 'errors', errs[:3]); await b.close()
asyncio.run(main())
