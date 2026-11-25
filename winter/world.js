"use strict";
window.world = (() => {
  const width = 320, height = 300, squash = 0.70;
  const gate = {x:158,y:265}, entrance = {x:158,y:98};
  // Each door opens into the same station interior. The north door is the
  // head of the pedestrian underpass; the platform lies inside the rail fence.
  const stationDoors = {
    south:{x:158,y:97.45}, platform:{x:172,y:90.95}, north:{x:172,y:79.7}
  };
  const railFencesY = [82.5,93];
  const railsY = [86,89];
  const forestRoute = [[158,245],[145,235],[134,215],[129,190],[122,175],[122,155],[132,133],[146,122],[158,113]];
  const controls = [
    [[158,294],[158,265],[158,245],[161,210],[161,179],[158,140],[158,113],[158,98]],
    [[161,210],[131,201],[108,184],[91,181],[72,191],[52,205],[33,209]],
    [[160,166],[191,163],[216,148],[232,142],[261,141],[287,129]],
    [[158,102],[132,104],[107,101],[85,102],[62,97],[40,94]],
    [[172,79.7],[150,77],[130,74],[99,73],[84,74.6],[73,73.2],[56,54],[35,51]],
    [[172,79.7],[199,76],[223,69],[249,60],[264,61.8],[281,63.8],[293,60]],
    [[216,148],[217,168],[222,175],[235,176],[252,176],[263,170]],
    [[158,269],[145,278],[128,279],[110,269]],
    [[158,269],[181,276],[200,269]],
    forestRoute
  ];
  // Smooth the survey points once; rendering, collision clearance and the map
  // follow the same centreline. Rounded ends meet the centre of the next road.
  function smoothPath(points) {
    let curve=points;
    for(let pass=0;pass<3;pass++){
      const next=[curve[0]];
      for(let i=1;i<curve.length;i++){
        const a=curve[i-1],b=curve[i];
        next.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],
                  [a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);
      }
      next.push(curve.at(-1));curve=next;
    }
    return curve;
  }
  const roads=controls.map(smoothPath);
  const forest=roads.at(-1);
  const places = [
    ['Станция «Сотый километр»',158,94],['Разрушенная военная база',158,276],
    ['Замёрзшее озеро',158,40],['Рыбацкий посёлок',272,52],['Охотничья вышка',36,47],
    ['Склад',83,67],['Замёрзшее болото',62,139],['Старая водокачка',97,187],['Берёзки',236,157]
  ];
  const points = [];
  function add(type,x,y,w,extra={}) { points.push({type,x,y,w,...extra}); }
  function house(type,x,y,w,name,solidW,solidD,heated=false) {add(type,x,y,w,{name,solidW,solidD,heated});}
  house('station',158,96,24,'Станция',21,7,true);
  house('ruin',143,269,14,'Казарма',11,4); house('ruin',178,271,20,'Ангар',17,7);
  house('shed',132,289,12,'Ремонтный цех',10,4); house('ruin',175,294,20,'Цех',16,7);
  house('shed',84,70,14,'Склад',12,5,true); house('tower',36,50,4.5,'Охотничья вышка',2,2);
  house('tower',97,187,5,'Водокачка',3,3);house('shed',102,191,7,'Насосная',6,3,true);
  house('block',237,139,28,'Берёзки · северный дом',25,8,true);house('block',240,171,28,'Берёзки · южный дом',25,8,true);
  [[259,55],[274,48],[282,59],[285,39],[268,33],[39,214],[33,202],[55,208]].forEach(([x,y])=>house('cabin',x,y,7.2,'Жилой дом',5.5,3,true));
  [[150,100],[152,264],[147.7,235],[124.9,172.3],[87,73],[260,59],[225,148]].forEach(([x,y])=>add('fire',x,y,1.7));
  for(const x of [143,149,165,171])add('fence',x,265,5.7);
  for(const x of [120,125,130,135,183,188,193,198])add('fence',x,265,5);
  for(const y of railFencesY)for(let x=0;x<width;x+=5){
    // The south barrier joins the structural wall at each side of the station.
    // Collision remains continuous across the entire railway embankment.
    if(y===93 && x>=150 && x+5<=165)continue;
    add('railFence',x+2.5,y,5);
  }
  add('passage',172,78.7,3.7,{solidW:3.0,solidD:1.8,label:'ПЕРЕХОД'});
  add('passage',172,91.9,3.7,{solidW:3.0,solidD:.32,label:'ВОКЗАЛ',back:true});
  for(const x of [139,149,170,180])add('lamp',x,92,1);
  add('lamp',167,100,1); add('lamp',162.6,115,1);
  add('sign',153.9,243.4,2.6,{label:'← ЛЕСНАЯ ТРОПА'});
  add('sign',163.2,239,2.3,{label:'СТАНЦИЯ'});
  [['crates',151.6,268,2.8],['barrels',166.6,266.2,1.6],['sleepers',149,259.3,3.5],['truck',169.5,259,4.8],
   ['bush',161.8,262,1.6],['bush',153.1,256.5,2.2],['crates',173,277,2.7],['sleepers',148,100,3],['crates',164,98,2.1],
   ['barrels',166,95.8,1.5],['sleepers',91,73,3],['crates',99,191.8,2.2],['truck',232,148.9,4.9]].forEach(([a,b,c,d])=>add(a,b,c,d));
  add('sign',162.6,264,1.8,{label:'СТАНЦИЯ'});add('sign',155,100,1.7,{label:'100 КМ'});
  let seed=147881;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function distanceToLine(x,y,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
  }
  const lake=(x,y)=>((x-157)/83)**2+((y-43)/32)**2<1;
  const marsh=(x,y)=>((x-62)/33)**2+((y-139)/22)**2<1;
  function nearRoad(x,y,margin) {return roads.some(r=>r.some((p,i)=>i&&distanceToLine(x,y,r[i-1],p)<margin));}
  const buildings=points.filter(o=>o.name);
  const reservedStation=(x,y)=>x>=143&&x<=184&&y>=75&&y<=100;
  function routeDistance(x,y,path) {
    let nearest=Infinity;
    for(let i=1;i<path.length;i++)nearest=Math.min(nearest,distanceToLine(x,y,path[i-1],path[i]));
    return nearest;
  }
  function shelter(x,y){
    if(x<112||x>167||y<105||y>253)return 0;
    const d=routeDistance(x,y,forest);
    const ends=Math.max(0,Math.min(1,(y-113)/10,(245-y)/10));
    return Math.max(0,Math.min(1,(7-d)/3.5))*ends;
  }
  function marshDepth(x,y){
    const radius=Math.hypot((x-62)/33,(y-139)/22);
    return Math.min(1,Math.max(0,(1-radius)*3.4));
  }
  for(let i=0;i<3800;i++){
    const x=rand()*width,y=rand()*height;
    if(Math.abs(y-88)<6.2 || reservedStation(x,y) || lake(x,y)||marsh(x,y)||nearRoad(x,y,4) || buildings.some(b=>Math.abs(b.x-x)<b.w*.64+3 && y>b.y-b.solidD-6 && y<b.y+4))continue;
    if((x>118&&x<200&&y>261)||(x>213&&x<266&&y>127&&y<175))continue;
    if(rand()>.55+.30*Math.sin(.10*x+.13*y))continue;
    add('tree',x,y,3+rand()*4,{flip:rand()<.5,solidW:.55,solidD:.55});
  }
  // A double belt of spruce forms a windbreak on the longer footpath.
  let lastTree;
  for(let i=1;i<forest.length-1;i++){
    const a=forest[i],b=forest[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(!length || (lastTree&&Math.hypot(a[0]-lastTree[0],a[1]-lastTree[1])<3.0))continue;
    lastTree=a;
    for(const side of [-1,1]){
      const offset=side*(4+rand()*2.5);
      const x=a[0]-(b[1]-a[1])*offset/length, y=a[1]+(b[0]-a[0])*offset/length;
      if(nearRoad(x,y,3.0)||points.some(o=>o.type==='fire'&&Math.hypot(o.x-x,o.y-y)<3.8))continue;
      add('tree',x,y,3.8+rand()*2.5,{flip:rand()<.5,solidW:.6,solidD:.6});
    }
  }
  [[148,256],[167,254],[146,260],[170,261],[150,247],[167,242],[144,245],[147,115],[169,108]].forEach(([x,y],i)=>add('tree',x,y,4+i%3,{flip:!!(i%2),solidW:.55,solidD:.55}));
  for(let i=0;i<340;i++){const x=rand()*width,y=rand()*height;if(!lake(x,y)&&!nearRoad(x,y,2.8)&&Math.abs(y-87.5)>4)add('bush',x,y,.9+rand()*1.4,{flip:rand()<.5});}
  // Keep the turn sign and the first warm shelter visible through the spruce.
  const sightlines=[{x:153.9,y:243.4},{x:147.7,y:235}];
  for(let i=points.length-1;i>=0;i--){
    const o=points[i];
    if(o.type==='tree'&&sightlines.some(s=>Math.abs(o.x-s.x)<o.w*.48+1.0&&o.y>s.y-1&&o.y<s.y+o.w*1.8))points.splice(i,1);
  }
  const rough=[];
  for(let i=0;i<5500;i++)rough.push([rand()*width,rand()*height,.10+rand()*.8,rand()]);
  const hulls={barrels:[.80,.55],crates:[.84,.55],truck:[.65,.58],sleepers:[.80,.38],
    lamp:[.15,.16],sign:[.12,.10],fence:[1,.06],fire:[.64,.28]};
  for(const o of points)if(hulls[o.type]){
    o.solidW=o.w*hulls[o.type][0];o.solidD=o.w*hulls[o.type][1];
  }
  // Sparse broad phase keeps collision and front/back tests cheap on phones.
  const colliders=new Map(), indexCell=12;
  const cellKey=(cx,cy)=>cx+cy*32;
  for(const o of points)if(o.solidW){
    for(let cx=Math.floor((o.x-o.solidW/2-.24)/indexCell);cx<=Math.floor((o.x+o.solidW/2+.24)/indexCell);cx++)
      for(let cy=Math.floor((o.y-o.solidD-.24)/indexCell);cy<=Math.floor((o.y+.24)/indexCell);cy++){
        const key=cellKey(cx,cy);if(!colliders.has(key))colliders.set(key,[]);colliders.get(key).push(o);
      }
  }
  const assets={};
  for(const id of ['ground','station','ruin','cabin','tree','shed','block','road','fire','crates','barrels','sleepers','truck','bush']) {const im=new Image(); im.src='art/'+id+(id==='ground'?'.jpg':'.webp'); assets[id]=im;}
  function visibleImage(im){return im?.complete && im.naturalWidth>0;}
  const pad=1;
  function blocked(x,y) {
    if(x<pad||y<pad||x>width-pad||y>height-pad)return true;
    if(railFencesY.some(f=>Math.abs(y-f)<.36))return true;
    const local=colliders.get(cellKey(Math.floor(x/indexCell),Math.floor(y/indexCell)));
    return !!local?.some(o=>Math.abs(x-o.x)<o.solidW/2+.22&&y>o.y-o.solidD-.22&&y<o.y+.22);
  }
  function line(c,coords,color,w){c.beginPath(); for(const [i,p] of coords.entries()){if(i)c.lineTo(...p);else c.moveTo(...p);}c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function polygon(c,pts,color){c.fillStyle=color;c.beginPath();for(const [i,p] of pts.entries()){if(i)c.lineTo(...p);else c.moveTo(...p);}c.closePath();c.fill();}
  let terrain, texture;
  function buildTerrain(){
    const k=7;
    terrain=document.createElement('canvas');terrain.width=width*k;terrain.height=height*k;
    const c=terrain.getContext('2d');c.scale(k,k);
    c.lineCap='round';c.lineJoin='round';
    c.save();c.translate(157,43);c.scale(83,32);
    const ice=c.createRadialGradient(-.07,-.15,.1,0,0,1);
    ice.addColorStop(0,'#93a9b5');ice.addColorStop(.72,'#a4b8c2');ice.addColorStop(.96,'#b9cad1');ice.addColorStop(1,'rgba(209,218,219,.25)');
    oval(c,0,0,1,1,ice);c.restore();
    c.save();c.beginPath();c.ellipse(157,43,82.6,31.8,0,0,Math.PI*2);c.clip();
    for(let i=0;i<1700;i++){
      const x=74+rand()*166,y=11+rand()*64,span=.15+rand()*2.8;
      line(c,[[x,y],[x+span*.45,y-.08],[x+span,y-.18]],i%5?'rgba(227,238,238,.25)':'rgba(93,129,146,.20)',.045+rand()*.13);
    }
    for(let i=0;i<128;i++){
      let x=74+rand()*166,y=11+rand()*64,angle=rand()*Math.PI*2;
      const pts=[[x,y]];
      for(let j=0;j<5;j++){
        angle+=(rand()-.5)*1.1;const span=.35+rand()*1.43;
        x+=span*Math.cos(angle);y+=span*Math.sin(angle);pts.push([x,y]);
        if(j===2)line(c,[[x,y],[x+Math.cos(angle+1.1)*.65,y+Math.sin(angle+1.1)*.65],
          [x+Math.cos(angle+.83)*1.36,y+Math.sin(angle+.83)*1.36]],'rgba(229,239,241,.72)',.09);
      }
      line(c,pts,'rgba(89,116,130,.64)',.13);line(c,pts,'#d0dfe4',.075);
    }c.restore();
    c.save();c.translate(62,139);c.scale(33,22);
    const peat=c.createRadialGradient(0,0,0,0,0,1);
    peat.addColorStop(0,'#717e7d');peat.addColorStop(.52,'#909b96');peat.addColorStop(.81,'#aeb7af');peat.addColorStop(1,'rgba(195,201,192,.34)');
    oval(c,0,0,1,1,peat);c.restore();
    c.save();c.beginPath();c.ellipse(62,139,32.7,21.8,0,0,Math.PI*2);c.clip();
    for(let i=0;i<580;i++){
      const x=29+66*rand(),y=117+44*rand(),d=marshDepth(x,y);if(d<=0)continue;
      const span=.24+rand()*1.55,wide=.07+rand()*.23;
      c.save();c.translate(x,y);c.rotate((rand()-.5)*.5);
      oval(c,0,0,span,wide,'rgba(59,76,77,'+(.14+.20*d)+')');
      line(c,[[-span*.88,wide*.45],[-span*.32,wide*.90],[span*.23,wide*.82],[span*.6,wide*.5]],'rgba(218,225,217,.48)',.06);
      c.restore();
      if(i%4)continue;
      for(let j=0;j<3+Math.floor(rand()*3);j++){
        const base=x+(rand()-.5)*.7,tip=base+(rand()-.5)*.47,h=.32+rand()*.61;
        line(c,[[base,y],[tip,y-h]],'#79735f',.060);
        if(j%2===0){line(c,[[tip,y-h],[tip+.012,y-h-.15]],'#655b49',.092);}
      }
    }c.restore();
    c.lineJoin='round';c.lineCap='round';
    for(const [x,y,s,n] of rough){
      if(lake(x,y))continue;
      if(marsh(x,y)){line(c,[[x-.1,y],[x+s*.25,y-s]],'#7f8172',.09);continue;}
      oval(c,x,y,s,s*.21,n>.55?'rgba(78,84,77,.15)':'rgba(250,250,242,.42)');
      if(n>.89){line(c,[[x-.28,y-.5],[x,y],[x+.15,y-.6]],'#878778',.08);}
    }
    for(const y of railsY){c.fillStyle='#8a8f8c';c.fillRect(0,y-1.15,width,2.3);
      for(let x=0;x<width;x+=.78){c.fillStyle=x%2<1?'#646563':'#74716b';c.fillRect(x,y-.97,.29,1.94);c.fillStyle='#d3d6d1';c.fillRect(x+.04,y-.94,.18,.38);}
      for(const dy of [-.66,.66]){c.fillStyle='#505454';c.fillRect(0,y+dy,width,.17);c.fillStyle='#c3c6c4';c.fillRect(0,y+dy,width,.065);}
    }
  }
  /* The road surface is a continuous distance field. Ruts and compacted snow
     have one coverage value per pixel even where routes cross. World-space
     texture coordinates keep the grain continuous through curves and forks. */
  const tileSize=16, density=24, tilePixels=tileSize*density;
  const roadBuckets=new Map(), roadTiles=new Map();
  function roadKey(tx,ty){return tx+ty*32;}
  for(const [route,path] of roads.entries()){
    const narrow=route===roads.length-1, radius=narrow?1.05:route===0?3.12:2.35;
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i], dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if(length<.001)continue;
      const margin=radius+.65;
      const seg={x:a[0],y:a[1],ux:dx/length,uy:dy/length,length,radius,narrow,
        minX:Math.min(a[0],b[0])-margin,maxX:Math.max(a[0],b[0])+margin,
        minY:Math.min(a[1],b[1])-margin,maxY:Math.max(a[1],b[1])+margin};
      for(let tx=Math.floor(seg.minX/tileSize);tx<=Math.floor(seg.maxX/tileSize);tx++)
        for(let ty=Math.floor(seg.minY/tileSize);ty<=Math.floor(seg.maxY/tileSize);ty++){
          const key=roadKey(tx,ty);if(!roadBuckets.has(key))roadBuckets.set(key,[]);roadBuckets.get(key).push(seg);
        }
    }
  }
  let grit;
  function readGrit(){
    if(!visibleImage(assets.road))return false;
    const sample=document.createElement('canvas'); sample.width=128;sample.height=128;
    const sc=sample.getContext('2d',{willReadFrequently:true});
    sc.drawImage(assets.road,250,225,125,125,0,0,128,128);
    try{grit=sc.getImageData(0,0,128,128).data;}catch{
      // Browsers may forbid sampling images from a local file URL.
      grit=new Uint8ClampedArray(128*128*4);
      let grain=41;for(let i=0;i<grit.length;i+=4){grain=(Math.imul(1664525,grain)+1013904223)>>>0;grit[i]=112+(grain>>>25);grit[i+1]=grit[i];grit[i+2]=grit[i];}
    }
    return true;
  }
  function roadTile(tx,ty,segments){
    const px=tilePixels,ox=tx*tileSize,oy=ty*tileSize;
    // Include one adjacent pixel on all sides for the canvas resampling filter.
    const side=px+2,total=side*side,body=new Float32Array(total),rut=new Float32Array(total);
    for(const s of segments){
      const x0=Math.max(0,Math.floor((s.minX-ox)*density)),x1=Math.min(side-1,Math.ceil((s.maxX-ox)*density)+2);
      const y0=Math.max(0,Math.floor((s.minY-oy)*density)),y1=Math.min(side-1,Math.ceil((s.maxY-oy)*density)+2);
      const wheel=s.radius*.48,band=s.narrow?.26:.51;
      for(let iy=y0;iy<=y1;iy++){
        const yy=oy+(iy-.5)/density-s.y;
        for(let ix=x0;ix<=x1;ix++){
          const xx=ox+(ix-.5)/density-s.x,t=Math.max(0,Math.min(s.length,xx*s.ux+yy*s.uy));
          const ax=xx-s.ux*t,ay=yy-s.uy*t,d2=ax*ax+ay*ay;
          if(d2>(s.radius+.65)**2)continue;
          const d=Math.sqrt(d2),j=iy*side+ix;
          body[j]=Math.max(body[j],(s.radius+.45-d)/(s.narrow?.72:1.12));
          // Use signed distance to the infinite tangent for these bands, and
          // taper off past the end; this avoids ring-shaped caps on each knot.
          const radial=Math.abs(xx*s.uy-yy*s.ux);
          const beyond=Math.abs((xx*s.ux+yy*s.uy)-t);
          const tread=(1-Math.abs(radial-(s.narrow?0:wheel))/band)*Math.max(0,1-beyond/.5);
          rut[j]=Math.max(rut[j],tread);
        }
      }
    }
    const tile=document.createElement('canvas');tile.width=side;tile.height=side;
    const tc=tile.getContext('2d'),img=tc.createImageData(side,side),out=img.data;
    for(let iy=0;iy<side;iy++){
      const gy=ty*px+iy-1;
      const sy=gy&255, row=(sy<128?sy:255-sy)*128;
      for(let ix=0;ix<side;ix++){
        const n=iy*side+ix,b=body[n];if(!b)continue;
        const gx=tx*px+ix-1, sx=gx&255, material=(row+(sx<128?sx:255-sx))*4;
        const grain=grit[material]*.6+grit[material+1]*.4-145;
        const mottling=3*Math.sin(gx*.023+gy*.031)+3.4*Math.sin(gy*.057-gx*.039)+grain*.72;
        const a=Math.min(1,Math.max(0,b-.08+grain*.005));
        const tracks=rut[n]*(.83+.12*Math.sin(gy*.39+gx*.063));
        const value=176+mottling-tracks*(24+grain*.13);
        const i=n*4;out[i]=value+3.3+tracks*1.9;out[i+1]=value+1;out[i+2]=value-1.2-tracks*3.7;
        out[i+3]=Math.round(a*a*(3-2*a)*244);
      }
    }
    tc.putImageData(img,0,0);
    return tile;
  }
  function drawGround(c,cameraX,cameraY,halfW,halfH){
    if(!terrain)buildTerrain();
    if(!texture&&visibleImage(assets.ground))texture=c.createPattern(assets.ground,'repeat');
    if(texture){
      c.save();c.scale(1/70,1/70);c.fillStyle=texture;c.fillRect((cameraX-halfW)*70,(cameraY-halfH)*70,halfW*140,halfH*140);c.restore();
    }
    if(grit||readGrit()){
      for(let ty=Math.max(0,Math.floor((cameraY-halfH)/tileSize));ty<=Math.min(Math.floor(height/tileSize),Math.floor((cameraY+halfH)/tileSize));ty++)
        for(let tx=Math.max(0,Math.floor((cameraX-halfW)/tileSize));tx<=Math.min(Math.floor(width/tileSize),Math.floor((cameraX+halfW)/tileSize));tx++){
          const key=roadKey(tx,ty),segments=roadBuckets.get(key);
          if(!segments)continue;
          let tile=roadTiles.get(key);
          if(!tile){tile=roadTile(tx,ty,segments);roadTiles.set(key,tile);
            if(roadTiles.size>42)roadTiles.delete(roadTiles.keys().next().value);
          }
          c.drawImage(tile,1,1,tilePixels,tilePixels,tx*tileSize,ty*tileSize,tileSize,tileSize);
        }
    }
    c.drawImage(terrain,0,0,width,height);
  }
  const alphaMaps=new Map();
  function occludes(o,x,y){
    // The front is south. A player beside the wall or on the near-side
    // pavement always draws in front, even when close to the roof overhang.
    const building=!!o.name,tree=o.type==='tree';
    if((!building&&!tree)||y>=o.y-(building?o.solidD:.22))return false;
    if(Math.abs(x-o.x)>(building?o.solidW:o.w)*.5)return false;
    const im=assets[o.type];if(!visibleImage(im))return false;
    const h=o.w*im.naturalHeight/im.naturalWidth/squash;
    const u=(x-o.x)/o.w+.5, v=1+(y-1.25-o.y)/h;
    if(v<=0||v>=1||u<=0||u>=1)return false;
    if(!alphaMaps.has(o.type)){
      const mask=document.createElement('canvas');mask.width=96;mask.height=96;
      const ctx=mask.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,96,96);
      try{alphaMaps.set(o.type,ctx.getImageData(0,0,96,96).data);}catch{alphaMaps.set(o.type,null);}
    }
    const pixels=alphaMaps.get(o.type);
    return !pixels||pixels[(Math.floor(v*96)*96+Math.floor((o.flip?1-u:u)*96))*4+3]>128;
  }
  function embers(c,x,y,w,time){
    c.save();c.translate(x,y);
    const glow=c.createRadialGradient(0,-.30,0,0,-.30,2.2);
    glow.addColorStop(0,'rgba(255,174,68,.31)');glow.addColorStop(1,'rgba(255,144,45,0)');
    oval(c,0,-.3,2.2,2.2,glow);
    c.restore();
  }
  function flame(c,o,t,h){
    // The sprite's stone ring, logs and camera contact point stay fixed.
    // Only thin translucent tongues above the combustion zone are animated.
    c.save();c.translate(o.x,o.y-h*.45);c.scale(o.w,h);
    const seconds=t+o.x*.29;
    for(let i=0;i<4;i++){
      const q=seconds*(3.6+i*.27)+i*2.3;
      const dx=(i-1.5)*.041,reach=.11+.042*Math.sin(q)+.018*Math.sin(q*2.74);
      c.beginPath();c.moveTo(dx-.037,.04);c.bezierCurveTo(dx-.054,-.018,dx+.02*Math.sin(q),-reach*.63,dx+.025*Math.sin(q*.86),-reach);
      c.quadraticCurveTo(dx+.045,-reach*.40,dx+.038,.039);c.closePath();
      c.fillStyle=i%2?'rgba(255,197,84,.40)':'rgba(255,132,43,.29)';c.fill();
    }
    for(let i=0;i<5;i++){
      const u=(seconds*(.54+i*.034)+i*.23)%1;
      const dx=.07*Math.sin(i*4.1+u*6)*u+.12*u*u,dy=-.09-u*(.31+i*.028);
      oval(c,dx,dy,.004+.003*(1-u),.007,'rgba(255,184,62,'+(.8*Math.sin(u*Math.PI))+')');
    }
    c.restore();
  }
  function prop(c,o,t){
    const {x,y,w,type}=o,im=assets[type];
    if(visibleImage(im)){
      const h=w*im.naturalHeight/im.naturalWidth/squash;
      c.save();c.translate(x+w*.05,y-.25);c.scale(w*.51,Math.max(.24,w*.11));
      const shade=c.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,'rgba(39,50,56,.36)');shade.addColorStop(1,'rgba(39,50,56,0)');oval(c,0,0,1,1,shade);c.restore();
      if(type==='fire')embers(c,x,y,w,t);
      c.save();c.translate(x,y);if(o.flip)c.scale(-1,1);c.drawImage(im,-w/2,-h,w,h);c.restore();if(type==='fire')flame(c,o,t,h);return;
    }
    if(['crates','barrels','sleepers','truck','bush'].includes(type))return;
    if(type==='fire'){
      const halo=c.createRadialGradient(x,y,0,x,y,2.4);halo.addColorStop(0,'rgba(255,171,62,.43)');halo.addColorStop(1,'rgba(254,142,61,0)');oval(c,x,y,2.4,2.4,halo);
      oval(c,x,y,.7,.45,'#665e53');for(let i=0;i<8;i++){let a=i*Math.PI/4;oval(c,x+.60*Math.cos(a),y+.34*Math.sin(a),.18,.15,'#777a74');}
      for(let i=0;i<4;i++){const dx=(i-1.5)*.18,h=.65+.42*Math.sin(t*6+i*1.8);polygon(c,[[x+dx-.23,y],[x+dx+.16,y],[x+dx+.1*Math.sin(t*5+i),y-h]],i%2?'#ffce75':'#e77c31');}
      for(let i=0;i<4;i++){const u=(t*.36+i*.25)%1;oval(c,x+u*.65,y-.8-u*1.7,.08+u*.25,.14+u*.22,'rgba(115,116,113,'+(.26*(1-u))+')');}return;
    }
    if(type==='sign'){line(c,[[x,y],[x,y-2]],'#594b3d',.16);c.fillStyle='#51473a';const board=Math.max(1.6,o.label.length*.207);c.fillRect(x-board/2,y-2.1,board,.48);c.fillStyle='#e4d5af';c.font='bold .29px sans-serif';c.textAlign='center';c.fillText(o.label,x,y-1.75);return;}
    if(type==='fence'){for(const d of [-.4,.4]){c.fillStyle='#79776d';c.fillRect(x+d*w,y-1.8,.18,1.8);}for(let i=0;i<3;i++)line(c,[[x-w/2,y-1.4+i*.47],[x,y-1.27+i*.47],[x+w/2,y-1.4+i*.47]],'#68675f',.05);return;}
    if(type==='railFence'){
      c.save();c.translate(x-w/2,y);
      c.fillStyle='rgba(64,76,76,.12)';c.fillRect(0,.03,w,.13);
      c.lineWidth=.021;c.strokeStyle='#626e70';c.beginPath();
      const top=-2.50,bottom=-.12,step=w/14;
      for(let k=-4;k<15;k++){
        const left=k*step,right=left+step*4;
        for(const flip of [false,true]){
          const t0=Math.max(0,-left/(right-left)),t1=Math.min(1,(w-left)/(right-left));if(t1<=t0)continue;
          c.moveTo(left+(right-left)*t0,flip?bottom+(top-bottom)*t0:top+(bottom-top)*t0);
          c.lineTo(left+(right-left)*t1,flip?bottom+(top-bottom)*t1:top+(bottom-top)*t1);
        }
      }c.stroke();
      line(c,[[0,top],[w,top]],'#515b59',.075);line(c,[[0,top-.04],[w,top-.04]],'#c9d2d4',.04);
      c.fillStyle='#555e5c';c.fillRect(-.055,top-.17,.13,-top+.17);c.fillStyle='#b5bebd';c.fillRect(-.047,top-.2,.11,.055);
      c.restore();return;
    }
    if(type==='passage'){
      const top=y-4.2;
      c.fillStyle='#747874';c.fillRect(x-w/2,y-1.6,w,1.45);
      for(let i=0;i<5;i++){c.fillStyle=i%2?'#a2a398':'#8b8b81';c.fillRect(x-w*.43,y-1.54+i*.27,w*.86,.23);}
      for(const side of [-1,1])line(c,[[x+side*w*.48,y],[x+side*w*.48,top]],'#535b58',.14);
      c.fillStyle='#5c615b';c.fillRect(x-w*.52,top-.18,w*1.04,.69);c.fillStyle='#dce3e4';c.fillRect(x-w*.55,top-.28,w*1.1,.15);
      c.font='bold .35px sans-serif';c.textAlign='center';c.fillStyle='#f3ddb0';c.fillText(o.label,x,top+.27);
      return;
    }
    if(type==='lamp'){
      const glow=c.createRadialGradient(x+.4,y-.48,0,x+.4,y-.48,3.4);
      glow.addColorStop(0,'rgba(255,200,106,.42)');glow.addColorStop(1,'rgba(255,195,97,0)');oval(c,x+.4,y-.48,3.4,2.5,glow);
      line(c,[[x,y],[x,y-4],[x+.55,y-4]],'#545755',.13);
      const bulb=c.createRadialGradient(x+.55,y-3.86,0,x+.55,y-3.86,.75);bulb.addColorStop(0,'#ffe3a0');bulb.addColorStop(.22,'rgba(255,204,111,.88)');bulb.addColorStop(1,'rgba(255,184,94,0)');oval(c,x+.55,y-3.86,.75,.75,bulb);return;
    }
    if(type==='tower'){for(const d of [-1.2,1.2]){line(c,[[x+d,y],[x+d*.65,y-4.7]],'#635a4c',.21);}line(c,[[x-1.1,y-.4],[x+.95,y-3.7]],'#7d7261',.14);c.fillStyle='#776e5e';c.fillRect(x-1.3,y-5.8,2.6,1.5);polygon(c,[[x-1.8,y-5.8],[x,y-7.1],[x+1.8,y-5.8]],'#e4e6df');return;}
    if(type==='tree'){polygon(c,[[x-w*.4,y-.3],[x,y-w*1.8],[x+w*.4,y-.3]],'#627677');return;}
    c.fillStyle='#767b78';c.fillRect(x-w/2,y-w*.40,w,w*.40);polygon(c,[[x-w*.55,y-w*.40],[x-w*.36,y-w*.77],[x+w*.51,y-w*.77],[x+w*.55,y-w*.40]],'#d6dbda');
  }
  const fires=points.filter(o=>o.type==='fire');
  function nearby(x,y){
    const fire=fires.find(o=>Math.hypot(x-o.x,y-o.y)<2.8);
    for(const [doorSide,d] of Object.entries(stationDoors)){
      if(Math.abs(x-d.x)<1.8 && Math.abs(y-d.y)<1.22)return {fire,door:buildings[0],doorSide};
    }
    const door=buildings.find(o=>o.heated&&o.type!=='station'&&Math.abs(o.x-x)<Math.min(2.5,o.w*.43)&&y>o.y-.2&&y<o.y+3.0);
    return {fire,door,doorSide:'south'};
  }
  return {width,height,squash,gate,entrance,stationDoors,railFencesY,forestRoute,roads,places,points,buildings,lake,marsh,marshDepth,shelter,railsY,blocked,drawGround,prop,nearby,occludes,oval,assets};
})();
