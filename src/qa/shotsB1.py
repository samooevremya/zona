"""Приёмка набора B1: персонажи у костра на обычном зуме, поворот, светлый грунт / тёмный интерьер / бунker, предметы в окнах."""
import asyncio, sys
from playwright.async_api import async_playwright
FIX = """(()=>{const z=__z,S=z.S;
  S.min = (window.__hour || 13)*60 + 1440; S.wx = { k: 'clear', until: S.min + 9999 }; Object.assign(z.WX, { cloud: 0.1, rain: 0, fog: 0, flash: 0, red: 0 }); z.WX.drops.length = 0; z.clearMsgs();
  if (S.sos) { S.sos.act = null; S.sos.next = S.min + 99999; } if (S.blow) { S.blow.stage = 0; S.blow.next = S.min + 99999; }
})()"""
STAGE = """((cx, cy, angs, inside) => {const z=__z,S=z.S,P=z.P;
  S.flags.intro=1; Object.assign(S.inv,{w_pm:1,w_aksu:1,a9:40,bandage:3,cans:2,ar_zarya:1,ar_jacket:1,medkit:1}); S.weapon='w_pm'; S.mag.w_pm=8; S.cond.w_pm=88; S.armor='ar_jacket';
  const pick = (f) => z.ents.find(f);
  const L = window.__b1 || (window.__b1 = {
    loner: pick(e=>e.alive&&e.sid==='l5'), bandit: pick(e=>e.alive&&e.sid==='b2'), army: pick(e=>e.alive&&e.sid==='a1'), dog: pick(e=>e.alive&&e.kind==='dog') });
  L.bandit.wpn='w_obrez'; L.army.wpn='w_aksu'; L.loner.wpn='w_pm';
  const pos = { loner:[-1.6,0], bandit:[0,0], army:[1.6,0], dog:[3.0,0.2] };
  Object.entries(L).forEach(([k,e],i)=>{ e.dormant=1; e.tgt=null; e.x=(cx+pos[k][0])*32; e.y=(cy+pos[k][1])*32; e.ang=angs[i]; e.mv=0; e.flash=0; e.sit=0; e.crouch=0; });
  P.x=(cx-3.2)*32; P.y=(cy+0.1)*32; P.ang=angs[4]; z.cam.x=cx*32; z.cam.y=cy*32;
})"""
async def main():
    vw, vh = 844, 390
    off = len(sys.argv) > 1 and sys.argv[1] == 'off'
    pre = 'off_' if off else ''
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        out=[]
        for dpr in ([2] if off else [2, 3]):
            ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=dpr,has_touch=True,is_mobile=True)
            pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto('file:///home/claude/zona2d/index.html' + ('#b1-off' if off else '')); await pg.wait_for_timeout(1000)
            await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
            async def shot(name, stage, hud=False, extra=None):
                await pg.evaluate(FIX); await pg.evaluate(STAGE + stage)
                # камера держится на точке: фиксируем после кадра
                await pg.evaluate("(()=>{const z=__z; window.__lock && clearInterval(window.__lock); const cx=z.cam.x, cy=z.cam.y; window.__lock=setInterval(()=>{z.cam.x=cx; z.cam.y=cy;},5);})()")
                if extra: await pg.evaluate(extra)
                await pg.evaluate("document.querySelector('.hud').style.visibility='%s'; document.querySelector('.touch').style.visibility='%s'" % (('visible','visible') if hud else ('hidden','hidden')))
                await pg.wait_for_timeout(500); await pg.evaluate(FIX); await pg.wait_for_timeout(100)
                await pg.screenshot(path=f'qa/b1/{pre}dpr{dpr}_{name}.png')
            D = 1.5708
            await shot('01_fire_down', f"(31.5, 89.6, [{D},{D},{D},{D},{D}])")
            await shot('02_fire_rotated', f"(31.5, 89.6, [0, 2.4, -1.2, 3.14, -0.6])")
            await shot('03_fire_hud', f"(31.5, 89.6, [{D},{D},{D},{D},-0.6])", hud=True)
            await shot('04_house_interior', f"(43.0, 90.0, [{D},0.6,2.6,{D},0])")
            await pg.evaluate("window.__hour = 23.5")
            await shot('05_fire_night', f"(31.5, 89.6, [{D},0.6,2.6,{D},-0.6])")
            await pg.evaluate("window.__hour = 13")
            if not off:
                await pg.evaluate("clearInterval(window.__lock)")
                await pg.evaluate(FIX)
                await pg.evaluate("(()=>{const z=__z; z.openPanel('inv','Рюкзак'); z.panel.sel='ar_zarya'; z.refresh(); })()"); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'qa/b1/dpr{dpr}_06_inventory.png'); await pg.evaluate("__z.closePanel()")
                await pg.evaluate("(()=>{const z=__z; z.openTrade(null); __z.S.weapon='w_aksu'; z.panel.offer={buy:{bandage:1,cans:1},sell:{w_pm:1}}; z.refresh(); })()"); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'qa/b1/dpr{dpr}_07_trade.png'); await pg.evaluate("__z.closePanel()")
            out.append((dpr, errs[:3])); await ctx.close()
        print(pre or 'on', out); await b.close()
asyncio.run(main())
