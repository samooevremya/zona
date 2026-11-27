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
  const z=window.__z,assert=(ok,why)=>{if(!ok)throw Error(why);};
  const events=[],original=play;
  const measure=(tx,ty)=>{
    Object.assign(P,tilePoint(tx,ty));P.ang=Math.PI/2;
    z.IN.moveX=z.IN.moveY=0;z.update(.02);
    const start=P.y;z.IN.moveY=1;
    for(let i=0;i<60;i++)z.update(1/60);
    z.IN.moveY=0;return Math.round(P.y-start);
  };
  try{
    play=(name,...args)=>{events.push(name);return original(name,...args);};
    const bank=measure(182.8,435),wet=measure(135,343);
    assert(wet<.84*bank && wet>0,'Crossing speed '+[bank,wet]);
    assert(events.includes('stepWater') && marshRipples.length>0,'Water footfalls '+events);
    assert(!(S.flags.snowMarks||[]).some(p=>swampAt(p.x,p.y)),'Snow tracks in water');
    assert(!('coatWetness' in S.flags),'Persistent clothing wetness');
    for(let i=0;i<85;i++)z.update(1/60);
    drawMarshRipples(ctx,0,0,1,1);assert(!marshRipples.length,'Ripples at rest');
    // Pick a real stand in the drainage channel and sample its foreground
    // pixels with the same coordinates and draw function used by the game.
    const c=winterCanvas(54,54),g=c.getContext('2d');
    let stand=null;
    visitReeds(178*T,416*T,198*T,435*T,(x,y,w,h)=>{
      if(stand || h<33)return;
      const e={x:x+1,y:y-h*.85};
      g.setTransform(1,0,0,1,27-e.x,27-e.y);reedsInFront(g,e);
      const alpha=g.getImageData(20,31,14,8).data;
      const boot=alpha.filter((v,i)=>i%4===3&&v>96).length;
      const face=g.getImageData(25,22,5,5).data.filter((v,i)=>i%4===3&&v>96).length;
      g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,54,54);
      if(boot>32 && face<12)stand=[e.x/T,e.y/T];
    });
    assert(stand,'Foreground reeds missing');
    return {dryPixelsPerSecond:bank,wadingPixelsPerSecond:wet,stand};
  }finally{play=original;}
}
