const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

function checkField(){
  const ensure=(ok,message)=>{if(!ok)throw Error(message)};
  const origin=tilePoint(198.8,434.2);
  const ray=mode=>npcBarrier(origin,0,-1,112,null,mode);
  ensure(ray('light')===112 && ray(false)<80,'Pipe height in light/collision tests');
  const wall=npcBarrier(tilePoint(201.5,433),1,0,120,null,'light');
  ensure(wall<120,'Wall must still block light');
  const modes=[];
  const oldPlay=play;
  try{
    play=(name)=>modes.push(name);
    for(const [id,rounds,expected] of [['w_pm',1,'loadPistol'],['w_obrez',1,'loadShellOne'],['w_obrez',2,'loadShell']]){
      S.weapon=id;const w=WP[id];S.inv[w.ammo]=rounds;S.mag[id]=w.mag-rounds;P.reload=0;
      startReload();ensure(modes.at(-1)===expected,'Reload '+id+': '+modes);finishReload();
      ensure(S.mag[id]===w.mag,'Reload completion');
    }
    for(const [kind,expected] of [['wood','hitTimber'],['concrete','hitMasonry'],['waterMain','hitSteel']]){
      surfaceImpact(P.x,P.y,1,0,{k:kind},true);ensure(modes.at(-1)===expected,'Impact '+kind);
    }
    Object.assign(P,tilePoint(280,70));modes.length=0;
    fire(P,0,{...WP.w_pm,range:45},0);
    ensure(modes.join(',')==='p','Open-air shot '+modes);
    Object.assign(P,origin);modes.length=0;fire(P,-Math.PI/2,WP.w_obrez,0);
    ensure(modes.filter(x=>x==='hitSteel').length===1,'Pellet volley and pipe '+modes);
  }finally{play=oldPlay;}
  let dense=0,clear=0;
  for(let x=175;x<200;x+=.5)for(let y=411;y<438;y+=.5){
    const d=reedDensity(x*T,y*T);if(d>.72){dense++;ensure(surf(x*T,y*T)==='winterReeds','Missing rustle on reeds');}
    if(swampAt(x*T,y*T)&&d===0)clear++;
  }
  ensure(dense>25 && clear>25,'Banks and open slush');
  for(const h of HOUSES.filter(h=>h.pumpingStation||h===fishingHouse||h.cabin)){
    const r=h.cabin||fishingRoom;
    const hearth=h.pumpingStation?pumpHearth:r.heater?.at||shoreHomes.find(v=>v.room===r)?.hearth;
    ensure(h.rooftop.length===(hearth?1:0),'Stack count '+h.x+','+h.y);
    if(hearth){const [u,v,w,d]=h.rooftop[0];ensure(Math.hypot(hearth.x-h.x*T-u-w/2,hearth.y-h.y*T-v-d/2)<1,'Unseated stack');}
  }
  return {light:ray('light'),solid:ray(false),wall,reedSamples:dense,openSlushSamples:clear};
}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--single-process','--disable-gpu','--disable-software-rasterizer']});
 try{
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const root=path.resolve(__dirname,'../../..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('bootBerezki();','window.checkField=('+checkField.toString()+');bootBerezki();');
  await p.route('http://check.local/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await p.goto('http://check.local/?preview=marsh');await p.getByRole('button',{name:'Новая игра',exact:true}).click();
  console.log('Marsh routes:',await p.evaluate('('+fs.readFileSync(path.join(root,'src/qa/marsh-pump/route.js'),'utf8')+')()'));
  console.log('Field checks:',await p.evaluate(()=>checkField()));
  console.log('Decoded sound files:',await p.evaluate(async()=>{
    const ac=new AudioContext(),ids=['pistol','rifle','shotgun','loadPistol','loadShell','loadShellOne','hitTimber','hitMasonry','hitSteel','hitSoil','winterReeds1','winterReeds2'];
    try{for(const id of ids){const buf=await ac.decodeAudioData(Uint8Array.from(atob(ZONE_AUDIO[id]),x=>x.charCodeAt(0)).buffer);if(buf.duration<.1)throw Error(id);}return ids.length;}finally{await ac.close();}
  }));
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
