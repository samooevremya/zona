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
  if(stoveIn(room))return !!stoveBurning(stoveIn(room));
  return !!room&&(room.block==='living'||room.kind==='barracks'||district.heaters.some(h=>winterFloor(h.x,h.y)===room)||stoveBurning(stoveIn(room)));
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
function winterStormTick(dt){
  const f=S.flags,s=f.blizzard||={stage:'calm',until:S.min+ri(540,1080),dir:0,cover:0};
  if(s.stage==='calm'&&S.min>=s.until){
    const route=winterShelter(P)?{seconds:0}:stormRoute(P);
    if(!route){s.until=S.min+20;return;}
    s.dir=ri(0,3);s.stage='warning';s.until=S.min+Math.max(60,route.seconds*1.7+8);
    bulletin('Метель с '+windVectors[s.dir][2]+'. Укройтесь в здании до удара фронта.');play('beep');
    for(const e of ents)if(e.alive&&e!==P&&e.kind==='human'&&!winterShelter(e))e.stormRefuge=stormRoute(e)?.to;
  }else if(s.stage==='warning'&&S.min>=s.until){
    s.stage='front';s.until=S.min+30;play('winterGust');bulletin('Фронт метели. Оставайтесь в укрытии.');
  }else if(s.stage==='front'&&S.min>=s.until){
    s.stage='calm';s.until=S.min+ri(720,1800);bulletin('Метель стихла. Можно выходить.');
    for(const e of ents)delete e.stormRefuge;
  }
  if(s.stage==='front')for(const e of ents)if(e.alive&&!winterShelter(e))kill(e,'blizzard');
  const outside=!winterShelter(P);
  s.cover=clamp(s.cover+dt*(outside&&s.stage!=='calm'?.026:winterRoomWarm(winterShelter(P))?-.085:-.055),0,1);
  if(s.stage!=='calm'&&(!s.soundAt||S.min>=s.soundAt)){play('winterGust',undefined,undefined,s.stage==='front'?1:.65);s.soundAt=S.min+4;}
}
function winterWindMove(mx,my){
  const s=S.flags.blizzard;
  if(!s||s.stage==='calm'||winterShelter(P))return 0;
  const [x,y]=windVectors[s.dir];return mx*x+my*y;
}
let winterFrostArt,winterSnowArt;
function stormSnowArt(){
  if(winterSnowArt)return winterSnowArt;
  const c=winterCanvas(640,360),g=c.getContext('2d'),random=mulberry32(92833);
  for(let i=0;i<2100;i++){
    const side=i%4,u=random(),depth=random()**2*(.05+.085*Math.sin(17*u+side)**2);
    const x=(side===0?depth:side===1?1-depth:u)*c.width,y=(side===2?depth:side===3?1-depth:u)*c.height;
    const radius=.6+random()**2*6,fleck=g.createRadialGradient(x,y,0,x,y,radius);
    fleck.addColorStop(0,'rgba(224,231,229,.58)');fleck.addColorStop(1,'rgba(203,218,224,0)');
    g.fillStyle=fleck;g.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  winterSnowArt=c;return c;
}
function winterScreenEffects(){
  const s=S.flags.blizzard,cold=clamp((40-S.flags.warmth)/40,0,1),cover=s?.cover||0;
  if(cold||cover){
    if(!winterFrostArt){
      const c=winterCanvas(640,360),g=c.getContext('2d'),rand=mulberry32(77301);
      for(let i=0;i<3100;i++){
        const side=i%4,u=rand(),v=rand()**2*.097,x=(side===0?v:side===1?1-v:u)*640,y=(side===2?v:side===3?1-v:u)*360;
        g.strokeStyle='rgba(222,235,240,'+(.25+.58*rand())+')';g.lineWidth=.4+rand();
        const a=rand()*6.28,l=2+rand()*10;beam(g,x,y,x+l*Math.cos(a),y+l*Math.sin(a),g.lineWidth,g.strokeStyle);
      }
      winterFrostArt=c;
    }
    ctx.save();const extent=Math.max(cold,cover),margin=(1-extent)*.09;
    ctx.globalAlpha=Math.max(cold**.8,cover*.85);
    ctx.drawImage(winterFrostArt,-VW*margin,-VH*margin,VW*(1+2*margin),VH*(1+2*margin));ctx.restore();
  }
  if(cover){
    ctx.save();ctx.globalAlpha=cover;
    ctx.drawImage(stormSnowArt(),0,0,VW,VH);ctx.restore();
  }
  if(!s||s.stage==='calm'||winterShelter(P))return;
  const [wx,wy]=windVectors[s.dir],front=s.stage==='front',fade=front?.85:.12+cover*.32;
  ctx.save();ctx.fillStyle='rgba(198,209,215,'+fade+')';ctx.fillRect(0,0,VW,VH);
  const sky=ctx.createLinearGradient(VW*(1-wx)/2,VH*(1-wy)/2,VW*(1+wx)/2,VH*(1+wy)/2);
  sky.addColorStop(0,'#495866a6');sky.addColorStop(1,'#bfcdd100');ctx.fillStyle=sky;ctx.fillRect(0,0,VW,VH);
  for(let i=0;i<(front?180:100);i++){
    const t=environmentTime*(110+i%53),x=((i*173+wx*t)%(VW+24)+VW+24)%(VW+24)-12,y=((i*97+(wy+.22)*t)%(VH+24)+VH+24)%(VH+24)-12;
    beam(ctx,x,y,x+wx*9,y+wy*9+2,1+i%3,'#dde5e9aa');
  }ctx.restore();
}
let warmthBar;
function winterStatus(){
  if(!warmthBar){
    warmthBar=H.fd.closest('.zh-bar').cloneNode(true);warmthBar.classList.remove('fd');warmthBar.title='Тепло';
    warmthBar.querySelector('svg').innerHTML='<path d="M9 4a3 3 0 0 1 6 0v10a5 5 0 1 1-6 0z"/>';
    warmthBar.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));H.fd.closest('.zh-bar').before(warmthBar);
  }
  const w=S.flags.warmth,bar=warmthBar.querySelector('i');bar.style.width=w+'%';
  bar.style.background='color-mix(in srgb, #de9049 '+w+'%, #62a6de)';warmthBar.querySelector('b').textContent=Math.round(w);
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
