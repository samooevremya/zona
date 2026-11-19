import asyncio, sys, json
from playwright.async_api import async_playwright
HASH = sys.argv[1] if len(sys.argv) > 1 else ''
TAG = sys.argv[2] if len(sys.argv) > 2 else 'g8'
SCENE = r"""(o)=>{const z=__z,P=z.P,T=32,mk=z.rc.mk;z.S.flags.intro=1;z.closePanel&&z.closePanel();
P.x=o.x*T;P.y=o.y*T;z.cam.x=P.x;z.cam.y=P.y;z.S.hp=100;P.hp=100;
for(const e of z.ents.slice()) if(e!==P&&Math.hypot(e.x-P.x,e.y-P.y)<700) e.x+=4000;
const add=(e,dx,dy,ang,extra)=>{e.x=P.x+dx;e.y=P.y+dy;e.ang=ang;e.think=1e9;e.qaHold=1;Object.assign(e,extra||{});z.ents.push(e);return e;};
const A=Math.PI/2;
add(mk.mkHuman({fac:'loner',x:0,y:0,wpn:'w_aksu'}),-150,-70,A);
add(mk.mkHuman({fac:'loner',x:0,y:0,wpn:'w_pm'}),-100,-70,A,{crouch:1});
add(mk.mkHuman({fac:'bandit',x:0,y:0,wpn:'w_obrez'}),-50,-70,A);
add(mk.mkHuman({fac:'army',x:0,y:0,wpn:'w_aksu'}),0,-70,A);
add(mk.mkHuman({fac:'loner',x:0,y:0,wpn:'knife'}),50,-70,A);
add(mk.mkHuman({fac:'bandit',x:0,y:0}),100,-70,A,{wounded:1});
add(mk.mkHuman({fac:'loner',x:0,y:0}),150,-70,A,{captive:1});
add(mk.mkDog({x:0,y:0}),-150,70,A);add(mk.mkBoar({x:0,y:0}),-90,70,A);
const s=mk.mkSucker();s.cloak=0;add(s,-30,70,A,{state:'stalk'});
const objs=z.map.objs;let i=0;for(const [k,f] of [['human','loner'],['human','zarya'],['human','bandit'],['human','army'],['human','loner'],['human','bandit'],['dog','mutant'],['boar','mutant'],['sucker','mutant']]){
 objs.push({k:'body',x:P.x+40+ (i%3)*55,y:P.y+40+Math.floor(i/3)*60,ang:A+(i*0.7),fac:f==='zarya'?'loner':f,kind:k,seed:11+i*7,loot:{},t:0});i++;}
P.ang=-A;z.clearMsgs();return z.ents.length;}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto('file:///home/claude/zona2d/index_big.html#qa-seed=7' + HASH); await pg.wait_for_timeout(2500)
        await pg.get_by_role('button', name='Новая игра').tap(); await pg.wait_for_timeout(500)
        await pg.evaluate(SCENE, {'x': 100, 'y': 150}); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f'qa/big/{TAG}_scene.png')
        # крупно: увеличенный фрагмент без HUD-перекрытий
        await pg.screenshot(path=f'qa/big/{TAG}_scene_zoom.png', clip={'x': 250, 'y': 90, 'width': 360, 'height': 220})
        # Сидорович
        r = await pg.evaluate("""()=>{const z=__z,s=z.ents.find(e=>e.sid==='sid');if(!s)return null;const P=z.P;P.x=s.x;P.y=s.y+70;P.ang=-Math.PI/2;z.cam.x=P.x;z.cam.y=P.y-30;z.clearMsgs();return [s.x,s.y,s.ang,s.sit]}""")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f'qa/big/{TAG}_sid.png')
        info = await pg.evaluate("()=>({g8:!!window.CORDON_G8_ON,ready:__z.rc.g3().ready,sk:__z.rc.g7.G7.skins})")
        # панель рюкзака: иконки, рамки
        await pg.evaluate("()=>{__z.S.inv.w_aksu=1;__z.S.inv.knife=1;__z.openPanel('inv','Рюкзак',[['all','Все']]);__z.refresh&&__z.refresh();}")
        await pg.wait_for_timeout(500); await pg.screenshot(path=f'qa/big/{TAG}_inv.png')
        print(json.dumps({'sid': r, 'info': info, 'errors': errs[:5]}, ensure_ascii=False)); await b.close()
asyncio.run(main())
