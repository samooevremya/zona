"""Ходьба по большому Кордону в настоящем цикле кадров (rAF): игрок бежит по шоссе с севера на юг,
   затем по грунтовке на восток. Меряются интервалы между кадрами и время дорисовки кусков земли."""
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        out={}
        for vw,vh in [(844,390),(390,844)]:
            pg=await (await b.new_context(viewport={'width':vw,'height':vh},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
            await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7'); await pg.wait_for_timeout(1500)
            await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
            try: await pg.click('#rot-skip',timeout=800)
            except Exception: pass
            r=await pg.evaluate("""()=>new Promise(res=>{const z=__z,B=__zBig,P=z.P;S0=z.S;z.S.flags.intro=1;P.hp=100;P.x=127.5*32;P.y=12*32;z.cam.x=P.x;z.cam.y=P.y;
              const iv=[];let last=performance.now(),n=0,p0=B.gStat.painted,maxChunk=0;
              function f(now){const dt=now-last;last=now;if(n>5)iv.push(dt);n++;P.hp=100;
                if(P.y<180*32){P.x=127.5*32;P.y+=190/60;}else{P.x+=190/60;}
                maxChunk=Math.max(maxChunk,B.gStat.ms);
                if(n<1500)requestAnimationFrame(f);else{iv.sort((a,b)=>a-b);res({frames:iv.length,medianMs:+iv[iv.length>>1].toFixed(1),p95Ms:+iv[Math.floor(iv.length*0.95)].toFixed(1),worstMs:Math.round(iv[iv.length-1]),over50:iv.filter(x=>x>50).length,chunksPainted:B.gStat.painted-p0,lastChunkMs:B.gStat.ms,aq:B.aq(),maxStepMs:B.gStat.stepMax,syncPaints:B.gStat.sync||0,cached:B.cache()});}}
              requestAnimationFrame(f);})""")
            out[f'{vw}x{vh}']=r; print(vw,vh,r); await pg.close()
        json.dump(out,open('qa/big/walkperf_result.json','w'),ensure_ascii=False,indent=1)
        await b.close()
asyncio.run(main())
