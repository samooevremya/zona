"""Два касания одновременно (движение+огонь, движение+действие), сброс ввода при сворачивании, замер кадра.
Касания посылаются через CDP Input.dispatchTouchEvent с несколькими точками."""
import asyncio, json
from playwright.async_api import async_playwright
async def run(vw, vh):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,has_touch=True,is_mobile=True)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa'); await pg.wait_for_timeout(1000)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        if vh>vw:
            try: await pg.click('#rot-skip',timeout=1500)
            except Exception: pass
        await pg.evaluate("(()=>{const S=__z.S; S.flags.intro=1; S.inv.w_pm=1; S.inv.a9=200; S.weapon='w_pm'; S.mag.w_pm=8;})()")
        cdp=await ctx.new_cdp_session(pg)
        fire=await pg.evaluate("(()=>{const r=document.getElementById('b-fire').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]})()")
        act=await pg.evaluate("(()=>{const r=document.getElementById('b-rel').getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]})()")
        mv=[vw*0.18, vh*0.75]
        async def touch(t, pts): await cdp.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in pts]})
        res={}
        # Empty terrain on the right has no joystick and cannot fire.
        point=await pg.evaluate("""()=>{for(let y=innerHeight*.32;y<innerHeight*.72;y+=12)
          for(let x=innerWidth*.54;x<innerWidth*.82;x+=10)
            if(document.elementFromPoint(x,y)?.tagName==='CANVAS') return [x,y];
          throw Error('No open aiming area')}""")
        await touch('touchStart',[(1,point)])
        await touch('touchMove',[(1,(point[0]+77,point[1]+8))])
        await pg.wait_for_timeout(300)
        aim=await pg.evaluate("({stick:!!__z.IN.aimStick, mag:__z.S.mag.w_pm, fire:!!__z.IN.btnFire})")
        await touch('touchEnd',[])
        res['empty_right']={'ok':not aim['stick'] and aim['mag']==8 and not aim['fire'], 'during':aim}
        # движение + огонь
        await touch('touchStart',[(0,mv)]); await touch('touchMove',[(0,(mv[0]+40,mv[1]-10))])
        await touch('touchStart',[(0,(mv[0]+40,mv[1]-10)),(1,fire)])
        await touch('touchMove',[(0,(mv[0]+40,mv[1]-10)),(1,(fire[0],fire[1]-58))])
        await pg.wait_for_timeout(250)
        stick=await pg.evaluate("({a:__z.IN.aimStick?.a,bar:parseFloat(document.getElementById('b-fire').style.getPropertyValue('--aim-y')),left:!!__z.IN.left})")
        res['drag_fire']={'ok':stick['left'] and abs(stick['a']+1.5708)<.08 and stick['bar']<-5,'during':stick}
        s1=await pg.evaluate("({mx:__z.IN.moveX,my:__z.IN.moveY,fire:!!__z.IN.btnFire,mag:__z.S.mag.w_pm})")
        await touch('touchEnd',[]); await pg.wait_for_timeout(120)
        s2=await pg.evaluate("({mx:__z.IN.moveX,fire:!!__z.IN.btnFire,left:!!__z.IN.left})")
        res['move+fire']={'ok': abs(s1['mx'])>0.2 and s1['fire'] and s1['mag']<8 and s2['mx']==0 and not s2['fire'] and not s2['left'], 'during':s1, 'after':s2}
        # движение + действие (перезарядка)
        await pg.evaluate("__z.S.mag.w_pm=3")
        await touch('touchStart',[(0,mv)]); await touch('touchMove',[(0,(mv[0]+40,mv[1]))])
        await touch('touchStart',[(0,(mv[0]+40,mv[1])),(1,act)]); await pg.wait_for_timeout(60)
        dbg=await pg.evaluate("({left:!!__z.IN.left,mx:__z.IN.moveX,rel:__z.P.reload})")
        await touch('touchEnd',[(1,act)])
        await pg.wait_for_timeout(1700)
        s3=await pg.evaluate("({mx:__z.IN.moveX,mag:__z.S.mag.w_pm,rel:__z.P.reload})")
        await touch('touchEnd',[]); await pg.wait_for_timeout(100)
        s4=await pg.evaluate("({mx:__z.IN.moveX,left:!!__z.IN.left})")
        res['move+action']={'bothDown':dbg,'ok': (s3['mag']==8 or s3['rel']>0) and abs(s3['mx'])>0.2 and s4['mx']==0 and not s4['left'], 'during':s3,'after':s4}
        # Второй палец меняет оружие, первый продолжает двигать героя.
        await pg.evaluate("__z.closePanel();__z.S.flags.kit.sidearm='w_pm';__z.S.weapon='knife'")
        hand=await pg.evaluate("(()=>{const r=document.getElementById('wpnbox').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        drag=(mv[0]+36,mv[1])
        await touch('touchStart',[(0,mv)]);await touch('touchMove',[(0,drag)])
        await touch('touchStart',[(0,drag),(1,hand)])
        await pg.wait_for_timeout(100)
        moving=await pg.evaluate("({gun:__z.S.weapon,stick:!!__z.IN.left,x:__z.IN.moveX})")
        await touch('touchEnd',[]);await pg.wait_for_timeout(80)
        once=await pg.evaluate("__z.S.weapon==='w_pm' && !__z.IN.left")
        res['move+switch']={'ok':moving['gun']=='w_pm' and moving['stick'] and moving['x']>.2 and once}
        # свернули окно с зажатыми касаниями
        await touch('touchStart',[(0,mv),(1,fire)]); await touch('touchMove',[(0,(mv[0]+40,mv[1])),(1,fire)]); await pg.wait_for_timeout(100)
        await pg.evaluate("window.dispatchEvent(new Event('blur'))"); await pg.wait_for_timeout(80)
        s5=await pg.evaluate("({mx:__z.IN.moveX,fire:!!__z.IN.btnFire,left:!!__z.IN.left,aim:!!__z.IN.aimStick})")
        res['blur_releases_input']={'ok': s5['mx']==0 and not s5['fire'] and not s5['left'] and not s5['aim'], 'after':s5}
        await touch('touchCancel',[])
        # кадр: rAF в headless Chrome (не телефон)
        perf=await pg.evaluate("""new Promise(r=>{let n=0,t0=performance.now(),mx=0,last=t0; function f(t){n++; mx=Math.max(mx,t-last); last=t; if(t-t0<3000) requestAnimationFrame(f); else r({fps:Math.round(n*1000/(t-t0)), worstFrameMs:Math.round(mx)});} requestAnimationFrame(f);})""")
        upd=await pg.evaluate("(()=>{const z=__z; const t0=performance.now(); for(let i=0;i<300;i++){z.P.hp=100; z.update(1/60);} return Math.round((performance.now()-t0)/300*100)/100;})()")
        res['perf']={'ok':True,'device':'headless Chrome (Linux, SwiftShader), %dx%d DPR2' % (vw,vh),'rafFps':perf['fps'],'worstFrameMs':perf['worstFrameMs'],'updateMsPerTick':upd}
        res['errors']=errs
        await b.close(); return res
async def main():
    out={f'{w}x{h}':await run(w,h) for w,h in [(844,390),(390,844)]}
    json.dump(out,open('qa/big/touch_perf_result.json','w'),ensure_ascii=False,indent=1)
    for k,v in out.items():
        for n,r in v.items():
            if isinstance(r,dict): print(k,n,'OK' if r.get('ok') else 'FAIL',json.dumps(r,ensure_ascii=False)[:260])
        print(k,'errors',v['errors'])
asyncio.run(main())
