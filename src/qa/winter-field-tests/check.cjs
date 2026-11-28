const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

function worldChecks(){
  function check(ok,n){if(!ok)throw Error(n);}
  save(true,2);
  const old=loadSave(2);
  old.flags.wildlife=old.flags.wildlife.filter(s=>Number(s.id.match(/\d+/)[0])<24);
  const original=old.flags.wildlife[1];original.hp=19;
  old.flags.wildlife[0].hp=0;old.flags.wildlife[0].again=S.min+1500;
  applyState(old);save(true,2);applyState(loadSave(2));
  check(S.flags.wildlife.length===60&&new Set(S.flags.wildlife.map(s=>s.id)).size===60,'migration duplicated slots');
  check(ents.filter(e=>e.species==='wolf'&&e.alive).length===29&&!ents.some(e=>e.wildId==='wolf0'),'dead animal respawned during migration');
  check(ents.find(e=>e.wildId===original.id).hp===19,'old animal overwritten');
  for(const [group,route] of Object.entries(wildlifeCrossings)){
    const at={x:route[0][0]*T,y:route[0][1]*T};
    check(ents.some(e=>e.wildGroup===group&&dE(at,e)<4*T),'road encounter '+group);
  }
  const place=tilePoint(...hamletCross);
  Object.assign(P,place);
  const f={x:P.x+15,y:P.y,field:true,flame:0,embers:S.min-1,unburnt:false};
  const dry={...f,unburnt:true},legacy={...f,embers:0};
  S.flags.campfires=[f,dry,legacy];restoreFieldFires();tickFieldFire(.02);
  check(WORLD_FIRES.includes(f)&&WORLD_FIRES.includes(legacy),'fresh ash');
  S.min+=31;tickFieldFire(.02);
  check(S.flags.campfires.length===1&&WORLD_FIRES.includes(dry)&&!WORLD_FIRES.includes(f)&&!WORLD_FIRES.includes(legacy),'cold fire cleanup');
  S.flags.campfires.push({...f});restoreFieldFires();check(S.flags.campfires.length===1,'load expired ash');
  const fixed=WORLD_FIRES.find(f=>!f.field&&fireLit(f));Object.assign(P,{x:fixed.x+19,y:fixed.y+9});
  const choices=[];winterInteractChoices((_,n)=>choices.push(n));check(!choices.some(n=>n.k==='winterRest'&&!n.bed),'warm prompt');
  S.flags.warmth=50;winterWeather(1);check(S.flags.warmth>50,'passive heat');
  for(const p of atlasProps.filter(p=>p.yard)){
    const c=winterCanvas(320,320),g=c.getContext('2d');g.translate(150-p.x,160-p.y);
    const source={x:p.x-95,y:p.y,ang:0};paintYardBeamShadow(g,p,source,330,.42);
    check(g.getImageData(0,0,320,320).data.some((v,i)=>i%4===3&&v>50),'missing light silhouette '+p.key);
    g.clearRect(p.x-150,p.y-160,320,320);source.ang=Math.PI;paintYardBeamShadow(g,p,source,330,.42);
    check(!g.getImageData(0,0,320,320).data.some(v=>v),'back-facing silhouette '+p.key);
  }
  Object.assign(P,place);P.ang=0;S.flags.warmth=100;
}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--disable-gpu','--no-sandbox']});
 try{
  const page=await b.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const html=fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8').replace('bootBerezki();',
    'window.worldChecks='+worldChecks.toString()+';window.testState=()=>({cash:S.money,matches:cnt("matches"),near:ents.filter(e=>e.wildId&&dE(e,P)<260).map(e=>e.species),storm:S.flags.blizzard?.stage,snow:snowing(S.min)});bootBerezki();');
  await page.route('http://test.local/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto('http://test.local/#seed=29');const button=name=>page.getByRole('button',{name,exact:true});
  await button('Новая игра').tap();await page.evaluate(()=>worldChecks());
  await page.locator('#t-menu').tap();await button('Админ-меню').tap();
  await page.getByLabel('Пароль').fill('1234');await button('Войти').tap();assert(await page.getByText('Неверный пароль.').isVisible());
  await page.getByLabel('Пароль').fill('1122');await button('Войти').tap();
  const state=()=>page.evaluate(()=>testState()),start=await state();
  await button('Добавить RU').tap();assert.equal((await state()).cash,start.cash+1000);
  await button('Выдать').tap();assert.equal((await state()).matches,start.matches+1);
  await button('Снег').tap();assert((await state()).snow);
  await button('Ясно').tap();assert(!(await state()).snow);
  await button('Подход метели').tap();assert.equal((await state()).storm,'warning');
  await button('Удар фронта').tap();assert.equal((await state()).storm,'front');
  await button('По календарю').tap();assert.equal((await state()).storm,'calm');
  for(const [label,kind] of [['Вызвать волка','wolf'],['Вызвать оленя','deer']]){
    await button(label).tap();assert((await state()).near.includes(kind));
  }
  await page.locator('#pclose').tap();await page.locator('#t-menu').tap();await button('Админ-меню').tap();assert(await page.getByLabel('Пароль').isVisible());
  if(process.env.FIELD_ADMIN_SHOT){await page.getByLabel('Пароль').fill('1122');await button('Войти').tap();await page.screenshot({path:process.env.FIELD_ADMIN_SHOT});}
  assert.deepEqual(errors,[]);console.log('PASS: old saves, roadside wildlife, fire lifecycle, passive warmth, projected silhouettes, touch PIN and admin actions');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
