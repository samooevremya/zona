const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--disable-gpu','--disable-software-rasterizer']});
 try{
  const page=await browser.newPage({viewport:{width:932,height:430}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(process.argv[3]||'index.html')+'#seed=110');
  await page.getByRole('button',{name:'Новая игра',exact:true}).click();
  for(const [key,x,y,hour] of [
    ['bones',490.9,129.85,12],['fire',497.2,137.1,23],['flats',517.4,361,12],
    ['pit',334.15,590.5,12],['rail',318.4,224,12],['stairs',524.55,351.95,12],
    ['threshold',518,357.9,12],['cabins',495.65,132.9,12],['gate',324.8,570.3,12],['roofs',321.15,590.2,12],['flue',214.5,437.2,12]]){
    await page.evaluate(([key,x,y,hour])=>{
      const z=__z;Object.assign(z.P,{x:x*32,y:y*32,ang:-1.57});Object.assign(z.cam,{x:z.P.x,y:z.P.y});
      z.S.min=hour*60;z.S.torch=false;z.IN.touch=true;z.clearMsgs();
      if(key==='bones')z.map.objs.push({k:'bones',kind:'human',x:z.P.x-58,y:z.P.y-40,ang:.5,seed:521,t:z.S.min-1450});
      z.update(.01);
    },[key,x,y,hour]);await page.waitForTimeout(480);
    await page.screenshot({path:path.join(__dirname,key+'-'+process.argv[2]+'.jpg'),quality:91});
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
