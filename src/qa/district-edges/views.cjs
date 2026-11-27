const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
 const p=await browser.newPage({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.error(e.stack)});
 const path=require('node:path'),url='file://'+path.resolve(process.argv[3]||'index.html')+'#seed=311';
 await p.goto(url);const start=p.getByRole('button',{name:'Новая игра',exact:true});await start.waitFor();
 await start.tap();
 const points=[['west',2.35,224.65],['north',365,1.8],['south',308,648.8],['east',667.3,318],['pump',327.25,416.5],['hamlet',122,539],['fork',341.6,209.6]];
 const closeups=[['pipe-reverse',329.7,412.75],['fence-reverse',126.2,538.4],['pump-house',200.2,433.6]];
 const mode=process.argv[2];
 const shots=mode==='first'?points.slice(4):[...points,...closeups];
 for(const [name,x,y] of shots){
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
