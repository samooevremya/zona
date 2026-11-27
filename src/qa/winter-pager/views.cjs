const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const here=__dirname, current=path.resolve(process.argv[2]||'index.html'), before=process.argv[3];
const css=fs.readFileSync(path.join(here,'concepts.css'),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
  const p=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});const errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const open=async file=>{
   await p.goto('file://'+path.resolve(file)+'#seed=311');
   await p.getByRole('button',{name:'Новая игра',exact:true}).click();
   await p.evaluate(()=>{const z=__z;Object.assign(z.P,{x:318*32,y:224*32});Object.assign(z.cam,{x:z.P.x,y:z.P.y});z.update(1/60)});
   await p.locator('#t-pda').click();
  };
  const frame=async(name,mode='')=>{
   await p.evaluate(mode=>{
    document.querySelector('#ov').classList.remove('concept','field','fold','console');
    if(mode)document.querySelector('#ov').classList.add('concept',mode);
    Object.assign(__z.panel.mapView,{x:258,y:140,zoom:2.45});__z.refresh();
   },mode);
   await p.waitForFunction(()=>document.querySelector('#bigmap')?.width>300);
   await p.waitForTimeout(170);
   await p.screenshot({path:path.join(here,name+'.jpg'),quality:93});
  };
  if(before){await open(before);await frame('before')}
  await open(current);assert.equal(await p.locator('#ptitle').textContent(),'Пейджер');
  assert.equal(await p.locator('#t-pda').textContent(),'Пейджер');
  await frame('after');
  await p.addStyleTag({content:css});
  for(const [name,width,height] of [['phone',844,390],['desktop',1280,800]]){
   await p.evaluate(()=>document.exitFullscreen?.()?.catch(()=>{}));
   await p.setViewportSize({width,height});
   for(const mode of ['field','fold','console']){
    await frame(name+'-'+mode,mode);
    const rects=await p.locator('#ov button:visible').evaluateAll(bs=>bs.map(b=>[b.offsetWidth,b.offsetHeight]));
    assert(rects.every(([w,h])=>w>=44 && h>=44),JSON.stringify(rects));
   }
  }
  await p.locator('#ov').evaluate(o=>o.classList.remove('concept','console'));
  await p.evaluate(()=>{
   window.keyStarts=0;const orig=OscillatorNode.prototype.start,keys=new WeakSet();
   const set=AudioParam.prototype.setValueAtTime;
   AudioParam.prototype.setValueAtTime=function(v,t){if(v===370)keys.add(this);return set.call(this,v,t)};
   OscillatorNode.prototype.start=function(...a){if(this.type==='triangle'&&keys.has(this.frequency))window.keyStarts++;return orig.apply(this,a)};
  });
  await p.getByRole('button',{name:'+',exact:true}).tap();
  await p.getByRole('tab',{name:'Журнал'}).focus();await p.keyboard.press('Enter');
  await p.getByRole('tab',{name:'Карта'}).click();
  const map=await p.locator('.kpk-wrap').boundingBox();await p.mouse.move(map.x+50,map.y+50);
  await p.mouse.down();await p.mouse.move(map.x+80,map.y+55);await p.mouse.up();
  await p.getByRole('button',{name:'Закрыть',exact:true}).click();
  assert.equal(await p.evaluate(()=>window.keyStarts),4);
  assert.deepEqual(errors,[]);console.log('Phone, desktop, touch targets, map gestures, mouse/touch/keyboard pager sounds passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
