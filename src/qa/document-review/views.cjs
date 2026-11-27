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
 const positions=[['yard',522.8,369.25],['toe',335,226.60],['fire',520,362.6],['station',325,235.5],['door',336.5,597.1],['flats',518,387],['woods',458.5,155.5],['room',780,17.4],['gun',502.4,134]];
 for(const [id,x,y] of positions){
 await p.evaluate(([x,y,id])=>{Object.assign(__z.P,{x:x*32,y:y*32});Object.assign(__z.cam,{x:x*32,y:y*32});if(id==='gun'){__z.S.weapon='w_obrez';__z.S.mag.w_obrez=2;__z.P.ang=0;const guard=__z.ents.find(e=>e.sid==='shorePost');Object.assign(guard,{x:x*32+40,y:y*32+13,wpn:'w_obrez',ang:Math.PI*.72});}
 __z.clearMsgs();__z.S.min=11*60;__z.S.flags.warmth=100;for(let i=0;i<20;i++)__z.update(1/30)},[x,y,id]);await p.waitForTimeout(500);
 await p.screenshot({path:'src/qa/document-review/'+id+'-'+process.argv[2]+'.jpg',quality:90});
 }
 const checkFire=await p.evaluate(()=>{
   const z=__z,f=z.map.objs.find(o=>o.k==='netShelter');
   if(!f)throw Error('Hamlet not ready');
   const x=497.6*32,y=135.25*32,results=[];
   Object.assign(z.P,{x,y:y+24,hp:88});z.S.flags.warmth=60;
   z.IN.moveX=z.IN.moveY=0;
   for(let i=0;i<60;i++)z.update(1/60);
   results.push({phase:'beside',hp:z.P.hp,distance:z.P.y-y});
   z.IN.moveY=-1;
   for(let i=0;i<120 && z.P.y>y+1;i++)z.update(1/60);
   z.IN.moveY=0;
   for(let i=0;i<60;i++)z.update(1/60);
   results.push({phase:'in',hp:z.P.hp,distance:z.P.y-y});
   z.IN.moveY=1;for(let i=0;i<60 && z.P.y<y+26;i++)z.update(1/60);
   z.IN.moveY=0;const exit=z.P.hp;for(let i=0;i<60;i++)z.update(1/60);
   results.push({phase:'outside',hp:z.P.hp,distance:z.P.y-y,exitHp:exit});return results;
 });
 console.log('Fishing village fire',JSON.stringify(checkFire));
 if(process.argv[2]==='after' && (checkFire[0].hp!==88 || Math.abs(checkFire[1].distance)>3 || checkFire[1].hp>=88 || checkFire[2].hp!==checkFire[2].exitHp))throw Error('Fire walk failed');
 if(errs.length)throw Error(errs.join('\n'));console.log('Three menu sizes and nine game views checked');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
