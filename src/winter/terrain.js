// Original winter scenery, generated once per map. Camera movement only changes the sampled area.
const W=winterMap.width,H=winterMap.height;
function randomStream(seed){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function pathLine(g,points,close=false){
  g.beginPath();
  if(close){
    let last=points[points.length-1];g.moveTo((points[0][0]+last[0])/2,(points[0][1]+last[1])/2);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];g.quadraticCurveTo(...a,(a[0]+b[0])/2,(a[1]+b[1])/2);
    }
    g.closePath();return;
  }
  g.moveTo(...points[0]);
  for(let i=1;i<points.length-1;i++){
    const a=points[i],b=points[i+1];g.quadraticCurveTo(...a,(a[0]+b[0])/2,(a[1]+b[1])/2);
  }
  g.lineTo(...points[points.length-1]);
}
function stroke(g,points,color,width,closed=false){
  pathLine(g,points,closed);g.lineWidth=width;g.strokeStyle=color;g.stroke();
}
function ellipse(g,x,y,w,h,color){
  g.beginPath();g.ellipse(x,y,w,h,0,0,2*Math.PI);g.fillStyle=color;g.fill();
}
function groundArt(){
  const scale=16,c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;
  const g=c.getContext('2d'),r=randomStream(19701);
  g.scale(scale,scale);g.lineCap='round';g.lineJoin='round';
  g.fillStyle='#ced3d1';g.fillRect(0,0,W,H);
  for(let i=0;i<900;i++){
    const x=r()*W,y=r()*H,radius=1+r()*8,d=g.createRadialGradient(x,y,0,x,y,radius);
    d.addColorStop(0,i%3?'rgba(99,117,127,.20)':'rgba(253,245,221,.37)');d.addColorStop(1,'transparent');
    g.fillStyle=d;g.fillRect(x-radius,y-radius,2*radius,2*radius);
  }
  for(let i=0;i<54000;i++){
    const x=r()*W,y=r()*H;
    ellipse(g,x,y,.03+r()*.19,.025+r()*.055,i%2?'rgba(65,74,77,.11)':'rgba(255,255,247,.26)');
  }
  function weatheredSurface(id,x,y,w,h,size,opacity){
    const tile=surfaceTiles[id];if(!tile)return;
    const brush=document.createElement('canvas');brush.width=brush.height=144;
    const ctx=brush.getContext('2d');ctx.drawImage(tile,0,0,256,256,0,0,144,144);
    ctx.globalCompositeOperation='destination-in';
    const fade=ctx.createRadialGradient(72,72,15,72,72,72);fade.addColorStop(0,'#000');fade.addColorStop(1,'transparent');
    ctx.fillStyle=fade;ctx.fillRect(0,0,144,144);
    g.save();g.globalAlpha=opacity;
    for(let yy=y;yy<y+h+size;yy+=size*.44)for(let xx=x;xx<x+w+size;xx+=size*.44){
      g.save();g.translate(xx+r()*size*.22,yy+r()*size*.22);g.rotate(r()*6.28);g.drawImage(brush,-size/2,-size/2,size,size);g.restore();
    }
    g.restore();
  }
  weatheredSurface(0,0,0,W,H,7,.78);
  function basin(points,lake){
    pathLine(g,points,true);g.fillStyle=lake?'#8eaaae':'#a8b0a3';g.fill();
    g.save();g.clip();
    for(let i=0;i<(lake?6800:5400);i++){
      const x=r()*W,y=r()*65;
      if(lake){
        stroke(g,[[x,y],[x+.25+r(),y-.07-r()*.23]],'rgba(219,234,231,.25)',.055+r()*.08);
      }else{
        stroke(g,[[x-.1,y+.14],[x,y],[x-.05,y-.22-r()*.45]],i%3?'#99947f':'#777b6e',.07);
      }
    }
    if(lake){
      weatheredSurface(3,32,2,72,27,7,.95);
      for(let i=0;i<220;i++){
        let x=32+r()*71,y=3+r()*26,a=r()*6.28,points=[[x,y]];
        for(let j=0;j<4;j++){a+=(r()-.5)*1.3;x+=Math.cos(a)*(.3+r()*1.6);y+=Math.sin(a)*(.3+r()*1.6);points.push([x,y]);}
        stroke(g,points,'rgba(213,231,231,.48)',.045+r()*.065);
      }
    }
    g.restore();stroke(g,points,lake?'#c0cfcf':'#bdc6bb',.68,true);
  }
  basin(winterMap.lake,true);basin(winterMap.marsh,false);
  for(const road of winterMap.roads){
    stroke(g,road.points,'#b8c0c1',road.width+.36);stroke(g,road.points,'#e0e0d7',road.width);
    for(const side of [-1,1]){
      const rut=road.points.map(([x,y],i,p)=>{
        const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],k=side*road.width*.24/Math.hypot(b[0]-a[0],b[1]-a[1]);
        return [x-(b[1]-a[1])*k,y+(b[0]-a[0])*k];
      });
      stroke(g,rut,'#b9bdbc',.10);
    }
  }
  // Snow and grit break up the edge of each road without tile-sized hard cuts.
  for(const road of winterMap.roads){
    for(let j=1;j<road.points.length;j++){
      const a=road.points[j-1],b=road.points[j],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
      for(let k=0;k<len*40;k++){
        const t=r(),off=(r()-.5)*road.width*1.24,x=a[0]+dx*t-dy/len*off,y=a[1]+dy*t+dx/len*off;
        ellipse(g,x,y,.02+r()*.12,.02+r()*.07,k%3?'rgba(119,123,120,.18)':'rgba(245,242,226,.50)');
      }
    }
  }
  for(const [a,b] of winterMap.tracks){
    stroke(g,[a,b],'#949a98',.65);
    for(let x=.1;x<W;x+=sleeperSpacing){g.fillStyle='#726f62';g.fillRect(x,a[1]-sleeperLength/2,.09,sleeperLength);}
    for(const off of [-trackGauge/2,trackGauge/2]){
      stroke(g,[[0,a[1]+off],[W,a[1]+off]],'#525c5f',.079);
    }
  }
  return c;
}
function polygonContains(points,x,y){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function clearance(x,y,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
function overBuilding(x,y,b,pad=0){
  const [,bx,by,w,h,a]=b,c=Math.cos(a),s=Math.sin(a);
  return Math.abs((x-bx)*c+(y-by)*s)<w/2+pad && Math.abs((y-by)*c-(x-bx)*s)<h/2+pad;
}
function woods(){
  const r=randomStream(3160),trees=[];
  for(let i=0;i<10000;i++){
    const x=r()*W,y=r()*H,size=.38+r()*.77;
    if((y>railNorth-size*1.4-.35 && y<railSouth+size*1.4+.35) || polygonContains(winterMap.lake,x,y)||polygonContains(winterMap.marsh,x,y))continue;
    if(winterMap.buildings.some(b=>overBuilding(x,y,b,1.4)))continue;
    if(winterMap.roads.some(({points,width})=>points.slice(1).some((b,i)=>clearance(x,y,points[i],b)<width/2+1.2)))continue;
    const clearing=(x>81&&x<116&&y>42&&y<70)||(x>43&&x<92&&y>86&&y<109)||(x>98&&x<123&&y<30)||(x>51&&x<91&&y>28&&y<40);
    if(clearing && r()<.966)continue;
    if(Math.sin(x*.17)*Math.sin(y*.19)+r()<.25)continue;
    trees.push({x,y,size,id:Math.floor(r()*18)});
  }
  return trees.sort((a,b)=>a.y-b.y);
}
function treeArt(id){
  const c=document.createElement('canvas');c.width=c.height=120;
  const g=c.getContext('2d'),r=randomStream(id*143+75);
  g.translate(58,58);ellipse(g,8,7,36,29,'rgba(52,66,72,.17)');
  if(id<14){
    for(let layer=0;layer<4;layer++){
      const len=45-layer*9;
      for(let j=0;j<13;j++){
        const a=j*.483+layer*.24+r()*.15,l=len*(.68+r()*.31);
        g.save();g.rotate(a);g.fillStyle=['#475955','#55655d','#6a796e','#89958a'][layer];
        g.beginPath();g.moveTo(-2,-3);g.lineTo(l*.57,-l*.16);g.lineTo(l,0);g.lineTo(l*.48,l*.15);g.closePath();g.fill();
        g.fillStyle=['#acbab7','#becac7','#ced5d0','#e0e2d9'][layer];
        g.beginPath();g.moveTo(0,-1);g.lineTo(l*.54,-l*.13);g.lineTo(l*.9,-.5);g.lineTo(l*.47,l*.03);g.fill();g.restore();
      }
    }
  }else{
    for(let j=0;j<15;j++){
      let x=0,y=0,a=r()*6.28;
      for(let k=0;k<3;k++){
        const bx=x+Math.cos(a)*(6+r()*10),by=y+Math.sin(a)*(6+r()*10);
        stroke(g,[[x,y],[bx,by]],'#696b64',2.6-k*.55);stroke(g,[[x-1,y-1],[bx-1,by-1]],'#dce1d9',1.2);
        const twist=a+(r()-.5)*2.3;stroke(g,[[bx,by],[bx+8*Math.cos(twist),by+8*Math.sin(twist)]],'#8e9691',.9);
        x=bx;y=by;a+=(r()-.5)*1.2;
      }
    }
  }
  return c;
}

// Sample the same quadratic path used to draw the marsh bank.
const marshShore=winterMap.marsh.flatMap((b,i,pts)=>{
  const a=pts[(i+pts.length-1)%pts.length],c=pts[(i+1)%pts.length];
  return Array.from({length:12},(_,j)=>{
    const t=j/12,k=1-t;
    return [0,1].map(d=>k*k*(a[d]+b[d])/2+2*k*t*b[d]+t*t*(b[d]+c[d])/2);
  });
});
