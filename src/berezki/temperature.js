// Temperatures use Celsius. The world clock advances one game minute per real second.
const thermalBalance={
  dawn:4,day:8,dusk:18,night:22,dayRange:[-38,-30],nightRange:[-50,-38],roomRange:[-2,5],
  warningWindLoss:.25,maxChangePerHour:4,baseCold:-30,lossPerMinute:10,extraLossPerDegree:.75,
  roomGainAtMin:.4,roomGainPerDegree:.05,fireGain:1.5,fireRadius:90,
  frostStarts:40,maxFrostArea:1/3
};
function thermalRange(minute,inside){
  const b=thermalBalance;
  if(inside)return b.roomRange;
  const hour=minute%1440/60;
  let daylight=0;
  if(hour>=b.dawn&&hour<b.day)daylight=(hour-b.dawn)/(b.day-b.dawn);
  else if(hour>=b.day&&hour<b.dusk)daylight=1;
  else if(hour>=b.dusk&&hour<b.night)daylight=(b.night-hour)/(b.night-b.dusk);
  return b.nightRange.map((value,i)=>lerp(value,b.dayRange[i],daylight));
}
function nextThermalHour(track,start,from,inside){
  const end=(Math.floor(start/60)+1)*60;
  const [min,max]=thermalRange(end,inside);
  const reach=thermalBalance.maxChangePerHour*(end-start)/60;
  const low=Math.ceil(10*Math.max(min,from-reach)-1e-8);
  const high=Math.floor(10*Math.min(max,from+reach)+1e-8);
  const previous=Math.round(from*10),skip=high>low&&previous>=low&&previous<=high;
  const random=mulberry32(track.seed^Math.imul(end/60,0x45d9f3b));
  let target=low+Math.floor(random()*(high-low+1-Number(skip)));
  if(skip&&target>=previous)target++;
  Object.assign(track,{start,end,from,to:target/10});
}
function thermalTrackAt(key,minute){
  const tracks=S.flags.temperatures||={};
  const inside=key!=='street';
  let track=tracks[key];
  if(!track||minute<track.start){
    const [min,max]=thermalRange(minute,inside);
    track=tracks[key]={seed:ri(0,0x7fffffff)};
    const initial=ri(Math.ceil(min*10-1e-8),Math.floor(max*10+1e-8))/10;
    nextThermalHour(track,minute,initial,inside);
  }
  while(minute>=track.end)nextThermalHour(track,track.end,track.to,inside);
  return lerp(track.from,track.to,(minute-track.start)/(track.end-track.start));
}
function roomClimateKey(room,x,y){
  const root=room.x+','+room.y;
  if(room.block!=='living')return root;
  const u=x/T-room.x,v=y/T-room.y;
  if(u>=16.1)return root+'/stairs';
  if(room.n===1)return root+(u<9?'/canteen':'/hall');
  if(v>=4.45&&v<=6.55)return root+'/hall';
  return root+'/flat'+clamp(Math.floor((u-1)/5),0,2)+(v<4.45?'N':'S');
}
function ambientAt(room,x,y,heated=winterRoomWarm(room)){
  const outside=thermalTrackAt('street',S.min);
  return heated?thermalTrackAt(roomClimateKey(room,x,y),S.min):outside;
}
function thermalRate(temp,heated,byFire){
  const b=thermalBalance;
  const rate=heated?b.roomGainAtMin+b.roomGainPerDegree*(temp-b.roomRange[0]):
    -(b.lossPerMinute+b.extraLossPerDegree*(b.baseCold-temp))/60;
  return byFire?Math.max(rate,b.fireGain):rate;
}
function winterHeatTick(dt,room){
  const heated=winterRoomWarm(room);
  const temp=ambientAt(room,P.x,P.y,heated);
  const byFire=WORLD_FIRES.some(f=>dE(P,f)<thermalBalance.fireRadius&&fireLit(f)&&
    winterFloor(f.x,f.y)===room&&los(P.x,P.y,f.x,f.y));
  let rate=thermalRate(temp,heated,byFire);
  const s=S.flags.blizzard;
  if(rate<0&&s?.stage==='warning'&&!winterShelter(P))rate*=1+thermalBalance.warningWindLoss*stormStrength(s)/.84;
  const before=S.flags.warmth;
  S.flags.warmth=clamp(before+dt*rate,0,100);
  P.byHeat=heated||byFire;
  if(S.flags.warmth===0&&rate<0&&P.alive){
    const exposed=Math.max(0,dt-before/-rate);
    P.hp-=exposed*.4;
    if(P.hp<=0)kill(P,'cold');
  }
}
