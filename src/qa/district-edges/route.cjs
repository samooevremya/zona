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
  const z=window.__z,stops=[];
  function assert(ok,label){if(!ok)throw Error(label);}
  function walk(point){
    const [x,y]=point;
    for(let i=0;i<4800;i++){
      const dx=x*T-P.x,dy=y*T-P.y,d=Math.hypot(dx,dy);
      if(d<1.9){IN.moveX=IN.moveY=0;return i;}
      IN.moveX=dx/d;IN.moveY=dy/d;z.update(1/60);
      if(!P.alive)throw Error('Died near '+[P.x/T,P.y/T]+' on way to '+point);
    }
    throw Error('Blocked near '+[P.x/T,P.y/T]+' on way to '+point);
  }
  const follow=route=>route.reduce((sum,p)=>sum+walk(p),0);
  const back=route=>follow(route.slice().reverse());
  const homes=[[518,360],[518,362],[503,364],[483.12,365.2],[427.68,360.8],[368.72,344.08],
    [322.08,338.8],[326.48,282.48],[325,235]];
  const hall=[[325,231],[325,226.9],[335,226.9]];
  const crossing=[[335,224.5],[335,219],[341.44,209.44]];
  const lake=atlasRoutes[3].slice(2).concat([[495.9,132.8],[496.2,126],[494.8,123.2],[491.4,122]]);
  follow(homes);follow(hall);follow(crossing);follow(lake);stops.push('lake');
  back(lake);walk(crossing.at(-1));
  const west=atlasRoutes[4],store=west[3];
  follow(west.slice(1,4));follow([[157.5,188.2],[157.5,184]]);
  assert(winterFloor(P.x,P.y)===westStore,'Depot');stops.push('depot');
  walk([157.5,188.2]);walk(store);follow(west.slice(4));walk([79,121]);
  assert(S.flags.onLookout,'Lookout');stops.push('lookout');
  back(west.slice(4));back(west.slice(0,4));back(crossing);back(hall);
  const road=baseRoad.slice();walk(road.at(-1));back(road);
  stops.push('base');const gateSeconds=follow(road)/60;
  assert(gateSeconds>=90 && gateSeconds<=93,'Base to station: '+gateSeconds);
  back(road.slice(1));follow(atlasRoutes[7].slice(1));stops.push('hamlet');
  const pump=atlasRoutes[5];back(pump.slice(3));walk([201.5,440]);walk([201.5,437]);walk(pumpDoor);
  assert(winterFloor(P.x,P.y)===pumpRoom,'Pump');stops.push('pump');
  back(marshCrossing);back(pumpPaths[3]);assert(swampAt(P.x,P.y),'Marsh');stops.push('marsh');
  // Test the entire published perimeter, including the corner cells.
  const w=district.width,h=district.height;
  for(let x=0;x<w;x++)assert(tAt(x,0)===VO && tAt(x,h-1)===VO,'Loaded north/south limit '+x);
  for(let y=0;y<h;y++)assert(tAt(0,y)===VO && tAt(w-1,y)===VO,'Loaded west/east limit '+y);
  let edgeApproaches=0;
  function tryEdge(tx,ty,dx,dy){
    const e={x:(tx+.5)*T,y:(ty+.5)*T,r:P.r};
    if(!clearFooting(e.x,e.y,e.r))return;
    for(let i=0;i<18;i++)moveE(e,dx*3,dy*3);
    assert(e.x>=T+e.r-.01 && e.y>=T+e.r-.01 && e.x<=(w-1)*T-e.r+.01 && e.y<=(h-1)*T-e.r+.01,'Escaped loaded terrain');
    edgeApproaches++;
  }
  for(let x=1;x<w-1;x++){tryEdge(x,1,0,-1);tryEdge(x,h-2,0,1);}
  for(let y=1;y<h-1;y++){tryEdge(1,y,-1,0);tryEdge(w-2,y,1,0);}
  for(const y of [223.05,224.65]){
    Object.assign(P,{x:2*T,y:y*T});S.flags.warmth=85;
    for(let i=0;i<80;i++)moveE(P,-2,0);
    assert(P.x>=T && P.x<1.8*T,'West limit on track');
    const prior={x:P.x,y:P.y};z.save(true,1);z.applyState(z.loadSave(1));
    assert(dE(P,prior)<1,'Reload at rail seam');
    for(let i=0;i<60;i++)moveE(P,2,0);
    assert(P.x>4*T,'Return along tracks');
  }
  const panels=westRailPanels(-620,50,northFence-80,southFence+80);
  assert(panels.length>20 && panels.every(p=>p.x<0),'Missing rail fence backdrop');
  for(const [tx,ty] of [[-24,-24],[w,-24],[-24,h],[w,h]]){
    const trees=[...treesInRect(tx*T,ty*T,(tx+24)*T,(ty+24)*T)];
    assert(trees.length>0,'Missing corner canopy at '+[tx,ty]);
  }
  return {continuousWalk:stops,gateToStationSeconds:+gateSeconds.toFixed(2),boundaryCells:2*w+2*h-4,edgeApproaches,railsReload:true};
}
