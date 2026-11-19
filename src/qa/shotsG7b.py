"""G7: Сидорович, генератор и предметы на земле, повороты 1×/2×, оружие у стены, цикл шага и падение (GIF из игры)."""
import asyncio, json, io
from PIL import Image
from playwright.async_api import async_playwright
src = open('qa/shotsG3.py', encoding='utf8').read()
exec(src[:src.index('async def main')])          # FIX, STAGE
CAM = """((x,y)=>{const z=__z; z.cam.x=x; z.cam.y=y; window.__lock&&clearInterval(window.__lock); window.__lock=setInterval(()=>{z.cam.x=x; z.cam.y=y;},5);})"""
HIDE = "document.querySelector('.hud').style.visibility='hidden'; document.querySelector('.touch').style.visibility='hidden'"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/index.html#qa'); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button', name='Новая игра').tap(); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{const S=__z.S; S.flags.intro=1; S.weapon='w_aksu'; S.inv.w_aksu=1; S.armor='ar_jacket';})()"); await pg.evaluate(HIDE)
        async def snap(name, x, y, hour=13, js=None, clip=None, wait=350):
            await pg.evaluate(FIX + '(%s)' % hour); await pg.evaluate(CAM + '(%s,%s)' % (x, y))
            if js: await pg.evaluate(js)
            await pg.wait_for_timeout(wait); await pg.evaluate(FIX + '(%s)' % hour); await pg.wait_for_timeout(60)
            return await pg.screenshot(path=f'qa/g7/{name}.png' if name else None, clip=clip)
        # Сидорович: idle рядом с игроком, relaxed когда игрок далеко
        sid = await pg.evaluate("(()=>{const s=__z.ents.find(e=>e.sid==='sid'); return [s.x,s.y];})()")
        await snap('10_sid_near', sid[0], sid[1] + 40, js="(()=>{const z=__z,s=z.ents.find(e=>e.sid==='sid'); z.P.x=s.x; z.P.y=s.y+70;})()")
        # генератор: день, ночь до/после квеста; предметы на земле
        g = await pg.evaluate("(()=>{const o=__z.map.objs.find(o=>o.k==='genset'); return [o.x,o.y];})()")
        await snap('11_generator_day', g[0], g[1], js="(()=>{__z.P.x=%s; __z.P.y=%s;})()" % (g[0] - 80, g[1] + 80))
        await snap('12_generator_night_on', g[0], g[1], hour=22.5, js="(()=>{__z.rc.q5().st='completed';})()")
        pk = await pg.evaluate("(()=>{const z=__z; return z.map.objs.filter(o=>o.pick).map(o=>[o.pick,o.x,o.y]);})()")
        for name, x, y in pk:
            await snap('13_pick_' + name, x, y, js="(()=>{__z.P.x=%s; __z.P.y=%s;})()" % (x + 40, y + 30))
        # повороты 1× (как в игре) и 2× (увеличенный фрагмент)
        await pg.evaluate(FIX + '(13)'); await pg.evaluate(STAGE + '(31.5,88.5,%s)' % json.dumps([[{'fac': 'loner', 'a': i * 0.7854, 'w': 'w_aksu', 'gap': 1.5} for i in range(8)], [{'fac': 'army', 'a': i * 0.7854, 'w': 'w_pm', 'crouch': 1, 'gap': 1.5} for i in range(8)]]))
        await pg.evaluate("(window.__qa||[]).forEach(e=>__z.rc.g7.qaRig(e,0,60))"); await pg.wait_for_timeout(300)
        full = Image.open(io.BytesIO(await pg.screenshot())); full.save('qa/g7/14_rotations_1x.png')
        box = full.crop((560, 240, 1130, 470)); box.resize((box.width * 2, box.height * 2), Image.NEAREST).save('qa/g7/14_rotations_2x.png')
        # оружие у стены: ствол «за стеной», вспышка у стены, трассера за стеной нет
        await pg.evaluate("""(()=>{const z=__z,G=z.rc.g7,T=32; (window.__qa||[]).forEach(e=>e.alive=0); z.ents.splice(0,z.ents.length,...z.ents.filter(e=>!e.qaHold));
          const P=z.P; let fx=0,fy=0; for(let ty=80;ty<100&&!fx;ty++) for(let tx=20;tx<60&&!fx;tx++){ const i=ty*z.map.MW+tx; if(G.opq[i+1]&&!G.opq[i]&&z.map.nav[i]&&!G.opq[i-1]){fx=tx;fy=ty;} }
          P.x=(fx+0.5)*T; P.y=(fy+0.5)*T; P.ang=0; z.S.weapon='w_aksu'; z.S.mag.w_aksu=30; window.__wall=[P.x,P.y]; })()""")
        wl = await pg.evaluate("window.__wall")
        await snap(None, wl[0], wl[1])
        await pg.evaluate("(()=>{const z=__z,G=z.rc.g7,P=z.P; P.qaRig=0; G.fire(P,0,Object.assign({},G.WP.w_aksu),0); G.flashes.forEach(f=>f.life=30); G.tracers.forEach(t=>t.life=30); })()")
        await pg.wait_for_timeout(120)
        sh = Image.open(io.BytesIO(await pg.screenshot())); c = sh.crop((744, 290, 944, 490)); c.resize((400, 400), Image.NEAREST).save('qa/g7/15_wall_shot_2x.png')
        await pg.evaluate("(()=>{const G=__z.rc.g7; G.flashes.length=0; G.tracers.length=0;})()")
        # цикл шага: 12 кадров по 4 px пути, GIF
        await pg.evaluate(FIX + '(13)'); await pg.evaluate(STAGE + '(31.5,88.5,%s)' % json.dumps([[{'fac': 'loner', 'a': 1.5708, 'w': 'w_aksu', 'gap': 2.2}, {'fac': 'army', 'a': 1.5708, 'w': 'w_pm', 'gap': 2.2}, {'fac': 'bandit', 'a': 1.5708, 'w': 'w_obrez', 'crouch': 1, 'gap': 2.2}]]))
        frames = []
        for i in range(12):
            await pg.evaluate("(window.__qa||[]).forEach(e=>{e.qaRig=0; __z.rc.g7.qaRig(e,%s,60, e.crouch?'crouch_walk':'walk');})" % (4 if i else 0.01))
            await pg.wait_for_timeout(60)
            fr = Image.open(io.BytesIO(await pg.screenshot(clip={'x': 322, 'y': 150, 'width': 200, 'height': 90})))
            frames.append(fr.resize((fr.width, fr.height)))
        frames[0].save('qa/g7/16_walkcycle.gif', save_all=True, append_images=frames[1:], duration=110, loop=0)
        # падение: fall_start → fall_mid → dead (возраст 0…0.5 с), смерть уже произошла логически
        await pg.evaluate("""(()=>{const z=__z,G=z.rc.g7; (window.__qa||[]).forEach(e=>e.alive=0); z.ents.splice(0,z.ents.length,...z.ents.filter(e=>!e.qaHold));
          window.__lock&&clearInterval(window.__lock); window.__lock=setInterval(()=>{z.cam.x=31.6*32; z.cam.y=88.5*32;},5);
          window.__falls=[['loner',0],['bandit',1],['army',2]].map(([f,i])=>{const o={k:'body',kind:'human',fac:f,x:(30+i*1.6)*32,y:88.5*32,ang:1.5708,loot:{},name:'x',t:z.S.min,seed:i+1,qa:1}; z.map.objs.push(o); G.g7Fresh(o); return o;}); })()""")
        frames = []
        for age in [0, 0.07, 0.15, 0.22, 0.3, 0.38, 0.45, 0.6]:
            await pg.evaluate("(()=>{const G=__z.rc.g7; window.__falls.forEach(o=>{const b=G.BODYFX.get(o); if(b) b.t0=G.G7.vt-%s;});})()" % age)
            fr = Image.open(io.BytesIO(await pg.screenshot(clip={'x': 322, 'y': 150, 'width': 200, 'height': 90}))); frames.append(fr)
            if age in (0.07, 0.22, 0.6): fr.save('qa/g7/17_fall_%03d.png' % int(age * 100))
        frames[0].save('qa/g7/17_fall.gif', save_all=True, append_images=frames[1:], duration=[140] * 7 + [900], loop=0)
        print('ok', errs[:3], pk); await b.close()
asyncio.run(main())
