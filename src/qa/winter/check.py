"""Run against the actual standalone build. CHROMIUM_PATH selects a system browser."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'),
                                 args=['--disable-gpu', '--single-process','--no-sandbox'])
    page = browser.new_page(viewport={'width':1080,'height':720})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((ROOT / 'index.html').as_uri())
    page.wait_for_function('typeof ground !== "undefined" && ground')
    assert page.evaluate('state.room===flatIndex && state.floor===1')
    page.keyboard.down('KeyD')
    page.wait_for_timeout(250)
    page.keyboard.up('KeyD')
    assert page.evaluate('player.x>state.x+.03')
    page.evaluate('restoreState(newWinterState())')
    page.screenshot(path=str(Path(__file__).parent/'berezki.jpg'))
    page.locator('#map').click()
    page.wait_for_timeout(200)
    page.screenshot(path=str(Path(__file__).parent/'map.jpg'))
    page.mouse.move(480,320)
    page.mouse.wheel(0,-400)
    page.wait_for_timeout(120)
    assert page.evaluate('atlas.scale>1')
    page.locator('#map').click()
    # Check walkability of all apartments on both sides of the central passage.
    print(page.evaluate('''() => {
      const check=(c,msg)=>{if(!c)throw Error(msg)};
      const at=(p)=>{[player.x,player.y]=p;};
      const walk=(to)=>{
        const [sx,sy]=[player.x,player.y],n=Math.ceil(Math.hypot(to[0]-sx,to[1]-sy)/.025);
        for(let k=1;k<=n;k++){moveAxis(player.x+(to[0]-sx)/n,player.y);moveAxis(player.x,player.y+(to[1]-sy)/n);}
        check(nearPoint(to,.003),'blocked near '+to+' at '+[player.x,player.y]);
      };
      for(const [i,b] of winterMap.buildings.entries()){
        if(!accessibleBuilding(b))continue;
        state.room=-1;state.floor=1;at(door(b,true));walk(door(b,false));check(state.room===i,'enter '+i);
        walk(door(b,true));check(state.room===-1,'exit '+i);
      }
      for(const [i,b] of winterMap.buildings.entries()){
        if(b[0]!=='flat')continue;
        state.room=-1;at(door(b,true));walk(door(b,false));check(state.room===i,'enter');
        for(let level=1;level<=5;level++){
          state.floor=level;
          const w=b[3],h=b[4],step=.10;
          const nx=Math.ceil(w/step),ny=Math.ceil(h/step),seen=new Uint8Array(nx*ny);
          const coords=(k)=>worldPoint(b,(k%nx+.5)*step-w/2,(Math.floor(k/nx)+.5)*step-h/2);
          const ix=(x,y)=>Math.floor((x+w/2)/step)+nx*Math.floor((y+h/2)/step);
          const start=ix(0,h/2-.31),q=[start];seen[start]=1;
          for(let n=0;n<q.length;n++){
            const k=q[n];for(const v of [k-1,k+1,k-nx,k+nx]){
              if(v<0||v>=seen.length||seen[v]||!insideFree(i,...coords(v)))continue;
              seen[v]=1;q.push(v);
            }
          }
          for(const s of [-1,1])for(let a=0;a<4;a++)check(seen[ix(-w/2+(a+.5)*w/4,s*h*.34)],'apartment');
          const reachable=(pos,r)=>q.some(k=>{const [x,y]=coords(k);return Math.hypot(x-pos[0],y-pos[1])<r;});
          const furniture=roomFurniture(b);
          check(reachable(furniture.box,.64)&&reachable(furniture.bed,.73),'bed or cupboard');
          for(const p of roomLayout(i,level)){
            if(p.type!=='rug')check(!insideFree(i,...worldPoint(b,p.x,p.y)),'solid furniture');
          }
        }
        state.floor=1;
        walk(worldPoint(b,0,0));walk(worldPoint(b,-.43,0));
        const landings=[];
        for(let n=1;n<5;n++){
          const x=n%2?-.43:.43,y=n%2?-1.87:-.40;
          walk(worldPoint(b,x,localPoint(b,player.x,player.y)[1]));landings.push([player.x,player.y]);
          walk(worldPoint(b,x,y));check(state.floor===n+1,'climb '+n);
        }
        saveSlot(2);restoreState(readSlot(2));check(state.floor===5,'save on top floor');
        for(let n=3;n>=0;n--){
          const dest=landings[n];walk([dest[0],player.y]);walk(dest);check(state.floor===n+1,'descent');
        }
        walk(worldPoint(b,0,0));walk(door(b,true));check(state.room===-1,'leave');
      }
      // Try every quarter-unit across the width, in both directions, including both map edges.
      for(let x=.21;x<W-.20;x+=.25)for(const y of [railNorth,railSouth]){
        check(!outsideFree(x,y),'fence gap at '+x);check(!sameRailSide(y-.22,y+.22),'tunnelled');
      }
      check(subway.y-subway.length/2-railSouth>.5,'tunnel touches fence');
      state.room=-1;at([subway.x+subway.width/2+.12,subway.y+subway.length/2]);check(!actionAt(),'enter through stair wall');
      for(const offset of [-.47,0,.47]){
        state.room=-1;const x=subway.x+offset,nx=northStairs.x+offset;
        at([x,subway.y+.91]);walk([x,tunnelBend]);check(state.floor===0,'south flight');
        walk([nx,tunnelBend]);walk([nx,northStairs.y-.92]);check(state.room===stationIndex&&state.floor===1,'north flight');
        walk([nx,tunnelBend]);walk([x,tunnelBend]);walk([x,subway.y+.91]);check(state.room===-1,'tunnel return');
      }
      for(const side of [0,2]){
        const portal=stationPortals[side];state.room=-1;at(portal.world);
        walk(portal.room);check(state.room===stationIndex,'station doorway');
        walk(portal.world);check(state.room===-1,'station exit');
      }
      let route=[[67,98],[67,87],[67,77],[68,65],[69,52],[70,41],stationPortals[1].world],meters=0;
      route.slice(1).forEach((p,i)=>{const a=route[i],d=Math.hypot(p[0]-a[0],p[1]-a[1]);meters+=d;
        for(let l=0;l<=1;l+=.025)check(outsideFree(a[0]+l*(p[0]-a[0]),a[1]+l*(p[1]-a[1])),'blocked road');});
      const seconds=meters/walkSpeed;check(seconds>=90&&seconds<=120,'route length');
      state.room=-1;at([62,15]);check(outsideFree(player.x,player.y)&&!isMarsh(),'lake');climate(5);check(state.wet===0,'ice soaked');
      at([23,52]);climate(15);check(state.wet>50&&state.sinking>15,'marsh');
      state.warmth=25;at(campfires[0]);climate(30);check(state.wet===0&&state.warmth>65,'fire');
      state.room=flatIndex;state.wet=25;climate(30);check(state.wet===0&&state.warmth>90,'heated flat');
      return {roadSeconds:seconds,apartmentsChecked:80,fenceRows:2,stationPortals:3};
    }'''))
    page.evaluate('restoreState(newWinterState());state.room=-1;[player.x,player.y]=stationPortals[1].world;camera.x=player.x;camera.y=player.y')
    page.wait_for_timeout(250)
    page.screenshot(path=str(Path(__file__).parent/'station.jpg'))
    print(page.evaluate("""() => {
      const ok=(v,m)=>{if(!v)throw Error(m)};
      restoreState(newWinterState('hard'));state.room=-1;[player.x,player.y]=[95,52];player.a=0;
      give('w_pm');give('a9',14);selectHand('w_pm');reload();actorsStep(2);
      ok(state.rounds.w_pm===8&&state.inventory.a9===6,'reload');
      strike();ok(state.rounds.w_pm===7,'fired');strike();ok(state.rounds.w_pm===7,'rate');
      selectHand('hands');actorsStep(1);strike();ok(state.rounds.w_pm===7,'empty hands');
      loot('test-shelf');modal.querySelector('section button').click();ok(state.searched['test-shelf'],'loot');
      loot('test-shelf');ok(!modal.querySelector('section button'),'cannot farm cupboard');modal.close();
      state.room=flatIndex;[player.x,player.y]=worldPoint(winterMap.buildings[flatIndex],-2.12,0);
      const stack=state.inventory.a9;ok(actionAt().name==='Личный ящик','storage');actionAt().do();
      [...modal.querySelectorAll('section button')].find(e=>e.textContent.includes('Патроны')).click();
      ok(state.storage.a9===stack&&!state.inventory.a9,'ammo stack');modal.close();
      state.room=-1;[player.x,player.y]=[23,52];state.stamina=90;jumpNow();ok(jump===0,'bog jumping');
      state.room=-1;[player.x,player.y]=[95.16,52.9];
      ok(lowObstacle(95.7,52.9)&&actionAt().name==='Вскрыть ящик','solid crate');
      actionAt().do();modal.querySelector('section button').click();modal.close();
      saveSlot(2);restoreState(readSlot(2));
      ok(state.broken['yard-0']&&state.searched['yard-0']&&!lowObstacle(95.7,52.9),'broken crate after load');
      for(const [,x,y] of siteDetails)ok(touchesSolid(x,y),'yard solid '+[x,y]);
      tracksInSnow.length=0;lastMark=null;player.y=73;
      for(let n=0;n<100;n++){player.x=6+n*.22;fieldExposure(.01);}
      const mark=tracksInSnow[1].slice();player.x+=.22;fieldExposure(.01);
      ok(tracksInSnow.length===100&&mark.every((v,k)=>v===tracksInSnow[0][k]),'unchanged planted footprint');
      restoreState(newWinterState());return 'Inventory, reload, fire rate, unarmed mode, cupboards and storage passed';
    }"""))
    # Two-finger layout and the normal interaction button on a small phone viewport.
    browser.close()
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'),
                                 args=['--disable-gpu','--single-process','--no-sandbox'])
    mobile = browser.new_page(viewport={'width':740,'height':360},has_touch=True,is_mobile=True)
    mobile.on('pageerror', lambda e: errors.append(str(e)))
    mobile.goto((ROOT / 'index.html').as_uri())
    mobile.wait_for_function('typeof ground !== "undefined" && ground')
    mobile.locator('#map').tap()
    mobile.wait_for_function('wide && mapDrawn')
    mobile.locator('#map').tap()
    mobile.evaluate('''() => {
      state.room=-1;[player.x,player.y]=stationPortals[1].world;refreshHud();
    }''')
    mobile.keyboard.down('ArrowUp')
    mobile.wait_for_function('state.room===stationIndex && state.floor===0',timeout=5000)
    mobile.keyboard.up('ArrowUp')
    assert mobile.evaluate('state.room===stationIndex')
    assert mobile.locator('#stick').is_visible()
    mobile.locator('#menu').tap()
    mobile.get_by_role('button',name='Записать 1').tap()
    assert mobile.evaluate('readSlot(1).room===stationIndex')
    mobile.locator('#close').tap() if mobile.locator('#close').is_visible() else None
    mobile.locator('#menu').tap()
    mobile.get_by_role('button',name='Управление и звук').tap()
    mobile.get_by_role('button',name='Раскладка кнопок').tap()
    mobile.locator('.layout-hit[data-id="joy"]').press('ArrowRight')
    mobile.locator('#layout-save').tap()
    assert mobile.evaluate("JSON.parse(localStorage.getItem('km100-touch-layout-v1')).landscape.joy.size>=44")
    mobile.evaluate("restoreState(newWinterState());state.room=-1;player.x=94;player.y=52")
    cdp=mobile.context.new_cdp_session(mobile)
    def finger(selector,i):
        box=mobile.locator(selector).bounding_box()
        return dict(x=box['x']+box['width']/2,y=box['y']+box['height']/2,id=i)
    stick=finger('#stick',0);lamp=finger('#lamp',1)
    def touch(kind,points):
        cdp.send('Input.dispatchTouchEvent',dict(type=kind,touchPoints=points))
    touch('touchStart',[stick]);stick['x']+=25;touch('touchMove',[stick])
    touch('touchStart',[stick,lamp])
    mobile.wait_for_function('player.x>94.08')
    touch('touchEnd',[lamp])
    mobile.wait_for_timeout(180)
    print('Two-finger controls',mobile.evaluate('({lamp:state.lamp,x:player.x,stick:stick.x})'))
    mobile.wait_for_function('state.lamp && player.x>94.05',timeout=3500)
    touch('touchEnd',[])
    mobile.close()
    assert not errors, errors
    browser.close()
