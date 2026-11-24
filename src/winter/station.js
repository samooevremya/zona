// Station architecture uses plan dimensions in the same coordinates as the character.
const stationIndex=winterMap.buildings.findIndex(b=>b[0]==='station');
const stationBuilding=winterMap.buildings[stationIndex];
const railNorth=33.06,railSouth=37.55;
const subway={x:70,y:39.10,width:2.9*metre,length:4.05*metre};
const stationPortals=[
  {side:'Площадь у озера',world:worldPoint(stationBuilding,0,-stationBuilding[4]/2-.27),room:worldPoint(stationBuilding,0,-stationBuilding[4]/2+.32)},
  {side:'Переход в Берёзки',world:[subway.x,subway.y+subway.length/2+.02],room:worldPoint(stationBuilding,-3.6,.72)},
  {side:'Железнодорожная платформа',world:door(stationBuilding,true),room:door(stationBuilding,false)}
];
function sameRailSide(y,py){
  const band=v=>v<railNorth?-1:v>railSouth?1:0;
  return band(y)===band(py);
}
function tunnelBlocked(x,y){
  const {width,length}=subway,dx=Math.abs(x-subway.x),at=y-subway.y;
  if(at< -length/2-.09||at>length/2+.09||dx>width/2+.09)return false;
  return dx>width/2-.073||at< -length/2+.18;
}
function railFenceRun(v,x0,x1,y){
  const lo=Math.max(x0,v.x-viewW/(2*v.z)-.7),hi=Math.min(x1,v.x+viewW/(2*v.z)+.7);
  if(hi<=lo)return;
  stroke(g,[[lo,y+.045],[hi,y+.045]],'rgba(52,59,60,.38)',.09);
  if(wide){stroke(g,[[lo,y],[hi,y]],'#647070',.10);return;}
  g.save();g.beginPath();g.rect(lo,y-.28,hi-lo,.32);g.clip();
  for(let x=Math.floor((lo-.2)/.14)*.14;x<hi;x+=.14){
    stroke(g,[[x,y],[x+.17,y-.24]],'#737d79',.012);
    stroke(g,[[x,y-.24],[x+.17,y]],'#727b79',.012);
  }
  stroke(g,[[lo,y-.25],[hi,y-.25]],'#8e9690',.025);
  for(let x=Math.ceil(lo/1.03)*1.03;x<hi;x+=1.03){
    stroke(g,[[x,y],[x-.018,y-.27]],'#525b59',.046);
    stroke(g,[[x-.014,y-.27],[x+.018,y-.27]],'#dbe0d9',.023);
  }
  g.restore();
}
function railwayFence(v){
  const [,x,,w]=stationBuilding;
  railFenceRun(v,0,x-w/2,railNorth);railFenceRun(v,x+w/2,W,railNorth);
  railFenceRun(v,0,W,railSouth);
  if(Math.abs(subway.x-v.x)>viewW/v.z/2+2||Math.abs(subway.y-v.y)>viewH/v.z/2+2)return;
  g.save();g.translate(subway.x,subway.y);
  const l=-subway.width/2,t=-subway.length/2;
  contactShade(g,.10,.06,-l+.27,-t+.16,.50);
  g.fillStyle='#797b73';g.fillRect(l-.045,t-.04,-2*l+.09,-2*t+.15);
  // A paved landing and progressively darker risers lead into the buried passage.
  g.fillStyle='#999c92';g.fillRect(l,-t,-2*l,.36);
  if(furnishingAtlas.naturalWidth)
    g.drawImage(furnishingAtlas,44,450,150,21,l,-t,-2*l,.36);
  drawFlight(g,0,0,-2*l,-2*t,true);
  g.fillStyle='#333a39';g.fillRect(l+.08,t+.10,-2*l-.16,.22);
  g.fillStyle='#777e77';g.fillRect(l-.025,t-.065,-2*l+.05,.22);
  if(furnishingAtlas.naturalWidth)
    g.drawImage(furnishingAtlas,42,450,157,19,l-.025,t-.065,-2*l+.05,.22);
  g.fillStyle='#c7cac0';g.fillRect(l-.025,t-.073,-2*l+.05,.035);
  for(const side of [-1,1]){
    const x=side*(-l-.005);
    g.fillStyle='#737871';g.fillRect(x-.055,t,.11,-2*t+.03);
    if(furnishingAtlas.naturalWidth)
      g.drawImage(furnishingAtlas,34,271,12,151,x-.055,t,.11,-2*t+.03);
    stroke(g,[[x-.014,t-.02],[x-.014,-t-.02]],'#bec3b8',.031);
    for(let j=0;j<4;j++){
      const y=t+.2+j*(-2*t-.27)/3;
      stroke(g,[[x,y],[x-.042,y-.13]],'#535957',.031);
    }
    stroke(g,[[x-.042,t+.07],[x-.042,-t-.20]],'#4c5655',.038);
    stroke(g,[[x-.05,t+.07],[x-.05,-t-.2]],'#b5b9ae',.012);
  }
  g.restore();
}
let platformSurface;
function stationPlatform(ctx,v){
  const x=53.3,y=33.52,w=33.55,h=1.01;
  if(v.x+viewW/(2*v.z)<x||v.x-viewW/(2*v.z)>x+w||Math.abs(v.y-y)>viewH/(2*v.z)+h)return;
  if(!platformSurface){
    platformSurface=document.createElement('canvas');
    platformSurface.width=Math.ceil(w*96);platformSurface.height=Math.ceil((h+.04)*96);
    const layer=platformSurface.getContext('2d');layer.scale(96,96);
    paintPlatformSlabs(layer,0,0,w,h);
  }
  ctx.drawImage(platformSurface,x,y,platformSurface.width/96,platformSurface.height/96);
}
function paintPlatformSlabs(ctx,x,y,w,h){
  ctx.fillStyle='#6e746f';ctx.fillRect(x,y,w,h);
  fillMaterial(ctx,0,x,y,w,h,3.72,.21);
  const rand=randomStream(90435);
  for(let n=0;n<430;n++){
    const px=x+rand()*w,py=y+rand()*h;
    ctx.fillStyle=n%4?'rgba(53,58,53,.13)':'rgba(227,226,209,.29)';
    ctx.fillRect(px,py,.008+rand()*.04,.009+rand()*.015);
  }
  for(let n=0;n<w;n+=.85){
    ctx.fillStyle='rgba(72,78,74,.35)';ctx.fillRect(x+n,y,.017,h);
  }
  ctx.fillStyle='#aaa99a';ctx.fillRect(x,y+h-.15,w,.035);
  ctx.fillStyle='#484f4d';ctx.fillRect(x,y+h-.04,w,.055);
}
function stationHouse(ctx,w,h,ox,oy){
  const l=-w/2,t=-h/2,base=h/2,wallTop=base-1.17;
  const bays=10,bay=w/bays;
  // Use masonry and joinery from the same winter building sheet as the other houses.
  // Repeat architectural bays at a fixed pitch; the main door has its own opening.
  for(let j=0;j<bays;j++){
    const x=l+j*bay;
    ctx.drawImage(objectsImage,48,158,49,60,x,wallTop,bay+.004,base-wallTop);
    ctx.drawImage(objectsImage,38,157,8,60,x-.035,wallTop,.13,base-wallTop);
  }
  ctx.drawImage(objectsImage,98,141,61,78,-.77,base-1.28,1.54,1.28);
  const reveal=ctx.createLinearGradient(0,wallTop,0,base);
  reveal.addColorStop(0,'rgba(32,37,35,.46)');reveal.addColorStop(.65,'rgba(32,37,35,.08)');
  reveal.addColorStop(1,'rgba(32,37,35,.20)');ctx.fillStyle=reveal;
  ctx.fillRect(l,wallTop,w,base-wallTop);
  ctx.drawImage(furnishingAtlas,48,355,147,70,-.35,base-.02,.70,.22);
  if(roofAtlas.naturalWidth){
    ctx.drawImage(roofAtlas,0,0,roofAtlas.width,roofAtlas.height/2,l-.075+ox,t-.27+oy,w+.15,h+.14);
  }
}
