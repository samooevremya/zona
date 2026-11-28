let layingFire=null;
function restoreFieldFires(){
  layingFire=null;
  for(let i=WORLD_FIRES.length-1;i>=0;i--)if(WORLD_FIRES[i].field)WORLD_FIRES.splice(i,1);
  for(const f of S.flags.campfires||[])WORLD_FIRES.push(f);
}
function fireSpot(){
  return {x:P.x+Math.cos(P.ang)*35,y:P.y+Math.sin(P.ang)*35};
}
function fireSiteProblem(p){
  if(!cnt('matches'))return 'В рюкзаке нет спичек.';
  if(!cnt('wood'))return 'Нужна стопка сухих дров.';
  if(winterFloor(p.x,p.y)||stationUnderpass(P)||S.flags.stationDeck||S.flags.onLookout)return 'Нужно открытое место на земле.';
  if(forestDepth(p.x,p.y)>.35)return 'Здесь слишком глубокий снег.';
  if(swampAt(p.x,p.y)||basinRadius(p.x/T,p.y/T,lakeShape)<1)return 'На льду и в болотной жиже костёр не развести.';
  if(!clearFooting(p.x,p.y,16)||!los(P.x,P.y,p.x,p.y)||WORLD_FIRES.some(f=>dE(f,p)<43)||ents.some(e=>e!==P&&e.alive&&dE(e,p)<22))return 'Площадка занята.';
  return '';
}
function chooseFireSite(){
  if(layingFire?.placing){layingFire=null;closePanel();msg('Выбор места отменён.');return;}
  if(!cnt('matches')){msg('Для костра нужны спички.','bad');return;}
  closePanel();layingFire={placing:true};msg('Повернись к ровному месту и подтверди действие.');
}
function strikeFire(f){
  if(!cnt('matches')){msg('Спички закончились.','bad');return;}
  layingFire={f,x:P.x,y:P.y,t:0,struck:false};P.crouch=1;msg('Укладываешь дрова…');
}
function tickFieldFire(dt){
  if(!layingFire||layingFire.placing)return;
  const a=layingFire;
  if(!P.alive||Math.hypot(IN.moveX,IN.moveY)>.08||dE(P,a)>2){layingFire=null;msg('Розжиг прерван.');return;}
  a.t+=dt;
  if(!a.struck&&a.t>=1.5){
    if(!cnt('matches')){layingFire=null;return;}
    take('matches',1);a.struck=true;play('click');
  }
  if(a.t>=3){
    if(Math.random()<.8){a.f.unburnt=false;a.f.flame=S.min+60;a.f.embers=a.f.flame+30;play('pick');msg('Дрова занялись.');}
    else msg('Спичка погасла. Дрова остались на месте.');
    layingFire=null;save(true);
  }
}
function fireChoices(cand){
  if(layingFire?.placing){
    const problem=fireSiteProblem(fireSpot());cand(-510,{k:'fireSite',label:problem||'Уложить дрова и разжечь'});return;
  }
  if(layingFire){cand(-510,{k:'fireCancel',label:'Прервать розжиг'});return;}
  for(const f of S.flags.campfires||[]){
    if(dE(P,f)>58||!los(P.x,P.y,f.x,f.y))continue;
    cand(dE(P,f)-15,{k:'fieldFire',f,label:f.flame>S.min?'Костёр · '+Math.ceil(f.flame-S.min)+' с':f.embers>S.min?'Тлеющие угли':f.unburnt?'Попробовать снова · 1 спичка':'Холодное кострище'});
  }
}
function fireAction(n){
  if(n.k==='fireCancel'){layingFire=null;return true;}
  if(n.k==='fireSite'){
    const p=fireSpot(),err=fireSiteProblem(p);
    if(err){msg(err,'bad');layingFire=null;return true;}
    take('wood',1);const f={...p,field:true,unburnt:true,flame:0,embers:0};
    (S.flags.campfires||=[]).push(f);WORLD_FIRES.push(f);strikeFire(f);return true;
  }
  if(n.k!=='fieldFire')return false;
  const f=n.f,hot=f.embers>S.min;
  dialog({n:'Походный костёр',grp:'Привал'},[f.flame>S.min?'Пламени осталось на '+Math.ceil(f.flame-S.min)+' с.':hot?'В золе видны красные угли.':'Ветер стихает у самой земли.'],()=>[
    {t:hot?'Подбросить дрова':f.unburnt?'Попробовать снова · 1 спичка':'Разжечь · дрова и спичка',d:hot?!cnt('wood'):!cnt('matches')||!f.unburnt&&!cnt('wood'),fn:()=>{
      closePanel();if(hot){take('wood',1);f.flame=Math.max(f.flame,S.min)+60;f.embers=f.flame+30;}else{if(!f.unburnt){take('wood',1);f.unburnt=true;}strikeFire(f);}save(true);
    }},...(hot?[{t:'Засыпать снегом',fn:()=>{f.flame=f.embers=0;f.unburnt=false;closePanel();save(true);}}]:[]),{t:'Уйти',close:1}]);
  return true;
}
function fieldFireOverlay(inView){
  for(const f of S.flags.campfires||[]){
    if(!inView(f.x,f.y,70))continue;
    if(f.flame>S.min){if(dE(P,f)<135){
      ctx.save();ctx.font='10px sans-serif';ctx.textAlign='center';const t=Math.ceil(f.flame-S.min)+' с';ctx.fillStyle='#262720db';ctx.fillRect(f.x-17,f.y-29,34,14);ctx.fillStyle='#f2dbab';ctx.fillText(t,f.x,f.y-19);ctx.restore();
    }}else if(f.embers>S.min)shoreEllipse(ctx,f.x,f.y,6,3,'#ae5229bb');
  }
  if(layingFire?.placing){const p=fireSpot();ctx.save();ctx.setLineDash([3,3]);ctx.strokeStyle=fireSiteProblem(p)?'#b3877b':'#e5dabc';ctx.beginPath();ctx.ellipse(p.x,p.y,14,10,0,0,7);ctx.stroke();ctx.restore();}
}
