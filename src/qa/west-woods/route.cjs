const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const file=path.resolve(__dirname,'../../../index.html');
    const html=fs.readFileSync(file,'utf8').replace('bootBerezki();','window.testDistrict=('+checks.toString()+');bootBerezki();');
    await page.route('http://district.local/',route=>route.fulfill({contentType:'text/html',body:html}));
    await page.goto('http://district.local/');await page.getByRole('button',{name:'Новая игра',exact:true}).click();
    await page.waitForFunction(()=>window.ZONE_AUDIO?.winterWind && window.__z.P);
    console.log(await page.evaluate(()=>testDistrict()));
    if(errors.length)throw Error(errors.join('\n'));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

function checks(){
  const z=window.__z,assert=(v,m)=>{if(!v)throw Error(m);};
  function walk(x,y){
    for(let frame=0;frame<3600;frame++){
      const dx=x*T-P.x,dy=y*T-P.y,len=Math.hypot(dx,dy);
      if(len<2){IN.moveX=IN.moveY=0;return;}
      IN.moveX=dx/len;IN.moveY=dy/len;z.update(1/60);
    }
    throw Error('Route blocked from '+[P.x/T,P.y/T]+' to '+[x,y]);
  }
  Object.assign(P,{x:335*T,y:226.9*T});
  walk(335,224.5);assert(S.flags.stationDeck,'Access from platform');
  const trail=[[335,219],[341.44,209.44],[279.84,201.52],[218.24,196.24],[158.4,189.2]];
  trail.forEach(p=>walk(...p));
  const routeIn=[[157.5,188.2],[157.5,184],[154.6,183.5]];
  routeIn.forEach(p=>walk(...p));
  const box=objs.find(o=>o.stash==='room_winter-depot');
  assert(box && winterFloor(P.x,P.y)===westStore && Math.hypot(P.x-box.x-box.w/2,P.y-box.y-box.h/2)<42,'Warehouse supply box');
  walk(157.5,184);walk(160.8,185);
  const cabinet=objs.find(o=>o.home==='west-store' && o.stash);
  assert(cabinet && Math.hypot(P.x-cabinet.x-cabinet.w/2,P.y-cabinet.y-cabinet.h/2)<50,'Cabinet inaccessible');
  walk(157.5,184);walk(157.5,188.2);walk(158.4,189.2);
  const woods=[[118.8,166.32],[83,127.7],[79,125.8]];
  woods.forEach(p=>walk(...p));walk(79,124);assert(S.flags.onLookout,'Stair entry');
  walk(79,121);walk(79.7,120.75);
  const top=[P.x,P.y];z.save(true,1);z.applyState(z.loadSave(1));
  assert(S.flags.onLookout && Math.hypot(P.x-top[0],P.y-top[1])<1,'Deck load changed position');
  for(let i=0;i<50;i++)moveE(P,2,0);
  assert(P.x<lookout.x+lookout.half,'Platform edge');
  walk(79,121);walk(79,125.8);assert(!S.flags.onLookout,'Descent');
  for(const sign of [-1,1]){
    const dummy={x:lookout.x+sign*55,y:124*T,r:P.r};
    for(let i=0;i<30;i++)moveE(dummy,-sign*2,0);
    assert(Math.abs(dummy.x-lookout.x)>lookout.width/2,'Side entry through stairs');
  }
  [...woods].reverse().forEach(p=>walk(...p));[...trail].reverse().forEach(p=>walk(...p));
  walk(335,226.9);assert(!S.flags.stationDeck && P.alive,'Return to platform');
  return {warehouse:true,cabinet:true,stairs:true,deckReload:true,rails:true,roundTrip:true};
}
