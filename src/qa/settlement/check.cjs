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
    console.log(await page.evaluate('('+fs.readFileSync(path.resolve(__dirname,'../berezki/route.js'),'utf8')+')()'));
    console.log(await page.evaluate(()=>testDistrict()));
    if(errors.length)throw Error(errors.join('\n'));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

function checks(){
  function ensure(ok,label){if(!ok)throw Error(label);}
  const doors=HOUSES.filter(h=>h.cabin||h===fishingHouse).flatMap(h=>h.entrances.map(d=>({h,d})));
  for(const {h,d} of doors){
    const x=h.x*T+d.x,y=h.y*T+d.y;
    ensure(clearWalk(x,y-16,x,y+16,P.r),'Door centre '+[x/T,y/T]);
    ensure(!clearFooting(x-d.width/2-3,y+d.ny*8,P.r),'Door hinge collision');
  }
  for(const [x,y] of gatePosts)ensure(!clearFooting(x*T,y*T,P.r),'Gate pier');
  ensure(clearWalk(325*T,566*T,325*T,571*T,P.r),'Gate opening');
  for(const s of district.stairs){
    ensure(clearFooting(s.x,s.y,P.r),'Landing '+s.room.name);
    ensure(!clearFooting(s.x,(s.room.y+.97)*T,P.r),'Space behind stair');
    Object.assign(P,{x:s.x,y:s.y});
    window.__z.update(.01);
    ensure(G.near?.k==='winterStairs' && G.near.s===s,'Stair action '+s.room.name);
    window.__z.interact();
    ensure(winterFloor(P.x,P.y)?.n===s.room.n+(s.up?1:-1),'Destination');
    ensure(clearFooting(P.x,P.y,P.r),'Stair arrival');
  }
  const room=district.levels.find(r=>r.block==='living' && r.n===3);
  ensure(!district.stairs.some(s=>s.room===room&&s.up),'Fourth floor barricade');
  Object.assign(P,tilePoint(325,571));const body={k:'body',kind:'human',x:P.x+10,y:P.y,t:S.min};
  objs.push(body);draggedBody=body;
  Object.assign(P,{jumpT:0,jumpCD:0,sit:0,st:0});startJump();
  ensure(draggedBody===body && P.jumpT===0,'Failed jump');
  P.st=100;startJump();ensure(!draggedBody && P.jumpT>0,'Released body on jump');
  const at=[body.x,body.y];window.__z.update(.05);
  ensure(body.x===at[0] && body.y===at[1],'Body moved after release');
  body.t=S.min-1441;ageRemains();ensure(objs.some(o=>o.k==='bones' && o.t===body.t),'Remains after a day');
  ensure(district.images.remains.complete && district.images.winterWindows.complete && district.images.wireBay.complete,'Art');
  return {cabinDoors:doors.length,stairConnections:district.stairs.length,gatePiers:gatePosts.length,bodyDropped:true};
}
