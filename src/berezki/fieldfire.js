let layingFire=null;
const coldAshMinutes=30;
function clearColdFires(){
  const fires=S.flags.campfires;
  if(!fires)return;
  for(let i=fires.length-1;i>=0;i--){
    const f=fires[i];
    if(f.unburnt || f.embers>S.min)continue;
    const cooled=f.embers || (f.extinguishedAt??=S.min);
    if(S.min<cooled+coldAshMinutes)continue;
    fires.splice(i,1);
    const j=WORLD_FIRES.indexOf(f);
    if(j>=0)WORLD_FIRES.splice(j,1);
  }
}
function restoreFieldFires(){
  layingFire=null;
  for(let i=WORLD_FIRES.length-1;i>=0;i--)if(WORLD_FIRES[i].field)WORLD_FIRES.splice(i,1);
  clearColdFires();
  for(const f of S.flags.campfires||[])WORLD_FIRES.push(f);
}
function fireSpot(){
  return {x:P.x+Math.cos(P.ang)*35,y:P.y+Math.sin(P.ang)*35};
}
function fireSiteProblem(p){
  if(!cnt('wood'))return 'Нужна стопка сухих дров.';
  if(winterFloor(p.x,p.y)||stationUnderpass(P)||S.flags.stationDeck||S.flags.onLookout)return 'Нужно открытое место на земле.';
  if(forestDepth(p.x,p.y)>.35)return 'Здесь слишком глубокий снег.';
  if(swampAt(p.x,p.y)||basinRadius(p.x/T,p.y/T,lakeShape)<1)return 'На льду и в болотной жиже костёр не развести.';
  if(!clearFooting(p.x,p.y,16)||!los(P.x,P.y,p.x,p.y)||WORLD_FIRES.some(f=>dE(f,p)<43)||ents.some(e=>e!==P&&e.alive&&dE(e,p)<22))return 'Площадка занята.';
  return '';
}
function chooseFireSite(){
  if(layingFire?.placing){layingFire=null;closePanel();msg('Выбор места отменён.');return;}
  closePanel();layingFire={placing:true};msg('Повернись к ровному месту и подтверди действие.');
}
function strikeFire(f){
  if(!cnt('matches')){msg('Спички закончились.','bad');return;}
  layingFire={f,x:P.x,y:P.y,t:0,struck:false};P.crouch=1;
}
function tickFieldFire(dt){
  clearColdFires();
  if(!layingFire||layingFire.placing)return;
  const a=layingFire;
  if(!P.alive||Math.hypot(IN.moveX,IN.moveY)>.08||dE(P,a)>2){layingFire=null;msg('Розжиг прерван.');return;}
  a.t+=dt;
  if(!a.struck&&a.t>=1.5){
    if(!cnt('matches')){layingFire=null;return;}
    take('matches',1);a.struck=true;play('click');
  }
  if(a.t>=3){
    if(Math.random()<.8){a.f.unburnt=false;a.f.flame=S.min+60;a.f.embers=a.f.flame+30;a.f.fuelSpan=60;play('pick');}
    else msg('Спичка погасла. Дрова остались на месте.');
    layingFire=null;save(true);
  }
}
function fireChoices(cand){
  if(layingFire?.placing){
    const problem=fireSiteProblem(fireSpot());cand(-510,{k:'fireSite',label:problem||'Уложить дрова'});return;
  }
  if(layingFire){cand(-510,{k:'fireCancel',label:'Прервать розжиг'});return;}
  for(const f of S.flags.campfires||[]){
    if(!canReachFire(f))continue;
    cand(dE(P,f)-15,{k:'fieldFire',f,label:f.unburnt?'Дрова · действия':'Костёр · действия'});
  }
}
function canReachFire(f){
  return dE(P,f)<=58 && los(P.x,P.y,f.x,f.y) && !stationUnderpass(P) && !S.flags.stationDeck && !S.flags.onLookout;
}
function openFireActions(f){
  openPanel('fieldFire',f.unburnt?'Стопка дров':'Костёр');
  panel.fire=f;refresh();
}
function drawFireActions(){
  const f=panel.fire;
  function action(label,fn,disabled=false){
    pbody.appendChild(btn('chip',label,()=>{
      if(!canReachFire(f)||!S.flags.campfires.includes(f)){closePanel();return;}
      closePanel();fn();save(true);
    },disabled));
  }
  if(f.embers>S.min){
    action('Подбросить дрова',()=>{
      take('wood',1);f.flame=Math.max(S.min,f.flame)+60;
      f.fuelSpan=f.flame-S.min;f.embers=f.flame+30;
    },!cnt('wood'));
    action('Засыпать снегом',()=>{f.flame=f.embers=0;f.unburnt=false;f.extinguishedAt=S.min;});
  }else if(f.unburnt){
    action(cnt('matches')?'Разжечь · 1 спичка':'Разжечь · нет спичек',()=>strikeFire(f),!cnt('matches'));
    action('Забрать дрова',()=>{
      const error=receiveError('wood',1);
      if(error){msg(error,'bad');return;}
      addPacked('wood',1);
      S.flags.campfires.splice(S.flags.campfires.indexOf(f),1);
      WORLD_FIRES.splice(WORLD_FIRES.indexOf(f),1);
    });
  }else action('Уложить дрова',()=>{take('wood',1);f.unburnt=true;},!cnt('wood'));
}
function fireAction(n){
  if(n.k==='fireCancel'){layingFire=null;return true;}
  if(n.k==='fireSite'){
    const p=fireSpot(),err=fireSiteProblem(p);
    if(err){msg(err,'bad');layingFire=null;return true;}
    take('wood',1);const f={...p,field:true,unburnt:true,flame:0,embers:0};
    (S.flags.campfires||=[]).push(f);WORLD_FIRES.push(f);layingFire=null;save(true);return true;
  }
  if(n.k!=='fieldFire')return false;
  openFireActions(n.f);
  return true;
}
function fieldFireOverlay(inView){
  for(const f of S.flags.campfires||[]){
    if(!inView(f.x,f.y,70))continue;
    if(f.flame>S.min){if(dE(P,f)<135){
      const fraction=clamp((f.flame-S.min)/(f.fuelSpan||60),0,1);
      ctx.save();ctx.fillStyle='#312d28bd';ctx.fillRect(f.x-12,f.y-20,24,2.6);
      ctx.fillStyle='#c39b61';ctx.fillRect(f.x-11.5,f.y-19.5,23*fraction,1.6);ctx.restore();
    }}else if(f.embers>S.min)shoreEllipse(ctx,f.x,f.y,6,3,'#ae5229bb');
  }
  if(layingFire?.placing){const p=fireSpot();ctx.save();ctx.setLineDash([3,3]);ctx.strokeStyle=fireSiteProblem(p)?'#b3877b':'#e5dabc';ctx.beginPath();ctx.ellipse(p.x,p.y,14,10,0,0,7);ctx.stroke();ctx.restore();}
}
