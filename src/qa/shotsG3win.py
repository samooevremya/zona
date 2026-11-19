"""Приёмочные кадры RC1. Фиксированные время/погода; камера на точке; QA-сохранение (#qa) не трогает пользовательское."""
import asyncio, sys
OFF = len(sys.argv) > 1 and sys.argv[1] == "off"
from playwright.async_api import async_playwright
FIX = """((h)=>{const z=__z,S=z.S; S.min=h*60+1440; S.wx={k:'clear',until:S.min+9999}; Object.assign(z.WX,{cloud:0.1,rain:0,fog:0,flash:0,red:0}); z.WX.drops.length=0; z.clearMsgs();
  if(S.sos){S.sos.act=null;S.sos.next=S.min+99999;} if(S.blow){S.blow.stage=0;S.blow.next=S.min+99999;}})"""
SETUP = """(()=>{const z=__z,S=z.S; S.flags.intro=1; S.q.flash=2; S.q.medusa=1; S.money=3800;
  Object.assign(S.inv,{w_pm:1,w_aksu:1,a9:40,a545:90,medkit:3,bandage:4,cans:2,bread:2,sausage:1,vodka:1,antirad:1,grenade:1,art_medusa:1,art_blood:1,tail:3,hoof:1,ar_jacket:1,ar_zarya:1,flash:1});
  S.weapon='w_pm'; S.mag.w_pm=8; S.cond.w_pm=82; S.cond.w_aksu=64; S.armor='ar_jacket'; S.belt=['art_blood']; S.trackedQuestId='flash';
  const P=z.P; for(let y=2;y<108;y+=8)for(let x=2;x<120;x+=8){P.x=x*32;P.y=y*32;z.reveal();} })()"""
CAM = """((x,y,ang)=>{const z=__z,P=z.P; P.x=x*32; P.y=y*32; P.ang=ang; z.cam.x=P.x; z.cam.y=P.y; window.__lock&&clearInterval(window.__lock); window.__lock=setInterval(()=>{z.cam.x=x*32; z.cam.y=y*32;},5);})"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        log=[]
        for vw,vh,dpr in [(844,390,2),(390,844,2),(844,390,3)]:
            ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=dpr,has_touch=True,is_mobile=True)
            pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
            await pg.goto('file:///home/claude/zona2d/index.html#qa' + ('-g3-off' if OFF else '')); await pg.wait_for_timeout(1000)
            await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
            if vh>vw:
                try: await pg.click('#rot-skip',timeout=1500)
                except Exception: pass
            await pg.evaluate(SETUP)
            tag=f'{vw}x{vh}_dpr{dpr}'
            async def shot(name, x, y, hour=13, hud=True, js=None, ang=-1.57):
                await pg.evaluate(FIX+'(%s)'%hour); await pg.evaluate(CAM+'(%s,%s,%s)'%(x,y,ang))
                if js: await pg.evaluate(js)
                await pg.evaluate("document.querySelector('.hud').style.visibility='%s'; document.querySelector('.touch').style.visibility='%s'"%(('visible',)*2 if hud else ('hidden',)*2))
                await pg.wait_for_timeout(450); await pg.evaluate(FIX+'(%s)'%hour); await pg.wait_for_timeout(100)
                await pg.screenshot(path=('qa/g3/before/' if OFF else 'qa/g3/after/') + f'{tag}_{name}.png')
            close="__z.closePanel()"
            if dpr==2 and vw>vh:
                await shot('01_village_noui',30.5,86,hud=False)
                await shot('03_atp',94,70,hud=False)
                await shot('04_farm',88,16,hud=False)
                await shot('05_night_generator',31,85.5,hour=22.5,hud=False,js="(()=>{__z.rc.q5().st='completed';})()")
            if dpr==2:
                await shot('02_village_hud',30.5,86)
                await shot('06_kpk',30.5,86,js="(()=>{const z=__z; z.openPanel('pda','КПК',z.PDA_TABS2); z.panel.qsel='flash'; z.refresh();})()"); await pg.evaluate(close)
                await shot('07_dialog',27.5,80,js="(()=>{const z=__z; z.rc.q5().st='not_started'; const w=z.ents.find(e=>e.name==='Волк'); z.P.x=w.x; z.P.y=w.y+36; for(let i=0;i<3;i++) z.update(1/30); z.interact();})()"); await pg.evaluate(close)
                await shot('09_trade_scroll',30.5,86,js="(()=>{const z=__z; z.openTrade(null); z.panel.offer={buy:{medkit:1,vodka:1,grenade:1,antirad:1,bread:1},sell:{hoof:1,tail:1,art_medusa:1}}; z.refresh();})()"); await pg.evaluate(close)
                await shot('10_loot',30.5,86,js="(()=>{const z=__z; z.openLoot({k:'body',name:'Бандит',x:z.P.x,y:z.P.y,loot:{bread:1,sausage:2,vodka:1,ar_bandit:1,tail:1,grenade:1,a9:12,money:140}});})()"); await pg.evaluate(close)
            await shot('08_rucksack',30.5,86,js="(()=>{const z=__z; z.openPanel('inv','Рюкзак'); z.panel.sel='ar_zarya'; z.refresh();})()"); await pg.evaluate(close)
            if dpr==3: await shot('02_village_hud',30.5,86)
            log.append((tag,errs[:2])); await ctx.close()
        print(log); await b.close()
asyncio.run(main())
