const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
  const p=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  async function start(file){
   await p.goto('file://'+path.resolve(file)+'#seed=311');
   await p.getByRole('button',{name:'Новая игра',exact:true}).tap();
   await p.evaluate(()=>{const z=__z;Object.assign(z.P,{x:318*32,y:224*32});Object.assign(z.cam,{x:z.P.x,y:z.P.y});z.update(1/60)});
   await p.locator('#t-pda').tap();
  }
  async function capture(name){
   await p.evaluate(()=>{document.activeElement?.blur();Object.assign(__z.panel.mapView,{x:270,y:146,zoom:2.4});__z.refresh()});
   await p.waitForFunction(()=>document.querySelector('#bigmap')?.width>300);
   await p.waitForTimeout(180);await p.screenshot({path:path.join(__dirname,name+'.jpg'),quality:94});
  }
  if(process.argv[3]){await start(process.argv[3]);await capture('pre-fold')}
  await start(process.argv[2]||'index.html');
  const button=name=>p.getByRole('button',{name,exact:true});
  const view=()=>p.evaluate(()=>__z.panel.mapView);
  for(const [name,width,height] of [['phone',844,390],['desktop',1280,800],['portrait',390,844]]){
   await p.evaluate(()=>document.exitFullscreen?.()?.catch(()=>{}));await p.setViewportSize({width,height});
   if(await p.locator('#rot-skip').isVisible())await p.locator('#rot-skip').click();
   await capture('fold-'+name);
   assert.equal(await p.locator('#pbody .kpk-bar').count(),0);
   const boxes=await p.locator('#ov button:visible').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return [b.textContent,r.width,r.height,b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))]}));
   assert.equal(boxes.length,9,JSON.stringify(boxes));assert(boxes.every(b=>b[1]>=44&&b[2]>=44&&b[3]),JSON.stringify(boxes));
   await button('Вся карта').tap();assert.equal((await view()).zoom,1);
   await button('+').tap();assert.equal((await view()).zoom,1.6);
   await button('−').tap();assert.equal((await view()).zoom,1);
   await button('К игроку').tap();assert.equal((await view()).zoom,7);
   for(const [tab,id] of [['Журнал','log'],['Награды','rewards'],['Данные','stat'],['Карта','map']]){
    await p.getByRole('tab',{name:tab,exact:true}).tap();assert.equal(await p.evaluate(()=>__z.panel.tab),id);
   }
   await p.waitForFunction(()=>document.querySelector("#bigmap")?.width>300);
   const glass=await p.locator('.pager-glass').boundingBox();
   const x=glass.x+glass.width/2,y=glass.y+glass.height/2;
   const cdp=await p.context().newCDPSession(p);
   const points=r=>[{x:x-r,y,id:0},{x:x+r,y,id:1}];
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(18)});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(30)});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert((await view()).zoom>7,JSON.stringify([name,await view(),await p.evaluate(([x,y])=>document.elementFromPoint(x,y)?.outerHTML.slice(0,300),[x,y])]));await cdp.detach();
   await p.getByRole('tab',{name:'Данные'}).tap();await button('Вся карта').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>__z.panel.tab),'map');
  }
  await p.evaluate(()=>{
   window.pagerClicks=0;const set=AudioParam.prototype.setValueAtTime;
   AudioParam.prototype.setValueAtTime=function(value,t){
    if(value===370)window.pagerClicks++;
    return set.call(this,value,t);
   };
  });
  await button('+').tap();await button('−').focus();await p.keyboard.press('Enter');
  await p.getByRole('tab',{name:'Журнал'}).click();
  await button('Закрыть').tap();assert.equal(await p.evaluate(()=>window.pagerClicks),4);assert.equal(await p.evaluate(()=>__z.panel),null);
  await p.keyboard.press('KeyI');assert.equal(await p.locator('.pager-hardware:visible').count(),0);
  assert.deepEqual(errors,[]);console.log('Map, zoom, centering, tabs and close passed at three sizes; keyboard and touch tested.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
