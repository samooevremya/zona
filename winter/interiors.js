/* Cutaway interiors. Geometry, door gaps and furniture footprints share one plan in metres. */
"use strict";
window.interiors = (() => {
  const radius = .20;
  const squash = .70;
  const furniture = ['bench','stove','counter','sofa','table','kitchen','bed','books','shelf'];
  const images = Object.fromEntries(furniture.map(kind => {
    const img = new Image();
    img.src = 'art/room-' + kind + '.webp';
    return [kind,img];
  }));
  let materials;
  const pigments = {
    oak:['#846c53','#806952','#89735c','#90765a'],
    parquet:['#9a7f5e','#8a7258','#a08764','#927451'],
    terrazzo:['#a09b87','#9a9785','#a7a18b','#aaa48d'],
    lino:['#808d7a','#84917e','#8d9985','#81917e'],
    tile:['#bbb9a0','#afb3a0','#a4b3a7','#c4c0a8'],
    concrete:['#777a75','#757873','#81837c','#7c7d76'],
  };
  function random(seed) {
    return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  }
  function rect(c,x,y,w,h,color) { c.fillStyle=color;c.fillRect(x,y,w,h); }
  function stroke(c,pts,color,width) {
    c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  function oval(c,x,y,rx,ry,color) {
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();
  }
  function polygon(c,pts,color) {
    c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();
  }
  function light(c,x,y,rx,ry,tint) {
    c.save();c.translate(x,y);c.scale(rx,ry);
    const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,tint);g.addColorStop(1,'rgba(0,0,0,0)');
    rect(c,-1,-1,2,2,g);c.restore();
  }
  function buildMaterials() {
    const result={};
    for(const [kind,palette] of Object.entries(pigments)){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      const k=canvas.getContext('2d'),rnd=random(53893+kind.charCodeAt(0)*171);
      rect(k,0,0,256,256,palette[0]);
      if(kind==='oak'||kind==='parquet'){
        const h=kind==='oak'?16:8, w=kind==='oak'?109:42;
        for(let r=0;r<256/h;r++){
          for(let x=-w+(r%3)*11;x<256;x+=w){
            rect(k,x,r*h,w-1,h-1,palette[Math.floor(rnd()*4)]);
            stroke(k,[[x,r*h+h-1],[x+w,r*h+h-1]],'rgba(50,38,32,.49)',1);
            stroke(k,[[x+1,r*h+1],[x+w-1,r*h+1]],'rgba(237,215,178,.17)',1);
            for(let j=0;j<7;j++){
              const px=x+rnd()*w*.65,py=r*h+2+rnd()*(h-4);
              stroke(k,[[px,py],[px+4+rnd()*w*.29,py+.6*rnd()]],'rgba(52,40,28,.20)',.55);
            }
          }
        }
      } else {
        const h=kind==='tile'?24:kind==='lino'?52:128;
        for(let y=0;y<256;y+=h)for(let x=0;x<256;x+=h){
          rect(k,x,y,h,h,palette[Math.floor(rnd()*4)]);
          if(kind==='tile'||kind==='lino'){
            rect(k,x,y,h,1,'rgba(41,45,39,.4)');rect(k,x,y,1,h,'rgba(41,45,39,.4)');
            rect(k,x+1,y+1,h-2,1,'rgba(244,235,194,.18)');
          }
        }
      }
      for(let j=0;j<7000;j++){
        const s=rnd(),a=kind==='terrazzo'?.35:.095;
        rect(k,rnd()*256,rnd()*256,1+rnd()*(kind==='terrazzo'?2:1),1+rnd()*1.4,
          s<.5?'rgba(32,31,28,'+a+')':'rgba(247,234,196,'+a+')');
      }
      result[kind]=canvas;
    }return result;
  }

  // Each opening is removed from the wall for both rendering and movement.
  function wall(scene,x1,y1,x2,y2,openings=[],style='inner'){
    const horizontal=y1===y2, begin=horizontal?x1:y1, end=horizontal?x2:y2;
    let from=begin;
    function segment(to){
      if(to<=from)return;
      const x=horizontal?from:x1,y=horizontal?y1:from;
      scene.walls.push({x,y,w:horizontal?to-from:.20,h:horizontal?.20:to-from,style,horizontal});
    }
    openings.slice().sort((a,b)=>a[0]-b[0]).forEach(([lo,hi])=>{segment(lo);from=hi;});segment(end);
  }
  function fixture(scene,kind,x,y,w,d,extra={}){
    scene.items.push({kind,x,y,w,d,...extra});
  }
  function sign(scene,x,y,text){scene.signs.push({x,y,text});}
  function windowAt(scene,x,y){scene.windows.push({x,y});}
  function zone(scene,x,y,w,h,material){scene.zones.push({x,y,w,h,material});}
  function rug(scene,x,y,w,h,color){scene.rugs.push({x,y,w,h,color});}
  function outer(scene,south,north=[]){
    const {hw,hd}=scene;
    wall(scene,-hw,-hd,hw,-hd,north,'back');wall(scene,-hw,hd,hw,hd,south,'sill');
    wall(scene,-hw,-hd,-hw,hd,[],'side');wall(scene,hw,-hd,hw,hd,[],'side');
  }
  function port(scene,side,x,y,label,heading){
    scene.ports.push({side,x,y,label,heading});
  }
  function station(scene){
    scene.hw=9;scene.hd=6;scene.base='terrazzo';
    outer(scene,[[-1.05,1.05]],[[-4.95,-2.85],[4.63,6.77]]);
    port(scene,'front',0,5.35,'Выйти на площадь',-Math.PI/2);
    port(scene,'platform',-3.9,-5.1,'Выйти на перрон',Math.PI/2);
    port(scene,'north',5.7,-5.1,'Перейти к озеру',Math.PI/2);
    sign(scene,-3.9,-5.92,'ПЕРРОН');sign(scene,5.7,-5.92,'ПЕРЕХОД · ОЗЕРО');sign(scene,0,5.76,'ПЛОЩАДЬ');
    for(const x of [-7.1,.6,3.25])windowAt(scene,x,-5.95);
    fixture(scene,'counter',.6,-4.05,3.2,1.0);
    for(const x of [-6.25,4.45])for(const y of [.25,3.15])fixture(scene,'bench',x,y,2.55,.78);
    fixture(scene,'stove',-7.95,-3.15,1.22,.92,{warm:true});
    fixture(scene,'books',8.05,-2.6,1.12,.7);
    scene.stairs.push({x:4.78,y:-5.73,w:1.84,h:2.18,t:'passage'});
  }
  function home(scene,shed){
    scene.hw=shed?6.3:5.45;scene.hd=shed?4.55:4.15;scene.base=shed?'concrete':'oak';
    outer(scene,[[-.82,.82]]);port(scene,'front',0,scene.hd-.65,'Выйти на улицу',-Math.PI/2);
    windowAt(scene,-2.55,-scene.hd+.05);windowAt(scene,2.45,-scene.hd+.05);
    fixture(scene,'stove',-scene.hw+1.03,-scene.hd+1.3,1.18,.9,{warm:true});
    if(shed){
      fixture(scene,'shelf',1.95,-3.36,2.3,.73);fixture(scene,'shelf',4.65,-3.38,2.05,.72);
      fixture(scene,'counter',-3.96,.1,2.85,.94);fixture(scene,'table',3.85,1.45,2.0,1.0);
      fixture(scene,'bench',-3.53,3.32,2.4,.7);
    }else{
      wall(scene,1.95,-scene.hd,1.95,scene.hd,[[-.65,.77]]);
      fixture(scene,'kitchen',-2.15,-3.05,2.4,.75);fixture(scene,'table',-2.7,.25,1.48,.82);
      fixture(scene,'sofa',-3.13,2.82,2.20,.83);fixture(scene,'bed',3.8,-1.5,1.62,1.6);
      fixture(scene,'books',3.85,2.85,1.25,.61);
      rug(scene,-1.75,1.9,2.3,1.35,'#735446');
    }
  }
  function apartmentNumber(scene,side){return (scene.floor-1)*2+(side<0?1:2);}
  function block(scene){
    scene.hw=12.9;scene.hd=6.25;scene.base='concrete';
    outer(scene,scene.floor===1?[[-.84,.84]]:[]);
    if(scene.floor===1)port(scene,'front',0,5.55,'Выйти во двор',-Math.PI/2);
    const northBlock=scene.building.name.includes('север');
    for(const s of [-1,1]){
      const apt=apartmentNumber(scene,s);
      const daylight=(apt+(northBlock?0:1))%2===0;
      const range=(lo,hi)=>s>0?[lo,hi]:[-hi,-lo];
      const zones=(lo,hi,y,h,mat)=>zone(scene,range(lo,hi)[0],y,hi-lo,h,mat);
      zones(2.25,12.9,-6.25,12.5,'oak');
      zones(2.25,7.9,-6.25,4.95,'lino');zones(7.9,12.9,-6.25,4.95,'tile');
      zones(2.25,7.9,1.8,4.45,'parquet');
      wall(scene,s*2.25,-6.25,s*2.25,6.25,[[-.45,1.22]]);
      const bounds=range(2.25,12.9),doors=[range(4.4,5.8),range(9.5,10.88)];
      for(const y of [-1.3,1.8])wall(scene,bounds[0],y,bounds[1],y,doors);
      wall(scene,s*7.9,-6.25,s*7.9,-1.3);wall(scene,s*7.9,1.8,s*7.9,6.25);
      windowAt(scene,s*5.45,-6.2);windowAt(scene,s*10.2,-6.2);
      fixture(scene,'kitchen',s*4.25,-5.15,2.5,.78);fixture(scene,'table',s*6.60,-3.02,1.40,.76);
      fixture(scene,'tub',s*11.18,-4.81,2.12,.85);fixture(scene,'sink',s*8.68,-4.06,.77,.54);
      fixture(scene,'wc',s*12.1,-2.35,.65,.71);
      fixture(scene,'sofa',s*(daylight?4.25:5.6),5.76,2.44,.85);
      fixture(scene,'books',s*7.0,5.43,1.20,.65);
      rug(scene,s*5.2,4.93,2.98,1.45,daylight?'#6c5146':'#737665');
      fixture(scene,'bed',s*(daylight?9.22:11.2),4.4,1.56,1.58);
      fixture(scene,'books',s*(daylight?11.75:8.86),5.28,1.15,.60);
      sign(scene,s*2.75,-.6,'КВ. '+apt);
    }
    scene.stairs.push({x:-1.95,y:-5.05,w:1.64,h:3.85,t:scene.floor<5?'up':'closed'});
    scene.stairs.push({x:.29,y:-5.05,w:1.64,h:3.85,t:scene.floor>1?'down':'closed'});
    // A partition between adjacent flights, terminating before the landing.
    wall(scene,0,-5.08,0,-1.38,[],'rail');
    sign(scene,0,1.99,'ЭТАЖ '+scene.floor);
    windowAt(scene,.08,-6.19);
  }

  function fillPlan(scene){
    for(const k of ['walls','items','ports','zones','windows','rugs','stairs','signs'])scene[k]=[];
    if(scene.building.type==='block')block(scene);
    else if(scene.building.type==='station')station(scene);
    else home(scene,scene.building.type==='shed');
    scene.floorImage=null;
  }
  function create(building,side='front'){
    const scene={building,floor:1};
    fillPlan(scene);
    const door=scene.ports.find(d=>d.side===side)||scene.ports[0];
    scene.spawn={x:door.x,y:door.y,heading:door.heading};return scene;
  }
  function blocked(s,x,y){
    if(Math.abs(x)>s.hw-radius||Math.abs(y)>s.hd-radius)return true;
    for(const w of s.walls){if(x>w.x-radius&&x<w.x+w.w+radius&&y>w.y-radius&&y<w.y+w.h+radius)return true;}
    for(const o of s.items){if(Math.abs(x-o.x)<o.w*.45+radius&&y>o.y-o.d-radius&&y<o.y+radius)return true;}
    return false;
  }
  function action(s,x,y){
    for(const p of s.ports){if(Math.hypot(p.x-x,p.y-y)<1.22)return {label:p.label,exit:p.side};}
    if(s.building.type==='block'){
      if(s.floor<5&&Math.abs(x+1.04)<.79&&y< -3.87&&y> -5.66)return {label:'Подняться на '+(s.floor+1)+' этаж',delta:1};
      if(s.floor>1&&Math.abs(x-1.10)<.82&&y<-.71&&y> -2.58)return {label:'Спуститься на '+(s.floor-1)+' этаж',delta:-1};
    }return null;
  }
  function changeFloor(s,delta){
    const next=s.floor+delta;
    if(s.building.type!=='block'||Math.abs(delta)!==1||next<1||next>5)return null;
    s.floor=next;fillPlan(s);
    return delta>0?{x:1.10,y:-1.27,heading:Math.PI/2}:{x:-1.04,y:-4.56,heading:Math.PI/2};
  }
  function name(s,x,y){
    if(s.building.type!=='block')return s.building.name;
    const a=Math.abs(x),base=s.building.name+' · этаж '+s.floor;
    if(a<2.25)return base;
    let room='прихожая';
    if(y<-1.25)room=a<7.9?'кухня':'ванная';
    if(y>1.8)room=a<7.9?'гостиная':'спальня';
    return 'Кв. '+apartmentNumber(s,x<0?-1:1)+' · '+room+' · этаж '+s.floor;
  }
  function floorArea(c,material,x,y,w,h){
    const pattern=c.createPattern(materials[material],'repeat');
    c.save();c.scale(1/57,1/57);c.fillStyle=pattern;c.fillRect(x*57,y*57,w*57,h*57);c.restore();
  }
  function paintRug(c,r){
    const x=r.x-r.w/2,y=r.y-r.h/2;
    rect(c,x-.035,y+.04,r.w+.07,r.h+.05,'rgba(29,25,23,.26)');
    rect(c,x,y,r.w,r.h,r.color);c.strokeStyle='#c1a181';c.lineWidth=.035;c.strokeRect(x+.10,y+.10,r.w-.2,r.h-.2);
    for(let n=-1;n<=1;n++){
      const cx=r.x+n*r.w*.25;
      polygon(c,[[cx-.28,r.y],[cx,r.y-.35],[cx+.28,r.y],[cx,r.y+.35]],'#a4876e');
      polygon(c,[[cx-.17,r.y],[cx,r.y-.20],[cx+.17,r.y],[cx,r.y+.20]],r.color);
    }
    for(let j=.08;j<r.h;j+=.095)for(const sx of [x,x+r.w])stroke(c,[[sx-.065,y+j],[sx+.065,y+j]],'#b0a48d',.022);
  }
  function paintStairs(c,r){
    if(r.t==='closed')return;
    const n=12;
    rect(c,r.x-.085,r.y-.04,r.w+.17,r.h+.15,'#4a4e49');
    for(let i=0;i<n;i++){
      const t=i/n,shade=r.t==='up'?1-t:t;
      const hue=108+Math.round(shade*43);
      const y=r.y+i*r.h/n;
      rect(c,r.x,y,r.w,r.h/n,'rgb('+hue+','+(hue-2)+','+(hue-12)+')');
      rect(c,r.x,y+r.h/n-.095,r.w,.095,'#696c61');
      rect(c,r.x,y+r.h/n-.109,r.w,.029,'#d5cfb4');
      if(i===0||i===n-1){rect(c,r.x+.03,y+.034,r.w-.06,.064,'#c7a768');}
    }
    for(const x of [r.x+.06,r.x+r.w-.06]){
      for(const t of [.03,.5,.95])stroke(c,[[x,r.y+t*r.h],[x,r.y+t*r.h-.39]],'#50554f',.055);
      stroke(c,[[x,r.y-.36],[x,r.y+r.h-.36]],'#6c5746',.082);
      stroke(c,[[x-.015,r.y-.38],[x-.015,r.y+r.h-.38]],'#a18769',.026);
    }
    if(r.t!=='passage'){
      const x=r.x+r.w/2,y=r.y+r.h*.67,dir=r.t==='up'?-1:1;
      stroke(c,[[x,y-dir*.28],[x,y+dir*.25],[x-.15,y+dir*.08]],'#e5dcbb',.055);
      stroke(c,[[x,y+dir*.25],[x+.15,y+dir*.08]],'#e5dcbb',.055);
    }
  }
  function bakeFloor(s){
    materials ||= buildMaterials();
    const margin=.9,k=52,w=2*(s.hw+margin),h=2*(s.hd+margin);
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*k);canvas.height=Math.ceil(h*k);
    const c=canvas.getContext('2d');c.scale(k,k);c.translate(s.hw+margin,s.hd+margin);
    rect(c,-s.hw-.24,-s.hd-.23,s.hw*2+.49,s.hd*2+.49,'#48443b');
    rect(c,-s.hw-.15,-s.hd-.16,s.hw*2+.31,s.hd*2+.32,'#a79d84');
    floorArea(c,s.base,-s.hw,-s.hd,s.hw*2,s.hd*2);
    for(const z of s.zones)floorArea(c,z.material,z.x,z.y,z.w,z.h);
    for(const r of s.rugs)paintRug(c,r);
    for(const win of s.windows){
      const g=c.createLinearGradient(0,win.y,0,win.y+3.8);
      g.addColorStop(0,'rgba(230,231,202,.36)');g.addColorStop(1,'rgba(230,231,202,0)');
      polygon(c,[[win.x-.72,win.y],[win.x+.72,win.y],[win.x+2.1,win.y+3.8],[win.x+.36,win.y+3.8]],g);
      stroke(c,[[win.x,win.y],[win.x+1.18,win.y+3.26]],'rgba(61,62,55,.10)',.074);
    }
    for(const w of s.walls){
      if(w.style==='rail')continue;
      if(w.horizontal){
        const g=c.createLinearGradient(0,w.y,0,w.y+.54);g.addColorStop(0,'rgba(47,38,32,.26)');g.addColorStop(1,'transparent');
        rect(c,w.x,w.y,w.w,.54,g);
      }else{
        const g=c.createLinearGradient(w.x,0,w.x+.47,0);g.addColorStop(0,'rgba(47,38,32,.21)');g.addColorStop(1,'transparent');
        rect(c,w.x,w.y,.47,w.h,g);
      }
    }
    for(const r of s.stairs)paintStairs(c,r);
    for(const p of s.ports){
      const x=p.x,y=p.y+(p.heading<0?.48:-.46);
      rect(c,x-.83,y-.135,1.66,.27,'#6d6252');rect(c,x-.83,y-.12,1.66,.034,'#c1af8c');
      if(p.side==='front'){
        rect(c,x-.61,p.y-.2,1.22,.42,'#585245');
        for(let i=-.5;i<.6;i+=.1)rect(c,x+i,p.y-.18,.03,.38,'#746c58');
      }
    }
    const shade=c.createRadialGradient(0,0,1,0,0,Math.max(s.hw,s.hd)*1.35);
    shade.addColorStop(0,'rgba(45,38,32,0)');shade.addColorStop(1,'rgba(42,38,35,.25)');
    rect(c,-s.hw,-s.hd,s.hw*2,s.hd*2,shade);
    for(const f of s.items)if(f.warm)light(c,f.x,f.y,2.8,2.75,'rgba(255,176,79,.27)');
    s.floorImage={canvas,x:-s.hw-margin,y:-s.hd-margin,w:canvas.width/k,h:canvas.height/k};
  }
  function wallFace(c,s,w){
    const rise=w.style==='back'?1.18:w.style==='rail'?.37:w.style==='sill'?.18:w.horizontal?.54:.37;
    const front=s.building.type==='station'?'#b3aa89':s.building.type==='block'?'#b6afa0':'#ad9f86';
    if(w.horizontal){
      const x=w.x,y=w.y,h=rise;
      const g=c.createLinearGradient(x,y-h,x,y);g.addColorStop(0,front);g.addColorStop(.64,'#a89c82');g.addColorStop(.65,'#728078');g.addColorStop(1,'#647268');
      rect(c,x,y-h,w.w,h+.14,g);
      rect(c,x,y+.035,w.w,.115,'#504c40');rect(c,x,y+.027,w.w,.026,'#8e816c');
      if(w.style==='back'){
        const r=random(Math.round((x+20)*1007));const count=Math.floor(w.w*7.2);
        for(let j=0;j<count;j++)rect(c,x+r()*w.w,y-h+.05+r()*(h-.14),.035+r()*.12,.016+r()*.035,'rgba(94,85,69,.22)');
      }
      rect(c,x-.015,y-h-.13,w.w+.03,.17,'#d3c8ad');
      rect(c,x-.015,y-h+.024,w.w+.03,.036,'#716c5e');
      for(const win of s.windows)if(w.style==='back'&&win.x>w.x+.50&&win.x<w.x+w.w-.50){
        const wx=win.x-.73,wy=y-.93;
        rect(c,wx-.07,wy-.07,1.60,.74,'#675e50');rect(c,wx,wy,1.46,.62,'#a9b8b6');
        const glass=c.createLinearGradient(0,wy,0,wy+.6);glass.addColorStop(0,'#97aab0');glass.addColorStop(1,'#d3d5c6');
        rect(c,wx+.035,wy+.03,1.39,.55,glass);
        stroke(c,[[wx+.1,wy+.43],[wx+.40,wy+.07]],'rgba(239,245,232,.41)',.045);
        rect(c,win.x-.025,wy,.055,.62,'#847d6a');rect(c,wx,wy+.30,1.46,.042,'#8c8573');
        rect(c,wx-.10,wy+.61,1.66,.095,'#c8b89b');
      }
    }else{
      const {x,y,h}=w;rect(c,x,y-rise,w.w+.05,h+rise,'#716e60');
      rect(c,x-.025,y-rise,w.w+.05,h,'#c2b8a3');
      rect(c,x+w.w-.035,y-rise,.05,h,'#928a76');
      rect(c,x-.025,y+h-rise,w.w+.05,rise+.08,'#908976');
      rect(c,x-.025,y+h+.02,w.w+.05,.06,'#635d51');
    }
  }
  function drawPlumbing(c,o){
    const x=o.x-o.w/2,y=o.y-o.d;
    if(o.kind==='tub'){
      rect(c,x,y-.19,o.w,o.d+.16,'#afa99a');rect(c,x+.025,y-.25,o.w-.05,o.d,'#ddd9c7');
      c.fillStyle='#929c96';c.beginPath();c.roundRect(x+.12,y-.17,o.w-.24,o.d-.15,.18);c.fill();
      c.fillStyle='#c3c9bf';c.beginPath();c.roundRect(x+.18,y-.11,o.w-.36,o.d-.31,.15);c.fill();
      oval(c,o.x+.6,y+.14,.042,.034,'#626761');stroke(c,[[x+.22,y-.22],[x+.22,y-.34],[x+.33,y-.34]],'#686f69',.045);
    }else{
      if(o.kind==='wc'){rect(c,x+.045,y-.26,o.w-.09,.32,'#c7cbc1');rect(c,x+.08,y-.29,o.w-.16,.08,'#e6e5d8');}
      else rect(c,x+.09,y+.03,o.w-.18,o.d*.65,'#91a095');
      oval(c,o.x,y+o.d*.48,o.w*.44,o.d*.46,'#d5d8ce');oval(c,o.x,y+o.d*.44,o.w*.29,o.d*.27,'#9ba79f');
      oval(c,o.x,y+o.d*.47,o.w*.21,o.d*.20,'#b8c6c0');
    }
  }
  function drawItem(c,o){
    const im=images[o.kind];
    light(c,o.x+.12,o.y-.06,o.w*.66,Math.max(.25,o.d*.70),'rgba(30,29,24,.42)');
    if(im&&im.complete&&im.naturalWidth){
      const h=o.w*im.naturalHeight/im.naturalWidth/squash;
      c.drawImage(im,o.x-o.w/2,o.y-h,o.w,h);
    }else if(!im)drawPlumbing(c,o);
    else {rect(c,o.x-o.w/2,o.y-o.d-.28,o.w,o.d,'#8b7960');rect(c,o.x-o.w/2,o.y-.28,o.w,.28,'#574b3c');}
  }
  function wallSign(c,sg){
    const text=sg.text;const size=text.startsWith('КВ.')?.235:.265;
    c.font='bold '+size+'px Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';
    const w=c.measureText(text).width+.22;
    rect(c,sg.x-w/2-.022,sg.y-.20,w+.044,.41,'#b6a88c');
    rect(c,sg.x-w/2,sg.y-.178,w,.365,'#46544e');
    c.fillStyle='#eee2c0';c.fillText(text,sg.x,sg.y+.015);
  }
  function draw(c,s,player,drawPlayer,time=0){
    if(!s.floorImage)bakeFloor(s);
    const f=s.floorImage;c.save();
    rect(c,-160,-160,320,320,'#272b29');
    light(c,0,1,s.hw*1.19,s.hd*1.24,'rgba(11,14,13,.53)');
    c.drawImage(f.canvas,f.x,f.y,f.w,f.h);
    const renderables=s.walls.map(w=>({depth:w.y+w.h,paint:()=>wallFace(c,s,w)}));
    for(const o of s.items)renderables.push({depth:o.y,paint:()=>drawItem(c,o)});
    renderables.push({depth:player.y,paint:drawPlayer});
    renderables.sort((a,b)=>a.depth-b.depth);
    for(const r of renderables)r.paint();
    for(const sg of s.signs)wallSign(c,sg);
    for(const o of s.items)if(o.warm){
      const pulse=.1+.017*Math.sin(time*3.9)+.012*Math.sin(time*6.17);
      light(c,o.x,o.y-.46,.85,1.03,'rgba(251,165,69,'+pulse+')');
    }
    c.restore();
  }
  return {create,blocked,action,changeFloor,name,draw};
})();
