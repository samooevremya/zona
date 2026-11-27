const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),path=require('node:path');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
 const p=await b.newPage({viewport:{width:932,height:430}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve(process.argv[3]||'index.html')+'#seed=311');
 await p.getByRole('button',{name:'Новая игра',exact:true}).click();
 const sites=[['pump',205.8,435.55,11],['tower',196.1,431.85,11],['light',198.8,434.2,23],['bank',187.1,425.7,12],['roof',212.9,437.2,12],['village',495.6,129.6,12],['woods',274,395,11]];
 for(const [key,x,y,h] of sites){
 if(process.env.VIEW && process.env.VIEW!==key)continue;
 await p.evaluate(([x,y,h])=>{const z=__z;Object.assign(z.P,{x:x*32,y:y*32,ang:-Math.PI/2});Object.assign(z.cam,{x:z.P.x,y:z.P.y});z.IN.touch=true;z.S.min=h*60;z.S.torch=true;z.clearMsgs();z.update(1/60)},[x,y,h]);
 await p.waitForTimeout(420);
 if(key==='woods'){await p.locator('#t-pda').click();await p.evaluate(()=>{Object.assign(__z.panel.mapView,{x:274,y:395,zoom:6});__z.refresh()});await p.waitForTimeout(220)}
 await p.screenshot({path:path.join(__dirname,key+'-'+process.argv[2]+'.jpg'),quality:93});}
 if(errors.length)throw Error(errors.join('; '));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
