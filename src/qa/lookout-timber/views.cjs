const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
 const p=await browser.newPage({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.error(e.stack)});
 const path=require('node:path'),url='file://'+path.resolve(process.argv[3]||'index.html')+'#seed=311';
 await p.goto(url);const start=p.getByRole('button',{name:'Новая игра',exact:true});await start.waitFor();
 await start.tap();
 const points=[['east',82.7,123.25],['west',75.3,122.9],['front',79,125.45]];
 for(const [name,x,y] of points){
   await p.evaluate(([x,y])=>{
     const z=__z;z.clearMsgs();Object.assign(z.P,{x:x*32,y:y*32,ang:1.25});
     Object.assign(z.cam,{x:z.P.x,y:z.P.y});z.S.min=660;z.S.flags.warmth=100;z.S.flags.snowSeed=311;
     z.update(1/60);
   },[x,y]);
   await p.waitForTimeout(450);
   await p.screenshot({path:path.join(__dirname,name+'-'+process.argv[2]+'.jpg'),quality:92});
 }
 {
   await p.evaluate(()=>{
     const z=__z;Object.assign(z.P,{x:79*32,y:126*32});
     for(let i=0;i<165 && z.P.y>121*32;i++)z.map.moveE(z.P,0,-1);
     if(!z.S.flags.onLookout)throw Error('Deck not reached');
     Object.assign(z.cam,{x:z.P.x,y:z.P.y});
   });
   await p.waitForTimeout(450);
   await p.screenshot({path:path.join(__dirname,'deck-'+process.argv[2]+'.jpg'),quality:92});
 }
 if(errs.length)throw Error(errs.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
