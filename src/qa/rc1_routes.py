import asyncio, json, base64
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)).new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.goto('file:///home/claude/zona2d/index.html'); await pg.wait_for_timeout(1200)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        r=json.loads(await pg.evaluate(open('qa/rc1_routes.js').read()))
        # обзор всей карты из игровой геометрии: снять туман, нарисовать в 8 px/клетку
        d=await pg.evaluate("""(()=>{const z=__z,M=z.map; const P=z.P; for(let y=2;y<108;y+=8)for(let x=2;x<120;x+=8){P.x=x*32;P.y=y*32;z.reveal();} P.x=30*32;P.y=88*32;
          const c=document.createElement('canvas'); c.width=120*8; c.height=110*8; M.drawMapTo(c.getContext('2d'),8,true,{ppl:0,cache:0,u:1.6}); return c.toDataURL('image/png');})()""")
        open('qa/rc1/map_overview.png','wb').write(base64.b64decode(d.split(',')[1]))
        r['errors']=errs
        json.dump(r,open('qa/rc1/routes_result.json','w'),ensure_ascii=False,indent=1)
        print(json.dumps({k:(v if not isinstance(v,dict) or 'ok' in v else '...') for k,v in r.items()},ensure_ascii=False)[:1500])
        print('south',r['routesSouthBridgeClosed']); print('north',r['routesNorthBridgeClosed']); print('cross',r['crossings'],r['atpApproaches'])
        await b.close()
asyncio.run(main())
