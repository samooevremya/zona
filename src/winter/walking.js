// All thresholds are crossed by movement. A layer change never changes the actor's x/y.
const northStairs={x:stationBuilding[1]+stationBuilding[3]/2-.88,y:stationBuilding[2],width:subway.width,length:subway.length};
const tunnelBend=34.95;
function flightWalls(x,y,w,h){
  return [-1,1].map(s=>[[x+s*w/2,y-h/2],[x+s*w/2,y+h/2]]);
}
function tunnelFree(x,y){
  const half=subway.width/2-.085;
  return Math.abs(x-subway.x)<half&&y>=tunnelBend-half&&y<=subway.y+subway.length/2 ||
    Math.abs(y-tunnelBend)<half&&x>=subway.x-half&&x<=northStairs.x+half ||
    Math.abs(x-northStairs.x)<half&&y>=northStairs.y-northStairs.length/2&&y<=tunnelBend+half;
}
function doorLane(b,x,y,level){
  return level===1&&Math.abs(x)<.205&&(Math.abs(y-b[4]/2)<.19 ||
    b===stationBuilding&&Math.abs(y+b[4]/2)<.19);
}
function moveAxis(x,y){
  if(x===player.x&&y===player.y)return;
  let room=state.room,floor=state.floor;
  if(room===stationIndex&&floor===0){
    if(!tunnelFree(x,y))return;
    if(y>=subway.y&&player.y<subway.y){room=-1;floor=1;}
    if(y<=northStairs.y&&player.y>northStairs.y)floor=1;
  }else if(room>=0){
    const b=winterMap.buildings[room],[lx,ly]=localPoint(b,x,y);
    if(!insideFree(room,x,y)&&!doorLane(b,lx,ly,floor))return;
    if(Math.abs(ly)>b[4]/2){room=-1;floor=1;}
    else if(b===stationBuilding&&Math.abs(x-northStairs.x)<northStairs.width/2-.075&&player.y<=northStairs.y&&y>northStairs.y)floor=0;
    else if(b[0]==='flat'&&Math.abs(lx)<.76&&Math.abs(lx)>.068){
      const before=localPoint(b,player.x,player.y)[1],line=-1.21;
      const goingUp=lx<0?before>=line&&ly<line:before<=line&&ly>line;
      const goingDown=lx<0?before<line&&ly>=line:before>line&&ly<=line;
      const canClimb=lx<0?floor%2===1:floor%2===0;
      if(goingUp&&canClimb&&floor<5)floor++;
      if(goingDown&&!canClimb&&floor>1)floor--;
    }
  }else{
    if(jump<=.08&&lowObstacle(x,y))return;
    const i=winterMap.buildings.findIndex(b=>accessibleBuilding(b)&&overBuilding(x,y,b,.13));
    if(i>=0){
      const b=winterMap.buildings[i],[lx,ly]=localPoint(b,x,y);
      if(!doorLane(b,lx,ly,1))return;
      if(Math.abs(ly)<b[4]/2){room=i;floor=1;}
    }else if(!outsideFree(x,y)||!sameRailSide(y,player.y))return;
    if(Math.abs(x-subway.x)<subway.width/2-.075&&player.y>=subway.y&&y<subway.y){room=stationIndex;floor=0;}
  }
  state.room=room;state.floor=floor;player.x=x;player.y=y;
}
function drawPassage(v){
  g.fillStyle='#22292a';g.fillRect(0,0,viewW,viewH);
  g.save();g.translate(viewW/2-v.x*v.z,viewH/2-v.y*v.z);g.scale(v.z,v.z);
  const half=subway.width/2;
  const path=[[subway.x-half,subway.y+.81],[subway.x+half,subway.y+.81],[subway.x+half,tunnelBend+half],[northStairs.x+half,tunnelBend+half],[northStairs.x+half,northStairs.y-.81],[northStairs.x-half,northStairs.y-.81],[northStairs.x-half,tunnelBend-half],[subway.x-half,tunnelBend-half]];
  g.beginPath();for(const [i,p] of path.entries())if(i)g.lineTo(...p);else g.moveTo(...p);
  g.closePath();g.fillStyle='#666963';g.fill();g.strokeStyle='#a29d87';g.lineWidth=.10;g.stroke();g.clip();
  fillMaterial(g,1,subway.x-half,northStairs.y-1,northStairs.x-subway.x+2,subway.y-northStairs.y+2,2.5,.17);
  for(const [flight,angle] of [[subway,0],[northStairs,Math.PI]]){
    g.save();g.translate(flight.x,flight.y);g.rotate(angle);
    drawFlight(g,0,0,flight.width,flight.length,true);g.restore();
  }
  for(const [x,y] of [[subway.x,37],[subway.x,tunnelBend],[northStairs.x,tunnelBend],[northStairs.x,32.7]]){
    const light=g.createRadialGradient(x,y,0,x,y,1);
    light.addColorStop(0,'rgba(246,210,143,.32)');light.addColorStop(1,'rgba(246,210,143,0)');
    ellipse(g,x,y,1,1,light);
  }
  g.restore();
}
const solidSectors=new Map();
function addSolid(x,y,w,h,a=0,key=null){
  const radius=Math.hypot(w,h)/2+.13;
  for(let j=Math.floor((y-radius)/3);j<=Math.floor((y+radius)/3);j++)
    for(let i=Math.floor((x-radius)/3);i<=Math.floor((x+radius)/3);i++){
      const id=i+','+j;if(!solidSectors.has(id))solidSectors.set(id,[]);
      solidSectors.get(id).push({x,y,w,h,c:Math.cos(a),s:Math.sin(a),key});
    }
}
function worldSolids(){
  for(const [id,x,y,w,h,a] of siteDetails)addSolid(x,y,id===2?.12:w*.87,id===2?.13:h*.77,a);
  for(const t of forest)addSolid(t.x,t.y,.16*t.size+.07,.16*t.size+.07);
  for(const [x,y] of [[99,15],[100,15.9],[102,18.8],[95.2,18.2]])addSolid(x,y,.46,1.93,1.96);
  for(const [x,y] of caches)addSolid(x,y,.31,.20,0,'cache'+caches.findIndex(p=>p[0]===x&&p[1]===y));
  for(const [x,y] of campfires)addSolid(x,y,.23,.23);
  for(const [x,y,r] of contamination)addSolid(x+r+.08,y+.07,.16,.10);
  for(const p of groundClutter)if(p.id===7)addSolid(p.x,p.y,p.size*.72,p.size*.10,p.angle);
}
function touchesSolid(x,y){
  return (solidSectors.get(Math.floor(x/3)+','+Math.floor(y/3))||[]).some(o=>{
    const dx=x-o.x,dy=y-o.y;
    return !(o.key&&state.searched[o.key])&&Math.abs(dx*o.c+dy*o.s)<o.w/2+.076&&Math.abs(dy*o.c-dx*o.s)<o.h/2+.076;
  });
}
function crateAction(key){
  return {name:'Вскрыть ящик',do(){(state.broken??={})[key]=true;effect('carve',.18);loot(key);}};
}

function settleSavedPosition(){
  const b=winterMap.buildings[state.room];
  const clear=(x,y)=>{
    if(state.floor===0&&b===stationBuilding)return tunnelFree(x,y);
    if(b)return insideFree(state.room,x,y)||doorLane(b,...localPoint(b,x,y),state.floor);
    if(lowObstacle(x,y))return false;
    return outsideFree(x,y)||winterMap.buildings.some(site=>accessibleBuilding(site)&&doorLane(site,...localPoint(site,x,y),1));
  };
  if(clear(player.x,player.y))return;
  for(let r=.12;r<=12;r+=.12){
    for(let k=0;k<32;k++){
      const a=k*Math.PI/16,x=player.x+r*Math.cos(a),y=player.y+r*Math.sin(a);
      if(clear(x,y)){
        state.x=player.x=camera.x=x;state.y=player.y=camera.y=y;return;
      }
    }
  }
}
