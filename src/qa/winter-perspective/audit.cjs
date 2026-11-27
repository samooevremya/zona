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
  const counts={},types={};
  for(const o of objs)types[o.k]=(types[o.k]||0)+1;
  const cv=winterCanvas(360,360),g=cv.getContext('2d',{willReadFrequently:true});
  const assert=(ok,why)=>{if(!ok)throw Error(why);};
  const all=[...raisedScenery,...atlasProps],offsets=[[-144,0],[144,0],[0,-128],[0,128]];
  for(const p of all){
    const type=p.key||p.item?.fitting||p.item?.k||(p.panel?'fence':'lookout');
    counts[type]=(counts[type]||0)+1;
    const h=p.worldHeight??p.height??(p.westDeck?lookout.rise:40);
    for(const [dx,dy] of offsets){
      cam.x=p.x+dx;cam.y=p.y+dy;
      const [x,y]=winterParallax(p.x,p.y,h);
      assert(Math.abs(x+dx*h*winterLens)<1e-6 && Math.abs(y+dy*h*winterLens)<1e-6,'Parallax '+type);
      assert(winterParallax(p.x,p.y,0).every(v=>v===0) && winterParallax(p.x,p.y,h,true).every(v=>v===0),'Pivot '+type);
      g.setTransform(1,0,0,1,180-p.x,180-p.y);
      drawAtlasProp(g,p,false);
    }
    if(counts[type]===1){
      // The baked survey must contain the prop but be independent of the last live camera.
      let baseline;
      for(const offset of [-140,140]){
        cam.x=p.x+offset;cam.y=p.y-offset;
        g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,360,360);
        g.translate(180-p.x,180-p.y);drawAtlasProp(g,p,true);
        const image=g.getImageData(0,0,360,360).data;
        assert(image.some((v,i)=>i%4===3 && v>0),'Empty survey prop '+type);
        if(baseline)assert(image.every((v,i)=>v===baseline[i]),'Camera leaked into survey '+type);
        baseline=image;
      }
    }
  }
  for(const h of HOUSES.filter(h=>h.residenceWalls)){
    const x=h.x*T,y=h.y*T,k=roofLift(h);
    for(const [dx,dy] of offsets){
      cam.x=x+dx;cam.y=y+dy;
      const [a,b]=residencePoint(x,y,k);
      const [c,d]=raisedOffset(x,y,48*h.storeys);
      assert(Math.abs(a-x-c)<.001 && Math.abs(b-y-d)<.001,'Wall and roof');
    }
  }
  const crates=objs.filter(o=>o.k==='crate');
  for(const o of crates){
    const x=o.x+o.w/2,y=o.y+o.h/2;
    for(const [dx,dy] of offsets){
      cam.x=x+dx;cam.y=y+dy;const matrices=[];
      ctx.save();ctx.setTransform(1,0,0,1,0,0);
      liftContainer(o,()=>matrices.push(ctx.getTransform()));ctx.restore();
      const m=matrices.at(-1),[u,v]=winterParallax(x,y,18);
      assert(Math.abs(m.e-u)<.0001 && Math.abs(m.f-v)<.0001,'Crate projection');
    }
  }
  const b=footbridge;
  for(const y of [b.north,b.south])assert(bridgeOffset(y).every(v=>v===0),'Bridge landing');
  const mid=(b.north+b.south)/2;
  for(const [dx,dy] of offsets){
    cam.x=b.x+dx;cam.y=mid+dy;
    const [x,y]=bridgeOffset(mid),[u,v]=raisedOffset(b.x,mid,24);
    assert(x===u && y===v,'Bridge deck');
  }
  let trees=0;for(const tree of treesInRect(0,0,district.width*T,district.height*T)){
    trees++;assert(tree.art.crown && tree.size>0 && canopyLayers.has(tree.art.crown),'Missing crown');
  }
  return {rendered:all.length,byFamily:counts,buildings:HOUSES.filter(h=>h.residenceWalls).length,trees,types};
}
