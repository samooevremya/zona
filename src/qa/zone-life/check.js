window.zoneLifeCheck=async()=>{
  const ok=(yes,title)=>{if(!yes)throw Error(title);out.push(title);};
  const out=[];const fresh=()=>{closePanel();applyState(freshS());};
  fresh();
  const guard=byS('a1');S.flags.bridgePaid=1;talk(guard);
  ok(!panel.opts().some(o=>/платил/.test(o.t)),'paid toll');
  closePanel();dialog({n:'Путник',grp:'Костёр',record:true},Array.from({length:25},(_,i)=>'Длинная реплика '+i),()=>[{t:'Послушать',fn:()=>{for(let j=0;j<12;j++)say('Продолжение '+j);}}]);
  const log=()=>document.querySelector('.dlg-lines');
  ok(log().scrollTop===0 && log().scrollHeight>log().clientHeight,'dialog opening');
  document.querySelector('.dlg-opts button').click();
  ok(log().scrollTop>0 && log().scrollTop+log().clientHeight<log().scrollHeight-10,'reply scroll');
  closePanel();S.money=40000;addPacked('w_akms',1);addPacked('w_akms',1);talk(byS('lz_tech'));
  panel.opts().find(o=>o.t.startsWith('Лазерный')).fn();ok(has('laser_module'),'technician');
  closePanel();openPanel('inv','Рюкзак');panel.sel='w_akms';panel.copy=1;refresh();
  const pick=t=>[...pbody.querySelectorAll('button')].find(b=>b.textContent.includes(t));
  pick('Лазерный целеуказатель · установить').click();ok(gunCopy('w_akms',1).sights===2 && !sightInstalled('w_akms'),'per-copy installation');
  mountGear('w_akms',1,true);closePanel();save(true);applyState(loadSave());
  ok(sightInstalled('w_akms')===2 && !gunCopy('w_akms',1).sights,'copy switch and save');
  const stalker=byS('petr');S.inv.tail=2;ok(sellable('tail',stalker)===0 && sellable('tail',null)===2 && sellable('tail',byS('lz_barman'))===2,'trophy trade');
  const fox=byS('fox');fox.captive=fox.wounded=0;const hp=fox.hp;hurt(fox,500,P,1);rememberAttacker(fox);S.rep=-50;
  ok(fox.hp===hp && !hostile(fox,P) && !hostile(P,fox) && !fox.angry,'Fox remains friendly');
  S.rep=0;addPacked('vodka',1);P.hp=77;S.food=66;useItem('vodka');ok(P.hp===77 && S.food===58 && S.flags.dizzyUntil>S.min,'vodka');
  const prices=[];for(const difficulty of Object.keys(DIFFICULTIES)){S.difficulty=difficulty;prices.push(tradeStock(null).find(v=>v.id==='w_aksu').p);}
  ok(prices.every((p,i)=>p>=4500 && (!i || p>prices[i-1])),'equipment prices');
  fresh();nextChapter('rescue');ok(atpCompany().length===4,'four at muster');beginAssault();
  ok(atpCompany().every(e=>Number.isFinite(e.home.x)),'assault destinations');
  const beds=objs.filter(o=>o.k==='bed'||o.fitting==='bedroll'),places={};
  for(const b of beds){
    const x=b.x+b.w/2,y=b.y+b.h/2;
    for(const a of [0,1.57,3.14,4.71]){
      P.x=x+Math.cos(a)*32;P.y=y+Math.sin(a)*32;
      if(findInteract()?.k==='sleep'){const name=locAt(x/T,y/T)?.id||'else';places[name]=(places[name]||0)+1;break;}
    }
  }
  const bed=beds.find(b=>{P.x=b.x+b.w/2;P.y=b.y+b.h/2+22;return findInteract()?.k==='sleep' && !restBlock();});
  ok(bed && places.village && (places.zalissya || places.zalesye || Object.keys(places).some(k=>k.includes('zal'))),'usable base beds '+JSON.stringify(places));
  S.food=99;const min=S.min;sleepAtBed(bed);panel.opts()[0].fn();ok(S.min>=min+60,'bed advances world');
  const corpse={k:'body',kind:'boar',x:P.x,y:P.y,ang:0,seed:7,loot:{hoof:1},t:S.min-1439};objs.push(corpse);
  advanceWorldTime(2,'sleep');ok(objs.some(o=>o.k==='bones'&&o.seed===7),'body to bones');
  save(true);applyState(loadSave());ok(objs.some(o=>o.k==='bones'&&o.seed===7),'bones saved');
  S.min+=1440;ageRemains();ok(!objs.some(o=>o.k==='bones'&&o.seed===7),'bones gone');
  S.blow={next:S.min,stage:0,t:0};blowout(0);ok(S.blow.t===42,'warning duration');
  audioInit();for(let t=0;t<100&&!fieldBuffers.has('roadSong');t++)await new Promise(r=>setTimeout(r,50));
  const names=['loadPistol','loadShell','loadRifle','pavementL','pavementR','carve','warning','deskRadio','emberSong','roadSong','latePicking'];
  ok(names.every(n=>fieldBuffers.get(n)?.duration>.12),'decoded audio '+names.length);
  resetCampAudio();P.x=byS('sid').x;P.y=byS('sid').y+32;campAndRadio(.1);ok(radioAudio?.source.loop,'bunker radio');
  Object.assign(P,FIRE);campAndRadio(.1);ok(!radioAudio,'radio fades outside');
  S.blow.stage=0;WX.rain=0;const musician=byS('petr');Object.assign(musician,{x:FIRE.x+16,y:FIRE.y,sit:1,wounded:0,captive:0,tgt:null,evacuating:0,fireRef:FIRE});
  campDelay=0;campIndex=1;campAndRadio(.1);ok(campAct?.music && atFire(campAct.actor),'seated musician');campAct.actor.sit=0;campAndRadio(.1);ok(!campAct,'music stops when standing');
  const controls=document.createElement('div');soundSettings(controls,()=>{});const slider=controls.querySelector('input');slider.value=35;slider.dispatchEvent(new Event('input'));
  ok(JSON.parse(localStorage.getItem('zona-sound')).volume===.35 && Math.abs(master.gain.value-.1925)<.001,'saved volume');
  fresh();
  Object.assign(P,{x:FIRE.x+24,y:FIRE.y});
  S.inv.vodka=2;S.caches={};
  restAtFire();
  const teller=panel.e;
  const opts=()=>panel.opts(),ask=pattern=>opts().find(o=>pattern.test(o.t));
  const news=ask(/что слышно/);
  news.fn();const first=panel.lines.at(-1).t;news.fn();
  ok(first!==panel.lines.at(-1).t,'different camp replies');
  ask(/расспросить про/).fn();
  ok(cnt('vodka')===1 && !ask(/расспросить про/),'one cache per speaker');
  const witness=teller.sid;
  closePanel();save(true);applyState(loadSave());
  ok(talkMemory(byS(witness)).stash,'cache information persists');
  S.campaign.stage='done';S.campaign.liberated=true;talk(byS('wolf'));
  ok(ask(/деревне/) && ask(/дорогах/),'Wolf after campaign');
  closePanel();talk(byS('petr'));ok(!ask(/Что там внутри/) && ask(/Что нового/),'Petr after rescue');closePanel();
  ok(tradeStock(null).some(s=>s.id==='guitar') && tradeStock(byS('lz_barman')).some(s=>s.id==='guitar'),'guitar vendors');
  give('guitar',1);setWeapon('guitar');ok(!WP[S.weapon] && sellable('guitar',null)===0,'guitar in hands');
  for(const track of songBook){
    Object.assign(P,{x:FIRE.x+24,y:FIRE.y});S.blow={stage:0,next:S.min+200,t:0};
    restAtFire();const song=opts().find(o=>o.t.endsWith(track[1]));song.fn();
    ok(playerSong?.source.buffer===fieldBuffers.get(track[0]) && P.sit && !panel,'playing '+track[0]);
    render();IN.moveX=1;campAndRadio(.05);IN.moveX=0;ok(!P.sit && !playerSong,'leave seat');
  }
  const bandit=ents.find(e=>e.alive && e.fac==='bandit');
  Object.assign(P,{x:bandit.x-16,y:bandit.y,crouch:1});bandit.ang=0;bandit.tgt=null;bandit.aw=0;
  S.min=23*60;IN.moveX=1;resolveActorContacts(.03);IN.moveX=0;
  ok(bandit.tgt===P && bandit.aw===1,'contact behind hostile at night');
  ok(!Object.keys(window.ZONE_AUDIO).some(k=>/^(camp|army|ally|foe)0/.test(k)),'no recorded NPC dialogue');
  ok(['restored_pda','damaged_pda','guitar'].every(id=>itemIcon(id).tagName==='IMG'),'equipment artwork');
  return {out,prices,places};
}
