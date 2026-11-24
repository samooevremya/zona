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
  const b=winterMap.buildings[i],w=b[3],h=b[4],[px,py]=screen(b[1],b[2],v);
  g.save();g.translate(px,py);g.scale(v.z,v.z);g.rotate(b[5]);
  const l=-w/2,t=-h/2;
  g.fillStyle=b[0]==='flat'?'#9b8870':'#877968';g.fillRect(l,t,w,h);
  for(let y=t;y<h/2;y+=.18)stroke(g,[[l,y],[-l,y]],'rgba(64,52,43,.22)',.018);
  fillMaterial(g,2,l,t,w,h,2.4,.79);
  const wall=(a,b)=>{stroke(g,[a,b],'#4b4a43',.14);stroke(g,[a,b],'#aaaca0',.065);};
  wall([l,t],[-l,t]);wall([l,t],[l,-t]);wall([-l,t],[-l,-t]);
  wall([l,-t],[-.28,-t]);wall([.28,-t],[-l,-t]);
  for(const [a,c] of roomGeometry[i])wall(a,c);
  g.fillStyle='#d9caa2';g.fillRect(-.22,-t-.09,.44,.07);
  if(i===stationIndex){
    for(const p of stationPortals){const [x,y]=localPoint(b,...p.room);g.fillStyle='#cebf92';g.fillRect(x-.25,y-.10,.50,.20);}
  }
  if(b[0]==='flat'){
    for(const side of [-1,1])for(let room=0;room<4;room++){
      const mid=l+(room+.5)*w/4,y=side*(h/2-.24);
      stroke(g,[[mid-.4,side*h/2],[mid+.4,side*h/2]],'#bfd0c7',.10);
      g.fillStyle='#615448';g.fillRect(mid+.85,y-.14,.65,.28);
      g.fillStyle=(room+floor)%2?'#afa58a':'#889488';g.fillRect(mid+.88,y-.12,.57,.2);
    }
    for(const [up,off] of [[true,.72],[false,-.72]]){
      if(up?floor===5:floor===1)continue;
      g.fillStyle='#554e46';g.fillRect(off-.38,-.4,.76,.8);
      for(let n=0;n<7;n++){g.fillStyle='rgb('+[139+n*6,130+n*6,114+n*6].join(',')+')';g.fillRect(off-.35,-.37+n*.106,.70,.084);}
      g.fillStyle='#242d2d';g.textAlign='center';g.font='.24px sans-serif';g.fillText(up?'▲':'▼',off,.08);
    }
  }
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
  g.fillStyle='#707b78';g.fillRect(x-.55,y-.20,1.1,.64);
  for(let i=0;i<6;i++){
    g.fillStyle=['#5a605d','#71756c','#868a7e','#989d8e','#abb1a3','#bac0b0'][i];g.fillRect(x-.45,y-.16+i*.09,.90,.07);
  }
}
