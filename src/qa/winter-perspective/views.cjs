const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
 const p=await browser.newPage({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.error(e.stack)});
 const path=require('node:path'),url='file://'+path.resolve(process.argv[3]||'index.html')+'#seed=311';
 await p.goto(url);const start=p.getByRole('button',{name:'Новая игра',exact:true});await start.waitFor();
 await start.tap();
 const points=[['homes',523,360.7],['yard',521.8,369.6],['shore',490.7,131.8],
   ['station',334,226.7],['pump',198.1,432.9],['gates',323,568.6],['store',157.4,184],['stairs',788.7,17.5],['homes-west',503.7,359.3],
   ['boats',484,120],['tower',82.7,123.25],['trees',448.53,383.86]];
 for(const [name,x,y] of points){
   await p.evaluate(([x,y])=>{
     const z=__z;z.clearMsgs();Object.assign(z.P,{x:x*32,y:y*32,ang:1.25});
     Object.assign(z.cam,{x:z.P.x,y:z.P.y});z.S.min=660;z.S.flags.warmth=100;z.S.flags.snowSeed=311;
     z.update(1/60);
   },[x,y]);
   await p.waitForTimeout(450);
   await p.screenshot({path:path.join(__dirname,name+'-'+process.argv[2]+'.jpg'),quality:92});
 }
 if(errs.length)throw Error(errs.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
