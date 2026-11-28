const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
  try{
    const p=await b.newPage({viewport:{width:930,height:540}}),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    const html=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8').replace('bootBerezki();','window.testTemperature='+checks.toString()+';bootBerezki();');
    await p.route('http://winter.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto('http://winter.test/#seed=29');
    await p.getByRole('button',{name:'Новая игра',exact:true}).click();await p.waitForFunction(()=>window.__z?.P);
    console.log(await p.evaluate(()=>testTemperature()));if(errors.length)throw Error(errors.join('; '));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
function checks(){
  const passed=[];
  function check(ok,label){if(!ok)throw Error(label);passed.push(label);}
  const near=(x,y)=>Math.abs(x-y)<1e-6;
  const hold=(key,t)=>S.flags.temperatures[key]={seed:1,start:S.min,end:S.min+600,from:t,to:t};
  for(const [hour,lo,hi] of [[0,-50,-38],[4,-50,-38],[6,-44,-34],[8,-38,-30],[18,-38,-30],[20,-44,-34],[22,-50,-38]]){
    const range=thermalRange(hour*60,false);
    check(range[0]===lo&&range[1]===hi,'диапазон в '+hour+' ч');
  }
  delete S.flags.temperatures;
  for(let m=557.25;m<557.25+4*1440;m+=3.5){
    const temp=thermalTrackAt('street',m),[lo,hi]=thermalRange(m,false),tr=S.flags.temperatures.street;
    if(temp<lo-1e-7||temp>hi+1e-7||Math.abs(tr.to-tr.from)>4*(tr.end-tr.start)/60+1e-8||
      tr.from===tr.to||!near(tr.to*10,Math.round(tr.to*10)))throw Error('Ошибка погоды на минуте '+m);
  }
  check(true,'4 суток, десятые доли и предел скорости, включая неполный первый час');
  S.min=810;S.flags.temperatures.street={start:780,end:840,from:-32,to:-35,seed:123};
  check(near(thermalTrackAt('street',S.min),-33.5),'пример 13:30 из ТЗ');
  const outdoors=tilePoint(260,453);Object.assign(P,outdoors);
  for(const [temp,remainder] of [[-30,83.333333333],[-35,77.08333333],[-40,70.833333333],[-45,64.583333333],[-50,58.333333333]]){
    hold('street',temp);S.flags.warmth=100;
    for(let i=0;i<600;i++)winterHeatTick(1/6,undefined);
    check(near(S.flags.warmth,remainder),'переход 100 с при '+temp+' °C');
  }
  hold('street',-50);S.flags.warmth=40;P.hp=100;winterHeatTick(100,undefined);
  check(S.flags.warmth===0&&near(P.hp,98.4),'из 40 тепла — 96 с до переохлаждения');
  const abandoned=district.levels.find(r=>r.abandoned);
  Object.assign(P,tilePoint(abandoned.x+3,abandoned.y+3));
  check(winterShelter(P)===abandoned&&ambientAt(abandoned,P.x,P.y)===-50,'холодное закрытое укрытие');
  const room=stationRoom;Object.assign(P,tilePoint(room.x+4,room.y+3));
  const key=roomClimateKey(room,P.x,P.y);
  for(const [temp,gain] of [[-2,.4],[1.4,.57],[5,.75]]){
    hold(key,temp);S.flags.warmth=0;P.hp=88;winterHeatTick(20,room);briefTask();
    check(near(S.flags.warmth,20*gain)&&P.hp===88&&H.quest.textContent.includes((temp>0?'+':'')+Math.round(temp)+' °C'),'отапливаемая станция при '+temp+' °C');
  }
  const fire={field:true,flame:S.min+35,embers:S.min+65,x:P.x+4,y:P.y+4};WORLD_FIRES.push(fire);
  S.flags.warmth=0;winterHeatTick(10,room);check(near(S.flags.warmth,15),'костёр в тепле за 10 с');
  winterHeatTick(20,room);check(near(S.flags.warmth,45),'костёр за 30 с');
  S.min+=35;winterHeatTick(1,room);check(near(S.flags.warmth,45.75),'угли — возврат к температуре комнаты');
  Object.assign(P,outdoors);Object.assign(fire,{x:P.x+6,y:P.y,flame:S.min+60});S.flags.warmth=0;P.hp=80;winterHeatTick(60,undefined);
  check(near(S.flags.warmth,90)&&P.hp===80,'костёр на улице за минуту');
  P.x+=200;winterHeatTick(1,undefined);check(S.flags.warmth<90&&!P.byHeat,'выход из зоны огня');
  WORLD_FIRES.pop();delete S.flags.temperatures;S.min=813.5;
  const t=ambientAt(room,room.x*T+100,room.y*T+100),tracks=structuredClone(S.flags.temperatures);
  S.min+=179;const resumed=ambientAt(room,room.x*T+100,room.y*T+100);
  S.flags.temperatures=tracks;S.min-=179;
  check(near(t,ambientAt(room,room.x*T+100,room.y*T+100)),'сохранение температуры внутри часа');
  let m=S.min;for(let i=1;i<=179;i++){S.min=m+i;ambientAt(undefined,P.x,P.y);}
  check(near(resumed,ambientAt(room,room.x*T+100,room.y*T+100)),'повторный вход и погода вне помещения');
  S.flags.warmth=23.4;save(true,1);const slot=loadSave(1),weather=JSON.stringify(slot.flags.temperatures);applyState(slot);
  check(near(S.flags.warmth,23.4)&&JSON.stringify(S.flags.temperatures)===weather,'загрузка слота без скачка');
  delete slot.flags.temperatures;applyState(slot);check(Number.isFinite(ambientAt(undefined,P.x,P.y))&&near(S.flags.warmth,23.4),'старое сохранение');
  Object.assign(P,outdoors);WORLD_FIRES.push({...fire,x:P.x,y:P.y,flame:S.min+30});
  S.flags.blizzard={stage:'front',until:S.min+10,cover:0,dir:0};winterWeather(.02);
  check(!P.alive,'фронт метели имеет приоритет у огня');
  return passed;
}
