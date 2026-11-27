// A single set of photographed sashes serves both the flats and the smaller houses.
// Bay positions and wear are seeded with world coordinates, so they survive reloads.
function winterSash(g,u,y,w,h,take){
  const sheet=district.images.winterWindows,sw=sheet.width/3,sh=sheet.height/2;
  g.fillStyle='#302e28';g.fillRect(u-w/2-1,y-1,w+2,h+3);
  g.drawImage(sheet,take%3*sw+2,Math.floor(take/3)*sh+2,sw-4,sh-4,u-w/2,y,w,h);
  beam(g,u-w/2-1,y+h,u+w/2+1,y+h,2,'#b4b5a7');
}
function cabinDoors(){
  for(const h of HOUSES.filter(h=>h.cabin || h===fishingHouse)){
    for(const d of h.entrances){
      const cx=h.x*T+d.x,y=h.y*T+d.y,span=d.width+4;
      const gap=Math.min(span-6,44),jamb=(span-gap)/2;
      d.width=gap;
      for(const sign of [-1,1])interiorObject('doorJamb',cx+sign*(gap+jamb)/2,y-d.ny*7,jamb,14);
      const hinge=cx-gap/2;
      // The open leaf is folded out at the left jamb. Its edge projects into the yard.
      const leaf=interiorObject('openLeaf',hinge-3,y+d.ny*8,5,16);
      leaf.door=d;leaf.hingeX=hinge;leaf.hingeY=y;
    }
  }
}
function paintOpenLeaf(g,o,mapView=false){
  const x=o.hingeX,y=o.hingeY,dir=o.door.ny;
  const a=[x,y],b=[x-5,y+dir*17],height=36;
  const ta=raisedOffset(...a,height,mapView),tb=raisedOffset(...b,height,mapView);
  if(mapView){beam(g,...a,...b,3,'#5b4a3a');return;}
  const aa=[x+ta[0],y+ta[1]],bb=[b[0]+tb[0],b[1]+tb[1]];
  g.save();g.transform((bb[0]-aa[0])/32,(bb[1]-aa[1])/32,-ta[0]/48,-ta[1]/48,...aa);
  artFill(g,'floor_wood',0,0,32,48);g.fillStyle='#493d2f66';g.fillRect(0,0,32,48);
  for(const v of [6,39])beam(g,2,v,30,v,3,'#575042');
  beam(g,3,7,29,39,2,'#695a49');g.restore();
  beam(g,...aa,...bb,2,'#99907b');beam(g,...bb,...b,2,'#514b41');
}
function apartmentPorch(g,h){
  const door=h.entrances[0],x=h.x*T+door.x,y=h.y*T+door.y,w=door.width+2;
  packedSnow(g,x,y+15,w*.73,14,.44);
  for(let step=2;step>=0;step--){
    const half=w/2+step*1.4,v=y+step*4;
    artFill(g,'wall_concrete',x-half,v,half*2,5);
    beam(g,x-half,v+3,x+half,v+3,1.6,'#676760');
    beam(g,x-half+1,v,x+half,v,1,'#bdbfb6');
  }
  for(const sign of [-1,1])snowDrift(g,x+sign*w*.5,y+9,13,5,sign*.23,3+sign);
}
function winterFireBounce(g,fire,tint,dark){
  const flick=.94+.06*Math.sin(S.min*9);
  // The nearest coals illuminate the snow below seats and the cooking frame.
  // The larger penumbra still respects the buildings and fences in lightFootprint.
  const radius=fire===FIRE?136:124;
  const fall=g.createRadialGradient(fire.x,fire.y,2,fire.x,fire.y,radius);
  const color=tint?'248,161,79':'0,0,0',power=(tint?dark*.46:.85)*flick;
  for(const [at,fraction] of [[0,1],[.25,.78],[.5,.4],[.75,.1],[1,0]]){
    fall.addColorStop(at,'rgba('+color+','+power*fraction+')');
  }
  g.fillStyle=fall;g.fill(lightFootprint(fire,0,Math.PI,radius));
  softLamp(g,fire.x,fire.y+2,47,39,(tint?dark*.38:.64)*flick,tint?'255,167,77':'0,0,0');
}
function pitCover(g,x,y,w,h){
  // A workshop inspection pit, partly boarded over. The open end exposes the masonry
  // reveal, the bottom, and the short flight down from floor level.
  g.save();g.translate(x,y);
  artFill(g,'wall_concrete',-3,-3,w+6,h+6);
  g.fillStyle='#272a28';g.fillRect(0,0,w,h);
  artFill(g,'wall_brick',1,1,7,h-2);g.fillStyle='#3c39359c';g.fillRect(1,1,7,h-2);
  const fall=g.createLinearGradient(0,0,w,0);
  fall.addColorStop(0,'#0c1213b3');fall.addColorStop(.4,'#292b25a8');fall.addColorStop(1,'#54544d66');
  g.fillStyle=fall;g.fillRect(1,1,w-2,h-2);
  for(let i=0;i<5;i++){
    const v=3+i*4;artFill(g,'wall_concrete',3+i*.65,v,w-6-i,3);
    g.fillStyle='rgba(23,25,23,'+(.15+.12*i)+')';g.fillRect(3+i*.65,v,w-6-i,3);
  }
  const rand=mulberry32(857);
  for(let i=0;i<6;i++){
    const v=h-7-i*7.5;
    g.save();g.translate(w/2,v);g.rotate((rand()-.5)*.09);
    g.fillStyle='#171b19';g.fillRect(-w/2-1,1,w+3,8);
    g.drawImage(lookoutBoard(i+7,false),0,0,184,21,-w/2-2,-1,w+4,7);
    for(const u of [-w*.39,w*.39])shoreEllipse(g,u,2,.8,.65,'#3b3930');g.restore();
  }
  for(const u of [-1,w])beam(g,u,-2,u,h+2,1.7,'#797166');
  g.restore();
}
function drawBaseGate(g,p,mapView,shadow=false){
  const im=district.images.gate,x=p.x,y=p.y,dir=p.flip;
  // Both leaves hinge at the masonry piers and swing into the compound.
  const hinge=x+dir*9,at=y+2,endX=hinge+dir*32,endY=at+49;
  if(shadow){
    shoreEllipse(g,x+6,y+5,17,9,'#4a515343',.32);
    beam(g,hinge+6,at+6,endX+6,endY+7,2.4,'#4e545744');return;
  }
  if(mapView){beam(g,hinge,at,endX,endY,2.5,'#685d4c');}
  else{
    const [dx,dy]=raisedOffset(hinge,at,45),[ex,ey]=raisedOffset(endX,endY,45);
    g.save();g.transform((endX+ex-hinge-dx)/64,(endY+ey-at-dy)/64,-dx/36,-dy/36,hinge+dx,at+dy);
    g.drawImage(im,116,42,284,183,0,0,64,36);g.restore();
  }
  const [dx,dy]=winterParallax(x,y,45,mapView);
  g.drawImage(im,0,0,116,250,x-11+dx,y-40+dy,22,42);
}
function weatheredFlue(g,x,y,k,w,d,rise){
  const [bx,by]=residencePoint(x,y,k),[tx,ty]=residencePoint(x,y,k+rise*winterLens);
  const a=w*.46,b=d*.36;
  g.save();
  shoreEllipse(g,bx+3,by+3,a+5,b+4,'#4b4c465e',.27);
  // Folded flashing bedded into the roof; snow catches the upwind edge.
  g.beginPath();g.moveTo(bx-a-2,by-b-2);g.lineTo(bx+a+2,by-b-1);
  g.lineTo(bx+a+4,by+b+2);g.lineTo(bx-a-4,by+b+2);g.closePath();
  g.save();g.clip();artFill(g,'wall_concrete',bx-a-4,by-b-3,w+10,d+6);g.restore();
  beam(g,bx-a-3,by+b+2,bx+a+3,by+b+2,1.1,'#625748');
  g.beginPath();g.moveTo(bx-a,by);g.lineTo(tx-a,ty);g.ellipse(tx,ty,a,b,0,Math.PI,Math.PI*2);
  g.lineTo(bx+a,by);g.ellipse(bx,by,a,b,0,0,Math.PI);g.closePath();g.save();g.clip();
  const left=Math.min(tx,bx)-a-1,top=Math.min(ty,by)-b;
  const skin=district.images.mainPipe;
  g.translate(left,top);g.drawImage(skin,skin.width*.29,skin.height*.27,skin.width*.14,skin.height*.49,0,0,Math.abs(tx-bx)+2*a+2,Math.abs(ty-by)+2*b+1);
  g.restore();
  shoreEllipse(g,tx,ty,a+1,b+.7,'#847868');shoreEllipse(g,tx,ty+.2,a-.7,b-.6,'#353530');
  shoreEllipse(g,tx+.25,ty+.65,a-1.6,Math.max(1,b-1.5),'#222521');
  g.beginPath();g.ellipse(tx,ty,a+.75,b+.45,0,3.5,5.5);g.strokeStyle='#d8dad0';g.lineWidth=1.1;g.stroke();g.restore();
}
