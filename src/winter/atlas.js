const atlas={x:W/2,y:H/2,scale:1},fingers=new Map();
function atlasZoom(value,px,py){
  const before=view();atlas.scale=clamp(value,1,8);const after=view();
  atlas.x=clamp(atlas.x+(px-viewW/2)*(1/before.z-1/after.z),0,W);
  atlas.y=clamp(atlas.y+(py-viewH/2)*(1/before.z-1/after.z),0,H);
  if(atlas.scale===1){atlas.x=W/2;atlas.y=H/2;}mapDrawn=false;
}
cv.addEventListener('wheel',e=>{if(wide){e.preventDefault();atlasZoom(atlas.scale*Math.exp(-.002*e.deltaY),e.clientX,e.clientY);}},{passive:false});
cv.addEventListener('pointerdown',e=>{if(!wide)return;fingers.set(e.pointerId,[e.clientX,e.clientY]);cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{
  if(!wide||!fingers.has(e.pointerId))return;
  const old=fingers.get(e.pointerId),other=[...fingers].find(([id])=>id!==e.pointerId)?.[1];
  if(other){
    const d0=Math.hypot(other[0]-old[0],other[1]-old[1]),d=Math.hypot(other[0]-e.clientX,other[1]-e.clientY);
    if(d0>3)atlasZoom(atlas.scale*d/d0,(e.clientX+other[0])/2,(e.clientY+other[1])/2);
  }else if(atlas.scale>1){
    atlas.x=clamp(atlas.x-(e.clientX-old[0])/view().z,0,W);atlas.y=clamp(atlas.y-(e.clientY-old[1])/view().z,0,H);mapDrawn=false;
  }
  fingers.set(e.pointerId,[e.clientX,e.clientY]);
});
cv.addEventListener('lostpointercapture',e=>fingers.delete(e.pointerId));
function liveMapPoints(v){
  for(const n of people){
    const life=actorLife(n);if(life.hp>0||state.clock-life.died>1440)continue;
    const [x,y]=screen(life.x,life.y,v);ellipse(g,x,y,2.6,2.6,'#777c7d');
  }
  for(const [i,pos] of caches.entries())if(state.searched['cache'+i]){
    const [x,y]=screen(...pos,v);g.strokeStyle='#296b6d';g.lineWidth=1.6;g.strokeRect(x-2,y-2,4,4);
  }
  person(v);
}
function snow(v){
  if(state.room>=0||wide)return;
  const wind=Math.sin(state.clock/26),intensity=Math.max(0,Math.sin(state.clock/38))*.95;
  for(let i=0;i<intensity*60;i++){
    const x=((i*191+state.clock*(12+wind*7)-v.x*11)%viewW+viewW)%viewW;
    const y=((i*107+state.clock*(18+i%6)-v.y*9)%viewH+viewH)%viewH;
    g.fillStyle='rgba(246,249,242,.65)';g.fillRect(x,y,1.4,1.8);
  }
}
