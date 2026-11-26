const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
 const p=await browser.newPage({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.error(e.stack)});
 const path=require('node:path'),url='file://'+path.resolve(process.argv[3]||'index.html')+'#seed=311';
 await p.goto(url);const start=p.getByRole('button',{name:'Новая игра',exact:true});await start.waitFor();
 for(const [width,height] of [[393,852],[932,430],[1280,720]]){
   await p.setViewportSize({width,height});
   const visible=await p.locator('#title .start-name').evaluate(el=>{
     const range=document.createRange();range.selectNodeContents(el.firstChild);
     const r=range.getBoundingClientRect();
     return r.width>0 && r.left>=0 && r.top>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;
   });if(!visible)throw Error('Title clipped on '+width+'x'+height);
 }
 await p.setViewportSize({width:932,height:430});await start.tap();
 const points=[['forest',448.53477,383.85890],['road',325.4,267],['rail',329,224],['home',779,15],['ice',387,111],['marsh',135,343],['hall',325,230.8]];
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
