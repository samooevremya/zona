"""Run with Playwright Chromium. Optionally set CHROMIUM to a local executable."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

game = Path(__file__).resolve().parents[3] / "index.html"
hook = "window.__zRender = render;"
build = game.read_text()
assert build.count(hook) == 1
build = build.replace(hook, hook + """
window.probe = {blowout, hud, sheltered, blowShelterTarget, drawWeatherScreen, HATCH, FIRE,
  render, get P(){return P}, get S(){return S}, get ctx(){return ctx}};
""")

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM"), args=["--disable-gpu","--single-process"])
    page = browser.new_page(viewport={"width":844,"height":390}, is_mobile=True, has_touch=True)
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.route("https://fonts.**/*", lambda route: route.abort())
    page.route("**/index.html", lambda route: route.fulfill(body=build, content_type="text/html"))
    page.goto("http://game.test/index.html#qa-seed=7")
    page.get_by_role("button", name="Новая игра").tap()
    page.evaluate("""()=>{__z.closePanel(); __z.S.flags.intro=1; __z.clearMsgs();
      Object.assign(__z.P,{x:probe.FIRE.x+40,y:probe.FIRE.y+50}); __z.update(.01)}""")
    initial_light = page.locator("#det").get_attribute("aria-pressed")
    page.locator("#det").tap()
    page.wait_for_function("v=>document.querySelector('#det').getAttribute('aria-pressed')!==v",arg=initial_light)
    cdp = page.context.new_cdp_session(page)
    def touch(kind, points):
        cdp.send("Input.dispatchTouchEvent", {"type":kind, "touchPoints":points})
    def point(i,x,y):
        return {"id":i,"x":x,"y":y}
    r = page.locator("#b-run").bounding_box()
    run = point(2,r["x"]+r["width"]/2,r["y"]+r["height"]/2)
    move = point(1,200,270)
    touch("touchStart",[point(1,120,270)])
    touch("touchMove",[move])
    page.wait_for_function("__z.IN.moveX > .98 && __z.P.sprinting === false")
    touch("touchStart",[move,run])
    page.wait_for_function("__z.P.sprinting && __z.P.st<100")
    # Release only the run finger (CDP sends changed touch IDs on touchEnd).
    touch("touchEnd",[run])
    page.wait_for_function("__z.IN.moveX > .98 && !__z.P.sprinting")
    touch("touchStart",[move,run])
    page.wait_for_function("__z.P.sprinting")
    touch("touchCancel",[])
    page.wait_for_function("__z.IN.runPointer === null && !__z.P.sprinting")
    page.mouse.move(450,190)
    page.keyboard.down("d")
    page.keyboard.down("Shift")
    page.wait_for_function("__z.P.sprinting")
    page.keyboard.up("Shift")
    page.wait_for_function("!__z.P.sprinting")
    page.keyboard.up("d")

    page.evaluate("""()=> {
      const {P,S,ctx}=probe;
      function check(test,name){if(!test)throw Error(name)}
      function shade() {
        let tinted=false;
        const fill=ctx.fillRect;
        ctx.fillRect=function(...args){if(ctx.globalCompositeOperation==='multiply'&&ctx.fillStyle==='#ff735f') tinted=true;return fill.apply(ctx,args)};
        __z.WX.red=1;
        try{probe.drawWeatherScreen()}finally{ctx.fillRect=fill}
        return tinted;
      }
      function status(){probe.hud(0);return document.querySelector('#status').textContent}
      Object.assign(P,{x:probe.FIRE.x+40,y:probe.FIRE.y+55});
      const outside={x:P.x,y:P.y}, bunker={x:probe.HATCH.x,y:probe.HATCH.y+27};
      S.blow={stage:0,next:S.min,t:0};probe.blowout(.01);
      check(S.blow.stage===1,'warning');
      const goal=probe.blowShelterTarget();
      check(goal&&__z.findPath(P.x,P.y,goal.x,goal.y)&&status().includes('Укрытие'),'reachable shelter');
      const map=document.createElement('canvas'), labels={};
      map.width=__z.map.MW*6; map.height=1400;
      __z.map.drawMapTo(map.getContext('2d'),6,true,{out:labels});
      check(labels.labels.some(l=>l.t==='Укрытие'&&l.placed),'PDA marker label');
      S.blow.t=0;probe.blowout(.01);const hp=P.hp;
      probe.blowout(.1);check(S.blow.stage===2 && P.hp<hp && shade(),'outdoors');
      Object.assign(P,goal);
      const safeHP=P.hp;probe.blowout(.1);
      check(P.hp===safeHP && !shade() && !probe.blowShelterTarget() && status().includes('В укрытии'),'entered house');
      Object.assign(P,outside);check(probe.blowShelterTarget()&&shade(),'left shelter');
      const ruin=__z.gfxSnap().HOUSES.find(h=>h.ruin);
      Object.assign(P,{x:(ruin.x+ruin.w/2)*32,y:(ruin.y+ruin.h/2)*32});
      check(!probe.sheltered(P.x,P.y)&&shade(),'ruin');
      Object.assign(P,bunker);const hatch=probe.blowShelterTarget();
      check(hatch && Math.hypot(hatch.x-bunker.x,hatch.y-bunker.y)<45,'hatch target');
      __z.goThrough(true);for(let i=0;i<25;i++)__z.update(.05);
      check(!probe.blowShelterTarget()&&!shade()&&status().includes('В укрытии'),'bunker');
      Object.assign(P,outside);S.blow.t=0;probe.blowout(.01);
      check(!S.blow.stage && !shade() && !probe.blowShelterTarget() && !status().includes('крыти'),'end');
    }""")
    page.evaluate("async()=>{if(document.fullscreenElement)await document.exitFullscreen()}")
    # Compare only the first world transform, keeping camera position/time identical.
    def tremor():
        return page.evaluate("""()=> {
          const z=__z, {ctx,FIRE}=probe;
          Object.assign(z.P,{x:FIRE.x+40,y:FIRE.y+50});
          z.IN.touch=true;z.cam.x=z.P.x;z.cam.y=z.P.y;
          const base=ctx.setTransform, random=Math.random;
          function sample(stage){
            z.S.blow.stage=stage;z.S.blow.t=15.25;
            let offset;
            ctx.setTransform=function(...m){
              if(!offset && m.length===6 && m[4]!==0)offset=[m[4],m[5]];
              return base.apply(ctx,m)
            };
            probe.render();return offset;
          }
          try{Math.random=()=>.5;const a=sample(1),b=sample(2);
              return Math.hypot(a[0]-b[0],a[1]-b[1]);}
          finally{ctx.setTransform=base;Math.random=random;z.S.blow.stage=0}
        }""")
    assert 0.1 < tremor() < 2.1
    page.emulate_media(reduced_motion="reduce")
    assert tremor() == 0
    for width,height in [(844,390),(667,375),(390,844)]:
        page.set_viewport_size({"width":width,"height":height})
        page.evaluate("document.body.classList.add('is-touch','portrait-ok')")
        page.wait_for_timeout(80)
        page.evaluate("""()=>{for(const id of ['b-run','det']){
          const el=document.getElementById(id),r=el.getBoundingClientRect();
          if(r.width<44||r.height<44||!el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)))throw Error('hit area '+id);
          for(const other of document.querySelectorAll('#b-fire,.rb:not([hidden]),#wpnbox,.zh-top button,#det')){
            if(other===el)continue;const b=other.getBoundingClientRect();
            if(r.left<b.right&&b.left<r.right&&r.top<b.bottom&&b.top<r.bottom)throw Error('overlap '+id+' / '+other.id);
          }
        }}""")
    assert not errors, errors
    print("PASS — hold/release/cancel, Shift, flashlight, alerts, maps, damage and shelter, touch layout")
    browser.close()
