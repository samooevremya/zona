// Short doorstep lanes branch off the loop. The two long approaches meet
// in the middle, so a traveller can cross the settlement without entering a yard.
const hamletCross=[95.52,435.36];
const woodpileTrack=[[104.1,426.55],[104.9,428.25],[106.2,429.7],[107.3,429.65],[108.15,429.35]];
const hamletLanes=[
  [hamletCross,[90,432],[85,430],[85,427]],
  [[90,432],[96.6,429],[97,425]],
  [[85,430],[80.4,431.4],[77,432.4],[77,434]],
  [[80.4,431.4],[82.4,433.4],[82.3,439],[85,441],[85,443]],
  [[85,441],[93,440.2],hamletCross],
  [[93,440.2],[98.7,442.4],[100,446]],
  [[98.7,442.4],[106.3,436],[112,434.7],[112,438]],
  [[106.3,436],[107.8,433.7]],
  woodpileTrack
];
const hamletRooms=[
  {name:'Изба у леса',x:81,y:421,w:7,h:6,entry:3,roof:'plank',ridge:'vertical',
    furniture:[['bedroll',1.85,2.5],['stove',5.45,1.8],['cupboard',1.65,4.25],['desk',5.35,3.95,1]]},
  {name:'Дом у развилки',x:93,y:419,w:8,h:6,entry:3,roof:'slate',
    furniture:[['supper',2,2.3],['stool',2.9,2.5],['stove',6.4,4],['bedroll',5.8,1.75,1],['cupboard',1.65,4.25]]},
  {name:'Дровяной сарай',x:74,y:434,w:7,h:5,entry:2,north:true,roof:'plank',
    furniture:[['rack',1.65,2.45,1],['pallet',4.8,3.4],['sack',5.25,1.75]]},
  {name:'Дом у плетня',x:81,y:443,w:8,h:6,entry:3,north:true,roof:'slate',
    furniture:[['stove',1.7,3.85],['bedroll',6.15,3.2],['cupboard',1.65,1.75],['supper',4.6,4.45]]},
  {name:'Крайняя изба',x:96,y:446,w:8,h:6,entry:3,north:true,roof:'plank',ridge:'vertical',
    furniture:[['bedroll',2.65,4.3,1],['bedroll',5.55,4.3,1],['stove',1.7,1.9],['desk',6.1,2.05]]},
  {name:'Столярная мастерская',x:108,y:438,w:8,h:6,entry:3,north:true,roof:'slate',
    furniture:[['rack',2.3,4.3],['desk',5.9,4.2],['cabinet',6.5,1.85]]}
];
const hamletFences=[];
function makeHamlet(){
  for(const r of hamletRooms){
    const v=r.north?0:r.h-1;
    r.n=1;r.hamlet=true;
    house(r.x,r.y,r.w,r.h,[[r.entry,v],[r.entry+1,v]],BR,0,r.roof);
    const h=HOUSES.at(-1);h.cabin=r;buildEntrances(h);district.levels.push(r);
    for(const [kind,u,v,turn=0] of r.furniture){
      const x=(r.x+u)*T,y=(r.y+v)*T;
      const o=putFurniture(kind,x,y,turn*Math.PI/2,'hamlet-'+r.x+'-'+r.y);
      if(kind==='stove')r.heater={at:{x,y},flag:'hutStove'+r.x+'x'+r.y,room:r,action:'hamletKindle'};
      if(kind==='desk' && r===hamletRooms[5])o.workbench=true;
      if(kind==='cupboard' || kind==='cabinet')o.loot=r===hamletRooms[5]?{wire:1}:{candle:1};
    }
    if(!r.heater)r.abandoned=true;
  }
  for(const [x,y,w,h] of [[80,428.7,3,.16],[87.4,428.7,1.7,.16],[103,424,.16,3.6],
    [78.8,441.5,3.6,.16],[88,441.5,2.2,.16],[106.2,442,.16,4],[106.2,446,2.4,.16],
    [106.9,427.6,3,.16],[109.9,427.6,.16,2.4]]){
    hamletFences.push(addObj({k:'fence',material:'picket',solid:1,x:x*T,y:y*T,w:w*T,h:h*T}));
  }
  putFurniture('bench',99.5*T,426*T,0,'hamlet-yard');
  const stack=interiorObject('woodStack',79.4*T,440.15*T,60,19);
  atlasProp('wood',stack.x+stack.w/2,stack.y+stack.h-1,67,42);
}
function hamletGround(g){
  for(const h of HOUSES)if(h.cabin?.hamlet)paintCabinThreshold(g,h);
  for(const o of hamletFences)paintFenceFooting(g,o,-Infinity,Infinity);
}
function hamletFloor(r){
  const c=cabinFloor(r),g=c.getContext('2d');
  if(r.heater){
    paintCabinTextiles(g,{room:r,furniture:r.furniture,wool:r.north?'#6b6255':'#635752',
      stripe:'#ab9e80',window:[r.w-2.4,r.north?r.h-1.05:1.05],
      runner:[r.entry+1,r.north?1.9:r.h-2,34,46]});
  }
  return c;
}
