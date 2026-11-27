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
  const cross=hamletCross;
  Object.assign(P,{x:201.5*T,y:440*T});S.min=640;
  [[206.8,442.64],[172.48,480.48],[142.56,517.44],cross].forEach(p=>walk(...p));
  const approaches=[
    [[108,544],[103,542],[103,539],[103,536]],
    [[108,544],[114.6,541],[115,537],[115,534.4]],
    [[108,544],[103,542],[98.4,543.4],[95,544.4],[95,546],[95,548.6]],
    [[111,552.2],[103,553],[103,555],[103,557.8]],
    [[111,552.2],[116.7,554.4],[118,558],[118,560.7]],
    [[124.3,548],[130,546.7],[130,550],[130,553.2]]
  ];
  for(const [i,route] of approaches.entries()){
    route.forEach(p=>walk(...p));
    const r=hamletRooms[i];assert(winterFloor(P.x,P.y)===r,'Door '+r.name);
    assert(winterSurface(P.x,P.y)==='winterBoard','Footstep surface '+r.name);
    if(i===1){
      walk(116.25,534.9);z.update(.02);
      assert(z.near?.k==='hamletKindle','Stove prompt: '+z.near?.k);z.interact();
      S.flags.warmth=65;
      for(let tick=0;tick<120;tick++)z.update(1/60);
      assert(S.flags.warmth>65,'Stove heat');
      z.save(true,1);z.applyState(z.loadSave(1));z.update(.02);
      assert(stoveBurning(r.heater) && !stoveBurning(hamletRooms[0].heater),'Separate stove timers');
      assert(winterFloor(P.x,P.y)===r && z.near?.k==='winterRest','Load inside house');
      walk(115,534.4);
    }
    if(i===5){
      walk(128.45,552.6);z.update(.02);
      const box=objs.find(o=>o.stash==='room_winter-hut');
      P.ang=Math.atan2(box.y+box.h/2-P.y,box.x+box.w/2-P.x);melee(P,WP.knife);
      assert(box.broken && box.loot.bandage && box.loot.candle,'Workshop supplies');
      walk(130,553.2);walk(131.55,552.45);z.update(.02);
      assert(z.near?.o?.fitting==='cabinet','Workshop cabinet '+z.near?.k);
      walk(130,553.2);
    }
    route.slice().reverse().forEach(p=>walk(...p));walk(...cross);
  }
  [[205.04,535.04],[279.84,516.56],[322.96,493.68]].forEach(p=>walk(...p));
  assert(P.alive,'Failed to reach base road');
  return {buildings:approaches.length,stove:true,reload:true,crate:true,cabinet:true,throughRoute:true};
}
