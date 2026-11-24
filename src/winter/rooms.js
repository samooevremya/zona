// Interior and exterior use the same coordinates, including the position of each entrance.
function accessibleBuilding(b) {
  return !['platform','tower','tank'].includes(b[0]);
}
function localPoint(b,x,y) {
  const dx=x-b[1],dy=y-b[2],c=Math.cos(b[5]),s=Math.sin(b[5]);
  return [dx*c+dy*s,dy*c-dx*s];
}
function worldPoint(b,x,y) {
  const c=Math.cos(b[5]),s=Math.sin(b[5]);
  return [b[1]+x*c-y*s,b[2]+x*s+y*c];
}
function door(b,outside) { return worldPoint(b,0,b[4]/2+(outside?.29:-.31)); }
function flatWalls(b) {
  const w=b[3],h=b[4],lines=[];
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const a=-w/2+i*w/4,mid=a+w/8,y=side*.5;
      lines.push([[a,y],[mid-.34,y]],[[mid+.34,y],[a+w/4,y]]);
      if(i && !(side===1 && i===2))lines.push([[a,y],[a,side*h/2]]);
    }
  }
  return lines;
}
const roomGeometry=winterMap.buildings.map(b=>b[0]==='flat'?flatWalls(b):[]);
function insideFree(i,x,y){
  const b=winterMap.buildings[i],[lx,ly]=localPoint(b,x,y);
  return Math.abs(lx)<b[3]/2-.12 && Math.abs(ly)<b[4]/2-.12 &&
    !roomGeometry[i].some(([a,b])=>clearance(lx,ly,a,b)<.12);
}
function stair(b,up){return worldPoint(b,up?.72:-.72,0);}
function roomPlace(i,floor){
  const b=winterMap.buildings[i];
  return b[0]==='flat'?'Берёзки · корпус '+(winterMap.buildings.slice(0,i+1).filter(k=>k[0]==='flat').length)+' · этаж '+floor:
    ({cabin:'Жилой дом',store:'Склад',shed:'Сарай',pump:'Водокачка',station:'Вокзал',ruin:'Разбитый корпус',hangar:'Ангар'})[b[0]];
}
function paintRoom(v,i,floor){
  const b=winterMap.buildings[i],[kind,bx,by,w,h,angle]=b,[px,py]=screen(bx,by,v);
  const left=-w/2,top=-h/2;
  g.save();g.translate(px,py);g.scale(v.z,v.z);g.rotate(angle);
  g.fillStyle='#655f54';g.fillRect(left-.09,top-.09,w+.18,h+.18);
  fillMaterial(g,2,left,top,w,h,4.3,.87);
  function woodObject(id,x,y,ow,oh,rotation=0){
    g.save();g.translate(x,y);g.rotate(rotation);contactShade(g,.06,.07,ow*.64,oh*.63,.65);
    sheetObject(g,id,-ow/2,-oh/2,ow,oh);g.restore();
  }
  function rug(x,y,rw,rh){
    g.fillStyle='#62584e';g.fillRect(x-rw/2,y-rh/2,rw,rh);
    g.strokeStyle='#b39474';g.lineWidth=.016;g.strokeRect(x-rw/2+.04,y-rh/2+.04,rw-.08,rh-.08);
    for(let n=0;n<8;n++)stroke(g,[[x-rw*.42,y-rh*.35+n*rh*.1],[x+rw*.42,y-rh*.35+n*rh*.1]],'#887662',.012);
  }
  if(kind==='flat'){
    for(const side of [-1,1])for(let room=0;room<4;room++){
      const mid=left+(room+.5)*w/4,back=side*(h*.5-.43),roomY=side*(h/2+.50)/2;
      const tint=['rgba(110,93,63,.27)','rgba(71,74,68,.24)','rgba(108,70,52,.26)','rgba(65,81,76,.24)'][(room+floor+(side>0?1:0))%4];
      g.fillStyle=tint;g.fillRect(mid-w/8,Math.min(side*.5,side*h/2),w/4,h/2-.5);
      if(suiteArt.naturalWidth){
        const suite=(room+floor+(side>0?2:0)+i)%4,sw=suiteArt.width/2,sh=suiteArt.height/2;
        const roomWidth=w/4,depth=h/2-.50;
        g.save();g.translate(mid,roomY);if(side>0)g.rotate(Math.PI);
        // Each furnished bay has a clear approach facing the corridor.
        g.drawImage(suiteArt,(suite%2)*sw+2,Math.floor(suite/2)*sh+2,sw-4,sh-4,-roomWidth/2,-depth/2,roomWidth,depth);g.restore();
      }else{
        rug(mid-.38,roomY,1.45,.65);woodObject(1,mid-1.22,back,.66,.58,.08);
      }
      const windowY=side*h/2;
      const light=g.createRadialGradient(mid,windowY,0,mid,windowY,1.25);
      light.addColorStop(0,'rgba(239,222,179,.40)');light.addColorStop(1,'rgba(235,220,185,0)');
      g.fillStyle=light;g.fillRect(mid-1.25,side===1?windowY-1.25:windowY,2.5,1.25);
    }
    g.fillStyle='#635e54';g.fillRect(left,-.50,w,1);
    fillMaterial(g,2,left,-.50,w,1,2,.32);
    for(let x=left;x<w/2;x+=.42){
      stroke(g,[[x,-.48],[x,.48]],'rgba(42,40,37,.26)',.013);
      g.fillStyle='rgba(218,204,171,.08)';g.fillRect(x+.018,-.47,.08,.95);
    }
  }else{
    g.fillStyle='rgba(61,59,53,.25)';g.fillRect(left,top,w,h);
    if(kind==='station'||kind==='store'||kind==='ruin'||kind==='hangar'){
      for(let x=left+.35;x<w/2-.5;x+=kind==='station'?1.7:2.7){
        woodObject(kind==='station'?1:4,x+.15,top+.30,.59,.45,.06*Math.sin(x*9+i));
      }
    }else if(w>2.4){
      woodObject(1,.23,.14,.57,.53,-.17);rug(-.22,.04,.87,.64);
    }
  }
  const wall=(a,z)=>{
    stroke(g,[[a[0]+.08,a[1]+.10],[z[0]+.08,z[1]+.10]],'rgba(30,28,23,.35)',.19);
    stroke(g,[a,z],'#3b3933',.155);stroke(g,[a,z],'#888579',.095);
    stroke(g,[[a[0]-.023,a[1]-.027],[z[0]-.023,z[1]-.027]],'#b4aa93',.027);
  };
  wall([left,top],[-left,top]);wall([left,top],[left,-top]);wall([-left,top],[-left,-top]);
  wall([left,-top],[-.28,-top]);wall([.28,-top],[-left,-top]);
  for(const [a,z] of roomGeometry[i])wall(a,z);
  g.fillStyle='#a59678';g.fillRect(-.27,-top-.065,.54,.09);
  if(kind==='flat'){
    for(const side of [-1,1])for(let room=0;room<4;room++){
      const mid=left+(room+.5)*w/4,sy=side*h/2;
      stroke(g,[[mid-.34,sy],[mid+.34,sy]],'#b9c6c2',.08);
      stroke(g,[[mid,sy-.06],[mid,sy+.07]],'#565a52',.034);
    }
    for(const [up,off] of [[true,.72],[false,-.72]]){
      if(up?floor===5:floor===1)continue;
      woodObject(3,off,0,.62,.94,up?0:Math.PI);
    }
  }
  if(i===stationIndex){
    for(const portal of stationPortals){
      const [x,y]=localPoint(b,...portal.room);rug(x,y,.49,.23);
    }
  }
  const furnishings=roomFurniture(b);
  const [cx,cy]=localPoint(b,...furnishings.box),[ex,ey]=localPoint(b,...furnishings.bed);
  woodObject(2,cx,cy,.56,.52);woodObject(shelters.has(kind)?0:4,ex,ey,.74,.49,Math.PI*.5);
  g.restore();
}

