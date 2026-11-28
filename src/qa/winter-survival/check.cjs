const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
  try{
    const p=await b.newPage({viewport:{width:930,height:540}}),errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    const html=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8').replace('bootBerezki();','window.testSurvival='+checks.toString()+';bootBerezki();');
    await p.route('http://winter.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto('http://winter.test/#seed=29');
    await p.getByRole('button',{name:'Новая игра',exact:true}).click();await p.waitForFunction(()=>window.__z?.P);
    console.log(await p.evaluate(()=>testSurvival()));if(errors.length)throw Error(errors.join('; '));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
function checks(){
  const passed=[];function check(ok,reason){if(!ok)throw Error(reason);passed.push(reason);}
  for(const e of ents.filter(e=>e.service))check(winterShelter(e)&&clearFooting(e.x,e.y,e.r),'пост '+e.name);
  for(const species of ['wolf','deer'])check(ents.filter(e=>e.alive&&e.species===species).length===24,'численность '+species);
  P.hp=55;S.bleed=2;useItem('bandage');check(P.hp===60&&S.bleed===0,'бинт');useItem('medkit');check(P.hp===90,'аптечка');
  S.flags.warmth=10;S.food=20;P.st=10;S.inv.tea=S.inv.coffee=1;useItem('tea');useItem('coffee');
  check(S.flags.warmth===60&&S.food===35&&P.st===40,'напитки');
  const pos=tilePoint(390,109),villageRoute=stormRoute({...pos,r:11});
  check(villageRoute&&villageRoute.seconds<12,'убежище у рыбацкого огня');
  const woodIcon=itemIcon('wood');
  check(woodIcon.src===district.images.firewood.src&&woodIcon.src!==district.images.wood.src,'дрова и поленница различимы');
  const seeded=Object.entries(S.flags.winterBoxSites||{}).filter(([key])=>key.includes('expedition-'));
  check(seeded.length===5,'случайные коробки в зданиях');
  const originalRandom=Math.random;
  try{Math.random=()=>.99;check(Object.keys(rollFinds(metalFinds)).length===0,'пустые броски металлического ящика');}
  finally{Math.random=originalRandom;}
  for(const point of [[120,279],[82,397],[25,30],[495,490]]){
    const origin=tilePoint(...point);
    check(stormRoute({...origin,r:11})?.seconds>0,'доступное убежище '+point.join(','));
  }
  const ground=baseRoad[1];Object.assign(P,tilePoint(...ground));P.st=50;winterExert(1,true,false,false,.9);check(P.st===50,'сугроб без восстановления');
  winterExert(1,false,false,false,.9);check(P.st>60,'остановка');P.st=1;winterExert(1,true,true,true,.9);check(P.st===0&&P.winded,'истощение');
  const outside=tilePoint(260,453);Object.assign(P,outside);S.flags.warmth=10;S.min=840;
  S.inv.matches=5;S.inv.wood=2;P.ang=0;check(!fireSiteProblem(fireSpot()),'выбор площадки');
  IN.moveX=IN.moveY=0;fireAction({k:'fireSite'});const f=S.flags.campfires.at(-1);
  IN.moveX=1;tickFieldFire(.6);IN.moveX=0;check(cnt('wood')===1&&cnt('matches')===5&&!layingFire,'отмена до чирка');
  const random=Math.random;
  try{
    Math.random=()=>.95;strikeFire(f);tickFieldFire(3);check(cnt('matches')===4&&!fireLit(f)&&f.unburnt,'неудачный розжиг');
    Math.random=()=>.15;strikeFire(f);tickFieldFire(3);check(cnt('matches')===3&&fireLit(f),'повторный розжиг');
  }finally{Math.random=random;}
  S.flags.warmth=0;const hp=P.hp;winterWeather(1);check(P.hp===hp&&S.flags.warmth>0,'обогрев без отдыха');
  S.min+=61;check(!fireLit(f)&&f.embers>S.min,'угли');
  fireAction({k:'fieldFire',f});panel.opts()[0].fn();check(cnt('matches')===3&&cnt('wood')===0&&fireLit(f),'подброс дров');
  fireAction({k:'fieldFire',f});panel.opts().find(o=>o.t==='Засыпать снегом').fn();check(!fireLit(f)&&f.embers===0,'тушение');
  S.money=2000;const doc=byS('baseMedic'),merchant=byS('baseSeller');P.hp=50;winterService(doc);panel.opts().find(o=>o.t.startsWith('Лечение')).fn();check(P.hp===100&&S.money===1900,'лечение у медика');
  check(tradePrice('medkit',doc)>tradePrice('medkit',merchant),'наценка медика');
  openTrade(merchant);panel.offer={buy:{matches:1},sell:{}};tradeDo(merchant);closePanel();check(cnt('matches')===8,'коробок из пяти спичек');
  const elder=byS('flatChief');openTrade(elder);panel.offer={buy:{medkit:1},sell:{}};tradeDo(elder);closePanel();check(!serviceStock(elder).some(s=>s.id==='medkit'),'конечный запас');
  S.cond.w_pm=65;winterService(byS('baseSmith'));panel.opts().find(o=>o.t.includes('→ 100%')).fn();check(S.cond.w_pm===100,'починка');
  const dealer=byS('kmSeller');winterService(dealer);panel.opts().find(o=>o.t.startsWith('Взять заказ')).fn();check(winterJobs()[0].st==='a','запись заказа');
  S.inv.lining=2;winterService(dealer);panel.opts().find(o=>o.t.startsWith('Сдать')).fn();check(winterJobs()[0].st==='d'&&serviceStock(dealer).some(s=>s.id==='w_obrez'),'выполнение и редкий товар');
  const box=objs.find(o=>o.k==='crate'&&o.stash),prior=box.x;breakCrate(box);S.min+=CRATE_LIFETIME+1;cleanExpiredCrates();check(!box.broken&&box.x!==prior,'перемещение коробки');
  const animal=ents.find(e=>e.species==='deer');kill(animal,P);
  const body=objs.find(o=>o.k==='body'&&o.species==='deer');check(body.loot.antler===1&&body.loot.deerHide===1,'трофеи оленя');
  const slot=S.flags.wildlife.find(s=>s.id===animal.wildId),day=1440;check(slot.again>=S.min+day*2&&slot.again<=S.min+day*3,'срок возрождения');
  S.min+=day;ageRemains();check(objs.some(o=>o.k==='bones'&&o.x===body.x),'скелет через сутки');
  S.min=slot.again+.1;ageRemains();winterWildTick();check(ents.some(e=>e.wildId===slot.id&&e.alive)&&!objs.some(o=>o.k==='bones'&&o.x===body.x),'возвращение стада');
  S.flags.blizzard={stage:'calm',until:S.min,dir:0,cover:0};Object.assign(P,outside);winterStormTick(.02);
  check(S.flags.blizzard.stage==='warning'&&S.news.some(m=>m.x.includes('Метель с')),'предупреждение');const s=S.flags.blizzard;
  const route=stormRoute(P);check(route&&s.until-S.min>=route.seconds,'время на укрытие');
  Object.assign(P,byS('baseChief').home);S.min=s.until;winterStormTick(.02);check(P.alive&&s.stage==='front','пережить фронт в штабе');
  save(true,1);const saved=loadSave(1);applyState(saved);check(S.flags.blizzard.stage==='front'&&!serviceStock(byS('flatChief')).some(s=>s.id==='medkit'),'загрузка во время метели');
  Object.assign(P,outside);winterStormTick(.1);check(!P.alive,'выход под удар');
  return passed;
}
