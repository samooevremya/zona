const salvageGoods={
  wire:{n:'Моток медной проволоки',price:65,w:.17,d:'Мягкая проволока для ремонта. Можно продать.'},
  candle:{n:'Огарки свечей',price:30,w:.08,d:'Завёрнуты в промасленную бумагу. Можно продать.'},
  buckle:{n:'Латунная пряжка',price:42,w:.09,d:'Старый ремень истлел, а латунь уцелела.'}
};
function makeWinterSalvage(){
  Object.assign(ITEMS,salvageGoods);
  for(const surface of ['Powder','Packed','Ice','Slush','Board','Concrete']){
    recordings['winter'+surface]=[.34,'winter'+surface+'1','winter'+surface+'2','winter'+surface+'3'];
  }
  recordings.frostCrack=[.14,'winterCreak'];
  for(const [x,y,key,loot] of [
    [524,384,'landing',{candle:1,bandage:1}],[484,130,'nets',{wire:2}],
    [337,233,'platform',{buckle:1}],[158,190,'depot',{wire:1,bread:1}],
    [81,126,'tower',{buckle:1,cans:1}],[205,441,'pump',{wire:2}],
    [253,433,'path',{candle:1}],[114,546,'hut',{bandage:1,candle:1}],
    [339,592,'workshop',{wire:1,buckle:1}],[432,162,'forest',{candle:1,bread:1}],
    [326,492,'road',{buckle:1}],[142,352,'marsh',{wire:1}]]){
    if(tAt(x,y)===TR)setT(x,y,GR);
    supplyBox((x+.5)*T,(y+.5)*T,'winter-'+key,loot);
  }
  interiorObject('fishingHole',iceHole.x,iceHole.y,22,16);
}
// A seeded weather calendar works across sleep and saves, even after several elapsed days.
function snowWindow(block){
  const seed=S.flags.snowSeed||1;
  const start=block*320+37+hash2(block+seed,87)*180;
  return {start,length:25+hash2(block+seed,91)*42};
}
function snowDepth(t){
  const block=Math.floor(t/320),storm=snowWindow(block);
  return block+clamp((t-storm.start)/storm.length,0,1);
}
function snowing(t){const s=snowWindow(Math.floor(t/320));return t>=s.start && t<s.start+s.length;}
function traceAlpha(t){return clamp(1-(snowDepth(S.min)-snowDepth(t))*2.15,0,1);}
function recordTrace(mark){
  const recent=S.flags.snowMarks||=[];
  recent.push(mark);
  // Compress old, overlapping impressions before dropping distant history.
  if(recent.length>8000){
    const cells=new Set();
    S.flags.snowMarks=recent.filter(p=>traceAlpha(p.t)>.01).reverse().filter(p=>{
      const cell=Math.round(p.x/6)+','+Math.round(p.y/6)+','+p.type;
      if(cells.has(cell))return false;cells.add(cell);return true;
    }).slice(0,7500).reverse();
  }
}
function winterTracks(dt,room){
  const flags=S.flags;
  if(!flags.snowSeed)flags.snowSeed=ri(10,9999);
  if(S.min>=(flags.markSweep||0)){
    flags.snowMarks=(flags.snowMarks||[]).filter(p=>traceAlpha(p.t)>.005);
    flags.markSweep=S.min+30;
  }
  if(room || S.flags.stationDeck || P.jumpT){stepDistance=P.step;return;}
  if(P.step-stepDistance>18){
    stepDistance=P.step;const a=Math.atan2(IN.moveY,IN.moveX);
    winterFootSide=-winterFootSide;
    const blood=objs.some(b=>b.k==='body' && b.kind!=='sack' && traceAlpha(b.t??S.min)>.25 && dE(b.deathSpot||b,P)<14)
      || decals.some(d=>!d.burn && traceAlpha(d.t??S.min)>.25 && dE(d,P)<d.r+2)
      || (flags.snowMarks||[]).some(m=>m.type==='drag' && m.blood>.25 && dE(m,P)<8 && traceAlpha(m.t)>.25);
    flags.bloodySteps=blood?7:Math.max(0,(flags.bloodySteps||0)-1);
    recordTrace({x:P.x-Math.sin(a)*winterFootSide*4,y:P.y+Math.cos(a)*winterFootSide*4,a,t:S.min,type:'boot',blood:flags.bloodySteps/7});
  }
  if(draggedBody){
    const b=draggedBody;
    if(!b.trackAt)b.trackAt={x:b.x,y:b.y};
    const distance=dE(b,b.trackAt);
    if(distance>=7){
      b.trackDistance=(b.trackDistance||0)+distance;
      recordTrace({x:b.x,y:b.y,a:Math.atan2(b.y-b.trackAt.y,b.x-b.trackAt.x),t:S.min,type:'drag',blood:clamp(1-b.trackDistance/145,0,1)*.7});
      b.trackAt={x:b.x,y:b.y};
    }
  }
}
function renderWinterMarks(vx,vy,vw,vh){
  for(const m of S.flags.snowMarks||[]){
    if(m.x<vx-12||m.x>vx+vw+12||m.y<vy-12||m.y>vy+vh+12)continue;
    const alpha=traceAlpha(m.t);if(alpha<=0)continue;
    const drag=m.type==='drag';
    shoreEllipse(ctx,m.x,m.y,drag?8:4.6,drag?5:2.1,'rgba(66,82,97,'+(.25*alpha)+')',m.a);
    if(m.blood)shoreEllipse(ctx,m.x+.7,m.y,drag?5:4,drag?2.7:2,'rgba(104,38,37,'+(m.blood*.78*alpha)+')',m.a);
  }
}
function snowScreen(){
  if(winterFloor(P.x,P.y)||!snowing(S.min))return;
  const time=environmentTime;ctx.save();ctx.fillStyle='#e2e6e9';ctx.globalAlpha=.54;
  for(let i=1;i<95;i++){
    const x=(i*197+time*(13+i%7))%(VW+12),y=(i*127+time*(35+i%29))%(VH+8);
    ctx.fillRect(x,y,i%3?1.1:2,1.8);
  }
  ctx.restore();
}
function winterWitness(victim){
  for(const e of ents){
    if(!e.protectedResident || !e.alive || dE(e,victim)>315 || !seesActor(e,victim,true))continue;
    const guard=ents.filter(n=>n!==victim && n!==P && n.alive && !n.protectedResident && n.fac==='loner' && dE(n,e)<400).sort((a,b)=>dE(e,a)-dE(e,b))[0];
    const shelter=e.sid==='cook'?tilePoint(509.5,354.5):tilePoint(e.sid==='housekeeper'?503:483,e.sid==='housekeeper'?128:140);
    e.flight={until:S.min+16,guard:guard?.sid,shelter};e.sit=0;
    sayLine(e,guard?'На помощь!':'Скорее в дом!');
  }
}
function fleeWitness(e,dt){
  if(!e.flight || S.min>e.flight.until){e.flight=null;return false;}
  const guard=e.flight.guard && byS(e.flight.guard),target=guard?.alive?guard:e.flight.shelter;
  if(dE(e,target)>28)goTo(e,target.x,target.y,100,dt);
  else if(guard?.alive){rememberAttacker(guard);e.flight.guard=null;}
  else e.crouch=1;
  return true;
}
function winterSurface(x,y){
  const r=winterFloor(x,y);
  if(r)return r===fishingRoom||villageCabins.includes(r)||r.kind==='barracks'||(r.block && x<(r.x+16)*T && (y<(r.y+4.4)*T||y>(r.y+6.75)*T))?'winterBoard':'winterConcrete';
  if(swampAt(x,y))return 'winterSlush';
  if(basinRadius(x/T,y/T,lakeShape)<1)return 'winterIce';
  if(y>northFence && y<southFence || S.flags.stationDeck)return 'winterConcrete';
  for(const route of atlasRoutes)for(let i=1;i<route.length;i++){
    const [a,b]=route[i-1],[c,d]=route[i],u=x/T-a,v=y/T-b,dx=c-a,dy=d-b;
    const f=clamp((u*dx+v*dy)/(dx*dx+dy*dy||1),0,1);
    if(Math.hypot(u-f*dx,v-f*dy)<1.3)return 'winterPacked';
  }
  return 'winterPowder';
}

