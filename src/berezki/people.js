const winterPeople=[
  ['kmSeller','Аркадий',256.3,186.5,'торговец станции'],
  ['baseMedic','Лида',269.25,460.7,'медик'],['baseSmith','Матвей',276.4,460.8,'техник'],
  ['baseSeller','Гурий',274.6,463.9,'торговец сопротивления'],['baseChief','Роман',251.4,461.8,'глава сопротивления'],
  ['flatChief','Виктор',818.2,14.9,'старший корпуса'],['shoreSeller','Яков',391.4,101.8,'торговец посёлка'],
  ['shoreChief','Лука',403.8,101.9,'староста посёлка']
];
const winterOrders={
  kmSeller:['Подкладки для смены','lining',2,'Вещевой склад на военной базе',260],
  baseSeller:['Запас для караула','matches',5,'Брошенные рюкзаки вдоль дорог',98],
  baseChief:['Мех для разведчиков','wolfHide',2,'Лес за разрушенной базой',510],
  flatChief:['Чай для дежурных','tea',2,'Столы в заселённых домах',180],
  shoreSeller:['Связка на растопку','wood',1,'Заброшенные квартиры в Берёзках',90],
  shoreChief:['Оленьи рога','antler',1,'Лесные поляны вдали от посёлка',200]
};
const winterStaples=['medkit','bandage','bread','sausage','cans','tea','coffee','wood','matches','a9','a12'];
function winterStockIds(e){
  if(e.sid==='flatChief')return ['medkit','bandage','bread','sausage','cans','tea','coffee'];
  if(e.sid==='baseMedic')return ['medkit','bandage'];
  if(!['baseSeller','kmSeller','shoreSeller'].includes(e.sid))return [];
  return Object.values(S.flags.orders||{}).includes('done')?[...winterStaples,'w_obrez']:winterStaples;
}
function serviceStock(e){
  return winterStockIds(e).filter(id=>e.sid!=='flatChief'||e.inv[id]>0).map(id=>{
    const q=id==='matches'?5:ITEMS[id].ammo?10:1,cond=isGun(id)?vendorGun(e,id).cond:null;
    return {id,q,cond,c:e.sid==='flatChief'?e.inv[id]:99999,p:Math.max(1,Math.ceil(q*(ITEMS[id].price||1)*(cond==null?1:cond/100)))};
  });
}
function winterPeopleRestore(){
  for(const [sid,name,x,y,role] of winterPeople){
    if(S.dead[sid])continue;
    const e=mkHuman({sid,name,x,y,ang:Math.PI/2,wpn:'knife',fac:'loner',stay:1});
    e.service=role;e.sit=['flatChief','baseChief'].includes(sid)?1:0;e.home={x:e.x,y:e.y};
    e.inv=sid==='flatChief'?Object.assign({medkit:1,bandage:2,bread:3,sausage:2,cans:1,tea:1,coffee:1},S.flags.chiefStock):{};
    e.money=99999;e.storyMan=true;ents.push(e);
  }
}
function winterJobs(){
  return Object.entries(S.flags.orders||{}).map(([id,state])=>{
    const [title,item,q,place,reward]=winterOrders[id];
    return {id:'winter-'+id,n:title,title,st:state==='done'?'d':'a',d:place+' · '+ITEMS[item].n+' ×'+q+' · '+reward+' RU',desc:place+' · '+ITEMS[item].n+' ×'+q,who:winterPeople.find(p=>p[0]===id)[1]};
  });
}
function winterService(e){
  const id=e.sid,order=winterOrders[id],state=(S.flags.orders||={})[id];
  const group=id.startsWith('base')?'Сопротивление':'Выживальщики';
  dialog({ent:e,n:e.name,grp:group,att:e.service},[e.service+(order?' · '+order[0]:'')],()=>{
    const options=[];
    if(winterStockIds(e).length)options.push({t:'Торговать',fn:()=>openTrade(e)});
    if(id==='baseMedic'){
      const cost=Math.ceil((100-P.hp)*2);
      options.push({t:'Лечение · '+Math.ceil(P.hp)+' → 100 здоровья · '+cost+' RU',d:cost===0||S.money<cost,fn:()=>{
        if(S.money<cost)return;S.money-=cost;P.hp=100;S.bleed=0;closePanel();save(true);
      }});
    }
    if(id==='baseSmith'){
      const worn=gunsBelow(100);
      if(!worn.length)options.push({t:'Снаряжение исправно',d:true});
      for(const gun of worn){
        const cost=Math.ceil((100-gun.cond)/100*ITEMS[gun.id].price*.55);
        options.push({t:ITEMS[gun.id].n+' · '+Math.floor(gun.cond)+'% → 100% · '+cost+' RU',d:S.money<cost,fn:()=>{
          if(S.money<cost)return;S.money-=cost;repairCopies([gun],100);if(S.weapon===gun.id&&gun.index===0)P.jam=0;closePanel();save(true);
        }});
      }
    }
    if(order&&state!=='done'){
      const [title,item,q,place,reward]=order,details=ITEMS[item].n+' ×'+q+' · '+place+' · '+reward+' RU';
      options.push({t:(state==='active'?'Сдать: ':'Взять заказ: ')+details,d:state==='active'&&cnt(item)<q,fn:()=>{
        if(state==='active'){if(cnt(item)<q)return;take(item,q);S.money+=reward;S.flags.orders[id]='done';S.stats.q++;}
        else S.flags.orders[id]='active';
        bulletin(title+' · '+(state==='active'?'заказ выполнен':details));closePanel();save(true);
      }});
    }
    options.push({t:'До встречи',close:1});return options;
  },'dialog',e);
}
