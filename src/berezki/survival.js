// Expedition supplies and weather use the same game clock as the saved world.
const winterSupplies={
  tea:['Термос с чаем',65,.62,'Сытость +10%, тепло +30%.'],
  coffee:['Термос с кофе',90,.62,'Сытость +5%, тепло +20%, выносливость +30%.'],
  wood:['Стопка сухих дров',35,2.4,'Один костёр на минуту. Можно нести две стопки.'],
  matches:['Спички',4,.01,'Одна спичка на попытку. В новом коробке пять.'],
  lining:['Сухая меховая подкладка',85,.3,'Мех для утепления одежды.'],
  wolfHide:['Волчья шкура',170,1.4,'Трофей. Можно продать.'],
  deerHide:['Оленья шкура',155,1.6,'Трофей. Можно продать.'],
  antler:['Рог оленя',115,.7,'Трофей. Можно продать.']
};
function registerSurvival(){
  recordings.winterGust=[.76,'winterGust'];
  for(const [id,[n,price,w,d]] of Object.entries(winterSupplies))ITEMS[id]={n,price,w,d};
  Object.assign(FOOD,{bread:15,sausage:25,cans:40,tea:10,coffee:5});
  for(const id of Object.keys(FOOD))if(ITEMS[id]){ITEMS[id].heal=0;if(!winterSupplies[id])ITEMS[id].d='Сытость +'+FOOD[id]+'%.';}
  Object.assign(ITEMS.medkit,{heal:30,d:'Восстанавливает 30% здоровья.'});
  Object.assign(ITEMS.bandage,{heal:5,d:'Останавливает кровотечение и восстанавливает 5% здоровья.'});
}
function winterConsume(id){
  if(!['tea','coffee','medkit','bandage','bread','sausage','cans'].includes(id))return null;
  if(!has(id))return false;
  take(id,1);P.hp=Math.min(100,P.hp+(ITEMS[id].heal||0));S.food=Math.min(100,S.food+(FOOD[id]||0));
  if(id==='bandage')S.bleed=0;
  if(id==='tea'||id==='coffee')S.flags.warmth=Math.min(100,S.flags.warmth+(id==='tea'?30:20));
  if(id==='coffee')P.st=Math.min(100,P.st+30);
  play(FOOD[id]?'eat':'pick');return true;
}
function winterShelter(e){
  const room=winterFloor(e.x,e.y);
  if(!room)return null;
  // The open drive-through and the collapsed roof expose the interior below them.
  if(room.kind==='hangar'||(room.kind==='stores'&&e.x>(room.x+5)*T&&e.x<(room.x+9.5)*T&&e.y>(room.y+2)*T&&e.y<(room.y+5.5)*T))return null;
  return room;
}
function winterRoomWarm(room){
  if(!room||room.abandoned)return false;
  const stove=stoveIn(room);
  if(stove)return !!stoveBurning(stove);
  return room.block==='living'||room.kind==='barracks'||district.heaters.some(h=>winterFloor(h.x,h.y)===room);
}
const windVectors=[[0,1,'севера'],[-1,0,'востока'],[0,-1,'юга'],[1,0,'запада']];
// Use the movement graph itself: an entrance can have several usable landing tiles.
let refugeRevision=-1;
const refugeCells=new Map();
function stormRoute(e){
  const radius=e.r||11,origin=walkAnchor(e.x,e.y,radius);
  if(origin<0)return null;
  if(refugeRevision!==navRevision){
    refugeCells.clear();refugeRevision=navRevision;
    for(const r of district.levels.filter(r=>r.n===1&&r.kind!=='hangar')){
      for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){
        const cell=y*MW+x,at=tilePoint(x+.5,y+.5);
        if(nav[cell]&&winterShelter(at)&&clearFooting(at.x,at.y,11))refugeCells.set(cell,at);
      }
      const house=HOUSES.find(h=>h.x===r.x&&h.y===r.y);
      for(const [u,v] of house?.doors||[]){
        const inwardX=u===0?1:u===r.w-1?-1:0,inwardY=v===0?1:v===r.h-1?-1:0;
        const entry=tilePoint(r.x+u+.5+inwardX*.63,r.y+v+.5+inwardY*.63);
        if(!winterShelter(entry)||!clearFooting(entry.x,entry.y,11))continue;
        for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
          const x=r.x+u+dx,y=r.y+v+dy,cell=y*MW+x;
          if(!nav[cell])continue;
          const from=tilePoint(x+.5,y+.5);
          if(clearWalk(from.x,from.y,entry.x,entry.y,11))refugeCells.set(cell,entry);
        }
      }
    }
  }
  bfsPrev.fill(-1);bfsPrev[origin]=origin;bfsQ[0]=origin;
  let head=0,tail=1;
  while(head<tail){
    const cell=bfsQ[head++],x=cell%MW,y=Math.floor(cell/MW);
    if(refugeCells.has(cell)){
      const to=refugeCells.get(cell);
      let last=tilePoint(x+.5,y+.5),seconds=dE(last,to)/80;
      for(let c=cell;c!==origin;c=bfsPrev[c]){
        const prev=bfsPrev[c],step=tilePoint(prev%MW+.5,Math.floor(prev/MW)+.5);
        const snow=1-.77*forestDepth(step.x,step.y),slush=1-.55*marshDepth(step.x,step.y);
        seconds+=dE(step,last)/(105*snow*slush*(1-.23*reedDensity(step.x,step.y)));last=step;
      }
      seconds+=dE(e,last)/45;
      if(e===P&&weight()>carryLimit())seconds/=.55;
      if(e===P&&S.flags.warmth<=0)seconds/=.56;
      return {to,seconds};
    }
    for(let k=0;k<DIRS.length;k++){
      const next=navNeighbor(x,y,k,radius);
      if(next<0||bfsPrev[next]>=0)continue;
      bfsPrev[next]=cell;bfsQ[tail++]=next;
    }
  }
  return null;
}
const frontExposureLimit=2;
function stormStrength(s){
  if(!s||s.stage==='calm')return s?.release||0;
  if(s.stage==='front')return 1;
  const start=s.start??s.until-60;
  return .12+.72*clamp((S.min-start)/Math.max(1,s.until-start),0,1);
}
function winterStormTick(dt,sleeping=false){
  const f=S.flags,s=f.blizzard||={stage:'calm',until:S.min+ri(540,1080),dir:0,cover:0};
  if(s.stage==='calm'&&S.min>=s.until){
    const route=winterShelter(P)?{seconds:0}:stormRoute(P);
    if(!route){s.until=S.min+20;return;}
    s.dir=s.start==null?ri(0,3):(s.dir+ri(1,3))%4;s.start=S.min;s.exposure=0;s.stage='warning';s.until=S.min+Math.max(60,route.seconds*1.7+8);
    bulletin('Метель с '+windVectors[s.dir][2]+'. Укройтесь в здании до удара фронта.');play('beep');
    for(const e of ents)if(e.alive&&e!==P&&e.kind==='human'&&!winterShelter(e))e.stormRefuge=stormRoute(e)?.to;
  }else if(s.stage==='warning'&&S.min>=s.until){
    s.stage='front';s.until=S.min+30;play('winterGust');bulletin('Фронт метели. Оставайтесь в укрытии.');
  }else if(s.stage==='front'&&S.min>=s.until){
    s.stage='calm';s.release=1;s.exposure=0;s.until=S.min+ri(720,1800);bulletin('Метель стихла. Можно выходить.');
    for(const e of ents)delete e.stormRefuge;
  }
  const shelter=winterShelter(P),outside=!shelter;
  if(s.stage==='calm')s.release=Math.max(0,(s.release||0)-dt/7);
  if(s.stage==='front'){
    // Residents keep the existing front rules. The player has a short uninterrupted exposure window.
    for(const e of ents)if(e!==P&&e.alive&&!e.wildId&&!winterShelter(e))kill(e,'blizzard');
    s.exposure=outside?Math.min(frontExposureLimit,(s.exposure||0)+dt):0;
    if(s.exposure>=frontExposureLimit-1e-8&&P.alive)kill(P,'blizzard');
  }else s.exposure=0;
  const target=outside&&s.stage!=='calm'?(s.stage==='front'?1:.09+.64*stormStrength(s)):0;
  const delta=target-s.cover;
  const speed=delta>0?(s.stage==='front'?2.5:.052):winterRoomWarm(shelter)?1/12:1/18;
  s.cover+=Math.sign(delta)*Math.min(Math.abs(delta),speed*dt);
  if(!sleeping&&s.stage!=='calm'&&(!s.soundAt||S.min>=s.soundAt)){play('winterGust',undefined,undefined,s.stage==='front'?1:.65);s.soundAt=S.min+4;}
}
function winterWindMove(mx,my){
  const s=S.flags.blizzard;
  if(!s||s.stage==='calm'||winterShelter(P))return 0;
  const [x,y]=windVectors[s.dir];return mx*x+my*y;
}
let winterFrostArt;
function winterScreenEffects(){
  const threshold=thermalBalance.frostStarts;
  const s=S.flags.blizzard,cold=S.flags.warmth<=threshold?lerp(.06,1,1-S.flags.warmth/threshold):0,cover=s?.cover||0;
  if(s&&stormStrength(s)>0&&!winterShelter(P))drawBlowingSnow(s,stormStrength(s));
  if(cold){
    if(!winterFrostArt){
      const c=winterCanvas(640,360),g=c.getContext('2d'),rand=mulberry32(77301);
      // Four edge bands of this depth occupy the configured fraction of the screen.
      const band=(1-Math.sqrt(1-thermalBalance.maxFrostArea))/2;
      for(let i=0;i<3100;i++){
        const side=i%4,u=rand(),v=rand()**2*band,x=(side===0?v:side===1?1-v:u)*640,y=(side===2?v:side===3?1-v:u)*360;
        g.strokeStyle='rgba(222,235,240,'+(.25+.58*rand())+')';g.lineWidth=.4+rand();
        const a=rand()*6.28,l=2+rand()*10;beam(g,x,y,x+l*Math.cos(a),y+l*Math.sin(a),g.lineWidth,g.strokeStyle);
      }
      winterFrostArt=c;
    }
    ctx.save();const extent=cold,margin=(1-extent)*.09;
    ctx.globalAlpha=cold**.8;
    ctx.drawImage(winterFrostArt,-VW*margin,-VH*margin,VW*(1+2*margin),VH*(1+2*margin));ctx.restore();
  }
  if(cover)stormGlass(cover);
}
let warmthBar;
function winterStatus(){
  if(!warmthBar){
    warmthBar=H.fd.closest('.zh-bar').cloneNode(true);warmthBar.classList.replace('fd','warmth');warmthBar.title='Тепло';
    warmthBar.setAttribute('role','meter');warmthBar.setAttribute('aria-label','Запас тепла');
    warmthBar.setAttribute('aria-valuemin','0');warmthBar.setAttribute('aria-valuemax','100');
    warmthBar.style.setProperty('--frost-mark',thermalBalance.frostStarts+'%');
    warmthBar.querySelector('svg').innerHTML='<path d="M9 4a3 3 0 0 1 6 0v9a5.3 5.3 0 1 1-6 0z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 8h2v7.4a2.8 2.8 0 1 1-2 0z" fill="currentColor"/>';
    warmthBar.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));H.fd.closest('.zh-bar').before(warmthBar);
  }
  const w=S.flags.warmth,bar=warmthBar.querySelector('i');bar.style.width=w+'%';
  const tint=Math.round(clamp(w,0,100)*4)/4+'%';
  if(warmthBar.style.getPropertyValue('--heat-tint')!==tint)warmthBar.style.setProperty('--heat-tint',tint);
  warmthBar.querySelector('b').textContent=Math.round(w);warmthBar.setAttribute('aria-valuenow',Math.round(w));
}
function winterExert(dt,moving,sprint,attempt,depth){
  const deep=depth>.35;
  if(sprint||attempt&&moving&&deep&&!P.winded){
    P.st=Math.max(0,P.st-dt*21*exertion(weight())*(1+1.9*depth));if(P.st===0)P.winded=true;
    P.heavyBreath=3.5;
  }else{
    P.st=Math.min(100,P.st+dt*(moving?(deep?0:7):17)*(S.food>0?1:.32));
    P.heavyBreath=Math.max(0,(P.heavyBreath||0)-dt);
  }
  if(P.winded&&P.st>=20)P.winded=false;
  if(P.heavyBreath>0 && S.min>=(P.nextBreath||0)){play('breath',P.x,P.y,.52);P.nextBreath=S.min+1.25;}
}
