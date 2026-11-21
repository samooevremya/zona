import asyncio,base64,json
from playwright.async_api import async_playwright
X0,Y0,X1,Y1=256,128,336,208   # клетки
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await (await b.new_context(viewport={'width':1200,'height':800})).new_page()
        await pg.goto('file:///tmp/z25/index_big.html#qa-seed=7');await pg.wait_for_function("()=>document.getElementById('tcard').innerHTML.length>10",timeout=90000)
        await pg.get_by_role('button',name='Новая игра').click();await pg.wait_for_timeout(1000)
        await pg.evaluate("()=>{__z.S.flags.intro=1;window.__treeCap=new Map();__z.S.min=12*60}")
        # проход камеры по области, чтобы собрать кроны
        for ty in range(Y0,Y1+1,10):
            for tx in range(X0,X1+1,14):
                await pg.evaluate(f"()=>{{const z=__z,P=z.P;P.x={tx}*32;P.y={ty}*32;z.cam.x=P.x;z.cam.y=P.y;}}")
                await pg.wait_for_timeout(90)
        data=await pg.evaluate(f"""()=>{{const X=window.__x25,T=X.T,X0={X0},Y0={Y0},X1={X1},Y1={Y1};
          // земля
          const S=0.8,gc=document.createElement('canvas');gc.width=(X1-X0)*T*S;gc.height=(Y1-Y0)*T*S;const g=gc.getContext('2d');
          for(let cy=Math.floor(Y0*T/X.GCH);cy*X.GCH<Y1*T;cy++)for(let cx=Math.floor(X0*T/X.GCH);cx*X.GCH<X1*T;cx++){{const c=X.groundChunk(cx,cy);g.drawImage(c,(cx*X.GCH-X0*T)*S,(cy*X.GCH-Y0*T)*S,X.GCH*S,X.GCH*S);}}
          const ground=gc.toDataURL('image/jpeg',0.84);
          // дома и крыши
          const houses=[];X.HOUSES.forEach((h,i)=>{{if(h.x+h.w<X0||h.x>X1||h.y+h.h<Y0||h.y>Y1)return;const pad=24,c=document.createElement('canvas');c.width=h.w*T+pad*2;c.height=h.h*T+pad*2;const r=c.getContext('2d');r.translate(-h.x*T+pad,-h.y*T+pad);h.a=1;X.drawHouseRoof(r,h,i,1);
            houses.push({{x:h.x,y:h.y,w:h.w,h:h.h,mat:h.mat,ruin:h.ruin,doors:h.doors,roof:c.toDataURL('image/png'),pad}});}});
          // кроны
          const spr=[],tr=[];for(const [k,v] of window.__treeCap){{const [s,x,y,w,h]=v;if(x<X0*T||x>X1*T||y<Y0*T||y>Y1*T)continue;let i=spr.indexOf(s);if(i<0){{spr.push(s);i=spr.length-1;}}tr.push([i,Math.round(x),Math.round(y),Math.round(w),Math.round(h)]);}}
          const crowns=spr.map(s=>s.toDataURL('image/png'));
          // люди и мутанты
          const ents=X.ents.filter(e=>e!==X.P&&e.alive&&e.x>X0*T&&e.x<X1*T&&e.y>Y0*T&&e.y<Y1*T).map(e=>({{kind:e.kind,fac:e.fac,x:Math.round(e.x),y:Math.round(e.y),ang:e.ang,sit:!!e.sit,name:e.name||''}}));
          const A=globalThis.CORDON_G31,act=A.manifest.actors,img={{}},man={{}};
          for(const sk of ['loner','bandit','army','zarya','dog'])for(const ps of ['idle','walk_left','walk_pass_left','walk_right','walk_pass_right','seated']){{const f=act[sk]&&act[sk][ps];if(!f)continue;man[sk+'_'+ps]={{w:f.width,h:f.height}};img[sk+'_'+ps]=A.images[f.file];}}
          return {{X0,Y0,X1,Y1,T,S,ground,houses,crowns,trees:tr,ents,img,man,player:{{x:X.P.x,y:X.P.y}}}};}}""")
        json.dump(data,open('/home/claude/z25/assets/village.json','w'))
        print(len(data['houses']),'houses',len(data['trees']),'trees',len(data['crowns']),'crowns',len(data['ents']),'ents',len(data['ground'])//1024,'KB ground')
        await b.close()
asyncio.run(main())
