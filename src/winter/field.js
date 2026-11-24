// Static resources are placed off the paths and on the same side of the railway as their approach.
Object.assign(backpack,{
  grenade:{name:'Граната',price:350,weight:.6},detector:{name:'Поисковый приёмник',price:500,weight:.25},
  coil:{name:'Катушка связи',price:380,weight:.3},pelt:{name:'Шкура',price:180,weight:.6},
  sight:{name:'Прицельный модуль',price:870,weight:.25}
});
people.push(...[
  {id:'workshop',name:'Механик',tech:true,x:94.8,y:53},
  {id:'dog1',name:'Одичавшая собака',animal:true,enemy:true,x:26,y:65.8},
  {id:'dog2',name:'Одичавшая собака',animal:true,enemy:true,x:26.7,y:66.1},
  {id:'boar',name:'Кабан',animal:true,enemy:true,x:48,y:72}
].map(n=>({...n,home:[n.x,n.y]})));
const caches=[[40.5,68.6],[109.2,24.6],[57,94.8]];
let grenades=[],jump=0,dragId=null,noiseAt=null,beep=0;
function fieldReset(){grenades=[];jump=0;dragId=null;noiseAt=null;aim.active=aim.fire=false;}
function fieldAction(){
  if(state.room===flatIndex&&state.floor===1&&nearPoint(worldPoint(winterMap.buildings[flatIndex],-2.8,0),.7))
    return {name:'Личный ящик',do:storage};
  if(state.room>=0)return null;
  if(dragId)return {name:'Положить тело',do:()=>{dragId=null;}};
  const found=caches.findIndex(p=>nearPoint(p,.62)&&!state.searched['cache'+caches.indexOf(p)]);
  if(found>=0)return {name:'Осмотреть тайник',do:()=>{state.searched['cache'+found]=true;give('coil');notice('Найдена катушка связи');}};
  return null;
}
function storage(){
  panel('Личный ящик · Берёзки',box=>{
    state.storage??={};
    for(const [k,n] of Object.entries(state.inventory)){
      if(n<=0||k===(state.coat||'jacket')||k===state.held)continue;
      btn(box,'Оставить · '+backpack[k].name+' × '+n,()=>{give(k,-n);state.storage[k]=(state.storage[k]||0)+n;storage();});
    }
    for(const [k,n] of Object.entries(state.storage)){
      if(n>0)btn(box,'Забрать · '+backpack[k].name+' × '+n,()=>{give(k,n);delete state.storage[k];storage();});
    }
    if(!Object.values(state.storage).some(n=>n>0))line(box,'В ящике пока пусто.');
  });
}
function workshop(){
  panel('Мастерская',box=>{
    line(box,'Ремонт и установка модулей · '+state.money+' ₽');
    for(const [id,n] of Object.entries(state.inventory)){
      if(!n||!WP[id]?.ammo)continue;
      const wear=state.wear?.[id]??100,price=Math.ceil((100-wear)*2*DIFFICULTIES[state.difficulty].buy);
      btn(box,WP[id].n+' · '+Math.round(wear)+'% · ремонт '+price+' ₽',()=>{
        state.money-=price;(state.wear??={})[id]=100;workshop();
      },price===0||state.money<price);
      if(WP[id].auto&&!state.modules?.[id])btn(box,'Установить модуль · '+WP[id].n,()=>{give('sight',-1);(state.modules??={})[id]=1;workshop();},!state.inventory.sight);
    }
  });
}
function remains(n){
  const life=actorLife(n);
  panel(n.name,box=>{
    btn(box,'Обыскать',()=>loot('body-'+n.id),n.animal||state.searched['body-'+n.id]);
    if(n.animal)btn(box,'Снять шкуру ножом',()=>{life.carved=true;give('pelt');effect('carve');modal.close();},life.carved||state.held!=='knife');
    btn(box,'Тащить тело',()=>{dragId=n.id;modal.close();});
  });
}
function fieldStep(dt){
  jump=Math.max(0,jump-dt);beep-=dt;
  if(state.held==='detector'&&state.room<0&&beep<=0){
    let distance=Infinity;caches.forEach((p,i)=>{if(!state.searched['cache'+i])distance=Math.min(distance,Math.hypot(player.x-p[0],player.y-p[1]));});
    if(distance<4){tone(620,.05,0,.013);beep=.18+distance*.25;}
  }
  if(dragId){
    const n=people.find(n=>n.id===dragId),life=actorLife(n);
    const x=player.x-Math.cos(player.a)*.36,y=player.y-Math.sin(player.a)*.36,f=1-Math.exp(-dt*7);
    if(state.room>=0||!sameRailSide(life.y,y)||!outsideFree(x,y))dragId=null;
    else{life.x+=(x-life.x)*f;life.y+=(y-life.y)*f;}
  }
  for(const n of people){
    const life=actorLife(n);if(n.animal&&life.hp<=0&&state.clock-life.died>2880&&state.room<0&&!nearPoint(n.home,8)){
      state.actors[n.id]={hp:100,x:n.home[0],y:n.home[1],angry:false};
    }
  }
  for(const bomb of grenades){
    if((bomb.t-=dt)>0||bomb.spent)continue;bomb.spent=true;
    if(bomb.room===state.room&&Math.hypot(bomb.x-player.x,bomb.y-player.y)<1.2)state.hp=Math.max(0,state.hp-46);
    if(bomb.room<0)for(const n of people){
      const life=actorLife(n),dx=life.x-bomb.x,dy=life.y-bomb.y,d=Math.hypot(dx,dy);
      if(life.hp<=0||d>2.6||wallDistance(bomb.x,bomb.y,Math.atan2(dy,dx),d)<d)continue;
      life.hp=Math.max(0,life.hp-110*(1-d/3.5));life.angry=true;if(life.hp<=0)life.died=state.clock;
    }
    effect('shotgun',.32);
  }
  grenades=grenades.filter(b=>!b.spent);
}
function throwGrenade(){
  if(!state.inventory.grenade||cooldown>0)return;
  const d=Math.max(.1,wallDistance(player.x,player.y,player.a,2.9)-.12);
  grenades.push({x:player.x+Math.cos(player.a)*d,y:player.y+Math.sin(player.a)*d,room:state.room,t:1.5});
  give('grenade',-1);cooldown=1;if(!state.inventory.grenade)selectHand('hands');
}
function fieldRender(v){
  if(wide)return;
  if(state.room===flatIndex&&state.floor===1){
    const [x,y]=screen(...worldPoint(winterMap.buildings[flatIndex],-2.8,0),v);
    sheetObject(g,4,x-v.z*.25,y-v.z*.20,.50*v.z,.40*v.z);
  }
  if(state.room<0){
    for(const n of people.filter(n=>n.animal)){
      const life=actorLife(n);if(life.hp<=0)continue;
      const [x,y]=screen(life.x,life.y,v),s=v.z*(n.id==='boar'?1.23:1);
      g.save();g.translate(x,y);g.rotate(Math.atan2(player.y-life.y,player.x-life.x));g.scale(s,s);
      ellipse(g,0,0,.21,.104,'#696255');ellipse(g,.18,0,.091,.075,'#5f584c');
      stroke(g,[[-.19,0],[-.26,-.07],[-.31,-.06]],'#6f6656',.045);g.restore();
    }
    for(const [i,p] of caches.entries()){
      if(state.searched['cache'+i])continue;
      const [x,y]=screen(...p,v);g.fillStyle='#7c8177';g.fillRect(x-v.z*.16,y-v.z*.1,v.z*.32,v.z*.2);
    }
  }
  if(aim.active&&state.modules?.[state.held]){
    const d=wallDistance(player.x,player.y,player.a,WP[state.held].range/64);
    g.setLineDash([4,7]);stroke(g,[screen(player.x,player.y,v),screen(player.x+Math.cos(player.a)*d,player.y+Math.sin(player.a)*d,v)],aim.fire?'#bf6553':'#eee9d8',1);g.setLineDash([]);
  }
  for(const b of grenades)if(b.room===state.room){
    const [x,y]=screen(b.x,b.y,v);ellipse(g,x,y,.065*v.z,.09*v.z,'#504c38');
  }
}
function jumpNow(){if(!jump&&state.stamina>=8&&!isMarsh()&&state.hp>0){jump=.55;state.stamina-=8;}}
