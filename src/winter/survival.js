const flatIndex=winterMap.buildings.findIndex(b=>b[0]==='flat');
const campfires=[[96,52.4],[72,28.65],[111,20],[54,95],[42.4,69],[30.8,27]];
const shelters=new Set(['flat','cabin','station','pump','store']);
const backpack={
  bread:{name:'Хлеб',price:40,weight:.3},cans:{name:'Консервы',price:90,weight:.5},
  bandage:{name:'Бинт',price:80,weight:.1},medkit:{name:'Аптечка',price:300,weight:.3},
  guitar:{name:'Гитара',price:750,weight:1.8},jacket:{name:'Зимняя куртка',price:300,weight:3},
  a9:{name:'Патроны 9×18',price:8,weight:.01},a12:{name:'Дробь',price:20,weight:.04},
  a545:{name:'Патроны 5,45',price:15,weight:.012},a762:{name:'Патроны 7,62',price:18,weight:.016},
};
for(const [id,price,weight] of [['w_pm',600,.8],['w_obrez',1200,1.9],['w_toz34',2700,3.1],['w_aksu',4500,2.7],['w_aps',2100,1.05],['w_akms',6200,3.3]])
  backpack[id]={name:WP[id].n,price,weight};
function newWinterState(difficulty='normal'){
  const b=winterMap.buildings[flatIndex];
  return {version:1,siteRevision:2,difficulty,x:b[1]-1.4,y:b[2],room:flatIndex,floor:1,clock:510,warmth:100,wet:0,sinking:0,
    hp:100,food:89,stamina:100,inventory:{jacket:1,bread:1,bandage:2,medkit:1},money:0,held:'hands',rounds:{},
    searched:{},actors:{},fires:campfires.map(()=>true),crouch:false,lamp:false};
}
let state=newWinterState(),cooldown=0,reloadTime=0,reloadWeapon='',traces=[],soundEnabled=true;
const walkSpeed=.60;
const $=id=>document.getElementById(id);
const modal=document.querySelector('dialog');
function notice(text){$('details').textContent=text;$('details').hidden=false;notice.until=performance.now()+3100;}
function heldName(){return ({hands:'Пустые руки',knife:'Нож'})[state.held]||backpack[state.held]?.name||'Руки';}
function nearPoint(pos,r){return Math.hypot(player.x-pos[0],player.y-pos[1])<r;}
function restoreState(next){
  state=next;
  if(state.siteRevision!==2){
    if(state.room<0){
      if(state.y>36.65&&state.y<=railSouth+.12)state.y=railSouth+.16;
      else if(state.y>=31.82&&state.y<=36.65&&state.y<=railNorth+.12)
        state.y=stationPortals[2].world[1];
      if(!outsideFree(state.x,state.y)&&Math.abs(state.x-stationBuilding[1])<stationBuilding[3]/2+.2){
        const portal=stationPortals[state.y<31.82?0:state.y<railSouth?2:1];
        [state.x,state.y]=portal.world;
      }
    }else if(!insideFree(state.room,state.x,state.y)){
      const b=winterMap.buildings[state.room];
      let found=false;
      for(let r=.12;r<=Math.max(b[3],b[4])&&!found;r+=.12){
        for(let k=0;k<16;k++){
          const a=k*Math.PI/8,x=state.x+r*Math.cos(a),y=state.y+r*Math.sin(a);
          if(insideFree(state.room,x,y)){state.x=x;state.y=y;found=true;break;}
        }
      }
    }
    const walker=state.actors?.walker;
    if(walker&&walker.hp>0&&overBuilding(walker.x,walker.y,stationBuilding,.12))
      [walker.x,walker.y]=people.find(n=>n.id==='walker').home;
    state.siteRevision=2;
  }
  fieldReset();tracksInSnow.length=0;lastMark=probe=null;player.x=state.x;player.y=state.y;camera.x=player.x;camera.y=player.y;
  cooldown=reloadTime=0;reloadWeapon='';traces=[];releaseStick();keys.clear();
}
function saveSlot(id){
  state.x=player.x;state.y=player.y;
  try{localStorage.setItem('winter.km100.v1.'+id,JSON.stringify(state));return true;}catch{notice('Запись сохранения недоступна');return false;}
}
function readSlot(id){
  try{
    const s=JSON.parse(localStorage.getItem('winter.km100.v1.'+id));
    if(s?.version===1 && Number.isFinite(s.x) && Number.isFinite(s.y) && s.inventory && s.hp>0)return s;
  }catch{}
  return null;
}
function fireIndex(range=1.65){return state.room<0?campfires.findIndex(p=>nearPoint(p,range)):-1;}
function isMarsh(){return state.room<0 && polygonContains(marshShore,player.x,player.y);}
function climate(dt){
  const marsh=isMarsh(),f=fireIndex(),indoors=state.room>=0 && shelters.has(winterMap.buildings[state.room][0]);
  const lit=f>=0 && state.fires[f],safe=indoors||lit;
  state.wet=clamp(state.wet+dt*(marsh?3.7:lit?-2.7:indoors?-1.4:-.035),0,100);
  state.sinking=clamp(state.sinking+dt*(marsh?1.65:-10),0,100);
  state.warmth=clamp(state.warmth+dt*(lit?1.7:indoors?.84:(-.13-state.wet*.0045)/armour[state.coat||'jacket'].warm),0,100);
  state.food=clamp(state.food-dt*.013,0,100);
  if(state.warmth<=0 || state.food<=0 || state.sinking>92)state.hp=Math.max(0,state.hp-dt*(state.sinking>92?2:1));
  state.clock+=dt;
  return safe;
}
function actionAt(){
  const nearby=fieldAction();if(nearby)return nearby;
  if(state.room>=0){
    const i=state.room,b=winterMap.buildings[i],level=state.floor;
    if(b[0]==='flat'){
      for(const [up,allowed] of [[true,level<5],[false,level>1]]){
        if(allowed&&nearPoint(stair(b,up),.57))return {name:up?'Подняться на '+(level+1)+' этаж':'Спуститься на '+(level-1)+' этаж',do(){
          state.floor+=up?1:-1;[player.x,player.y]=stair(b,!up);
        }};
      }
    }
    if(i===stationIndex){
      const portal=stationPortals.find(p=>nearPoint(p.room,.61));
      if(portal)return {name:'Выйти · '+portal.side,do(){[player.x,player.y]=portal.world;state.room=-1;}};
    }
    if(i!==stationIndex&&level===1&&nearPoint(door(b,false),.7))return {name:'Выйти на улицу',do(){
      [player.x,player.y]=door(b,true);state.room=-1;
    }};
    const furniture=roomFurniture(b);
    if(nearPoint(furniture.box,.64))return {name:'Открыть шкаф',do:()=>loot('room-'+i+'-'+level)};
    if(shelters.has(b[0])&&nearPoint(furniture.bed,.73))return {name:'Отдохнуть',do:restMenu};
    return null;
  }
  const portal=stationPortals.find(p=>sameRailSide(player.y,p.world[1])&&nearPoint(p.world,.74)&&
    (p!==stationPortals[1]||Math.abs(player.x-subway.x)<subway.width/2-.075&&player.y>subway.y-.18));
  if(portal)return {name:'Войти на станцию',do(){state.room=stationIndex;state.floor=1;[player.x,player.y]=portal.room;}};
  for(let i=0;i<winterMap.buildings.length;i++){
    if(i===stationIndex)continue;
    const b=winterMap.buildings[i];if(accessibleBuilding(b)&&nearPoint(door(b,true),.73))
      return {name:'Войти · '+roomPlace(i,1).replace(' · этаж 1',''),do(){
        state.room=i;state.floor=1;[player.x,player.y]=door(b,false);
      }};
  }
  const npc=people.find(n=>actorLife(n).hp>0 && nearPoint([n.x,n.y],.85));
  if(npc&&!npc.enemy&&!actorLife(npc).angry)return {name:'Поговорить · '+npc.name,do:()=>greet(npc)};
  const body=people.find(n=>actorLife(n).hp<=0&&state.clock-actorLife(n).died<1440&&nearPoint([n.x,n.y],.7));
  if(body)return {name:'Обыскать',do:()=>remains(body)};
  const f=fireIndex(1.1);
  if(f>=0)return {name:state.fires[f]?'Сесть у огня':'Разжечь костёр',do:()=>{if(state.fires[f])restMenu();else {state.fires[f]=true;notice('Костёр разгорелся');}}};
  if(nearPoint(winterMap.westExit,1.6))return {name:'Западный путь',do:()=>notice('За станцией путь пока закрыт')};
  return null;
}
function roomFurniture(b){
  return {box:worldPoint(b,-b[3]/2+.39,-b[4]/2+.35),bed:worldPoint(b,b[3]/2-.65,-b[4]/2+.35)};
}
function panel(title,content){
  modal.querySelector('h2').textContent=title;const box=modal.querySelector('section');box.replaceChildren();content(box);
  if(!modal.open)modal.showModal();releaseStick();keys.clear();
}
function line(box,text){const p=document.createElement('p');p.textContent=text;box.append(p);}
function btn(box,text,fn,disabled=false){const el=document.createElement('button');el.textContent=text;el.onclick=fn;el.disabled=disabled;box.append(el);return el;}
function restMenu(){
  panel('Отдых',box=>{
    line(box,'В тепле одежда высохнет, силы восстановятся. За каждый час уйдёт немного еды.');
    for(const hours of [1,3,6])btn(box,hours+' ч',()=>{state.clock+=hours*60;state.stamina=state.warmth=100;state.wet=state.sinking=0;
      state.food=Math.max(0,state.food-hours*2.4);state.hp=Math.min(100,state.hp+hours*9);modal.close();saveSlot('auto');});
    if(state.held==='guitar'&&fireIndex()>=0)for(const [name,freq] of [['Северный ветер',146.83],['Дальний поезд',196]])btn(box,name,()=>tune(freq));
  });
}
function give(id,q=1){state.inventory[id]=(state.inventory[id]||0)+q;}
function loot(id){
  panel('Содержимое',box=>{
    if(state.searched[id]){line(box,'Пусто');return;}
    const r=randomStream([...id].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),85));
    const item=id.startsWith('body-')?'a9':['bread','a9','bandage','cans','a12'][Math.floor(r()*5)];
    const q=Math.max(1,Math.round((backpack[item].name.startsWith('Патроны')?8:1)*DIFFICULTIES[state.difficulty].loot));
    btn(box,'Забрать · '+backpack[item].name+' × '+q,()=>{give(item,q);state.searched[id]=true;modal.close();notice('В рюкзаке · '+backpack[item].name+' × '+q);});
  });
}
function bag(){
  panel('Рюкзак',box=>{
    const list=Object.entries(state.inventory).filter(([,n])=>n>0);
    line(box,list.reduce((t,[k,n])=>t+(backpack[k]?.weight||0)*n,0).toFixed(1)+' кг · '+state.money+' ₽');
    for(const [k,n] of list){
      const item=backpack[k];if(!item)continue;
      const use=['bread','cans','medkit','bandage','energy','antirad','vodka'].includes(k),equip=armour[k]||WP[k]||['guitar','detector'].includes(k);
      btn(box,item.name+' × '+n,()=>{if(use){give(k,-1);if(k==='energy'){state.energyUntil=state.clock+60;state.stamina=Math.min(100,state.stamina+25);}
        else if(k==='antirad')state.radiation=Math.max(0,(state.radiation||0)-60);
        else if(k==='vodka'){state.radiation=Math.max(0,(state.radiation||0)-20);state.food=Math.max(0,state.food-8);state.dizzyUntil=state.clock+10;}
        else if(k==='bread'||k==='cans')state.food=Math.min(100,state.food+(k==='cans'?32:18));else state.hp=Math.min(100,state.hp+(k==='medkit'?50:15));}
        if(armour[k])state.coat=k;else if(equip)selectHand(k);bag();},!use&&!equip);
    }
  });
}
function selectHand(id){state.held=id;reloadTime=0;reloadWeapon='';}
function cycleHand(){
  const items=['hands','knife',...Object.keys(state.inventory).filter(k=>(WP[k]||['guitar','detector'].includes(k))&&state.inventory[k]>0)];
  selectHand(items[(items.indexOf(state.held)+1)%items.length]);
}
function menu(){
  panel('Меню',box=>{
    line(box,'WASD или стрелки — движение, Shift — бег, E — действие, M — карта, F — фонарь, R — перезарядка.');
    for(const slot of [1,2,3,'auto']){
      const s=readSlot(slot),row=document.createElement('p');box.append(row);
      if(slot!=='auto')btn(row,'Записать '+slot,()=>{if(saveSlot(slot))menu();},state.hp<=0);
      btn(row,(slot==='auto'?'Автосохранение':'Загрузить '+slot)+(s?' · '+clockText(s.clock):' · пусто'),()=>{restoreState(s);modal.close();},!s);
    }
    btn(box,'Управление и звук',fieldSettings);
    btn(box,soundEnabled?'Звук включён':'Звук выключен',()=>{soundEnabled=!soundEnabled;menu();});
    btn(box,'Новая игра',()=>panel('Новая игра · сложность',el=>{
      for(const [key,value] of Object.entries(DIFFICULTIES))btn(el,value.name,()=>{restoreState(newWinterState(key));modal.close();saveSlot('auto');});
    }));
  });
}
function clockText(minutes){const m=Math.floor(minutes)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
let ac;
function tone(f,duration=.10,delay=0,gain=.035,type='triangle'){
  if(!soundEnabled)return;
  try{ac??=new AudioContext();if(ac.state==='suspended')ac.resume().catch(()=>{});const o=ac.createOscillator(),a=ac.createGain(),t=ac.currentTime+delay;
    o.type=type;o.frequency.value=f;a.gain.setValueAtTime(.0001,t);a.gain.exponentialRampToValueAtTime(gain,t+.01);a.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(a);a.connect(ac.destination);o.start(t);o.stop(t+duration);
  }catch{}
}
function tune(base){[0,7,12,4,7,2,5,9,7,0].forEach((n,i)=>tone(base*2**(n/12),.65,i*.28));}
