const metalFinds=[['a9',50],['bandage',20],['medkit',10],['wire',10],[null,10]];
const packFinds=[['cans',30],['bandage',25],['matches',20],['wood',10],['medkit',5],['buckle',10]];
function rollFinds(table){
  const loot={};
  for(let n=ri(1,3);n>0;n--){
    let value=Math.random()*100;
    for(const [id,weight] of table){
      value-=weight;if(value>=0)continue;
      if(id)loot[id]=(loot[id]||0)+(id==='matches'?5:id==='a9'?ri(3,9):1);
      break;
    }
  }return loot;
}
function restoreFinds(){
  const records=S.flags.fieldFinds||={};
  function site(key,x,y,type,table){
    const f=records[key]||={x,y,type,loot:rollFinds(table)};
    f.name=type==='metal'?'Металлический ящик':type==='pack'?'Брошенный рюкзак':'Припасы';
    f.stash='winter-find-'+key;
  }
  for(const [key,x,y,type] of [['post',251.4,460,'metal'],['store',244.8,476.5,'metal'],['gate',418,283,'metal'],['trail',259,384,'pack'],['lake',320,128,'pack'],['pump',174,354,'pack'],['west',128,148,'pack']])
    site(key,x*T,y*T,type,type==='metal'?metalFinds:packFinds);
  for(const f of Object.values(records)){
    if(f.type!=='loose')objs.push({k:'winterFindFoot',x:f.x-9,y:f.y-6,w:18,h:12,solid:1});
  }
  for(const r of district.levels){
    const shelf=objs.find(o=>['desk','supper','rack','pallet'].includes(o.fitting)&&winterFloor(o.x+o.w/2,o.y+o.h/2)===r);
    if(!shelf)continue;
    const home=r.block==='living'||shoreHomes.some(h=>h.room===r)||r===fishingRoom;
    const choices=home?['cans','bread','tea','coffee']:['bandage','cans','wood','matches','wire'];
    const key='shelf-'+r.x+'-'+r.y;site(key,shelf.x+shelf.w*.5,shelf.y+shelf.h*.85,'loose',choices.map(id=>[id,100/choices.length]));
    if(r===baseRooms[2]||r===westStore){const f=records[key];if(!f.liningsPlaced){f.loot.lining=2;f.liningsPlaced=true;}}
  }
}
function findChoices(cand){
  for(const f of Object.values(S.flags.fieldFinds)){
    const d=dE(P,f),id=Object.keys(f.loot)[0];
    if(d>47||!los(P.x,P.y,f.x,f.y)||winterFloor(P.x,P.y)!==winterFloor(f.x,f.y))continue;
    if(f.type==='loose'){if(id)cand(d-9,{k:'takeFind',f,id,label:'Подобрать · '+ITEMS[id].n});}
    else cand(d-5,{k:'searchFind',f,label:'Обыскать · '+f.name});
  }
}
function visibleFinds(inView){
  return Object.values(S.flags.fieldFinds).filter(f=>inView(f.x,f.y,36))
    .map(f=>({find:f,depth:f.y+(f.type==='loose'?8:3)}));
}
// Longest dimension on the ground, in world pixels. Selection still uses the reach of the hand.
const fieldSizes={wood:20,matches:5.5,buckle:6,wire:9,candle:8,a9:8,bandage:8,medkit:12,
  bread:12,cans:8,tea:12,coffee:12,money:8,lining:18,antler:16,wolfHide:28,deerHide:33};
function fieldItemSize(id){return fieldSizes[id] || (isGun(id)?30:12);}
function drawBrokenWinterCrate(g,o){
  const seed=Math.floor(o.x/T)+Math.floor(o.y/T)*17;
  g.rotate((hash2(seed,3)-.5)*1.25);
  for(const [i,[x,y,len,w,a]] of [[-6,-4,16,3,-.68],[2,-6,19,3.6,-.2],[-1,3,13,3,.57],[5,6,11,2.8,.26],[-7,7,7,1.2,-.37]].entries()){
    g.save();g.translate(x,y);g.rotate(a);
    const l=len/2,h=w/2;
    const edge=new Path2D();
    edge.moveTo(-l,-h);edge.lineTo(l-1,-h);edge.lineTo(l+1,-h*.5);
    edge.lineTo(l-2,0);edge.lineTo(l+.5,h*.5);edge.lineTo(l-1,h);edge.lineTo(-l,h);edge.closePath();
    g.save();g.translate(.6,1);g.fillStyle='#39302865';g.fill(edge);g.restore();
    g.clip(edge);g.drawImage(lookoutBoard(seed+i,false),-l,-h,len+1,w);
    g.restore();
  }
}
function drawWinterFind(f){
    const loose=f.type==='loose',id=loose?Object.keys(f.loot)[0]:f.type;
    if(!id)return;
    const im=fieldFindImage(id);
    if(!im)return;
    const w=loose?fieldItemSize(id)*im.width/Math.max(im.width,im.height):25,h=w*im.height/im.width;
    groundShadow(ctx,f.x,f.y,w*.52,h*.44,0,1.4);ctx.drawImage(im,f.x-w/2,f.y-h/2,w,h);
}
const fieldIconCache={};
function fieldFindImage(id){
  const key=id==='wood'?'firewood':id;
  if(district.images[key])return district.images[key];
  if(!(id in fieldIconCache)){
    const node=itemIcon(id);
    fieldIconCache[id]=node instanceof HTMLImageElement?node:null;
  }
  const im=fieldIconCache[id];
  return im?.complete&&im.naturalWidth?im:null;
}
async function loadCrateArt(){
  // Warm the shared inventory pictures before the first frame of the scatter.
  for(const id of ['bread','bandage','cans','medkit','a9'])fieldFindImage(id);
  await Promise.all(Object.values(fieldIconCache).filter(Boolean).map(im=>im.decode()));
}
function resetWinterCrate(o){
  const choices=district.levels.filter(r=>r.abandoned||r.kind==='stores'||r.kind==='hangar'||r===westStore);
  for(let i=0;i<32;i++){
    const r=choices[ri(0,choices.length-1)],x=(r.x+rnd(1.5,r.w-1.5))*T,y=(r.y+rnd(1.5,r.h-1.5))*T;
    if(!clearFooting(x,y,19))continue;
    const loot=rollFinds([['bread',25],['bandage',25],['cans',20],['wood',10],['wire',20]]);
    Object.assign(o,{x:x-o.w/2,y:y-o.h/2,broken:false,looted:false,solid:1,loot,initialLoot:{...loot}});
    S.flags['broken_'+o.stash]=0;S.flags['st_'+o.stash]=0;S.flags['contents_'+o.stash]={...loot};if(S.flags.crateCleanup)delete S.flags.crateCleanup[o.stash];
    (S.flags.winterBoxSites||={})[o.stash]={x:o.x,y:o.y};forgetGroundItems(o);
    const p=raisedScenery.find(p=>p.item===o);if(p)Object.assign(p,{x,y,depth:y+o.h*.24});
    buildGrids();return true;
  }
  return false;
}
