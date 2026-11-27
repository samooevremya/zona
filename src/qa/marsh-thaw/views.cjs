const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),path=require('node:path');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
 try{
 const p=await b.newPage({viewport:{width:932,height:430}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve(process.argv[3]||'index.html')+'#seed=311');
 await p.getByRole('button',{name:'Новая игра',exact:true}).click();
 const sites=[['reeds',184.6505,416.8203,12],['bank',187.1,425.7,12],['channel',191,434.5,12],['fen',135.4,343.2,12]];
 for(const [key,x,y,h] of sites){
 if(process.env.VIEW && process.env.VIEW!==key)continue;
 await p.evaluate(([x,y,h])=>{const z=__z;Object.assign(z.P,{x:x*32,y:y*32,ang:-Math.PI/2});Object.assign(z.cam,{x:z.P.x,y:z.P.y});z.IN.touch=true;z.S.min=h*60;z.S.torch=false;z.clearMsgs();z.update(1/60)},[x,y,h]);
 if(key==='reeds'){await p.evaluate(()=>{__z.P.ang=Math.PI/2});await p.waitForTimeout(240)}
 else await p.evaluate(()=>{const z=__z;z.IN.moveX=.8;z.IN.moveY=.6;for(let i=0;i<18;i++)z.update(1/60);z.IN.moveX=z.IN.moveY=0;});await p.waitForTimeout(65);
 await p.screenshot({path:path.join(__dirname,key+'-'+process.argv[2]+'.jpg'),quality:93});}
 if(errors.length)throw Error(errors.join('; '));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