// A continuous fence closes both long sides. Only the station has platform access.
// The two street entrances and the platform door are separate points on the concourse.
const stationIndex=winterMap.buildings.findIndex(b=>b[0]==='station');
const railNorth=31.82,railSouth=36.65;
const stationPortals=[
  {side:'Площадь у озера',world:[69.7,31.5],room:worldPoint(winterMap.buildings[stationIndex],0,-.78)},
  {side:'Переход в Берёзки',world:[70,37.1],room:worldPoint(winterMap.buildings[stationIndex],-3.6,.70)},
  {side:'Железнодорожная платформа',world:[69.7,34.48],room:worldPoint(winterMap.buildings[stationIndex],0,.76)}
];
function sameRailSide(y,py){
  const band=v=>v<railNorth?-1:v>railSouth?1:0;
  return band(y)===band(py);
}
function railwayFence(v){
  const lo=Math.max(0,v.x-viewW/(2*v.z)-.7),hi=Math.min(W,v.x+viewW/(2*v.z)+.7);
  for(const y of [railNorth,railSouth]){
    stroke(g,[[lo,y],[hi,y]],'#596c6d',wide?.13:.08);
    if(!wide){
      for(let x=Math.floor(lo/.16)*.16;x<hi;x+=.16){
        stroke(g,[[x,y],[x+.11,y-.18]],'#7b8785',.013);
        stroke(g,[[x,y-.18],[x+.11,y]],'#74827f',.013);
      }
      stroke(g,[[lo,y-.19],[hi,y-.19]],'#708080',.025);
      for(let x=Math.floor(lo/.20)*.20;x<hi;x+=.20){
        stroke(g,[[x,y-.07],[x+.10,y+.07],[x+.20,y-.07]],'#828986',.025);
      }
      for(let x=Math.floor(lo/1.1)*1.1;x<hi;x+=1.1){
        g.fillStyle='#4d5756';g.fillRect(x-.033,y-.13,.066,.26);
      }
    }
  }
  const [x,y]=stationPortals[1].world;
  contactShade(g,x+.10,y+.16,.81,.49,.73);
  g.fillStyle='#62645e';g.fillRect(x-.52,y-.31,1.04,.69);
  sheetObject(g,3,x-.50,y-.47,1,.91);
  for(const side of [-1,1]){
    stroke(g,[[x+side*.48,y-.38],[x+side*.48,y+.35]],'#5a5b56',.055);
    stroke(g,[[x+side*.48-.014,y-.38],[x+side*.48-.014,y+.35]],'#d3d1bd',.016);
  }
}