function winterStairLift(e){
  if(e===P && S.flags.stationDeck)return clamp(Math.min(e.y-footbridge.north,footbridge.south-e.y)/(2.5*T),0,1)*12;
  const r=winterFloor(e.x,e.y);if(!r?.block)return 0;
  const x=e.x/T-r.x-r.stairX,y=e.y/T-r.y-r.stairY;
  return Math.abs(x)<1.55 && y>=0 && y<=2.85?(1-y/2.85)*8:0;
}
function winterCoatTone(e){return e.winterTone || (e===P || e.sid==='mitya'?'slate':['cook','housekeeper','anya'].includes(e.sid)?'ochre':'ash');}
const winterDeadArt=new WeakMap();
function winterBodySprite(image,body){
  let variants=winterDeadArt.get(image);
  if(!variants){variants={};winterDeadArt.set(image,variants);}
  const tone=winterCoatTone(body);return variants[tone] ||= winterCloth(image,'body',tone);
}

function salvageIcon(id){
  const c=winterCanvas(64,54),g=c.getContext('2d');c.className='b1ic';
  g.translate(32,28);g.rotate(-.16);
  if(id==='wire'){
    for(let i=0;i<10;i++){g.strokeStyle=i%2?'#aa7151':'#734b39';g.lineWidth=2.3;g.beginPath();g.ellipse(i*.8-4,i*.35,17,11,.15,0,2*Math.PI);g.stroke();}
    beam(g,16,4,25,11,2,'#ab7956');
  }else if(id==='candle'){
    for(const [x,y,h] of [[-9,3,19],[6,8,27]]){
      const wax=g.createLinearGradient(x-5,0,x+5,0);wax.addColorStop(0,'#918574');wax.addColorStop(.45,'#e0d5b5');wax.addColorStop(1,'#ad9f82');
      g.fillStyle=wax;g.fillRect(x-5,y-h/2,10,h);shoreEllipse(g,x,y-h/2,5,2,'#d4c7ae',0);beam(g,x,y-h/2,x+1,y-h/2-4,1.5,'#504737');
    }
  }else{
    for(const [col,w] of [['#65523c',5],['#baa078',2.5]]){
      g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.roundRect(-17,-11,34,22,5);g.stroke();
    }
    beam(g,0,-10,0,10,3,'#9a805a');beam(g,0,1,15,-2,2,'#c0a97b');
  }
  return c;
}
