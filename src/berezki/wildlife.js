const wolfTerritories=[[67,94],[87,409],[417,409]];
// Short traverses cross actual lanes between two forest edges. The first point
// is also the entry point for a newly arriving pack or herd.
const wildlifeCrossings={
  wolf10:[[95.52,435.36],[90,432],[85,430],[81,428]],
  wolf11:[[257.08,265.8],[261,267],[263,270],[259,271]],
  deer7:[[341.31,287.8],[344,284],[347,283],[345,290]],
  deer8:[[119.79,409.22],[123,410],[125,412],[120,413]]
};
function wildGround(x,y){
  return x>4&&y>4&&x<district.width-4&&y<district.height-4&&Math.abs(y-178)>8 &&
    !winterFloor(x*T,y*T)&&basinRadius(x,y,lakeShape)>1&&!swampAt(x*T,y*T)&&clearFooting(x*T,y*T,13);
}
function clearingSpot(anchor,radius){
  for(let i=0;i<60;i++){
    const x=anchor[0]+rnd(-radius,radius),y=anchor[1]+rnd(-radius,radius);
    const spot={x:x*T,y:y*T};
    if(wildGround(x,y)&&!ents.some(e=>e.alive&&e.wildId&&dE(e,spot)<26))return spot;
  }
  return null;
}
function forestRangeSpot(anchor,radius){
  for(let i=0;i<160;i++){
    const x=anchor?anchor[0]+rnd(-radius,radius):rnd(12,district.width-12);
    const y=anchor?anchor[1]+rnd(-radius,radius):rnd(12,district.height-12);
    if(x<5||x>=district.width-5||y<5||y>=district.height-5||Math.abs(y-178)<12||forestDepth(x*T,y*T)<.5||
      district.levels.some(r=>x>r.x-8&&x<r.x+r.w+8&&y>r.y-8&&y<r.y+r.h+8)||!clearFooting(x*T,y*T,13))continue;
    return {x:x*T,y:y*T};
  }
  return null;
}
function spawnWild(slot){
  const deer=slot.species==='deer',anchor=slot.territory>=0?wolfTerritories[slot.territory]:null;
  const mate=ents.find(e=>e.wildGroup===slot.group&&e.alive);
  const route=wildlifeCrossings[slot.group];
  const nearMate=mate?[mate.x/T,mate.y/T]:null;
  const p=route?clearingSpot(nearMate||route[0],mate?1.4:1.8):forestRangeSpot(nearMate||anchor,mate?2:20);
  if(!p)return;
  Object.assign(slot,p,{hp:deer?48:38,again:0});return addWild(slot);
}
function addWild(slot){
  const e=mkDog({x:slot.x/T,y:slot.y/T,pack:slot.group});
  Object.assign(e,{species:slot.species,wildGroup:slot.group,wildId:slot.id,kind:slot.species==='wolf'?'dog':'deer',hp:slot.hp,name:slot.species==='wolf'?'Волк':'Олень'});
  if(e.kind==='deer'){e.fac='wildDeer';e.maxhp=48;}
  e.home={x:slot.homeX||slot.x,y:slot.homeY||slot.y};slot.homeX=e.home.x;slot.homeY=e.home.y;ents.push(e);return e;
}
function restoreWildlife(){
  const records=S.flags.wildlife ||= [],ids=new Set(records.map(s=>s.id));
  for(const species of ['wolf','deer']){
    let count=0;
    const sizes=species==='wolf'?[3,2,3,2,3,2,3,2,2,2,3,3]:[4,3,3,4,3,3,4,3,3];
    sizes.forEach((size,group)=>{
      for(let i=0;i<size;i++,count++){
        const id=species+count;
        if(!ids.has(id))records.push({id,group:species+group,species,territory:species==='wolf'&&group<6?group%3:-1});
      }
    });
  }
  for(const s of S.flags.wildlife){if(s.again>S.min)continue;if(s.hp>0)addWild(s);else spawnWild(s);}
}
function saveWildlife(){
  for(const e of ents)if(e.wildId&&e.alive){const slot=S.flags.wildlife.find(s=>s.id===e.wildId);Object.assign(slot,{x:e.x,y:e.y,hp:e.hp});}
}
function fallenWild(e){
  const slot=S.flags.wildlife.find(s=>s.id===e.wildId);Object.assign(slot,{hp:0,again:S.min+ri(2880,4320),homeX:null,homeY:null});
}
function winterWildTick(){
  if(S.min<(P.wildCheck||0))return;P.wildCheck=S.min+10;
  for(const s of S.flags.wildlife)if(!(s.hp>0)&&!(s.again>S.min))spawnWild(s);
  ents=ents.filter(e=>!e.wildId||e.alive);
}
function wildAI(e,dt){
  if(e.kind==='dog'&&(dE(e,P)<380||e.tgt)){aiDog(e,dt);return;}
  if(dE(e,P)>1150)return;
  const danger=e.species==='deer'&&dE(e,P)<260;
  if(danger&&!e.fleeing)e.roam=null;
  e.fleeing=danger;
  if(!e.roam||S.min>=e.roamAt||dE(e,e.roam)<17){
    const leader=ents.find(a=>a.alive&&a.wildGroup===e.wildGroup),a=Math.atan2(e.y-P.y,e.x-P.x);
    let anchor=leader&&leader!==e?[leader.x/T,leader.y/T]:[e.home.x/T,e.home.y/T];
    if(danger)anchor=[e.x/T+Math.cos(a)*5,e.y/T+Math.sin(a)*5];
    const route=wildlifeCrossings[e.wildGroup];
    if(route&&!danger){
      if(leader===e){
        e.crossingStep=((e.crossingStep??0)+1)%route.length;
        anchor=route[e.crossingStep];
      }
      e.roam=clearingSpot(anchor,leader===e?.65:1.25);
    }else if(danger)e.roam=clearingSpot(anchor,2);
    else e.roam=forestRangeSpot(anchor,leader===e?5:1.6);
    e.roamAt=S.min+(danger?2:route?ri(9,15):ri(4,11));
  }
  if(e.roam){const ang=Math.atan2(e.roam.y-e.y,e.roam.x-e.x);e.ang=ang;goTo(e,e.roam.x,e.roam.y,danger?160:28,dt);}
}
function wildSprite(e,dead){
  const im=district.images[e.species];if(!im)return;
  const len=e.species==='deer'?51:37,h=len*im.height/im.width;
  const g=ctx;g.save();groundShadow(g,e.x,e.y,len*.4,h*.3,e.ang,3);
  g.translate(e.x,e.y);g.rotate(e.ang+(dead?.65:0));
  if(dead){g.globalAlpha=.83;g.scale(1,.78);}else g.rotate(.028*Math.sin((e.step||0)*.15));
  g.drawImage(im,-len/2,-h/2,len,h);g.restore();
}
