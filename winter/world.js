"use strict";
window.world = (() => {
  const width = 320, height = 300, squash = 0.70;
  const gate = {x:158,y:265}, entrance = {x:158,y:98};
  const roads = [
    [[158,294],[158,265],[158,239],[161,210],[161,179],[158,140],[158,98],[158,89],[160,78]],
    [[158,211],[131,201],[108,184],[91,181],[72,191],[52,205],[33,209]],
    [[158,166],[191,163],[216,148],[232,142],[261,141],[287,129]],
    [[158,102],[132,104],[107,101],[85,102],[62,97],[40,94]],
    [[157,80],[130,74],[99,71],[79,67],[56,54],[35,51]],
    [[160,77],[199,76],[223,69],[249,58],[267,46],[293,45]],
    [[216,148],[219,164],[234,171],[263,168]],
    [[158,269],[145,278],[128,279],[110,269]],
    [[158,269],[181,276],[200,269]]
  ];
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
  [[150,100],[152,264],[164,179],[87,73],[260,59],[225,148]].forEach(([x,y])=>add('fire',x,y,1.7));
  for(const x of [143,149,165,171])add('fence',x,265,5.7);
  for(const x of [120,125,130,135,183,188,193,198])add('fence',x,265,5);
  for(const x of [139,148,171,180])add('lamp',x,92,1);
  [['crates',151.6,268,2.8],['barrels',166.6,266.2,1.6],['sleepers',149,259.3,3.5],['truck',169.5,259,4.8],
   ['bush',161.8,262,1.6],['bush',153.1,256.5,2.2],['crates',173,277,2.7],['sleepers',148,100,3],['crates',164,98,2.1],
   ['barrels',166,95.8,1.5],['sleepers',91,73,3],['crates',99,191.8,2.2],['truck',230,146,4.9]].forEach(([a,b,c,d])=>add(a,b,c,d));
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
  const buildings=points.filter(o=>o.solidW);
  for(let i=0;i<3800;i++){
    const x=rand()*width,y=rand()*height;
    if(Math.abs(y-88)<4 || lake(x,y)||marsh(x,y)||nearRoad(x,y,5) || buildings.some(b=>Math.abs(b.x-x)<b.w*.64+3 && y>b.y-b.solidD-6 && y<b.y+4))continue;
    if((x>118&&x<200&&y>261)||(x>213&&x<266&&y>127&&y<175))continue;
    if(rand()>.55+.30*Math.sin(.10*x+.13*y))continue;
    add('tree',x,y,3+rand()*4,{flip:rand()<.5,solidW:.55,solidD:.55});
  }
  [[148,256],[167,254],[146,260],[170,261],[150,247],[167,242],[144,245],[147,115],[169,108]].forEach(([x,y],i)=>add('tree',x,y,4+i%3,{flip:!!(i%2),solidW:.55,solidD:.55}));
  for(let i=0;i<340;i++){const x=rand()*width,y=rand()*height;if(!lake(x,y)&&!nearRoad(x,y,2.8)&&Math.abs(y-87.5)>4)add('bush',x,y,.9+rand()*1.4,{flip:rand()<.5});}
  const rough=[];
  for(let i=0;i<5500;i++)rough.push([rand()*width,rand()*height,.10+rand()*.8,rand()]);
  const railsY=[86,89];
  const assets={};
  for(const id of ['ground','station','ruin','cabin','tree','shed','block','road','fire','crates','barrels','sleepers','truck','bush']) {const im=new Image(); im.src='art/'+id+(id==='ground'?'.jpg':'.webp'); assets[id]=im;}
  function visibleImage(im){return im?.complete && im.naturalWidth>0;}
  const pad=1;
  function blocked(x,y) {
    if(x<pad||y<pad||x>width-pad||y>height-pad)return true;
    return points.some(o=>o.solidW && Math.abs(x-o.x)<o.solidW/2+.22&& y>o.y-o.solidD-.22&&y<o.y+.22);
  }
  function line(c,coords,color,w){c.beginPath(); for(const [i,p] of coords.entries()){if(i)c.lineTo(...p);else c.moveTo(...p);}c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function polygon(c,pts,color){c.fillStyle=color;c.beginPath();for(const [i,p] of pts.entries()){if(i)c.lineTo(...p);else c.moveTo(...p);}c.closePath();c.fill();}
  let terrain, texture;
  function buildTerrain(){
    const k=7;
    terrain=document.createElement('canvas');terrain.width=width*k;terrain.height=height*k;
    const c=terrain.getContext('2d');c.scale(k,k);
    oval(c,157,43,83,32,'#96abb6');oval(c,157,43,81.6,31.4,'#a4b7c1');oval(c,62,139,33,22,'#acb7b7');
    c.save();c.beginPath();c.ellipse(157,43,81.5,31.4,0,0,Math.PI*2);c.clip();
    for(let i=0;i<65;i++){const x=78+rand()*160,y=12+rand()*64;line(c,[[x,y],[x+2,y+2],[x+6,y+2.7],[x+9,y+5]],'#c7d6d9',.12);}c.restore();
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
  let roadMouth;
  function featheredRoad(){
    if(roadMouth)return roadMouth;
    const im=assets.road,tile=document.createElement('canvas');tile.width=im.width;tile.height=im.height;
    const ctx=tile.getContext('2d');ctx.drawImage(im,0,0);ctx.globalCompositeOperation='destination-in';
    const fade=ctx.createLinearGradient(0,0,0,tile.height*.36);fade.addColorStop(0,'transparent');fade.addColorStop(1,'white');
    ctx.fillStyle=fade;ctx.fillRect(0,0,tile.width,tile.height);roadMouth=tile;return tile;
  }
  function drawGround(c,cameraX,cameraY,halfW,halfH){
    if(!terrain)buildTerrain();
    if(!texture&&visibleImage(assets.ground))texture=c.createPattern(assets.ground,'repeat');
    if(texture){
      c.save();c.scale(1/70,1/70);c.fillStyle=texture;c.fillRect((cameraX-halfW)*70,(cameraY-halfH)*70,halfW*140,halfH*140);c.restore();
    }
    for(const [idx,path] of roads.entries()){
      const roadWidth=idx===0?6.3:4.6;
      for(let i=1;i<path.length;i++){
        const [x,y]=path[i-1],[xx,yy]=path[i];
        if(Math.max(x,xx)<cameraX-halfW-4||Math.min(x,xx)>cameraX+halfW+4||Math.max(y,yy)<cameraY-halfH-4||Math.min(y,yy)>cameraY+halfH+4)continue;
        if(!visibleImage(assets.road)){line(c,[path[i-1],path[i]],'#bcc0be',roadWidth*.7);continue;}
        const length=Math.hypot(xx-x,yy-y);
        c.save();c.translate(x,y);c.rotate(Math.atan2(yy-y,xx-x)-Math.PI/2);
        const tile=roadWidth*1.8;for(let offset=0;offset<length;offset+=tile){
          const span=Math.min(tile,length-offset);
          c.drawImage(idx>0&&i===1&&offset===0?featheredRoad():assets.road,0,0,assets.road.width,assets.road.height*span/tile,-roadWidth/2,offset,roadWidth,span+.035);
        }c.restore();
      }
    }
    c.drawImage(terrain,0,0,width,height);
  }
  function prop(c,o,t){
    const {x,y,w,type}=o,im=assets[type];
    if(visibleImage(im)){
      const h=w*im.naturalHeight/im.naturalWidth/squash;
      c.save();c.translate(x+w*.05,y-.25);c.scale(w*.51,Math.max(.24,w*.11));
      const shade=c.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,'rgba(39,50,56,.36)');shade.addColorStop(1,'rgba(39,50,56,0)');oval(c,0,0,1,1,shade);c.restore();
      if(type==='fire'){const glow=c.createRadialGradient(x,y,0,x,y,2);glow.addColorStop(0,'rgba(255,171,62,'+(.28+Math.sin(t*7)*.045)+')');glow.addColorStop(1,'rgba(255,171,62,0)');oval(c,x,y,2,2,glow);}
      c.save();c.translate(x,y);if(o.flip)c.scale(-1,1);c.drawImage(im,-w/2,-h,w,type==='fire'?h*(1+.028*Math.sin(t*9)):h);c.restore();return;
    }
    if(['crates','barrels','sleepers','truck','bush'].includes(type))return;
    if(type==='fire'){
      const halo=c.createRadialGradient(x,y,0,x,y,2.4);halo.addColorStop(0,'rgba(255,171,62,.43)');halo.addColorStop(1,'rgba(254,142,61,0)');oval(c,x,y,2.4,2.4,halo);
      oval(c,x,y,.7,.45,'#665e53');for(let i=0;i<8;i++){let a=i*Math.PI/4;oval(c,x+.60*Math.cos(a),y+.34*Math.sin(a),.18,.15,'#777a74');}
      for(let i=0;i<4;i++){const dx=(i-1.5)*.18,h=.65+.42*Math.sin(t*6+i*1.8);polygon(c,[[x+dx-.23,y],[x+dx+.16,y],[x+dx+.1*Math.sin(t*5+i),y-h]],i%2?'#ffce75':'#e77c31');}
      for(let i=0;i<4;i++){const u=(t*.36+i*.25)%1;oval(c,x+u*.65,y-.8-u*1.7,.08+u*.25,.14+u*.22,'rgba(115,116,113,'+(.26*(1-u))+')');}return;
    }
    if(type==='sign'){line(c,[[x,y],[x,y-2]],'#594b3d',.16);c.fillStyle='#51473a';c.fillRect(x-.8,y-2.1,1.6,.48);c.fillStyle='#e4d5af';c.font='bold .29px sans-serif';c.textAlign='center';c.fillText(o.label,x,y-1.75);return;}
    if(type==='fence'){for(const d of [-.4,.4]){c.fillStyle='#79776d';c.fillRect(x+d*w,y-1.8,.18,1.8);}for(let i=0;i<3;i++)line(c,[[x-w/2,y-1.4+i*.47],[x,y-1.27+i*.47],[x+w/2,y-1.4+i*.47]],'#68675f',.05);return;}
    if(type==='lamp'){line(c,[[x,y],[x,y-4],[x+.55,y-4]],'#545755',.13);oval(c,x+.55,y-3.88,.22,.16,'#f5c37d');return;}
    if(type==='tower'){for(const d of [-1.2,1.2]){line(c,[[x+d,y],[x+d*.65,y-4.7]],'#635a4c',.21);}line(c,[[x-1.1,y-.4],[x+.95,y-3.7]],'#7d7261',.14);c.fillStyle='#776e5e';c.fillRect(x-1.3,y-5.8,2.6,1.5);polygon(c,[[x-1.8,y-5.8],[x,y-7.1],[x+1.8,y-5.8]],'#e4e6df');return;}
    if(type==='tree'){polygon(c,[[x-w*.4,y-.3],[x,y-w*1.8],[x+w*.4,y-.3]],'#627677');return;}
    c.fillStyle='#767b78';c.fillRect(x-w/2,y-w*.40,w,w*.40);polygon(c,[[x-w*.55,y-w*.40],[x-w*.36,y-w*.77],[x+w*.51,y-w*.77],[x+w*.55,y-w*.40]],'#d6dbda');
  }
  function nearby(x,y){const fires=points.filter(o=>o.type==='fire');const fire=fires.find(o=>Math.hypot(x-o.x,y-o.y)<2.8);
    let door=buildings.find(o=>o.heated && Math.abs(o.x-x)<Math.min(3,o.w*.45)&& y>o.y-.2&&y<o.y+3.2);
    return {fire,door};}
  return {width,height,squash,gate,entrance,roads,places,points,buildings,lake,marsh,railsY,blocked,drawGround,prop,nearby,oval,assets};
})();
