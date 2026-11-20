"""Check the shipped G8 frames in Chromium. Set CHROMIUM to use a local browser."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

game = Path(__file__).resolve().parents[3] / 'index.html'
hook = 'window.__zRender = render;'
build = game.read_text()
assert build.count(hook) == 1
build = build.replace(hook, hook + """
window.framesQA={equippedFrame,g3Draw,g7PoseFrame,g3Skin,jacketFor,weaponLocal,packImage,HELD_SPRITES,G3,GAIT,g7Muzzle};
""")
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM'), args=['--single-process','--disable-gpu'])
    page = browser.new_page()
    errors = []
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.route('**/index.html',lambda r:r.fulfill(body=build,content_type='text/html'))
    page.route('https://fonts.**/*',lambda r:r.abort())
    page.goto('http://game.test/index.html#qa-seed=7')
    page.get_by_role('button',name='Новая игра').click()
    page.evaluate("()=>{__z.closePanel();__z.openPanel('menu','Меню')}")
    page.wait_for_function("Object.values(framesQA.HELD_SPRITES).every(s=>framesQA.packImage(s.file))")
    print(page.evaluate("""()=> {
      const q=framesQA,z=__z, c=document.createElement('canvas');c.width=c.height=144;
      const g=c.getContext('2d'), actors=[z.P,...['loner','bandit','army'].map(f=>z.ents.find(e=>e!==z.P&&e.fac===f))];
      let count=0;
      for (const actor of actors) {
        const e=actor===z.P?actor:{...actor};Object.assign(e,{sit:0,captive:false,wounded:false,campRise:null,alive:true,flash:0});
        for(const id of Object.keys(q.HELD_SPRITES)) for(let phase=0;phase<6;phase++) {
          z.S.weapon=id;e.wpn=id;e.crouch=phase===5;e.ang=.83;
          q.GAIT.set(e,{moveT:phase>0&&phase<5 ? 1 : 0,dist:Math.max(0,phase-1)*11+3});
          const w=q.weaponLocal(e), skin=q.g3Skin(e), f=q.g7PoseFrame(skin,w.pose);
          const images=q.jacketFor(e)?.images||q.G3.images, model=q.equippedFrame(images,f,w);
          if(model!==q.equippedFrame(images,f,w)||!model.sprite) throw Error('uncached '+id);
          const cx=model.image.width/2,scale=model.image.width/48, cy=28*scale;
          // Sample the actual equipment pixels beyond the gloves on the composed frame.
          if(id!=='grenade'){
            const ink=model.image.getContext('2d').getImageData(cx+w.muzzle[0]*scale-3,cy+(w.muzzle[1]-1.6)*scale,7,3).data;
            if(!ink.some((v,i)=>i%4===3&&v>40))throw Error('missing tip '+skin+'/'+id+'/'+w.pose);
          }
          let tip;
          window.__g7tap=(a,base,m,w)=>{tip=base.inverse().transformPoint(m.transformPoint(new DOMPoint(...w.muzzle)))};
          g.save();g.translate(72-e.x,72-e.y);
          q.g3Draw(e,{shadow:false},g);g.restore();
          const world=q.g7Muzzle(e,e.ang);
          if(world&&(!tip||Math.hypot(tip.x-world.x,tip.y-world.y)>.02))throw Error('muzzle '+id);
          count++;
        }
      }
      window.__g7tap=null;
      const e={...actors[1],sid:'camp-test',wpn:'w_aksu',alive:true,wounded:false,captive:false,crouch:0};
      for(const sitting of [0,1]) for(const rise of [0,.5,.8,.98,1]) {
        e.sit=sitting;e.campRise=rise;q.g3Draw(e,{shadow:false},g);
        if(sitting && !rise && q.weaponLocal(e))throw Error('weapon at rest');
      }
      return count+' equipped frames verified';
    }"""))
    assert not errors,errors
    browser.close()
