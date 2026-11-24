const cv=document.querySelector('canvas'),g=cv.getContext('2d'),mapButton=document.querySelector('#map');
let ground;
const forest=woods(),crowns=Array.from({length:18},(_,i)=>treeArt(i));
const player={x:state.x,y:state.y,a:Math.PI/2,step:0};
const camera={x:player.x,y:player.y};
let wide=false,started=true,viewW,viewH,zoom=1,fit=1,last=performance.now();
const keys=new Set(),stick={x:0,y:0,id:null},stickEl=document.querySelector('#stick');
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const forestRows=new Map();
for(const tree of forest){
  const row=Math.floor(tree.y/4);if(!forestRows.has(row))forestRows.set(row,[]);forestRows.get(row).push(tree);
}
function visibleForest(v){
  if(wide)return forest;
  const half=viewH/(2*v.z)+2,span=viewW/(2*v.z)+2,rows=[];
  for(let y=Math.floor((v.y-half)/4);y<=Math.floor((v.y+half)/4);y++){
    for(const tree of forestRows.get(y)||[])if(Math.abs(tree.x-v.x)<span)rows.push(tree);
  }
  return rows;
}
function resize(){
  mapDrawn=false;viewW=innerWidth;viewH=innerHeight;
  const d=Math.min(devicePixelRatio||1,1.75);cv.width=Math.round(viewW*d);cv.height=Math.round(viewH*d);
  fit=Math.min((viewW-20)/W,(viewH-80)/H);
}
function view(){return wide?{x:atlas.x,y:atlas.y,z:fit*atlas.scale}:{x:camera.x,y:camera.y,z:Math.min(83,Math.max(56,viewH/7))*zoom};}
function screen(x,y,v){return [(x-v.x)*v.z+viewW/2,(y-v.y)*v.z+viewH/2];}
function renderBuilding(b,i,v){
  const [kind,x,y,w,h,a]=b,[sx,sy]=screen(x,y,v),p=v.z;
  if(sx+w*p<0 || sx-w*p>viewW || sy+h*p<0 || sy-h*p>viewH)return;
  g.save();g.translate(sx,sy);g.rotate(a);g.scale(p,p);
  const r=randomStream(955+i),height=kind==='flat'?.12:kind==='tower'||kind==='tank'?.17:.05;
  const ox=wide?-.14:clamp((sx-viewW/2)*height/p,-.52,.52),oy=wide?-.22:clamp((sy-viewH/2)*height/p,-.6,.6);
  const l=-w/2,t=-h/2;
  const drop=kind==='flat'?.83:kind==='tower'?.65:.37;
  contactShade(g,drop,drop*.60,w*.60,h*.60,.58);
  if(kind==='tower' && yardArt.naturalWidth){yardObject(g,0,ox,oy,w*1.10,h*1.46);g.restore();return;}
  if(kind==='tank' && stamp(g,5,l+ox,t+oy,w,h)) {g.restore();return;}
  const sprite=({station:0,flat:1,cabin:2,ruin:3,hangar:3,store:4,shed:4,pump:4})[kind];
  if(sprite!==undefined&&objectsImage.complete&&objectsImage.naturalWidth){
    const roofEnd=[.67,.48,.64,.82,.75][sprite];
    const eave=kind==='station'?h*.24:h*.40;
    const raised=wide?(kind==='flat'?.66:.28):Math.max(.12,Math.abs(oy));
    const bottomFace=(oy<=0||wide);
    const frontEdge=bottomFace?eave+oy:t+oy-raised;
    const faceDepth=bottomFace?h*.5-eave+raised:raised;
    g.fillStyle='#686a60';g.fillRect(l+ox+.06,frontEdge,w-.12,faceDepth);
    const faceStart=kind==='flat'?.54:roofEnd;
    stamp(g,sprite,l+ox,frontEdge,w,faceDepth,faceStart,.91);
    if((kind==='flat'||kind==='station')&&roofAtlas.naturalWidth){
      const band=roofAtlas.height/2;
      g.drawImage(roofAtlas,0,kind==='flat'?band:0,roofAtlas.width,band,l+ox,t+oy,w,h);
    }else stamp(g,sprite,l+ox,t+oy,w,h,0,roofEnd);
    g.restore();return;
  }
  if(kind==='tank'||kind==='tower'){
    for(const k of [-1,1])for(const m of [-1,1])stroke(g,[[k*w*.43,m*h*.43],[k*w*.3+ox,m*h*.29+oy]],'#645d4f',.12);
    stroke(g,[[l,t],[w*.42,h*.42]],'#756d5e',.08);
    if(kind==='tank'){ellipse(g,ox,oy,w*.43,h*.43,'#6c6961');ellipse(g,ox-.04,oy-.11,w*.42,h*.38,'#c8cbc4');}
    else{g.fillStyle='#726e62';g.fillRect(l+ox,t+oy,w,h);g.fillStyle='#d6d8ce';g.fillRect(l+ox,t+oy,w,h*.86);}
    g.restore();return;
  }
  g.fillStyle=kind==='flat'?'#737877':'#69645a';g.fillRect(l,t,w,h);
  const front=oy<=0?h/2:-h/2;
  g.fillStyle='#706f68';
  for(const end of [-1,1]){
    g.beginPath();g.moveTo(end*w/2,t);g.lineTo(end*w/2+ox,t+oy);g.lineTo(end*w/2+ox,-t+oy);g.lineTo(end*w/2,-t);g.fill();
  }
  if(kind!=='platform')for(let u=l+.4;u<w/2-.2;u+=.65){
    g.fillStyle=r()>.86?'#b4a17d':'#464d4c';g.fillRect(u,front+Math.min(0,oy),.31,Math.max(.055,Math.abs(oy)*.7));
  }
  g.translate(ox,oy);
  const ruined=kind==='ruin'||kind==='hangar',flat=kind==='flat';
  g.fillStyle=ruined?'#a2a19a':flat?'#d1d1cb':'#bac2c2';g.fillRect(l,t,w,h);
  const roof=g.createLinearGradient(0,t,0,-t);
  roof.addColorStop(0,'rgba(247,248,235,.65)');roof.addColorStop(.48,'rgba(240,241,233,.22)');roof.addColorStop(.51,'rgba(91,104,111,.24)');roof.addColorStop(1,'rgba(124,139,145,.21)');
  g.fillStyle=roof;g.fillRect(l,t,w,h);
  for(let u=l+.23;u<w/2;u+=flat?.97:.29)stroke(g,[[u,t+.06],[u,h/2-.06]],'rgba(98,106,104,.24)',.022);
  for(let n=0;n<Math.ceil(w*h*2);n++){
    const xx=l+r()*w,yy=t+r()*h;
    g.fillStyle='rgba(245,243,233,.28)';g.fillRect(xx,yy,Math.min(.35,w/2-xx),Math.min(.12,h/2-yy));
  }
  fillMaterial(g,1,l,t,w,h,2.2,flat?.49:.64);
  if(flat||kind==='station'||kind==='cabin'){
    for(let u=l+.75;u<w/2-.4;u+=flat?2.15:4.3){
      const yy=t+h*.34;g.fillStyle='#74736b';g.fillRect(u+.035,yy+.07,.22,.3);g.fillStyle='#dad8cf';g.fillRect(u,yy,.22,.19);
    }
  }
  if(kind==='station'){
    g.fillStyle='#e3e1d5';g.fillRect(-1.8,t-.27,3.6,h+.54);
    stroke(g,[[-1.8,t],[0,t-.26],[1.8,t]],'#8a918c',.09);
    g.fillStyle='#737a73';g.fillRect(-1.7,t+h*.37,3.4,.12);
  }
  if(ruined){
    for(let n=0;n<4;n++){
      const xx=l+.18+r()*w*.65,yy=t+.17+r()*h*.55;
      const size=.48+r()*.45;g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+size,yy-.14);g.lineTo(xx+size*1.5,yy+size*.8);g.lineTo(xx+.12,yy+size);g.fillStyle='#5f5f57';g.fill();
      stroke(g,[[xx+.1,yy],[xx+size,yy+size*.8]],'#868074',.085);
    }
  }
  g.strokeStyle='#8b918a';g.lineWidth=.045;g.strokeRect(l,t,w,h);g.restore();
}
// Fences around the former base stop on either side of the access road.
const enclosure=[[[44,89],[53,86],[63.5,86]],[[71,86],[83,86],[93,90],[93,108],[70,109]],[[64,109],[43,108],[43.5,92]]];
function groundObjects(v){
  g.save();g.translate(viewW/2-v.x*v.z,viewH/2-v.y*v.z);g.scale(v.z,v.z);
  railwayFence(v);lakeJetties(g);
  for(const line of enclosure){stroke(g,line,'#787c74',.16);stroke(g,line,'#e0e0d6',.07);}
  for(const [x,y] of [[99,15],[100,15.9],[102,18.8],[95.2,18.2]]){
    g.save();g.translate(x,y);g.rotate(1.96);sheetObject(g,8,-.26,-1.06,.52,2.12);g.restore();
  }
  g.restore();
}
const overviewLabels=[
 [0,69,38],[1,60,16],[2,111,22],[3,13,21],[4,32,28],[5,25,53],[6,43,71],[7,100,69],[8,70,111]
];
function mapLabel(s,x,y,v){
  const [sx,sy]=screen(x,y,v),small=viewW<650;
  g.font='600 '+(small?10:13)+'px system-ui';const w=g.measureText(s).width;
  const xx=clamp(sx,6+w/2,viewW-6-w/2);
  g.fillStyle='rgba(33,43,43,.87)';g.fillRect(xx-w/2-4,sy-8,w+8,17);g.textAlign='center';g.fillStyle='#f0eee2';g.fillText(s,xx,sy+5);
}
function person(v){
  const [x,y]=screen(player.x,player.y,v);
  if(wide){
    ellipse(g,x,y,4,4,'#d79241');g.strokeStyle='#3a342a';g.lineWidth=1;g.stroke();return;
  }
  g.save();g.translate(x,y-(wide?0:Math.sin(jump/.55*Math.PI)*v.z*.12));g.scale(v.z,v.z);g.rotate(player.a);
  ellipse(g,.055,.05,.17,.13,'rgba(44,55,61,.38)');
  for(const s of [-1,1]){
    ellipse(g,.066+Math.cos(player.step)*s*.053,s*.073,.08,.043,'#484b46');
    ellipse(g,.018-Math.cos(player.step)*s*.029,s*.118,.078,.035,'#767767');
  }
  if(stamp(g,8,-.16,-.165,.34,.33)){
    if(WP[state.held]?.ammo){g.fillStyle='#434844';g.fillRect(.075,.058,.18,.031);}
    if(state.held==='guitar'){ellipse(g,.058,.091,.09,.067,'#8b6846');stroke(g,[[.07,.075],[.23,-.03]],'#645341',.026);}
    g.restore();return;
  }
  ellipse(g,-.012,0,.118,.136,'#70766a');ellipse(g,-.084,0,.065,.103,'#555e56');
  ellipse(g,.033,0,.072,.069,'#a49b81');ellipse(g,.046,-.008,.043,.051,'#8a826e');g.restore();
}
function frame(time){
  const dt=Math.min(.05,(time-last)/1000);last=time;
  if(!wide && started && !modal.open && state.hp>0){
    let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x;
    let y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+stick.y;
    const mag=Math.hypot(x,y),marsh=isMarsh();
    const running=mag>.08 && !state.crouch && !marsh && state.stamina>5 && (keys.has('ShiftLeft')||keys.has('ShiftRight')||stick.id!==null&&mag>1.17);
    if(mag>.08){
      const speed=walkSpeed*(running?1.9:state.crouch?.63:1)*(marsh?.56-state.sinking*.002:1);
      const dx=x/Math.max(1,mag)*dt*speed,dy=y/Math.max(1,mag)*dt*speed;
      const free=(px,py)=>state.room<0?(outsideFree(px,py)&&(jump>.08||!lowObstacle(px,py))):insideFree(state.room,px,py);
      const wasX=player.x,wasY=player.y;
      if(free(player.x+dx,player.y))player.x+=dx;
      if(free(player.x,player.y+dy)&&(state.room>=0||sameRailSide(player.y,player.y+dy)))player.y+=dy;
      if(Math.hypot(player.x-wasX,player.y-wasY)>.0001&&performance.now()>lastFoot){
        const clip=state.room>=0?['wood01','wood02'][footCount%2]:marsh?'mud02':['SandL1','SandR2'][footCount%2];
        effect(clip,state.crouch?.06:.13);lastFoot=performance.now()+(running?310:state.crouch?660:480);footCount++;
      }
      if(!aim.active)player.a=Math.atan2(y,x);player.step+=dt*speed*12;
    }
    state.stamina=clamp(state.stamina+dt*(running?(-2.5-(backpack[state.held]?.weight||0)*.3)*(state.energyUntil>state.clock?.65:1):1.8),0,100);
    if(aim.active){
      const desired=assistedAngle(aim.a),delta=Math.atan2(Math.sin(desired-player.a),Math.cos(desired-player.a));
      player.a+=clamp(delta,-dt*12,dt*12);
      if(aim.fire&&Math.abs(delta)<.08){strike();if(aim.tap){aim.active=aim.fire=aim.tap=false;}}
    }
    climate(dt);actorsStep(dt);fieldStep(dt);fieldExposure(dt);tendFires(dt);
    if(state.hp<=0)deathMenu();
    if((time-lastSave)>30000 && state.hp>0){saveSlot('auto');lastSave=time;}
    camera.x+=(player.x-camera.x)*(1-Math.exp(-dt*11));camera.y+=(player.y-camera.y)*(1-Math.exp(-dt*11));
  }
  if(time-lastHud>150){refreshHud();lastHud=time;}
  if(wide && mapDrawn){requestAnimationFrame(frame);return;}
  mapDrawn=wide;
  if(!ground){requestAnimationFrame(frame);return;}
  const v=view(),d=cv.width/viewW;g.setTransform(d,0,0,d,0,0);
  g.fillStyle='#303b3c';g.fillRect(0,0,viewW,viewH);
  worldScenery(v);
  if(!wide && state.room>=0){
    g.fillStyle='rgba(29,37,43,.26)';g.fillRect(0,0,viewW,viewH);
    paintRoom(v,state.room,state.floor);person(v);
  }
  fieldRender(v);if(!wide){adjustBodyLocation();bedsideGlow(v);}snow(v);atmosphereGrade(v);
  if(!wide){
    for(const tr of traces){const [x,y]=screen(tr.x,tr.y,v);stroke(g,[[x,y],[x+Math.cos(tr.a)*tr.d*v.z,y+Math.sin(tr.a)*tr.d*v.z]],'#ead7a0',1);}
    const hr=(state.clock/60)%24,dark=Math.max(0,Math.cos(hr*Math.PI/12))*.62;
    if(dark>.01){const pos=screen(player.x,player.y,v),light=g.createRadialGradient(...pos,10,...pos,Math.max(24,v.z*(state.lamp?3:.8)));
      light.addColorStop(0,'rgba(12,23,36,'+(dark*(state.lamp?.08:.7))+')');light.addColorStop(1,'rgba(12,23,36,'+dark+')');g.fillStyle=light;g.fillRect(0,0,viewW,viewH);}
  }
  if(wide){
    for(const [i,x,y] of overviewLabels)mapLabel(winterMap.places[i][1],x,y,v);
    mapLabel('← Западный путь',13,35.4,v);liveMapPoints(v);
  }
  requestAnimationFrame(frame);
}
function toggleMap(){
  wide=started?!wide:false;started=true;document.body.classList.toggle('walking',!wide);
  mapButton.textContent=wide?'Вернуться к герою':'Карта';
  document.querySelector('#legend').hidden=!wide;
  if(wide){atlas.x=W/2;atlas.y=H/2;atlas.scale=1;}
  mapDrawn=false;releaseStick();aim.active=false;
}
mapButton.addEventListener('click',toggleMap);
function releaseStick(){stick.x=stick.y=0;stick.id=null;stickEl.firstElementChild.style.transform='';}
function stickMove(e){
  const b=stickEl.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)/(b.width*.38),y=(e.clientY-b.top-b.height/2)/(b.height*.38);
  const n=Math.max(1,Math.hypot(x,y));stick.x=x/n*Math.min(n,1.25);stick.y=y/n*Math.min(n,1.25);
  stickEl.firstElementChild.style.transform='translate('+x/n*26+'px,'+y/n*26+'px)';
}
stickEl.onpointerdown=e=>{if(stick.id!==null)return;stick.id=e.pointerId;stickEl.setPointerCapture(e.pointerId);stickMove(e);};
stickEl.onpointermove=e=>{if(e.pointerId===stick.id)stickMove(e);};
stickEl.onlostpointercapture=releaseStick;
window.onblur=()=>{keys.clear();releaseStick();};
window.addEventListener('keydown',e=>{
  if(modal.open)return;
  if(e.code==='KeyM'&&!e.repeat)toggleMap();
  if(e.code.startsWith('Arrow'))e.preventDefault();keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
