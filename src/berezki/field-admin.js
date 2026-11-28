// Local playtest controls. Unlock belongs to this open panel, never to the save.
function changeFieldWeather(mode){
  const s=S.flags.blizzard ||= {stage:'calm',dir:0,cover:0};
  if(mode==='warning'||mode==='front'){
    if(mode==='warning'&&s.stage==='front'){s.until=S.min;winterStormTick(0);}
    if(s.stage==='calm'){
      s.until=S.min;winterStormTick(0);
      if(s.stage==='calm')return 'До укрытия нет маршрута. Перейдите на доступную улицу.';
    }
    if(mode==='front' && s.stage==='warning'){s.until=S.min;winterStormTick(0);}
    return s.stage==='front'?'Фронт метели активен.':'Передано предупреждение о метели.';
  }
  if(s.stage!=='calm'){
    s.stage='front';s.until=S.min;winterStormTick(0);
  }
  if(mode==='auto')delete S.flags.testWeather;
  else S.flags.testWeather={mode,until:S.min+60};
  s.until=Math.max(s.until||0,S.min+60);
  return mode==='auto'?'Восстановлен календарь погоды.':mode==='snow'?'Снег на один игровой час.':'Ясно на один игровой час.';
}
function summonFieldAnimal(species){
  if(winterFloor(P.x,P.y)||S.flags.stationDeck||S.flags.onLookout)return 'Выйдите на открытое место.';
  let pos=null;
  for(let i=0;i<20&&!pos;i++){
    const a=P.ang+(i===0?0:rnd(-1.4,1.4)),r=rnd(4.8,7);
    pos=clearingSpot([P.x/T+Math.cos(a)*r,P.y/T+Math.sin(a)*r],1);
  }
  if(!pos)return 'Рядом нет свободного участка суши.';
  // Use a vacant slot first. At the population limit move the most distant animal.
  const slots=S.flags.wildlife.filter(s=>s.species===species);
  const living=ents.filter(e=>e.alive&&e.species===species);
  const slot=slots.find(s=>!living.some(e=>e.wildId===s.id));
  if(slot){
    Object.assign(slot,pos,{homeX:pos.x,homeY:pos.y,hp:species==='wolf'?38:48,again:0});addWild(slot);
  }else{
    const far=living.reduce((a,b)=>dE(a,P)>dE(b,P)?a:b);
    Object.assign(far,pos,{home:{...pos},roam:null,tgt:null,trail:null,path:null});
    const record=slots.find(s=>s.id===far.wildId);Object.assign(record,pos,{homeX:pos.x,homeY:pos.y});
  }
  return species==='wolf'?'Волк появился рядом.':'Олень появился рядом.';
}
function drawFieldAdmin(){
  const host=el('div','field-admin'),status=el('p','admin-status');
  status.setAttribute('role','status');pbody.append(host);
  if(!panel.unlocked){
    const form=el('form','admin-row'),input=document.createElement('input');
    input.type='password';input.inputMode='numeric';input.autocomplete='off';input.placeholder='Пароль';input.setAttribute('aria-label','Пароль');
    const submit=el('button','chip','Войти');submit.type='submit';
    form.append(input,submit);host.append(form,status);
    form.onsubmit=e=>{
      e.preventDefault();
      if(input.value!=='1122'){status.textContent='Неверный пароль.';input.select();return;}
      panel.unlocked=true;refresh();
    };return;
  }
  function action(parent,label,fn){
    parent.append(btn('chip',label,()=>{if(!panel?.unlocked)return;status.textContent=fn();save(true);}));
  }
  function group(label){
    const field=el('fieldset','admin-row');field.append(el('legend','',label));host.append(field);return field;
  }
  const weather=group('Погода');
  for(const [value,label] of [['clear','Ясно'],['snow','Снег'],['warning','Подход метели'],['front','Удар фронта'],['auto','По календарю']]){
    action(weather,label,()=>changeFieldWeather(value));
  }
  const kit=group('Рюкзак'),select=document.createElement('select');
  select.setAttribute('aria-label','Предмет');
  const ids=new Set([...winterStaples,...Object.keys(salvageGoods),...Object.keys(winterSupplies),'ar_jacket','grenade']);
  for(const [id,item] of Object.entries(ITEMS))if(item.ammo||id.startsWith('w_'))ids.add(id);
  for(const id of [...ids].sort((a,b)=>ITEMS[a].n.localeCompare(ITEMS[b].n,'ru'))){
    select.add(new Option(ITEMS[id].n,id));
  }
  select.value='matches';kit.append(select);
  function quantity(parent,label,value,max){
    const input=document.createElement('input');input.type='number';input.min=1;input.max=max;input.step=1;
    input.value=value;input.setAttribute('aria-label',label);parent.append(input);return input;
  }
  const amount=quantity(kit,'Количество предметов',1,999);
  action(kit,'Выдать',()=>{
    if(!amount.value||!amount.checkValidity())return 'Укажите целое количество от 1 до 999.';
    const id=select.value,n=Number(amount.value),m=collectStock({loot:{[id]:n}},id);
    return 'В рюкзаке добавлено: '+m+' из '+n+'.'+(m<n?' '+receiveError(id,1):'');
  });
  const wallet=group('Деньги'),cash=quantity(wallet,'Сумма в RU',1000,1000000);
  action(wallet,'Добавить RU',()=>{
    if(!cash.value||!cash.checkValidity())return 'Укажите целую сумму от 1 до 1 000 000.';
    S.money+=Number(cash.value);return 'Баланс: '+S.money+' RU.';
  });
  const animals=group('Животные');
  action(animals,'Вызвать волка',()=>summonFieldAnimal('wolf'));
  action(animals,'Вызвать оленя',()=>summonFieldAnimal('deer'));
  host.prepend(status);
}
