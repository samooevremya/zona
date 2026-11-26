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
    console.log(await page.evaluate(()=>testDistrict()));
    if(errors.length)throw Error(errors.join('\n'));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

function checks(){
  const assert=(ok,what)=>{if(!ok)throw Error(what);};
  let rooms=0,flights=0,blocked=0;
  const flats=district.levels.filter(r=>r.block);
  assert(HOUSES.filter(h=>h.flat?.n===1 && h.storeys===5 && h.residenceWalls?.length===4).length===2,'two exterior five-storey shells');
  assert(flats.length===8,'3 + 5 storeys');
  for(const r of flats){
    // Flood the floor at a quarter tile using the actual player radius.
    const step=8,nx=r.w*4,ny=r.h*4,seen=new Set(),queue=[];
    const enqueue=(i,j)=>{
      const k=j*nx+i;if(i<0||j<0||i>=nx||j>=ny||seen.has(k))return;
      if(!clearFooting(r.x*T+(i+.5)*step,r.y*T+(j+.5)*step,P.r))return;
      seen.add(k);queue.push([i,j]);
    };
    enqueue(18*4,5*4+2);
    for(let i=0;i<queue.length;i++){const [a,b]=queue[i];enqueue(a+1,b);enqueue(a-1,b);enqueue(a,b-1);enqueue(a,b+1);}
    const reachable=(x,y)=>seen.has(Math.floor(y*4)*nx+Math.floor(x*4));
    if(r.n===1)assert(reachable(11.6,10.4),'street entrance '+r.block);
    for(const stair of district.stairs.filter(s=>s.room===r)){
      assert(reachable(stair.x/T-r.x,stair.y/T-r.y),'stair access '+r.name);
      winterUse({k:'winterStairs',s:stair});
      const dest=winterFloor(P.x,P.y);
      assert(dest.block===r.block && dest.n===r.n+(stair.up?1:-1) && clearFooting(P.x,P.y,P.r),'stair destination');
      flights++;
    }
    if(r.n===1 && !r.abandoned)continue;
    for(const u of [1,6,11])for(const v of [3.5,7.5]){
      if(r.abandoned && r.n===1 && u===11 && v>5)continue;
      const sealed=r.drifts.some(d=>Math.abs(d.u-u-3.55)<.01 && (d.v<5)===(v<5));
      if(sealed){blocked++;assert(!reachable(u+3.55,v),'buried room accessible '+r.name);}
      else {rooms++;assert(reachable(u+3.55,v),'apartment isolated '+r.name+' bay '+u+' row '+v);}
    }
  }
  for(const f of [iceHole,district.fire,shoreFire])assert(!clearFooting(f.x,f.y,P.r),'hole or fire passable');
  const before=S.min;
  const storm=snowWindow(4);
  S.min=storm.start-.1;assert(traceAlpha(storm.start-4)>.99,'footprint in dry weather');
  S.min=storm.start+storm.length*.56;assert(traceAlpha(storm.start-4)===0 && traceAlpha(S.min)===1,'snow burial');
  const body={k:'body',kind:'human',t:S.min,x:P.x,y:P.y,loot:{}};objs.push(body);draggedBody=body;
  S.weapon='w_pm';S.mag.w_pm=5;P.cool=P.reload=0;playerFire();assert(S.mag.w_pm===5,'shot while dragging');
  S.min+=1441;ageRemains();assert(objs.some(b=>b.k==='bones' && b.t===body.t),'skeleton missing');
  S.min+=1440;ageRemains();assert(!objs.some(b=>b.t===body.t),'bones persisted');
  S.min=before;
  const box=objs.find(o=>o.stash==='room_winter-workshop');
  assert(box.solid && !box.broken,'unbroken crate');breakCrate(box);restoreContainer(box);assert(box.broken && !box.solid && box.loot.wire,'broken crate persistence');
  return {storeys:flats.length,openApartments:rooms,sealedApartments:blocked,directionalFlights:flights,weather:true,loot:true,remains:true};
}
