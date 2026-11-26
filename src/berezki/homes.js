// All coordinates are in tiles from the corresponding cabin's northwest corner.
// Keep the two-tile entries and the residents' evening destinations free.
const shoreHomes=[
  {room:villageCabins[0],key:'family',wool:'#71635c',stripe:'#a19577',
    runner:[3.72,2.64,52,26],window:[2.9,3.92],wall:2,
    furniture:[
      ['stove',5.52,1.74],['cupboard',1.53,1.73,0,{bandage:1}],
      ['bedroll',2.04,3.46,1],['bedroll',4.94,3.46,1]
    ]},
  {room:villageCabins[1],key:'kitchen',wool:'#635c48',stripe:'#a18c60',
    runner:[3.35,3.4,39,56],window:[5.74,4.93],wall:2,
    furniture:[
      ['stove',6.14,2.03],['cupboard',1.53,1.83,0,{bread:1}],
      ['bedroll',1.55,3.67],['bedroll',3.64,1.55,1],['supper',5.89,4.09],['stool',4.73,4.19]
    ]},
  {room:fishingRoom,key:'workshop',wool:'#515d59',stripe:'#9e9179',
    runner:[3.88,3.33,53,33],window:[2.45,1.04],wall:0,
    furniture:[
      ['stove',2,2.4],['bedroll',6.1,2.9],['cupboard',5.4,1.5,1,{bandage:1}],
      ['supper',1.9,5.25],['rack',6.44,5.02,1]
    ]}
];
function furnishShoreHomes(){
  for(const home of shoreHomes){
    const r=home.room;
    for(const [type,u,v,turn=0,loot] of home.furniture){
      const x=(r.x+u)*T,y=(r.y+v)*T;
      const o=putFurniture(type,x,y,turn*Math.PI/2,'shore-'+home.key);
      o.cabinHome=home.key;
      if(loot)o.loot=loot;
      if(type==='stove'){
        home.hearth=tilePoint(r.x+u,r.y+v);district.heaters.push(home.hearth);
      }
      if(type==='supper' || (home.key==='family' && type==='cupboard'))home.lamp=o;
    }
  }
}
function wovenRunner(g,home){
  const [u,v,w,h]=home.runner,x=u*T-w/2,y=v*T-h/2;
  const rand=mulberry32(Math.floor(home.room.x));
  g.fillStyle='#25252170';g.fillRect(x+1,y+2,w,h);
  g.fillStyle=home.wool;g.fillRect(x,y,w,h);
  for(let j=0;j<h;j+=1.5){
    const hem=j<7 || j>h-8;
    g.fillStyle=hem&&Math.floor(j/1.5)%3===1?home.stripe:j%3?'#362f2c61':'#d5c3a037';
    g.fillRect(x+rand(),y+j,w-1-rand(),.8);
  }
  // Faded lozenges are woven into the pile, with broken threads near the doors.
  g.save();g.translate(x+w/2,y+h/2);
  if(h>w)g.rotate(Math.PI/2);
  for(const cx of [-13,0,13]){
    for(const size of [5,3]){
      g.strokeStyle=size===5?home.stripe+'aa':'#35312c8c';g.lineWidth=1.1;
      g.beginPath();g.moveTo(cx-size,0);g.lineTo(cx,-size*.8);
      g.lineTo(cx+size,0);g.lineTo(cx,size*.8);g.closePath();g.stroke();
    }
  }
  g.restore();
  for(let k=0;k<65;k++){
    g.fillStyle=k%3?'#322b2521':'#ddcaa331';
    g.fillRect(x+rand()*(w-4),y+rand()*h,1+rand()*3,.9);
  }
  for(let i=1;i<w;i+=2){
    beam(g,x+i,y,x+i-.3,y-rand()*3,.7,home.stripe);
    beam(g,x+i,y+h-.5,x+i+.5,y+h+rand()*3,.7,home.stripe);
  }
}
// These are flat furnishings on the floor and along the wall. Tall pieces use
// the same depth-sorted furniture layer as the rest of the district.
function paintCabinTextiles(g,home){
  // A scorched sheet protects the floorboards under each iron stove.
  const [,sx,sy]=home.furniture.find(f=>f[0]==='stove');
  g.save();g.translate(sx*T,sy*T);
  artFill(g,'floor_concrete',-14,-14,29,32);
  g.fillStyle='#48403979';g.fillRect(-14,-14,29,32);
  for(let i=0;i<9;i++)shoreEllipse(g,-6+i*1.7,14+Math.sin(i*4)*1.7,2.1,1,'#4841388a');
  g.restore();
  wovenRunner(g,home);
  const [u,v]=home.window,x=u*T,y=v*T;
  g.save();g.translate(x,y);
  artFill(g,'floor_wood',-19,-5,38,9);
  g.fillStyle='#46453b';g.fillRect(-17,-4,34,6);
  for(let i=-16;i<17;i+=3){
    const hem=4+1.5*Math.cos(i*.48);
    beam(g,i,-4,i+.6,hem,3.1,Math.sin(i)>.1?home.wool:'#6c695d');
    beam(g,i,-3,i+.2,hem,.6,'#b0a48e96');
  }
  beam(g,-19,-5,19,-5,2,'#635441');g.restore();
  if(home.key==='family'){
    // Knitted mittens, drying near the stove but clear of the family doorway.
    const ax=4.58*T,ay=1.13*T;
    beam(g,ax,ay,ax+30,ay+3,1.2,'#726656');
    for(let i=0;i<4;i++){
      const px=ax+4+i*6,py=ay+2+i*.6;
      shoreEllipse(g,px,py+3,2.4,4.3,i<2?'#776052':'#686c62',.14);
      beam(g,px+1,py+3,px+3,py+1,1.5,'#625a4f');
    }
  }
}
function cabinFittingDetail(g,o){
  const home=shoreHomes.find(h=>h.key===o.cabinHome),x=o.x+o.w/2,y=o.y+o.h/2;
  g.save();g.translate(x,y);g.rotate(o.angle);
  if(o.fitting==='bedroll'){
    // Tint the middle folds lightly so the grain of the painted bed remains visible.
    g.fillStyle=home.wool+'70';g.fillRect(-9,-1,18,16);
    for(const yy of [1,3,12])beam(g,-9,yy,8,yy+.5,.9,home.stripe+'c4');
  }else if(o.fitting==='stove'){
    shoreEllipse(g,1,7,6,2.3,'#512f21');beam(g,-3,7,4,7.3,1.2,'#e89852');
  }else if(o.fitting==='rack' && home.key==='workshop'){
    // A loose net, folded on the work rack, with two wooden floats.
    for(let i=-12;i<=7;i+=3){
      beam(g,i,-5,i+5,4,.8,'#817963');beam(g,i,4,i+5,-5,.7,'#a09272');
    }
    for(const px of [-9,5])shoreEllipse(g,px,-6,3.2,1.7,'#9d7950',.3);
  }
  if(o===home.lamp){
    const cx=o.fitting==='cupboard'?0:-10;
    shoreEllipse(g,cx,0,3.3,2.2,'#373832');
    beam(g,cx,0,cx,-3.4,2,'#c5b18a');
    shoreEllipse(g,cx,-4.4,1,1.6,'#f3d392',.1);
  }
  g.restore();
}
function lightShoreHomes(g,inView,tint){
  const indoors=winterFloor(P.x,P.y);
  for(const home of shoreHomes){
    const r=home.room,h=home.hearth;
    if(!inView(h.x,h.y,300))continue;
    if(indoors===r){
      g.save();g.beginPath();g.rect(r.x*T,r.y*T,r.w*T,r.h*T);g.clip();
      softLamp(g,h.x,h.y,79,63,tint?.24:.84,tint?'224,140,70':'0,0,0');
      const o=home.lamp,dx=o.fitting==='cupboard'?0:-10;
      const [lx,ly]=raisedOffset(o.x+o.w/2,o.y+o.h/2,fittingHeight[o.fitting],false);
      softLamp(g,o.x+o.w/2+dx+lx,o.y+o.h/2+ly-4,39,32,tint?.17:.50,tint?'245,189,112':'0,0,0');
      g.restore();
    }else if(!indoors && darkness()>.16 && ents.some(e=>e!==P && e.alive && winterFloor(e.x,e.y)===r)){
      const facade=r===fishingRoom?fishingHouse:district.exteriors.find(h=>h.cabin===r);
      const panes=facade?.facadePanes?.[home.wall];
      if(!panes?.length)continue;
      const wanted=home.window[0]*T,u=panes.reduce((a,b)=>Math.abs(a-wanted)<Math.abs(b-wanted)?a:b);
      const y=(r.y+(home.wall===2?r.h:0))*T;
      softLamp(g,r.x*T+u,y+(home.wall===2?3:-3),29,13,tint?.18:.45,tint?'255,183,109':'0,0,0');
    }
  }
}
