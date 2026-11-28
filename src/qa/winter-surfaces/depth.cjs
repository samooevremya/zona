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
  const assert=(ok,reason)=>{if(!ok)throw Error(reason);};
  const origin=tilePoint(462,346);
  let deep=null;
  for(let j=-9;j<=9;j++)for(let i=-9;i<=9;i++){
    const bank=forestBank(Math.floor(origin.x/snowCell)+i,Math.floor(origin.y/snowCell)+j);
    if(!bank)continue;
    for(let v=-12;v<=12;v+=4)for(let u=-18;u<=18;u+=6){
      const x=bank.x+u,y=bank.y+v;
      if(!clearFooting(x,y,P.r)||!clearFooting(x+10,y,P.r))continue;
      const h=forestDepth(x,y);if(h>.68 && (!deep || h>deep.depth))deep={x,y,depth:h};
    }
  }
  assert(deep,'accessible drift crest');
  for(const route of atlasRoutes)for(let i=1;i<route.length;i++){
    const [a,b]=route[i-1],[c,d]=route[i],n=Math.ceil(Math.hypot(a-c,b-d));
    for(let j=0;j<=n;j++)assert(forestDepth((a+(c-a)*j/n)*T,(b+(d-b)*j/n)*T)===0,'bank on cleared route');
  }
  for(const [x,y] of [[footbridge.x/T,footbridge.south/T],[260,470],[419,289],lakeShape,marshShape,[780,16],[iceHole.x/T,iceHole.y/T]])
    assert(forestDepth(x*T,y*T)===0,'bank on sheltered or wet ground');
  const measure=(point,run=false)=>{
    P.x=point.x;P.y=point.y;P.crouch=0;P.jumpT=0;P.st=100;
    IN.moveX=1;IN.moveY=0;IN.sprint=run;
    const start=P.x;
    for(let i=0;i<5;i++)updatePlayer(1/120);
    IN.moveX=0;IN.sprint=false;return (P.x-start)*24;
  };
  const road=measure(tilePoint(...baseRoad[1])),snow=measure(deep),snowRun=measure(deep,true);
  assert(road>110 && snow<road*.45 && snow>road*.2 && snowRun<=snow*1.08,'measured speeds '+[road,snow,snowRun]);
  P.x=deep.x;P.y=deep.y;P.step=stepDistance+21;winterTracks(.01,null);
  assert(S.flags.snowMarks.at(-1).depth>.65,'shallow print in deep snow');
  // Walk a cross section of the snowbank mathematically and check that there is no depth step.
  let previous=forestDepth(P.x-125,P.y),maxStep=0;
  for(let x=P.x-124;x<=P.x+125;x++){
    const z=forestDepth(x,P.y);maxStep=Math.max(maxStep,Math.abs(previous-z));previous=z;
  }
  assert(maxStep<.15,'discontinuous snow depth');
  const expected=forestDepth(P.x,P.y);
  window.__z.save(true,1);window.__z.applyState(window.__z.loadSave(1));
  assert(Math.abs(forestDepth(P.x,P.y)-expected)<.015,'snow depth changed on reload');
  // Compare adjacent ground chunks with normal neighbour columns in the same material.
  const seams=[];
  for(const [cx,cy] of [[28,23],[23,6],[19,16]]){
    const a=atlasTerrainChunk(cx,cy).getContext('2d').getImageData(510,0,2,512).data;
    const b=atlasTerrainChunk(cx+1,cy).getContext('2d').getImageData(0,0,2,512).data;
    let boundary=0,inside=0;
    for(let i=0;i<a.length;i+=8)for(let k=0;k<3;k++){
      boundary+=Math.abs(a[i+4+k]-b[i+k]);inside+=(Math.abs(a[i+k]-a[i+4+k])+Math.abs(b[i+k]-b[i+4+k]))*.5;
    }
    const excess=(boundary-inside)/1536;assert(excess<5,'visible chunk seam '+[cx,cy,excess]);seams.push(+excess.toFixed(2));
  }

  forestBanks.clear();assert(forestDepth(P.x,P.y)===expected,'bank moved after regeneration');
  return {deep,seams,walkPixelsPerSecond:{road,snow},routeCentrelines:atlasRoutes.length};
}
