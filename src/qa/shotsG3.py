"""Визуальная матрица G3: одна камера у костра, 13:00, ясно. Сравнение с #g3-off (прежняя отрисовка B1/процедурная)."""
import asyncio, json, sys
from playwright.async_api import async_playwright
FIX = """((h)=>{const z=__z,S=z.S; S.min=h*60+1440; S.wx={k:'clear',until:S.min+9999}; Object.assign(z.WX,{cloud:0.1,rain:0,fog:0,flash:0,red:0}); z.WX.drops.length=0; z.clearMsgs();
 if(S.sos){S.sos.act=null;S.sos.next=S.min+99999;} if(S.blow){S.blow.stage=0;S.blow.next=S.min+99999;} })"""
STAGE = """((cx,cy,rows)=>{const z=__z,M=z.rc.mk,S=z.S,P=z.P; window.__qa&&window.__qa.forEach(e=>{e.alive=0}); z.ents.splice(0,z.ents.length,...z.ents.filter(e=>!e.qaHold)); window.__qa=[]; z.map.objs.splice(0,z.map.objs.length,...z.map.objs.filter(o=>!o.qa));
 z.ents.forEach(e=>{ if(e!==P && Math.hypot(e.x-cx*32,e.y-cy*32)<420) { e.x+=2000; } });
 rows.forEach((r,ri)=>r.forEach((d,ci)=>{ const x=cx+(ci-(r.length-1)/2)*d.gap, y=cy+ri*1.9-((rows.length-1)*0.95);
   let e; if(d.k==='dog') e=M.mkDog({x,y}); else if(d.k==='boar') e=M.mkBoar({x,y}); else if(d.k==='sucker'){ e=M.mkSucker(); e.x=x*32; e.y=y*32; }
   else e=M.mkHuman({fac:d.fac||'loner',x,y,wpn:d.w||'w_pm'});
   e.qaHold=1; e.ang=d.a; if(d.sit) e.sit=1; if(d.crouch) e.crouch=1; if(d.wounded) e.wounded=1; if(d.captive) e.captive=1; if(d.cloak!=null){e.cloak=d.cloak; e.state=d.state||'stalk';} if(d.state) e.state=d.state;
   if(d.dead){ e.alive=0; z.map.objs.push({k:'body',kind:d.k==='human'?'human':d.k,fac:d.fac||'loner',x:x*32,y:y*32,ang:d.a,loot:{},name:'x',t:0,qa:1}); return; }
   if(d.walk){ e.g3dist=d.walk*11; e.g3x=e.x-0.5; e.g3y=e.y; e.g3moveT=1; }
   z.ents.push(e); window.__qa.push(e); }));
 P.x=cx*32; P.y=(cy+rows.length*1.9)*32+40; z.cam.x=cx*32; z.cam.y=cy*32; window.__lock&&clearInterval(window.__lock); window.__lock=setInterval(()=>{z.cam.x=cx*32; z.cam.y=cy*32; (window.__qa||[]).forEach(e=>{ if(e.g3moveT) { e.g3x=e.x-0.5; e.g3moveT=1; } });},5);
})"""
D=1.5708
LINEUP=[[{'fac':'loner','a':D,'gap':1.6},{'fac':'bandit','a':D,'w':'w_obrez','gap':1.6},{'fac':'army','a':D,'w':'w_aksu','gap':1.6},{'k':'dog','a':D,'gap':1.6},{'k':'boar','a':D,'gap':1.6},{'k':'sucker','a':D,'cloak':0,'gap':1.6}]]
ROT=[[{'fac':'loner','a':i*0.7854,'gap':1.5} for i in range(8)],[{'k':'dog','a':i*0.7854,'gap':1.5} for i in range(8)]]
POSES=[[{'fac':'loner','a':D,'gap':1.7},{'fac':'loner','a':D,'walk':0,'gap':1.7},{'fac':'loner','a':D,'walk':1,'gap':1.7},{'fac':'loner','a':D,'walk':2,'gap':1.7},{'fac':'loner','a':D,'walk':3,'gap':1.7}],
       [{'fac':'loner','a':D,'sit':1,'gap':1.7},{'fac':'loner','a':D,'crouch':1,'gap':1.7},{'fac':'loner','a':D,'wounded':1,'gap':1.7},{'fac':'loner','a':D,'captive':1,'gap':1.7},{'k':'human','fac':'loner','a':D,'dead':1,'gap':1.7}]]
WEAP=[[{'fac':f,'a':0,'w':w,'gap':1.7} for w in ['w_pm','w_obrez','w_aksu','knife']] for f in ['loner','bandit','army']]
SUCK=[[{'k':'sucker','a':D,'cloak':1,'state':'stalk','gap':2},{'k':'sucker','a':D,'cloak':0.2,'state':'stalk','gap':2},{'k':'sucker','a':D,'cloak':0,'state':'strike','gap':2},{'k':'sucker','a':D,'dead':1,'gap':2}],
      [{'k':'dog','a':D,'state':'x','gap':2},{'k':'boar','a':D,'state':'charge','gap':2},{'k':'boar','a':D,'dead':1,'gap':2},{'k':'dog','a':D,'dead':1,'gap':2}]]
async def main():
    off = len(sys.argv)>1 and sys.argv[1]=='off'
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,has_touch=True,is_mobile=True)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.goto('file:///home/claude/zona2d/index.html#qa'+('-g3-off' if off else '')); await pg.wait_for_timeout(1300)
        await pg.get_by_role('button',name='Новая игра').tap(); await pg.wait_for_timeout(300)
        await pg.evaluate("(()=>{const S=__z.S; S.flags.intro=1; S.weapon='w_pm'; S.inv.w_pm=1; S.armor='ar_zarya'; S.inv.ar_zarya=1;})()")
        pre='off_' if off else ''
        async def shot(name, rows, cx=31.5, cy=88.5, hour=13):
            await pg.evaluate(FIX+'(%s)'%hour); await pg.evaluate(STAGE+'(%s,%s,%s)'%(cx,cy,json.dumps(rows)))
            await pg.evaluate("document.querySelector('.hud').style.visibility='hidden'; document.querySelector('.touch').style.visibility='hidden'")
            await pg.wait_for_timeout(400); await pg.evaluate(FIX+'(%s)'%hour); await pg.wait_for_timeout(80)
            await pg.screenshot(path=f'qa/g3/{pre}{name}.png')
        await shot('01_lineup_day', LINEUP)
        await shot('02_rotations', ROT)
        await shot('03_poses', POSES)
        await shot('04_weapons', WEAP)
        await shot('05_sucker_mutants', SUCK)
        await shot('06_lineup_night', LINEUP, hour=23.3)
        await shot('07_lineup_dark_floor', LINEUP, cx=42.5, cy=90.2)
        print('ok', errs[:3]); await b.close()
asyncio.run(main())
