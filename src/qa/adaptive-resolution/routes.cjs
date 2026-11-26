// Compare both builds with this script, the same Chromium binary and one route at a time.
// node routes.cjs /path/to/build.html /path/to/results [devicePixelRatio]
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const [file,out,density='2']=process.argv.slice(2);
const scenes=[['yard',523,369],['forest',458.5,155.5],['village',490,132]];

async function run(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,
    args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--disable-software-rasterizer']});
  try {
    const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:Number(density)});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(file)).href+'#seed=7');
    await page.getByRole('button',{name:'Новая игра',exact:true}).click();
    const results=[];
    for(const [scene,x,y] of scenes){
      await page.evaluate(([x,y])=>{
        __z.S.min=660;Object.assign(__z.P,{x:x*32,y:y*32});Object.assign(__z.cam,{x:x*32,y:y*32});
      },[x,y]);
      await page.waitForTimeout(950);
      const result=await page.evaluate(([x,y])=>new Promise(resolve=>{
        const times=[],widths=new Set();let start,last;
        function sample(t){
          if(start===undefined)start=t;else times.push(t-last);
          last=t;widths.add(cv.width);
          const elapsed=t-start;
          __z.P.x=x*32+Math.min(4800,elapsed)*.085;__z.P.y=y*32;
          if(elapsed<4800){requestAnimationFrame(sample);return;}
          times.sort((a,b)=>a-b);
          resolve({fps:Math.round(times.length*1000/elapsed),p95:Math.round(times[Math.ceil(.95*times.length)-1]),
            widths:[...widths],canvas:[cv.width,cv.height]});
        }
        requestAnimationFrame(sample);
      }),[x,y]);
      console.log(scene,JSON.stringify(result));results.push({scene,...result});
      // Return to the same viewpoint for the accompanying image; outside the timed interval.
      await page.evaluate(([x,y])=>{
        __z.S.min=660;__z.clearMsgs();Object.assign(__z.P,{x:x*32,y:y*32});Object.assign(__z.cam,{x:x*32,y:y*32});
      },[x,y]);
      await page.waitForTimeout(300);
      await page.screenshot({path:path.join(out,scene+'.jpg'),quality:95});
    }
    if(errors.length)throw Error(errors.join('\n'));
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
