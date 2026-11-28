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
  recordings.winterReeds=[.39,'winterReeds1','winterReeds2'];
  for(const [id,gain] of [['loadShellOne',.57],['hitTimber',.55],['hitMasonry',.53],['hitSteel',.49],['hitSoil',.4]])recordings[id]=[gain,id];
  recordings.frostCrack=[.14,'winterCreak'];
  for(const [x,y,key,loot] of [
    [425,311,'landing',{candle:1,bandage:1}],[385,104,'nets',{wire:2}],
    [272,188,'platform',{buckle:1}],[127,146,'depot',{wire:1,bread:1}],
    [62.75,94.75,'tower',{buckle:1,cans:1}],[169,354,'pump',{wire:2}],
    [202.87,346,'path',{candle:1}],[109,440,'hut',{bandage:1,candle:1}],
    [274,480,'workshop',{wire:1,buckle:1}],[346.59,131.77,'forest',{candle:1,bread:1}],
    [261,391.45,'road',{buckle:1}],[119.64,279,'marsh',{wire:1}]]){
    if(tAt(Math.floor(x),Math.floor(y))===TR)setT(Math.floor(x),Math.floor(y),GR);
    const box=supplyBox((x+.5)*T,(y+.5)*T,'winter-'+key,loot);
    if(key==='tower')box.sprite='c1_crate';
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
  if(room || S.flags.onLookout || S.flags.stationDeck || P.jumpT){stepDistance=P.step;return;}
  if(P.step-stepDistance>18){
    stepDistance=P.step;const a=Math.atan2(IN.moveY,IN.moveX);
    winterFootSide=-winterFootSide;
    const blood=objs.some(b=>b.k==='body' && b.kind!=='sack' && traceAlpha(b.t??S.min)>.25 && dE(b.deathSpot||b,P)<14)
      || decals.some(d=>!d.burn && traceAlpha(d.t??S.min)>.25 && dE(d,P)<d.r+2)
      || (flags.snowMarks||[]).some(m=>m.type==='drag' && m.blood>.25 && dE(m,P)<8 && traceAlpha(m.t)>.25);
    flags.bloodySteps=blood?7:Math.max(0,(flags.bloodySteps||0)-1);
    if(!swampAt(P.x,P.y))recordTrace({x:P.x-Math.sin(a)*winterFootSide*4,y:P.y+Math.cos(a)*winterFootSide*4,a,t:S.min,type:'boot',depth:snowAtBoots(P),blood:flags.bloodySteps/7});
  }
  if(draggedBody){
    const b=draggedBody;
    if(!b.trackAt)b.trackAt={x:b.x,y:b.y};
    const distance=dE(b,b.trackAt);
    if(distance>=7){
      b.trackDistance=(b.trackDistance||0)+distance;
      if(!swampAt(b.x,b.y))recordTrace({x:b.x,y:b.y,a:Math.atan2(b.y-b.trackAt.y,b.x-b.trackAt.x),t:S.min,type:'drag',blood:clamp(1-b.trackDistance/145,0,1)*.7});
      b.trackAt={x:b.x,y:b.y};
    }
  }
}
function renderWinterMarks(vx,vy,vw,vh){
  for(const m of S.flags.snowMarks||[]){
    if(m.x<vx-12||m.x>vx+vw+12||m.y<vy-12||m.y>vy+vh+12)continue;
    if(swampAt(m.x,m.y))continue;
    const alpha=traceAlpha(m.t);if(alpha<=0)continue;
    const drag=m.type==='drag';
    if(!drag && m.depth>.48){
      // In thigh-deep powder the passing shin pushes a furrow beyond each boot.
      const fill=clamp((m.depth-.48)/.4,0,1),ox=Math.cos(m.a),oy=Math.sin(m.a);
      shoreEllipse(ctx,m.x-ox*3,m.y-oy*3,7.5+4*fill,3.6+1.9*fill,'rgba(91,111,130,'+(.27*alpha*fill)+')',m.a);
      shoreEllipse(ctx,m.x-oy*4,m.y+ox*4,5.8,1.7,'rgba(230,235,236,'+(.62*alpha*fill)+')',m.a-.12);
    }
    if(m.depth>.04){
      shoreEllipse(ctx,m.x+1,m.y+1,5.4,2.8,'rgba(218,230,235,'+(.54*m.depth*alpha)+')',m.a);
      shoreEllipse(ctx,m.x-.5,m.y-.4,4.4,2,'rgba(67,87,107,'+(.43*m.depth*alpha)+')',m.a);
    }
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
    const shelter=e.sid==='cook'?tilePoint(410.5,281.5):tilePoint(e.sid==='housekeeper'?404:384,e.sid==='housekeeper'?102:114);
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
  if(S.flags.onLookout)return 'winterBoard';
  const r=winterFloor(x,y);
  if(r)return r.hamlet||r===fishingRoom||villageCabins.includes(r)||r.kind==='barracks'||(r.block && x<(r.x+16)*T && (y<(r.y+4.4)*T||y>(r.y+6.75)*T))?'winterBoard':'winterConcrete';
  const depth=marshDepth(x,y);
  if(depth>.035)return depth>.38?'stepWater':'winterSlush';
  if(basinRadius(x/T,y/T,lakeShape)<1)return 'winterIce';
  if(y>northFence && y<southFence || S.flags.stationDeck)return 'winterConcrete';
  for(const route of atlasRoutes)for(let i=1;i<route.length;i++){
    const [a,b]=route[i-1],[c,d]=route[i],u=x/T-a,v=y/T-b,dx=c-a,dy=d-b;
    const f=clamp((u*dx+v*dy)/(dx*dx+dy*dy||1),0,1);
    if(Math.hypot(u-f*dx,v-f*dy)<1.3)return 'winterPacked';
  }
  return 'winterPowder';
}

function winterStairOffset(e){
  const r=winterFloor(e.x,e.y);if(!r?.block)return [0,0];
  const f=r.flights.find(s=>Math.abs(e.x-s.x)<.75*T);
  const y=(r.y+r.stairY)*T;
  if(!f || e.y<y || e.y>y+2.86*T)return [0,0];
  return raisedOffset(f.x,y+1.43*T,stairRise(f,e.y));
}
function winterCoatTone(e){return e.winterTone || (e===P || e.sid==='mitya'?'slate':['cook','housekeeper','anya'].includes(e.sid)?'ochre':'ash');}
const winterDeadArt=new WeakMap();
function winterBodySprite(image,body){
  let variants=winterDeadArt.get(image);
  if(!variants){variants={};winterDeadArt.set(image,variants);}
  const tone=winterCoatTone(body);return variants[tone] ||= winterCloth(image,'body',tone);
}

function salvageIcon(id){
  const image=district.images[id].cloneNode(false);
  image.className='b1ic';image.alt='';
  return image;
}
