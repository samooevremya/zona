"""Время кадра до/после: render() и update() в одной сцене (деревня, 13:00, 12 доп. людей в кадре). Headless SwiftShader — относительное сравнение."""
import asyncio, json, os
from playwright.async_api import async_playwright
JS = """(()=>{const z=__z,S=z.S; S.flags.intro=1; S.min=13*60+1440; const P=z.P; P.x=31*32; P.y=86*32; z.cam.x=P.x; z.cam.y=P.y;
 const M=z.rc.mk; for(let i=0;i<12;i++){ const e=M.mkHuman({fac:['loner','bandit','army'][i%3],x:27+i*0.7,y:89+(i%2),wpn:['w_pm','w_obrez','w_aksu'][i%3]}); e.qaHold=1; e.ang=i; z.ents.push(e); }
 const R=window.__zRender||null; for(let i=0;i<30;i++){ z.update(1/60); R&&R(); }
 const N=240; let t0=performance.now(); for(let i=0;i<N;i++) R(); const r=(performance.now()-t0)/N;
 t0=performance.now(); for(let i=0;i<N;i++) z.update(1/60); const u=(performance.now()-t0)/N;
 return JSON.stringify({renderMs:+r.toFixed(2), updateMs:+u.toFixed(3)}); })()"""
async def run(b, path, suf):
    pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2)).new_page()
    await pg.goto('file://'+path+'#qa'+suf); await pg.wait_for_timeout(1500)
    await pg.get_by_role('button',name='Новая игра').click(); await pg.wait_for_timeout(400)
    has = await pg.evaluate("!!window.__zRender")
    if not has: await pg.evaluate("window.__zRender=null")
    out=[]
    for k in range(3): out.append(json.loads(await pg.evaluate(JS)))
    await pg.close(); return out
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        res={}
        for name,path,suf in [('G7 (риг+позы)','/home/claude/zona2d/index.html',''),('G7 #rig-off (кадры G3)','/home/claude/zona2d/index.html','-rig-off'),('G7 #g3-off (B1/процедурная)','/home/claude/zona2d/index.html','-g3-off')]:
            r=await run(b,path,suf); res[name]={'renderMs':sorted(x['renderMs'] for x in r)[1],'updateMs':sorted(x['updateMs'] for x in r)[1]}
            print(name,res[name])
        for f,label in [('index.html','RC1 G7'),('/home/claude/zona2d_g31_backup/index.html','RC1 G3.1 (до)')]:
            path=f if f.startswith('/') else '/home/claude/zona2d/'+f
            res['size '+label]=os.path.getsize(path)
        print({k:v for k,v in res.items() if k.startswith('size')})
        json.dump(res,open('qa/g7/perf.json','w'),ensure_ascii=False,indent=1); await b.close()
asyncio.run(main())
