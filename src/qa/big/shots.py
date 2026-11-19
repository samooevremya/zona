import asyncio, json, base64
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7'); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(400)
        # открыть всю карту КПК и снять её целиком
        url=await pg.evaluate("""()=>{const z=__z,P=z.P;z.S.flags.intro=1;for(let y=4;y<218;y+=9)for(let x=4;x<238;x+=9){P.x=x*32;P.y=y*32;z.reveal();}
          const v=z.map.LOC.village.anchors.safe;P.x=v[0]*32;P.y=v[1]*32;z.cam.x=P.x;z.cam.y=P.y;
          const c=document.createElement('canvas');c.width=240*6;c.height=220*6;z.map.drawMapTo(c.getContext('2d'),6,true,{ppl:0,cache:1,u:1.6});return c.toDataURL('image/png');}""")
        open('qa/big/kpk_full.png','wb').write(base64.b64decode(url.split(',')[1]))
        # места в игре
        z="""(xy)=>{const z=__z,P=z.P;P.x=xy[0]*32;P.y=xy[1]*32;z.cam.x=P.x;z.cam.y=P.y;z.clearMsgs();}"""
        for n,xy in {'hutor':[33,132],'ford':[229,93],'column':[124,25],'west_exit':[8,118],'atp_road':[166,142],'village':[62,170]}.items():
            await pg.evaluate(z, xy); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f'qa/big/g_{n}.png')
        await b.close()
asyncio.run(main())
